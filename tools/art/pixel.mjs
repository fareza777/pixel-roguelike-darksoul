// Pixel raster toolkit + Pixelorama sheet export.
import { cmd, flush } from "./bridge.mjs";

export const INK = "#16121c";

export const PAL = {
  ink: INK,
  inkSoft: "#241d2b",
  steel: ["#20242f", "#394255", "#5a687f", "#8b9bb0", "#c8d5e1", "#f2f7fa"],
  steelWarm: ["#25232c", "#43404e", "#6b6476", "#9c92a3", "#cfc4d1", "#fbf3f5"],
  gold: ["#3d2710", "#7c521d", "#bd8730", "#e6b455", "#f8e4a0"],
  cape: ["#260a14", "#521626", "#84263a", "#b23a4b", "#d96a6c", "#f0a2a0"],
  leather: ["#241710", "#3f2a1b", "#63422a", "#8c613c", "#b08355"],
  bone: ["#2b2721", "#574f41", "#8b816b", "#c0b598", "#ece4cb", "#fffdf0"],
  cloth: ["#191a22", "#282a35", "#3b3e4d", "#545869"],
  skin: ["#5c3a2d", "#96684d", "#c08a63", "#e3b089"],
  plume: ["#5b5040", "#8f8168", "#cbbfa2", "#f1e8cf", "#fffdf4"],
  green: ["#0e2a23", "#1d4d3d", "#2f7a5c", "#57b184", "#8be3b7", "#ddfff0"],
  ember: ["#4a1c0c", "#8a3313", "#d55f1e", "#f59b3d", "#ffd27a", "#fff6d0"],
  blue: ["#0c1a2e", "#152f4f", "#235a7c", "#3f91aa", "#7fd2d4"],
  parchment: ["#4b3b27", "#8a7150", "#c3a87a", "#e8d3a1", "#f8efcf"],
};

export function makeGrid(w, h) {
  return { w, h, px: new Array(w * h).fill(null) };
}

export function put(g, x, y, c) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
  if (c) g.px[y * g.w + x] = c;
}

export function get(g, x, y) {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null;
  return g.px[y * g.w + x];
}

export function rect(g, x, y, w, h, c) {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
    for (let xx = Math.round(x); xx < Math.round(x + w); xx++) put(g, xx, yy, c);
}

export function line(g, x0, y0, x1, y1, c, thickness = 1) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) throw new Error("line: non-finite coordinate");
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    put(g, x0, y0, c);
    if (thickness > 1) {
      for (let i = 1; i < thickness; i++) put(g, x0 - Math.floor(i / 2), y0 + (i % 2), c);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

export function ellipsePts(cx, cy, rx, ry, n = 28, rot = 0) {
  const pts = [];
  const r = (rot * Math.PI) / 180;
  const cr = Math.cos(r), sr = Math.sin(r);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}

export function rotPt(pts, cx, cy, deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

export function shift(pts, dx, dy) {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

export function scalePts(pts, cx, cy, sx, sy) {
  return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
}

export function dir(angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
}

export function rasterize(g, pts) {
  const mask = new Uint8Array(g.w * g.h);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  minX = Math.max(0, Math.floor(minX) - 1); maxX = Math.min(g.w - 1, Math.ceil(maxX) + 1);
  minY = Math.max(0, Math.floor(minY) - 1); maxY = Math.min(g.h - 1, Math.ceil(maxY) + 1);
  const n = pts.length;
  for (let y = minY; y <= maxY; y++) {
    const sy = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const sx = x + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > sy) !== (yj > sy) && sx < ((xj - xi) * (sy - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) mask[y * g.w + x] = 1;
    }
  }
  return mask;
}

// Paint a polygon with a 1px material outline + directional bevel.
export function paint(g, pts, ramp, opts = {}) {
  const mask = rasterize(g, pts);
  const outline = opts.outline ?? ramp[0];
  const mid = opts.mid ?? ramp[Math.min(2, ramp.length - 1)];
  const light = opts.light ?? ramp[Math.min(3, ramp.length - 1)];
  const dark = opts.dark ?? ramp[Math.min(1, ramp.length - 1)];
  const hi = opts.hi ?? ramp[ramp.length - 1];
  const bevel = opts.bevel ?? true;
  const w = g.w, h = g.h;
  const out = new Uint8Array(mask.length);
  const inM = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      if (!inM(x - 1, y) || !inM(x + 1, y) || !inM(x, y - 1) || !inM(x, y + 1)) out[i] = 1;
    }
  }
  const isOut = (x, y) => x >= 0 && y >= 0 && x < w && y < h && out[y * w + x];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      if (out[i]) { g.px[i] = outline; continue; }
      if (!bevel) { g.px[i] = mid; continue; }
      const lightSide = isOut(x - 1, y) || isOut(x, y - 1) || isOut(x - 1, y - 1);
      const darkSide = isOut(x + 1, y) || isOut(x, y + 1) || isOut(x + 1, y + 1);
      if (lightSide) g.px[i] = opts.hiAtEdge ? hi : light;
      else if (darkSide) g.px[i] = dark;
      else g.px[i] = mid;
    }
  }
  if (opts.detail) opts.detail(g, mask, inM);
  return { mask, pts, inM };
}

export function inMask(mask, g, x, y) {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return false;
  return !!mask[y * g.w + x];
}

export function lineMasked(g, mask, x0, y0, x1, y1, c) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) throw new Error("lineMasked: non-finite coordinate");
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (inMask(mask, g, x0, y0)) put(g, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

export function limb(g, a, b, wa, wb, ramp, opts = {}) {
  const [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts = [
    [ax + nx * wa, ay + ny * wa],
    [bx + nx * wb, by + ny * wb],
    [bx - nx * wb, by - ny * wb],
    [ax - nx * wa, ay - ny * wa],
  ];
  return paint(g, pts, ramp, opts);
}

export function outlineUnion(g, color = INK, diagonal = false) {
  const w = g.w, h = g.h;
  const add = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (g.px[y * w + x]) continue;
      let near = false;
      if (x > 0 && g.px[y * w + x - 1]) near = true;
      else if (x < w - 1 && g.px[y * w + x + 1]) near = true;
      else if (y > 0 && g.px[(y - 1) * w + x]) near = true;
      else if (y < h - 1 && g.px[(y + 1) * w + x]) near = true;
      if (!near && diagonal) {
        if (x > 0 && y > 0 && g.px[(y - 1) * w + x - 1]) near = true;
        else if (x < w - 1 && y > 0 && g.px[(y - 1) * w + x + 1]) near = true;
        else if (x > 0 && y < h - 1 && g.px[(y + 1) * w + x - 1]) near = true;
        else if (x < w - 1 && y < h - 1 && g.px[(y + 1) * w + x + 1]) near = true;
      }
      if (near) add.push(y * w + x);
    }
  }
  for (const i of add) g.px[i] = color;
}

export function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (c) put(dst, ox + x, oy + y, c);
    }
  }
}

export function circlePts(cx, cy, r, n = 16) {
  return ellipsePts(cx, cy, r, r, n);
}

// Export a sheet: rows of animations. draw(g, frameIndex) must render a
// local w x h frame (coordinates local, origin top-left of frame).
export async function exportSheet({ name, w, h, cols, rows, frames, draw, savePxo = true }) {
  const sheet = makeGrid(cols * w, rows * h);
  for (let i = 0; i < frames; i++) {
    const g = makeGrid(w, h);
    draw(g, i, frames);
    const cx = (i % cols) * w;
    const cy = Math.floor(i / cols) * h;
    blit(sheet, g, cx, cy);
  }
  await cmd("create_canvas", { width: sheet.w, height: sheet.h, name });
  await flush(sheet.px, sheet.w, sheet.h);
  const out = `C:/Pixelorama v7/game/assets/art/${name}.png`;
  await cmd("export_image", { path: out, scale: 1 });
  if (savePxo) await cmd("save_project", { path: `C:/Pixelorama v7/art/pxo/${name}.pxo` });
  await cmd("close_canvas");
  console.log(`exported ${name}.png (${sheet.w}x${sheet.h}, ${frames} frames)`);
  return out;
}

// Simple 5x7 bitmap font for previews rendered inside Pixelorama.
export const FONT = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01110","10001","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","11110","00001","00001","10001","01110"],
  "6": ["00110","01000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00010","01100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","00100","00100"],
  ",": ["00000","00000","00000","00000","00100","00100","01000"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
  ":": ["00000","00100","00100","00000","00100","00100","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "'": ["00100","00100","01000","00000","00000","00000","00000"],
  "(": ["00010","00100","01000","01000","01000","00100","00010"],
  ")": ["01000","00100","00010","00010","00010","00100","01000"],
};

export function drawText(g, text, x, y, color, scale = 1) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch];
    if (!glyph) { cx += 6 * scale; continue; }
    for (let gy = 0; gy < 7; gy++)
      for (let gx = 0; gx < 5; gx++)
        if (glyph[gy][gx] === "1")
          rect(g, cx + gx * scale, y + gy * scale, scale, scale, color);
    cx += 6 * scale;
  }
  return cx;
}
