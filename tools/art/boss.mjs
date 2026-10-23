// The Hollow Warden: horned revenant boss. 120px cells, 6x6 animations.
import {
  INK, PAL, put, rect, line, lineMasked, ellipsePts, rotPt, shift,
  paint, rasterize, inMask, limb, outlineUnion, exportSheet,
} from "./pixel.mjs";

const BW = 120, BH = 120, BX = 60, BY = 112;
const IRON = ["#101116", "#1c1e25", "#2b2e38", "#3e424e", "#5b606d", "#8b919e"];
const DARKIRON = ["#0b0c11", "#14161c", "#1d2028", "#292c36", "#3c404b"];
const CAPE = ["#1a0710", "#2e0d18", "#481525", "#652033", "#8a3040"];
const GOLD = PAL.gold;
const EMBER = PAL.ember;
const LEATHER = PAL.leather;
const SD = (ramp, k) => ramp.map((c) => {
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  const f = 1 + k;
  const h = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * f)));
  return "#" + [h(r), h(g), h(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
});

const BASE = {
  bob: 0, lean: 0, headTilt: 0, capeSway: 0, capeLift: 0, ember: 1, dust: 0,
  legB: { thigh: -10, shin: 6, lift: 0 },
  legF: { thigh: 12, shin: -5, lift: 0 },
  hand: [21, -1], swordAngle: 138,
  shieldHand: [-20, 4], shieldAngle: 0,
};
function bpose(o = {}) {
  return { ...BASE, ...o, legB: { ...BASE.legB, ...(o.legB || {}) }, legF: { ...BASE.legF, ...(o.legF || {}) } };
}
function blerp(a, b, t) {
  const o = {};
  for (const k of ["bob", "lean", "headTilt", "capeSway", "capeLift", "ember", "dust", "swordAngle", "shieldAngle"]) o[k] = a[k] + (b[k] - a[k]) * t;
  o.hand = [a.hand[0] + (b.hand[0] - a.hand[0]) * t, a.hand[1] + (b.hand[1] - a.hand[1]) * t];
  o.shieldHand = [a.shieldHand[0] + (b.shieldHand[0] - a.shieldHand[0]) * t, a.shieldHand[1] + (b.shieldHand[1] - a.shieldHand[1]) * t];
  for (const leg of ["legB", "legF"]) {
    o[leg] = {};
    for (const k of ["thigh", "shin", "lift"]) o[leg][k] = a[leg][k] + (b[leg][k] - a[leg][k]) * t;
  }
  return o;
}
function bkey(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
    let k = (t - t0) / Math.max(1e-6, t1 - t0); k = k * k * (3 - 2 * k);
    return blerp(p0, p1, k);
  }
  return keys[keys.length - 1][1];
}

function ring(g, x, y, r, ramp, opts = {}) {
  paint(g, ellipsePts(x, y, r, r, 12), ramp, { outline: opts.outline ?? ramp[0], mid: opts.mid ?? ramp[2], light: opts.light ?? ramp[3], dark: opts.dark ?? ramp[1], bevel: opts.bevel });
}

function drawCape(g, p, hx, hy) {
  const sway = p.capeSway, lift = p.capeLift;
  const pts = [[-10, -37], [-14, -33], [-18, -24], [-20 - sway * 0.4, -12 + lift * 0.3],
    [-24 - sway, 2 + lift * 0.6], [-22 - sway, 16 + lift], [-19 - sway, 9 + lift],
    [-17 - sway, 22 + lift], [-14 - sway, 12 + lift], [-11 - sway, 24 + lift],
    [-8 - sway, 13 + lift], [-5 - sway, 20 + lift], [-3 - sway, 9 + lift],
    [-1, -6], [1, -22], [3, -34]].map(([x, y]) => [hx + x, hy + y]);
  const m = paint(g, pts, CAPE, { outline: CAPE[0], mid: CAPE[2], light: CAPE[3], dark: CAPE[1], hi: CAPE[4] });
  // tattered edge bits
  for (let i = 0; i < 5; i++) {
    const bx = hx - 21 + i * 8 + sway * 0.4, by = hy + 14 + (i % 3) * 5 + lift;
    lineMasked(g, m.mask, bx, by - 4, bx + 1, by + 3, CAPE[1]);
  }
  lineMasked(g, m.mask, hx - 7, hy - 30, hx - 12 - sway * 0.5, hy + 12, CAPE[1]);
  lineMasked(g, m.mask, hx - 12, hy - 22, hx - 17 - sway * 0.5, hy + 8, CAPE[3]);
  lineMasked(g, m.mask, hx - 2, hy - 32, hx - 4, hy + 6, CAPE[4]);
}

function bossLeg(g, hx, hy, cfg, dark = false) {
  const ramp = dark ? SD(IRON, -0.3) : IRON;
  const a1 = (cfg.thigh * Math.PI) / 180;
  const knee = [hx + Math.sin(a1) * 20, hy + Math.cos(a1) * 20];
  const a2 = a1 + (cfg.shin * Math.PI) / 180;
  const ankle = [knee[0] + Math.sin(a2) * 20, knee[1] + Math.cos(a2) * 20 - cfg.lift];
  limb(g, [hx, hy], knee, 6, 4.6, ramp, { outline: IRON[0], mid: ramp[2], light: ramp[3], dark: ramp[1] });
  ring(g, knee[0], knee[1], 3.6, ramp, { mid: ramp[2], light: ramp[4] });
  // poleyn spike
  limb(g, [knee[0] + 1, knee[1] - 2], [knee[0] + 4.5, knee[1] - 5], 1.4, 0.5, ramp, { outline: IRON[0], mid: ramp[3], bevel: false });
  limb(g, [knee[0], knee[1]], [ankle[0], ankle[1]], 3.8, 2.6, ramp, { outline: IRON[0], mid: ramp[2], light: ramp[3], dark: ramp[1] });
  // greave ridge
  line(g, ankle[0] - 1, ankle[1] - 4, ankle[0] + 1, ankle[1] - 10, ramp[4]);
  // sabaton
  paint(g, [[ankle[0] - 3, ankle[1] - 1], [ankle[0] + 3, ankle[1] - 1], [ankle[0] + 6, ankle[1] + 3], [ankle[0] + 6, ankle[1] + 6], [ankle[0] - 3, ankle[1] + 6]], ramp, { outline: IRON[0], mid: ramp[2], light: ramp[4], dark: ramp[1] });
  limb(g, [ankle[0] + 5, ankle[1] + 4], [ankle[0] + 9, ankle[1] + 3], 0.9, 0.5, ramp, { outline: IRON[0], mid: ramp[3], bevel: false });
  put(g, Math.round(ankle[0] + 1), Math.round(ankle[1] + 2), GOLD[3]);
}

function bossArm(g, sx, sy, hand, ramp, thick = 4.6) {
  const dx = hand[0] - sx, dy = hand[1] - sy;
  const elbow = [sx + dx * 0.52 - Math.abs(dy) * 0.12, sy + dy * 0.52 - 3];
  limb(g, [sx, sy], elbow, thick, thick * 0.8, ramp, { outline: IRON[0], mid: ramp[2], light: ramp[3], dark: ramp[1] });
  limb(g, elbow, hand, thick * 0.8, thick * 0.6, ramp, { outline: IRON[0], mid: ramp[2], light: ramp[3], dark: ramp[1] });
  ring(g, elbow[0], elbow[1], 2.8, ramp, { mid: ramp[2], light: ramp[3] });
  // gauntlet
  paint(g, [[hand[0] - 3, hand[1] - 3], [hand[0] + 3, hand[1] - 3], [hand[0] + 4, hand[1] + 2], [hand[0] + 1, hand[1] + 5], [hand[0] - 3, hand[1] + 4]], ramp, { outline: IRON[0], mid: ramp[3], light: ramp[4], dark: ramp[1] });
  return elbow;
}

function greaves(g, p, hx, hy) {
  // chain skirt
  const skirt = [[hx - 11, hy + 2], [hx + 11, hy + 2], [hx + 13, hy + 15], [hx + 8, hy + 18], [hx + 4, hy + 14], [hx, hy + 18], [hx - 4, hy + 14], [hx - 8, hy + 18], [hx - 13, hy + 15]].map(([x, y]) => [x, y]);
  paint(g, skirt, IRON, { outline: IRON[0], mid: IRON[1], light: IRON[3], dark: IRON[0] });
  for (let i = -2; i <= 2; i++) for (let y = 6; y < 15; y += 3) put(g, hx + i * 4 + ((y / 3) % 2 ? 1 : 0), hy + y, IRON[2]);
  put(g, hx - 9, hy + 5, IRON[4]); put(g, hx + 8, hy + 5, IRON[4]);
}

function bossTorso(g, p, hx, hy) {
  const body = [
    [hx - 8, hy + 2], [hx - 11, hy - 6], [hx - 13, hy - 20], [hx - 12, hy - 30], [hx - 7, hy - 36],
    [hx, hy - 38], [hx + 7, hy - 36], [hx + 12, hy - 30], [hx + 13, hy - 19], [hx + 11, hy - 5], [hx + 7, hy + 3], [hx, hy + 5],
  ];
  const m = paint(g, body, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1], hi: IRON[4] });
  // abdominal plates
  for (const yy of [-8, -14, -20]) lineMasked(g, m.mask, hx - 9, hy + yy, hx + 9, hy + yy, IRON[1]);
  for (const yy of [-7, -13, -19]) lineMasked(g, m.mask, hx - 8, hy + yy, hx + 8, hy + yy, IRON[4]);
  // central ridge
  lineMasked(g, m.mask, hx, hy - 34, hx, hy + 1, IRON[4]);
  // collar / gorget
  paint(g, [[hx - 9, hy - 35], [hx + 9, hy - 35], [hx + 7, hy - 30], [hx, hy - 29], [hx - 7, hy - 30]], IRON, { outline: IRON[0], mid: IRON[3], light: IRON[4], dark: IRON[1] });
  // ember cracks in the breastplate
  line(g, hx - 6, hy - 26, hx - 4, hy - 22, EMBER[2]);
  line(g, hx - 4, hy - 22, hx - 6, hy - 19, EMBER[1]);
  line(g, hx + 5, hy - 16, hx + 7, hy - 12, EMBER[2]);
  line(g, hx + 7, hy - 12, hx + 5, hy - 9, EMBER[1]);
  // belt + skull buckle
  paint(g, [[hx - 11, hy - 1], [hx + 11, hy - 2], [hx + 11, hy + 3], [hx - 11, hy + 4]], LEATHER, { outline: LEATHER[0], mid: LEATHER[2], light: LEATHER[3], dark: LEATHER[1] });
  paint(g, ellipsePts(hx, hy + 1, 3.4, 2.6, 10), PAL.bone, { outline: PAL.bone[0], mid: PAL.bone[3], light: PAL.bone[4], dark: PAL.bone[2] });
  put(g, Math.round(hx - 1), Math.round(hy + 1), INK);
  put(g, Math.round(hx + 1), Math.round(hy + 1), INK);
  // rivets
  for (const [rx, ry] of [[-9, -32], [9, -32], [-10, -22], [10, -22], [-9, -10], [9, -10]]) put(g, Math.round(hx + rx), Math.round(hy + ry), GOLD[3]);
}

function pauldron(g, sx, sy, side, ramp) {
  // layered plates, spikes outward
  for (let i = 0; i < 3; i++) {
    const yy = sy - i * 4, w = 9 - i * 1.6;
    paint(g, [[sx - w, yy - 2], [sx + side * 2, yy - 3], [sx + side * (w + 3), yy], [sx + side * (w + 1), yy + 4], [sx - w * 0.6, yy + 3]], ramp,
      { outline: IRON[0], mid: ramp[2], light: ramp[3], dark: ramp[1] });
    put(g, Math.round(sx + side * (w + 1)), Math.round(yy + 1), GOLD[3]);
  }
  // spikes
  limb(g, [sx + side * 6, sy - 6], [sx + side * 10, sy - 13], 1.6, 0.5, ramp, { outline: IRON[0], mid: ramp[3], light: ramp[4], bevel: false });
  limb(g, [sx + side * 2, sy - 8], [sx + side * 4, sy - 15], 1.3, 0.4, ramp, { outline: IRON[0], mid: ramp[3], bevel: false });
  put(g, Math.round(sx + side * 10), Math.round(sy - 14), EMBER[3]);
}

function helm(g, p, hx, hy, headX, headY) {
  const tilt = p.headTilt;
  const cx = headX, cy = headY;
  // neck guard
  paint(g, [[cx - 7, cy + 8], [cx + 7, cy + 8], [cx + 5, cy + 13], [cx - 5, cy + 13]], IRON, { outline: IRON[0], mid: IRON[2], dark: IRON[1] });
  // skull-like great helm
  const face = [
    [cx - 8, cy - 3], [cx - 7, cy - 10], [cx - 3, cy - 14], [cx + 3, cy - 14], [cx + 7, cy - 10],
    [cx + 8, cy - 3], [cx + 6, cy + 6], [cx + 2, cy + 9], [cx - 2, cy + 9], [cx - 6, cy + 6],
  ];
  const m = paint(g, face, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1], hi: IRON[4] });
  // crown brow band
  paint(g, [[cx - 9, cy - 8], [cx + 9, cy - 8], [cx + 8, cy - 4], [cx - 8, cy - 4]], GOLD, { outline: GOLD[0], mid: GOLD[2], light: GOLD[3], dark: GOLD[1] });
  for (let i = -2; i <= 2; i++) put(g, cx + i * 3, cy - 6, GOLD[0]);
  // visor slit with ember gaze
  rect(g, cx - 6, cy - 1, 12, 3, "#07060a");
  rect(g, cx - 2, cy, 4, 1, p.ember > 1.4 ? EMBER[5] : EMBER[4]);
  put(g, cx - 4, cy + 1, EMBER[3]); put(g, cx + 3, cy + 1, EMBER[3]);
  if (p.ember > 1.4) { put(g, cx - 1, cy - 1, EMBER[3]); put(g, cx + 1, cy - 1, EMBER[2]); }
  // breathing slits
  for (let i = -1; i <= 1; i++) rect(g, cx + i * 2 - 1, cy + 4, 1, 3, "#0a090f");
  // nasal ridge
  rect(g, cx - 1, cy - 4, 2, 4, IRON[4]);
  // cheek rivets
  put(g, cx - 6, cy + 3, GOLD[3]); put(g, cx + 5, cy + 3, GOLD[3]);
  // crown spikes / horns
  for (const s of [-1, 1]) {
    limb(g, [cx + s * 6, cy - 10], [cx + s * 10.5, cy - 16], 2.9, 1.8, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[4], dark: IRON[1] });
    limb(g, [cx + s * 10.5, cy - 16], [cx + s * 13, cy - 22], 1.6, 0.5, IRON, { outline: IRON[0], mid: IRON[3], light: IRON[4], bevel: false });
    put(g, Math.round(cx + s * 13), Math.round(cy - 22), EMBER[4]);
    put(g, Math.round(cx + s * 8), Math.round(cy - 13), GOLD[3]);
  }
  // central crown spike
  limb(g, [cx, cy - 13], [cx, cy - 20], 2.2, 0.6, IRON, { outline: IRON[0], mid: IRON[3], light: IRON[4], bevel: false });
  put(g, cx, cy - 20, EMBER[3]);
  // helm shadow under brow
  lineMasked(g, m.mask, cx - 7, cy + 2, cx + 7, cy + 2, IRON[0]);
}

// hand here is absolute; helper draws sword
function drawSwordAt(g, hx, hy, ux, uy, px, py, ember) {
  // guard sits ahead of the gauntlet so the fist reads on the grip
  const guard = [hx + ux * 6, hy + uy * 6];
  // grip exposed outside the fist, front and back
  limb(g, [hx - ux * 3.4, hy - uy * 3.4], [hx - ux * 9.6, hy - uy * 9.6], 1.8, 1.5, LEATHER, { outline: LEATHER[0], mid: LEATHER[2], light: LEATHER[3], dark: LEATHER[1] });
  limb(g, [hx + ux * 3.6, hy + uy * 3.6], [hx + ux * 5.2, hy + uy * 5.2], 1.6, 1.4, LEATHER, { outline: LEATHER[0] });
  for (let i = 0; i < 4; i++) put(g, Math.round(hx - ux * (4.4 + i * 1.4) + px * 0.6), Math.round(hy - uy * (4.4 + i * 1.4) + py * 0.6), LEATHER[4]);
  put(g, Math.round(hx + ux * 4.1 + px * 1.2), Math.round(hy + uy * 4.1 + py * 1.2), LEATHER[4]);
  put(g, Math.round(hx + ux * 4.9 - px * 1.0), Math.round(hy + uy * 4.9 - py * 1.0), LEATHER[3]);
  // pommel skull
  ring(g, hx - ux * 10.6, hy - uy * 10.6, 2.2, PAL.bone, { mid: PAL.bone[3], light: PAL.bone[4] });
  put(g, Math.round(hx - ux * 10.6 - px), Math.round(hy - uy * 10.6 - py), INK);
  put(g, Math.round(hx - ux * 10.6 + px), Math.round(hy - uy * 10.6 + py), INK);
  // crossguard, gold, wide
  limb(g, [guard[0] + px * 8, guard[1] + py * 8], [guard[0] - px * 8, guard[1] - py * 8], 2, 2, GOLD, { outline: GOLD[0], mid: GOLD[2], light: GOLD[3], dark: GOLD[1] });
  for (const s of [-1, 1]) {
    limb(g, [guard[0] + px * s * 8, guard[1] + py * s * 8], [guard[0] + px * s * 11 - ux * 2, guard[1] + py * s * 11 - uy * 2], 1.2, 0.6, GOLD, { outline: GOLD[0], mid: GOLD[3], bevel: false });
  }
  // broad cleaver blade
  const base = [guard[0], guard[1]];
  const tip = [hx + ux * 42, hy + uy * 42];
  const pts = [
    [base[0] + px * 5.2, base[1] + py * 5.2],
    [hx + ux * 24 + px * 5.2, hy + uy * 24 + py * 5.2],
    [hx + ux * 34 + px * 4.2, hy + uy * 34 + py * 4.2],
    [tip[0] + px * 1.4, tip[1] + py * 1.4],
    [tip[0], tip[1]],
    [hx + ux * 33 - px * 3.6, hy + uy * 33 - py * 3.6],
    [hx + ux * 22 - px * 4.4, hy + uy * 22 - py * 4.4],
    [base[0] - px * 4.4, base[1] - py * 4.4],
  ];
  const m = paint(g, pts, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  lineMasked(g, m.mask, base[0] + px * 2.4, base[1] + py * 2.4, tip[0] - ux * 5 + px * 1, tip[1] - uy * 5 + py * 1, IRON[5]);
  lineMasked(g, m.mask, base[0] - px * 3, base[1] - py * 3, hx + ux * 34 - px * 2.6, hy + uy * 34 - py * 2.6, IRON[0]);
  // glowing fuller runes
  lineMasked(g, m.mask, base[0] + ux * 2, base[1] + uy * 2, hx + ux * 32, hy + uy * 32, EMBER[1]);
  lineMasked(g, m.mask, base[0] + ux * 3, base[1] + uy * 3, hx + ux * 22, hy + uy * 22, EMBER[3]);
  if (ember > 1.3) {
    put(g, Math.round(hx + ux * 26), Math.round(hy + uy * 26), EMBER[5]);
    put(g, Math.round(hx + ux * 19 + px * 2), Math.round(hy + uy * 19 + py * 2), EMBER[4]);
  }
  // rust / nicks
  put(g, Math.round(hx + ux * 16 + px * 4), Math.round(hy + uy * 16 + py * 4), IRON[0]);
  put(g, Math.round(hx + ux * 29 - px * 3), Math.round(hy + uy * 29 - py * 3), IRON[0]);
}

function towerShield(g, handX, handY, angle, ember) {
  const cx = handX - 2, cy = handY - 20;
  const local = [
    [-11, -14], [-9, -20], [-4, -23], [4, -23], [9, -20], [11, -14], [11, 6], [8, 14], [3, 20], [0, 23],
    [-3, 20], [-8, 14], [-11, 6],
  ];
  const pts = shift(rotPt(local, 0, 0, angle), cx, cy);
  paint(g, pts, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  // inner field
  const fieldPts = shift(rotPt(local.map(([x, y]) => [x * 0.78, y * 0.8]), 0, 0, angle), cx, cy + 1);
  paint(g, fieldPts, ["#0e1420", "#141c2b", "#1d2b3e", "#2b4058"], { outline: "#0a0e16", mid: "#141c2b", light: "#243a50", dark: "#101724" });
  // gold trim rivets
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lx = Math.cos(a) * 8, ly = Math.sin(a) * 17;
    const rp = rotPt([[lx, ly]], 0, 0, angle)[0];
    put(g, Math.round(cx + rp[0]), Math.round(cy + rp[1]), GOLD[3]);
  }
  // burning eye sigil
  const eyePts = shift(rotPt([[-7, 0], [0, -4], [7, 0], [0, 4]], 0, 0, angle), cx, cy - 1);
  paint(g, eyePts, EMBER, { outline: EMBER[0], mid: EMBER[2], light: EMBER[4], dark: EMBER[1] });
  const pupil = rotPt([[0, 0]], 0, 0, angle)[0];
  line(g, cx + pupil[0], cy - 3, cx + pupil[0], cy + 1, INK);
  put(g, Math.round(cx + pupil[0]), Math.round(cy - 2 + pupil[1]), EMBER[5]);
  put(g, Math.round(cx + pupil[0] - 2), Math.round(cy - 1 + pupil[1]), EMBER[4]);
  put(g, Math.round(cx + pupil[0] + 2), Math.round(cy - 1 + pupil[1]), EMBER[4]);
  // dents
  put(g, Math.round(cx - 6), Math.round(cy + 10), IRON[4]);
  put(g, Math.round(cx + 5), Math.round(cy + 14), IRON[1]);
}

function dust(g, p, hx, hy) {
  if (p.dust <= 0) return;
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = hx + side * (8 + (i * 5) % 34), y = hy + 44 + (i % 3) * 2;
    put(g, Math.round(x), Math.round(y), i % 3 ? "#4a4450" : "#5c5564");
  }
  for (let i = 0; i < 8; i++) {
    const x = hx - 18 + (i * 7) % 38, y = hy + 38 - (i % 4) * 3;
    put(g, Math.round(x), Math.round(y), "#39343f");
  }
}

function drawWarden(g, p) {
  const hx = BX + p.lean, hy = BY - 46 + p.bob;
  // ground shadow
  for (let i = 0; i < 40; i++) {
    const x = BX - 22 + (i % 20) * 2.2, y = BY - 1 + Math.floor(i / 20) * 2;
    put(g, Math.round(x), y, "#0b0a0f");
  }
  drawCape(g, p, hx, hy);
  // back leg
  bossLeg(g, hx - 6, hy, p.legB, true);
  // back arm behind torso
  const backArmRamp = SD(IRON, -0.28);
  const backHand = [hx + p.shieldHand[0], hy + p.shieldHand[1]];
  bossArm(g, hx - 11, hy - 30, backHand, backArmRamp, 4.2);
  // skirt + torso
  greaves(g, p, hx, hy);
  bossTorso(g, p, hx, hy);
  // front leg
  bossLeg(g, hx + 5, hy, p.legF, false);
  // shield arm (screen left, front)
  const shieldHand = [hx + p.shieldHand[0], hy + p.shieldHand[1]];
  bossArm(g, hx - 12, hy - 31, shieldHand, IRON, 5);
  towerShield(g, shieldHand[0], shieldHand[1], p.shieldAngle, p.ember);
  // sword arm + blade
  const hand = [hx + p.hand[0], hy + p.hand[1]];
  bossArm(g, hx + 12, hy - 31, hand, IRON, 5);
  const sa = (p.swordAngle * Math.PI) / 180;
  drawSwordAt(g, hand[0], hand[1], Math.sin(sa), -Math.cos(sa), Math.cos(sa), Math.sin(sa), p.ember);
  // pauldrons
  pauldron(g, hx - 13, hy - 31, -1, IRON);
  pauldron(g, hx + 13, hy - 31, 1, IRON);
  // helm
  helm(g, p, hx, hy, hx + p.headTilt * 0.6, hy - 43);
  // dust
  dust(g, p, hx, hy);
  outlineUnion(g, INK, false);
}

/* ------------------------------ animations ------------------------------ */
function wardenIdle(i) {
  const ph = (i / 6) * Math.PI * 2;
  return bpose({
    bob: Math.sin(ph) * 0.7,
    capeSway: Math.sin(ph) * 1.6,
    capeLift: Math.sin(ph + 1) * 1.2,
    headTilt: Math.sin(ph + 0.6) * 1.2,
    ember: 1 + Math.sin(ph * 2) * 0.12,
    hand: [21 + Math.sin(ph) * 0.4, -1],
    shieldHand: [-20, 4 + Math.sin(ph + 2) * 0.4],
  });
}
const WALK = [
  { f: 16, b: -12, fs: -4, bs: 4, bob: -1, sway: 1.4, hand: 1 },
  { f: 8, b: -6, fs: -2, bs: 2, bob: 1, sway: 0.4, hand: 0 },
  { f: -4, b: 4, fs: 3, bs: -2, bob: -1, sway: -0.6, hand: -0.4 },
  { f: -14, b: 12, fs: 5, bs: -4, bob: 0.5, sway: -1.4, hand: -0.8 },
  { f: -6, b: 5, fs: 2, bs: -1, bob: -1, sway: -0.4, hand: -0.2 },
  { f: 6, b: -5, fs: -2, bs: 3, bob: 0, sway: 0.8, hand: 0.4 },
];
function wardenWalk(i) {
  const k = WALK[i % 6];
  return bpose({
    legF: { thigh: k.f, shin: k.fs, lift: Math.max(0, k.f < 0 ? 3 : 0) },
    legB: { thigh: k.b, shin: k.bs, lift: Math.max(0, k.b < 0 ? 2 : 0) },
    bob: k.bob, lean: 1,
    capeSway: k.sway, capeLift: 1,
    headTilt: k.sway * 0.4,
    hand: [21 + k.hand, -1], swordAngle: 138 + k.sway * 2,
    shieldHand: [-20 - k.sway * 0.4, 4], shieldAngle: k.sway * -1.5,
    ember: 1.05,
  });
}
const CLEAVE = [
  [0, bpose({})],
  [0.35, bpose({ hand: [2, -44], swordAngle: -42, lean: -2, headTilt: -2, capeSway: 3, capeLift: 2, legF: { thigh: 18, shin: -2 }, legB: { thigh: -18, shin: 10 }, ember: 1.25 })],
  [0.52, bpose({ hand: [31, 2], swordAngle: 92, lean: 4, headTilt: 3, capeSway: -3, capeLift: 1, legF: { thigh: 26, shin: -14 }, legB: { thigh: -26, shin: 18 }, dust: 1, ember: 1.5 })],
  [0.7, bpose({ hand: [27, 12], swordAngle: 138, lean: 2, headTilt: 1, capeSway: -1, legF: { thigh: 20, shin: -8 }, legB: { thigh: -20, shin: 12 }, dust: 0.6 })],
  [1, bpose({})],
];
const SLAM = [
  [0, bpose({})],
  [0.32, bpose({ hand: [10, -38], swordAngle: 6, lean: -1, headTilt: -3, capeSway: 2, capeLift: 3, ember: 1.4, legF: { thigh: 10, shin: -4 }, legB: { thigh: -10, shin: 6 } })],
  [0.5, bpose({ hand: [4, -46], swordAngle: -8, lean: -3, headTilt: -4, capeSway: 1, capeLift: 4, ember: 1.9, legF: { thigh: 14, shin: -6 }, legB: { thigh: -14, shin: 8 } })],
  [0.62, bpose({ hand: [18, 5], swordAngle: 176, lean: 3, headTilt: 4, bob: 5, capeSway: -2, capeLift: 2, dust: 1.4, ember: 1.6, legF: { thigh: 24, shin: -12 }, legB: { thigh: -22, shin: 16 } })],
  [0.8, bpose({ hand: [18, 5], swordAngle: 176, lean: 3, headTilt: 3, bob: 5, capeSway: -1, capeLift: 1, dust: 0.7, ember: 1.2, legF: { thigh: 24, shin: -12 }, legB: { thigh: -22, shin: 16 } })],
  [1, bpose({})],
];
const HURT = [
  [0, bpose({})],
  [0.4, bpose({ lean: -4, headTilt: -5, bob: 1, capeSway: 3, ember: 1.5, hand: [18, 9], swordAngle: 160, shieldHand: [-22, 7] })],
  [1, bpose({ lean: -1, headTilt: -1, ember: 1.15 })],
];

function wardenPile(g) {
  const cx = BX, gy = BY - 2;
  // heap of plates
  paint(g, [[cx - 26, gy], [cx - 20, gy - 8], [cx - 8, gy - 11], [cx + 6, gy - 9], [cx + 20, gy - 4], [cx + 25, gy + 2], [cx + 10, gy + 4], [cx - 5, gy + 3], [-18 + cx, gy + 2]], DARKIRON, { outline: DARKIRON[0], mid: DARKIRON[2], light: DARKIRON[3], dark: DARKIRON[1] });
  // fallen shield
  const sh = shift(rotPt([[-10, -15], [8, -18], [12, -6], [10, 8], [2, 14], [-8, 10], [-12, -2]], 0, 0, 72), cx + 18, gy - 2);
  paint(g, sh, IRON, { outline: IRON[0], mid: IRON[2], dark: IRON[1] });
  const eye = shift(rotPt([[-5, 0], [0, -3], [5, 0], [0, 3]], 0, 0, 72), cx + 18, gy - 2);
  paint(g, eye, EMBER, { outline: EMBER[0], mid: EMBER[2], light: EMBER[3] });
  // helm on its side, one horn cracked off
  const hx = cx - 14, hy = gy - 8;
  paint(g, [[hx - 7, hy + 4], [hx - 7, hy - 4], [hx - 2, hy - 9], [hx + 5, hy - 7], [hx + 9, hy - 1], [hx + 8, hy + 5], [hx + 2, hy + 8], [hx - 4, hy + 7]], IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  rect(g, hx - 4, hy, 10, 2, "#07060a");
  put(g, hx - 1, hy + 1, EMBER[2]); put(g, hx + 3, hy + 1, EMBER[2]);
  limb(g, [hx + 6, hy - 3], [hx + 13, hy - 10], 1.4, 0.5, GOLD, { outline: GOLD[0], mid: GOLD[2], bevel: false });
  // greatsword lying across
  const sx = cx - 26, sy = gy + 1;
  limb(g, [sx, sy + 10], [sx + 30, sy - 2], 2.6, 1.6, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  limb(g, [sx + 30, sy - 2], [sx + 38, sy - 5], 1.4, 0.4, IRON, { outline: IRON[0], mid: IRON[2], bevel: false });
  limb(g, [sx - 4, sy + 12], [sx + 1, sy + 10], 1.4, 1.2, GOLD, { outline: GOLD[0], mid: GOLD[2], bevel: false });
  // embers and smoke
  for (let i = 0; i < 12; i++) {
    const x = cx - 20 + (i * 7) % 42, y = gy - 6 - (i * 5) % 26;
    put(g, x, y, i % 3 === 0 ? EMBER[4] : i % 2 ? EMBER[3] : EMBER[1]);
  }
  for (let i = 0; i < 5; i++) put(g, cx - 14 + i * 8, gy - 18 - (i % 3) * 4, "#2b2732");
  outlineUnion(g, INK, false);
}

function wardenFrame(row, i, g) {
  if (row === 5 && i >= 4) { wardenPile(g); return; }
  let p;
  if (row === 0) p = wardenIdle(i);
  else if (row === 1) p = wardenWalk(i);
  else if (row === 2) p = bkey(CLEAVE, i / 5);
  else if (row === 3) p = bkey(SLAM, i / 5);
  else if (row === 4) p = bkey(HURT, i / 5);
  else {
    if (i <= 1) p = bkey(HURT, i / 2);
    else if (i === 2) p = bpose({ bob: 18, lean: 3, headTilt: 5, ember: 1.2, legF: { thigh: 0, shin: 95 }, legB: { thigh: -4, shin: 100 }, hand: [14, 2], swordAngle: 130, shieldHand: [-18, 22], capeSway: 3, capeLift: -3 });
    else p = bpose({ bob: 27, lean: 9, headTilt: 12, ember: 0.8, legF: { thigh: 70, shin: 20 }, legB: { thigh: 55, shin: 30 }, hand: [10, 0], swordAngle: 92, shieldHand: [-16, 8], capeSway: 4, capeLift: -6, dust: 0.8 });
  }
  drawWarden(g, p);
}

await exportSheet({
  name: "warden", w: BW, h: BH, cols: 6, rows: 6, frames: 36,
  draw: (g, i) => wardenFrame(Math.floor(i / 6), i % 6, g),
});
console.log("boss done");
