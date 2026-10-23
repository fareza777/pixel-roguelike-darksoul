// Hand-built pixel knight rig: accessories, directional lighting, 8 animations.
import {
  INK, PAL, makeGrid, put, get, line, lineMasked, ellipsePts, shift, rotPt,
  paint, rasterize, inMask, limb, outlineUnion, exportSheet, rect, drawText,
} from "./pixel.mjs";

const W = 128, H = 96, FX = 64, FY = 84;

const S = PAL.steel, G = PAL.gold, C = PAL.cape, L = PAL.leather, PL = PAL.plume;
const P = (pts) => pts.map(([x, y]) => [FX + x, FY + y]);
const SD = (ramp, n = -0.25) => ramp.map((c) => shadeHex(c, n));
const scalePtsLocal = (pts, k) => pts.map(([x, y]) => [x * k, y * k]);
const ln = (g, mask, a, b, c) => lineMasked(g, mask, FX + a[0], FY + a[1], FX + b[0], FY + b[1], c);
function shadeHex(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  if (amt >= 0) {
    return "#" + [r, g, b].map((v) => Math.round(v + (255 - v) * amt).toString(16).padStart(2, "0")).join("");
  }
  const f = 1 + amt;
  return "#" + [r, g, b].map((v) => Math.round(v * f).toString(16).padStart(2, "0")).join("");
}

const BASE = {
  hip: [0, -19], lean: 0, bob: 0,
  headTilt: 0,
  legBack: { thigh: -16, shin: 10, lift: 0 },
  legFront: { thigh: 17, shin: -8, lift: 0 },
  hand: [13, -23], swordAngle: 130,
  shield: [-3, -23.5], shieldAngle: 0, shieldArm: [-4, -32],
  capeSway: 0, capeLift: 0, plumeSway: 0, plumeLift: 0,
  dust: 0,
};

function pose(o = {}) {
  return { ...BASE, ...o, legBack: { ...BASE.legBack, ...(o.legBack || {}) }, legFront: { ...BASE.legFront, ...(o.legFront || {}) } };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPose(a, b, t) {
  const o = {};
  for (const k of ["lean", "bob", "headTilt", "shieldAngle", "capeSway", "capeLift", "plumeSway", "plumeLift", "dust"]) o[k] = lerp(a[k], b[k], t);
  o.hip = [lerp(a.hip[0], b.hip[0], t), lerp(a.hip[1], b.hip[1], t)];
  o.hand = [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)];
  o.swordAngle = lerp(a.swordAngle, b.swordAngle, t);
  o.shield = [lerp(a.shield[0], b.shield[0], t), lerp(a.shield[1], b.shield[1], t)];
  o.shieldArm = [lerp(a.shieldArm[0], b.shieldArm[0], t), lerp(a.shieldArm[1], b.shieldArm[1], t)];
  o.legBack = { thigh: lerp(a.legBack.thigh, b.legBack.thigh, t), shin: lerp(a.legBack.shin, b.legBack.shin, t), lift: lerp(a.legBack.lift, b.legBack.lift, t) };
  o.legFront = { thigh: lerp(a.legFront.thigh, b.legFront.thigh, t), shin: lerp(a.legFront.shin, b.legFront.shin, t), lift: lerp(a.legFront.lift, b.legFront.lift, t) };
  return o;
}
function sampleKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
      let k = (t - t0) / Math.max(1e-6, t1 - t0);
      k = k * k * (3 - 2 * k);
      return lerpPose(p0, p1, k);
    }
  }
  return keys[keys.length - 1][1];
}

function drawCape(g, p) {
  const sway = p.capeSway, lift = p.capeLift;
  const pts = P([
    [-4, -34], [-8, -33], [-11.5, -28], [-14 - sway * 0.3, -20 + lift * 0.2],
    [-17.5 - sway, -10 + lift * 0.6], [-16 - sway * 1.1, -4 + lift],
    [-13.5 - sway, -8.5 + lift], [-12 - sway, -4 + lift],
    [-10.5 - sway, -9 + lift], [-8.5 - sway, -5 + lift],
    [-6.8 - sway, -10 + lift], [-5 - sway, -6 + lift],
    [-3.2 - sway * 0.7, -12 + lift], [-1.4 - sway * 0.4, -17 + lift * 0.5],
    [1, -23], [2.8, -29],
  ]);
  const m = paint(g, pts, C, { outline: C[0], mid: C[2], light: C[3], dark: C[1], hi: C[4] });
  // shadow side and fold ridges
  paint(g, P([[-9, -29], [-15.5 - sway * 0.8, -9 + lift], [-13 - sway * 0.9, -9 + lift], [-5.5, -28]]), [C[1], C[1], C[1], C[1]], { outline: C[1], mid: C[1], bevel: false });
  ln(g, m.mask, [-7, -30], [-11.5 - sway * 0.5, -12 + lift], C[1]);
  ln(g, m.mask, [-5, -29], [-8.5 - sway * 0.5, -10 + lift], C[4]);
  ln(g, m.mask, [-12, -24], [-14 - sway, -7 + lift], C[3]);
  // tattered hem highlights
  const hem = P([[-15.6 - sway, -4.6 + lift], [-12.8 - sway, -4.6 + lift], [-13.5 - sway, -8.4 + lift]]);
  paint(g, hem, [C[4], C[4], C[4], C[4]], { outline: C[4], mid: C[4], bevel: false });
  // top edge catches light
  ln(g, m.mask, [-7.5, -33], [-3, -33.6], C[4]);
  // clasp
  paint(g, P(ellipsePts(-3.3, -33, 2, 2, 10)), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  put(g, FX - 3, FY - 34, G[4]);
}

function drawLeg(g, hip, cfg, dark = false, front = false) {
  const ramp = dark ? SD(S, -0.2) : S;
  const hx = FX + hip[0], hy = FY + hip[1];
  const a1 = (cfg.thigh * Math.PI) / 180;
  const knee = [hx + Math.sin(a1) * 8.5, hy + Math.cos(a1) * 8.5];
  const a2 = a1 + (cfg.shin * Math.PI) / 180;
  const ankle = [knee[0] + Math.sin(a2) * 8, knee[1] + Math.cos(a2) * 8 - cfg.lift];
  // thigh (mail + cloth)
  limb(g, [hx, hy], knee, 3.4, 2.8, dark ? SD(PAL.cloth, -0.12) : PAL.cloth, { outline: PAL.ink });
  // greave
  limb(g, [knee[0] - 0.5, knee[1] - 1], [ankle[0], ankle[1] - 1], 2.9, 2.4, ramp, { outline: S[0] });
  // knee cop
  paint(g, P(ellipsePts(knee[0] - FX, knee[1] - FY, 2.6, 2.4, 10)), dark ? SD(S, -0.2) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  // boot
  const bx = ankle[0] - FX, by = ankle[1] - FY;
  const boot = P([
    [bx - 3, by - 1], [bx + 2, by - 2], [bx + 5, by - 1], [bx + 5.5, by + 1],
    [bx + 1, by + 2], [bx - 3.5, by + 2], [bx - 4, by + 0.5],
  ]);
  paint(g, boot, L, { outline: L[0], mid: L[2], light: L[3], dark: L[1] });
  // steel toe
  const toe = P([[bx + 2.5, by - 1.5], [bx + 5, by - 0.5], [bx + 5, by + 1], [bx + 1.5, by + 1.5]]);
  paint(g, toe, dark ? SD(S, -0.15) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  // strap
  const strap = P([[bx - 2, by - 2], [bx + 2, by - 3], [bx + 2, by - 1], [bx - 2, by]]);
  paint(g, strap, [L[1], L[1], L[1], L[1]], { outline: L[1], mid: L[1], bevel: false });
  if (front) put(g, Math.round(ankle[0]), Math.round(ankle[1] - 3), S[4]);
  return { knee, ankle };
}

function drawTorso(g, p) {
  const hx = FX + p.hip[0], hy = FY + p.hip[1];
  const lean = p.lean;
  // tabard under armour
  const tab = P([[-4, -22], [4, -22], [5, -10], [2, -5], [0, -9], [-2, -5], [-5, -10]]);
  paint(g, tab, C, { outline: C[0], mid: C[2], light: C[3], dark: C[1] });
  paint(g, P([[-1.5, -20], [1.5, -20], [1.5, -8], [-1.5, -8]]), [C[1], C[1], C[1], C[1]], { outline: C[1], mid: C[1], bevel: false });
  // hip / faulds
  const hips = P([[-6, -23], [6, -23], [5.5, -18], [3, -15], [-4, -15.5], [-6.5, -18.5]]);
  paint(g, hips, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  for (let i = 0; i < 3; i++) {
    const y = -22 + i * 2.5;
    const lame = P([[-5 + i * 0.3, y], [5 - i * 0.3, y], [4.5 - i * 0.3, y + 2.4], [-4.5 + i * 0.3, y + 2.4]]);
    paint(g, lame, i === 2 ? S : SD(S, -0.1), { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  }
  // torso plate
  const torso = P([
    [-6 + lean * 0.2, -24], [5.5 + lean * 0.2, -24], [7 + lean, -29], [6 + lean, -34],
    [2 + lean, -36], [-4 + lean, -35.5], [-7 + lean, -31], [-6.5 + lean, -27],
  ]);
  const tm = paint(g, torso, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  // centre ridge + edge shading
  ln(g, tm.mask, [1 + lean, -34], [0.5 + lean * 0.8, -25], S[4]);
  ln(g, tm.mask, [-3.5 + lean, -33], [-4.5 + lean, -26], S[1]);
  ln(g, tm.mask, [4.5 + lean, -31], [4 + lean, -25], S[1]);
  // gold trim across chest
  ln(g, tm.mask, [-4.5 + lean, -28.5], [4.5 + lean, -28.5], G[2]);
  ln(g, tm.mask, [-4 + lean, -27.5], [4 + lean, -27.5], G[1]);
  // rivets
  for (const [rx, ry] of [[-4.5, -32], [3.5, -32], [-4, -26], [3.5, -26]]) {
    put(g, Math.round(FX + lean + rx), Math.round(FY + ry), G[3]);
    put(g, Math.round(FX + lean + rx + 1), Math.round(FY + ry + 1), S[0]);
  }
  // belt
  const belt = P([[-6, -22.5], [6, -22.5], [6, -20.5], [-6, -20.5]]);
  paint(g, belt, L, { outline: L[0], mid: L[2], light: L[3], dark: L[1] });
  paint(g, P([[-1.8, -23], [1.8, -23], [1.8, -20], [-1.8, -20]]), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  put(g, Math.round(FX - 1), Math.round(FY - 21.5), G[4]);
  // gorget
  paint(g, P([[-4 + lean, -35.5], [5 + lean, -35.5], [4.5 + lean, -37], [-3.5 + lean, -37]]), S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  return { hx, hy, lean };
}

function drawPauldrons(g, p) {
  const lean = p.lean;
  // far pauldron - small
  paint(g, P(ellipsePts(-6 + lean, -32.5, 3.6, 3.2, 12)), SD(S, -0.2), { outline: S[0], mid: S[1], light: S[2], dark: SD(S, -0.35)[1] });
  // near pauldron - layered
  paint(g, P(ellipsePts(5.5 + lean, -32.8, 5.4, 4.6, 14)), S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  for (let i = 0; i < 2; i++) {
    const y = -30.5 + i * 2.4;
    const plate = P([[1.5 + lean, y], [9.5 + lean - i * 0.4, y - 0.4], [9.2 + lean - i * 0.5, y + 2], [2 + lean, y + 2.2]]);
    paint(g, plate, i ? SD(S, -0.08) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
    ln(g, rasterize(g, plate), [2.5 + lean, y + 0.7], [8.8 + lean - i * 0.4, y + 0.4], i ? S[3] : S[4]);
  }
  // gold trim on top edge
  const trim = P([[1.5 + lean, -35.3], [8.8 + lean, -35.8], [10 + lean, -34.4], [2 + lean, -34.1]]);
  paint(g, trim, G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  put(g, Math.round(FX + lean + 6.5), Math.round(FY - 36.2), G[4]);
  put(g, Math.round(FX + lean + 2.2), Math.round(FY - 35.2), G[3]);
}

function ik(ax, ay, bx, by, l1, l2, bend = 1) {
  const dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, d));
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = base - a * bend;
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
}

function drawSwordArm(g, p, layer = "front") {
  const shoulder = [FX + 4.5 + p.lean, FY - 32.5];
  const hand = [FX + p.hand[0], FY + p.hand[1]];
  const elbow = ik(shoulder[0], shoulder[1], hand[0], hand[1], 8, 7.5, 1);
  const ramp = S;
  // mail upper arm
  limb(g, shoulder, elbow, 3.2, 2.6, PAL.cloth, { outline: PAL.ink });
  for (let i = 0; i < 4; i++) {
    const t = 0.12 + i * 0.18;
    put(g, lerp(shoulder[0], elbow[0], t), Math.round(lerp(shoulder[1], elbow[1], t)), PAL.cloth[3]);
  }
  // vambrace
  limb(g, [elbow[0], elbow[1]], hand, 2.7, 2.1, ramp, { outline: S[0] });
  // glove
  paint(g, P(ellipsePts(hand[0] - FX, hand[1] - FY, 2.2, 2.1, 9)), L, { outline: L[0], mid: L[2], light: L[3], dark: L[1] });
  return { shoulder, elbow, hand };
}

function drawSword(g, p) {
  const hand = p.hand;
  const a = (p.swordAngle * Math.PI) / 180;
  const ux = Math.sin(a), uy = -Math.cos(a);
  const px = -uy, py = ux;
  const hx = FX + hand[0], hy = FY + hand[1];
  // guard ahead of the fist so the hand reads as gripping the grip, not the guard
  const guard = [hx + ux * 4.4, hy + uy * 4.4];
  const tip = [hx + ux * 25, hy + uy * 25];
  const pommel = [hx - ux * 6.6, hy - uy * 6.6];
  // grip exposed on either side of the glove
  limb(g, [hx - ux * 1.9, hy - uy * 1.9], [hx - ux * 5.6, hy - uy * 5.6], 1.35, 1.2, L, { outline: L[0] });
  limb(g, [hx + ux * 2.2, hy + uy * 2.2], [hx + ux * 3.9, hy + uy * 3.9], 1.2, 1.1, L, { outline: L[0] });
  for (let i = 0; i < 3; i++) {
    const d = 3.1 + i * 0.9;
    put(g, Math.round(hx - ux * d), Math.round(hy - uy * d), L[4]);
  }
  // knuckle wraps closing over the front of the grip
  put(g, Math.round(hx + ux * 2.6 + px * 0.9), Math.round(hy + uy * 2.6 + py * 0.9), L[3]);
  put(g, Math.round(hx + ux * 3.4 - px * 0.7), Math.round(hy + uy * 3.4 - py * 0.7), L[4]);
  // pommel
  paint(g, ellipsePts(pommel[0], pommel[1], 1.7, 1.7, 8), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  // crossguard (perpendicular)
  const cw = 6.2;
  const g1 = [guard[0] + px * cw, guard[1] + py * cw];
  const g2 = [guard[0] - px * cw, guard[1] - py * cw];
  limb(g, g1, g2, 1.4, 1.4, G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  // blade tapered
  const bw = 3.2;
  const blade = [
    [guard[0] + px * bw, guard[1] + py * bw],
    [lerp(guard[0], tip[0], 0.92) + px * 1.6, lerp(guard[1], tip[1], 0.92) + py * 1.6],
    [tip[0], tip[1]],
    [lerp(guard[0], tip[0], 0.92) - px * 1.6, lerp(guard[1], tip[1], 0.92) - py * 1.6],
    [guard[0] - px * bw, guard[1] - py * bw],
  ];
  const bm = paint(g, blade, S, { outline: S[0], mid: S[3], light: S[4], dark: S[2], hi: S[5] });
  // fuller line and edge shadow
  lineMasked(g, bm.mask, guard[0] + px * 0.3, guard[1] + py * 0.3, lerp(guard[0], tip[0], 0.9), lerp(guard[1], tip[1], 0.9), S[2]);
  lineMasked(g, bm.mask, guard[0] + px * 1.4, guard[1] + py * 1.4, lerp(guard[0], tip[0], 0.85), lerp(guard[1], tip[1], 0.85), S[4]);
  put(g, Math.round(lerp(guard[0], tip[0], 0.35) + px * 1.2), Math.round(lerp(guard[1], tip[1], 0.35) + py * 1.2), S[5]);
  // leather wrap at guard
  put(g, Math.round(guard[0]), Math.round(guard[1]), G[4]);
  return { tip, guard };
}

function drawShieldArm(g, p) {
  const shoulder = [FX + p.shieldArm[0], FY + p.shieldArm[1]];
  const sc = p.shield;
  const target = [FX + sc[0] - 1, FY + sc[1] + 1];
  const elbow = ik(shoulder[0], shoulder[1], target[0], target[1], 7.5, 7, -1);
  limb(g, shoulder, elbow, 2.9, 2.4, PAL.cloth, { outline: PAL.ink });
  limb(g, elbow, target, 2.4, 2.0, S, { outline: S[0] });
}

function drawShield(g, p) {
  const [sx, sy] = p.shield;
  const base = [
    [-7, -7.5], [-4.4, -9], [4.4, -9], [7, -7.2], [7.3, -1.8], [5.8, 3.2],
    [3.2, 7], [0, 10], [-3.2, 6.8], [-5.9, 2.4], [-7.3, -2.2],
  ];
  const at = (pts, k) => shift(rotPt(scalePtsLocal(pts, k), 0, 0, p.shieldAngle), FX + sx, FY + sy);
  const pts = at(base, 1);
  paint(g, pts, S, { outline: INK, mid: S[2], light: S[3], dark: S[1] });
  const rim = at(base, 0.87);
  paint(g, rim, [S[4], S[4], S[4], S[4]], { outline: S[3], mid: S[4], bevel: false });
  // bright rim catch light on top-left
  ln(g, rasterize(g, rim), [-5.4 + sx, -7.6 + sy], [-1 + sx, -8.2 + sy], S[5]);
  ln(g, rasterize(g, rim), [-5.6 + sx, -6.6 + sy], [-7 + sx, -1 + sy], S[5]);
  const field = at(base, 0.72);
  paint(g, field, [PAL.blue[0], PAL.blue[1], PAL.blue[2], PAL.blue[0]], { outline: PAL.blue[0], mid: PAL.blue[1], light: PAL.blue[2], dark: PAL.blue[0] });
  // heraldic sword emblem
  const em = at([
    [0, -5.4], [0.9, -3.5], [0.9, 1.3], [3, 1.3], [3, 2.3], [0.9, 2.3], [0.9, 3.5], [0, 4.3],
    [-0.9, 3.5], [-0.9, 2.3], [-3, 2.3], [-3, 1.3], [-0.9, 1.3], [-0.9, -3.5],
  ], 1);
  paint(g, em, [G[0], G[2], G[3], G[4]], { outline: G[0], mid: G[3], light: G[4], dark: G[2] });
  const dia = at([[0, -6.6], [1.2, -5.5], [0, -4.4], [-1.2, -5.5]], 1);
  paint(g, dia, PAL.ember, { outline: PAL.ember[0], mid: PAL.ember[3], light: PAL.ember[4], dark: PAL.ember[1] });
  for (const [rx, ry] of [[-5.6, -5.2], [5.6, -5.2], [-4.8, 3.8], [4.8, 3.8]]) {
    const [x, y] = rotPt([[rx, ry]], 0, 0, p.shieldAngle)[0];
    put(g, Math.round(FX + sx + x), Math.round(FY + sy + y), G[3]);
  }
  const [x1, y1] = rotPt([[-5.2, -2.6]], 0, 0, p.shieldAngle)[0];
  const [x2, y2] = rotPt([[-4, -0.6]], 0, 0, p.shieldAngle)[0];
  put(g, Math.round(FX + sx + x1), Math.round(FY + sy + y1), S[2]);
  put(g, Math.round(FX + sx + x2), Math.round(FY + sy + y2), S[2]);
}

function drawHead(g, p) {
  const tx = p.headTilt;
  const hx = FX + 1 + tx * 0.3, hy = FY - 40 + p.bob * 0.6;
  // neck cowl
  paint(g, P([[-3.5 + p.lean, -35], [4 + p.lean, -35], [3.2 + p.lean, -38], [-2.5 + p.lean, -38]]), PAL.cloth, { outline: PAL.cloth[0], mid: PAL.cloth[2], light: PAL.cloth[3], dark: PAL.cloth[1] });
  // helm
  const helmPts = [
    [hx + -6.6, hy - 5.5], [hx + -5.2, hy - 7.8], [hx + 3.2, hy - 8], [hx + 6.2, hy - 6.2],
    [hx + 7, hy - 2.2], [hx + 6.6, hy + 2.6], [hx + 4.2, hy + 4.8], [hx + -4.2, hy + 4.8],
    [hx + -6.6, hy + 2], [hx + -7.1, hy - 2.2],
  ];
  const hm = paint(g, helmPts, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  ln(g, hm.mask, [hx - 5.6, hy - 6.4], [hx - 2, hy - 7.4], S[4]);
  ln(g, hm.mask, [hx - 6.2, hy - 1], [hx - 5.4, hy + 2.8], S[1]);
  ln(g, hm.mask, [hx - 1.2, hy - 7.6], [hx - 1.6, hy - 5.4], S[1]);
  // gold brow band
  const band = [
    [hx - 6.2, hy - 4.9], [hx + 6.1, hy - 5.3], [hx + 6.6, hy - 3.5], [hx - 6.3, hy - 3],
  ];
  paint(g, band, G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  // dark visor face
  const visor = [
    [hx + 1, hy - 3.3], [hx + 6, hy - 3.7], [hx + 6.5, hy + 0.8], [hx + 4.4, hy + 4],
    [hx + 0.7, hy + 3.5], [hx + 0.2, hy - 0.4],
  ];
  paint(g, visor, [S[0], S[0], S[1], S[0]], { outline: S[0], mid: S[0], light: S[1], dark: INK });
  // recessed eye slit
  paint(g, [[hx + 1.2, hy - 1.7], [hx + 6.3, hy - 2.1], [hx + 6.2, hy - 0.2], [hx + 1.1, hy + 0.1]],
    [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  rect(g, Math.round(hx + 2.2), Math.round(hy - 1.5), 4, 1, PAL.ember[3]);
  rect(g, Math.round(hx + 2.6), Math.round(hy - 1.4), 2, 1, PAL.ember[4]);
  put(g, Math.round(hx + 3.2), Math.round(hy - 1.3), PAL.ember[5]);
  // nasal bar and lower grill
  ln(g, hm.mask, [hx + 1.1, hy - 4.8], [hx + 1, hy + 4], S[2]);
  put(g, Math.round(hx + 1.1), Math.round(hy - 4.2), S[4]);
  for (let i = 0; i < 3; i++) put(g, Math.round(hx + 2.6 + i * 1.2), Math.round(hy + 2.4), S[0]);
  // side pivot rivets
  put(g, Math.round(hx - 5.6), Math.round(hy - 3), G[3]);
  put(g, Math.round(hx + 6), Math.round(hy - 3.2), G[3]);
  put(g, Math.round(hx + 5.7), Math.round(hy + 2.7), G[2]);
  // comb crest
  const comb = [[hx - 4.6, hy - 7.6], [hx + 3.2, hy - 7.7], [hx + 2.4, hy - 9.4], [hx - 3.7, hy - 9.3]];
  paint(g, comb, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  ln(g, rasterize(g, comb), [hx - 3.4, hy - 9], [hx + 2, hy - 9.1], G[2]);
  put(g, Math.round(hx), Math.round(hy - 9.8), G[4]);
  // gold plume socket
  paint(g, ellipsePts(hx - 2, hy - 9.5, 1.7, 1.4, 8), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });

  // compact crimson horsehair crest, flowing back
  const sway = p.plumeSway, lift = p.plumeLift;
  const rx = hx - 2, ry = hy - 9.6;
  const strands = [
    { a: [-3.4, -4.2], b: [-9.6, -4.6], c: [-13.4, -1.4], w0: 1.3, w1: 2.2, tone: 1 },
    { a: [-2.4, -5.8], b: [-7.4, -7.2], c: [-10.4, -4.2], w0: 1.4, w1: 2.1, tone: 2 },
    { a: [-1.2, -6.6], b: [-5.2, -8.6], c: [-7.2, -6.6], w0: 1.3, w1: 1.8, tone: 3 },
    { a: [-0.2, -5.2], b: [-3, -7.4], c: [-4.4, -8.2], w0: 1.1, w1: 1.4, tone: 2 },
  ];
  for (const st of strands) {
    const ax = rx + st.a[0] + sway * 0.15, ay = ry + st.a[1] + lift * 0.15;
    const bx = rx + st.b[0] + sway * 0.45, by = ry + st.b[1] + lift * 0.45;
    const cx2 = rx + st.c[0] + sway * 0.75, cy2 = ry + st.c[1] + lift * 0.75;
    const pts = [
      [rx, ry - 1], [ax - st.w0, ay - st.w0], [bx - st.w1, by - st.w1], [cx2, cy2],
      [bx + st.w1, by + st.w1 * 0.6], [ax + st.w0, ay + st.w0 * 0.7], [rx, ry + 1],
    ];
    const tone = C[st.tone];
    paint(g, pts, [C[0], C[1], tone, C[4], C[5]].map((c, i) => i === 2 ? tone : c), { outline: C[0], mid: tone, light: C[4], dark: C[1] });
    ln(g, rasterize(g, pts), [ax, ay], [bx, by], C[1]);
  }
  // ember bead where the crest leaves the socket
  put(g, Math.round(rx), Math.round(ry - 1.6), PAL.ember[4]);
  // helmet wear
  put(g, Math.round(hx - 3.4), Math.round(hy + 1.6), S[1]);
  put(g, Math.round(hx - 2.8), Math.round(hy + 0.8), S[4]);
}

/* ------------------------- front / back views ------------------------- */
function drawCapeFront(g, p) {
  const sway = p.capeSway || 0, lift = p.capeLift || 0;
  for (const side of [-1, 1]) {
    const s = side;
    const pts = P([
      [s * 3.6, -34], [s * 7.8, -32.6], [s * (11.4 + sway * 0.2), -24],
      [s * (13.6 + sway * 0.4), -13 + lift * 0.5], [s * (12.8 + sway * 0.55), -5 + lift],
      [s * (9.6 + sway * 0.7), -8 + lift], [s * (7.7 + sway * 0.9), -3.8 + lift],
      [s * (6.3 + sway * 1.0), -10 + lift * 0.5], [s * 4.6, -18.5], [s * 3.2, -28],
    ]);
    const m = paint(g, pts, C, { outline: C[0], mid: C[2], light: C[3], dark: C[1], hi: C[4] });
    ln(g, m.mask, [s * 7.2, -29], [s * (10.4 + sway * 0.5), -10 + lift], C[1]);
    ln(g, m.mask, [s * 5.6, -30], [s * (8.2 + sway * 0.7), -14 + lift], C[4]);
    for (let i = 0; i < 2; i++) {
      const fx = s * (9.4 + i * 1.7 + sway * 0.55);
      ln(g, m.mask, [fx, -23], [fx + s * 0.6, -8 + lift], i ? C[3] : C[1]);
    }
    put(g, Math.round(FX + s * (12.2 + sway * 0.4)), Math.round(FY - 6 + lift), C[4]);
  }
  // clasp at the throat
  paint(g, P(ellipsePts(0, -33.4, 2.3, 1.9, 10)), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  put(g, FX, FY - 33, G[4]);
}

function drawLegFront(g, side, cfg, dark = false) {
  const hipX = side * 3.8 + (cfg.dx || 0);
  const hipY = -18.4;
  const lift = cfg.lift || 0, swing = cfg.swing || 0;
  const kneeX = hipX + side * 0.9 + swing * 0.32;
  const kneeY = hipY + 7.2 - lift * 0.38;
  const ankleX = hipX + side * 1.35 + swing;
  const ankleY = hipY + 15.2 - lift;
  const ramp = dark ? SD(S, -0.22) : S;
  // thigh cloth then greave
  limb(g, [FX + hipX, FY + hipY], [FX + kneeX, FY + kneeY], 3.7, 3.0, dark ? SD(PAL.cloth, -0.1) : PAL.cloth, { outline: PAL.ink });
  limb(g, [FX + kneeX, FY + kneeY - 0.4], [FX + ankleX, FY + ankleY - 0.8], 3.0, 2.5, ramp, { outline: S[0] });
  paint(g, P(ellipsePts(kneeX, kneeY, 2.8, 2.5, 10)), dark ? SD(S, -0.18) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  put(g, Math.round(FX + kneeX - side * 0.4), Math.round(FY + kneeY - 1.4), S[4]);
  // boot seen from the front: broad toe, steel cap
  const ax = FX + ankleX, ay = FY + ankleY;
  paint(g, [
    [ax - 3.3, ay - 2.5], [ax + 3.3, ay - 2.5], [ax + 4.5, ay + 0.4],
    [ax + 3.6, ay + 3.1], [ax + 0.8, ay + 3.7], [ax - 3.1, ay + 3.2], [ax - 4.5, ay + 0.3],
  ], L, { outline: L[0], mid: L[2], light: L[3], dark: L[1] });
  paint(g, [
    [ax - 2.7, ay + 1.1], [ax + 2.7, ay + 0.7], [ax + 3.2, ay + 2.8],
    [ax + 0.6, ay + 3.5], [ax - 2.9, ay + 2.9],
  ], dark ? SD(S, -0.15) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  put(g, ax - 2, ay - 1.6, L[4]);
  put(g, ax + 0.5, ay + 2.4, S[4]);
  return { ankle: [ankleX, ankleY] };
}

function drawPauldronsFront(g, p) {
  const lean = p.lean || 0;
  for (const side of [-1, 1]) {
    const dark = side < 0;
    const cx = side * 6.1 + lean;
    paint(g, P(ellipsePts(cx, -32.7, 4.9, 4.3, 14)), dark ? SD(S, -0.18) : S, {
      outline: S[0], mid: S[2], light: S[3], dark: S[1],
    });
    for (let i = 0; i < 2; i++) {
      const y = -30.7 + i * 2.2;
      const plate = P([
        [side * 2.3 + lean, y], [side * 9.4 + lean - side * i * 0.3, y - 0.4],
        [side * 9.1 + lean - side * i * 0.4, y + 1.9], [side * 2.6 + lean, y + 2.1],
      ]);
      paint(g, plate, i ? SD(S, -0.06) : S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
      ln(g, rasterize(g, plate), [side * 3.2 + lean, y + 0.7], [side * 8.8 + lean, y + 0.4], i ? S[3] : S[4]);
    }
    const trim = P([
      [side * 2.2 + lean, -35.2], [side * 8.6 + lean, -35.7],
      [side * 9.8 + lean, -34.4], [side * 2.6 + lean, -34.0],
    ]);
    paint(g, trim, G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
    put(g, Math.round(FX + cx + side * 1.1), Math.round(FY - 36.1), G[4]);
  }
}

function drawHeadFront(g, p, back = false) {
  const tx = (p.headTilt || 0) * 0.28;
  const hx = FX + 0.6 + tx, hy = FY - 40 + (p.bob || 0) * 0.6;
  const sway = p.plumeSway || 0, lift = p.plumeLift || 0;
  // neck cowl
  paint(g, P([[-4.2 + (p.lean || 0), -34.6], [4.4 + (p.lean || 0), -34.6], [3.8, -38.3], [-3.4, -38.3]]),
    PAL.cloth, { outline: PAL.cloth[0], mid: PAL.cloth[2], light: PAL.cloth[3], dark: PAL.cloth[1] });
  const helm = [
    [hx - 6.6, hy - 5.2], [hx - 5.0, hy - 9.0], [hx - 1.7, hy - 10.4],
    [hx + 2.2, hy - 10.2], [hx + 5.6, hy - 8.5], [hx + 6.9, hy - 4.4],
    [hx + 7.0, hy + 1.7], [hx + 5.3, hy + 4.9], [hx + 2.1, hy + 6.1],
    [hx - 2.4, hy + 6.1], [hx - 5.4, hy + 4.9], [hx - 7.0, hy + 1.4],
  ];
  const hm = paint(g, helm, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  ln(g, hm.mask, [hx - 5.2, hy - 7.6], [hx - 1.6, hy - 9.3], S[4]);
  ln(g, hm.mask, [hx - 6.3, hy - 2.0], [hx - 5.6, hy + 3.2], S[1]);
  ln(g, hm.mask, [hx + 5.9, hy - 1.2], [hx + 5.4, hy + 3.4], S[1]);
  // gold brow band all around the front
  paint(g, [
    [hx - 6.3, hy - 5.6], [hx + 6.4, hy - 5.6], [hx + 6.9, hy - 3.7], [hx - 6.6, hy - 3.7],
  ], G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
  if (!back) {
    // nasal bar, eye slits and ember gaze
    paint(g, [[hx - 0.7, hy - 3.2], [hx + 0.9, hy - 3.2], [hx + 0.9, hy + 4.8], [hx - 0.7, hy + 4.8]],
      S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
    for (const side of [-1, 1]) {
      const ex = hx + side * 3.0;
      paint(g, [[ex - 2.4, hy - 1.8], [ex + 2.2, hy - 1.9], [ex + 2.1, hy + 0.2], [ex - 2.5, hy + 0.3]],
        [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
      rect(g, Math.round(ex - 1.3), Math.round(hy - 1.2), 2, 1, PAL.ember[3]);
      put(g, Math.round(ex - 0.2), Math.round(hy - 1.1), PAL.ember[5]);
    }
    // lower grill and hinge rivets
    for (let i = -1; i <= 1; i++) put(g, Math.round(hx + i * 2.3), Math.round(hy + 3.5), S[0]);
    put(g, Math.round(hx - 5.8), Math.round(hy - 2.4), G[3]);
    put(g, Math.round(hx + 5.8), Math.round(hy - 2.4), G[3]);
    // embossed votive mark on the brow
    paint(g, [[hx, hy - 4.8], [hx + 0.9, hy - 4.3], [hx, hy - 3.9], [hx - 0.9, hy - 4.3]],
      PAL.ember, { outline: PAL.ember[0], mid: PAL.ember[3], light: PAL.ember[4], dark: PAL.ember[1] });
  } else {
    // back of the helm: seam plates and a riveted comb
    ln(g, hm.mask, [hx, hy - 8.6], [hx, hy + 4.6], S[1]);
    ln(g, hm.mask, [hx - 4.8, hy + 1.2], [hx + 4.8, hy + 1.2], S[0]);
    ln(g, hm.mask, [hx - 5.2, hy + 3.4], [hx + 5.2, hy + 3.4], S[0]);
    for (const side of [-1, 1]) {
      put(g, Math.round(hx + side * 4.2), Math.round(hy + 2.2), G[2]);
      put(g, Math.round(hx + side * 5.0), Math.round(hy - 1.0), S[4]);
    }
    paint(g, [[hx - 2.6, hy + 4.8], [hx + 2.6, hy + 4.8], [hx + 1.8, hy + 6.2], [hx - 1.8, hy + 6.2]],
      S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  }
  // comb crest and horsehair plume
  const comb = [[hx - 4.8, hy - 8.8], [hx + 4.8, hy - 8.8], [hx + 3.4, hy - 11.0], [hx - 3.4, hy - 11.0]];
  paint(g, comb, S, { outline: S[0], mid: S[2], light: S[3], dark: S[1] });
  ln(g, rasterize(g, comb), [hx - 3.4, hy - 10.5], [hx + 2.6, hy - 10.4], G[2]);
  put(g, Math.round(hx), Math.round(hy - 11.4), G[4]);
  const strands = [
    { a: [-2.4, -2.8], b: [-7.6 - sway * 0.4, -5.0 - lift * 0.2], c: [-11.4 - sway, -2.6 - lift * 0.3], w0: 1.3, w1: 2.0, tone: 1 },
    { a: [-0.8, -3.6], b: [-4.8 - sway * 0.3, -7.2 - lift * 0.3], c: [-7.4 - sway * 0.8, -5.0 - lift * 0.4], w0: 1.4, w1: 1.8, tone: 2 },
    { a: [0.8, -3.2], b: [-1.6 - sway * 0.2, -6.0 - lift * 0.3], c: [-2.6 - sway * 0.5, -4.0 - lift * 0.2], w0: 1.1, w1: 1.3, tone: 3 },
  ];
  for (const st of strands) {
    const ax = hx + st.a[0], ay = hy + st.a[1];
    const bx = hx + st.b[0], by = hy + st.b[1];
    const cx2 = hx + st.c[0], cy2 = hy + st.c[1];
    const pts = [
      [hx, hy - 11.2], [ax - st.w0, ay - st.w0], [bx - st.w1, by - st.w1], [cx2, cy2],
      [bx + st.w1, by + st.w1 * 0.6], [ax + st.w0, ay + st.w0 * 0.7], [hx, hy - 9.4],
    ];
    const tone = C[st.tone];
    paint(g, pts, [C[0], C[1], tone, C[4], C[5]], { outline: C[0], mid: tone, light: C[4], dark: C[1] });
    ln(g, rasterize(g, pts), [ax, ay], [bx, by], C[1]);
  }
  put(g, Math.round(hx), Math.round(hy - 10.9), PAL.ember[4]);
}

function drawShieldBack(g, p) {
  const sx = FX - 10.8 + (p.shield ? (p.shield[0] + 8.8) * 0.2 : 0), sy = FY - 22.5;
  const pts = [
    [sx - 1.5, sy - 9], [sx + 1.8, sy - 9.4], [sx + 3.2, sy - 4], [sx + 2.8, sy + 5],
    [sx + 0.5, sy + 9], [sx - 2.2, sy + 5], [sx - 3.0, sy - 3],
  ];
  paint(g, pts, S, { outline: INK, mid: S[2], light: S[3], dark: S[1] });
  paint(g, [[sx - 1.0, sy - 6.4], [sx + 1.5, sy - 6.6], [sx + 1.8, sy + 3.2], [sx - 1.1, sy + 3.5]],
    [PAL.blue[0], PAL.blue[1], PAL.blue[1], PAL.blue[0]], { outline: PAL.blue[0], mid: PAL.blue[1], bevel: false });
  ln(g, rasterize(g, pts), [sx - 1, sy - 8], [sx - 2, sy + 4], S[4]);
  put(g, Math.round(sx), Math.round(sy - 7.6), G[3]);
  put(g, Math.round(sx + 0.4), Math.round(sy + 7.4), G[2]);
}

function drawCapeBack(g, p) {
  const sway = p.capeSway || 0, lift = p.capeLift || 0;
  const opt = { outline: C[0], mid: C[2], light: C[3], dark: C[1], hi: C[4] };
  // split tails end above the knee so the greaves and stride stay readable
  const left = paint(g, P([
    [-8.8, -33.2], [0.8, -32.6], [1.8, -26], [1.4, -21.5 + lift * 0.6],
    [-0.2, -16 + lift], [-2.0, -20.5 + lift], [-4.4, -15.2 + lift],
    [-6.6, -20.2 + lift], [-8.7, -15.6 + lift], [-9.9, -23], [-10.6 + sway * 0.2, -27], [-10.4, -31],
  ]), C, opt);
  const right = paint(g, P([
    [-0.8, -32.6], [8.8, -33.2], [10.4, -31], [10.6 + sway * 0.2, -27],
    [9.9, -23], [8.7 + sway * 0.12, -15.6 + lift], [6.6 + sway * 0.16, -20.2 + lift],
    [4.4 + sway * 0.22, -15.2 + lift], [2.0 + sway * 0.28, -20.5 + lift],
    [0.2 + sway * 0.2, -16 + lift], [-1.4, -21.5 + lift * 0.6], [-1.8, -26],
  ]), C, opt);
  // deep folds that follow each tail
  for (const [m, x0, x1] of [[left, -8.1, -7.6], [left, -4.6, -4.2], [right, 4.6, 5.2], [right, 8.1, 8.8]]) {
    ln(g, m.mask, [x0, -31], [x1 + sway * 0.35, -17 + lift], C[1]);
    ln(g, m.mask, [x0 + 1.0, -31], [x1 + 1.0 + sway * 0.35, -18 + lift], C[4]);
  }
  // shoulder trim and rivets
  ln(g, left.mask, [-8.4, -32.2], [0.0, -31.9], G[2]);
  ln(g, right.mask, [0.0, -31.9], [8.4, -32.2], G[2]);
  ln(g, left.mask, [-8.0, -31.2], [0.0, -30.9], G[1]);
  ln(g, right.mask, [0.0, -30.9], [8.0, -31.2], G[1]);
  put(g, FX - 6, FY - 32, G[3]);
  put(g, FX + 6, FY - 32, G[3]);
  // bright tattered tips
  for (const [x, y] of [[9.9, -23], [8.7, -15.6], [4.4, -15.2], [0.2, -16], [-4.4, -15.2], [-8.7, -15.6], [-9.9, -23]]) {
    put(g, Math.round(FX + x + sway * 0.25), Math.round(FY + y + lift), C[4]);
  }
  put(g, Math.round(FX + 2.6), Math.round(FY - 19), C[3]);
  put(g, Math.round(FX - 2.0), Math.round(FY - 18), C[1]);
}

function drawFrontKnight(g, p, back = false) {
  const legs = p.legs || [{ swing: 0, lift: 0, dx: 0 }, { swing: 0, lift: 0, dx: 0 }];
  if (!back) {
    drawCapeFront(g, p);
    drawLegFront(g, -1, legs[0], true);
    drawLegFront(g, 1, legs[1], false);
    drawTorso(g, p);
    // votive emblem on the exposed right breastplate
    paint(g, P(ellipsePts(3.1, -29.6, 1.8, 2.2, 8)), G, { outline: G[0], mid: G[2], light: G[3], dark: G[1] });
    put(g, Math.round(FX + 3.1), Math.round(FY - 29.9), PAL.ember[4]);
    drawShieldArm(g, p);
    drawShield(g, p);
    drawPauldronsFront(g, p);
    drawHeadFront(g, p, false);
    drawSwordArm(g, p);
    drawSword(g, p);
  } else {
    drawLegFront(g, -1, legs[0], true);
    drawLegFront(g, 1, legs[1], false);
    drawTorso(g, p);
    drawCapeBack(g, p);
    drawShieldBack(g, p);
    drawPauldronsFront(g, p);
    drawHeadFront(g, p, true);
    drawSwordArm(g, p);
    drawSword(g, p);
  }
  outlineUnion(g, INK, false);
}

function drawKnight(g, p) {
  drawCape(g, p);
  // far arm + back leg behind body
  drawShieldArm(g, p);
  drawLeg(g, [p.hip[0] - 3.4, p.hip[1]], p.legBack, true, false);
  drawTorso(g, p);
  drawLeg(g, [p.hip[0] + 3, p.hip[1]], p.legFront, false, true);
  drawPauldrons(g, p);
  drawShield(g, p);
  if (p.hand[0] < 2) {
    drawSwordArm(g, p);
    drawSword(g, p);
    drawHead(g, p);
  } else {
    drawHead(g, p);
    drawSwordArm(g, p);
    drawSword(g, p);
  }
  outlineUnion(g, INK, false);
}

/* ---------- animations ---------- */
const PHI = Math.PI * 2;

function idle(i, n) {
  const t = (i / n) * PHI;
  return pose({
    bob: Math.sin(t) * 0.4,
    lean: Math.sin(t) * 0.15,
    headTilt: Math.sin(t) * 0.4,
    capeSway: 1 + Math.sin(t - 0.7) * 1.1,
    plumeSway: Math.sin(t - 0.5) * 1.4,
    plumeLift: Math.sin(t) * 0.5,
    hand: [13.8 + Math.sin(t) * 0.4, -22.8 - Math.sin(t) * 0.4],
    swordAngle: 138 + Math.sin(t) * 1.2,
    shield: [-3, -23.5 + Math.sin(t + 0.4) * 0.3],
  });
}

const WALK = [
  { f: 36, b: -32, fs: -14, bs: 12, bob: 0.5, fl: 3.2, bl: 0, ht: 0.6 },
  { f: 22, b: -16, fs: -5, bs: 5, bob: -0.9, fl: 1.1, bl: 0, ht: 1.1 },
  { f: 2, b: 2, fs: 3, bs: -2, bob: -1.6, fl: 0.2, bl: 0.2, ht: 0.2 },
  { f: -22, b: 26, fs: 9, bs: -6, bob: 0.4, fl: 0, bl: 1, ht: -0.6 },
  { f: -36, b: 32, fs: 14, bs: -10, bob: 0.5, fl: 0, bl: 3.2, ht: -1.2 },
  { f: -18, b: 18, fs: 4, bs: -2, bob: -0.9, fl: 0, bl: 1, ht: -0.9 },
  { f: 2, b: -2, fs: -3, bs: 2, bob: -1.6, fl: 0.2, bl: 0.2, ht: 0.1 },
  { f: 26, b: -24, fs: -10, bs: 10, bob: 0, fl: 1.4, bl: 0, ht: 0.8 },
];
function walkKeyAt(u) {
  const base = Math.floor(u), k = u - base;
  const a = WALK[base % 8], b = WALK[(base + 1) % 8];
  const s = k * k * (3 - 2 * k);
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key], s);
  return out;
}
function walk(i, n = 12) {
  const k = walkKeyAt((i / n) * 8);
  const t = (i / n) * PHI;
  return pose({
    legFront: { thigh: k.f, shin: k.fs, lift: k.fl },
    legBack: { thigh: k.b, shin: k.bs, lift: k.bl },
    hip: [Math.sin(t) * 0.9, -19 + k.bob],
    bob: k.bob,
    lean: 0.9 + Math.cos(t) * 0.5,
    headTilt: k.ht,
    hand: [13.8 + Math.sin(t) * 1.8, -23 + k.bob - (k.f < 0 ? 0.8 : 0)],
    swordAngle: 136 + Math.sin(t + 0.3) * 5,
    shield: [-2.8 + Math.sin(t) * 0.7, -24 + Math.cos(t) * 0.9],
    shieldArm: [-4, -32 + k.bob * 0.6],
    capeSway: 3 + Math.sin(t - 0.8) * 2.6,
    capeLift: 1.2 + Math.abs(Math.sin(t)) * 1.7,
    plumeSway: 1.8 + Math.sin(t - 0.4) * 3,
    plumeLift: 1 + Math.abs(Math.sin(t - 0.3)) * 1.4,
  });
}

const A1 = [
  [0, pose({ hand: [13.5, -22.5], swordAngle: 138, lean: 0, capeSway: 1 })],
  [0.34, pose({
    hand: [-3, -40], swordAngle: -62, lean: -1.5, hip: [-1, -18.5],
    legFront: { thigh: 22, shin: -4 }, legBack: { thigh: -20, shin: 8 },
    bob: -0.5, headTilt: -1.5, capeSway: 3.5, plumeSway: 3,
  })],
  [0.52, pose({
    hand: [15, -27], swordAngle: 92, lean: 2, hip: [1.5, -19],
    legFront: { thigh: 30, shin: -12 }, legBack: { thigh: -24, shin: 14 },
    bob: 0.5, headTilt: 1, capeSway: -2.5, capeLift: 2, plumeSway: -1, dust: 1,
  })],
  [0.68, pose({
    hand: [12, -16], swordAngle: 158, lean: 1.5, hip: [1, -18],
    legFront: { thigh: 27, shin: -15 }, legBack: { thigh: -22, shin: 12 },
    bob: 1, headTilt: 0.5, capeSway: -3.5, capeLift: 1, plumeSway: -2.5,
  })],
  [0.86, pose({ hand: [13.7, -22.2], swordAngle: 140, lean: 0.5, capeSway: 0.5, plumeSway: 1 })],
  [1, pose({ hand: [13.8, -22.8], swordAngle: 138, capeSway: 1 })],
];
const A2 = [
  [0, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
  [0.3, pose({
    hand: [12, -14], swordAngle: 205, lean: 1.5, hip: [1, -18],
    legFront: { thigh: 24, shin: -8 }, legBack: { thigh: -18, shin: 10 },
    headTilt: 1, capeSway: -2, plumeSway: 2.5, dust: 0.4,
  })],
  [0.48, pose({
    hand: [17, -24], swordAngle: 76, lean: 2.5, hip: [2, -19.5],
    legFront: { thigh: 32, shin: -14 }, legBack: { thigh: -26, shin: 16 },
    bob: -0.5, headTilt: 1.5, capeSway: -4, capeLift: 2, plumeSway: -3, dust: 1,
  })],
  [0.66, pose({
    hand: [8, -36], swordAngle: -26, lean: 0, hip: [0.5, -20],
    legFront: { thigh: 14, shin: -4 }, legBack: { thigh: -12, shin: 6 },
    bob: -1.5, headTilt: -1, capeSway: 2.5, capeLift: 3, plumeSway: 4,
  })],
  [0.84, pose({ hand: [12, -29], swordAngle: 20, capeSway: 2, plumeSway: 2 })],
  [1, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
];
const A3 = [
  [0, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
  [0.35, pose({
    hand: [-1, -46], swordAngle: -34, lean: -2, hip: [-1.5, -17.5],
    legFront: { thigh: 18, shin: -15 }, legBack: { thigh: -24, shin: 18 },
    bob: 1.5, headTilt: -2, capeSway: 4, capeLift: 1, plumeSway: 4,
  })],
  [0.55, pose({
    hand: [16, -32], swordAngle: 110, lean: 2.5, hip: [2, -19],
    legFront: { thigh: 34, shin: -16 }, legBack: { thigh: -28, shin: 18 },
    bob: -0.5, headTilt: 1.5, capeSway: -5, capeLift: 3, plumeSway: -3, dust: 1,
  })],
  [0.67, pose({
    hand: [17, -16], swordAngle: 168, lean: 3, hip: [3, -16.5],
    legFront: { thigh: 38, shin: -24 }, legBack: { thigh: -32, shin: 24 },
    bob: 2, headTilt: 2, capeSway: -4, capeLift: 1, plumeSway: -4, dust: 1.5,
  })],
  [0.8, pose({
    hand: [16, -16], swordAngle: 168, lean: 2.5, hip: [2.5, -17],
    legFront: { thigh: 34, shin: -20 }, legBack: { thigh: -30, shin: 20 },
    bob: 1.5, headTilt: 1.5, capeSway: -2, plumeSway: -2,
  })],
  [0.92, pose({ hand: [13.4, -20.5], swordAngle: 155, lean: 1, capeSway: -0.5, plumeSway: 1 })],
  [1, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
];
const DASH = [
  [0, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
  [0.22, pose({
    hand: [4, -19], swordAngle: 168, lean: -2, hip: [-2, -20.5],
    legFront: { thigh: -20, shin: 24, lift: 2 }, legBack: { thigh: -34, shin: 30, lift: 3 },
    bob: 2, headTilt: -1, capeSway: 5, capeLift: 3, plumeSway: 5,
  })],
  [0.45, pose({
    hand: [1, -17], swordAngle: 175, lean: -3, hip: [-3, -21],
    legFront: { thigh: -34, shin: 34, lift: 3 }, legBack: { thigh: -46, shin: 38, lift: 4 },
    bob: 3, headTilt: -2, capeSway: 7, capeLift: 4, plumeSway: 7, dust: 1,
  })],
  [0.7, pose({
    hand: [13.6, -22], swordAngle: 152, lean: 1, hip: [0, -19.5],
    legFront: { thigh: 26, shin: -10, lift: 1 }, legBack: { thigh: -20, shin: 12 },
    bob: 0.5, headTilt: 1, capeSway: 3, capeLift: 2, plumeSway: 3,
  })],
  [1, pose({ hand: [13.8, -22.8], swordAngle: 138 })],
];
const HURT = [
  [0, pose({ hand: [13, -23], swordAngle: 130 })],
  [0.4, pose({
    hand: [5, -21], swordAngle: 155, lean: -3, hip: [-1, -19],
    legFront: { thigh: 8, shin: -2 }, legBack: { thigh: -22, shin: 16 },
    headTilt: -3, bob: 1, capeSway: -4, plumeSway: 4, dust: 0.5,
  })],
  [0.7, pose({
    hand: [10, -20], swordAngle: 138, lean: -1.5, hip: [-0.5, -18.5],
    legFront: { thigh: 12, shin: -4 }, legBack: { thigh: -18, shin: 12 },
    headTilt: -1.5, bob: 1.5, capeSway: -2, plumeSway: 2,
  })],
  [1, pose({ hand: [12.6, -22], swordAngle: 132 })],
];

/* ---------- front / back animation pose ---------- */
function fpose(o = {}) {
  const base = {
    bob: 0, lean: 0, headTilt: 0, hip: [0, -19],
    hand: [12.2, -23.6], swordAngle: 120,
    shield: [-8.8, -23.5], shieldAngle: 0, shieldArm: [-4, -32],
    legs: [{ swing: 0, lift: 0, dx: 0 }, { swing: 0, lift: 0, dx: 0 }],
    capeSway: 1.6, capeLift: 0.8, plumeSway: 1.2, plumeLift: 0.6, dust: 0,
  };
  const out = { ...base, ...o };
  if (o.legs) out.legs = o.legs.map((l) => ({ ...l }));
  out.hip = [...(o.hip || base.hip)];
  out.hand = [...(o.hand || base.hand)];
  out.shield = [...(o.shield || base.shield)];
  out.shieldArm = [...(o.shieldArm || base.shieldArm)];
  return out;
}
function lerpF(a, b, t) {
  const o = {};
  for (const k of ["bob", "lean", "headTilt", "shieldAngle", "capeSway", "capeLift", "plumeSway", "plumeLift", "dust"]) o[k] = lerp(a[k], b[k], t);
  for (const k of ["hip", "hand", "shield", "shieldArm"]) o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  o.swordAngle = lerp(a.swordAngle, b.swordAngle, t);
  o.legs = a.legs.map((leg, i) => ({
    swing: lerp(leg.swing, b.legs[i].swing, t),
    lift: lerp(leg.lift, b.legs[i].lift, t),
    dx: lerp(leg.dx, b.legs[i].dx, t),
  }));
  return o;
}
function sampleF(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
      let k = (t - t0) / Math.max(1e-6, t1 - t0);
      k = k * k * (3 - 2 * k);
      return lerpF(p0, p1, k);
    }
  }
  return keys[keys.length - 1][1];
}

function frontIdle(i, n) {
  const t = (i / n) * PHI, s = Math.sin(t);
  return fpose({
    bob: s * 0.5, lean: s * 0.18, headTilt: s * 0.45, hip: [s * 0.2, -19],
    hand: [12.2 + s * 0.5, -23.6 - s * 0.5], swordAngle: 120 + s * 2.2,
    shield: [-8.8 + s * 0.2, -23.5 - s * 0.3], shieldArm: [-4, -32 + s * 0.2],
    legs: [{ swing: s * 0.1, lift: 0 }, { swing: -s * 0.1, lift: 0 }],
    capeSway: 1.6 + s * 1.1, capeLift: 0.8 + Math.abs(s) * 0.6,
    plumeSway: 1.2 + Math.sin(t - 0.5) * 1.6, plumeLift: 0.6 + s * 0.4,
  });
}

function frontWalk(i, n) {
  const t = (i / n) * PHI, s = Math.sin(t), c = Math.cos(t);
  const bob = -Math.abs(c) * 1.7;
  return fpose({
    bob, lean: 0.8 + c * 0.35, headTilt: -s * 0.9, hip: [s * 1.3, -19 + bob],
    hand: [12.2 - s * 2.2, -23.6 - Math.abs(c) * 1.1], swordAngle: 120 + s * 7,
    shield: [-8.8 + s * 0.7, -23.5 - Math.abs(c) * 1.0], shieldArm: [-4, -32 + bob * 0.5],
    legs: [
      { swing: s * 6.0, lift: Math.max(0, s) * 6.4, dx: s * 0.9 },
      { swing: -s * 6.0, lift: Math.max(0, -s) * 6.4, dx: -s * 0.9 },
    ],
    capeSway: 2.2 + Math.sin(t - 0.7) * 3.2, capeLift: 1.2 + Math.abs(s) * 2.0,
    plumeSway: 1.6 + Math.sin(t - 0.4) * 3.4, plumeLift: 0.9 + Math.abs(c) * 1.6,
    dust: s > 0.8 ? 1 : 0,
  });
}

const F1 = [
  [0, fpose()],
  [0.22, fpose({
    hand: [12, -44], swordAngle: 32, lean: -1.3, bob: -0.6, headTilt: -1.2,
    hip: [-0.4, -18.8], shield: [-9.2, -24.6],
    legs: [{ swing: -1.2, lift: 0.4 }, { swing: 1.0, lift: 0 }],
    capeSway: 3.4, capeLift: 2.6, plumeSway: 2.4, plumeLift: 2.2,
  })],
  [0.4, fpose({
    hand: [3, -18], swordAngle: 208, lean: 2.4, bob: 0.8, headTilt: 1.4,
    hip: [1.3, -19], shield: [-8.0, -22.4],
    legs: [{ swing: 2.2, lift: 0.3 }, { swing: -2.4, lift: 1.2 }],
    capeSway: -2.8, capeLift: 3.2, plumeSway: -2.6, plumeLift: 1.4, dust: 1,
  })],
  [0.55, fpose({
    hand: [11, -13], swordAngle: 142, lean: 2.6, bob: 1.1, headTilt: 1.0,
    hip: [1.5, -18.4], shield: [-8.4, -22.2],
    legs: [{ swing: 1.6, lift: 0 }, { swing: -2, lift: 0.4 }],
    capeSway: -3.6, capeLift: 1.5, plumeSway: -3, plumeLift: 0.6, dust: 0.5,
  })],
  [0.76, fpose({ hand: [12, -21], swordAngle: 128, lean: 1, hip: [0.6, -19], capeSway: -0.4 })],
  [1, fpose()],
];
const F2 = [
  [0, fpose()],
  [0.3, fpose({
    hand: [15, -14], swordAngle: 150, lean: 1.4, bob: 1.2, headTilt: 1.2,
    hip: [1.2, -18.4], shield: [-7.8, -22],
    legs: [{ swing: 2, lift: 0 }, { swing: -2.4, lift: 0.7 }],
    capeSway: -2.2, capeLift: 1.2, plumeSway: 2.6, dust: 0.4,
  })],
  [0.48, fpose({
    hand: [2, -38], swordAngle: 300, lean: -0.6, bob: -0.8, headTilt: -1.6,
    hip: [-0.8, -19.4], shield: [-9.4, -25],
    legs: [{ swing: -1.4, lift: 0.8 }, { swing: 1.2, lift: 0 }],
    capeSway: 4.2, capeLift: 3.4, plumeSway: 3.4, plumeLift: 2.6,
  })],
  [0.62, fpose({
    hand: [-5, -40], swordAngle: 272, lean: -2, bob: -0.4, headTilt: -2,
    hip: [-1.2, -19.2], shield: [-9, -25],
    legs: [{ swing: -2, lift: 1.2 }, { swing: 1.6, lift: 0 }],
    capeSway: 4.8, capeLift: 3.8, plumeSway: 4, plumeLift: 2.8, dust: 0.4,
  })],
  [0.78, fpose({
    hand: [5, -31], swordAngle: 205, lean: -0.5, bob: 0.4, headTilt: -0.6,
    hip: [0, -18.8], capeSway: 2.2, capeLift: 2, plumeSway: 2,
  })],
  [1, fpose()],
];
const F3 = [
  [0, fpose()],
  [0.2, fpose({
    hand: [4, -50], swordAngle: 4, lean: -1.2, bob: -0.8, headTilt: -1.8,
    hip: [-0.6, -19.5], shield: [-9.4, -25.4],
    legs: [{ swing: -1, lift: 0.5 }, { swing: 1, lift: 0.2 }],
    capeSway: 4, capeLift: 3, plumeSway: 3, plumeLift: 2.4,
  })],
  [0.38, fpose({
    hand: [5, -52], swordAngle: 356, lean: -1.6, bob: -0.9, headTilt: -2,
    hip: [-1, -19.8], shield: [-9.6, -25.6],
    legs: [{ swing: -1.4, lift: 0.7 }, { swing: 1.4, lift: 0.3 }],
    capeSway: 5, capeLift: 3.8, plumeSway: 3.8, plumeLift: 3,
  })],
  [0.56, fpose({
    hand: [7, -17], swordAngle: 165, lean: 3.2, bob: 2.4, headTilt: 2.4,
    hip: [2.4, -16.6], shield: [-7.2, -20.6],
    legs: [{ swing: 3, lift: 0 }, { swing: -3.4, lift: 1.4 }],
    capeSway: -4.6, capeLift: 4, plumeSway: -4.2, plumeLift: 1.2, dust: 1.4,
  })],
  [0.68, fpose({
    hand: [6, -18], swordAngle: 170, lean: 3, bob: 2.6, headTilt: 2,
    hip: [2.2, -16.2], shield: [-7.4, -20.2],
    legs: [{ swing: 3.2, lift: 0 }, { swing: -3.2, lift: 0.8 }],
    capeSway: -3.4, capeLift: 2.2, plumeSway: -3.4, plumeLift: 0.4, dust: 1.2,
  })],
  [0.84, fpose({
    hand: [9, -17], swordAngle: 144, lean: 1.8, bob: 1, headTilt: 1,
    hip: [1.2, -18.2], legs: [{ swing: 2, lift: 0 }, { swing: -2, lift: 0 }],
    capeSway: -1.4, capeLift: 0.8,
  })],
  [1, fpose()],
];
const FDASH = [
  [0, fpose()],
  [0.24, fpose({
    bob: 1.8, lean: -2, headTilt: -1.2, hip: [-1, -20.2],
    hand: [7, -19], swordAngle: 158, shield: [-7.6, -21.4], shieldArm: [-3.4, -31],
    legs: [{ swing: -1.4, lift: 2.6 }, { swing: 1.8, lift: 1.8 }],
    capeSway: 4.6, capeLift: 4, plumeSway: 4.6, plumeLift: 2.4, dust: 1,
  })],
  [0.5, fpose({
    bob: 2.4, lean: -3, headTilt: -2, hip: [-1.8, -20.8],
    hand: [9, -24], swordAngle: 152, shield: [-7.4, -22], shieldArm: [-3.2, -31.4],
    legs: [{ swing: -2, lift: 3.4 }, { swing: 2.4, lift: 2.6 }],
    capeSway: 6, capeLift: 5, plumeSway: 6, plumeLift: 3, dust: 1.4,
  })],
  [0.76, fpose({
    bob: 0.6, lean: -0.5, hip: [-0.4, -19.4],
    hand: [12, -22], swordAngle: 134, capeSway: 2.4, capeLift: 2, plumeSway: 2.4,
  })],
  [1, fpose()],
];
const FHURT = [
  [0, fpose()],
  [0.34, fpose({
    bob: 1.2, lean: -3.2, headTilt: -3.4, hip: [-0.8, -18.6],
    hand: [16, -19], swordAngle: 112, shield: [-10.4, -22], shieldArm: [-4.6, -31],
    legs: [{ swing: -1, lift: 0.4 }, { swing: 1.6, lift: 0 }],
    capeSway: -4.4, capeLift: 1.4, plumeSway: 4.4,
  })],
  [0.68, fpose({
    bob: 1.4, lean: -1.4, headTilt: -1.6, hip: [-0.3, -18.6],
    hand: [12.6, -21], swordAngle: 128, shield: [-9.2, -23],
    legs: [{ swing: -0.5, lift: 0 }, { swing: 0.8, lift: 0 }],
    capeSway: -1.8, plumeSway: 2.2,
  })],
  [1, fpose({ hand: [11.8, -23], swordAngle: 125 })],
];

function deathPose(i, view = 0) {
  if (view !== 0) {
    const keys = [
      [0, fpose()],
      [0.16, fpose({
        bob: 1.4, lean: -3.2, headTilt: -3.4, hip: [-1, -18.2],
        hand: [3, -19], swordAngle: 164, shield: [-10, -21.6],
        legs: [{ swing: -0.6, lift: 0.5 }, { swing: 1.4, lift: 0 }],
        capeSway: -4, plumeSway: 4,
      })],
      [0.36, fpose({
        bob: 4, lean: -4.4, headTilt: -6, hip: [-2, -13],
        hand: [2, -15], swordAngle: 168, shield: [-9, -18],
        legs: [{ swing: -1.6, lift: 0 }, { swing: 2.2, lift: 0.4 }],
        capeSway: -2.6, plumeSway: 3,
      })],
      [0.55, fpose({
        bob: 8, lean: -5.6, headTilt: -10, hip: [-3, -8.4],
        hand: [1, -17], swordAngle: 158, shield: [-8.4, -14],
        legs: [{ swing: -2, lift: 0 }, { swing: 2.6, lift: 0 }],
        capeSway: -1, plumeSway: 2,
      })],
    ];
    if (i <= 3) return { p: sampleF(keys, (i / 3) * 0.55), rot: 0, fall: 0 };
    const rots = view === 1 ? [-18, -32, -45, -58, -69, -78, -85, -89] : [18, 32, 45, 58, 69, 78, 85, 89];
    const falls = [0, 1, 1, 1, 2, 2, 2, 2];
    return { p: keys[3][1], rot: rots[i - 4], fall: falls[i - 4] };
  }
  const keys = [
    [0, pose({ hand: [13, -23], swordAngle: 130 })],
    [0.15, pose({
      hand: [4, -18], swordAngle: 168, lean: -3, headTilt: -3, hip: [-1, -18.5],
      legFront: { thigh: 6, shin: -2 }, legBack: { thigh: -20, shin: 14 }, capeSway: -3, plumeSway: 3,
    })],
    [0.35, pose({
      hand: [2, -15], swordAngle: 168, lean: -4, headTilt: -6, hip: [-2, -13],
      legFront: { thigh: 20, shin: 75, lift: 0 }, legBack: { thigh: -40, shin: 95, lift: 0 },
      bob: 4, capeSway: -2, plumeSway: 3,
    })],
    [0.55, pose({
      hand: [1, -17], swordAngle: 158, lean: -6, headTilt: -10, hip: [-3, -9],
      legFront: { thigh: 30, shin: 110 }, legBack: { thigh: -30, shin: 115 },
      bob: 8, capeSway: -1, plumeSway: 2,
    })],
  ];
  if (i <= 3) return { p: sampleKeys(keys, (i / 3) * 0.55), rot: 0, fall: 0 };
  const rot = [18, 32, 45, 58, 69, 78, 85, 89][i - 4];
  const fall = [0, 1, 1, 1, 2, 2, 2, 2][i - 4];
  return { p: keys[3][1], rot, fall };
}

function rotateGrid(src, deg, pivotX, pivotY, dx = 0, dy = 0) {
  const out = makeGrid(src.w, src.h);
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const cx = pivotX, cy = pivotY;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const col = src.px[y * src.w + x];
      if (!col) continue;
      const rx = cx + (x - cx) * c - (y - cy) * s + dx;
      const ry = cy + (x - cx) * s + (y - cy) * c + dy;
      put(out, Math.round(rx), Math.round(ry), col);
    }
  }
  return out;
}

const ROW_COUNTS = [8, 12, 10, 12, 16, 8, 5, 12];
const VIEW_ROWS = 8, VIEWS = 3, COLS = 16;

function drawRig(g, view, p) {
  if (view === 0) drawKnight(g, p);
  else drawFrontKnight(g, p, view === 2);
}

function drawFrame(g, view, row, i) {
  if (row === 7) {
    const d = deathPose(i, view);
    if (d.rot) {
      const base = makeGrid(W, H);
      drawRig(base, view, d.p);
      const dx = view === 0 ? 4 : view === 1 ? 2 : -2;
      const rot = rotateGrid(base, d.rot, FX, FY - 14, dx, d.fall);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = rot.px[y * W + x];
        if (c) put(g, x, y, c);
      }
    } else {
      drawRig(g, view, d.p);
    }
    if (i >= 3) for (let x = 36; x < 82; x++) if (x % 3) put(g, x, FY + 1, "#241d2b");
    outlineUnion(g, INK, false);
    return;
  }
  const n = ROW_COUNTS[row];
  if (view === 0) {
    let p;
    switch (row) {
      case 0: p = idle(i, n); break;
      case 1: p = walk(i, n); break;
      case 2: p = sampleKeys(A1, i / (n - 1)); break;
      case 3: p = sampleKeys(A2, i / (n - 1)); break;
      case 4: p = sampleKeys(A3, i / (n - 1)); break;
      case 5: p = sampleKeys(DASH, i / (n - 1)); break;
      case 6: p = sampleKeys(HURT, i / (n - 1)); break;
      default: p = pose();
    }
    drawKnight(g, p);
    return;
  }
  const back = view === 2;
  let p;
  switch (row) {
    case 0: p = frontIdle(i, n); break;
    case 1: p = frontWalk(i, n); break;
    case 2: p = sampleF(F1, i / (n - 1)); break;
    case 3: p = sampleF(F2, i / (n - 1)); break;
    case 4: p = sampleF(F3, i / (n - 1)); break;
    case 5: p = sampleF(FDASH, i / (n - 1)); break;
    case 6: p = sampleF(FHURT, i / (n - 1)); break;
    default: p = fpose();
  }
  drawFrontKnight(g, p, back);
}

await exportSheet({
  name: "knight",
  w: W, h: H, cols: COLS, rows: VIEWS * VIEW_ROWS,
  frames: VIEWS * VIEW_ROWS * COLS,
  draw: (g, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const view = Math.floor(row / VIEW_ROWS);
    const anim = row % VIEW_ROWS;
    if (col >= ROW_COUNTS[anim]) return;
    drawFrame(g, view, anim, col);
  },
}).catch((e) => { console.error(e); process.exit(1); });
console.log("knight done");
