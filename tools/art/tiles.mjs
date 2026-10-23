// Dungeon tileset: 32px tiles, 8x4 atlas + animated torch strip.
import {
  INK, PAL, makeGrid, put, get, rect, line, lineMasked, ellipsePts,
  paint, rasterize, limb, outlineUnion, exportSheet,
} from "./pixel.mjs";

const T = 32, COLS = 8, ROWS = 4;
const STONE = ["#17161d", "#262430", "#353241", "#454150", "#5a5566", "#736d80"];
const WALL = ["#0f0e14", "#1b1a23", "#292733", "#383545", "#4a4659"];
const MOSS = ["#1c2a1c", "#2c4028", "#405732", "#58703f", "#789054"];
const WOOD = ["#1e130c", "#33200f", "#4d3018", "#6b4423", "#8c5c31"];
const IRON2 = ["#131419", "#23252c", "#373a44", "#4e515c", "#6c707c", "#9aa0ac"];
const BLOOD = ["#140a0c", "#201013", "#2c1618", "#3a1d1d"];
const GOLD2 = PAL.gold;

let seed = 12345;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

function fillTile(g, ox, oy, c) { rect(g, ox, oy, T, T, c); }
function noise(g, ox, oy, base, amt, n = 40) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * T), y = Math.floor(rnd() * T);
    const c = base[Math.max(0, Math.min(base.length - 1, Math.floor(rnd() * base.length)))]; // eslint-disable-line
    put(g, ox + x, oy + y, c);
  }
}

function flagFloor(g, ox, oy, variant = 0) {
  fillTile(g, ox, oy, STONE[1]);
  const tones = [STONE[2], STONE[2], STONE[1], STONE[2]];
  for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 2; fx++) {
    const bx = ox + fx * 16, by = oy + fy * 16;
    const tone = tones[(fx + fy * 2 + variant) % 4];
    rect(g, bx + 1, by + 1, 14, 14, tone);
    for (let x = 1; x < 15; x++) { put(g, bx + x, by + 1, STONE[3]); }
    for (let y = 1; y < 15; y++) { put(g, bx + 1, by + y, STONE[2]); }
    rect(g, bx + 1, by + 14, 14, 1, STONE[0]);
    rect(g, bx + 14, by + 1, 1, 14, STONE[0]);
    // chips
    for (let i = 0; i < 3; i++) {
      const x = bx + 2 + Math.floor(rnd() * 11), y = by + 2 + Math.floor(rnd() * 11);
      put(g, x, y, rnd() < 0.5 ? STONE[0] : STONE[3]);
    }
    if ((fx + fy + variant) % 3 === 0) {
      line(g, bx + 3, by + 5, bx + 7, by + 4, STONE[0]);
      line(g, bx + 7, by + 4, bx + 9, by + 7, STONE[0]);
    }
  }
  for (let i = 0; i < 2; i++) put(g, ox + Math.floor(rnd() * T), oy + Math.floor(rnd() * T), STONE[4]);
}

function wallFace(g, ox, oy, variant = 0, mossy = false) {
  fillTile(g, ox, oy, WALL[1]);
  for (let row = 0; row < 4; row++) {
    const by = oy + row * 8;
    const off = (row + variant) % 2 ? 8 : 0;
    for (let bx = ox - 16 + off; bx < ox + T; bx += 16) {
      const x0 = Math.max(ox, bx), x1 = Math.min(ox + T, bx + 15);
      if (x1 <= x0) continue;
      rect(g, x0, by + 1, x1 - x0, 6, WALL[2]);
      rect(g, x0, by + 1, x1 - x0, 1, WALL[3]);
      rect(g, x0, by + 7, x1 - x0, 1, WALL[0]);
      for (let x = x0; x < x1; x++) if ((x + row) % 7 === 0) put(g, x, by + 3, WALL[1]);
    }
  }
  if (mossy) for (let i = 0; i < 26; i++) {
    const x = ox + Math.floor(rnd() * T), y = oy + 18 + Math.floor(rnd() * 14);
    put(g, x, y, MOSS[1 + Math.floor(rnd() * 3)]);
  }
  for (let i = 0; i < 5; i++) put(g, ox + Math.floor(rnd() * T), oy + Math.floor(rnd() * T), WALL[4]);
  line(g, ox + 2, oy + 24, ox + 7, oy + 27, WALL[0]);
  line(g, ox + 7, oy + 27, ox + 11, oy + 26, WALL[0]);
}

function wallTop(g, ox, oy, variant = 0) {
  fillTile(g, ox, oy, WALL[2]);
  for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 2; fx++) {
    const bx = ox + fx * 16, by = oy + fy * 16;
    rect(g, bx + 1, by + 1, 14, 14, variant % 2 ? WALL[3] : WALL[2]);
    rect(g, bx + 1, by + 1, 14, 1, WALL[4]);
    rect(g, bx + 1, by + 14, 14, 1, WALL[0]);
  }
  for (let i = 0; i < 10; i++) put(g, ox + Math.floor(rnd() * T), oy + Math.floor(rnd() * T), WALL[1]);
  // standing water / dust
  rect(g, ox + 5, oy + 20, 4, 2, "#20242e");
  put(g, ox + 6, oy + 20, "#36404e");
}

function chest(g, ox, oy, open, big = false) {
  const w = big ? 28 : 22, h = big ? 20 : 17;
  const x = ox + Math.floor((T - w) / 2), y = oy + T - h - 2;
  // shadow
  for (let i = 0; i < w + 4; i++) put(g, x - 2 + i, y + h + 1, "#121017");
  // body
  rect(g, x + 1, y + 7, w - 2, h - 9, WOOD[3]);
  rect(g, x + 1, y + 7, w - 2, 2, WOOD[2]);
  rect(g, x + 1, y + h - 4, w - 2, 2, WOOD[1]);
  for (let i = 0; i < w - 2; i += 4) rect(g, x + 2 + i, y + 9, 1, h - 11, WOOD[2]);
  // lid
  if (!open) {
    rect(g, x, y + 2, w, 7, WOOD[4]);
    rect(g, x, y + 2, w, 2, WOOD[3]);
    rect(g, x, y + 8, w, 1, WOOD[0]);
  } else {
    rect(g, x, y - 6, w, 6, WOOD[4]);
    rect(g, x, y - 6, w, 2, WOOD[3]);
    rect(g, x, y - 1, w, 1, WOOD[0]);
    rect(g, x + 2, y + 3, w - 4, 5, "#0d0b12");
    rect(g, x + 4, y + 4, w - 8, 1, "#2c2438");
    for (let i = 0; i < 4; i++) put(g, x + 5 + i * 5, y + 5, GOLD2[3]);
  }
  // iron bands
  for (const bx of [x + 3, x + w - 6]) {
    rect(g, bx, y + (open ? -5 : 3), 2, h - 5, IRON2[2]);
    put(g, bx, y + (open ? -5 : 3), IRON2[4]);
  }
  // lock
  rect(g, x + Math.floor(w / 2) - 2, y + 10, 4, 5, GOLD2[2]);
  put(g, x + Math.floor(w / 2), y + 12, GOLD2[0]);
  put(g, x + Math.floor(w / 2), y + 11, GOLD2[4]);
  outlineUnion(g, "#121018", false);
}

function barrel(g, ox, oy) {
  const cx = ox + 16, top = oy + 8, bot = oy + 29;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const half = 8 + Math.sin(t * Math.PI) * 2;
    for (let x = -half; x <= half; x++) {
      let c = WOOD[3];
      if (x < -half * 0.55) c = WOOD[2];
      if (x > half * 0.6) c = WOOD[4];
      put(g, cx + x, y, c);
    }
  }
  for (let x = -9; x <= 9; x++) {
    const yy = oy + 8 - Math.round(Math.sqrt(Math.max(0, 81 - x * x)) * 0.28);
    put(g, cx + x, yy - 1, WOOD[2]);
  }
  for (const hy of [oy + 12, oy + 22]) {
    rect(g, cx - 9, hy, 19, 2, IRON2[1]);
    rect(g, cx - 9, hy, 19, 1, IRON2[3]);
  }
  rect(g, cx - 1, top + 3, 1, bot - top - 3, WOOD[1]);
  put(g, cx + 4, top + 7, WOOD[4]);
  outlineUnion(g, "#121018", false);
}

function crate(g, ox, oy) {
  const x = ox + 5, y = oy + 10, s = 22;
  rect(g, x + 1, y + 1, s, s, WOOD[3]);
  rect(g, x + 1, y + 1, s, 2, WOOD[4]);
  rect(g, x + 1, y + s, s, 1, WOOD[0]);
  for (let i = 2; i < s; i += 6) rect(g, x + i, y + 3, 2, s - 3, WOOD[2]);
  line(g, x + 2, y + 2, x + s, y + s, WOOD[4]);
  line(g, x + s, y + 2, x + 2, y + s, WOOD[4]);
  rect(g, x + 1, y + 6, s, 2, WOOD[2]);
  rect(g, x + 1, y + s - 7, s, 2, WOOD[2]);
  put(g, x + 4, y + 4, IRON2[3]); put(g, x + s - 2, y + 4, IRON2[3]);
  outlineUnion(g, "#121018", false);
}

function pillar(g, ox, oy) {
  const cx = ox + 16;
  rect(g, cx - 11, oy + 26, 23, 6, STONE[2]);
  rect(g, cx - 11, oy + 26, 23, 1, STONE[3]);
  rect(g, cx - 9, oy + 5, 19, 22, STONE[2]);
  for (const fx of [-7, -2, 3, 8]) rect(g, cx + fx, oy + 6, 1, 20, STONE[1]);
  rect(g, cx - 7, oy + 6, 1, 20, STONE[3]);
  rect(g, cx + 6, oy + 6, 1, 20, STONE[1]);
  rect(g, cx - 10, oy + 1, 21, 6, STONE[3]);
  rect(g, cx - 10, oy + 1, 21, 2, STONE[4]);
  rect(g, cx - 10, oy + 6, 21, 1, STONE[0]);
  // fluting shadows
  for (const fx of [-6, 0, 6]) rect(g, cx + fx, oy + 8, 2, 17, STONE[1]);
  outlineUnion(g, "#121018", false);
}

function bones(g, ox, oy) {
  const cx = ox + 16, cy = oy + 21;
  for (const [x0, y0, x1, y1] of [[-9, 2, -3, 6], [-6, 5, 2, 1], [-2, 7, 7, 4], [-8, -1, 3, 3], [1, 8, 9, 6]]) {
    limb(g, [cx + x0, cy + y0], [cx + x1, cy + y1], 1.2, 1, PAL.bone, { outline: PAL.bone[0], mid: PAL.bone[3], light: PAL.bone[4], dark: PAL.bone[2] });
  }
  paint(g, ellipsePts(cx + 2, cy - 5, 4.2, 3.6, 10), PAL.bone, { outline: PAL.bone[0], mid: PAL.bone[3], light: PAL.bone[4], dark: PAL.bone[2] });
  paint(g, [[cx + 1, cy - 6], [cx + 4, cy - 6], [cx + 4, cy - 4], [cx + 1, cy - 4]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  put(g, cx + 2, cy - 5, PAL.green[2]);
  outlineUnion(g, "#121018", false);
}

function brazier(g, ox, oy) {
  const cx = ox + 16, y = oy + 24;
  rect(g, cx - 3, y - 1, 7, 6, IRON2[2]);
  rect(g, cx - 8, y - 5, 17, 5, IRON2[2]);
  rect(g, cx - 8, y - 5, 17, 1, IRON2[4]);
  rect(g, cx - 6, y - 7, 13, 3, IRON2[1]);
  for (let i = 0; i < 4; i++) put(g, cx - 5 + i * 3, y - 7, i % 2 ? PAL.ember[3] : PAL.ember[4]);
  // flames
  const flame = [[-3, 0], [-2, -5], [0, -9], [2, -6], [3, -2], [1, -3], [0, -6], [-1, -2]];
  for (let i = 0; i < flame.length; i++) {
    const [fx, fy] = flame[i];
    put(g, cx + fx, y - 8 + fy, i % 3 === 0 ? PAL.ember[4] : i % 2 ? PAL.ember[3] : PAL.ember[2]);
  }
  for (let i = 0; i < 3; i++) put(g, cx - 2 + i * 2, y - 13, PAL.ember[2]);
  outlineUnion(g, "#121018", false);
}

function banner(g, ox, oy) {
  // rod
  rect(g, ox + 4, oy + 2, 24, 2, IRON2[2]);
  put(g, ox + 3, oy + 2, GOLD2[3]); put(g, ox + 28, oy + 2, GOLD2[3]);
  // cloth
  const pts = [
    [ox + 7, oy + 4], [ox + 25, oy + 4], [ox + 25, oy + 22],
    [ox + 21, oy + 27], [ox + 18, oy + 23], [ox + 15, oy + 28], [ox + 12, oy + 23], [ox + 8, oy + 27],
  ];
  const m = paint(g, pts, PAL.cape, { outline: PAL.cape[0], mid: PAL.cape[2], light: PAL.cape[3], dark: PAL.cape[1] });
  lineMasked(g, m.mask, ox + 11, oy + 6, ox + 11, oy + 23, PAL.cape[1]);
  lineMasked(g, m.mask, ox + 22, oy + 6, ox + 22, oy + 22, PAL.cape[1]);
  // heraldic sword
  limb(g, [ox + 16, oy + 9], [ox + 16, oy + 19], 1.2, 0.6, GOLD2, { outline: GOLD2[0], mid: GOLD2[2], light: GOLD2[3], dark: GOLD2[1] });
  limb(g, [ox + 13, oy + 12], [ox + 19, oy + 12], 0.8, 0.8, GOLD2, { outline: GOLD2[0], mid: GOLD2[3], bevel: false });
  outlineUnion(g, "#121018", false);
}

function door(g, ox, oy, open) {
  // stone frame
  rect(g, ox + 2, oy, 28, T, WALL[2]);
  rect(g, ox + 2, oy, 28, 2, WALL[3]);
  const inner = open ? oy + 2 : oy + 4;
  rect(g, ox + 4, inner, 24, T - inner, "#0d0b12");
  if (!open) {
    rect(g, ox + 5, oy + 4, 11, 26, WOOD[3]);
    rect(g, ox + 17, oy + 4, 11, 26, WOOD[2]);
    for (const bx of [ox + 5, ox + 10, ox + 18, ox + 24]) rect(g, bx, oy + 4, 1, 26, WOOD[1]);
    for (const by of [oy + 9, oy + 24]) { rect(g, ox + 5, by, 23, 2, IRON2[2]); rect(g, ox + 5, by, 23, 1, IRON2[3]); }
    // ring handles
    for (const rx of [ox + 13, ox + 19]) {
      rect(g, rx - 1, oy + 14, 3, 3, GOLD2[2]);
      put(g, rx, oy + 16, GOLD2[0]); put(g, rx, oy + 15, GOLD2[4]);
    }
    line(g, ox + 11, oy + 5, ox + 11, oy + 29, WOOD[0]);
  } else {
    // pitch black passage with a few steps
    for (let i = 0; i < 4; i++) rect(g, ox + 6 + i, oy + 22 + i * 2, 20 - i * 2, 1, "#1b1822");
    put(g, ox + 16, oy + 14, PAL.blue[1]);
  }
  outlineUnion(g, "#121018", false);
}

function stairs(g, ox, oy, up) {
  const cx = ox + 16;
  for (let i = 0; i < 6; i++) {
    const y = oy + 8 + i * 4;
    const w = 22 - i * 2;
    rect(g, cx - w / 2, y, w, 4, i % 2 ? STONE[2] : STONE[3]);
    rect(g, cx - w / 2, y, w, 1, STONE[4]);
    rect(g, cx - w / 2, y + 3, w, 1, STONE[0]);
  }
  rect(g, cx - 2, oy + 2, 4, 6, "#0b0a10");
  if (up) { put(g, cx, oy + 4, PAL.ember[3]); put(g, cx, oy + 5, PAL.ember[2]); }
  else for (let i = 0; i < 3; i++) put(g, cx - 4 + i * 4, oy + 5, "#2f2b3a");
  outlineUnion(g, "#121018", false);
}

function rubble(g, ox, oy) {
  for (let i = 0; i < 12; i++) {
    const x = ox + 5 + Math.floor(rnd() * 22), y = oy + 15 + Math.floor(rnd() * 12);
    const r = 1 + Math.floor(rnd() * 2);
    rect(g, x, y, r + 1, r, STONE[2 + Math.floor(rnd() * 3)]);
    put(g, x, y, STONE[4]);
    put(g, x + r, y + r - 1, STONE[0]);
  }
  outlineUnion(g, "#121018", false);
}

function puddle(g, ox, oy) {
  flagFloor(g, ox, oy, 1);
  paint(g, ellipsePts(ox + 16, oy + 19, 11, 6, 16), ["#0d1a22", "#14232c", "#1d3440", "#2a4a56"], { outline: "#0a1016", mid: "#14232c", light: "#263c48", dark: "#0d1a22" });
  line(g, ox + 9, oy + 17, ox + 15, oy + 16, "#3d6370");
  put(g, ox + 20, oy + 19, "#3d6370");
}

function grate(g, ox, oy) {
  flagFloor(g, ox, oy, 2);
  rect(g, ox + 6, oy + 8, 20, 18, "#0a0a0f");
  rect(g, ox + 6, oy + 8, 20, 1, STONE[3]);
  for (let i = 0; i < 6; i++) rect(g, ox + 8 + i * 3, oy + 9, 1, 16, IRON2[1]);
  for (let i = 0; i < 2; i++) rect(g, ox + 7, oy + 12 + i * 6, 18, 1, IRON2[1]);
  put(g, ox + 10, oy + 22, "#2b3a2a");
}

function bloodFloor(g, ox, oy) {
  flagFloor(g, ox, oy, 0);
  paint(g, [[ox + 9, oy + 13], [ox + 14, oy + 8], [ox + 20, oy + 9], [ox + 24, oy + 14], [ox + 22, oy + 20], [ox + 16, oy + 24], [ox + 10, oy + 21], [ox + 7, oy + 17]], BLOOD, { outline: BLOOD[0], mid: BLOOD[1], light: BLOOD[2], dark: BLOOD[0] });
  for (let i = 0; i < 9; i++) {
    const x = ox + 6 + ((i * 9) % 21), y = oy + 8 + ((i * 7) % 17);
    put(g, x, y, BLOOD[i % 3]);
  }
  line(g, ox + 11, oy + 15, ox + 18, oy + 13, "#472424");
  line(g, ox + 18, oy + 13, ox + 21, oy + 17, "#3a1d1d");
}

function mossFloor(g, ox, oy) {
  flagFloor(g, ox, oy, 3);
  for (let i = 0; i < 34; i++) {
    const x = ox + Math.floor(rnd() * T), y = oy + Math.floor(rnd() * T);
    put(g, x, y, MOSS[1 + Math.floor(rnd() * 3)]);
  }
  for (let i = 0; i < 3; i++) {
    const x = ox + 4 + Math.floor(rnd() * 20), y = oy + 4 + Math.floor(rnd() * 20);
    put(g, x, y, MOSS[3]); put(g, x + 1, y, MOSS[2]); put(g, x, y + 1, MOSS[2]);
  }
}

function runeFloor(g, ox, oy) {
  flagFloor(g, ox, oy, 1);
  const cx = ox + 16, cy = oy + 17;
  paint(g, ellipsePts(cx, cy, 10, 8, 20), ["#0d1a1e", "#102426", "#173634", "#1f4e48"], { outline: "#0a1215", mid: "#102426", light: "#1d4440", dark: "#0c1a1d" });
  // ring + four rune ticks
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    put(g, cx + Math.round(Math.cos(a) * 7.5), cy + Math.round(Math.sin(a) * 5.8), i % 7 === 0 ? PAL.green[4] : PAL.green[2]);
  }
  for (const [x, y] of [[0, -5], [0, 5], [-7, 0], [7, 0]]) {
    put(g, cx + x, cy + y, PAL.green[4]);
    put(g, cx + Math.round(x * 0.6), cy + Math.round(y * 0.6), PAL.green[3]);
  }
  // central diamond
  for (const [x, y] of [[0, -3], [0, 3], [-3, 0], [3, 0], [0, 0]]) put(g, cx + x, cy + y, PAL.green[4]);
  put(g, cx, cy - 2, PAL.green[5]);
}

function cobweb(g, ox, oy) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 0.5;
    line(g, ox, oy, ox + Math.cos(a) * 22, oy + Math.sin(a) * 22, "#5a5a68");
  }
  for (let r = 6; r <= 18; r += 6) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 0.5;
      pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
    }
    for (let i = 0; i < pts.length - 1; i++) line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "#40404c");
  }
}

function gargoyle(g, ox, oy) {
  const cx = ox + 16, cy = oy + 15;
  paint(g, [[cx - 8, cy + 10], [cx - 9, cy - 2], [cx - 5, cy - 8], [cx, cy - 10], [cx + 5, cy - 8], [cx + 9, cy - 2], [cx + 8, cy + 10]], STONE, { outline: STONE[0], mid: STONE[2], light: STONE[3], dark: STONE[1] });
  for (const s of [-1, 1]) {
    paint(g, [[cx + s * 5, cy - 5], [cx + s * 12, cy - 12], [cx + s * 9, cy - 3], [cx + s * 6, cy + 2]], STONE, { outline: STONE[0], mid: STONE[2], dark: STONE[1] });
    put(g, cx + s * 3, cy - 2, PAL.ember[3]);
  }
  paint(g, [[cx - 3, cy + 2], [cx + 3, cy + 2], [cx + 2, cy + 6], [cx - 2, cy + 6]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
  rect(g, cx - 10, cy + 10, 21, 4, STONE[2]);
  outlineUnion(g, "#121018", false);
}

function altar(g, ox, oy) {
  rect(g, ox + 3, oy + 12, 26, 14, STONE[2]);
  rect(g, ox + 3, oy + 12, 26, 2, STONE[4]);
  rect(g, ox + 5, oy + 14, 22, 3, STONE[1]);
  rect(g, ox + 4, oy + 26, 24, 3, STONE[1]);
  // sigil
  const cx = ox + 16, cy = oy + 19;
  paint(g, ellipsePts(cx, cy, 6, 4, 14), ["#1b1219", "#2c1a24", "#48283a", "#6a3b50"], { outline: "#140d12", mid: "#2c1a24", light: "#4a2b3c", dark: "#22151d" });
  put(g, cx, cy - 2, PAL.ember[3]); put(g, cx - 2, cy + 1, PAL.ember[3]); put(g, cx + 2, cy + 1, PAL.ember[3]);
  // candles
  for (const cxx of [ox + 8, ox + 24]) {
    rect(g, cxx, oy + 6, 2, 6, PAL.parchment[3]);
    put(g, cxx, oy + 5, PAL.ember[3]); put(g, cxx, oy + 4, PAL.ember[4]);
  }
  outlineUnion(g, "#121018", false);
}

function voidTile(g, ox, oy) {
  fillTile(g, ox, oy, "#07060a");
  for (let i = 0; i < 6; i++) put(g, ox + Math.floor(rnd() * T), oy + Math.floor(rnd() * T), "#17131f");
}

const TILES = [
  (g, o) => flagFloor(g, o.x, o.y, 0),
  (g, o) => flagFloor(g, o.x, o.y, 1),
  (g, o) => flagFloor(g, o.x, o.y, 2),
  (g, o) => bloodFloor(g, o.x, o.y),
  (g, o) => mossFloor(g, o.x, o.y),
  (g, o) => grate(g, o.x, o.y),
  (g, o) => rubble(g, o.x, o.y),
  (g, o) => puddle(g, o.x, o.y),
  (g, o) => wallFace(g, o.x, o.y, 0, false),
  (g, o) => wallFace(g, o.x, o.y, 1, false),
  (g, o) => wallFace(g, o.x, o.y, 0, true),
  (g, o) => wallTop(g, o.x, o.y, 0),
  (g, o) => wallTop(g, o.x, o.y, 1),
  (g, o) => { wallFace(g, o.x, o.y, 1, false); gargoyle(g, o.x, o.y); },
  (g, o) => { wallFace(g, o.x, o.y, 0, false); brazier(g, o.x, o.y); },
  (g, o) => { wallFace(g, o.x, o.y, 1, true); cobweb(g, o.x, o.y); },
  (g, o) => chest(g, o.x, o.y, false),
  (g, o) => chest(g, o.x, o.y, true),
  (g, o) => barrel(g, o.x, o.y),
  (g, o) => crate(g, o.x, o.y),
  (g, o) => pillar(g, o.x, o.y),
  (g, o) => bones(g, o.x, o.y),
  (g, o) => brazier(g, o.x, o.y),
  (g, o) => { flagFloor(g, o.x, o.y, 1); banner(g, o.x, o.y); },
  (g, o) => door(g, o.x, o.y, false),
  (g, o) => door(g, o.x, o.y, true),
  (g, o) => stairs(g, o.x, o.y, false),
  (g, o) => stairs(g, o.x, o.y, true),
  (g, o) => { flagFloor(g, o.x, o.y, 2); altar(g, o.x, o.y); },
  (g, o) => runeFloor(g, o.x, o.y),
  (g, o) => { flagFloor(g, o.x, o.y, 0); rubble(g, o.x, o.y); },
  (g, o) => voidTile(g, o.x, o.y),
];

await exportSheet({
  name: "dungeon_tiles", w: T, h: T, cols: COLS, rows: ROWS, frames: COLS * ROWS,
  draw: (g, i) => TILES[i](g, { x: 0, y: 0 }),
});

// animated wall torch 16x32, 8 frames
function torchFrame(g, i) {
  const cx = 8, plateY = 24, baseY = 30;
  // iron bracket bolted to the wall
  rect(g, cx - 2, plateY, 5, 7, IRON2[1]);
  rect(g, cx - 2, plateY, 5, 1, IRON2[3]);
  put(g, cx - 1, plateY + 2, IRON2[4]);
  put(g, cx + 1, plateY + 5, IRON2[0]);
  rect(g, cx - 4, plateY - 2, 9, 2, IRON2[2]);
  put(g, cx - 4, plateY - 2, IRON2[4]);
  put(g, cx + 4, plateY - 1, IRON2[0]);
  // wooden handle
  limb(g, [cx, baseY], [cx, plateY - 7], 1.2, 1, WOOD, { outline: WOOD[0], mid: WOOD[2], light: WOOD[3], dark: WOOD[1] });
  rect(g, cx - 1, plateY - 6, 3, 1, IRON2[3]);
  // single teardrop flame with a swaying tip
  const ph = (i / 8) * Math.PI * 2;
  const flameBase = plateY - 8;
  const flameTop = 3 + Math.round((Math.sin(ph) + 1) * 1.3);
  const hgt = Math.max(6, flameBase - flameTop);
  for (let y = flameTop; y <= flameBase; y++) {
    const t = (flameBase - y) / hgt;
    let w = 1 + Math.round(Math.sin(Math.min(1, t * 1.02) * Math.PI) * 2.1);
    if (t > 0.78) w = Math.max(0, w - 1);
    const sway = Math.round(Math.sin(ph + t * 3.2) * 1.5 * t);
    for (let x = -w; x <= w; x++) {
      const edge = Math.abs(x) === w;
      let c;
      if (t < 0.35) c = edge ? PAL.ember[3] : (Math.abs(x) <= 1 ? PAL.ember[5] : PAL.ember[4]);
      else if (t < 0.7) c = edge ? PAL.ember[2] : (Math.abs(x) <= 1 ? PAL.ember[4] : PAL.ember[3]);
      else c = edge ? PAL.ember[1] : PAL.ember[3];
      put(g, cx + sway + x, y, c);
    }
  }
  // side wisp + sparks
  const wy = 9 + Math.round(Math.sin(ph + 2) * 3);
  put(g, cx - 3, wy, PAL.ember[3]);
  put(g, cx - 2, wy + 1, PAL.ember[2]);
  for (let k = 0; k < 2; k++) {
    const sx = cx - 2 + ((i * 5 + k * 7) % 6);
    const sy = 2 + ((i * 3 + k * 5) % 9);
    put(g, sx, sy, k % 2 ? PAL.ember[3] : PAL.ember[4]);
  }
}
await exportSheet({
  name: "torch", w: 16, h: 32, cols: 8, rows: 1, frames: 8,
  draw: (g, i) => torchFrame(g, i),
});

console.log("tiles done");
