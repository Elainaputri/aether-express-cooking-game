// ParticleAndFX — every spark, steam puff, flying slice, score popup and coin in the dining car.
// One pool per effect: particles are plain objects reused, so a busy frame allocates nothing.

/** A steam puff, oil sparkle, herb fleck or coin: position, velocity, life and look. */
class Particle {
  constructor() {
    this.active = false;
    this.kind = 'steam';
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.life = 0; this.max = 1;
    this.size = 1; this.tint = '#ffffff';
    this.spin = 0; this.angle = 0;
  }
}

/** A floating text popup ("+250 PERFECT!"). */
class Popup {
  constructor() {
    this.active = false;
    this.text = '';
    this.x = 0; this.y = 0; this.life = 0; this.max = 1;
    this.color = '#ffffff';
    this.scale = 1;
    this.vy = -46;
  }
}

const MAX_PARTICLES = 420;
const MAX_POPUPS = 24;

export class ParticleAndFX {
  constructor(random) {
    this.random = random;
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i += 1) this.particles.push(new Particle());
    this.popups = [];
    for (let i = 0; i < MAX_POPUPS; i += 1) this.popups.push(new Popup());
    this.screenShake = 0;
  }

  reset() {
    for (const p of this.particles) p.active = false;
    for (const p of this.popups) p.active = false;
    this.screenShake = 0;
  }

  /** A free particle slot, or a spent one reused. */
  freeParticle() {
    for (const p of this.particles) if (!p.active) return p;
    return this.particles[0];
  }

  init(p, kind, x, y, vx, vy, max, size, tint) {
    p.active = true;
    p.kind = kind;
    p.x = x; p.y = y;
    p.vx = vx; p.vy = vy;
    p.life = max; p.max = max;
    p.size = size; p.tint = tint;
    p.angle = 0;
    p.spin = (this.random.float() - 0.5) * 6;
    return p;
  }

  /** Steam rising off a hot pan or the oven. */
  steam(x, y, count = 3, power = 1) {
    for (let i = 0; i < count; i += 1) {
      const p = this.freeParticle();
      this.init(p, 'steam', x + (this.random.float() - 0.5) * 26, y,
        (this.random.float() - 0.5) * 14, -26 - this.random.float() * 30 * power,
        0.9 + this.random.float() * 0.7, 8 + this.random.float() * 12, '#ffffff');
    }
  }

  /** Golden oil sparkles and a lick of flame off the grill. */
  fire(x, y, count = 5) {
    for (let i = 0; i < count; i += 1) {
      const p = this.freeParticle();
      const hot = this.random.float() > 0.4;
      this.init(p, 'spark', x + (this.random.float() - 0.5) * 34, y + 8,
        (this.random.float() - 0.5) * 70, -40 - this.random.float() * 90,
        0.35 + this.random.float() * 0.35, 3 + this.random.float() * 4,
        hot ? '#ffd24a' : '#ff7a2a');
    }
  }

  /** A slice of ingredient thrown from a board toward a plate. */
  slice(fromX, fromY, toX, toY, tint) {
    const p = this.freeParticle();
    const life = 0.42;
    this.init(p, 'slice', fromX, fromY, (toX - fromX) / life, (toY - fromY) / life - 60,
      life, 11, tint);
  }

  /** Herb flecks and a little dust when a step is finished. */
  flecks(x, y, tint, count = 6) {
    for (let i = 0; i < count; i += 1) {
      const p = this.freeParticle();
      this.init(p, 'fleck', x, y, (this.random.float() - 0.5) * 90,
        -30 + (this.random.float() - 0.5) * 50, 0.5 + this.random.float() * 0.5,
        3 + this.random.float() * 3, tint);
    }
  }

  /** A coin that arcs from a plate to the till. */
  coin(fromX, fromY, toX, toY, delay = 0) {
    const p = this.freeParticle();
    const life = 0.7 + delay;
    const pdx = toX - fromX;
    const pdy = toY - fromY;
    p.active = true;
    p.kind = 'coin';
    p.x = fromX; p.y = fromY;
    p.vx = pdx / life;
    p.vy = pdy / life - 150;
    p.life = life; p.max = life;
    p.size = 13; p.tint = '#ffcf4a';
    p.angle = 0; p.spin = 7;
  }

  /** Smoke when a step is burnt. */
  smoke(x, y, count = 10) {
    for (let i = 0; i < count; i += 1) {
      const p = this.freeParticle();
      this.init(p, 'smoke', x + (this.random.float() - 0.5) * 20, y,
        (this.random.float() - 0.5) * 18, -20 - this.random.float() * 24,
        1.0 + this.random.float(), 12 + this.random.float() * 16, '#3a3a3a');
    }
  }

  /** A floating text popup at (x,y). */
  popup(text, x, y, color = '#ffcf4a', scale = 1) {
    let slot = null;
    for (const p of this.popups) if (!p.active) { slot = p; break; }
    if (slot === null) slot = this.popups[0];
    slot.active = true;
    slot.text = text;
    slot.x = x; slot.y = y;
    slot.life = 1.1; slot.max = 1.1;
    slot.color = color;
    slot.scale = scale;
    slot.vy = -46;
  }

  shake(amount) {
    this.screenShake = Math.min(16, this.screenShake + amount);
  }

  /** Advance every effect. */
  update(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.kind === 'coin') p.vy += 420 * dt;
      else if (p.kind === 'slice') p.vy += 260 * dt;
      else if (p.kind === 'steam' || p.kind === 'smoke') p.vy += 6 * dt;
      else p.vy += 120 * dt;
    }
    for (const p of this.popups) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.y += p.vy * dt;
      p.vy += 90 * dt;
    }
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 40);
  }
}
