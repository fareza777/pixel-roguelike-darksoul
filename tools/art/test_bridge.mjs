import { cmd, health, flush } from "./bridge.mjs";
import fs from "node:fs";

const h = await health();
console.log("health", h);
await cmd("create_canvas", { width: 64, height: 64, name: "BridgeTest" });
const grid = new Array(64 * 64).fill(null);
for (let y = 8; y < 56; y++) {
  for (let x = 8; x < 56; x++) {
    if ((x + y) % 16 < 8) grid[y * 64 + x] = "#e0a94a";
    else grid[y * 64 + x] = "#2c3142";
  }
}
grid[32 * 64 + 32] = "#ffc861";
await flush(grid, 64, 64);
fs.mkdirSync("C:/Pixelorama v7/art/preview", { recursive: true });
await cmd("export_image", { path: "C:/Pixelorama v7/art/preview/bridge_test.png", scale: 4 });
await cmd("close_canvas");
console.log("exported");
