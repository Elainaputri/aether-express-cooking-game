// CustomerAI — the passengers of the Grand Dining Car.
// Four archetypes board with their own patience, tip temper and chatter. Each waits at a seat with
// an order card of the dish they want; a dish served in time is paid and tipped, one that is not is
// lost with a huff. A seat cycles open -> waiting -> leaving -> open.

/** The four kinds of traveller, with the traits that shape how they behave. */
export const ARCHETYPES = [
  { id: 'regular', name: 'Regular Traveller', patience: 1.0, tip: 1.0, patience0: 26, tint: '#8fb4d8', line: 'Lovely evening on the line.' },
  { id: 'commuter', name: 'Impatient Commuter', patience: 0.62, tip: 0.85, patience0: 20, tint: '#e0a24a', line: 'Quick as you can, please.' },
  { id: 'critic', name: 'The Food Critic', patience: 0.9, tip: 1.7, patience0: 30, tint: '#c98ad8', line: 'I review the menu, you know.' },
  { id: 'vip', name: 'VIP Conductor', patience: 1.15, tip: 1.4, patience0: 34, tint: '#ffd24a', line: 'The line expects the best.' },
];

/** One seated passenger, or an empty seat. */
export class Passenger {
  constructor(random, seat) {
    this.random = random;
    this.seat = seat;
    this.archetype = ARCHETYPES[0];
    this.recipe = null;
    this.patience = 1;
    this.patienceMax = 1;
    this.state = 'open'; // open | waiting | served | leaving
    this.bob = random.float() * 6.283;
    this.reaction = '';
    this.reactionT = 0;
    this.orderT = 0;
  }
}

const TIPS = {
  regular: { perfect: 'Marvellous!', good: 'Very nice.', okay: 'Hm, all right.' },
  commuter: { perfect: 'Fast and fine!', good: 'No complaints.', okay: 'Took its time.' },
  critic: { perfect: 'Flawless. Five stars.', good: 'Respectable work.', okay: 'Under-seasoned.' },
  vip: { perfect: 'The line is honoured!', good: 'Adequate. A tip.', okay: 'Hmm.' },
};

export class CustomerAI {
  /** @param {object} deps  { random, recipes, progression, fx, sound } */
  constructor({ random, recipes, progression, fx, sound }) {
    this.random = random;
    this.recipes = recipes;
    this.progression = progression;
    this.fx = fx;
    this.sound = sound;
    this.passengers = [];
    for (let i = 0; i < 4; i += 1) this.passengers.push(new Passenger(random, i));
    this.spawnTimer = 1.2;
    this.seatX = [250, 520, 790, 1060];
  }

  reset() {
    for (const p of this.passengers) {
      p.state = 'open'; p.recipe = null; p.patience = 1; p.reactionT = 0; p.reaction = '';
    }
    this.spawnTimer = 0.8;
  }

  activeCount() {
    let n = 0;
    for (const p of this.passengers) if (p.state === 'waiting') n += 1;
    return n;
  }

  /** Send a passenger to a free seat with a fresh order. */
  seatPassenger(seat) {
    const p = this.passengers[seat];
    p.state = 'waiting';
    const roll = this.random.float();
    const bias = Math.min(0.55, (this.progression.shift - 1) * 0.07);
    if (roll < 0.06 + bias) p.archetype = ARCHETYPES[3];
    else if (roll < 0.22 + bias) p.archetype = ARCHETYPES[2];
    else if (roll < 0.55) p.archetype = ARCHETYPES[1];
    else p.archetype = ARCHETYPES[0];
    p.recipe = this.recipes.draw();
    p.patienceMax = p.archetype.patience0 * p.archetype.patience * this.progression.patienceScale;
    p.patience = 1;
    p.orderT = 0;
    this.sound.bell();
    return p;
  }

  /** A passenger's dish has been served: pay, tip and react. */
  serve(p, quality) {
    p.state = 'served';
    p.reactionT = 1.2;
    const key = quality >= 0.999 ? 'perfect' : quality >= 0.55 ? 'good' : 'okay';
    p.reaction = TIPS[p.archetype.id][key];
    const gained = this.progression.serve(p.recipe, quality, this.seatX[p.seat], 300, this.fx);
    const coins = Math.max(1, Math.round((gained / 10) * p.archetype.tip));
    for (let i = 0; i < Math.min(6, coins); i += 1) {
      this.fx.coin(this.seatX[p.seat], 330, 1180, 640, i * 0.05);
    }
    this.sound.perfect();
  }

  /** Advance waiting, patience, reactions and the arrival of the next passenger. */
  update(dt, shiftDemand) {
    let waiting = 0;
    for (const p of this.passengers) {
      if (p.state === 'waiting') {
        waiting += 1;
        p.patience -= dt / p.patienceMax;
        p.orderT += dt;
        if (p.patience <= 0) this.lose(p);
      } else if (p.state === 'served' || p.state === 'leaving') {
        p.reactionT -= dt;
        if (p.reactionT <= 0) { p.state = 'open'; p.recipe = null; p.reaction = ''; }
      }
    }
    // Arrivals: keep the car busy, and busier on later shifts; FEVER RUSH seats guests faster.
    this.spawnTimer -= dt;
    const cap = Math.min(4, 2 + Math.floor(shiftDemand / 1.2) + (this.progression.feverActive ? 1 : 0));
    if (this.spawnTimer <= 0 && waiting < cap) {
      for (const p of this.passengers) {
        if (p.state === 'open') { this.seatPassenger(p.seat); break; }
      }
      this.spawnTimer = Math.max(0.9, 3.4 - shiftDemand * 0.25) * (this.progression.feverActive ? 0.6 : 1) * (0.8 + this.random.float() * 0.5);
    }
    if (this.spawnTimer <= 0) this.spawnTimer = 0.4;
  }

  /** A passenger's patience ran out: lose the order and let them go. */
  lose(p) {
    p.state = 'leaving';
    p.patience = 0;
    p.reactionT = 1.1;
    p.reaction = this.random.pick([
      'I cannot wait longer.',
      'Ringing for the steward.',
      'This is too slow.',
      'I shall dine elsewhere.',
    ]);
    this.progression.lose();
    this.sound.buzzer();
    this.fx.popup('ORDER LOST', this.seatX[p.seat], 300, '#e2564a', 1);
    this.fx.shake(4);
  }
}
