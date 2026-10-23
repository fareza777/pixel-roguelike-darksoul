// Dungeon enemies: Bonebound Soldier and Gloom Wretch.
import {
  INK, PAL, makeGrid, put, rect, line, lineMasked, ellipsePts, shift, rotPt,
  paint, rasterize, inMask, limb, outlineUnion, exportSheet,
} from "./pixel.mjs";

const RUST = ["#291910", "#4d2a18", "#7c4324", "#a8633a", "#c98d5e"];
const BONE = PAL.bone;
const RAG = ["#1a1c14", "#2d3020", "#454a2e", "#60663d"];
const IRON = ["#1c1d23", "#33363f", "#51555f", "#767b86", "#a3a8b2"];
const ROBE = ["#0d1416", "#182625", "#27403b", "#3b5a50", "#587a69"];
const BGLOW = PAL.green;
const SD = (ramp, k) => ramp.map((c) => {
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  const f = 1 + k;
  const h = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * f)));
  return "#" + [h(r), h(g), h(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
});

/* ============================ SKELETON ============================ */
const SW = 72, SH = 72, SFX = 36, SFY = 64;
const sp = (pts) => pts.map(([x, y]) => [SFX + x, SFY + y]);
const sln = (g, mask, a, b, c) => lineMasked(g, mask, SFX + a[0], SFY + a[1], SFX + b[0], SFY + b[1], c);

const SBASE = {
  bob: 0, hipY: -18, lean: 0, headTilt: 0, jaw: 0,
  legB: { thigh: -14, shin: 8, lift: 0 },
  legF: { thigh: 15, shin: -6, lift: 0 },
  hand: [10, -13.5], swordAngle: 158,
  offHand: [-7, -17], offAng: 0,
  ragSway: 0,
};
function spose(o = {}) {
  return { ...SBASE, ...o, legB: { ...SBASE.legB, ...(o.legB || {}) }, legF: { ...SBASE.legF, ...(o.legF || {}) } };
}
function slerp(a, b, t) {
  const o = {};
  for (const k of ["bob", "hipY", "lean", "headTilt", "jaw", "swordAngle", "ragSway"]) o[k] = a[k] + (b[k] - a[k]) * t;
  o.hand = [a.hand[0] + (b.hand[0] - a.hand[0]) * t, a.hand[1] + (b.hand[1] - a.hand[1]) * t];
  o.offHand = [a.offHand[0] + (b.offHand[0] - a.offHand[0]) * t, a.offHand[1] + (b.offHand[1] - a.offHand[1]) * t];
  o.legB = { thigh: a.legB.thigh + (b.legB.thigh - a.legB.thigh) * t, shin: a.legB.shin + (b.legB.shin - a.legB.shin) * t, lift: a.legB.lift + (b.legB.lift - a.legB.lift) * t };
  o.legF = { thigh: a.legF.thigh + (b.legF.thigh - a.legF.thigh) * t, shin: a.legF.shin + (b.legF.shin - a.legF.shin) * t, lift: a.legF.lift + (b.legF.lift - a.legF.lift) * t };
  return o;
}
function skey(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
    let k = (t - t0) / (t1 - t0); k = k * k * (3 - 2 * k);
    return slerp(p0, p1, k);
  }
  return keys[keys.length - 1][1];
}

function ik(ax, ay, bx, by, l1, l2, bend = 1) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [ax + Math.cos(base - a * bend) * l1, ay + Math.sin(base - a * bend) * l1];
}
function ring(g, x, y, r, ramp, opts = {}) {
  paint(g, ellipsePts(x, y, r, r, 10), ramp, { outline: opts.outline ?? ramp[0], mid: opts.mid ?? ramp[2], light: opts.light ?? ramp[3], dark: opts.dark ?? ramp[1], bevel: opts.bevel });
}

function skull(g, p, hx, hy) {
  // cranium
  const dome = [
    [hx - 4.5, hy + 1], [hx - 4.2, hy - 2.5], [hx - 2, hy - 4.5], [hx + 2, hy - 4.5],
    [hx + 4.2, hy - 2.4], [hx + 4.6, hy + 0.6], [hx + 3.6, hy + 2.4], [hx + 2, hy + 3.4],
    [hx - 2.2, hy + 3.2], [hx - 3.8, hy + 2.2],
  ];
  paint(g, dome, BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2], hi: BONE[5] });
  // cheekbones + jaw (with open amount)
  const jawY = hy + 4 + p.jaw * 1.6;
  const jaw = [
    [hx - 2.4, hy + 3], [hx + 2.6, hy + 3], [hx + 2, jawY + 1.5], [hx - 1.8, jawY + 1.6],
  ];
  paint(g, jaw, BONE, { outline: BONE[0], mid: BONE[2], light: BONE[3], dark: BONE[1] });
  if (p.jaw > 0.15) {
    paint(g, [[hx - 2, hy + 3.6], [hx + 2.2, hy + 3.6], [hx + 1.8, jawY + 0.8], [hx - 1.6, jawY + 0.9]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  }
  // eye sockets
  for (const ex of [-2.6, 1.6]) {
    paint(g, [[hx + ex, hy - 1.6], [hx + ex + 2, hy - 1.9], [hx + ex + 2.1, hy + 0.4], [hx + ex - 0.1, hy + 0.5]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
    put(g, Math.round(hx + ex + 1.1), Math.round(hy - 0.8), BGLOW[4]);
    put(g, Math.round(hx + ex + 0.8), Math.round(hy - 0.2), BGLOW[2]);
  }
  // nose + teeth
  put(g, Math.round(hx + 0.4), Math.round(hy + 1.4), INK);
  for (let i = 0; i < 3; i++) put(g, Math.round(hx - 1.2 + i * 1.3), Math.round(hy + 3.6), BONE[1]);
  // cracks
  lineMasked(g, rasterize(g, dome), hx - 2.4, hy - 3.8, hx - 1.6, hy - 1.2, BONE[2]);
  lineMasked(g, rasterize(g, dome), hx - 1.6, hy - 1.2, hx - 2.4, hy - 0.4, BONE[2]);
  // cheek ridges catch the light below the sockets
  line(g, hx - 4.3, hy + 1.8, hx - 2.7, hy + 2.7, BONE[4]);
  line(g, hx + 2.2, hy + 2.5, hx + 3.9, hy + 1.6, BONE[3]);
  // rusty kettle helm, raised to show the skull below the brim
  const helm = [
    [hx - 6.2, hy - 2.7], [hx - 5.2, hy - 6.1], [hx - 1.6, hy - 7.4], [hx + 3, hy - 7],
    [hx + 5.6, hy - 4.8], [hx + 6.4, hy - 2.3], [hx + 4.6, hy - 2.6], [hx - 4.8, hy - 2.9],
  ];
  const hm = paint(g, helm, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  line(g, hx - 5.8, hy - 2.5, hx + 5.8, hy - 2.2, IRON[0]);
  // nasal guard
  paint(g, [[hx + 0.2, hy - 2.6], [hx + 1.8, hy - 2.5], [hx + 1.2, hy + 2.4], [hx - 0.4, hy + 2.3]], RUST, { outline: RUST[0], mid: RUST[2], light: RUST[3], dark: RUST[1] });
  // dents + rivets
  put(g, Math.round(hx - 3), Math.round(hy - 5.2), IRON[1]);
  put(g, Math.round(hx - 2.2), Math.round(hy - 5.6), IRON[4]);
  put(g, Math.round(hx - 4.2), Math.round(hy - 3.4), RUST[3]);
  put(g, Math.round(hx + 4.2), Math.round(hy - 3.5), RUST[2]);
  put(g, Math.round(hx + 3.4), Math.round(hy - 6), IRON[4]);
  // hanging cheek rag
  paint(g, [[hx - 5.4, hy - 2], [hx - 3.4, hy - 2.2], [hx - 3.8, hy + 1.6], [hx - 4.8, hy + 2.8]], RAG, { outline: RAG[0], mid: RAG[1], bevel: false });
}

function ribs(g, p, hx, hy) {
  // spine
  limb(g, [hx, hy - 8], [hx, hy + 6], 1.2, 1.1, BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  const cavity = [
    [hx - 4.6, hy - 6.4], [hx + 4.2, hy - 6.6], [hx + 5, hy - 2], [hx + 3.6, hy + 4],
    [hx, hy + 6], [hx - 3.6, hy + 3.4], [hx - 5, hy - 2],
  ];
  paint(g, cavity, [INK, "#251d1b", "#30241f", "#1c1717"], { outline: BONE[1], mid: "#2b211d", light: "#3a2b23", dark: "#1b1514" });
  // ribs, 4 levels, drawn as arcs
  for (let i = 0; i < 4; i++) {
    const y = hy - 5.2 + i * 2.6;
    const spread = 4.4 - i * 0.35;
    for (const s of [-1, 1]) {
      const pts = [
        [hx + s * 0.8, y],
        [hx + s * spread * 0.8, y + 0.7],
        [hx + s * spread, y + 2],
        [hx + s * (spread - 0.5), y + 3.4],
      ];
      for (let j = 0; j < pts.length - 1; j++) line(g, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], BONE[3]);
    }
  }
  // sternum + clavicles
  paint(g, [[hx - 0.8, hy - 6], [hx + 1, hy - 6], [hx + 0.8, hy - 1], [hx - 0.6, hy - 1]], BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  limb(g, [hx - 5, hy - 7], [hx + 5, hy - 7.2], 0.8, 0.8, BONE, { outline: BONE[0], mid: BONE[3], bevel: false });
}

function ragSkirt(g, p, hx, hy) {
  const sway = p.ragSway;
  const strips = [
    [[hx - 4.6, hy], [hx - 3.4, hy], [hx - 4 + sway * 0.3, hy + 7], [hx - 5.2 + sway * 0.3, hy + 6]],
    [[hx - 2.4, hy], [hx - 0.8, hy], [hx - 1.4 + sway * 0.4, hy + 8.4], [hx - 2.8 + sway * 0.4, hy + 6.8]],
    [[hx + 0.6, hy], [hx + 2, hy], [hx + 1.8 + sway * 0.5, hy + 7.4], [hx + 0.4 + sway * 0.5, hy + 6.4]],
    [[hx + 2.8, hy], [hx + 4.2, hy], [hx + 4.4 + sway * 0.6, hy + 5.4], [hx + 3.2 + sway * 0.6, hy + 4.6]],
  ];
  for (const s of strips) paint(g, s, RAG, { outline: RAG[0], mid: RAG[2], light: RAG[3], dark: RAG[1] });
}

function boneLeg(g, hx, hy, cfg, dark = false) {
  const ramp = dark ? SD(BONE, -0.25) : BONE;
  const a1 = (cfg.thigh * Math.PI) / 180;
  const knee = [hx + Math.sin(a1) * 8, hy + Math.cos(a1) * 8];
  const a2 = a1 + (cfg.shin * Math.PI) / 180;
  const ankle = [knee[0] + Math.sin(a2) * 7.5, knee[1] + Math.cos(a2) * 7.5 - cfg.lift];
  limb(g, [hx, hy], knee, 1.6, 1.3, ramp, { outline: BONE[0], mid: ramp[3], light: ramp[4], dark: ramp[2] });
  ring(g, knee[0], knee[1], 1.7, ramp, { mid: ramp[3], light: ramp[4] });
  limb(g, [knee[0], knee[1]], [ankle[0], ankle[1]], 1.3, 1.1, ramp, { outline: BONE[0], mid: ramp[3], light: ramp[4], dark: ramp[2] });
  // bony foot claws
  const fx = ankle[0], fy = ankle[1];
  for (let i = 0; i < 3; i++) {
    limb(g, [fx, fy], [fx + 2.6 + i * 1.1, fy + 2 - i * 0.4], 0.9, 0.6, ramp, { outline: BONE[0], mid: ramp[3], bevel: false });
  }
}

function boneArm(g, sx, sy, hand, dark = false) {
  const ramp = dark ? SD(BONE, -0.22) : BONE;
  const elbow = ik(sx, sy, hand[0], hand[1], 7, 6.5, 1);
  limb(g, [sx, sy], elbow, 1.5, 1.1, ramp, { outline: BONE[0], mid: ramp[3], light: ramp[4], dark: ramp[2] });
  ring(g, elbow[0], elbow[1], 1.6, ramp, { mid: ramp[3], light: ramp[4] });
  limb(g, elbow, hand, 1.1, 0.9, ramp, { outline: BONE[0], mid: ramp[3], light: ramp[4], dark: ramp[2] });
  for (let i = 0; i < 3; i++) {
    limb(g, hand, [hand[0] + 1.8 + i * 0.7, hand[1] + 1.6 - i * 0.5], 0.5, 0.4, ramp, { outline: BONE[0], mid: ramp[3], bevel: false });
  }
  return elbow;
}

function rustySword(g, hand, angle) {
  const a = (angle * Math.PI) / 180;
  const ux = Math.sin(a), uy = -Math.cos(a);
  const px = -uy, py = ux;
  const hx = SFX + hand[0], hy = SFY + hand[1];
  // leather grip + wraps
  limb(g, [hx - ux * 2.4, hy - uy * 2.4], [hx - ux * 6, hy - uy * 6], 1.2, 1, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], light: PAL.leather[3], dark: PAL.leather[1] });
  for (let i = 0; i < 3; i++) put(g, Math.round(hx - ux * (3 + i * 1.1) + px * 0.4), Math.round(hy - uy * (3 + i * 1.1) + py * 0.4), PAL.leather[4]);
  // crossguard with curled quillons
  limb(g, [hx + px * 5.2, hy + py * 5.2], [hx - px * 5.2, hy - py * 5.2], 1.2, 1.2, RUST, { outline: RUST[0], mid: RUST[2], light: RUST[3], dark: RUST[1] });
  put(g, Math.round(hx + px * 5.6 + ux), Math.round(hy + py * 5.6 + uy), RUST[3]);
  put(g, Math.round(hx - px * 5.6 - ux), Math.round(hy - py * 5.6 - uy), RUST[3]);
  // straight steel blade, slightly tapered
  const base = [hx + ux * 2, hy + uy * 2];
  const tip = [hx + ux * 21, hy + uy * 21];
  const pts = [
    [base[0] + px * 2.1, base[1] + py * 2.1],
    [hx + ux * 15 + px * 1.5, hy + uy * 15 + py * 1.5],
    [tip[0], tip[1]],
    [hx + ux * 15 - px * 1.4, hy + uy * 15 - py * 1.4],
    [base[0] - px * 2.1, base[1] - py * 2.1],
  ];
  const m = paint(g, pts, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  lineMasked(g, m.mask, base[0] + px * 0.9, base[1] + py * 0.9, tip[0] - ux * 3.4 + px * 0.5, tip[1] - uy * 3.4 + py * 0.5, IRON[4]);
  // rust blotches + nicks
  for (const [d, side] of [[7, 1.2], [11, -1.1], [16, 0.9]]) {
    put(g, Math.round(hx + ux * d + px * side), Math.round(hy + uy * d + py * side), RUST[2]);
    put(g, Math.round(hx + ux * (d + 1.2) + px * side), Math.round(hy + uy * (d + 1.2) + py * side), RUST[1]);
  }
  put(g, Math.round(hx + ux * 18 + px * 1.6), Math.round(hy + uy * 18 + py * 1.6), IRON[0]);
  // pommel
  ring(g, hx - ux * 6.6, hy - uy * 6.6, 1.4, RUST);
}

function drawSkeleton(g, p) {
  const hx = SFX + p.lean, hy = SFY + p.hipY + p.bob;
  ragSkirt(g, p, hx + 0.4, hy - 1);
  // back leg / arm
  boneLeg(g, hx - 2.6, hy, p.legB, true);
  boneArm(g, hx - 5, hy - 12, [hx - 9 + p.ragSway * 0.3, hy - 1], true);
  // pelvis
  paint(g, sp([[hx - 4.4 - SFX, hy - 1 - SFY], [hx + 4 - SFX, hy - 1.4 - SFY], [hx + 3 - SFX, hy + 2.8 - SFY], [hx + 1 - SFX, hy + 3.6 - SFY], [hx - 2.4 - SFX, hy + 3.4 - SFY], [hx - 4.2 - SFX, hy + 1 - SFY]]), BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  put(g, Math.round(hx - 2.6), Math.round(hy + 1.8), INK);
  put(g, Math.round(hx + 2), Math.round(hy + 1.6), INK);
  // front leg
  boneLeg(g, hx + 2.2, hy, p.legF, false);
  // ribcage + spine
  ribs(g, p, hx, hy - 13);
  // tattered shoulder rag
  paint(g, [[hx + 2.4, hy - 20], [hx + 7, hy - 19], [hx + 6.6, hy - 14], [hx + 2.8, hy - 15.5]], RAG, { outline: RAG[0], mid: RAG[2], light: RAG[3], dark: RAG[1] });
  // front sword arm
  const sh = [hx + 4.6, hy - 18.5];
  const hand = [hx + p.hand[0], hy + p.hand[1]];
  boneArm(g, sh[0], sh[1], hand, false);
  rustySword(g, [p.lean + p.hand[0], p.hipY + p.bob + p.hand[1]], p.swordAngle);
  // layered iron pauldron over the joint
  const pd = [
    [hx + 1.4, hy - 21.4], [hx + 5.6, hy - 21.6], [hx + 7.6, hy - 18.4], [hx + 6.8, hy - 15.4],
    [hx + 4.6, hy - 14.6], [hx + 1.8, hy - 16], [hx + 0.8, hy - 18.8],
  ];
  paint(g, pd, IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  line(g, hx + 1.8, hy - 18.2, hx + 6.9, hy - 17.8, IRON[1]);
  line(g, hx + 2.2, hy - 19.8, hx + 6.2, hy - 20, IRON[4]);
  put(g, Math.round(hx + 5.8), Math.round(hy - 16.2), IRON[4]);
  put(g, Math.round(hx + 2.4), Math.round(hy - 16.6), RUST[2]);
  put(g, Math.round(hx + 2), Math.round(hy - 17.3), RUST[3]);
  // skull + helm
  const skullX = hx + 0.8 + p.headTilt * 0.4;
  const skullY = hy - 24 + p.bob * 0.2;
  skull(g, p, skullX, skullY);
  // spine-neck connection
  limb(g, [hx, hy - 18], [skullX, skullY + 3], 1.1, 0.9, BONE, { outline: BONE[0], mid: BONE[3], dark: BONE[1], bevel: false });
  outlineUnion(g, INK, false);
}

const SWALK = [
  { f: 18, b: -18, fs: -4, bs: 6, bob: 0, fl: 0, bl: 0, rag: 1 },
  { f: 8, b: -8, fs: -1, bs: 2, bob: -1, fl: 0, bl: 0, rag: 0 },
  { f: -6, b: 6, fs: 4, bs: -2, bob: 0, fl: 1, bl: 0, rag: -1 },
  { f: -18, b: 18, fs: 7, bs: -5, bob: 0, fl: 0, bl: 0, rag: -1 },
  { f: -8, b: 8, fs: 2, bs: -2, bob: -1, fl: 0, bl: 0, rag: 0 },
  { f: 6, b: -6, fs: -2, bs: 4, bob: 0, fl: 0, bl: 1, rag: 1 },
];
function skeletonWalk(i) {
  const k = SWALK[i % 6];
  return spose({
    legF: { thigh: k.f, shin: k.fs, lift: k.fl }, legB: { thigh: k.b, shin: k.bs, lift: k.bl },
    bob: k.bob, hipY: -18 + k.bob * 0.5, headTilt: k.rag * 1.5, jaw: 0.25,
    hand: [9.5 + k.rag * 0.8, -13 - k.bob], swordAngle: 158 + k.rag * 2,
    ragSway: k.rag * 1.6,
  });
}
const SATTACK = [
  [0, spose({ hand: [10, -13.5], swordAngle: 158, jaw: 0.2 })],
  [0.35, spose({ hand: [1, -31], swordAngle: -58, lean: -1, headTilt: -2, jaw: 0.8, legF: { thigh: 20, shin: -4 }, legB: { thigh: -18, shin: 8 }, ragSway: 2 })],
  [0.55, spose({ hand: [14, -21], swordAngle: 96, lean: 1.5, headTilt: 2, jaw: 1, legF: { thigh: 28, shin: -12 }, legB: { thigh: -24, shin: 14 }, ragSway: -2 })],
  [0.72, spose({ hand: [12, -11], swordAngle: 154, lean: 1, headTilt: 1, jaw: 0.6, legF: { thigh: 24, shin: -10 }, legB: { thigh: -20, shin: 12 }, ragSway: -1.5 })],
  [1, spose({ hand: [10, -13.5], swordAngle: 158, jaw: 0.2 })],
];
const SHURT = [
  [0, spose()],
  [0.35, spose({ hand: [6, -16], swordAngle: 168, lean: -3, headTilt: -4, jaw: 1, bob: 1, ragSway: 3 })],
  [1, spose({ hand: [9, -13.5], swordAngle: 160, jaw: 0.4 })],
];

function skeletonPile(g) {
  // collapsed bones on the ground
  const cx = SFX, cy = SFY - 3;
  ring(g, cx - 10, cy, 1.2, BONE);
  limb(g, [cx - 16, cy - 1], [cx - 11, cy + 1], 1.3, 1.1, BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  limb(g, [cx - 12, cy], [cx - 8, cy + 2], 1.2, 1, BONE, { outline: BONE[0], mid: BONE[3], dark: BONE[2] });
  // ribs lying
  for (let i = 0; i < 4; i++) {
    const y = cy + 1 - i * 0.8;
    limb(g, [cx - 6 + i * 0.8, y], [cx + 2 - i * 0.3, y + 1.6], 0.8, 0.8, BONE, { outline: BONE[0], mid: BONE[3], bevel: false });
  }
  // pelvis
  paint(g, ellipsePts(cx + 2, cy + 3, 4, 2.2, 10), BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  // skull tilted
  const skullX = cx + 9, skullY = cy - 1;
  paint(g, ellipsePts(skullX, skullY, 4.3, 3.8, 12), BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
  paint(g, [[skullX - 1.4, skullY - 1], [skullX + 1.8, skullY - 1.2], [skullX + 1.6, skullY + 0.8], [skullX - 1.2, skullY + 0.9]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  put(g, skullX, skullY - 0.2, BGLOW[3]);
  // helm beside
  paint(g, [[skullX - 4, skullY - 4], [skullX + 2, skullY - 5], [skullX + 5, skullY - 2.5], [skullX + 3, skullY - 0.5], [skullX - 3.5, skullY - 1]], IRON, { outline: IRON[0], mid: IRON[2], light: IRON[3], dark: IRON[1] });
  // sword on ground
  limb(g, [cx - 12, cy + 4], [cx + 8, cy + 6], 1.1, 0.9, RUST, { outline: RUST[0], mid: RUST[3], light: RUST[4], dark: RUST[2] });
  limb(g, [cx - 14, cy + 3], [cx - 12, cy + 4.4], 1.1, 1.1, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], dark: PAL.leather[1] });
  // dust
  for (let i = 0; i < 8; i++) put(g, cx - 17 + (i * 5) % 32, cy + 6 - (i % 3), "#39322c");
}

function skeletonFrame(row, i, g) {
  if (row === 3 && i >= 4) { skeletonPile(g); return; }
  let p;
  if (row === 0) p = skeletonWalk(i);
  else if (row === 1) p = skey(SATTACK, i / 5);
  else if (row === 2) p = skey(SHURT, i / 5);
  else {
    if (i <= 2) p = skey(SHURT, i / 2);
    else p = spose({ jaw: 1, bob: 8 - (i - 3) * 2, hipY: -8 - (i - 3) * 2, headTilt: -8, legF: { thigh: 34, shin: 100 }, legB: { thigh: -34, shin: 105 }, hand: [4, -8], swordAngle: 176, ragSway: 2 });
  }
  drawSkeleton(g, p);
}

/* ============================ WRETCH ============================ */
const WW = 80, WH = 84, WFX = 40, WFY = 76;

const WBASE = {
  bob: 0, lean: 0, sway: 0, headTilt: 0, glow: 1,
  staffHand: [13, -40], staffAng: 6, claw: [-15, -32], robeSway: 0,
};
function wpose(o = {}) { return { ...WBASE, ...o }; }
function wlerp(a, b, t) {
  const o = {};
  for (const k of ["bob", "lean", "sway", "headTilt", "glow", "staffAng", "robeSway"]) o[k] = a[k] + (b[k] - a[k]) * t;
  o.staffHand = [a.staffHand[0] + (b.staffHand[0] - a.staffHand[0]) * t, a.staffHand[1] + (b.staffHand[1] - a.staffHand[1]) * t];
  o.claw = [a.claw[0] + (b.claw[0] - a.claw[0]) * t, a.claw[1] + (b.claw[1] - a.claw[1]) * t];
  return o;
}
function wkey(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, p0] = keys[i - 1], [t1, p1] = keys[i];
    let k = (t - t0) / (t1 - t0); k = k * k * (3 - 2 * k);
    return wlerp(p0, p1, k);
  }
  return keys[keys.length - 1][1];
}

function drawWretch(g, p) {
  const cx = WFX + p.lean, fy = WFY + p.bob;
  const sway = p.robeSway;
  const ap = (pts) => pts.map(([x, y]) => [cx + x, fy + y]);

  // trailing robe wisps below the hem
  for (let i = 0; i < 3; i++) {
    const bx = -7 + i * 7;
    paint(g, ap([
      [bx - 2, -11], [bx + 2, -11], [bx + 1.5 + sway * 0.25, -1 + i], [bx - 0.5 + sway * 0.2, i], [bx - 3, -4],
    ]), ROBE, { outline: ROBE[0], mid: ROBE[1], dark: ROBE[0], bevel: false });
  }

  // outer robe
  const robe = ap([
    [-10, -56], [-6, -59], [0, -60], [6, -59], [10, -56], [12, -48], [13, -36], [12, -24],
    [12 + sway * 0.3, -12], [9 + sway * 0.6, -6], [7 + sway * 0.4, -11], [4 + sway * 0.7, -4],
    [1 + sway * 0.5, -9], [-2 + sway * 0.8, -3], [-5 + sway * 0.5, -10], [-8 + sway, -5],
    [-11 + sway * 0.3, -13], [-12, -26], [-13, -38], [-11.5, -48],
  ]);
  const rm = paint(g, robe, ROBE, { outline: ROBE[0], mid: ROBE[2], light: ROBE[3], dark: ROBE[1], hi: ROBE[4] });
  // hollow chest V + narrow central fold
  paint(g, ap([[-6, -51], [6, -51], [2.2, -37], [-2.2, -37]]), [ROBE[0], ROBE[0], ROBE[0], ROBE[0]], { outline: ROBE[0], mid: ROBE[0], bevel: false });
  paint(g, ap([[-1.3, -36], [1.6, -36], [2 + sway * 0.3, -13], [-1.8 + sway * 0.3, -11]]), [ROBE[0], ROBE[0], ROBE[0], ROBE[0]], { outline: ROBE[0], mid: ROBE[0], bevel: false });
  // folds kept inside the robe silhouette
  lineMasked(g, rm.mask, cx - 7, fy - 49, cx - 9 + sway * 0.3, fy - 13, ROBE[1]);
  lineMasked(g, rm.mask, cx + 5, fy - 49, cx + 6 + sway * 0.4, fy - 15, ROBE[3]);
  lineMasked(g, rm.mask, cx - 1, fy - 47, cx + 1, fy - 22, ROBE[3]);
  lineMasked(g, rm.mask, cx + 9, fy - 34, cx + 10, fy - 20, ROBE[1]);

  // shoulder mantle
  const mantle = ap([[-11.5, -54], [-8, -59], [-2, -61], [5, -60], [10.5, -56], [11.5, -52], [6, -53.5], [0, -55], [-5, -53.5], [-9.5, -51]]);
  const mm = paint(g, mantle, SD(ROBE, -0.18), { outline: ROBE[0], mid: ROBE[1], light: ROBE[2], dark: ROBE[0] });
  for (let i = 0; i < 3; i++)
    lineMasked(g, mm.mask, cx - 7 + i * 5, fy - 54, cx - 8 + i * 5, fy - 58, ROBE[0]);

  // rope belt + bone charms
  paint(g, ap([[-10, -34], [10, -35], [10, -32], [-10, -31]]), PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], light: PAL.leather[3], dark: PAL.leather[1] });
  ring(g, cx + 1.5, fy - 33, 1.6, PAL.leather);
  for (let i = 0; i < 3; i++) {
    const bx = cx - 6 + i * 4, by = fy - 32 - (i % 2);
    put(g, Math.round(bx), Math.round(by), PAL.leather[3]);
    limb(g, [bx, by], [bx + 0.5, by + 5.5], 1, 0.7, BONE, { outline: BONE[1], mid: BONE[4], light: BONE[5], dark: BONE[3] });
    put(g, Math.round(bx + 0.5), Math.round(by + 5.7), BONE[4]);
  }

  // hood + void face
  const hx = cx + 1 + p.headTilt * 0.5, hy = fy - 64;
  const hood = [
    [hx - 7.5, hy + 8], [hx - 9, hy + 1.5], [hx - 6.5, hy - 5.5], [hx - 2.5, hy - 10.5],
    [hx + 2, hy - 9.5], [hx + 6.5, hy - 5], [hx + 8.5, hy + 1.5], [hx + 6.5, hy + 7],
    [hx + 2, hy + 9.5], [hx - 3.5, hy + 9],
  ];
  const hm = paint(g, hood, ROBE, { outline: ROBE[0], mid: ROBE[2], light: ROBE[3], dark: ROBE[1], hi: ROBE[4] });
  paint(g, [[hx - 4.6, hy + 5.2], [hx - 5.4, hy], [hx - 3, hy - 5.4], [hx + 3, hy - 5.6], [hx + 5.2, hy - 1], [hx + 4.6, hy + 5.2], [hx, hy + 7.2]],
    [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  lineMasked(g, hm.mask, hx - 6.4, hy + 6, hx - 5.4, hy - 2, ROBE[1]);
  lineMasked(g, hm.mask, hx + 5.8, hy + 6, hx + 6.8, hy - 2, ROBE[1]);
  for (const [ex, ey, s] of [[-2.2, 0.8, 2], [2, 0.3, 2]]) {
    rect(g, Math.round(hx + ex - s / 2), Math.round(hy + ey), s, 1, BGLOW[3]);
    put(g, Math.round(hx + ex), Math.round(hy + ey), BGLOW[5]);
    put(g, Math.round(hx + ex - 1), Math.round(hy + ey + 1), BGLOW[2]);
  }
  if (p.glow > 1.2) {
    for (const [ex, ey] of [[-2.2, 0.8], [2, 0.3]]) put(g, Math.round(hx + ex), Math.round(hy + ey - 2), BGLOW[2]);
  }
  lineMasked(g, hm.mask, hx - 6, hy + 2, hx - 3, hy + 7, ROBE[1]);
  lineMasked(g, hm.mask, hx + 4, hy + 5, hx + 6.5, hy + 1, ROBE[4]);
  lineMasked(g, hm.mask, hx - 3, hy - 7, hx + 2, hy - 6.5, ROBE[4]);

  // free claw arm
  const claw = [cx + p.claw[0], fy + p.claw[1]];
  const sleeveL = [cx - 8, fy - 50];
  limb(g, sleeveL, claw, 3.8, 2.2, ROBE, { outline: ROBE[0], mid: ROBE[2], light: ROBE[3], dark: ROBE[1] });
  ring(g, claw[0], claw[1], 2.1, BONE, { mid: BONE[3], light: BONE[4] });
  for (let i = 0; i < 4; i++) {
    const a = (52 + i * 26) * Math.PI / 180;
    limb(g, claw, [claw[0] + Math.cos(a) * 5.6, claw[1] + Math.sin(a) * 5.6], 0.95, 0.5, BONE, { outline: BONE[1], mid: BONE[4], light: BONE[5], dark: BONE[3] });
  }

  // staff arm
  const sh = [cx + 8, fy - 49];
  const hand = [cx + p.staffHand[0], fy + p.staffHand[1]];
  limb(g, sh, hand, 3.2, 2.2, ROBE, { outline: ROBE[0], mid: ROBE[2], light: ROBE[3], dark: ROBE[1] });

  // gnarled staff
  const sa = (p.staffAng * Math.PI) / 180;
  const top = [hand[0] + Math.sin(sa) * 22, hand[1] - Math.cos(sa) * 22];
  const bot = [hand[0] - Math.sin(sa) * 7, hand[1] + Math.cos(sa) * 7];
  const mid = lerpPt(bot, top, 0.45);
  const elbow = [mid[0] + Math.cos(sa) * 1.2, mid[1] + Math.sin(sa) * 1.2];
  limb(g, bot, elbow, 1.8, 1.4, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[1], light: PAL.leather[2], dark: PAL.leather[0] });
  limb(g, elbow, top, 1.4, 1.1, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[1], light: PAL.leather[3], dark: PAL.leather[0] });
  for (const t of [0.22, 0.58]) {
    const kp = lerpPt(bot, top, t);
    put(g, Math.round(kp[0]), Math.round(kp[1]), PAL.leather[4]);
    put(g, Math.round(kp[0] + 1), Math.round(kp[1] + 1), PAL.leather[0]);
  }
  const stubA = lerpPt(bot, top, 0.36);
  limb(g, stubA, [stubA[0] - 2.6, stubA[1] - 1.4], 0.8, 0.4, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], bevel: false });
  const stubB = lerpPt(bot, top, 0.72);
  limb(g, stubB, [stubB[0] + 2.4, stubB[1] - 1], 0.7, 0.4, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], bevel: false });
  // bone hand gripping over the shaft
  ring(g, hand[0], hand[1], 1.7, BONE, { mid: BONE[3], light: BONE[4] });
  put(g, Math.round(hand[0] + 1), Math.round(hand[1] + 1), BONE[4]);
  put(g, Math.round(hand[0] - 1), Math.round(hand[1] + 2), BONE[3]);
  // ember orb at staff tip
  const orbR = 3 + (p.glow - 1) * 1.4;
  paint(g, ellipsePts(top[0], top[1] - 1, orbR, orbR, 10), BGLOW, { outline: BGLOW[0], mid: BGLOW[2], light: BGLOW[4], dark: BGLOW[1], hi: BGLOW[5] });
  put(g, Math.round(top[0] - 1), Math.round(top[1] - 2), BGLOW[5]);
  put(g, Math.round(top[0] + 1), Math.round(top[1]), BGLOW[2]);
  // bone crown cradling the orb
  limb(g, [top[0] - 2.4, top[1] + 1], [top[0] - 4.6, top[1] - 6.4], 0.9, 0.5, BONE, { outline: BONE[1], mid: BONE[3], light: BONE[4], bevel: false });
  limb(g, [top[0] + 2.4, top[1] + 1], [top[0] + 4.8, top[1] - 5.6], 0.9, 0.5, BONE, { outline: BONE[1], mid: BONE[3], light: BONE[4], bevel: false });
  put(g, Math.round(top[0] - 4.6), Math.round(top[1] - 6.8), BONE[4]);
  put(g, Math.round(top[0] + 4.8), Math.round(top[1] - 6), BONE[4]);
  outlineUnion(g, INK, false);
}
function lerpPt(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

function wretchPile(g) {
  const cx = WFX, cy = WFY - 5;
  paint(g, ellipsePts(cx, cy, 13, 4.5, 18), ROBE, { outline: ROBE[0], mid: ROBE[2], light: ROBE[3], dark: ROBE[1] });
  paint(g, [[cx - 8, cy - 1], [cx + 2, cy - 5], [cx + 9, cy - 1], [cx + 7, cy + 3], [cx - 6, cy + 3]], [ROBE[0], ROBE[0], ROBE[0], ROBE[0]], { outline: ROBE[0], mid: ROBE[0], bevel: false });
  // staff dropped
  limb(g, [cx + 7, cy - 8], [cx + 18, cy + 2], 1, 0.8, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], bevel: false });
  paint(g, ellipsePts(cx + 7, cy - 8, 2, 2, 8), BGLOW, { outline: BGLOW[0], mid: BGLOW[2], light: BGLOW[4], dark: BGLOW[1] });
  // embers
  for (let i = 0; i < 8; i++) {
    const x = cx - 12 + (i * 7) % 25, y = cy - 4 - (i * 5) % 18;
    put(g, x, y, i % 2 ? BGLOW[4] : BGLOW[2]);
  }
}

const WALKW = [
  { bob: 0, sway: 0, robe: 1 },
  { bob: -1.5, sway: 1, robe: 2 },
  { bob: 0, sway: 1.5, robe: 1.5 },
  { bob: 1, sway: 0.5, robe: 0 },
  { bob: 0, sway: -0.5, robe: -1 },
  { bob: -1, sway: -1, robe: -0.5 },
];
function wretchHover(i) {
  const k = WALKW[i % 6];
  const ph = (i / 6) * Math.PI * 2;
  return wpose({
    bob: k.bob, sway: k.sway, robeSway: k.robe,
    headTilt: Math.sin(ph) * 1.5,
    staffHand: [13 + k.sway * 0.3, -40 + k.bob * 0.4],
    staffAng: 6 + Math.sin(ph) * 1.2,
    claw: [-15 - k.sway * 0.4, -32 + Math.sin(ph + 1) * 1.2],
    glow: 1,
  });
}
const WCAST = [
  [0, wpose({})],
  [0.3, wpose({ staffHand: [13, -44], staffAng: 0, lean: -1, glow: 1.4, robeSway: 1.5, headTilt: -1, claw: [-16, -36] })],
  [0.55, wpose({ staffHand: [13.5, -47], staffAng: -7, lean: -2, glow: 2.1, robeSway: 2.5, headTilt: -2, claw: [-18, -41] })],
  [0.7, wpose({ staffHand: [17, -42], staffAng: 20, lean: 2, glow: 2.6, robeSway: -1.5, headTilt: 1.5, claw: [-16, -33] })],
  [0.86, wpose({ staffHand: [14, -41], staffAng: 10, glow: 1.5, robeSway: -0.5 })],
  [1, wpose({})],
];
const WHURT = [
  [0, wpose({})],
  [0.4, wpose({ lean: -3, sway: 2, headTilt: -4, robeSway: 3, staffHand: [11, -36], staffAng: 12, glow: 1.5, claw: [-17, -28] })],
  [1, wpose({ lean: -1, sway: 1, robeSway: 1, glow: 1.2 })],
];

function wretchFrame(row, i, g) {
  if (row === 3 && i >= 4) { wretchPile(g); return; }
  let p;
  if (row === 0) p = wretchHover(i);
  else if (row === 1) p = wkey(WCAST, i / 5);
  else if (row === 2) p = wkey(WHURT, i / 5);
  else p = i <= 2 ? wkey(WHURT, i / 2) : wpose({ bob: 12, lean: 0, robeSway: 4, glow: 0.5, headTilt: 4, staffHand: [9, -20], claw: [-10, -12] });
  drawWretch(g, p);
}

/* ============================ EXPORT ============================ */
const which = process.argv[2] || "all";

if (which === "skeleton" || which === "all") {
  await exportSheet({
    name: "skeleton", w: SW, h: SH, cols: 6, rows: 4, frames: 24,
    draw: (g, i) => skeletonFrame(Math.floor(i / 6), i % 6, g),
  });
}
if (which === "wretch" || which === "all") {
  await exportSheet({
    name: "wretch", w: WW, h: WH, cols: 6, rows: 4, frames: 24,
    draw: (g, i) => wretchFrame(Math.floor(i / 6), i % 6, g),
  });
}
console.log("enemies done");
