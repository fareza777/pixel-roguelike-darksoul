import { mkdir } from "node:fs/promises";
import { launch } from "./cdp.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch();
const K = {
  enter: ["Enter", "Enter", 13], esc: ["Escape", "Escape", 27],
  d: ["KeyD", "d", 68], a: ["KeyA", "a", 65], w: ["KeyW", "w", 87], s: ["KeyS", "s", 83],
  j: ["KeyJ", "j", 74], k: ["KeyK", "k", 75], e: ["KeyE", "e", 69], r: ["KeyR", "r", 82],
};
let failures = 0;
function check(cond, msg) {
  if (cond) console.log("ok:", msg);
  else { failures++; console.log("FAIL:", msg); }
}
async function press(...k) { await b.key(k[0], k[1], 55, k[2]); }
async function teleport(x, y) {
  await b.eval((tx, ty) => {
    const g = window.__ASHEN.game;
    g.player.x = tx * 32;
    g.player.y = ty * 32;
    g.player.state = "idle";
    g.player.invuln = 900;
    g.player.kx = g.player.ky = 0;
  }, x, y);
  await sleep(120);
}
async function takeSigil(roomId, from) {
  await b.eval((id, frm) => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom(id, frm);
    g.player.invuln = 900;
    g.player.hp = g.player.maxHp;
    const s = g.room.sigils[0];
    g.player.x = (s.x + 0.5) * 32 - 22;
    g.player.y = (s.y + 0.72) * 32;
  }, roomId, from);
  await sleep(500);
  await press(...K.e);
  await sleep(350);
}

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000);
  await sleep(700);
  await press(...K.enter);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  await sleep(600);

  // Sealed gate text at zero sigils.
  await teleport(10.5, 12.4);
  await sleep(300);
  const sealedPrompt = await b.eval(() => document.getElementById("prompt").textContent);
  console.log("gate prompt:", sealedPrompt);
  check(/three sigils/i.test(sealedPrompt), "sigil gate prompts before sigils");
  await press(...K.e);
  await sleep(250);
  const sealed = await b.eval(() => ({
    title: document.getElementById("toasttitle").textContent,
    desc: document.getElementById("toastdesc").textContent,
    visible: document.getElementById("toast").classList.contains("show"),
  }));
  console.log("sealed toast:", sealed);
  check(sealed.title === "Sealed" && /socket/i.test(sealed.desc), "sealed gate explains the sockets");
  await b.screenshot(`${OUT}/m01-sealed-gate.png`);

  // Collect the three sigils through real E interactions.
  await takeSigil("ossuary", "hall");
  let sig = await b.eval(() => ({
    count: window.__ASHEN.game.sigils,
    lit: document.querySelectorAll("#sigils .sigil.lit").length,
    toast: document.getElementById("toasttitle").textContent,
    taken: window.__ASHEN.game.roomState.sigilTaken,
  }));
  console.log("sigil 1:", sig);
  check(sig.count === 1 && sig.taken && sig.lit === 1, "first sigil claimed and HUD lit");
  await b.screenshot(`${OUT}/m02-sigil.png`);

  await takeSigil("gallery", "ossuary");
  await takeSigil("ritual", "barracks");
  sig = await b.eval(() => ({
    count: window.__ASHEN.game.sigils,
    lit: document.querySelectorAll("#sigils .sigil.lit").length,
    gateToast: document.getElementById("toasttitle").textContent,
  }));
  console.log("sigils:", sig);
  check(sig.count === 3 && sig.lit === 3, "all three sigils lit");

  // Clear the start room and walk through the now-open gate.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("gatehouse", "hall");
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
  });
  await sleep(1000);
  await teleport(10.5, 12.25);
  await b.eval(() => { window.__ASHEN.game.doorCd = 0; });
  const openPrompt = await b.eval(() => document.getElementById("prompt").textContent.trim());
  check(!/sealed/i.test(openPrompt), "gate no longer prompts as sealed");
  await b.keyDown(...K.s);
  await sleep(420);
  await b.keyUp(...K.s);
  await b.waitFor(() => window.__ASHEN.game.transition || window.__ASHEN.game.roomId === "warden_gate", 4000, "gate transition");
  await sleep(1500);
  const bossRoom = await b.eval(() => {
    const g = window.__ASHEN.game;
    return { room: g.roomId, boss: !!g.boss, intro: +g.bossIntro.toFixed(2), hp: g.boss?.hp };
  });
  console.log("boss room:", bossRoom);
  check(bossRoom.room === "warden_gate" && bossRoom.boss, "three sigils open the Warden's Gate");
  await sleep(2200);
  await b.screenshot(`${OUT}/m03-boss-awake.png`);

  // Phase two triggers at half health.
  const phase = await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    g.player.invuln = 900;
    g.boss.hp = 101;
    A.hitEnemy(g.boss, 5, 0, false);
    return {
      phase2: g.boss.phase2, state: g.boss.state,
      toast: document.getElementById("toasttitle").textContent,
      barPhase: document.getElementById("bossbar").classList.contains("phase2"),
    };
  });
  console.log("phase 2:", phase);
  check(phase.phase2 && phase.barPhase, "Warden enters phase two at half health");
  check(/Unbound/i.test(phase.toast), "phase two announces itself");
  await sleep(700);
  await b.screenshot(`${OUT}/m04-phase2.png`);

  // Reset into a normal run for secret / altar / relic checks.
  await b.keyDown(...K.d);
  await sleep(100);
  await b.keyUp(...K.d);
  await b.eval(() => {
    const g = window.__ASHEN.game;
    g.mode = "play";
    window.__ASHEN.showEnd(false);
  });
  await sleep(500);
  await b.key(...K.r);
  await b.waitFor(() => window.__ASHEN.game.mode === "play" && window.__ASHEN.game.roomId === "gatehouse", 4000);
  await sleep(400);

  // Secret wall in the gallery (west wall now).
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("gallery", "ossuary");
    g.player.invuln = 900;
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
    g.player.x = 1.75 * 32;
    g.player.y = 7.55 * 32;
    g.player.moveDir = { x: -1, y: 0 };
    g.player.facing = { x: -1, y: 0 };
    g.player.face = -1;
  });
  await sleep(900);
  const secretDoor = await b.eval(() => {
    const g = window.__ASHEN.game;
    const d = g.room.doors.find((x) => x.secret);
    return { id: d.id, hp: g.roomState.secrets[d.id].hp, prompt: document.getElementById("prompt").textContent.trim() };
  });
  console.log("secret before:", secretDoor);
  for (let i = 0; i < 4; i++) {
    await press(...K.j);
    await sleep(480);
  }
  const secretAfter = await b.eval(() => {
    const g = window.__ASHEN.game;
    const d = g.room.doors.find((x) => x.secret);
    return { broken: g.roomState.secrets[d.id].broken, hp: g.roomState.secrets[d.id].hp };
  });
  console.log("secret after:", secretAfter);
  check(secretAfter.broken, "sword strokes break the secret wall");
  await b.screenshot(`${OUT}/m05-secret-broken.png`);
  await teleport(0.55, 7.5);
  await b.eval(() => { window.__ASHEN.game.doorCd = 0; });
  await b.waitFor(() => window.__ASHEN.game.transition || window.__ASHEN.game.roomId === "reliquary", 4000, "secret passage");
  await sleep(1500);
  const reliquary = await b.eval(() => ({ room: window.__ASHEN.game.roomId, chests: window.__ASHEN.game.room.chests.length, secrets: window.__ASHEN.game.stats.rooms.size }));
  console.log("reliquary:", reliquary);
  check(reliquary.room === "reliquary", "secret passage opens the hidden reliquary");

  // Relic chest inside the reliquary.
  await teleport(8.5, 4.4);
  await sleep(250);
  const relicPrompt = await b.eval(() => document.getElementById("prompt").textContent.trim());
  check(/chest/i.test(relicPrompt), "reliquary chest is interactive");
  await press(...K.e);
  await sleep(400);
  const relic = await b.eval(() => ({
    count: window.__ASHEN.game.run.relics.size,
    chips: document.querySelectorAll("#relics .relic").length,
    toast: document.getElementById("toasttitle").textContent,
    maxHp: window.__ASHEN.game.player.maxHp,
  }));
  console.log("relic:", relic);
  check(relic.count === 1 && relic.chips === 1 && relic.toast.length > 0, "relic is claimed with HUD chip");
  await b.screenshot(`${OUT}/m06-relic.png`);

  // Altar healing.
  await b.eval(() => {
    const A = window.__ASHEN, g = A.game;
    A.enterRoom("chapel", "hall");
    g.player.invuln = 900;
    for (const e of g.enemies) if (e.state !== "dead" && e.state !== "dying") A.hitEnemy(e, 999, 0, false);
    g.player.hp = 4;
    g.player.x = 9.5 * 32;
    g.player.y = 4.35 * 32;
  });
  await sleep(900);
  const altarPrompt = await b.eval(() => document.getElementById("prompt").textContent.trim());
  check(/altar/i.test(altarPrompt), "altar prompts for prayer");
  await press(...K.e);
  await sleep(450);
  const healed = await b.eval(() => ({
    hp: window.__ASHEN.game.player.hp,
    used: window.__ASHEN.game.roomState.altarUsed,
    hearts: document.querySelectorAll("#hearts .heart.full, #hearts .heart.half").length,
  }));
  console.log("altar:", healed);
  check(healed.hp > 4 && healed.used, "altar mends the knight");
  await b.screenshot(`${OUT}/m07-altar.png`);

  console.log("console errors:", b.errors.length ? b.errors : "none");
  console.log(`\n${failures === 0 ? "MECHANICS PASSED" : failures + " CHECK(S) FAILED"}`);
} catch (err) {
  failures++;
  console.error("MECHANICS ERROR:", err.message);
  console.error("console errors:", b.errors);
  try { await b.screenshot(`${OUT}/merror.png`); } catch {}
} finally {
  await b.close();
  process.exitCode = failures ? 1 : 0;
}
