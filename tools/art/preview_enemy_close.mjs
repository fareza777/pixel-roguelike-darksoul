import fs from "node:fs";
import { decodePNG, encodePNG, crop, scale, composite, solid } from "./png.mjs";

const WHICH = process.argv[2] || "skeleton";
const cfg = {
  skeleton: { path: "C:/Pixelorama v7/game/assets/art/skeleton.png", cw: 72, ch: 72, frames: [[0, 0], [1, 2], [3, 4]] },
  wretch: { path: "C:/Pixelorama v7/game/assets/art/wretch.png", cw: 80, ch: 84, frames: [[0, 0], [1, 3], [3, 4]] },
}[WHICH];
if (!cfg) throw new Error("unknown enemy " + WHICH);
const sheet = decodePNG(cfg.path);
const k = 6;
const cw = cfg.cw * k, ch = cfg.ch * k;
const out = solid(cw * 3 + 40, ch + 20, "#1b1822");
cfg.frames.forEach(([row, col], i) => {
  const f = scale(crop(sheet, col * cfg.cw, row * cfg.ch, cfg.cw, cfg.ch), k);
  composite(out, f, 10 + i * (cw + 10), 10);
});
fs.writeFileSync(`C:/Pixelorama v7/art/preview/${WHICH}_close.png`, encodePNG(out));
console.log(`${WHICH} close-up written`);
