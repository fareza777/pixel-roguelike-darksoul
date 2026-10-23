import { writeFileSync } from "node:fs";
import { decodePNG, encodePNG, crop, scale, solid, composite } from "./png.mjs";

const img = decodePNG("../../game/assets/art/icons.png");
const S = 6, pad = 12, cell = 16 * S;
const cols = 8, rows = 2;
const W = cols * (cell + pad) + pad, H = rows * (cell + pad) + pad;
const out = solid(W, H, "#141018");
const names = ["heart","feather","bloodfang","grave eye","grail","crown","sigil","orb","skull","key","flame","shield","sword","stamina","spark","tablet"];
for (let i = 0; i < 16; i++) {
  const cx = (i % cols) * (cell + pad) + pad, cy = Math.floor(i / cols) * (cell + pad) + pad;
  const tile = crop(img, (i % 8) * 16, Math.floor(i / 8) * 16, 16, 16);
  composite(out, solid(cell, cell, "#241a26"), cx, cy);
  composite(out, scale(tile, S), cx, cy);
}
writeFileSync("../../art/preview/icons.png", encodePNG(out));
console.log("icons.png preview", W, H, names.join(", "));
