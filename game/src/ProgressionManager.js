// ProgressionManager — coins, the combo multiplier, shift days, the Kitchen Upgrade Shop and the
// best score kept in localStorage. The manager owns no rendering; it only counts and levels up.

/** The upgrades the shop sells, their cost curve and the effect they name. */
export const UPGRADES = [
  { id: 'heat', name: 'Brass Burners', desc: 'Slightly larger golden cook window', base: 60, max: 4 },
  { id: 'patience', name: 'Comfy Seating', desc: 'Passengers wait longer', base: 70, max: 4 },
  { id: 'tip', name: 'Silver Service', desc: 'Bigger tips for a perfect dish', base: 80, max: 4 },
  { id: 'combo', name: 'Fever Coal', desc: 'FEVER RUSH fills faster', base: 90, max: 3 },
];

const BEST_KEY = 'aether-express-best';

export class ProgressionManager {
  /** @param {Storage|null} storage  window.localStorage, or null when it is blocked */
  constructor(storage) {
    this.storage = storage;
    this.score = 0;
    this.coins = 0;
    this.shift = 1;
    this.combo = 0;
    this.bestCombo = 0;
    this.ordersServed = 0;
    this.ordersLost = 0;
    this.fever = 0;
    this.feverActive = false;
    this.feverTimer = 0;
    this.levels = { heat: 0, patience: 0, tip: 0, combo: 0 };
    this.best = this.readBest();
    this.spent = 0;
  }

  readBest() {
    if (this.storage === null) return 0;
    try { return Number.parseInt(this.storage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
  }

  saveBest() {
    if (this.storage === null) return;
    try { this.storage.setItem(BEST_KEY, String(this.best)); } catch { /* private window */ }
  }

  beginShift(shift) {
    this.shift = shift;
    this.combo = 0;
    this.fever = 0;
    this.feverActive = false;
    this.feverTimer = 0;
  }

  /** The multiplier an order is paid at: the combo, doubled while FEVER RUSH burns. */
  get multiplier() {
    const base = 1 + Math.min(9, Math.floor(this.combo / 3));
    return this.feverActive ? base * 2 : base;
  }

  /** How much the tip is boosted by the Silver Service upgrade. */
  get tipBonus() {
    return 1 + this.levels.tip * 0.18;
  }

  /** The patience scale the Comfy Seating upgrade buys. */
  get patienceScale() {
    return 1 + this.levels.patience * 0.2;
  }

  /** The extra fraction of the arc that counts as golden. */
  get goldenBonus() {
    return this.levels.heat * 0.02;
  }

  /** How much fever a perfect dish adds, with the Fever Coal upgrade. */
  get feverGain() {
    return 1 + this.levels.combo * 0.25;
  }

  /** A finished order: add its value, bump the combo and charge the fever meter. */
  serve(recipe, quality, x, y, fx) {
    const base = recipe.value;
    const grade = quality >= 0.999 ? 'PERFECT' : quality >= 0.55 ? 'Good' : 'Okay';
    const gradeScale = grade === 'PERFECT' ? 1.6 : grade === 'Good' ? 1.15 : 0.8;
    const gained = Math.round(base * gradeScale * this.multiplier * this.tipBonus);
    this.score += gained;
    this.coins += Math.max(1, Math.round(gained / 10));
    this.ordersServed += 1;
    this.combo += 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.fever = Math.min(1, this.fever + (grade === 'PERFECT' ? 0.34 : grade === 'Good' ? 0.16 : 0.06) * this.feverGain);
    if (grade === 'PERFECT') fx.popup(`+${gained}  PERFECT!`, x, y, '#ffcf4a', 1.25);
    else fx.popup(`+${gained}  ${grade}`, x, y, grade === 'Good' ? '#7ad46a' : '#b8a37e', 1);
    if (this.combo >= 3) fx.popup(`${this.multiplier}x COMBO`, x, y + 30, '#ff8a2a', 0.9);
    if (this.best < this.score) { this.best = this.score; this.saveBest(); }
    return gained;
  }

  /** A passenger walked out: break the combo, count the loss. */
  lose() {
    this.combo = 0;
    this.ordersLost += 1;
    this.fever = Math.max(0, this.fever - 0.2);
  }

  /** Advance fever timers by one step; returns true on the step FEVER RUSH ignites. */
  tickFever(dt) {
    if (this.feverActive) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) { this.feverActive = false; this.fever = 0; }
      return false;
    }
    if (this.fever >= 1) {
      this.feverActive = true;
      this.feverTimer = 9;
      this.fever = 1;
      return true;
    }
    return false;
  }

  /** The shop's cost of the next level of an upgrade. */
  costOf(id) {
    const up = UPGRADES.find((u) => u.id === id);
    const level = this.levels[id];
    return up.base + level * Math.round(up.base * 0.7);
  }

  canBuy(id) {
    const up = UPGRADES.find((u) => u.id === id);
    return this.levels[id] < up.max && this.coins >= this.costOf(id);
  }

  buy(id) {
    if (!this.canBuy(id)) return false;
    this.coins -= this.costOf(id);
    this.levels[id] += 1;
    this.spent += 1;
    return true;
  }

  /** Coin value of the till, for the HUD. */
  get till() { return this.coins; }
}
