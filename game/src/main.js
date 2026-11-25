// Boot and the game loop for Aether Express: Grand Dining Car.
//
// The engine reads the mouse and keyboard each frame and advances the world in fixed 1/60 s steps
// (several in a slow frame, none in a fast one); the renderer paints what is there.
//
// ?shot=cook|ready|fever|shop (with &seed=N) stages that scene instead of running the loop, paints
// it twice and sets window.__shotReady, so shots.json can photograph the game mid-service.
import { FIELD } from './config.js';
import { GameEngine } from './GameEngine.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const engine = new GameEngine(canvas, status, seed);
const renderer = new Renderer(canvas, Boolean(shot));
engine.renderer = renderer;

/** Stage a scene, paint it twice, then flag it ready for the screenshot. */
function runShot(name) {
  window.__shotName = name;
  engine.reset(seed);
  stageShot(name, engine);
  let painted = 0;
  function paint() {
    renderer.draw(engine);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** The real loop: read input, catch up in fixed steps, draw. */
function runGame() {
  const input = new Input(canvas);
  input.setField(FIELD.width, FIELD.height);
  input.onUnlock = () => engine.sound.unlock();
  engine.reset(seed);
  engine.announce('Aether Express. Press Space or click to board.');
  function frame(now) {
    requestAnimationFrame(frame);
    engine.tick(now, input);
  }
  // Leaving the tab drops the accumulated time rather than replaying it unseen.
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.last = 0; });
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
