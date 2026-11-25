// RecipeSystem — the dishes of the Grand Dining Car.
// A recipe is an ordered list of steps; a step names the station it cooks at, the ingredient it
// puts on the plate and how long its perfect cook takes. The system picks a dish for a passenger
// from the shifts unlocked so far, so the menu deepens as the journey goes on.

/** One cooking step of a recipe. */
export class RecipeStep {
  /**
   * @param {string} station  one of STATION_ORDER (GRILL, WOK, OVEN, GARDEN)
   * @param {string} label    the ingredient shown while it cooks ("Seared Steak")
   * @param {number} seconds  the time a perfectly timed cook takes
   * @param {string} tint     the colour the ingredient draws in
   */
  constructor(station, label, seconds, tint) {
    this.station = station;
    this.label = label;
    this.seconds = seconds;
    this.tint = tint;
  }
}

/** A dish: a name, a price and the steps that build it. */
export class Recipe {
  /** @param {string} name @param {RecipeStep[]} steps */
  constructor(name, steps, garnish = 0) {
    this.name = name;
    this.steps = steps;
    /** Which step of the plating each ingredient lands on, keyed by step index. */
    this.garnish = garnish;
    this.value = Math.round(steps.reduce((sum, s) => sum + s.seconds, 0) * 26);
  }
}

/** Every dish in the car's book, with the shift it first appears on. */
export const MENU = [
  new Recipe('Silverline Omelette', [
    new RecipeStep('WOK', 'Butter', 1.6, '#ffe08a'),
    new RecipeStep('GRILL', 'Farm Egg', 2.2, '#ffd24a'),
    new RecipeStep('GARDEN', 'Chives', 0.9, '#7ad46a'),
  ]),
  new Recipe('Ambassador Steak', [
    new RecipeStep('GRILL', 'Entrecôte', 3.0, '#c85a3a'),
    new RecipeStep('OVEN', 'Rest', 1.4, '#a04a2a'),
    new RecipeStep('GARDEN', 'Peppercorn', 1.0, '#8a6a3a'),
  ]),
  new Recipe('Orient Express Noodles', [
    new RecipeStep('WOK', 'Broth', 1.7, '#e0b060'),
    new RecipeStep('WOK', 'Silk Noodles', 2.4, '#f0d89a'),
    new RecipeStep('GARDEN', 'Spring Onion', 1.0, '#6ac46a'),
  ]),
  new Recipe('Consul Mushroom Soup', [
    new RecipeStep('WOK', 'Cream', 1.8, '#f0e0c0'),
    new RecipeStep('OVEN', 'Cep', 2.1, '#b08050'),
    new RecipeStep('GARDEN', 'Thyme', 0.8, '#7ad46a'),
  ]),
  new Recipe('Duchess Trout', [
    new RecipeStep('OVEN', 'River Trout', 3.2, '#9ad0d8'),
    new RecipeStep('GRILL', 'Char', 1.5, '#e08a5a'),
    new RecipeStep('GARDEN', 'Lemon', 0.9, '#f4e04a'),
  ]),
  new Recipe('Midnight Soufflé', [
    new RecipeStep('WOK', 'Batter', 2.0, '#f6e6b0'),
    new RecipeStep('OVEN', 'Rise', 3.4, '#f0c890'),
    new RecipeStep('OVEN', 'Cocoa', 1.2, '#7a4a2a'),
  ]),
  new Recipe('Royal Lobster Thermidor', [
    new RecipeStep('GRILL', 'Lobster', 2.6, '#e06a5a'),
    new RecipeStep('WOK', 'Brandy Cream', 2.2, '#f0dca0'),
    new RecipeStep('OVEN', 'Gratin', 2.8, '#f0c060'),
    new RecipeStep('GARDEN', 'Tarragon', 0.9, '#6ac46a'),
  ]),
  new Recipe("Emperor's Tasting Plate", [
    new RecipeStep('GRILL', 'Wagyu', 2.8, '#c8503a'),
    new RecipeStep('WOK', 'Glaze', 1.8, '#e0a040'),
    new RecipeStep('OVEN', 'Truffle', 2.4, '#8a6a4a'),
    new RecipeStep('GARDEN', 'Gold Leaf', 1.1, '#ffd24a'),
  ]),
];

/** The recipes a passenger may order, growing with the shift number. */
export class RecipeSystem {
  constructor(random) {
    this.random = random;
    /** How many dishes of the menu are on offer; 3 at the start, one more each shift. */
    this.unlocked = 3;
  }

  /** Open one more dish of the book (called between shifts). */
  unlockNext() {
    this.unlocked = Math.min(MENU.length, this.unlocked + 1);
  }

  /** Pick a dish for a passenger, favouring the newer, richer ones a little as shifts go on. */
  draw() {
    const pool = MENU.slice(0, this.unlocked);
    const weighted = [];
    for (let i = 0; i < pool.length; i += 1) {
      const weight = 1 + Math.floor((i / pool.length) * this.unlocked);
      for (let w = 0; w < weight; w += 1) weighted.push(pool[i]);
    }
    return weighted[this.random.int(weighted.length)];
  }
}
