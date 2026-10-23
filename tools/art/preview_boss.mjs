import fs from "node:fs";
import { decodePNG, encodePNG, crop, scale, composite, solid } from "./png.mjs";

const sheet = decodePNG("C:/Pixelorama v7/game/assets/art/warden.png");
const W = 1200, H = 800;
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
  const d1 = Math.hypot(x - 220, y - 180) / 500;
  const d2 = Math.hypot(x - 1000, y - 660) / 600;
  const light = Math.max(0, 1 - d1) * 0.55 + Math.max(0, 1 - d2) * 0.4;
  bg.data[i] = Math.min(255, bg.data[i] + light * 96);
  bg.data[i + 1] = Math.min(255, bg.data[i + 1] + light * 60);
  bg.data[i + 2] = Math.min(255, bg.data[i + 2] + light * 34);
  const v = Math.hypot(x - W / 2, y - H / 2) / 820;
  const dark = Math.min(0.55, v * 0.5);
  bg.data[i] *= 1 - dark; bg.data[i + 1] *= 1 - dark; bg.data[i + 2] *= 1 - dark;
}
const frames = [[0, 0], [1, 2], [2, 2], [2, 3], [3, 3], [5, 2]];
const cols = 3, cellW = 400, cellH = 380, top = 40;
for (let i = 0; i < frames.length; i++) {
  const [row, col] = frames[i];
  const gx = (i % cols) * cellW + cellW / 2;
  const gy = top + Math.floor(i / cols) * cellH + 330;
  for (let y = -10; y <= 10; y++) for (let x = -52; x <= 52; x++) {
    const d = (x * x) / (52 * 52) + (y * y) / (10 * 10);
    if (d > 1) continue;
    const px = Math.round(gx + x), py = Math.round(gy + y);
    const o = (py * W + px) * 4, a = (1 - d) * 0.45;
    bg.data[o] = Math.round(bg.data[o] * (1 - a));
    bg.data[o + 1] = Math.round(bg.data[o + 1] * (1 - a));
    bg.data[o + 2] = Math.round(bg.data[o + 2] * (1 - a));
  }
  const f = scale(crop(sheet, col * 120, row * 120, 120, 120), 3);
  composite(bg, f, Math.round(gx - 180), Math.round(gy - 112 * 3));
}
fs.writeFileSync("C:/Pixelorama v7/art/preview/warden_play.png", encodePNG(bg));
console.log("boss preview written");
