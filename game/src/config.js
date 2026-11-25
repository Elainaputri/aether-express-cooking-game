// Aether Express: Grand Dining Car — shared constants.
// All tunables for the 1280x720 logical playfield, the palette and the font live here.

/** The logical playfield: every coordinate in the game is in these units, scaled to the window. */
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step (seconds): the engine advances in whole steps of this size. */
export const STEP = 1 / 60;

/** The stack Windows/Mac/Linux browsers all have, so no webfont is ever fetched. */
export const FONT = '"Georgia", "Times New Roman", serif';
export const FONT_UI = '"Trebuchet MS", "Segoe UI", sans-serif';

/** The station slots along the counter, left to right. */
export const STATION_ORDER = ['GRILL', 'WOK', 'OVEN', 'GARDEN'];

/** How many passengers may wait at once. */
export const SEATS = 4;

/** The cooking arc: raw -> golden -> burnt, in seconds of continuous cooking. */
export const DONENESS = { raw: 0.28, golden: 0.72, burn: 1.0 };

/** Colours of the vintage brass-and-mahogany dining car. */
export const PALETTE = {
  backdrop: '#140b06',
  skyTop: '#2a1a4a',
  skyMid: '#8a3f5c',
  skyLow: '#e08a4a',
  sun: '#ffe0a0',
  mountainFar: '#4a2a52',
  mountainMid: '#38203e',
  mountainNear: '#231223',
  cloud: 'rgba(255,214,180,0.35)',
  wood: '#3a1d12',
  woodLight: '#5a2e1c',
  woodDark: '#241008',
  brass: '#c9a24b',
  brassLight: '#f0d488',
  brassDark: '#7a5c1e',
  carpet: '#6a1420',
  carpetDark: '#3d0a12',
  counterTop: '#caa06a',
  counterEdge: '#7a4a24',
  steel: '#8d99a6',
  steelDark: '#4a535e',
  flame: '#ff8a2a',
  flameHot: '#ffd24a',
  steam: 'rgba(255,255,255,0.55)',
  text: '#f5e6c8',
  textDim: '#b8a37e',
  good: '#7ad46a',
  gold: '#ffcf4a',
  danger: '#e2564a',
  panel: 'rgba(20,11,6,0.72)',
  panelEdge: 'rgba(201,162,75,0.55)',
  card: '#f3e2c0',
  cardEdge: '#8a5a2a',
  ink: '#2a1a0e',
};
