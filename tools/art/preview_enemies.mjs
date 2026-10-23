import fs from "node:fs";
import { decodePNG, encodePNG, crop, scale, composite, solid } from "./png.mjs";

const WHICH = process.argv[2] || "skeleton";
const cfg = {
  skeleton: {
    path: "C:/Pixelorama v7/game/assets/art/skeleton.png",
    cw: 72, ch: 72, fx: 36, fy: 64,
    frames: [["WALK A", 0, 0], ["WALK B", 0, 3], ["SLASH", 1, 2], ["SLASH END", 1, 3], ["HURT", 2, 1], ["BONES", 3, 4]],
  },
  wretch: {
    path: "C:/Pixelorama v7/game/assets/art/wretch.png",
    cw: 80, ch: 84, fx: 40, fy: 76,
    frames: [["HOVER A", 0, 0], ["HOVER B", 0, 2], ["CAST", 1, 2], ["RELEASE", 1, 3], ["HURT", 2, 1], ["ASHES", 3, 4]],
  },
}[WHICH];
if (!cfg) throw new Error("unknown enemy " + WHICH);

const sheet = decodePNG(cfg.path);
const W = 1280, H = 720;
const bg = solid(W, H, "#141119");
const floor = solid(64, 64, "#27242e");
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const i = (y * 64 + x) * 4;
  const n = ((x * 7 + y * 13) % 37) - 18;
  floor.data[i] = Math.max(0, Math.min(255, 40 + n));
  floor.data[i + 1] = Math.max(0, Math.min(255, 37 + n));
  floor.data[i + 2] = Math.max(0, Math.min(255, 49 + n));
  if (x === 0 || y === 0) { floor.data[i] = 28; floor.data[i + 1] = 26; floor.data[i + 2] = 34; }
}
for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 64) composite(bg, floor, x, y);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const d1 = Math.hypot(x - 200, y - 130) / 460;
  const d2 = Math.hypot(x - 1080, y - 580) / 520;
  const light = Math.max(0, 1 - d1) * 0.55 + Math.max(0, 1 - d2) * 0.4;
  bg.data[i] = Math.min(255, bg.data[i] + light * 92);
  bg.data[i + 1] = Math.min(255, bg.data[i + 1] + light * 66);
  bg.data[i + 2] = Math.min(255, bg.data[i + 2] + light * 34);
  const v = Math.hypot(x - W / 2, y - H / 2) / 760;
  const dark = Math.min(0.55, v * 0.5);
  bg.data[i] *= 1 - dark; bg.data[i + 1] *= 1 - dark; bg.data[i + 2] *= 1 - dark;
}
// flat ground shadows so we judge footing
const cols = 3, rows = 2, cellW = Math.floor(W / cols), cellH = Math.floor(H / rows);
for (let i = 0; i < cfg.frames.length; i++) {
  const [, row, col] = cfg.frames[i];
  const gx = (i % cols) * cellW + cellW / 2;
  const gy = Math.floor(i / cols) * cellH + cellH - 54;
  for (let y = -12; y <= 12; y++) for (let x = -48; x <= 48; x++) {
    const d = (x * x) / (48 * 48) + (y * y) / (12 * 12);
    if (d > 1) continue;
    const px = Math.round(gx + x), py = Math.round(gy + y);
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const o = (py * W + px) * 4, a = (1 - d) * 0.42;
    bg.data[o] = Math.round(bg.data[o] * (1 - a));
    bg.data[o + 1] = Math.round(bg.data[o + 1] * (1 - a));
    bg.data[o + 2] = Math.round(bg.data[o + 2] * (1 - a));
  }
}
for (let i = 0; i < cfg.frames.length; i++) {
  const [, row, col] = cfg.frames[i];
  const f = scale(crop(sheet, col * cfg.cw, row * cfg.ch, cfg.cw, cfg.ch), 3);
  const gx = (i % cols) * cellW + cellW / 2;
  const gy = Math.floor(i / cols) * cellH + cellH - 54;
  composite(bg, f, Math.round(gx - cfg.fx * 3), Math.round(gy - cfg.fy * 3));
}
fs.writeFileSync(`C:/Pixelorama v7/art/preview/${WHICH}_play.png`, encodePNG(bg));
console.log(`${WHICH} preview written`);
