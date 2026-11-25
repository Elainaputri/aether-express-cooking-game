// Renderer — every pixel of the Grand Dining Car, painted from the engine's state and nothing else.
// The 1280x720 playfield is letterboxed into the window (high-DPI aware) and drawn with gradients,
// shadows and glossy highlights. Nothing is loaded from disk or the network: the landscape, the car
// interior, the passengers, the food and the brass are all arithmetic, so a seed and a time give the
// same frame on any machine.
//
// Bands of the playfield, top to bottom:
//   0..54    HUD plaque        score, combo, coins, fever
//   54..330  window band       parallax landscape, four booths, the passengers and their order cards
//   330..500 wall band         the order ticket board, the plating pass and the service clock
//   500..700 counter band      the four brass cooking stations and the ingredients on them
//   700..720 carpet edge

import { FIELD, FONT, FONT_UI, PALETTE } from './config.js';
import { UPGRADES } from './ProgressionManager.js';
import { SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SHIFT_SECONDS } from './GameEngine.js';

const W = FIELD.width;
const H = FIELD.height;
const HUD_H = 54;
const WINDOW_TOP = 96;
const WINDOW_BOTTOM = 300;
const WALL_TOP = 330;
const COUNTER_TOP = 500;
const COUNTER_BOTTOM = 700;

/** Rounded rectangle path (roundRect is not everywhere; this is). */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A vertical gradient inside a rectangle. */
function vGradient(ctx, x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A radial glow behind a point. */
function glow(ctx, x, y, r0, r1, color) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r1, 0, Math.PI * 2);
  ctx.fill();
}

/** The explicit "now -> next level" line the shop shows on each upgrade card. */
function upgradeDelta(id, level) {
  if (id === 'heat') return `Golden window  +${level * 2}%  →  +${(level + 1) * 2}%`;
  if (id === 'patience') return `Guest patience  ${(1 + level * 0.2).toFixed(1)}x  →  ${(1 + (level + 1) * 0.2).toFixed(1)}x`;
  if (id === 'tip') return `Perfect-dish tips  ${(1 + level * 0.18).toFixed(2)}x  →  ${(1 + (level + 1) * 0.18).toFixed(2)}x`;
  return `Fever fill rate  ${(1 + level * 0.25).toFixed(2)}x  →  ${(1 + (level + 1) * 0.25).toFixed(2)}x`;
}

export class Renderer {
  /** @param {HTMLCanvasElement} canvas @param {boolean} fixed  paint at exactly 1280x720 (for shots) */
  constructor(canvas, fixed = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fixed = fixed;
    this.view = { scale: 1, x: 0, y: 0 };
    this.fonts = new Map();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Fit the playfield into the window, centred, at the display's pixel ratio (or 1:1 for shots). */
  resize() {
    if (this.fixed) {
      this.canvas.width = W;
      this.canvas.height = H;
      this.view.scale = 1;
      this.view.x = 0;
      this.view.y = 0;
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(window.innerWidth * ratio));
    const height = Math.max(1, Math.round(window.innerHeight * ratio));
    this.canvas.width = width;
    this.canvas.height = height;
    const scale = Math.min(width / W, height / H);
    this.view.scale = scale;
    this.view.x = (width - W * scale) / 2;
    this.view.y = (height - H * scale) / 2;
  }

  /** Fill text with a cached font string. */
  text(value, x, y, size, color, align = 'left', family = FONT) {
    const ctx = this.ctx;
    const key = `${size}|${family}`;
    let font = this.fonts.get(key);
    if (font === undefined) { font = `${size}px ${family}`; this.fonts.set(key, font); }
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  // ---------------------------------------------------------------- top level

  /** Paint one frame of the game. */
  draw(engine) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, this.view.x, this.view.y);
    ctx.save();
    // The car rides its rails: a soft rhythmic rumble under everything, sharpened by real shake.
    ctx.translate(Math.sin(engine.time * 2.3) * 0.7 + Math.sin(engine.time * 7.1) * 0.25, Math.sin(engine.time * 3.7) * 0.6);
    if (engine.fx.screenShake > 0.1) {
      const s = engine.fx.screenShake;
      ctx.translate(Math.sin(engine.time * 57) * s, Math.cos(engine.time * 43) * s);
    }
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    this.drawShell(engine);
    this.drawWindows(engine);
    this.drawWallBand(engine);
    this.drawPassengers(engine);
    this.drawCounter(engine);
    this.drawParticles(engine);
    this.drawPopups(engine);

    if (engine.screen === SCREEN_TITLE) this.drawTitle(engine);
    else if (engine.screen === SCREEN_SHOP) this.drawShop(engine);
    else { this.drawHud(engine); this.drawFeverFrame(engine); }

    ctx.restore();
  }

  /** The golden/aether frame that pulses while FEVER RUSH burns, brightest as it ignites. */
  drawFeverFrame(engine) {
    const p = engine.progression;
    if (!p.feverActive && engine.feverFlash <= 0) return;
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(engine.time * 7);
    const hot = p.feverActive ? 0.22 + 0.18 * pulse : 0;
    const flash = engine.feverFlash * 0.4;
    const a = Math.max(hot, flash);
    if (a <= 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,138,42,${a})`);
    g.addColorStop(0.5, `rgba(255,207,74,${a * 0.25})`);
    g.addColorStop(1, `rgba(120,190,255,${a * 0.7})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 4 + 6 * (hot + flash));
    ctx.fillRect(0, H - 4 - 6 * (hot + flash), W, 4 + 6 * (hot + flash));
    ctx.fillRect(0, 0, 4 + 6 * (hot + flash), H);
    ctx.fillRect(W - 4 - 6 * (hot + flash), 0, 4 + 6 * (hot + flash), H);
    // A bloom at the corners as it ignites.
    if (flash > 0.01) {
      glow(ctx, 0, 0, 10, 260, `rgba(255,180,80,${flash * 0.5})`);
      glow(ctx, W, H, 10, 260, `rgba(140,200,255,${flash * 0.4})`);
    }
  }

  // ---------------------------------------------------------------- shell

  drawShell() {
    const ctx = this.ctx;
    // Ceiling.
    vGradient(ctx, 0, 0, W, WALL_TOP, '#2a1509', '#180c05');
    ctx.fillStyle = 'rgba(201,162,75,0.16)';
    ctx.fillRect(0, WALL_TOP - 6, W, 6);
    // Wainscot wall behind the windows.
    vGradient(ctx, 0, WALL_TOP - 0, W, COUNTER_TOP - WALL_TOP, PALETTE.woodDark, '#1c0f06');
    // Counter apron.
    vGradient(ctx, 0, COUNTER_TOP - 40, W, COUNTER_BOTTOM - COUNTER_TOP + 40, PALETTE.wood, PALETTE.woodDark);
    // Carpet.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(0, COUNTER_BOTTOM, W, H - COUNTER_BOTTOM);
    ctx.fillStyle = PALETTE.carpetDark;
    for (let x = 0; x < W; x += 48) ctx.fillRect(x, COUNTER_BOTTOM, 24, H - COUNTER_BOTTOM);
    // Brass ceiling cornice.
    ctx.fillStyle = PALETTE.brassDark;
    ctx.fillRect(0, WALL_TOP - 10, W, 4);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, WALL_TOP - 8, W, 2);
  }

  // ---------------------------------------------------------------- landscape through the windows

  /** The union of the four window rectangles, as one clip path. */
  windowPath() {
    const ctx = this.ctx;
    ctx.beginPath();
    for (const seat of [250, 520, 790, 1060]) ctx.rect(seat - 116, WINDOW_TOP, 232, WINDOW_BOTTOM - WINDOW_TOP);
  }

  /** A repeating ridge line drawn as a filled polygon; `seed` shifts the noise without randomness. */
  ridge(scroll, baseY, amp, step, color, seed) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += step) {
      const u = (x + scroll) * 0.01;
      const y = baseY + Math.sin(u * 1.3 + seed) * amp + Math.sin(u * 3.1 + seed * 1.7) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  drawWindows(engine) {
    const ctx = this.ctx;
    const drift = engine.time * 20;
    ctx.save();
    this.windowPath();
    ctx.clip();
    // Sky.
    const sky = ctx.createLinearGradient(0, WINDOW_TOP, 0, WINDOW_BOTTOM);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, WINDOW_TOP, W, WINDOW_BOTTOM - WINDOW_TOP);
    // Sun.
    const sunX = 360 - drift * 0.05;
    glow(ctx, sunX, 150, 4, 84, 'rgba(255,224,160,0.55)');
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sunX, 150, 34, 0, Math.PI * 2);
    ctx.fill();
    // Clouds.
    for (let i = 0; i < 7; i += 1) {
      const cx = ((i * 260 - drift * 0.25) % (W + 300) + W + 300) % (W + 300) - 150;
      const cy = 118 + (i % 3) * 22;
      ctx.fillStyle = PALETTE.cloud;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 62, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 34, cy - 6, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rolling ridges.
    this.ridge(drift * 0.15, 236, 16, 26, PALETTE.mountainFar, 0.4);
    this.ridge(drift * 0.32, 262, 12, 20, PALETTE.mountainMid, 2.1);
    this.ridge(drift * 0.55, 292, 9, 14, PALETTE.mountainNear, 4.3);
    // Aether light pillars: cool shafts that sweep past the window on their own faster rhythm.
    for (let i = 0; i < 5; i += 1) {
      const px = ((i * 340 - drift * 1.4) % (W + 400) + W + 400) % (W + 400) - 200;
      const pillar = ctx.createLinearGradient(px - 26, 0, px + 26, 0);
      pillar.addColorStop(0, 'rgba(120,190,255,0)');
      pillar.addColorStop(0.5, 'rgba(150,205,255,0.20)');
      pillar.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = pillar;
      ctx.fillRect(px - 26, WINDOW_TOP, 52, WINDOW_BOTTOM - WINDOW_TOP);
    }
    // A rail glint low in the glass, flashing on the ties.
    const railY = WINDOW_BOTTOM - 12;
    for (let i = 0; i < 14; i += 1) {
      const rx = ((i * 96 - drift * 1.9) % (W + 120) + W + 120) % (W + 120) - 60;
      ctx.fillStyle = 'rgba(255,236,190,0.5)';
      ctx.fillRect(rx, railY, 40, 3);
    }
    ctx.restore();
    // Window frames.
    ctx.fillStyle = PALETTE.brassDark;
    ctx.fillRect(0, WINDOW_BOTTOM - 4, W, 6);
    ctx.fillRect(0, WINDOW_TOP - 4, W, 5);
    for (const seat of [250, 520, 790, 1060]) {
      const x = seat - 116;
      ctx.fillStyle = PALETTE.brass;
      ctx.fillRect(x - 6, WINDOW_TOP - 6, 6, WINDOW_BOTTOM - WINDOW_TOP + 10);
      ctx.fillRect(x + 232, WINDOW_TOP - 6, 6, WINDOW_BOTTOM - WINDOW_TOP + 10);
      ctx.fillStyle = PALETTE.brassLight;
      ctx.fillRect(x - 6, WINDOW_TOP - 6, 6, 3);
      ctx.fillRect(x + 232, WINDOW_TOP - 6, 6, 3);
      // A mullion cross.
      ctx.fillStyle = 'rgba(201,162,75,0.5)';
      ctx.fillRect(x + 113, WINDOW_TOP, 6, WINDOW_BOTTOM - WINDOW_TOP);
    }
  }

  // ---------------------------------------------------------------- wall band

  drawWallBand(engine) {
    const ctx = this.ctx;
    // A rail of small brass sconces along the wall.
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(0, WALL_TOP + 6, W, 4);
    for (let x = 40; x < W; x += 160) {
      glow(ctx, x, WALL_TOP + 44, 2, 26, 'rgba(255,207,74,0.10)');
      ctx.fillStyle = PALETTE.brassDark;
      ctx.beginPath();
      ctx.ellipse(x, WALL_TOP + 40, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.brassLight;
      ctx.beginPath();
      ctx.arc(x, WALL_TOP + 34, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawOrderBoard(engine);
    this.drawPass(engine);
    this.drawClock(engine);
  }

  /** The chalk order ticket: the dish being cooked and its steps, ticked off as they are plated. */
  drawOrderBoard(engine) {
    const ctx = this.ctx;
    const order = engine.stations.order;
    const x = 70;
    const y = WALL_TOP + 26;
    const w = 400;
    const h = 138;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#20322c';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 4;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.lineWidth = 1;
    this.text('ORDER TICKET', x + 14, y + 24, 15, PALETTE.brass, 'left', FONT_UI);
    const dish = order === null ? 'Take an order from a passenger' : order.recipe.name;
    this.text(dish, x + 14, y + 50, 20, '#f0f6ee', 'left');
    const steps = order === null ? [] : order.recipe.steps;
    for (let i = 0; i < 4; i += 1) {
      const rowY = y + 76 + i * 16;
      if (i >= steps.length) break;
      const step = steps[i];
      const done = order.stepIndex > i || order.done;
      const current = !order.done && order.stepIndex === i;
      ctx.fillStyle = step.tint;
      ctx.beginPath();
      ctx.arc(x + 22, rowY - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      this.text(`${i + 1}. ${step.station}  ${step.label}`, x + 36, rowY, 14, done ? '#7ad46a' : current ? '#ffcf4a' : '#9fb0a6', 'left', FONT_UI);
      this.text(done ? 'DONE' : current ? 'NEXT' : 'wait', x + w - 14, rowY, 13, done ? '#7ad46a' : current ? '#ffcf4a' : '#6b7a72', 'right', FONT_UI);
    }
    if (order !== null && order.done) this.text('ALL STEPS PLATED — SERVE IT', x + 14, y + h - 12, 14, PALETTE.gold, 'left', FONT_UI);
  }

  /** The plating pass: a marble shelf where the dish is assembled, with the plate and its stack. */
  drawPass(engine) {
    const ctx = this.ctx;
    const cx = W / 2;
    ctx.fillStyle = PALETTE.steelDark;
    roundRect(ctx, cx - 150, WALL_TOP + 96, 300, 20, 6);
    ctx.fill();
    vGradient(ctx, cx - 150, WALL_TOP + 96, 300, 14, '#e8e2d4', '#b9b2a2');
    roundRect(ctx, cx - 150, WALL_TOP + 96, 300, 14, 6);
    ctx.fill();
    const plateY = WALL_TOP + 92;
    const plate = engine.stations.plate;
    // Plate.
    ctx.fillStyle = '#efe9db';
    ctx.beginPath();
    ctx.ellipse(cx, plateY, 74, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b48a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, plateY, 62, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (plate !== null) {
      // The ingredients plated so far, stacked with a little jitter; the dish grows step by step.
      const built = plate.built;
      for (let i = 0; i < built.length; i += 1) {
        const a = -0.4 + (i / Math.max(1, built.length)) * 0.8;
        ctx.fillStyle = built[i].tint;
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(a) * 30, plateY - 8 - i * 4, 16, 8, a, 0, Math.PI * 2);
        ctx.fill();
      }
      if (built.length > 0) {
        this.text(plate.recipe.name, cx, plateY + 46, 14, PALETTE.brassLight, 'center', FONT_UI);
      }
      if (plate.ready) {
        const pulse = 0.6 + 0.4 * Math.sin(engine.time * 6);
        glow(ctx, cx, plateY - 10, 6, 60, `rgba(255,207,74,${0.35 * pulse})`);
        this.text('READY', cx, plateY - 46, 18, PALETTE.gold, 'center', FONT_UI);
      }
    } else {
      this.text('PLATING PASS', cx, plateY - 40, 14, PALETTE.textDim, 'center', FONT_UI);
    }
    // A stack of spare plates on the shelf edge.
    ctx.fillStyle = '#d8d2c4';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + 118, WALL_TOP + 98 - i * 4, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The service clock: a brass gauge showing the shift's remaining time and the fever meter beneath. */
  drawClock(engine) {
    const ctx = this.ctx;
    const cx = 1046;
    const cy = WALL_TOP + 74;
    const r = 52;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.brassDark;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f4efdf';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Ticks every twelfth of the shift.
    ctx.strokeStyle = '#8a7a5a';
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.stroke();
    }
    const left = Math.max(0, engine.shiftTime);
    const frac = Math.max(0, Math.min(1, left / SHIFT_SECONDS));
    // Remaining-time arc, going red as it runs out.
    ctx.strokeStyle = frac > 0.33 ? '#3a8a4a' : PALETTE.danger;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    const seconds = Math.ceil(left);
    this.text(`${seconds}`, cx, cy + 8, 26, '#2a1a0e', 'center', FONT_UI);
    this.text('SHIFT TIME', cx, cy + 24, 10, '#6a5a3a', 'center', FONT_UI);
    // Fever meter.
    const fw = 150;
    const fx = cx - fw / 2;
    const fy = cy + r + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, fx, fy, fw, 12, 6);
    ctx.fill();
    const fill = engine.progression.feverActive ? 1 : engine.progression.fever;
    if (fill > 0) {
      ctx.fillStyle = engine.progression.feverActive ? '#ff8a2a' : '#ffcf4a';
      roundRect(ctx, fx, fy, fw * fill, 12, 6);
      ctx.fill();
    }
    this.text(engine.progression.feverActive ? 'FEVER RUSH' : 'FEVER', cx, fy + 26, 12,
      engine.progression.feverActive ? '#ff8a2a' : PALETTE.textDim, 'center', FONT_UI);
  }

  // ---------------------------------------------------------------- passengers

  drawPassengers(engine) {
    const ctx = this.ctx;
    for (let i = 0; i < engine.customers.passengers.length; i += 1) {
      const p = engine.customers.passengers[i];
      const x = engine.customers.seatX[i];
      // The banquette behind every booth.
      ctx.fillStyle = PALETTE.woodLight;
      roundRect(ctx, x - 96, 286, 192, 46, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.carpetDark;
      ctx.fillRect(x - 96, 300, 192, 8);
      if (p.state === 'open') continue;
      const bob = Math.sin(engine.time * 2 + p.bob) * 2;
      const tint = p.archetype.tint;
      // Torso.
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.ellipse(x, 272 + bob, 34, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, 280 + bob, 34, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head.
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath();
      ctx.arc(x, 218 + bob, 22, 0, Math.PI * 2);
      ctx.fill();
      // Hair or cap by archetype.
      ctx.fillStyle = p.archetype.id === 'vip' ? PALETTE.brassDark : p.archetype.id === 'critic' ? '#3a2a2a' : '#4a3526';
      ctx.beginPath();
      ctx.arc(x, 210 + bob, 22, Math.PI, Math.PI * 2);
      ctx.fill();
      if (p.archetype.id === 'vip') {
        ctx.fillRect(x - 24, 206 + bob, 48, 5);
        ctx.fillStyle = PALETTE.brass;
        ctx.beginPath();
        ctx.arc(x, 198 + bob, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Eyes and mouth, borrowed from the mood.
      const angry = p.state === 'leaving';
      ctx.fillStyle = '#2a1a0e';
      ctx.beginPath();
      ctx.arc(x - 7, 218 + bob, 2.4, 0, Math.PI * 2);
      ctx.arc(x + 7, 218 + bob, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = angry ? PALETTE.danger : '#7a4a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, angry ? 230 + bob : 224 + bob, 6, angry ? Math.PI : 0, angry ? Math.PI * 2 : Math.PI);
      ctx.stroke();
      ctx.lineWidth = 1;
      this.drawOrderCard(engine, p, x, bob);
    }
  }

  /** A passenger's order card (or their reaction), floating over the booth. */
  drawOrderCard(engine, p, x, bob) {
    const ctx = this.ctx;
    const w = 178;
    const h = 78;
    const cxx = x - w / 2;
    const cyy = 66 + bob * 0.4;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = p.state === 'leaving' ? '#3a1a16' : PALETTE.card;
    roundRect(ctx, cxx, cyy, w, h, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = p.state === 'leaving' ? PALETTE.danger : PALETTE.cardEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, cxx, cyy, w, h, 8);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (p.state === 'waiting') {
      this.text(p.archetype.name, cxx + 12, cyy + 20, 12, PALETTE.ink, 'left', FONT_UI);
      this.text(p.recipe.name, cxx + 12, cyy + 40, 15, PALETTE.ink, 'left');
      const steps = p.recipe.steps;
      for (let i = 0; i < steps.length; i += 1) {
        ctx.fillStyle = steps[i].tint;
        ctx.beginPath();
        ctx.arc(cxx + 16 + i * 16, cyy + 58, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Urgency timer bar: green when calm, gold mid-wait, red and flashing as the guest is about to go.
      const barW = w - 24;
      const barX = cxx + 12;
      const barY = cyy + h - 13;
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      roundRect(ctx, barX, barY, barW, 7, 3.5);
      ctx.fill();
      const t = Math.max(0, Math.min(1, p.patience));
      let cr; let cg; let cb;
      if (t > 0.5) { const k = (t - 0.5) * 2; cr = 255 + (122 - 255) * k; cg = 207 + (212 - 207) * k; cb = 74 + (106 - 74) * k; }
      else { const k = t * 2; cr = 226 + (255 - 226) * k; cg = 86 + (207 - 86) * k; cb = 74; }
      const urgent = t <= 0.25;
      ctx.fillStyle = urgent && Math.sin(engine.time * 15) > 0 ? PALETTE.danger : `rgb(${cr | 0},${cg | 0},${cb | 0})`;
      roundRect(ctx, barX, barY, barW * t, 7, 3.5);
      ctx.fill();
      if (urgent) {
        ctx.strokeStyle = `rgba(226,86,74,${0.45 + 0.45 * Math.sin(engine.time * 15)})`;
        ctx.lineWidth = 3;
        roundRect(ctx, cxx, cyy, w, h, 8);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    } else if (p.state === 'served' || p.state === 'leaving') {
      this.text(p.state === 'leaving' ? 'ORDER LOST' : 'THANK YOU!', cxx + w / 2, cyy + 26, 15, p.state === 'leaving' ? PALETTE.danger : '#3a8a4a', 'center', FONT_UI);
      this.text(p.reaction, cxx + w / 2, cyy + 50, 13, PALETTE.ink, 'center', FONT_UI);
    }
  }

  // ---------------------------------------------------------------- counter and stations

  drawCounter(engine) {
    const ctx = this.ctx;
    // The counter top runs the whole width with a brass rail.
    vGradient(ctx, 0, COUNTER_TOP - 34, W, 34, PALETTE.counterTop, PALETTE.counterEdge);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(0, COUNTER_TOP - 6, W, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, COUNTER_TOP - 34, W, 4);
    // Brass rail.
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, COUNTER_TOP + 4, W, 5);
    ctx.fillStyle = PALETTE.brassLight;
    ctx.fillRect(0, COUNTER_TOP + 4, W, 2);

    for (let i = 0; i < engine.stations.stations.length; i += 1) this.drawStation(engine, i);
  }

  drawStation(engine, index) {
    const ctx = this.ctx;
    const s = engine.stations.stations[index];
    const needed = engine.stations.neededStation() === index;
    const active = engine.activeStation === index;
    const step = needed ? engine.stations.currentStep() : null;
    const cx = s.panX;
    const cy = s.panY;

    // The station module.
    ctx.fillStyle = index % 2 === 0 ? PALETTE.steelDark : '#40484f';
    roundRect(ctx, s.x, COUNTER_TOP + 14, s.w, 168, 8);
    ctx.fill();
    // A brass nameplate and key hint.
    ctx.fillStyle = needed ? PALETTE.brass : PALETTE.brassDark;
    roundRect(ctx, s.x + 8, COUNTER_TOP + 20, s.w - 16, 26, 6);
    ctx.fill();
    this.text(s.type, s.x + 16, COUNTER_TOP + 39, 15, needed ? '#2a1a0e' : '#d8c290', 'left', FONT_UI);
    this.text(`${index + 1}`, s.x + s.w - 18, COUNTER_TOP + 39, 16, needed ? '#2a1a0e' : '#d8c290', 'right', FONT_UI);

    if (needed && s.glow > 0) glow(ctx, cx, cy, 10, 120, `rgba(255,207,74,${0.12 + s.glow * 0.18})`);
    if (active) {
      ctx.strokeStyle = PALETTE.brassLight;
      ctx.lineWidth = 3;
      roundRect(ctx, s.x + 3, COUNTER_TOP + 17, s.w - 6, 162, 8);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // The cooking surface itself, drawn per station.
    if (s.type === 'GRILL') this.drawGrill(cx, cy);
    else if (s.type === 'WOK') this.drawWok(cx, cy);
    else if (s.type === 'OVEN') this.drawOven(cx, cy, s);
    else this.drawBoard(cx, cy);

    // The ingredient cooking now.
    if (s.ingredient !== null) {
      const t = s.ingredient.cook / s.ingredient.seconds;
      const jitter = Math.sin(engine.time * 30 + index) * 1.5;
      ctx.fillStyle = s.ingredient.tint;
      ctx.beginPath();
      ctx.ellipse(cx + jitter, cy - 12, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx + jitter - 6, cy - 16, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      this.drawDoneness(cx, cy - 46, t, engine.progression.goldenBonus);
    } else if (s.state === 'burnt') {
      ctx.fillStyle = 'rgba(20,10,5,0.4)';
      roundRect(ctx, s.x + 8, COUNTER_TOP + 50, s.w - 16, 120, 8);
      ctx.fill();
    }

    // The label of the step this station must cook.
    if (step !== null && needed) this.text(step.label, cx, COUNTER_TOP + 154, 14, PALETTE.gold, 'center', FONT_UI);
    else this.text(s.type === 'GARDEN' ? 'fresh greens' : 'idle', cx, COUNTER_TOP + 154, 13, PALETTE.textDim, 'center', FONT_UI);
  }

  drawGrill(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#2a2a2c';
    roundRect(ctx, cx - 92, cy - 22, 184, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#4a3a2a';
    for (let i = -3; i <= 3; i += 1) ctx.fillRect(cx + i * 24 - 3, cy - 18, 6, 36);
  }

  drawWok(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#3a3a3e';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, 74, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1c1f';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 62, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a6a70';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 74, cy - 6);
    ctx.lineTo(cx + 108, cy - 16);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  drawOven(cx, cy, s) {
    const ctx = this.ctx;
    ctx.fillStyle = '#3a2a20';
    roundRect(ctx, cx - 82, cy - 26, 164, 52, 8);
    ctx.fill();
    ctx.fillStyle = s.ingredient !== null || s.heat > 0.1 ? '#e07a2a' : '#150c07';
    roundRect(ctx, cx - 60, cy - 18, 120, 30, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(cx - 60, cy - 18, 120, 5);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(cx - 82, cy - 26, 164, 4);
  }

  drawBoard(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = '#8a6a44';
    roundRect(ctx, cx - 88, cy - 20, 176, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#a8834f';
    roundRect(ctx, cx - 82, cy - 16, 164, 32, 6);
    ctx.fill();
  }

  /** The doneness arc: green raw, a wide golden band, then the red burn zone, with a needle at t. */
  drawDoneness(cx, cy, t, bonus) {
    const ctx = this.ctx;
    const r = 34;
    const start = Math.PI * 0.5;
    const span = Math.PI;
    const goldLo = 0.78 - bonus;
    const goldHi = 1.24 + bonus;
    const map = (v) => start + Math.min(1.3, v) / 1.3 * span;
    // Raw band.
    ctx.strokeStyle = '#5a8a5a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, map(0.5));
    ctx.stroke();
    // Golden band.
    ctx.strokeStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, r, map(goldLo), map(Math.min(goldHi, 1.3)));
    ctx.stroke();
    // Burn band.
    ctx.strokeStyle = PALETTE.danger;
    ctx.beginPath();
    ctx.arc(cx, cy, r, map(Math.min(goldHi, 1.3)), start + span);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Needle.
    const a = map(Math.min(1.3, t));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------- particles and popups

  drawParticles(engine) {
    const ctx = this.ctx;
    for (const p of engine.fx.particles) {
      if (!p.active) continue;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 'steam') { ctx.globalAlpha = k * 0.5; ctx.fillStyle = p.tint; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - k), 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'smoke') { ctx.globalAlpha = k * 0.55; ctx.fillStyle = p.tint; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'spark') { ctx.globalAlpha = k; ctx.fillStyle = p.tint; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === 'glint') {
        const tw = k < 0.5 ? k * 2 : (1 - k) * 2;
        ctx.globalAlpha = Math.max(0, tw);
        ctx.fillStyle = p.tint;
        const r = p.size * (0.5 + 0.5 * tw);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r * 0.22, p.y - r * 0.22);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.22, p.y + r * 0.22);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r * 0.22, p.y + r * 0.22);
        ctx.lineTo(p.x - r, p.y);
        ctx.lineTo(p.x - r * 0.22, p.y - r * 0.22);
        ctx.closePath();
        ctx.fill();
      }
      else if (p.kind === 'slice') { ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.fillStyle = p.tint; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
      else if (p.kind === 'fleck') { ctx.globalAlpha = k; ctx.fillStyle = p.tint; ctx.fillRect(p.x, p.y, p.size, p.size); }
      else if (p.kind === 'coin') {
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.angle))), 1);
        ctx.fillStyle = p.tint;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.brassDark;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(engine) {
    const ctx = this.ctx;
    for (const p of engine.fx.popups) {
      if (!p.active) continue;
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.textAlign = 'center';
      ctx.font = `bold 20px ${FONT_UI}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- HUD, title, shop

  hudPlaque(x, y, w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20,11,6,0.82)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  drawHud(engine) {
    const ctx = this.ctx;
    const p = engine.progression;
    // A dark eyebrow strip so the HUD always reads.
    vGradient(ctx, 0, 0, W, HUD_H, 'rgba(10,6,3,0.95)', 'rgba(10,6,3,0.55)');
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0, HUD_H - 3, W, 3);
    // Score and combo.
    this.text('SCORE', 24, 20, 12, PALETTE.brass, 'left', FONT_UI);
    this.text(`${p.score}`, 24, 44, 24, PALETTE.text, 'left', FONT_UI);
    let comboColor = PALETTE.textDim;
    if (p.combo >= 9) comboColor = '#ff8a2a';
    else if (p.combo >= 3) comboColor = PALETTE.gold;
    this.text(`COMBO x${p.multiplier}`, 220, 40, 18, comboColor, 'left', FONT_UI);
    this.text(`${p.combo} in a row`, 220, 20, 12, PALETTE.textDim, 'left', FONT_UI);
    // Coins.
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(W - 40, 28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W - 40, 28, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    this.text(`${p.coins}`, W - 58, 28, 22, PALETTE.text, 'right', FONT_UI);
    this.text('coins', W - 58, 44, 12, PALETTE.textDim, 'right', FONT_UI);
    // Shift.
    this.text(`SHIFT ${p.shift}`, W / 2, 34, 20, PALETTE.text, 'center', FONT_UI);
    this.text('Aether Express — Grand Dining Car', W / 2, 18, 12, PALETTE.brass, 'center', FONT_UI);
    // Combo sparkle.
    if (p.feverActive) {
      ctx.fillStyle = 'rgba(255,138,42,0.10)';
      ctx.fillRect(0, HUD_H, W, H - HUD_H);
    }
  }

  drawTitle(engine) {
    const ctx = this.ctx;
    const best = engine.progression.best;
    const pw = 760;
    const ph = 440;
    const px = (W - pw) / 2;
    const py = 150;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(16,9,4,0.9)';
    roundRect(ctx, px, py, pw, ph, 18);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 4;
    roundRect(ctx, px, py, pw, ph, 18);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Brass corner studs.
    for (const [sx, sy] of [[px + 18, py + 18], [px + pw - 18, py + 18], [px + 18, py + ph - 18], [px + pw - 18, py + ph - 18]]) {
      ctx.fillStyle = PALETTE.brassLight;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    this.text('AETHER EXPRESS', W / 2, py + 74, 46, PALETTE.brassLight, 'center');
    this.text('GRAND DINING CAR', W / 2, py + 108, 26, PALETTE.text, 'center', FONT_UI);
    this.text('Cook each dish step by step before the passengers lose patience.', W / 2, py + 158, 18, PALETTE.textDim, 'center', FONT_UI);
    this.text('Click a passenger to take their order, then hold to cook at the glowing station.', W / 2, py + 186, 16, PALETTE.textDim, 'center', FONT_UI);
    this.text('Release while the arc is golden. Build the dish, then click a passenger to serve.', W / 2, py + 210, 16, PALETTE.textDim, 'center', FONT_UI);
    this.text('1-4 or click to choose a station  ·  Space or mouse to cook  ·  M to mute', W / 2, py + 246, 15, PALETTE.brass, 'center', FONT_UI);
    if (best > 0) this.text(`Best score ${best}`, W / 2, py + 282, 18, PALETTE.gold, 'center', FONT_UI);
    // The board button.
    const bx = W / 2 - 130;
    const by = 596;
    ctx.fillStyle = PALETTE.brass;
    roundRect(ctx, bx, by, 260, 60, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.brassLight;
    roundRect(ctx, bx, by, 260, 8, 8);
    ctx.fill();
    this.text('BOARD THE TRAIN', W / 2, by + 38, 22, '#2a1a0e', 'center', FONT_UI);
  }

  drawShop(engine) {
    const ctx = this.ctx;
    const p = engine.progression;
    ctx.fillStyle = 'rgba(8,5,2,0.72)';
    ctx.fillRect(0, 0, W, H);
    this.text('KITCHEN UPGRADE SHOP', W / 2, 118, 40, PALETTE.brassLight, 'center');
    const r = engine.shiftReport;
    if (r !== null) {
      this.text(`Shift ${r.shift} closed  ·  ${r.served} served  ·  ${r.lost} lost  ·  score ${r.score}  ·  best combo x${r.bestCombo}`, W / 2, 158, 18, PALETTE.text, 'center', FONT_UI);
    }
    // The purse.
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(W / 2 - 96, 200, 13, 0, Math.PI * 2);
    ctx.fill();
    this.text(`${p.coins} coins to spend`, W / 2 - 74, 206, 22, PALETTE.text, 'left', FONT_UI);

    for (let i = 0; i < UPGRADES.length; i += 1) {
      const up = UPGRADES[i];
      const rowY = 300 + i * 74;
      const affordable = p.canBuy(up.id);
      const maxed = p.levels[up.id] >= up.max;
      // Affordable cards sit brighter and carry a BUY pill; the rest are dimmed so the choice reads at a glance.
      ctx.save();
      if (affordable) { ctx.shadowColor = 'rgba(255,207,74,0.5)'; ctx.shadowBlur = 14; }
      this.hudPlaque(300, rowY, 680, 62);
      ctx.restore();
      if (!affordable && !maxed) {
        ctx.fillStyle = 'rgba(8,5,2,0.42)';
        roundRect(ctx, 300, rowY, 680, 62, 10);
        ctx.fill();
      }
      ctx.fillStyle = maxed ? PALETTE.brassDark : affordable ? PALETTE.brass : '#5a4a2a';
      roundRect(ctx, 306, rowY + 4, 8, 54, 4);
      ctx.fill();
      this.text(up.name, 330, rowY + 26, 20, maxed ? PALETTE.brassLight : affordable ? PALETTE.text : PALETTE.textDim, 'left', FONT_UI);
      this.text(maxed ? `${up.desc} — fully upgraded` : upgradeDelta(up.id, p.levels[up.id]), 330, rowY + 47, 14,
        maxed ? PALETTE.brassLight : affordable ? PALETTE.gold : PALETTE.textDim, 'left', FONT_UI);
      // Level pips.
      for (let l = 0; l < up.max; l += 1) {
        ctx.fillStyle = l < p.levels[up.id] ? PALETTE.gold : 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.arc(690 + l * 20, rowY + 25, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      const cost = p.costOf(up.id);
      this.text(maxed ? 'MAX' : `${cost}`, 942, rowY + 30, 22, maxed ? PALETTE.brassLight : affordable ? PALETTE.gold : PALETTE.danger, 'right', FONT_UI);
      if (!maxed) {
        ctx.fillStyle = affordable ? PALETTE.brass : 'rgba(122,92,30,0.35)';
        roundRect(ctx, 954, rowY + 15, 20, 32, 5);
        ctx.fill();
        this.text(affordable ? '›' : '—', 964, rowY + 37, 16, affordable ? '#2a1a0e' : PALETTE.textDim, 'center', FONT_UI);
      }
      if (maxed) this.text('MAX LEVEL', 964, rowY + 47, 10, PALETTE.brassLight, 'center', FONT_UI);
    }
    const bx = W / 2 - 130;
    const by = 596;
    ctx.fillStyle = PALETTE.brass;
    roundRect(ctx, bx, by, 260, 60, 12);
    ctx.fill();
    this.text(`OPEN SHIFT ${p.shift + 1}`, W / 2, by + 38, 22, '#2a1a0e', 'center', FONT_UI);
    this.text('Click an upgrade to buy it  ·  Space to open the next shift', W / 2, 686, 14, PALETTE.textDim, 'center', FONT_UI);
  }
}
