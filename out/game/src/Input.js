// Input — one place for the mouse and the keyboard.
// The player may click a station (or a passenger) or use the number keys 1-4 and Space, so the
// game is playable with either hand. Each frame the engine asks what was pressed and what is held.

/** The actions a frame can carry, as a bit set. */
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointer = { x: -1, y: -1, down: false, downX: 0, downY: 0, downT: 0 };
    this.heldKeys = new Set();
    this.actions = 0;
    this.pointerClicked = false;
    this.pointerHeld = false;
    this.onUnlock = null;
    this.bind();
  }

  bind() {
    const canvas = this.canvas;
    const toField = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.fieldW / Math.max(1, rect.width);
      const scaleY = this.fieldH / Math.max(1, rect.height);
      return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    };
    canvas.addEventListener('pointerdown', (event) => {
      const p = toField(event);
      this.pointer.x = p.x; this.pointer.y = p.y;
      this.pointer.down = true;
      this.pointer.downX = p.x; this.pointer.downY = p.y;
      this.pointer.downT = performance.now();
      this.pointerClicked = true;
      this.pointerHeld = true;
      if (this.onUnlock) this.onUnlock();
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', (event) => {
      const p = toField(event);
      this.pointer.x = p.x; this.pointer.y = p.y;
    });
    const release = () => { this.pointer.down = false; this.pointerHeld = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', () => { if (!this.pointer.down) this.pointer.x = -1; });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const key = event.key;
      if (key === ' ') { this.actions |= ACTION_CONFIRM; event.preventDefault(); }
      else if (key === 'p' || key === 'P') this.actions |= ACTION_PAUSE;
      else if (key === 'm' || key === 'M') this.actions |= ACTION_MUTE;
      else this.heldKeys.add(key);
      if (this.onUnlock) this.onUnlock();
    });
    window.addEventListener('keyup', (event) => { this.heldKeys.delete(event.key); });
    this.fieldW = 1280;
    this.fieldH = 720;
  }

  /** The engine sets the field size each frame so pointer maths follows the letterbox scale. */
  setField(w, h) { this.fieldW = w; this.fieldH = h; }

  /** A station index 0-3 when 1-4 (or the numpad) is pressed, else -1. */
  stationKey() {
    for (const k of this.heldKeys) {
      if (k === '1' || k === '&') return 0;
      if (k === '2' || k === 'é') return 1;
      if (k === '3' || k === '"') return 2;
      if (k === '4' || k === "'") return 3;
    }
    return -1;
  }

  /** Take the frame's one-shot actions and reset them. */
  takeActions() {
    const a = this.actions;
    this.actions = 0;
    return a;
  }

  consumeClick() {
    const c = this.pointerClicked;
    this.pointerClicked = false;
    return c;
  }

  /** Whether the cook button is held (space down or pointer down). */
  isCooking() {
    return this.pointer.down || this.heldKeys.has(' ');
  }
}
