// GameEngine — the fixed-timestep loop and the screens of the Grand Dining Car.
// Screens: TITLE, PLAYING, SHOP (the between-shifts Kitchen Upgrade Shop and the shift summary).
// Input is turned into an `intent` each frame (what is held, which station, what was clicked) and
// the world advances in whole 1/60 s steps, so the same seed and the same intent give the same frame.

import { FIELD, STEP, STATION_ORDER } from './config.js';
import { createRandom } from './random.js';
import { RecipeSystem } from './RecipeSystem.js';
import { CookingStations } from './CookingStations.js';
import { CustomerAI } from './CustomerAI.js';
import { ParticleAndFX } from './ParticleAndFX.js';
import { SoundSynthesizer } from './SoundSynthesizer.js';
import { ProgressionManager } from './ProgressionManager.js';
import { ACTION_CONFIRM, ACTION_MUTE } from './Input.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_SHOP = 'shop';

/** How long one shift of service lasts, in seconds. */
export const SHIFT_SECONDS = 100;

export class GameEngine {
  /** @param {HTMLCanvasElement} canvas @param {HTMLElement|null} status @param {number} seed */
  constructor(canvas, status = null, seed = 1) {
    this.canvas = canvas;
    this.status = status;
    this.random = createRandom(seed);
    this.fx = new ParticleAndFX(this.random);
    this.sound = new SoundSynthesizer();
    this.progression = new ProgressionManager(this.safeStorage());
    this.recipes = new RecipeSystem(this.random);
    this.stations = new CookingStations({ random: this.random, progression: this.progression, fx: this.fx, sound: this.sound });
    this.customers = new CustomerAI({ random: this.random, recipes: this.recipes, progression: this.progression, fx: this.fx, sound: this.sound });
    this.screen = SCREEN_TITLE;
    this.shiftTime = 0;
    this.shiftLength = SHIFT_SECONDS;
    this.accumulator = 0;
    this.last = 0;
    this.time = 0;
    this.cooking = false;
    this.wasCooking = false;
    this.activeStation = -1;
    this.intent = { cooking: false, station: -1, clicks: [], actions: 0, hover: { x: -1, y: -1 } };
    this.hoverStation = -1;
    this.shiftReport = null;
    this.lastServe = '';
    this.muted = false;
    this.feverFlash = 0;   // 1 on the step FEVER RUSH ignites, decaying to 0; brightens the frame
  }

  safeStorage() {
    try { return window.localStorage; } catch { return null; }
  }

  /** Reset for a brand-new run. */
  reset(seed = 1) {
    this.random = createRandom(seed);
    this.fx.random = this.random;
    this.fx.reset();
    this.progression = new ProgressionManager(this.safeStorage());
    this.recipes = new RecipeSystem(this.random);
    this.stations = new CookingStations({ random: this.random, progression: this.progression, fx: this.fx, sound: this.sound });
    this.customers = new CustomerAI({ random: this.random, recipes: this.recipes, progression: this.progression, fx: this.fx, sound: this.sound });
    this.shiftTime = 0;
    this.wasCooking = false;
    this.cooking = false;
    this.activeStation = -1;
    this.shiftReport = null;
    this.screen = SCREEN_TITLE;
    this.feverFlash = 0;
    this.announce('Aether Express. Press Space or click to board.');
  }

  announce(message) {
    if (this.status !== null) this.status.textContent = message;
  }

  startShift(shift) {
    this.progression.beginShift(shift);
    this.stations.reset();
    this.customers.reset();
    this.fx.reset();
    this.shiftTime = this.shiftLength;
    this.screen = SCREEN_PLAY;
    this.activeStation = -1;
    this.announce(`Shift ${shift} begins. Take an order and cook it.`);
  }

  endShift() {
    this.shiftReport = {
      shift: this.progression.shift,
      served: this.progression.ordersServed,
      lost: this.progression.ordersLost,
      score: this.progression.score,
      coins: this.progression.coins,
      bestCombo: this.progression.bestCombo,
    };
    this.screen = SCREEN_SHOP;
    this.announce(`Shift over. ${this.progression.ordersServed} served, ${this.progression.ordersLost} lost.`);
  }

  /** Read the input object into this frame's intent. */
  readInput(input) {
    const intent = this.intent;
    intent.actions = input.takeActions();
    intent.station = input.stationKey();
    intent.hover.x = input.pointer.x;
    intent.hover.y = input.pointer.y;
    const clicked = input.consumeClick();
    if (clicked) intent.clicks.push({ x: input.pointer.downX, y: input.pointer.downY });
    // Cooking: Space, or the pointer held over the counter.
    const overCounter = input.pointer.down && input.pointer.y > 470;
    intent.cooking = input.isCooking() && (input.heldKeys.has(' ') || overCounter);
    if (this.screen === SCREEN_PLAY && clicked) {
      const s = this.stationAt(input.pointer.downX, input.pointer.downY);
      if (s >= 0) this.activeStation = s;
    }
  }

  stationAt(x, y) {
    for (const s of this.stations.stations) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y - 60 && y <= s.y + s.h) return s.index;
    }
    return -1;
  }

  passengerAt(x, y) {
    if (y < 120 || y > 340) return -1;
    for (let i = 0; i < this.customers.passengers.length; i += 1) {
      const px = this.customers.seatX[i];
      if (Math.abs(x - px) < 110) return i;
    }
    return -1;
  }

  /** One fixed step of the game. */
  step() {
    const intent = this.intent;
    if (intent.actions & ACTION_MUTE) { this.muted = this.sound.toggleMute(); }
    const actions = intent.actions;
    intent.actions = 0;

    if (this.screen === SCREEN_TITLE) {
      this.time += STEP;
      this.fx.update(STEP);
      for (const c of intent.clicks) if (this.shopButtonAt(c.x, c.y, 'board')) { this.sound.unlock(); this.startShift(1); }
      if (actions & ACTION_CONFIRM) { this.sound.unlock(); this.startShift(1); }
      intent.clicks.length = 0;
      return;
    }

    if (this.screen === SCREEN_SHOP) {
      this.time += STEP;
      this.fx.update(STEP);
      for (const c of intent.clicks) this.handleShopClick(c.x, c.y);
      if (actions & ACTION_CONFIRM) this.nextShift();
      intent.clicks.length = 0;
      return;
    }

    // PLAYING
    this.time += STEP;
    this.shiftTime -= STEP;
    if (this.shiftTime <= 0) { this.endShift(); return; }

    // Select a station with the number keys.
    if (intent.station >= 0) this.activeStation = intent.station;
    const cooking = intent.cooking;
    // Clicks: a passenger card takes an order or is served.
    for (const c of intent.clicks) {
      const pi = this.passengerAt(c.x, c.y);
      if (pi >= 0) this.handlePassengerClick(pi);
      else if (this.plateReady() && this.stationAt(c.x, c.y) < 0) {
        // A tap on the pass plates nothing; a hint only.
      }
    }
    intent.clicks.length = 0;

    this.customers.update(STEP, this.progression.shift - 1);
    // If the order's passenger has left, drop the bench order.
    const taken = this.stations.takenPassenger;
    if (taken !== null && taken.state !== 'waiting' && this.stations.order !== null && !this.stations.order.done) {
      this.stations.dropOrderFor(taken);
    }

    // A release grades the step.
    if (this.wasCooking && !cooking) {
      const grade = this.stations.release(this.activeStation);
      if (grade === 'raw') this.fx.popup('Too early', this.stations.stations[Math.max(0, this.activeStation)].panX, 470, '#b8a37e', 0.8);
    }
    this.stations.update(STEP, cooking, this.activeStation);
    this.wasCooking = cooking;
    this.cooking = cooking;
    if (this.progression.tickFever(STEP)) {
      this.sound.whoosh();
      this.sound.fever();
      this.fx.popup('FEVER RUSH!', FIELD.width / 2, 240, '#ff8a2a', 1.5);
      this.fx.shake(7);
      this.feverFlash = 1;
    }
    this.fx.speedScale = this.progression.feverActive ? 1.6 : 1;
    if (this.feverFlash > 0) this.feverFlash = Math.max(0, this.feverFlash - STEP * 1.4);
    // Aether motes drift off the passing landscape.
    if (this.random.float() < 0.05) this.fx.aether(this.customers.seatX[this.random.int(4)] + (this.random.float() - 0.5) * 200, 210);
    this.fx.update(STEP);
  }

  plateReady() {
    return this.stations.plate !== null && this.stations.plate.ready;
  }

  handlePassengerClick(index) {
    const p = this.customers.passengers[index];
    if (p.state !== 'waiting') return;
    if (this.plateReady()) {
      const result = this.stations.serveTo(p);
      if (result !== false) {
        this.customers.serve(p, result.quality);
        this.lastServe = p.recipe.name;
        this.fx.shake(this.progression.feverActive ? 5 : 3);
      }
      return;
    }
    this.stations.takeOrder(p);
  }

  shopButtonAt(x, y, id) {
    // One button, laid out by the renderer at a fixed place; also covers the title's start button.
    return x >= FIELD.width / 2 - 130 && x <= FIELD.width / 2 + 130 && y >= 596 && y <= 656;
  }

  handleShopClick(x, y) {
    const up = this.upgradeAt(x, y);
    if (up !== null) {
      if (this.progression.buy(up)) this.sound.coin();
      else this.sound.buzzer();
      return;
    }
    if (this.shopButtonAt(x, y, 'next')) this.nextShift();
  }

  upgradeAt(x, y) {
    const ids = ['heat', 'patience', 'tip', 'combo'];
    const y0 = 300;
    for (let i = 0; i < ids.length; i += 1) {
      const rowY = y0 + i * 74;
      if (x >= 300 && x <= 980 && y >= rowY && y <= rowY + 62) return ids[i];
    }
    return null;
  }

  nextShift() {
    this.recipes.unlockNext();
    this.startShift(this.progression.shift + 1);
  }

  /** The real loop: read input, catch up in fixed steps, draw. */
  tick(now, input) {
    if (this.last === 0) this.last = now;
    const dt = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;
    this.accumulator += dt;
    this.readInput(input);
    let steps = 0;
    while (this.accumulator >= STEP && steps < 6) {
      this.step();
      this.accumulator -= STEP;
      steps += 1;
    }
    this.sound.update();
    if (this.renderer) this.renderer.draw(this);
  }
}
