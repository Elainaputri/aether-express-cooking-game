// SoundSynthesizer — every sound in the car, made with the Web Audio API alone (no audio files).
// Oscillators shape a chop thunk, a sizzle, a bell, a coin, a buzzer and a soft ragtime loop that
// is scheduled bar by bar. Nothing is fetched; the whole score is arithmetic.

/** A little equal-tempered helper: MIDI note -> hertz. */
const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);

export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicOn = true;
    this.nextBar = 0;
    this.barIndex = 0;
  }

  /** Build the graph on the first user gesture (browsers demand one). Safe to call often. */
  unlock() {
    if (this.ctx !== null) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.nextBar = this.ctx.currentTime + 0.1;
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master !== null) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** One shaped tone: a sine/triangle/noise burst through an envelope. */
  tone(freq, dur, type, gain, detune = 0, slideTo = 0) {
    if (this.ctx === null || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** A filtered white-noise burst (a sizzle, a chop, a whoosh). */
  noise(dur, gain, freq, q = 1, slideTo = 0) {
    if (this.ctx === null || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) filter.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  chop() { this.noise(0.09, 0.5, 1400, 1.2, 400); this.tone(120, 0.08, 'square', 0.12); }
  sizzle() { this.noise(0.22, 0.16, 3600, 0.8, 2000); }
  perfect() { this.tone(hz(88), 0.5, 'triangle', 0.24); this.tone(hz(92), 0.4, 'sine', 0.16); this.tone(hz(95), 0.32, 'sine', 0.12, 6); }
  good() { this.tone(hz(79), 0.28, 'triangle', 0.2); this.tone(hz(83), 0.24, 'sine', 0.12); }
  burn() { this.tone(180, 0.5, 'sawtooth', 0.18, 0, 60); this.noise(0.4, 0.2, 500, 0.7, 200); }
  coin() { this.tone(hz(96), 0.1, 'square', 0.16); this.tone(hz(100), 0.18, 'triangle', 0.14); }
  bell() { this.tone(hz(84), 1.1, 'sine', 0.2); this.tone(hz(88), 0.9, 'sine', 0.12, 4); this.tone(hz(91), 0.7, 'sine', 0.08, -4); }
  /** A bright two-note chime: the dish is plated and ready on the pass. */
  ding() { this.tone(hz(96), 0.6, 'sine', 0.26); this.tone(hz(103), 0.8, 'sine', 0.18, 0); this.tone(hz(108), 0.5, 'triangle', 0.1, 5); }
  /** A rising aether whoosh as FEVER RUSH ignites. */
  whoosh() { this.noise(0.5, 0.22, 300, 0.8, 3200); this.tone(hz(60), 0.6, 'sawtooth', 0.12, 0, hz(84)); }
  buzzer() { this.tone(150, 0.4, 'sawtooth', 0.2, 0, 120); this.tone(140, 0.4, 'square', 0.12); }
  fever() { this.tone(hz(72), 0.7, 'sawtooth', 0.16); this.tone(hz(79), 0.7, 'square', 0.12); this.tone(hz(84), 0.9, 'triangle', 0.14); }
  select() { this.tone(hz(81), 0.07, 'square', 0.1); }

  /** A soft two-bar ragtime loop, scheduled just ahead of the clock; call every frame. */
  update() {
    if (this.ctx === null || this.muted || !this.musicOn || this.musicGain === null) return;
    const bar = 1.6;
    while (this.nextBar < this.ctx.currentTime + 0.4) {
      const t = this.nextBar;
      const chords = [
        [53, 57, 60], [58, 62, 65], [51, 55, 58], [55, 58, 62],
      ][this.barIndex % 4];
      for (let i = 0; i < chords.length; i += 1) {
        this.musicNote(hz(chords[i]), t + i * 0.02, 0.42, 'triangle', 0.05);
      }
      const bass = [[41, 45], [46, 50], [39, 43], [43, 47]][this.barIndex % 4];
      for (let i = 0; i < 4; i += 1) {
        this.musicNote(hz(bass[i % 2]), t + i * (bar / 4), 0.2, 'sine', 0.07);
      }
      this.nextBar += bar;
      this.barIndex += 1;
    }
  }

  musicNote(freq, when, dur, type, gain) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
