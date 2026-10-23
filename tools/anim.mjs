import { mkdir, readFile, writeFile } from "node:fs/promises";
import { launch } from "./cdp.mjs";
import { decodePNG, encodePNG, crop } from "./art/png.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch();
const stageShot = async (name) => b.screenshot(`${OUT}/${name}`);

const VIEWS = [
  { id: 0, name: "side", face: 1, aim: 0 },
  { id: 1, name: "front", face: 1, aim: Math.PI / 2 },
  { id: 2, name: "back", face: 1, aim: -Math.PI / 2 },
];

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000);
  await sleep(700);
  await b.key("Enter", "Enter", 55, 13);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  await sleep(400);

  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("chapel", "hall");
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
    const p = g.player;
    p.x = 9.5 * 32; p.y = 7.4 * 32; p.invuln = 0;
    g.mode = "paused";
    g.cam.x = Math.max(0, Math.min(p.x - 240, g.room.w * 32 - 480));
    g.cam.y = Math.max(0, Math.min(p.y - 135, g.room.h * 32 - 270));
    g.cam.shake = 0;
    A.render();
  });
  await sleep(150);

  const setPose = async (view, row, count, fps, t, aim, slash) => {
    await b.eval((v, r, c, f, time, ang, sl) => {
      const A = window.__ASHEN, g = A.game, p = g.player;
      p.view = v;
      p.face = 1;
      p.state = r === 1 ? "walk" : r === 2 ? "attack" : "idle";
      p.stateT = 0;
      p.animName = r === 1 ? "walk" : r === 2 ? "atk0" : "idle";
      p.anim = { row: r, count: c, fps: f, t: time, loop: r !== 2 };
      p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
      p.atkAngle = ang;
      p.atkDir = { x: Math.cos(ang), y: Math.sin(ang) };
      p.atkStep = 0;
      p.atkTime = time;
      g.slashes = sl ? [{ x: p.x, y: p.y - 18, ang, range: 49, arc: 1.6, life: 0.2, max: 0.24, step: 0 }] : [];
      A.render();
    }, view.id, row, count, fps, t, aim, slash);
    await sleep(80);
  };

  for (const view of VIEWS) {
    await setPose(view, 0, 8, 6, 0.001, view.aim, false);
    await stageShot(`v2-${view.name}-idle.png`);
  }

  const walkFiles = {};
  for (const view of VIEWS) {
    walkFiles[view.id] = [];
    for (let i = 0; i < 12; i++) {
      await setPose(view, 1, 12, 12, i / 12 + 0.001, view.aim, false);
      const name = `anim2-${view.name}-walk-${i}.png`;
      await stageShot(name);
      walkFiles[view.id].push(`${OUT}/${name}`);
    }
  }

  const atkFiles = {};
  for (const view of VIEWS) {
    atkFiles[view.id] = [];
    for (let i = 0; i < 10; i++) {
      await setPose(view, 2, 10, 25, i / 25 + 0.001, view.aim, i >= 3 && i <= 6);
      const name = `anim2-${view.name}-atk-${i}.png`;
      await stageShot(name);
      atkFiles[view.id].push(`${OUT}/${name}`);
    }
  }

  const cropCell = async (file, cx, cy, size) => {
    const img = decodePNG(file);
    return crop(img, Math.max(0, Math.min(img.w - size, cx - size / 2)), Math.max(0, Math.min(img.h - size, cy - size / 2)), size, size);
  };
  const buildStrip = async (files, out, size, cols, cyOff) => {
    const imgs = [];
    for (const f of files) {
      const im = decodePNG(f);
      imgs.push(await cropCell(f, im.w / 2, im.h / 2 + cyOff, size));
    }
    const rows = Math.ceil(imgs.length / cols);
    const pad = 4;
    const W = cols * (size + pad) + pad, H = rows * (size + pad) + pad;
    const outImg = { w: W, h: H, data: Buffer.alloc(W * H * 4) };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      outImg.data[o] = 14; outImg.data[o + 1] = 12; outImg.data[o + 2] = 18; outImg.data[o + 3] = 255;
    }
    imgs.forEach((im, i) => {
      const ox = pad + (i % cols) * (size + pad), oy = pad + Math.floor(i / cols) * (size + pad);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const s = (y * size + x) * 4, d = ((oy + y) * W + (ox + x)) * 4;
        outImg.data[d] = im.data[s]; outImg.data[d + 1] = im.data[s + 1]; outImg.data[d + 2] = im.data[s + 2]; outImg.data[d + 3] = im.data[s + 3];
      }
    });
    await writeFile(out, encodePNG(outImg));
    console.log("strip", out, W, H);
  };

  for (const view of VIEWS) {
    await buildStrip(walkFiles[view.id], `${OUT}/strip-walk-${view.name}.png`, 190, 4, -38);
    await buildStrip(atkFiles[view.id], `${OUT}/strip-atk-${view.name}.png`, 220, 5, -56);
  }

  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    g.mode = "play";
    g.run.relics.add("ember_heart");
    g.run.relics.add("grave_eye");
    g.run.relics.add("bloodfang");
    g.souls = 37;
    for (const id of ["gatehouse", "hall", "ossuary", "chapel", "gallery"]) g.stats.rooms.add(id);
    A.openLedger();
    A.ledgerState.relicId = "bloodfang";
    A.renderLedger();
  });
  await sleep(500);
  await stageShot("v2-ledger-relics.png");
  await b.eval(() => {
    const A = window.__ASHEN;
    A.setLedgerTab("gear");
    A.ledgerState.gearId = "longsword";
    A.renderLedger();
  });
  await sleep(350);
  await stageShot("v2-ledger-gear.png");
  await b.eval(() => window.__ASHEN.closeLedger());

  const mmRect = await b.eval(() => {
    const el = document.getElementById("minimap");
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
  });
  const mmShot = await b.send("Page.captureScreenshot", { format: "png", clip: mmRect });
  await writeFile(`${OUT}/minimap-crop.png`, Buffer.from(mmShot.data, "base64"));
  console.log("console errors:", b.errors.length ? b.errors : "none");
} finally {
  await b.close();
}
