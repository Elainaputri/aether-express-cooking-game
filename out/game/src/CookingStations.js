// CookingStations — the four brass cooking stations and the one plate being plated.
// The chef takes one passenger's order at a time, cooks each step at the station it belongs to
// (hold the cook control, release while the doneness arc is golden) and builds the dish on a plate.
// A step cooked past the golden zone burns and costs quality.

import { FIELD, STATION_ORDER } from './config.js';

/** One station: geometry, the ingredient cooking on it and its live effects. */
export class Station {
  constructor(type, index) {
    const w = 252;
    const gap = 24;
    const total = STATION_ORDER.length * w + (STATION_ORDER.length - 1) * gap;
    const x = (FIELD.width - total) / 2 + index * (w + gap);
    this.type = type;
    this.index = index;
    this.x = x;
    this.y = 512;
    this.w = w;
    this.h = 176;
    this.panX = x + w / 2;
    this.panY = 560;
    this.ingredient = null;   // { label, tint, cook, seconds, target }
    this.state = 'idle';      // idle | cooking | ready | burnt
    this.glow = 0;
    this.heat = 0;
    this.effects = 0;
  }
}

export class CookingStations {
  /** @param {object} deps  { random, progression, fx, sound } */
  constructor({ random, progression, fx, sound }) {
    this.random = random;
    this.progression = progression;
    this.fx = fx;
    this.sound = sound;
    this.stations = STATION_ORDER.map((type, i) => new Station(type, i));
    this.order = null;   // { passenger, recipe, stepIndex, quality, done }
    this.plate = null;   // { recipe, built: [{label, tint}], quality, ready } — the dish on the pass
    this.perfects = 0;
  }

  reset() {
    for (const s of this.stations) { s.ingredient = null; s.state = 'idle'; s.glow = 0; s.heat = 0; }
    this.order = null;
    this.plate = null;
    this.perfects = 0;
  }

  stationFor(type) {
    return this.stations.find((s) => s.type === type) ?? this.stations[0];
  }

  /** The step of the current order that must be cooked next, or null. */
  currentStep() {
    if (this.order === null || this.order.done) return null;
    return this.order.recipe.steps[this.order.stepIndex] ?? null;
  }

  /** The station index the next step belongs to, or -1. */
  neededStation() {
    const step = this.currentStep();
    return step === null ? -1 : STATION_ORDER.indexOf(step.station);
  }

  /** The passenger whose order is on the bench, or null. */
  get takenPassenger() {
    return this.order === null ? null : this.order.passenger;
  }

  /** Take a passenger's order (only one at a time). The plate starts empty on the pass. */
  takeOrder(passenger) {
    if (this.order !== null && !this.order.done) return false;
    if (passenger.state !== 'waiting') return false;
    this.order = { passenger, recipe: passenger.recipe, stepIndex: 0, quality: 1, done: false };
    this.plate = { recipe: passenger.recipe, built: [], quality: 1, ready: false };
    this.sound.select();
    this.fx.popup(`Order: ${passenger.recipe.name}`, FIELD.width / 2, 250, '#f5e6c8', 0.9);
    return true;
  }

  /** Drop an order off the bench (a passenger left), and its unfinished plate with it. */
  dropOrderFor(passenger) {
    if (this.order !== null && this.order.passenger === passenger) {
      this.order = null;
      this.plate = null;
    }
  }

  /** Cook one step to completion, at the station it belongs to. */
  completeStep(station, grade) {
    const step = this.currentStep();
    if (step === null || station.index !== this.neededStation()) return;
    if (grade === 'perfect') { this.perfects += 1; this.sound.perfect(); }
    else this.sound.good();
    // The finished ingredient flies to the plate at the pass.
    const plateX = FIELD.width / 2;
    const plateY = 430;
    this.fx.slice(station.panX, station.panY, plateX, plateY, step.tint);
    this.fx.flecks(station.panX, station.panY - 20, step.tint, 6);
    const factor = grade === 'perfect' ? 1 : grade === 'good' ? 0.62 : 0.28;
    this.order.quality *= factor;
    this.order.stepIndex += 1;
    // The ingredient lands on the plate on the pass; the dish grows as steps complete.
    if (this.plate !== null) {
      this.plate.quality = this.order.quality;
      this.plate.built.push({ label: step.label, tint: step.tint });
    }
    station.ingredient = null;
    station.state = 'idle';
    if (this.order.stepIndex >= this.order.recipe.steps.length) {
      this.order.done = true;
      if (this.plate !== null) this.plate.ready = true;
      this.sound.fever();
      this.fx.popup('DISH READY — SERVE IT', FIELD.width / 2, 300, '#ffcf4a', 1.1);
    }
  }

  /** Burn the step cooking now. */
  burn(station) {
    this.sound.burn();
    this.fx.smoke(station.panX, station.panY - 30, 12);
    this.fx.popup('BURNT!', station.panX, station.panY - 70, '#e2564a', 1);
    this.fx.shake(6);
    if (this.order !== null) {
      this.order.quality *= 0.5;
      if (this.plate !== null) this.plate.quality = this.order.quality;
    }
    station.ingredient = null;
    station.state = 'burnt';
    station.heat = 1;
  }

  /**
   * Advance the stations.
   * @param {number} dt
   * @param {boolean} cooking  the cook control is held
   * @param {number} activeStation  the station the chef stands at (-1 for none)
   */
  update(dt, cooking, activeStation) {
    const needed = this.neededStation();
    for (const s of this.stations) {
      s.glow = Math.max(0, s.glow - dt * 2);
      s.heat = Math.max(0, s.heat - dt * 0.7);
      if (s.state === 'burnt' && s.heat <= 0) s.state = 'idle';
      const isNeeded = s.index === needed;
      if (isNeeded) s.glow = Math.min(1, s.glow + dt * 3);

      const step = isNeeded ? this.currentStep() : null;
      const chefHere = s.index === activeStation;
      const wants = step !== null && chefHere && cooking;
      if (wants) {
        if (s.ingredient === null) {
          s.ingredient = { label: step.label, tint: step.tint, cook: 0, seconds: step.seconds };
          s.state = 'cooking';
        }
        s.ingredient.cook += dt;
        s.state = 'cooking';
        s.heat = Math.min(1, s.heat + dt * 1.6);
        if (this.random.float() < 0.7) this.fx.steam(s.panX, s.panY - 26, 1, 0.8);
        if (this.random.float() < 0.35) this.fx.fire(s.panX, s.panY + 4, 1);
        if (this.random.float() < 0.25) this.sound.sizzle();
        const t = s.ingredient.cook / s.ingredient.seconds;
        const burnT = 1.24 + this.progression.goldenBonus;
        if (t >= burnT) this.burn(s);
      } else if (s.ingredient !== null && !chefHere) {
        // The chef stepped away mid-cook: the ingredient waits, half done.
        s.state = 'idle';
      }
      if (s.ingredient !== null && s.ingredient.cook > 0) {
        const t = s.ingredient.cook / s.ingredient.seconds;
        s.ingredient.target = t;
      }
    }
  }

  /**
   * The cook control was released at `activeStation`: grade the step if it is in the golden zone.
   * Returns the grade ('perfect' | 'good' | 'raw' | 'burnt') or null.
   */
  release(activeStation) {
    const needed = this.neededStation();
    if (needed < 0 || activeStation !== needed) return null;
    const s = this.stations[needed];
    if (s.ingredient === null || s.state !== 'cooking') return null;
    const t = s.ingredient.cook / s.ingredient.seconds;
    const bonus = this.progression.goldenBonus;
    const goldLo = 0.78 - bonus;
    const goldHi = 1.24 + bonus;
    const perfectLo = 0.94 - bonus * 0.5;
    const perfectHi = 1.06 + bonus * 0.5;
    if (t < goldLo) { s.state = 'idle'; s.ingredient = null; return 'raw'; }
    if (t > goldHi) { this.burn(s); return 'burnt'; }
    const grade = t >= perfectLo && t <= perfectHi ? 'perfect' : 'good';
    this.completeStep(s, grade);
    return grade;
  }

  /** Serve the ready plate to a passenger whose order it matches. */
  serveTo(passenger) {
    if (this.plate === null || !this.plate.ready || passenger.state !== 'waiting') return false;
    if (passenger.recipe !== this.plate.recipe) {
      this.fx.popup('Not their dish', FIELD.width / 2, 360, '#b8a37e', 0.9);
      return false;
    }
    const quality = this.plate.quality;
    this.plate = null;
    this.order = null;
    return { quality };
  }
}
