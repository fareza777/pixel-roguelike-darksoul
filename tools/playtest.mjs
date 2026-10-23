import { mkdir } from "node:fs/promises";
import { launch } from "./cdp.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const K = {
  enter: ["Enter", "Enter", 13],
  esc: ["Escape", "Escape", 27],
  d: ["KeyD", "d", 68],
  a: ["KeyA", "a", 65],
  w: ["KeyW", "w", 87],
  s: ["KeyS", "s", 83],
  j: ["KeyJ", "j", 74],
  k: ["KeyK", "k", 75],
  e: ["KeyE", "e", 69],
  r: ["KeyR", "r", 82],
};

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    failures++;
    console.log("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

const b = await launch();
const results = {};

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000, "title ready");
  await sleep(900);
  const layout = await b.eval(() => {
    const s = document.getElementById("stage").getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, stage: [s.x, s.y, s.width, s.height], hidden: document.hidden, title: !document.getElementById("title").classList.contains("hide") };
  });
  console.log("layout", layout);
  await b.screenshot(`${OUT}/01-title.png`);

  await b.key(...K.enter);
  await b.waitFor(() => window.__ASHEN.game.mode === "play", 5000, "run start");
  await sleep(1400);
  await b.screenshot(`${OUT}/02-start.png`);
  const start = await b.eval(() => {
    const g = window.__ASHEN.game;
    return {
      mode: g.mode, room: g.roomId,
      player: { x: +g.player.x.toFixed(1), y: +g.player.y.toFixed(1), hp: g.player.hp },
      enemies: g.enemies.length, chests: Object.keys(g.roomState.chests).length,
      hearts: document.querySelectorAll("#hearts .heart").length,
      hudHidden: document.getElementById("hud").classList.contains("hud-hidden"),
      titleHidden: document.getElementById("title").classList.contains("hide"),
      loadingHidden: document.getElementById("loading").classList.contains("hide"),
    };
  });
  console.log("start", start);
  check(start.mode === "play" && start.room === "gatehouse", "starts in gatehouse");
  check(start.hearts === 5 && start.player.hp === 10, "five hearts rendered at full hp");
  check(!start.hudHidden, "HUD visible in play");

  const p0 = start.player;
  await b.keyDown(...K.d);
  await sleep(280);
  await b.screenshot(`${OUT}/03-walk.png`);
  await b.keyUp(...K.d);
  await sleep(60);
  await b.keyDown(...K.w);
  await sleep(180);
  await b.keyUp(...K.w);
  await sleep(80);
  const p1 = await b.eval(() => {
    const p = window.__ASHEN.game.player;
    return { x: +p.x.toFixed(1), y: +p.y.toFixed(1), walkingMoved: true, anim: p.animName };
  });
  console.log("after move", p1);
  check(p1.x > p0.x + 8, "knight moved right");
  check(p1.y < p0.y - 3, "knight moved up");

  // Stand near the west skeleton and strike.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    const e = g.enemies[0];
    g.player.x = e.x + 33;
    g.player.y = e.y + 6;
    g.player.moveDir = { x: -1, y: 0 };
    g.player.facing = { x: -1, y: 0 };
    g.player.face = -1;
    g.player.invuln = 60;
    g.player.state = "idle";
  });
  await sleep(120);
  const hpBefore = await b.eval(() => window.__ASHEN.game.enemies[0]?.hp);
  await b.key(...K.j);
  await sleep(150);
  await b.screenshot(`${OUT}/04-attack.png`);
  await sleep(260);
  const hpAfter = await b.eval(() => window.__ASHEN.game.enemies[0]?.hp);
  console.log("enemy hp", hpBefore, "->", hpAfter);
  check(typeof hpAfter === "number" && hpAfter < hpBefore, "sword strike damages skeleton");
  // Keep striking until the skeleton falls (7-8 damage per light hit).
  let comboHits = 1;
  for (let i = 0; i < 8; i++) {
    const dead = await b.eval(() => window.__ASHEN.game.kills > 0);
    if (dead) break;
    await b.key(...K.j);
    comboHits++;
    await sleep(450);
  }
  await b.screenshot(`${OUT}/05-combo.png`);
  const afterCombo = await b.eval(() => ({
    kills: window.__ASHEN.game.kills,
    souls: window.__ASHEN.game.souls,
    texts: window.__ASHEN.game.texts.length,
    alive: window.__ASHEN.game.enemies.filter((e) => e.state !== "dead" && e.state !== "dying").length,
  }));
  console.log("combo", { ...afterCombo, hits: comboHits });
  check(afterCombo.kills >= 1, "skeleton killed after combo");

  // Dash toward the chest side.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    g.player.x = 10.5 * 32;
    g.player.y = 9.5 * 32;
    g.player.hp = g.player.maxHp;
    g.player.invuln = 60;
  });
  await b.keyDown(...K.d);
  await sleep(40);
  await b.key(...K.k);
  await sleep(80);
  await b.screenshot(`${OUT}/06-dash.png`);
  await b.keyUp(...K.d);
  await sleep(260);
  const dash = await b.eval(() => {
    const p = window.__ASHEN.game.player;
    return { cd: +p.dashCd.toFixed(2), ghosts: window.__ASHEN.game.ghosts.length, invuln: +p.invuln.toFixed(2) };
  });
  console.log("dash", dash);
  check(dash.cd > 0, "dash cooldown consumed");

  // Open the gatehouse soul chest.
  await b.eval(() => {
    const g = window.__ASHEN.game;
    const c = g.room.chests[0];
    g.player.x = (c.x + 0.5) * 32 - 26;
    g.player.y = (c.y + 0.7) * 32;
    g.player.invuln = 60;
  });
  await sleep(160);
  const promptText = await b.eval(() => document.getElementById("prompt").textContent);
  console.log("prompt", promptText);
  check(/Open chest/i.test(promptText), "chest prompt appears");
  await b.key(...K.e);
  await sleep(320);
  await b.screenshot(`${OUT}/07-chest.png`);
  const chest = await b.eval(() => {
    const g = window.__ASHEN.game;
    const cell = Object.values(g.roomState.chests)[0];
    return { opened: cell.opened, souls: g.souls, toast: document.getElementById("toast").textContent.trim(), toastShown: document.getElementById("toast").classList.contains("show") };
  });
  console.log("chest", chest);
  check(chest.opened, "chest opens on E");
  check(chest.souls >= 40, "chest grants souls");

  // Pause panel.
  await b.key(...K.esc);
  await sleep(280);
  await b.screenshot(`${OUT}/08-pause.png`);
  const paused = await b.eval(() => ({
    mode: window.__ASHEN.game.mode,
    visible: !document.getElementById("pause").classList.contains("hide"),
    relicText: document.getElementById("pauserelics").textContent.trim(),
  }));
  console.log("pause", paused);
  check(paused.mode === "paused" && paused.visible, "escape opens pause");
  await b.key(...K.esc);
  await sleep(150);

  // Clear the room through the public damage hook, then walk into the north door.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
  });
  await sleep(1200);
  const cleared = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { cleared: g.roomState.cleared, mode: g.mode, alive: g.enemies.filter((e) => e.state !== "dead" && e.state !== "dying").length };
  });
  console.log("cleared", cleared);
  check(cleared.cleared, "room clears when keepers die");
  await b.eval(() => {
    const g = window.__ASHEN.game;
    g.player.x = 10.5 * 32;
    g.player.y = 0.62 * 32;
    g.player.invuln = 60;
  });
  await sleep(250);
  await b.waitFor(() => window.__ASHEN.game.transition || window.__ASHEN.game.roomId === "hall", 4000, "door transition");
  await sleep(1400);
  await b.screenshot(`${OUT}/09-hall.png`);
  const hall = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { room: g.roomId, transition: !!g.transition, enemies: g.enemies.length, roomsVisited: [...g.stats.rooms], doorCd: +g.doorCd.toFixed(2), player: [Math.round(g.player.x), Math.round(g.player.y)] };
  });
  console.log("hall", hall);
  check(hall.room === "hall" && !hall.transition, "north door leads to hall");
  check(hall.enemies === 4, "hall spawns four keepers on entry");

  // Drop into the boss arena for intro + victory flow.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("warden_gate", "gatehouse");
    g.player.invuln = 999;
    g.player.hp = g.player.maxHp;
  });
  await sleep(650);
  await b.screenshot(`${OUT}/10-boss-intro.png`);
  const intro = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { room: g.roomId, bossIntro: +g.bossIntro.toFixed(2), boss: g.boss && { hp: g.boss.hp, state: g.boss.state, phase2: g.boss.phase2 }, barShown: document.getElementById("bossbar").classList.contains("show") };
  });
  console.log("boss intro", intro);
  check(intro.room === "warden_gate" && intro.boss, "boss room loads the Warden");
  check(intro.barShown, "boss health bar appears");
  await sleep(2200);
  await b.screenshot(`${OUT}/11-boss.png`);
  const boss = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { introDone: g.boss.introDone, state: g.boss.state, playerHp: g.player.hp, width: document.getElementById("bossfill").style.width };
  });
  console.log("boss", boss);
  check(boss.state !== "dead" && boss.playerHp > 0, "boss survives hold and player untouched");

  // Kill the Warden for the victory screen.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.hitEnemy(g.boss, 999, 0, false);
  });
  await sleep(800);
  await b.screenshot(`${OUT}/12-boss-death.png`);
  await b.waitFor(() => window.__ASHEN.game.mode === "won", 9000, "victory");
  await sleep(900);
  await b.screenshot(`${OUT}/13-victory.png`);
  const won = await b.eval(() => {
    const g = window.__ASHEN.game;
    return {
      mode: g.mode, wonClass: document.getElementById("end").classList.contains("won"),
      title: document.getElementById("endtitle").textContent,
      stats: document.getElementById("endstats").textContent.replace(/\s+/g, " ").trim(),
      visible: !document.getElementById("end").classList.contains("hide"),
    };
  });
  console.log("victory", won);
  check(won.mode === "won" && won.visible && won.wonClass, "victory screen styled");
  check(won.title === "Ashen Vow", "victory title");

  // Restart, then die to verify the death flow and restart loop.
  await b.key(...K.r);
  await b.waitFor(() => window.__ASHEN.game.mode === "play" && window.__ASHEN.game.roomId === "gatehouse", 5000, "restart");
  await sleep(600);
  const restarted = await b.eval(() => ({
    mode: window.__ASHEN.game.mode, room: window.__ASHEN.game.roomId, hp: window.__ASHEN.game.player.hp,
    sigils: window.__ASHEN.game.sigils, rooms: window.__ASHEN.game.stats.rooms.size,
    endHidden: document.getElementById("end").classList.contains("hide"),
  }));
  console.log("restart", restarted);
  check(restarted.hp === 10 && restarted.sigils === 0 && restarted.rooms === 1, "R restarts a fresh run");
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    g.player.hp = 1;
    g.player.invuln = 0;
    A.hurtPlayer(4, g.player.x + 20, g.player.y);
  });
  await sleep(4300);
  await b.screenshot(`${OUT}/14-death.png`);
  const dead = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { mode: g.mode, title: document.getElementById("endtitle").textContent, wonClass: document.getElementById("end").classList.contains("won") };
  });
  console.log("death", dead);
  check(dead.mode === "dead" && dead.title === "You Died" && !dead.wonClass, "death screen shows");

  // Final frame sample at raw canvas resolution for pixel review.
  const data = await b.eval(() => document.getElementById("game").toDataURL("image/png"));
  const { writeFile } = await import("node:fs/promises");
  await writeFile(`${OUT}/15-death-canvas.png`, Buffer.from(data.split(",")[1], "base64"));

  results.errors = b.errors;
  console.log("console errors:", b.errors.length ? b.errors : "none");
  console.log(`\n${failures === 0 ? "PLAYTEST PASSED" : failures + " CHECK(S) FAILED"}`);
} catch (err) {
  failures++;
  console.error("PLAYTEST ERROR:", err.message);
  console.error("console errors:", b.errors);
  try { await b.screenshot(`${OUT}/error.png`); } catch {}
} finally {
  await b.close();
  process.exitCode = failures ? 1 : 0;
}
