// DishIllustrations — procedural Canvas 2D art for the Grand Dining Car's kitchen and plates.
// Nothing here is an image file: every raw ingredient, prepped component and plated dish is drawn
// from shapes, gradients and highlights so the game ships 100% offline. Two entry points:
//   ingredientArt(ctx, step, x, y, scale)  — the thing sizzling on a station right now
//   dishArt(ctx, name, x, y, scale, built) — a finished dish on the plating pass, layered by step
// Each renderer keeps to roughly a 120x54 box centred on (x, y) so callers can position freely.

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

/** A soft elliptical drop shadow under a shape. */
function soft(ctx, x, y, rx, ry, a = 0.26) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A glossy specular swipe across an area: the little curl of light that sells a wet surface. */
function sheen(ctx, x, y, rx, ry, rot, a = 0.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A vertical gradient fill inside the current path. */
function fillV(ctx, x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
}

/** A dot of colour at a point. */
function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------------------ ingredients

/** Seared beef: a browned slab with dark grill bars and a butter pat melting on top. */
function steakIngredient(ctx, x, y, s, tint) {
  soft(ctx, x, y + 12 * s, 30 * s, 8 * s, 0.3);
  fillV(ctx, x - 30 * s, y - 8 * s, 60 * s, 22 * s, '#d06a44', '#8f3a24');
  rr(ctx, x - 30 * s, y - 10 * s, 60 * s, 24 * s, 9 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,0.5)';
  ctx.lineWidth = 2 * s;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 26 * s, y + i * 8 * s);
    ctx.lineTo(x + 26 * s, y + i * 8 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffe08a';
  rr(ctx, x - 8 * s, y - 14 * s, 16 * s, 8 * s, 3 * s);
  ctx.fill();
  dot(ctx, x + 14 * s, y - 4 * s, 3 * s, tint || '#c85a3a');
}

/** A farm egg cracked into a pan: white pooling round a bright yolk. */
function eggIngredient(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 18 * s, 0.1, 0, Math.PI * 2);
  ctx.ellipse(x - 10 * s, y + 4 * s, 14 * s, 10 * s, 0.2, 0, Math.PI * 2);
  ctx.ellipse(x + 14 * s, y - 2 * s, 12 * s, 9 * s, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 2 * s, y - 2 * s, 1, x, y, 12 * s);
  g.addColorStop(0, '#ffd24a');
  g.addColorStop(1, '#e09a1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 1 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  sheen(ctx, x - 4 * s, y - 5 * s, 3 * s, 2 * s, -0.6, 0.8);
}

/** A pat of butter: a golden block with a melting pool beneath. */
function butterIngredient(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,224,138,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8 * s, 26 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  fillV(ctx, x - 22 * s, y - 10 * s, 44 * s, 20 * s, '#fff0b0', '#e6b84a');
  rr(ctx, x - 22 * s, y - 12 * s, 44 * s, 20 * s, 4 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  rr(ctx, x - 22 * s, y - 12 * s, 44 * s, 5 * s, 3 * s);
  ctx.fill();
}

/** Rice / broth: a warm amber pool with a swirl of steam. */
function brothIngredient(ctx, x, y, s, tint) {
  ctx.fillStyle = '#2b221a';
  ctx.beginPath();
  ctx.ellipse(x, y, 32 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 6 * s, y - 4 * s, 2, x, y, 30 * s);
  g.addColorStop(0, '#f0c880');
  g.addColorStop(1, tint || '#c89040');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 27 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.ellipse(x - 4 * s, y - 2 * s, 14 * s, 6 * s, 0.3, 0, Math.PI * 1.4);
  ctx.stroke();
  ctx.lineWidth = 1;
}

/** A mound of noodles: pale ribbons tangled in a bundle. */
function noodleIngredient(ctx, x, y, s, tint) {
  soft(ctx, x, y + 10 * s, 30 * s, 7 * s, 0.24);
  ctx.strokeStyle = tint || '#f0d89a';
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 26 * s, y + i * 6 * s);
    ctx.quadraticCurveTo(x, y + i * 6 * s - 14 * s, x + 26 * s, y + i * 6 * s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
}

/** A lemon half with visible segments. */
function lemonIngredient(ctx, x, y, s) {
  ctx.fillStyle = '#f4e04a';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdee9a';
  ctx.beginPath();
  ctx.arc(x, y, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,190,40,0.8)';
  ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 12 * s, y + Math.sin(a) * 12 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/** A plump fish fillet with a silver skin and a char line. */
function fishIngredient(ctx, x, y, s, tint) {
  soft(ctx, x, y + 10 * s, 30 * s, 7 * s, 0.24);
  fillV(ctx, x - 32 * s, y - 12 * s, 64 * s, 22 * s, tint || '#cfe6ea', '#7aa6b0');
  ctx.beginPath();
  ctx.ellipse(x, y - 2 * s, 32 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2 * s;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.arc(x + i * 10 * s, y - 2 * s, 8 * s, -1.1, 1.1);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  sheen(ctx, x - 8 * s, y - 8 * s, 8 * s, 3 * s, -0.3, 0.5);
}

/** A run of golden crust / gratin. */
function crustIngredient(ctx, x, y, s, tint) {
  ctx.fillStyle = tint || '#f0c060';
  rr(ctx, x - 28 * s, y - 12 * s, 56 * s, 22 * s, 8 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,60,20,0.35)';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(x + i * 10 * s, y - 2 * s + (i % 2) * 5 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1c1208';
  ctx.beginPath();
  ctx.ellipse(x, y + 8 * s, 28 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A rustic mushroom with a domed cap. */
function mushroomIngredient(ctx, x, y, s, tint) {
  ctx.fillStyle = '#e6d4b0';
  rr(ctx, x - 6 * s, y - 2 * s, 12 * s, 14 * s, 4 * s);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y - 16 * s, x, y);
  g.addColorStop(0, '#c89058');
  g.addColorStop(1, tint || '#8a5a34');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 1 * s, 20 * s, 13 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(x - 6 * s, y - 8 * s, 6 * s, 3 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** A scatter of fresh herbs / peppercorns / truffle shavings. */
function sprinkleIngredient(ctx, x, y, s, tint) {
  const c = tint || '#7ad46a';
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + 0.5;
    const rx = x + Math.cos(a) * (12 + i * 3) * s;
    const ry = y + Math.sin(a) * (6 + i) * s;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  dot(ctx, x - 4 * s, y + 2 * s, 2.5 * s, c);
  dot(ctx, x + 6 * s, y - 2 * s, 2 * s, c);
}

/** A lobster tail: a red shell curled into a fan. */
function lobsterIngredient(ctx, x, y, s, tint) {
  soft(ctx, x, y + 10 * s, 28 * s, 7 * s, 0.26);
  const g = ctx.createLinearGradient(x - 28 * s, y - 14 * s, x + 20 * s, y + 10 * s);
  g.addColorStop(0, '#e6664a');
  g.addColorStop(1, tint || '#a83a2a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 28 * s, y + 4 * s);
  ctx.quadraticCurveTo(x - 18 * s, y - 16 * s, x + 4 * s, y - 10 * s);
  ctx.quadraticCurveTo(x + 26 * s, y - 4 * s, x + 22 * s, y + 10 * s);
  ctx.quadraticCurveTo(x - 6 * s, y + 14 * s, x - 28 * s, y + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,200,0.5)';
  ctx.lineWidth = 2 * s;
  for (let i = -1; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 20 * s + i * 10 * s, y - 6 * s);
    ctx.lineTo(x - 14 * s + i * 10 * s, y + 8 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  sheen(ctx, x - 10 * s, y - 6 * s, 6 * s, 3 * s, -0.4, 0.6);
}

/** A bowl of batter / cream: pale and glossy. */
function batterIngredient(ctx, x, y, s, tint) {
  ctx.fillStyle = '#1e1a14';
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 6 * s, y - 4 * s, 2, x, y, 28 * s);
  g.addColorStop(0, '#fff6dc');
  g.addColorStop(1, tint || '#e8d29a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 25 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  sheen(ctx, x - 8 * s, y - 5 * s, 7 * s, 3 * s, -0.5, 0.6);
}

/** A golden croissant. */
function croissantIngredient(ctx, x, y, s) {
  soft(ctx, x, y + 9 * s, 24 * s, 6 * s, 0.22);
  fillV(ctx, x - 26 * s, y - 12 * s, 52 * s, 22 * s, '#f0c25a', '#c98a2a');
  ctx.beginPath();
  ctx.moveTo(x - 26 * s, y + 4 * s);
  ctx.quadraticCurveTo(x - 16 * s, y - 14 * s, x, y - 8 * s);
  ctx.quadraticCurveTo(x + 16 * s, y - 14 * s, x + 26 * s, y + 4 * s);
  ctx.quadraticCurveTo(x, y + 12 * s, x - 26 * s, y + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,20,0.5)';
  ctx.lineWidth = 2 * s;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + i * 12 * s, y - 6 * s);
    ctx.lineTo(x + i * 8 * s, y + 7 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/** A cup of spiced tea with a curl of steam. */
function teaIngredient(ctx, x, y, s) {
  ctx.fillStyle = '#f3ead6';
  ctx.beginPath();
  ctx.moveTo(x - 18 * s, y - 8 * s);
  ctx.lineTo(x + 18 * s, y - 8 * s);
  ctx.lineTo(x + 14 * s, y + 12 * s);
  ctx.quadraticCurveTo(x, y + 18 * s, x - 14 * s, y + 12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(x + 20 * s, y + 1 * s, 8 * s, -0.8, 0.8);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#a8632a';
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  sheen(ctx, x - 6 * s, y - 7 * s, 5 * s, 2 * s, -0.4, 0.6);
}

const INGREDIENTS = {
  butter: butterIngredient,
  'farm egg': eggIngredient,
  chives: (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#7ad46a'),
  entrecôte: steakIngredient,
  entrecote: steakIngredient,
  rest: (c, x, y, s, t) => steakIngredient(c, x, y, s, t),
  peppercorn: (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#8a6a3a'),
  broth: brothIngredient,
  'silk noodles': noodleIngredient,
  'spring onion': (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#6ac46a'),
  cream: batterIngredient,
  cep: mushroomIngredient,
  thyme: (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#7ad46a'),
  'river trout': fishIngredient,
  char: (c, x, y, s, t) => fishIngredient(c, x, y, s, t || '#e08a5a'),
  lemon: lemonIngredient,
  batter: batterIngredient,
  rise: croissantIngredient,
  cocoa: crustIngredient,
  lobster: lobsterIngredient,
  'brandy cream': batterIngredient,
  gratin: crustIngredient,
  tarragon: (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#6ac46a'),
  wagyu: steakIngredient,
  glaze: (c, x, y, s, t) => batterIngredient(c, x, y, s, t || '#e0a040'),
  truffle: (c, x, y, s, t) => mushroomIngredient(c, x, y, s, t || '#8a6a4a'),
  'gold leaf': (c, x, y, s, t) => sprinkleIngredient(c, x, y, s, t || '#ffd24a'),
};

/** Draw whatever the given recipe step puts on a station: dispatch on its label, fall back to a tinted mound. */
export function ingredientArt(ctx, step, x, y, scale = 1) {
  const fn = INGREDIENTS[String(step.label).toLowerCase()];
  if (fn) { fn(ctx, x, y, scale, step.tint); return; }
  ctx.fillStyle = step.tint;
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  sheen(ctx, x - 6 * scale, y - 5 * scale, 8 * scale, 4 * scale, -0.4, 0.4);
}

// ------------------------------------------------------------------ plated dishes

/** Put the finished dish on the plate (the plate ellipse itself is drawn by the caller). */
function plateShadow(ctx, x, y) { soft(ctx, x, y + 6, 52, 13, 0.2); }

function dishOmelette(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  ctx.fillStyle = '#f2c24a';
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * s, 44 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - 40 * s, y - 20 * s, x + 40 * s, y + 4 * s);
  g.addColorStop(0, '#ffe08a');
  g.addColorStop(1, '#e0a02a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 44 * s, y - 2 * s);
  ctx.quadraticCurveTo(x - 10 * s, y - 30 * s, x + 30 * s, y - 16 * s);
  ctx.quadraticCurveTo(x + 46 * s, y - 8 * s, x + 36 * s, y + 6 * s);
  ctx.quadraticCurveTo(x, y + 14 * s, x - 44 * s, y - 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,90,10,0.4)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 34 * s, y - 12 * s);
  ctx.quadraticCurveTo(x + 4 * s, y - 4 * s, x + 34 * s, y - 10 * s);
  ctx.stroke();
  ctx.lineWidth = 1;
  sprinkleIngredient(ctx, x + 4 * s, y - 14 * s, s * 0.8, '#6ac46a');
  sheen(ctx, x - 16 * s, y - 14 * s, 10 * s, 4 * s, -0.4, 0.5);
}

function dishSteak(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  fillV(ctx, x - 40 * s, y - 20 * s, 80 * s, 30 * s, '#c85a38', '#7a2c1a');
  rr(ctx, x - 40 * s, y - 18 * s, 80 * s, 30 * s, 12 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,18,8,0.6)';
  ctx.lineWidth = 3 * s;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 36 * s, y - 2 * s + i * 7 * s);
    ctx.lineTo(x + 36 * s, y - 2 * s + i * 7 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffe9a6';
  rr(ctx, x - 10 * s, y - 24 * s, 20 * s, 9 * s, 4 * s);
  ctx.fill();
  sprinkleIngredient(ctx, x + 30 * s, y + 8 * s, s * 0.9, '#6ac46a');
  sprinkleIngredient(ctx, x - 32 * s, y + 8 * s, s * 0.7, '#8a6a3a');
  sheen(ctx, x - 18 * s, y - 10 * s, 12 * s, 5 * s, -0.2, 0.35);
}

function dishRamen(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  // Bowl.
  fillV(ctx, x - 46 * s, y - 20 * s, 92 * s, 34 * s, '#e8e0d0', '#a89a80');
  ctx.beginPath();
  ctx.moveTo(x - 46 * s, y - 14 * s);
  ctx.quadraticCurveTo(x - 40 * s, y + 20 * s, x, y + 22 * s);
  ctx.quadraticCurveTo(x + 40 * s, y + 20 * s, x + 46 * s, y - 14 * s);
  ctx.closePath();
  ctx.fill();
  // Broth.
  ctx.fillStyle = '#d8a24a';
  ctx.beginPath();
  ctx.ellipse(x, y - 13 * s, 42 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Noodles.
  ctx.strokeStyle = '#f4e2a8';
  ctx.lineWidth = 4 * s;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 32 * s, y - 12 * s + i * 6 * s);
    ctx.quadraticCurveTo(x, y - 22 * s + i * 6 * s, x + 32 * s, y - 12 * s + i * 6 * s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
  // Egg half.
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.ellipse(x - 18 * s, y - 20 * s, 11 * s, 9 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();
  dot(ctx, x - 18 * s, y - 20 * s, 5 * s, '#f0a83a');
  // Nori sheet.
  ctx.fillStyle = '#22402f';
  ctx.save();
  ctx.translate(x + 20 * s, y - 22 * s);
  ctx.rotate(-0.25);
  ctx.fillRect(-11 * s, -10 * s, 22 * s, 20 * s);
  ctx.restore();
  // Narutomaki.
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.arc(x + 4 * s, y - 18 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e2798a';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x + 4 * s, y - 18 * s, 4.5 * s, 0.5, 5.2);
  ctx.stroke();
  ctx.lineWidth = 1;
  // Chopsticks.
  ctx.strokeStyle = '#a8703a';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x + 30 * s, y + 4 * s);
  ctx.lineTo(x + 52 * s, y - 26 * s);
  ctx.moveTo(x + 34 * s, y + 8 * s);
  ctx.lineTo(x + 56 * s, y - 22 * s);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function dishSoup(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  ctx.fillStyle = '#d8c8a8';
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 40 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 6 * s, y - 12 * s, 2, x, y - 8 * s, 34 * s);
  g.addColorStop(0, '#f6ecd2');
  g.addColorStop(1, '#c8a878');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 34 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mushroom slices & thyme.
  for (let i = -1; i <= 1; i += 1) {
    ctx.fillStyle = '#a87848';
    ctx.beginPath();
    ctx.ellipse(x + i * 14 * s, y - 10 * s, 7 * s, 4 * s, i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  sprinkleIngredient(ctx, x, y - 12 * s, s * 0.8, '#6ac46a');
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x - 4 * s, y - 10 * s, 16 * s, 0.2, 2.4);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function dishTrout(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  fillV(ctx, x - 44 * s, y - 18 * s, 88 * s, 26 * s, '#dbeef0', '#7ea8b0');
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * s, 44 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2 * s;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(x + i * 9 * s, y - 6 * s, 7 * s, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  // Lemon slice & herb.
  ctx.fillStyle = '#f4e04a';
  ctx.beginPath();
  ctx.arc(x + 34 * s, y + 2 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,180,30,0.8)';
  ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + 34 * s, y + 2 * s);
    ctx.lineTo(x + 34 * s + Math.cos(a) * 8 * s, y + 2 * s + Math.sin(a) * 8 * s);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  sprinkleIngredient(ctx, x - 20 * s, y - 16 * s, s * 0.8, '#6ac46a');
  sheen(ctx, x - 10 * s, y - 12 * s, 12 * s, 4 * s, -0.2, 0.5);
}

function dishSouffle(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  // Ramekin.
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 6 * s);
  ctx.lineTo(x + 30 * s, y - 6 * s);
  ctx.lineTo(x + 24 * s, y + 18 * s);
  ctx.lineTo(x - 24 * s, y + 18 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(x - 26 * s, y + 10 * s, 52 * s, 8 * s);
  // Rising dome.
  const g = ctx.createLinearGradient(x, y - 30 * s, x, y - 4 * s);
  g.addColorStop(0, '#f6e2b0');
  g.addColorStop(1, '#d8a860');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 4 * s);
  ctx.bezierCurveTo(x - 34 * s, y - 30 * s, x + 34 * s, y - 30 * s, x + 30 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y - 10 * s);
  ctx.quadraticCurveTo(x, y - 26 * s, x + 16 * s, y - 10 * s);
  ctx.stroke();
  ctx.lineWidth = 1;
  dot(ctx, x + 12 * s, y - 20 * s, 4 * s, '#c0483a');
  dot(ctx, x - 12 * s, y - 18 * s, 3.5 * s, '#c0483a');
}

function dishLobster(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.ellipse(x, y - 4 * s, 42 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  lobsterIngredient(ctx, x - 4 * s, y - 6 * s, s * 1.3, '#e0563a');
  // Cream glaze swoosh.
  ctx.strokeStyle = 'rgba(255,240,200,0.75)';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y + 4 * s);
  ctx.quadraticCurveTo(x, y - 2 * s, x + 34 * s, y + 2 * s);
  ctx.stroke();
  ctx.lineWidth = 1;
  sprinkleIngredient(ctx, x + 26 * s, y - 14 * s, s * 0.8, '#6ac46a');
}

function dishTasting(ctx, x, y, s) {
  plateShadow(ctx, x, y);
  ctx.fillStyle = '#efe7d6';
  ctx.beginPath();
  ctx.ellipse(x, y - 4 * s, 48 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Three little composed bites.
  steakIngredient(ctx, x - 24 * s, y - 8 * s, s * 0.7, '#c8503a');
  mushroomIngredient(ctx, x + 2 * s, y - 10 * s, s * 0.7, '#8a6a4a');
  dot(ctx, x + 26 * s, y - 8 * s, 6 * s, '#e0a040');
  ctx.strokeStyle = 'rgba(255,240,200,0.8)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x + 26 * s, y - 8 * s, 9 * s, 0.4, 4.4);
  ctx.stroke();
  ctx.lineWidth = 1;
  sprinkleIngredient(ctx, x, y + 4 * s, s * 0.7, '#ffd24a');
  sheen(ctx, x - 6 * s, y - 14 * s, 14 * s, 4 * s, -0.15, 0.4);
}

const DISHES = {
  'Silverline Omelette': dishOmelette,
  'Ambassador Steak': dishSteak,
  'Orient Express Noodles': dishRamen,
  'Consul Mushroom Soup': dishSoup,
  'Duchess Trout': dishTrout,
  'Midnight Soufflé': dishSouffle,
  'Midnight Souffle': dishSouffle,
  'Royal Lobster Thermidor': dishLobster,
  "Emperor's Tasting Plate": dishTasting,
};

/**
 * Draw a plated dish centred on (x, y) — usually the middle of the plating pass.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} name   the recipe name
 * @param {number} x @param {number} y
 * @param {number} scale  ~0.55 for the small pass plate, ~1 for a hero close-up
 * @param {number} built  how many steps are on the plate so far (fewer = a lighter dish)
 */
export function dishArt(ctx, name, x, y, scale = 1, built = 99) {
  const fn = DISHES[name];
  // A just-started plate shows only its first components; a finished one shows the whole dish.
  const k = built >= 3 ? 1 : built === 2 ? 0.85 : 0.7;
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * k;
  if (fn) fn(ctx, x, y, scale);
  else {
    ctx.fillStyle = '#e0c088';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 34 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    sheen(ctx, x - 8 * scale, y - 8 * scale, 12 * scale, 4 * scale, -0.3, 0.4);
  }
  ctx.restore();
}

/** The mini icon for a recipe's dish, used by the order speech bubbles. */
export function dishIcon(ctx, name, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.34 * s, 0.34 * s);
  const fn = DISHES[name];
  if (fn) fn(ctx, 0, 0, 1);
  else {
    ctx.fillStyle = '#e0c088';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
