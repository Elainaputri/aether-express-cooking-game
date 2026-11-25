// CharacterRenderer — the illustrated travellers of the Grand Dining Car.
// Each passenger is drawn from shapes with a distinct outfit, hat and expression, so the booths read
// as people rather than pills. Two entry points:
//   drawTraveler(ctx, p, x, bob, time)  — the seated portrait for a booth
//   drawThoughtBubble(ctx, p, x, y, time) — a round speech bubble with the dish icon and patience ring
// Nothing is loaded from disk: this is all Canvas 2D.

import { dishIcon } from './DishIllustrations.js';

/** A rounded rectangle path. */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A soft drop shadow ellipse. */
function soft(ctx, x, y, rx, ry, a = 0.24) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The outfit colours for each archetype. */
const OUTFIT = {
  regular: { coat: '#3f6a86', coatDark: '#294a63', trim: '#cfe0ea', hat: '#2e5670', skin: '#f0c9a0', hair: '#4a3526', accent: '#8fb4d8' },
  commuter: { coat: '#b8843a', coatDark: '#8a5c22', trim: '#f0dcb0', hat: '#8a5c22', skin: '#e8bd92', hair: '#3a2a1a', accent: '#e0a24a' },
  critic: { coat: '#6a3a7a', coatDark: '#4a2456', trim: '#d8b0e0', hat: '#2a1a2a', skin: '#eac6a0', hair: '#241a1a', accent: '#c98ad8' },
  vip: { coat: '#1f3550', coatDark: '#142238', trim: '#ffd24a', hat: '#142238', skin: '#f2cfa6', hair: '#2a2018', accent: '#ffd24a' },
};

/** A little four-point sparkle. */
function sparkle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** A floating heart. */
function heart(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.75);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 0.4, x - r * 0.3, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.3, y - r * 1.1, x + r * 1.3, y - r * 0.4, x, y + r * 0.75);
  ctx.fill();
}

/** A bead of sweat. */
function sweat(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(150,205,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r, y + r * 0.6, x, y + r * 0.9);
  ctx.quadraticCurveTo(x - r, y + r * 0.6, x, y - r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y + r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a seated passenger's portrait, centred over a booth at (x, ...).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p   the Passenger (uses p.archetype, p.state, p.patience, p.bob, p.reactionT)
 * @param {number} x   the seat centre
 * @param {number} bob a small vertical bob in pixels
 * @param {number} time engine time in seconds
 */
export function drawTraveler(ctx, p, x, bob, time) {
  const o = OUTFIT[p.archetype.id] || OUTFIT.regular;
  const urgent = p.state === 'waiting' && p.patience < 0.3;
  const leaving = p.state === 'leaving';
  const served = p.state === 'served';
  const hy = 218 + bob;

  // Shadow under the booth.
  soft(ctx, x, 306, 46, 10, 0.22);

  // Torso / coat.
  ctx.fillStyle = o.coat;
  ctx.beginPath();
  ctx.moveTo(x - 36, 306);
  ctx.quadraticCurveTo(x - 40, 250 + bob, x - 22, 244 + bob);
  ctx.quadraticCurveTo(x, 236 + bob, x + 22, 244 + bob);
  ctx.quadraticCurveTo(x + 40, 250 + bob, x + 36, 306);
  ctx.closePath();
  ctx.fill();
  // Coat shading on the right.
  ctx.fillStyle = o.coatDark;
  ctx.beginPath();
  ctx.moveTo(x + 10, 240 + bob);
  ctx.quadraticCurveTo(x + 34, 250 + bob, x + 36, 306);
  ctx.lineTo(x + 8, 306);
  ctx.closePath();
  ctx.fill();
  // Lapels and shirt V.
  ctx.fillStyle = o.trim;
  ctx.beginPath();
  ctx.moveTo(x - 14, 246 + bob);
  ctx.lineTo(x, 286 + bob);
  ctx.lineTo(x + 14, 246 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = o.coatDark;
  ctx.beginPath();
  ctx.moveTo(x - 14, 246 + bob);
  ctx.lineTo(x - 4, 268 + bob);
  ctx.lineTo(x - 12, 258 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 14, 246 + bob);
  ctx.lineTo(x + 4, 268 + bob);
  ctx.lineTo(x + 12, 258 + bob);
  ctx.closePath();
  ctx.fill();
  // Buttons (brass for the VIP).
  const btn = p.archetype.id === 'vip' ? '#ffd24a' : 'rgba(0,0,0,0.35)';
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = btn;
    ctx.beginPath();
    ctx.arc(x, 268 + i * 12 + bob, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Neck.
  ctx.fillStyle = o.skin;
  ctx.fillRect(x - 8, 236 + bob, 16, 12);

  // Head.
  ctx.fillStyle = o.skin;
  ctx.beginPath();
  ctx.ellipse(x, hy, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cheek shading.
  ctx.fillStyle = 'rgba(180,120,80,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 12, hy + 4, 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears.
  ctx.fillStyle = o.skin;
  ctx.beginPath();
  ctx.arc(x - 21, hy + 2, 5, 0, Math.PI * 2);
  ctx.arc(x + 21, hy + 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Hair / hat by archetype.
  drawHeadwear(ctx, p, x, hy, o, bob);

  // Face.
  drawFace(ctx, p, x, hy, o, urgent, leaving, served, time);

  // Archetype accessories.
  if (p.archetype.id === 'critic') {
    // A monocle and a little bow tie.
    ctx.strokeStyle = 'rgba(240,220,160,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 8, hy - 1, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.moveTo(x - 8, 262 + bob);
    ctx.lineTo(x, 266 + bob);
    ctx.lineTo(x - 8, 270 + bob);
    ctx.lineTo(x + 8, 266 + bob);
    ctx.closePath();
    ctx.fill();
  } else if (p.archetype.id === 'vip') {
    // Epaulettes and a gold collar braid.
    ctx.fillStyle = '#ffd24a';
    rr(ctx, x - 42, 244 + bob, 16, 8, 3);
    ctx.fill();
    rr(ctx, x + 26, 244 + bob, 16, 8, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,74,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 22, 246 + bob);
    ctx.quadraticCurveTo(x, 262 + bob, x + 22, 246 + bob);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (p.archetype.id === 'commuter') {
    // A folded newspaper tucked under one arm.
    ctx.fillStyle = '#efe7d0';
    ctx.save();
    ctx.translate(x + 30, 276 + bob);
    ctx.rotate(0.2);
    ctx.fillRect(-10, -14, 20, 26);
    ctx.fillStyle = 'rgba(60,50,40,0.4)';
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-7, -10 + i * 6, 14, 2);
    ctx.restore();
  }

  // Mood flourishes.
  if (served) {
    for (let i = 0; i < 3; i += 1) {
      const t = time * 1.6 + i * 2.1;
      heart(ctx, x - 24 + i * 24 + Math.sin(t) * 4, hy - 34 - i * 6, 4.5, i === 1 ? '#ff8a9a' : '#ff5a7a');
    }
    sparkle(ctx, x + 34, hy - 26, 5, '#ffe9a6');
  }
  if (urgent) {
    sweat(ctx, x + 26, hy - 12 - Math.abs(Math.sin(time * 6)) * 3, 4);
    sweat(ctx, x - 28, hy - 6, 3);
  }
  if (leaving) {
    // A puff of steam as they storm off.
    ctx.fillStyle = 'rgba(220,220,220,0.4)';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(x - 30 - i * 8, hy - 20 - i * 6, 6 - i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The hat or hair a passenger wears. */
function drawHeadwear(ctx, p, x, hy, o, bob) {
  const id = p.archetype.id;
  // Common hair cap.
  ctx.fillStyle = o.hair;
  ctx.beginPath();
  ctx.ellipse(x, hy - 8, 23, 16, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  if (id === 'vip') {
    // Peaked conductor's cap with brass band and badge.
    ctx.fillStyle = o.hat;
    ctx.beginPath();
    ctx.ellipse(x, hy - 16, 26, 15, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 26, hy - 17, 52, 8);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(x - 26, hy - 11, 52, 4);
    ctx.beginPath();
    ctx.arc(x, hy - 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5c1e';
    ctx.beginPath();
    ctx.arc(x, hy - 18, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'critic') {
    // A flat homburg with a wide brim.
    ctx.fillStyle = o.hat;
    ctx.beginPath();
    ctx.ellipse(x, hy - 12, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, hy - 20, 22, 13, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,140,220,0.6)';
    ctx.fillRect(x - 22, hy - 16, 44, 3);
  } else if (id === 'commuter') {
    // A tweed cap with a stubby brim.
    ctx.fillStyle = o.hat;
    ctx.beginPath();
    ctx.ellipse(x, hy - 14, 24, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 6, hy - 10, 22, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // The regular traveller: a soft wool cap.
    ctx.fillStyle = o.hat;
    ctx.beginPath();
    ctx.ellipse(x, hy - 14, 23, 13, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - 6, hy - 18, 8, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Eyes, brows and mouth, shaped by mood. */
function drawFace(ctx, p, x, hy, o, urgent, leaving, served, time) {
  const id = p.archetype.id;
  const eyeY = hy - 1;
  // Eye whites.
  ctx.fillStyle = '#fbf6ec';
  ctx.beginPath();
  ctx.ellipse(x - 8, eyeY, 5, served || leaving ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 8, eyeY, 5, served || leaving ? 5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupils.
  ctx.fillStyle = '#2a1a0e';
  const look = Math.sin(time * 1.3 + p.bob) * 1.4;
  ctx.beginPath();
  ctx.arc(x - 8 + look, eyeY, 2.4, 0, Math.PI * 2);
  ctx.arc(x + 8 + look, eyeY, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Bold brows.
  ctx.strokeStyle = leaving ? '#8a2a1a' : o.hair;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 13, eyeY - 7 - (leaving ? 1 : 0));
  ctx.lineTo(x - 3, eyeY - 9 + (urgent ? 2 : 0));
  ctx.moveTo(x + 3, eyeY - 9 + (urgent ? 2 : 0));
  ctx.lineTo(x + 13, eyeY - 7 - (leaving ? 1 : 0));
  ctx.stroke();
  ctx.lineWidth = 1;
  // Star pupils for the food critic when served.
  if (id === 'critic' && served) {
    sparkle(ctx, x - 8, eyeY, 5, '#ffd24a');
    sparkle(ctx, x + 8, eyeY, 5, '#ffd24a');
  }
  // Mouth.
  ctx.strokeStyle = leaving ? '#8a2a1a' : served ? '#b85a5a' : '#7a4a2a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (leaving) ctx.arc(x, hy + 16, 7, Math.PI, Math.PI * 2);
  else if (served) ctx.arc(x, hy + 8, 7, 0, Math.PI);
  else if (urgent) { ctx.moveTo(x - 6, hy + 12); ctx.lineTo(x + 6, hy + 12); }
  else ctx.arc(x, hy + 8, 6, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.lineWidth = 1;
}

/**
 * A round speech bubble above a booth: the ordered dish as a mini icon, wrapped in a colour-coded
 * patience ring (green -> gold -> red) that empties as the guest's patience runs out.
 */
export function drawThoughtBubble(ctx, p, x, y, time) {
  const r = 26;
  if (p.state === 'waiting') {
    const t = Math.max(0, Math.min(1, p.patience));
    // Card behind the bubble.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#f3e2c0';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Little tail toward the head.
    ctx.fillStyle = '#f3e2c0';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + r - 4);
    ctx.lineTo(x, y + r + 10);
    ctx.lineTo(x + 6, y + r - 4);
    ctx.closePath();
    ctx.fill();
    // The ordered dish as a mini icon at the bubble's heart.
    if (p.recipe !== null) dishIcon(ctx, p.recipe.name, x, y, 1.05);
    // Patience ring, colour-coded, draining clockwise from the top.
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.stroke();
    const urgent = t <= 0.25;
    let col;
    if (t > 0.5) { const k = (t - 0.5) * 2; col = `rgb(${255 + (122 - 255) * k | 0},${207 + (212 - 207) * k | 0},${74 + (106 - 74) * k | 0})`; }
    else { const k = t * 2; col = `rgb(${226 + (255 - 226) * k | 0},${86 + (207 - 86) * k | 0},74)`; }
    ctx.strokeStyle = urgent && Math.sin(time * 14) > 0 ? '#e2564a' : col;
    ctx.beginPath();
    ctx.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}
