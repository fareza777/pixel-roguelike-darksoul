import { mkdir } from "node:fs/promises";
import { launch } from "./cdp.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch();
const key = (code, k, vk) => b.key(code, k, 55, vk);

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000);
  await sleep(900);
  await b.screenshot(`${OUT}/v01-title.png`);
  await key("Enter", "Enter", 13);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  await sleep(1800);
  await b.screenshot(`${OUT}/v02-gatehouse.png`);

  // Attack with normal invulnerability, capture the hit.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    const e = g.enemies[0];
    g.player.x = e.x + 33;
    g.player.y = e.y + 6;
    g.player.moveDir = { x: -1, y: 0 };
    g.player.facing = { x: -1, y: 0 };
    g.player.face = -1;
    g.player.invuln = 0.4;
    g.player.state = "idle";
  });
  await sleep(100);
  await key("KeyJ", "j", 74);
  await sleep(150);
  await b.screenshot(`${OUT}/v03-strike.png`);
  // Timed combo: press again within the active window.
  await sleep(180);
  await key("KeyJ", "j", 74);
  await sleep(260);
  await key("KeyJ", "j", 74);
  await sleep(600);
  const combat = await b.eval(() => {
    const g = window.__ASHEN.game;
    const e = g.enemies[0];
    return {
      hp: e.hp, state: e.state, kills: g.kills,
      player: { hp: g.player.hp, x: Math.round(g.player.x), y: Math.round(g.player.y), invuln: +g.player.invuln.toFixed(2) },
      dist: Math.round(Math.hypot(g.player.x - e.x, g.player.y - e.y)),
    };
  });
  console.log("combat", combat);
  await b.screenshot(`${OUT}/v04-after-combo.png`);

  // Ossuary shows a dense room with sigil, bones and braziers.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("ossuary", "hall");
    g.player.invuln = 0.4;
  });
  await sleep(1700);
  await b.screenshot(`${OUT}/v05-ossuary.png`);

  // Chest close-up in the ossuary.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    const c = g.room.chests[0];
    g.player.x = (c.x + 0.5) * 32 + 24;
    g.player.y = (c.y + 0.7) * 32;
    g.player.invuln = 0.2;
  });
  await sleep(600);
  await b.screenshot(`${OUT}/v06-ossuary-chest.png`);

  // Alerted wretch encounter at range.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    const w = g.enemies.find((e) => e.type === "wretch");
    if (w) {
      w.aware = true;
      g.player.x = w.x - 70;
      g.player.y = w.y + 10;
      g.player.invuln = 0.2;
      g.player.hp = g.player.maxHp;
    }
  });
  await sleep(1600);
  await b.screenshot(`${OUT}/v07-wretch.png`);

  // Boss arena framing with both combatants.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("warden_gate", "gatehouse");
    g.player.invuln = 0.4;
    g.player.hp = g.player.maxHp;
  });
  await sleep(600);
  await b.screenshot(`${OUT}/v08-boss-intro.png`);
  await sleep(2300);
  await b.eval(() => {
    const g = window.__ASHEN.game;
    g.player.x = 13.5 * 32;
    g.player.y = 10.2 * 32;
    g.player.invuln = 0.4;
    g.cam.x = 13 * 32 - 240;
    g.cam.y = 10 * 32 - 135;
  });
  await sleep(500);
  await b.screenshot(`${OUT}/v09-boss-arena.png`);
  await sleep(1200);
  await b.screenshot(`${OUT}/v10-boss-approach.png`);

  const state = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { mode: g.mode, room: g.roomId, boss: { hp: g.boss.hp, state: g.boss.state, x: Math.round(g.boss.x), y: Math.round(g.boss.y) }, playerHp: g.player.hp, errors: 0 };
  });
  console.log("boss state", state);
  console.log("console errors:", b.errors.length ? b.errors : "none");
} catch (err) {
  console.error("VISUAL ERROR", err.message);
  console.error(b.errors);
  try { await b.screenshot(`${OUT}/verror.png`); } catch {}
} finally {
  await b.close();
}
