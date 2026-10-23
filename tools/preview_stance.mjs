import { mkdir } from "node:fs/promises";
import { launch } from "./cdp.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch({ width: 1000, height: 600 });

async function full(name) {
  await b.screenshot(`${OUT}/${name}.png`);
}

async function zoom(name, cx, cy, w, h) {
  const stage = await b.eval(() => {
    const r = document.getElementById("stage").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const k = stage.w / 480;
  await b.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    clip: {
      x: Math.max(0, stage.x + cx - (w * k) / 2),
      y: Math.max(0, stage.y + cy - (h * k) / 2),
      width: w * k,
      height: h * k,
      scale: 2,
    },
  }).then(async (res) => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${OUT}/${name}.png`, Buffer.from(res.data, "base64"));
  });
}

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

  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("gatehouse", "hall");
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
    g.mode = "paused";
  });

  const heroAt = async (view) => {
    await b.eval((v) => {
      const A = window.__ASHEN, g = A.game, p = g.player;
      p.x = 12.5 * 32; p.y = 9 * 32; p.invuln = 0;
      p.view = v; p.face = 1; p.state = "idle";
      p.animName = "idle"; p.anim = { row: 0, count: 8, fps: 6, t: 0.001, loop: true };
      g.mode = "paused"; g.cam.shake = 0; g.cam.x = p.x - 240; g.cam.y = p.y - 135;
      g.roomBanner = 0;
      A.render();
    }, view);
    await sleep(120);
    const pos = await b.eval(() => {
      const A = window.__ASHEN, g = A.game, p = g.player;
      return { x: (p.x - g.cam.x) * 2, y: (p.y - g.cam.y) * 2 };
    });
    const name = ["side", "front", "back"][view];
    await zoom(`stance-hero-${name}`, pos.x, pos.y - 28, 120, 110);
    await full(`stance-hero-${name}-wide`);
  };

  for (const v of [0, 1, 2]) await heroAt(v);

  // skeleton idle close to the player, clear of walls
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game, p = g.player;
    g.mode = "play";
    A.enterRoom("gatehouse", "hall");
    const es = g.enemies.filter((e) => e.type === "skeleton" && e.state !== "dead");
    const e = es[0];
    for (const o of g.enemies) if (o !== e && o.state !== "dead" && o.state !== "dying") A.hitEnemy(o, 999, 0, false);
    e.x = 12.5 * 32; e.y = 12.2 * 32; e.state = "idle"; e.face = 1;
    e.anim = { row: 0, count: 6, fps: 4.5, t: 0.001, loop: true };
    p.x = 12.5 * 32; p.y = 17.5 * 32; p.view = 0; p.state = "idle";
    p.anim = { row: 0, count: 8, fps: 6, t: 0.001, loop: true };
    g.mode = "paused"; g.cam.shake = 0; g.cam.x = p.x - 240; g.cam.y = (e.y + 10) - 135;
    g.roomBanner = 0;
    A.render();
  });
  await sleep(150);
  const sPos = await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    const e = g.enemies.find((x) => x.type === "skeleton" && x.state !== "dead");
    return { x: (e.x - g.cam.x) * 2, y: (e.y - g.cam.y) * 2 };
  });
  await zoom("stance-skeleton", sPos.x, sPos.y - 20, 110, 100);
  await full("stance-skeleton-wide");

  // boss idle
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game, p = g.player;
    g.mode = "play";
    A.enterRoom("warden_gate", "hall");
    g.bossIntro = 0;
    g.mode = "paused"; g.cam.shake = 0;
    const boss = g.boss;
    p.x = boss.x; p.y = boss.y + 90; p.view = 0; p.state = "idle";
    p.anim = { row: 0, count: 8, fps: 6, t: 0.001, loop: true };
    g.cam.x = boss.x - 240; g.cam.y = boss.y - 150;
    g.roomBanner = 0;
    A.render();
  });
  await sleep(150);
  const bPos = await b.eval(() => {
    const A = window.__ASHEN, g = A.game, boss = g.boss;
    return { x: (boss.x - g.cam.x) * 2, y: (boss.y - g.cam.y) * 2 };
  });
  await zoom("stance-boss", bPos.x, bPos.y - 44, 160, 150);
  await full("stance-boss-wide");

  console.log("errors:", b.errors.length ? b.errors : "none");
} finally {
  await b.close();
}
