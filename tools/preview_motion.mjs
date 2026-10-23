import { mkdir, writeFile } from "node:fs/promises";
import { launch } from "./cdp.mjs";
import { decodePNG, encodePNG, crop } from "./art/png.mjs";

const OUT = "art/review";
const FRAMES = `${OUT}/frames`;
await mkdir(FRAMES, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch({ width: 1000, height: 600 });

let stage = null;
async function readStage() {
  stage = await b.eval(() => {
    const r = document.getElementById("stage").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}
async function clipShot(file, cx, cy, w, h, scale = 1) {
  const k = stage.w / 480;
  const clip = {
    x: Math.max(0, stage.x + cx - (w * k) / 2),
    y: Math.max(0, stage.y + cy - (h * k) / 2),
    width: w * k,
    height: h * k,
    scale,
  };
  const res = await b.send("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: false, clip,
  });
  await writeFile(file, Buffer.from(res.data, "base64"));
}
async function cssPos(kind) {
  return b.eval((k) => {
    const A = window.__ASHEN, g = A.game;
    const t = k === "hero" ? g.player : k === "boss" ? g.boss
      : g.enemies.find((e) => e.type === "skeleton" && e.state !== "dead");
    return { x: (t.x - g.cam.x) * (document.getElementById("stage").getBoundingClientRect().width / 480),
      y: (t.y - g.cam.y) * (document.getElementById("stage").getBoundingClientRect().width / 480) };
  }, kind);
}
async function strip(files, out, size, cols) {
  const imgs = files.map((f) => decodePNG(f));
  const cw = imgs[0].w, ch = imgs[0].h;
  const rows = Math.ceil(imgs.length / cols), pad = 3;
  const W = cols * (cw + pad) + pad, H = rows * (ch + pad) + pad;
  const outImg = { w: W, h: H, data: Buffer.alloc(W * H * 4) };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    outImg.data[o] = 16; outImg.data[o + 1] = 13; outImg.data[o + 2] = 20; outImg.data[o + 3] = 255;
  }
  imgs.forEach((im, i) => {
    const ox = pad + (i % cols) * (cw + pad), oy = pad + Math.floor(i / cols) * (ch + pad);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const s = (y * cw + x) * 4, d = ((oy + y) * W + (ox + x)) * 4;
      outImg.data[d] = im.data[s]; outImg.data[d + 1] = im.data[s + 1];
      outImg.data[d + 2] = im.data[s + 2]; outImg.data[d + 3] = im.data[s + 3];
    }
  });
  await writeFile(out, encodePNG(outImg));
  console.log("strip", out, W, H);
}

function frameName(tag, i) { return `${FRAMES}/${tag}-${i}.png`; }

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000);
  await sleep(600);
  await b.key("Enter", "Enter", 55, 13);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  await sleep(300);
  await b.eval(() => {
    document.getElementById("hud").style.visibility = "hidden";
    const p = document.querySelector(".prompt");
    if (p) p.style.visibility = "hidden";
  });
  await readStage();

  // ---------------- hero walk + attacks, side view ----------------
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("gatehouse", "hall");
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
    const p = g.player;
    p.x = 12.5 * 32; p.y = 9 * 32; p.invuln = 0; p.view = 0; p.face = 1;
    g.mode = "paused"; g.cam.shake = 0; g.cam.x = p.x - 240; g.cam.y = p.y - 135;
    g.roomBanner = 0;
  });
  const heroPose = async (state, row, count, fps, t, face = 1, aim = 0) => {
    await b.eval((s, r, c, f, time, fc, ang) => {
      const A = window.__ASHEN, g = A.game, p = g.player;
      p.state = s; p.animName = s;
      p.anim = { row: r, count: c, fps: f, t: time, loop: s === "walk" };
      p.face = fc; p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
      A.render();
    }, state, row, count, fps, t, face, aim);
    await sleep(40);
  };

  let files = [];
  for (let i = 0; i < 12; i += 2) {
    await heroPose("walk", 1, 12, 12, i / 12 + 0.001);
    const pos = await cssPos("hero");
    const f = frameName("hero-walk", i);
    await clipShot(f, pos.x, pos.y - 24, 150, 120);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-hero-walk-side.png`, 150, 6);

  files = [];
  for (let i = 0; i < 10; i++) {
    await heroPose("attack", 2, 10, 25, i / 25 + 0.001);
    const pos = await cssPos("hero");
    const f = frameName("hero-atk0", i);
    await clipShot(f, pos.x, pos.y - 26, 170, 120);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-hero-atk0-side.png`, 170, 5);

  files = [];
  for (let i = 0; i < 16; i += 2) {
    await heroPose("attack", 4, 16, 16 / 0.72, i / (16 / 0.72) + 0.001);
    const pos = await cssPos("hero");
    const f = frameName("hero-atk2", i);
    await clipShot(f, pos.x, pos.y - 26, 180, 130);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-hero-atk2-side.png`, 180, 5);

  // hero attack zoom stills for grip check
  for (const [i, tag] of [[2, "wind"], [4, "swing"], [7, "follow"]]) {
    await heroPose("attack", 2, 10, 25, i / 25 + 0.001);
    const pos = await cssPos("hero");
    await clipShot(`${OUT}/motion-hero-atk0-${tag}.png`, pos.x, pos.y - 26, 110, 100, 3);
  }

  // ---------------- skeleton walk + attack ----------------
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    g.mode = "play";
    A.enterRoom("gatehouse", "hall");
    const es = g.enemies.filter((e) => e.type === "skeleton" && e.state !== "dead");
    const e = es[0];
    for (const o of g.enemies) if (o !== e && o.state !== "dead" && o.state !== "dying") A.hitEnemy(o, 999, 0, false);
    e.x = 12.5 * 32; e.y = 10.5 * 32; e.state = "idle"; e.face = 1; e.aware = false;
    const p = g.player;
    p.x = 12.5 * 32; p.y = 16.5 * 32;
    g.mode = "paused"; g.cam.shake = 0; g.cam.x = p.x - 240; g.cam.y = e.y - 135;
    g.roomBanner = 0;
  });
  const foePose = async (kind, row, count, fps, t) => {
    await b.eval((k, r, c, f, time) => {
      const A = window.__ASHEN, g = A.game;
      const e = k === "boss" ? g.boss : g.enemies.find((x) => x.type === "skeleton" && x.state !== "dead");
      e.state = "idle"; e.face = 1;
      e.anim = { row: r, count: c, fps: f, t: time, loop: false };
      A.render();
    }, kind, row, count, fps, t);
    await sleep(40);
  };
  files = [];
  for (let i = 0; i < 6; i++) {
    await foePose("skeleton", 0, 6, 10, i / 10 + 0.001);
    const pos = await cssPos("skeleton");
    const f = frameName("skel-walk", i);
    await clipShot(f, pos.x, pos.y - 18, 130, 110);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-skeleton-walk.png`, 130, 6);

  files = [];
  for (let i = 0; i < 6; i++) {
    await foePose("skeleton", 1, 6, 7.7, i / 7.7 + 0.001);
    const pos = await cssPos("skeleton");
    const f = frameName("skel-atk", i);
    await clipShot(f, pos.x, pos.y - 20, 150, 120);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-skeleton-atk.png`, 150, 6);

  for (const [i, tag] of [[2, "wind"], [3, "swing"]]) {
    await foePose("skeleton", 1, 6, 7.7, i / 7.7 + 0.001);
    const pos = await cssPos("skeleton");
    await clipShot(`${OUT}/motion-skeleton-atk-${tag}.png`, pos.x, pos.y - 20, 110, 100, 3);
  }

  // ---------------- warden walk + cleave + slam ----------------
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game, p = g.player;
    g.mode = "play";
    A.enterRoom("warden_gate", "hall");
    g.bossIntro = 0;
    const boss = g.boss;
    boss.introDone = true; boss.state = "idle"; boss.face = 1;
    p.x = boss.x; p.y = boss.y + 210; p.invuln = 999;
    g.mode = "paused"; g.cam.shake = 0; g.cam.x = boss.x - 240; g.cam.y = boss.y - 150;
    g.roomBanner = 0;
  });
  files = [];
  for (let i = 0; i < 6; i++) {
    await foePose("boss", 1, 6, 6, i / 6 + 0.001);
    const pos = await cssPos("boss");
    const f = frameName("warden-walk", i);
    await clipShot(f, pos.x, pos.y - 64, 230, 190);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-warden-walk.png`, 230, 6);

  files = [];
  for (let i = 0; i < 6; i++) {
    await foePose("boss", 2, 6, 4.1, i / 4.1 + 0.001);
    const pos = await cssPos("boss");
    const f = frameName("warden-cleave", i);
    await clipShot(f, pos.x, pos.y - 64, 260, 200);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-warden-cleave.png`, 260, 6);

  files = [];
  for (let i = 0; i < 6; i++) {
    await foePose("boss", 3, 6, 3.6, i / 3.6 + 0.001);
    const pos = await cssPos("boss");
    const f = frameName("warden-slam", i);
    await clipShot(f, pos.x, pos.y - 64, 260, 200);
    files.push(f);
  }
  await strip(files, `${OUT}/motion-warden-slam.png`, 260, 6);

  for (const [row, fps, i, tag] of [[2, 4.1, 3, "cleave-swing"], [3, 3.6, 2, "slam-wind"]]) {
    await foePose("boss", row, 6, fps, i / fps + 0.001);
    const pos = await cssPos("boss");
    await clipShot(`${OUT}/motion-warden-${tag}.png`, pos.x, pos.y - 64, 180, 160, 3);
  }

  // ---------------- hero front/back walk + atk0 regression ----------------
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    g.mode = "play";
    A.enterRoom("gatehouse", "hall");
    g.enemies.length = 0;
    const p = g.player;
    p.x = 12.5 * 32; p.y = 9 * 32; p.invuln = 0;
    g.mode = "paused"; g.cam.shake = 0; g.cam.x = p.x - 240; g.cam.y = p.y - 135;
    g.roomBanner = 0;
  });
  for (const v of [1, 2]) {
    const name = v === 1 ? "front" : "back";
    const aim = v === 1 ? Math.PI / 2 : -Math.PI / 2;
    await b.eval((view, ang) => {
      const A = window.__ASHEN, g = A.game, p = g.player;
      p.view = view; p.face = 1; p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
    }, v, aim);
    files = [];
    for (let i = 0; i < 12; i += 2) {
      await heroPose("walk", 1, 12, 12, i / 12 + 0.001, 1, aim);
      const pos = await cssPos("hero");
      const f = frameName(`hero-${name}-walk`, i);
      await clipShot(f, pos.x, pos.y - 24, 150, 120);
      files.push(f);
    }
    await strip(files, `${OUT}/motion-hero-${name}-walk.png`, 150, 6);

    files = [];
    for (let i = 0; i < 10; i++) {
      await heroPose("attack", 2, 10, 25, i / 25 + 0.001, 1, aim);
      const pos = await cssPos("hero");
      const f = frameName(`hero-${name}-atk0`, i);
      await clipShot(f, pos.x, pos.y - 26, 170, 130);
      files.push(f);
    }
    await strip(files, `${OUT}/motion-hero-${name}-atk0.png`, 170, 5);
  }

  console.log("errors:", b.errors.length ? b.errors : "none");
} finally {
  await b.close();
}
