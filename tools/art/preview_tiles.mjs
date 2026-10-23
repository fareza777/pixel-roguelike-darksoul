import fs from "node:fs";
import { decodePNG, encodePNG, crop, scale, composite, solid } from "./png.mjs";

const sheet = decodePNG("C:/Pixelorama v7/game/assets/art/dungeon_tiles.png");
const close = scale(sheet, 4);
const pad = solid(close.w + 20, close.h + 20, "#0f0d14");
composite(pad, close, 10, 10);
fs.writeFileSync("C:/Pixelorama v7/art/preview/tilesheet.png", encodePNG(pad));

// sample room at 1x then 2x
const TW = 16, TH = 10, T = 32;
const room = solid(TW * T, TH * T, "#0a090e");
const tile = (i, x, y) => {
  const f = crop(sheet, (i % 8) * T, Math.floor(i / 8) * T, T, T);
  composite(room, f, x * T, y * T);
};
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
  if (y === 0) tile(11 + ((x * 7) % 2), x, y);
  else if (y === 1) {
    if (x === 0 || x === TW - 1) tile(8, x, y);
    else if (x === 7 || x === 8) tile(24, x, y);
    else if (x === 3) tile(23, x, y);
    else if (x === 12) tile(13, x, y);
    else tile(8 + (x % 2), x, y);
  } else if (y === TH - 1) tile(9, x, y);
  else {
    const v = (x * 3 + y * 5 + (x * y) % 4) % 7;
    if (v === 3) tile(2, x, y);
    else if (v === 5) tile(3, x, y);
    else if (v === 6 && (x + y) % 3 === 0) tile(4, x, y);
    else tile(v % 2, x, y);
  }
}
tile(16, 4, 6); tile(18, 11, 3); tile(19, 12, 4); tile(20, 3, 3); tile(20, 12, 7);
tile(21, 7, 7); tile(22, 10, 2); tile(29, 6, 5); tile(6, 2, 8); tile(7, 13, 7);
tile(5, 9, 4); tile(30, 1, 2); tile(15, 14, 2);

const k = 2;
const big = scale(room, k);
const out = solid(big.w + 24, big.h + 24, "#07060a");
composite(out, big, 12, 12);
fs.writeFileSync("C:/Pixelorama v7/art/preview/room_sample.png", encodePNG(out));

const torch = decodePNG("C:/Pixelorama v7/game/assets/art/torch.png");
const strip = solid(8 * 64 + 20, 128 + 40, "#1b1a23");
for (let i = 0; i < 8; i++) composite(strip, scale(crop(torch, i * 16, 0, 16, 32), 4), 10 + i * 64, 20);
fs.writeFileSync("C:/Pixelorama v7/art/preview/torch_strip.png", encodePNG(strip));
console.log("tile previews written");
