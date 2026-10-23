// 16x16 HUD / relic / effect icons: 8x2 sheet.
import { INK, PAL, put, rect, line, ellipsePts, paint, limb, outlineUnion, exportSheet } from "./pixel.mjs";

const RED = ["#2a0a12", "#5a1520", "#8f2430", "#c43a45", "#ec6a6a", "#ffb0a6"];
const BONE = PAL.bone;
const GOLD = PAL.gold;

const ICONS = [
  // heart
  (g) => {
    const pts = [[3, 5], [5, 3], [7, 3], [8, 4], [9, 3], [11, 3], [13, 5], [13, 8], [11, 11], [8, 14], [5, 11], [3, 8]];
    paint(g, pts, RED, { outline: RED[0], mid: RED[2], light: RED[3], dark: RED[1] });
    put(g, 5, 6, RED[4]); put(g, 6, 5, RED[5]); put(g, 9, 8, RED[1]);
  },
  // iron feather
  (g) => {
    const pts = [[12, 2], [13, 3], [12, 7], [9, 11], [6, 13], [4, 13], [6, 10], [9, 6]];
    paint(g, pts, PAL.steel, { outline: PAL.steel[0], mid: PAL.steel[2], light: PAL.steel[4], dark: PAL.steel[1] });
    limb(g, [4, 13], [12, 4], 0.6, 0.4, PAL.steel[5], { outline: PAL.steel[1], mid: PAL.steel[3], bevel: false });
    for (let i = 0; i < 4; i++) line(g, 6 + i * 1.5, 9 - i * 1.5, 4 + i * 1.5, 11 - i * 2, PAL.steel[3]);
  },
  // bloodfang
  (g) => {
    const pts = [[4, 3], [8, 3], [10, 6], [9, 11], [7, 14], [6, 10], [5, 6]];
    paint(g, pts, PAL.plume, { outline: PAL.plume[0], mid: PAL.plume[2], light: PAL.plume[3], dark: PAL.plume[1] });
    line(g, 4, 3, 10, 3, RED[2]);
    put(g, 6, 12, RED[2]); put(g, 7, 13, RED[3]);
    put(g, 8, 5, BONE[5]);
  },
  // grave eye
  (g) => {
    const pts = [[2, 8], [5, 4], [8, 3], [11, 4], [14, 8], [11, 12], [8, 13], [5, 12]];
    paint(g, pts, ["#1a1a22", "#2c2c38", "#454552", "#6a6a78"], { outline: "#121218", mid: "#2c2c38", light: "#55556a", dark: "#1a1a22" });
    paint(g, ellipsePts(8, 8, 3.4, 3.4, 10), PAL.green, { outline: PAL.green[0], mid: PAL.green[2], light: PAL.green[4], dark: PAL.green[1] });
    rect(g, 7, 6, 2, 5, INK);
    put(g, 6, 7, PAL.green[5]);
  },
  // silver grail
  (g) => {
    const cup = [[4, 3], [12, 3], [11, 7], [9, 9], [8, 11], [8, 13], [11, 13], [11, 14], [5, 14], [5, 13], [7, 13], [7, 11], [6, 9], [5, 7]];
    paint(g, cup, PAL.steelWarm, { outline: PAL.steelWarm[0], mid: PAL.steelWarm[2], light: PAL.steelWarm[4], dark: PAL.steelWarm[1] });
    rect(g, 5, 4, 6, 1, "#cfe8ea");
    put(g, 6, 5, PAL.steelWarm[5]);
    put(g, 12, 4, PAL.green[3]);
  },
  // bone crown
  (g) => {
    const pts = [[2, 12], [2, 7], [5, 9], [7, 3], [9, 9], [13, 6], [14, 12]];
    paint(g, pts, BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
    rect(g, 2, 12, 12, 2, BONE[2]);
    put(g, 7, 2, PAL.ember[4]); put(g, 12, 5, PAL.ember[3]);
    put(g, 4, 10, BONE[5]);
  },
  // sigil
  (g) => {
    paint(g, ellipsePts(8, 8, 6, 6, 16), ["#0e2422", "#133a35", "#1d5950", "#2c8375"], { outline: "#0a1a18", mid: "#133a35", light: "#287a6c", dark: "#0e2422" });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      put(g, Math.round(8 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), PAL.green[4]);
    }
    line(g, 8, 4, 8, 12, PAL.green[5]);
    line(g, 8, 8, 11, 5, PAL.green[3]);
    line(g, 8, 8, 5, 5, PAL.green[3]);
  },
  // green orb
  (g) => {
    paint(g, ellipsePts(9, 7, 4.6, 4.6, 12), PAL.green, { outline: PAL.green[0], mid: PAL.green[2], light: PAL.green[4], dark: PAL.green[1], hi: PAL.green[5] });
    put(g, 7, 5, PAL.green[5]); put(g, 10, 8, PAL.green[2]);
    limb(g, [6, 10], [3, 14], 1.4, 0.4, PAL.green, { outline: PAL.green[0], mid: PAL.green[2], bevel: false });
    put(g, 2, 15, PAL.green[1]);
  },
  // skull
  (g) => {
    paint(g, ellipsePts(8, 7, 5, 4.6, 12), BONE, { outline: BONE[0], mid: BONE[3], light: BONE[4], dark: BONE[2] });
    rect(g, 5, 8, 6, 4, BONE[2]);
    for (let i = 0; i < 3; i++) rect(g, 6 + i * 2, 9, 1, 3, BONE[0]);
    paint(g, [[5, 5], [7, 5], [7, 7], [5, 7]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
    paint(g, [[9, 5], [11, 5], [11, 7], [9, 7]], [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
    put(g, 6, 5, PAL.green[3]); put(g, 10, 5, PAL.green[3]);
  },
  // key
  (g) => {
    ring(g, 5, 6, 3, GOLD);
    rect(g, 7, 8, 2, 2, GOLD[3]);
    limb(g, [8, 9], [13, 14], 1.2, 1, GOLD, { outline: GOLD[0], mid: GOLD[2], light: GOLD[3], dark: GOLD[1] });
    rect(g, 11, 12, 3, 1, GOLD[2]);
    rect(g, 12, 14, 2, 1, GOLD[2]);
    put(g, 4, 5, GOLD[4]);
  },
  // flame
  (g) => {
    const pts = [[8, 1], [11, 6], [10, 9], [11, 12], [8, 15], [5, 12], [5, 8], [7, 10], [7, 5]];
    paint(g, pts, PAL.ember, { outline: PAL.ember[0], mid: PAL.ember[2], light: PAL.ember[4], dark: PAL.ember[1], hi: PAL.ember[5] });
    put(g, 8, 11, PAL.ember[5]); put(g, 9, 9, PAL.ember[4]); put(g, 6, 12, PAL.ember[2]);
  },
  // shield
  (g) => {
    const pts = [[3, 2], [13, 2], [13, 9], [10, 13], [8, 15], [6, 13], [3, 9]];
    paint(g, pts, PAL.steel, { outline: PAL.steel[0], mid: PAL.steel[2], light: PAL.steel[4], dark: PAL.steel[1] });
    const field = [[5, 4], [11, 4], [11, 9], [9, 12], [8, 13], [7, 12], [5, 9]];
    paint(g, field, PAL.cape, { outline: PAL.cape[0], mid: PAL.cape[2], light: PAL.cape[3], dark: PAL.cape[1] });
    line(g, 8, 5, 8, 11, GOLD[3]);
    line(g, 6, 7, 10, 7, GOLD[2]);
  },
  // sword
  (g) => {
    limb(g, [4, 12], [11, 3], 1.4, 0.8, PAL.steel, { outline: PAL.steel[0], mid: PAL.steel[3], light: PAL.steel[5], dark: PAL.steel[1] });
    limb(g, [2, 10], [6, 12], 1, 1, GOLD, { outline: GOLD[0], mid: GOLD[2], bevel: false });
    limb(g, [3, 13], [2, 15], 1, 0.8, PAL.leather, { outline: PAL.leather[0], mid: PAL.leather[2], bevel: false });
    put(g, 10, 4, PAL.steel[5]);
  },
  // stamina bolt
  (g) => {
    const pts = [[9, 1], [5, 8], [8, 8], [6, 15], [12, 6], [9, 6], [12, 3]];
    paint(g, pts, PAL.blue, { outline: PAL.blue[0], mid: PAL.blue[2], light: PAL.blue[3], dark: PAL.blue[1] });
    put(g, 8, 4, "#e8ffff");
  },
  // spark
  (g) => {
    const pts = [[8, 1], [9, 6], [14, 8], [9, 9], [8, 15], [7, 9], [1, 8], [7, 6]];
    paint(g, pts, PAL.ember, { outline: PAL.ember[0], mid: PAL.ember[2], light: PAL.ember[4], dark: PAL.ember[1] });
    put(g, 8, 7, PAL.ember[5]);
  },
  // rune tablet
  (g) => {
    paint(g, [[3, 2], [13, 2], [13, 14], [3, 14]], PAL.steel, { outline: PAL.steel[0], mid: PAL.steel[2], light: PAL.steel[3], dark: PAL.steel[1] });
    line(g, 8, 4, 8, 12, PAL.green[4]);
    line(g, 8, 4, 11, 7, PAL.green[3]);
    line(g, 8, 7, 5, 10, PAL.green[3]);
    put(g, 8, 12, PAL.green[5]);
  },
];

function ring(g, cx, cy, r, ramp) {
  paint(g, ellipsePts(cx, cy, r, r, 12), ramp, { outline: ramp[0], mid: ramp[1], bevel: false });
  paint(g, ellipsePts(cx, cy, r - 1.1, r - 1.1, 12), [INK, INK, INK, INK], { outline: INK, mid: INK, bevel: false });
}

await exportSheet({
  name: "icons", w: 16, h: 16, cols: 8, rows: 2, frames: 16,
  draw: (g, i) => {
    ICONS[i](g);
    outlineUnion(g, INK, false);
  },
});
console.log("icons done");
