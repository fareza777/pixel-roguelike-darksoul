import fs from "node:fs";
import { decodePNG, encodePNG, crop, scale, composite, solid } from "./png.mjs";

const sheet = decodePNG("C:/Pixelorama v7/game/assets/art/knight.png");
const W = 1280, H = 720;
const bg = solid(W, H, "#171420");
const floor = solid(64, 64, "#2a2733");
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const i = (y * 64 + x) * 4;
  const n = ((x * 7 + y * 13) % 37) - 18;
  floor.data[i] = Math.max(0, Math.min(255, 42 + n));
  floor.data[i + 1] = Math.max(0, Math.min(255, 39 + n));
  floor.data[i + 2] = Math.max(0, Math.min(255, 51 + n));
  if (x === 0 || y === 0) { floor.data[i] = 30; floor.data[i+1] = 28; floor.data[i+2] = 36; }
}
for (let y = 0; y < H; y += 64) for (let x = 0; x < W; x += 64) composite(bg, floor, x, y);
// warm vignette pools
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const d1 = Math.hypot(x - 180, y - 120) / 420;
  const d2 = Math.hypot(x - 1100, y - 560) / 500;
  const light = Math.max(0, 1 - d1) * 0.55 + Math.max(0, 1 - d2) * 0.4;
  bg.data[i] = Math.min(255, bg.data[i] + light * 95);
  bg.data[i + 1] = Math.min(255, bg.data[i + 1] + light * 62);
  bg.data[i + 2] = Math.min(255, bg.data[i + 2] + light * 28);
  const v = Math.hypot(x - W / 2, y - H / 2) / 720;
  const dark = Math.min(0.55, v * 0.5);
  bg.data[i] *= 1 - dark; bg.data[i + 1] *= 1 - dark; bg.data[i + 2] *= 1 - dark;
}

const frames = [
  ["IDLE", 0, 0], ["WALK", 1, 2], ["WALK", 1, 5],
  ["SLASH 1", 2, 2], ["SLASH 2", 3, 3], ["HEAVY", 4, 3],
  ["DASH", 5, 2], ["HURT", 6, 1], ["DEATH", 7, 7],
];
const cells = 3, cw = 320, ch = 200;
for (let i = 0; i < frames.length; i++) {
  const [label, row, col] = frames[i];
  const f = crop(sheet, col * 96, row * 80, 96, 80);
  const f2 = scale(f, 3);
  const cx = (i % cells) * cw + cw / 2, cy = Math.floor(i / cells) * ch + ch / 2;
  composite(bg, f2, Math.round(cx - 144), Math.round(cy - 120));
}
fs.writeFileSync("C:/Pixelorama v7/art/preview/knight_play.png", encodePNG(bg));

// 6x close crop of idle and slash for detail inspection
const idle = scale(crop(sheet, 0, 0, 96, 80), 6);
const slash = scale(crop(sheet, 2 * 96, 2 * 80, 96, 80), 6);
const close = solid(1200, 500, "#1c1924");
composite(close, idle, 10, 10);
composite(close, slash, 600, 10);
fs.writeFileSync("C:/Pixelorama v7/art/preview/knight_close.png", encodePNG(close));
console.log("previews written");
