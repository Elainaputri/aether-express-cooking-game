// The staged scenes behind ?shot=cook|ready|fever|shop. Each one drives the real engine forward
// from a fresh seed with a small deterministic autopilot (take an order, cook each step near the
// golden zone, plate the dish, serve it), and stops the moment the scene is worth photographing.
// No randomness beyond the seed, so the same query always paints the same frame.
//
// The autopilot never touches the renderer: it fills the engine's per-frame intent, exactly as a
// player at the keyboard would, and calls the engine's own step.

import { STEP } from './config.js';
import { SCREEN_PLAY } from './GameEngine.js';

/** The y a click lands on when the autopilot chooses a passenger's order card. */
const CARD_Y = 220;
/** The fraction of a step's perfect time the autopilot aims to release at. */
const RELEASE = 0.99;

/** Move the engine one step with a given intent: cook here, click there. */
function advance(engine, cooking, station, clickSeat) {
  const intent = engine.intent;
  intent.actions = 0;
  intent.cooking = cooking;
  intent.station = station;
  intent.clicks.length = 0;
  if (clickSeat >= 0) intent.clicks.push({ x: engine.customers.seatX[clickSeat], y: CARD_Y });
  engine.step();
}

/** The seat of the first waiting passenger whose order matches the plate on the pass. */
function matchingSeat(engine) {
  const plate = engine.stations.plate;
  if (plate === null) return -1;
  for (let i = 0; i < engine.customers.passengers.length; i += 1) {
    const p = engine.customers.passengers[i];
    if (p.state === 'waiting' && p.recipe === plate.recipe) return i;
  }
  return -1;
}

/** The seat of the first waiting passenger, whatever their order. */
function waitingSeat(engine) {
  for (let i = 0; i < engine.customers.passengers.length; i += 1) {
    if (engine.customers.passengers[i].state === 'waiting') return i;
  }
  return -1;
}

/**
 * The autopilot's next move, in the order a cook would: no plate, take the next order; a plate
 * ready, serve it to a passenger who wants that dish; a plate still building, cook the station the
 * current step needs and release near the golden zone.
 */
function pilot(engine) {
  const plate = engine.stations.plate;
  if (plate === null) {
    advance(engine, false, -1, waitingSeat(engine));
    return;
  }
  if (plate.ready) {
    advance(engine, false, -1, matchingSeat(engine));
    return;
  }
  const needed = engine.stations.neededStation();
  if (needed < 0) { advance(engine, false, -1, -1); return; }
  engine.activeStation = needed;
  const s = engine.stations.stations[needed];
  if (s.ingredient === null) { advance(engine, true, needed, -1); return; }
  const t = s.ingredient.cook / s.ingredient.seconds;
  advance(engine, t < RELEASE, needed, -1);
}

/** Run the autopilot for `seconds`, stopping early when `until` says so. */
function play(engine, seconds, until = null) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (engine.shiftTime <= 0) break;
    pilot(engine);
    if (until !== null && until(engine)) return;
  }
}

/** Cook the current step into the golden zone and stop, so the doneness arc is on screen. */
function cookToGolden(engine) {
  for (let i = 0; i < 600; i += 1) {
    if (engine.shiftTime <= 0) return;
    const needed = engine.stations.neededStation();
    if (needed < 0) { pilot(engine); continue; }
    engine.activeStation = needed;
    const s = engine.stations.stations[needed];
    if (s.ingredient !== null) {
      const t = s.ingredient.cook / s.ingredient.seconds;
      if (t >= 0.94) return;
    }
    advance(engine, true, needed, -1);
  }
}

/**
 * Set `engine` to the named scene (cook, ready, fever or shop; any other name is "cook") and
 * return the screen to draw. The engine must already be fresh (main.js resets it with the seed).
 */
export function stageShot(name, engine) {
  if (name === 'shop') {
    engine.startShift(1);
    play(engine, 60, (e) => e.progression.ordersServed >= 7);
    engine.shiftTime = 0.01;
    engine.step();
    let bought = 0;
    for (const id of ['heat', 'tip', 'combo', 'patience']) {
      if (bought >= 3) break;
      if (engine.progression.canBuy(id)) { engine.progression.buy(id); bought += 1; }
    }
    return engine.screen;
  }
  if (name === 'title') {
    for (let i = 0; i < 150; i += 1) engine.step();
    return engine.screen;
  }

  engine.startShift(1);
  if (name === 'ready') {
    // Two orders already served, then stop the instant a third dish is fully plated on the pass.
    play(engine, 60, (e) => e.progression.ordersServed >= 2 && e.stations.plate !== null && e.stations.plate.ready);
    return SCREEN_PLAY;
  }
  if (name === 'fever') {
    // Stop right as FEVER RUSH ignites on a live combo, while the tip coins are still flying.
    play(engine, 90, (e) => e.progression.feverActive && e.progression.combo >= 3);
    return SCREEN_PLAY;
  }
  // cook: a bustling peak rush — a dish mid-assembly on the pass, several guests waiting with
  // their order bubbles, and steam rolling off every brass pan.
  play(engine, 40, (e) => e.stations.plate !== null && e.stations.plate.built.length >= 1 && e.progression.ordersServed >= 1);
  cookToGolden(engine);
  // Put an ingredient on a second pan too, so two stations read as actively sizzling.
  const ns = engine.stations.neededStation();
  if (ns >= 0 && engine.stations.order !== null) {
    const st = engine.stations.stations;
    const other = st[(ns + 1) % st.length];
    const deco = engine.stations.order.recipe.steps[0];
    other.ingredient = { label: deco.label, tint: deco.tint, cook: deco.seconds * 0.6, seconds: deco.seconds, target: 0.6 };
    other.state = 'cooking';
    other.glow = 0.5;
  }
  // Fill every empty booth so the cover shows a busy car, then spread the patience bars.
  for (const p of engine.customers.passengers) {
    if (p.state === 'open') engine.customers.seatPassenger(p.seat);
  }
  let k = 0;
  for (const p of engine.customers.passengers) {
    if (p.state === 'waiting') { p.patience = [0.92, 0.7, 0.5, 0.34][k % 4]; k += 1; }
  }
  // Drifting steam over the pans so the kitchen reads as live and sizzling.
  for (const s of engine.stations.stations) {
    engine.fx.steam(s.panX, s.panY - 32, 4, 1.1);
    engine.fx.steam(s.panX + 20, s.panY - 26, 3, 0.9);
    engine.fx.fire(s.panX, s.panY + 8, 3);
  }
  return SCREEN_PLAY;
}
