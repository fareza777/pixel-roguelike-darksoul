// Ashen Vow — a hand-drawn roguelike vertical slice.
import {
  TILE, VIEW_W, VIEW_H, START_ROOM, START_TILE, RELICS, SIGILS, EQUIPMENT,
  ROOMS, ROOM_BY_ID, roomById, doorAt, spawnFeet, doorInward,
} from "./level.mjs";
import { DungeonAudio } from "./audio.mjs";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

const lightCanvas = document.createElement("canvas");
lightCanvas.width = VIEW_W;
lightCanvas.height = VIEW_H;
const lctx = lightCanvas.getContext("2d");
lctx.imageSmoothingEnabled = false;

const stage = document.getElementById("stage");
const hudEl = document.getElementById("hud");
const titleEl = document.getElementById("title");
const pauseEl = document.getElementById("pause");
const endEl = document.getElementById("end");

const ui = {
  hearts: document.getElementById("hearts"),
  dashfill: document.getElementById("dashfill"),
  dashrow: document.getElementById("dash"),
  sigils: document.getElementById("sigils"),
  relics: document.getElementById("relics"),
  souls: document.getElementById("soulcount"),
  minimap: document.getElementById("minimap"),
  roomcard: document.getElementById("roomcard"),
  roomname: document.getElementById("roomname"),
  roomsub: document.getElementById("roomsub"),
  prompt: document.getElementById("prompt"),
  toast: document.getElementById("toast"),
  toasticon: document.getElementById("toasticon"),
  toasttitle: document.getElementById("toasttitle"),
  toastdesc: document.getElementById("toastdesc"),
  bossbar: document.getElementById("bossbar"),
  bossfill: document.getElementById("bossfill"),
  hint: document.getElementById("hint"),
  endscreen: document.getElementById("end"),
  endeyebrow: document.getElementById("endeyebrow"),
  endtitle: document.getElementById("endtitle"),
  endtext: document.getElementById("endtext"),
  endstats: document.getElementById("endstats"),
  endprompt: document.getElementById("endprompt"),
  pauseRelics: document.getElementById("pauserelics"),
  loading: document.getElementById("loading"),
  ledger: document.getElementById("ledger"),
  ledgerGrid: document.getElementById("ledgerGrid"),
  ledgerRelicCount: document.getElementById("ledgerRelicCount"),
  ledgerRelicNote: document.getElementById("ledgerRelicNote"),
  ledgerRelics: document.getElementById("ledgerRelics"),
  ledgerGear: document.getElementById("ledgerGear"),
  ledgerGearList: document.getElementById("ledgerGearList"),
  ledgerSlots: document.getElementById("ledgerSlots"),
  ledgerDetail: document.getElementById("ledgerDetail"),
  ledgerStats: document.getElementById("ledgerStats"),
  ledgerFigure: document.querySelector(".ledger-figure"),
  ledgerClose: document.getElementById("ledgerClose"),
};

const SHEETS = {
  knight: { w: 128, h: 96, cols: 16, ax: 64, ay: 84 },
  skeleton: { w: 72, h: 72, cols: 6, ax: 36, ay: 64 },
  wretch: { w: 80, h: 84, cols: 6, ax: 40, ay: 76 },
  warden: { w: 120, h: 120, cols: 6, ax: 60, ay: 112 },
  tiles: { w: 32, h: 32, cols: 8, ax: 0, ay: 0 },
  torch: { w: 16, h: 32, cols: 8, ax: 0, ay: 0 },
  icons: { w: 16, h: 16, cols: 8, ax: 0, ay: 0 },
};

const ASSET_FILES = {
  knight: "assets/art/knight.png",
  skeleton: "assets/art/skeleton.png",
  wretch: "assets/art/wretch.png",
  warden: "assets/art/warden.png",
  tiles: "assets/art/dungeon_tiles.png",
  torch: "assets/art/torch.png",
  icons: "assets/art/icons.png",
};

const images = {};

const PROP_TILE = { barrel: 18, crate: 19, pillar: 20, bones: 21, brazier: 22, banner: 23 };
const FLOOR_TILE = { ".": -1, m: 4, b: 3, p: 7, g: 5, r: 30, u: 29 };
const ICON = {
  heart: 0, feather: 1, bloodfang: 2, graveEye: 3, grail: 4, crown: 5, sigil: 6,
  orb: 7, skull: 8, key: 9, flame: 10, shield: 11, sword: 12, stamina: 13, spark: 14, tablet: 15,
};

const PLAYER_SPEED = 104;
const DASH_SPEED = 380;
const DASH_TIME = 0.17;
const ATTACKS = [
  { dur: 0.4, hitAt: 0.13, range: 39, arc: 1.6, dmg: 8, lunge: 10, row: 2, count: 10 },
  { dur: 0.48, hitAt: 0.16, range: 41, arc: 1.75, dmg: 9, lunge: 12, row: 3, count: 12 },
  { dur: 0.72, hitAt: 0.24, range: 50, arc: 2.25, dmg: 15, lunge: 28, row: 4, count: 16 },
];

const ENEMY_DEFS = {
  skeleton: {
    sheet: "skeleton", hp: 26, r: 7, speed: 29, sight: 200,
    hitY: 22, hitR: 12, souls: 10, drop: 0.22, barH: 63, name: "Skeleton",
    anims: {
      idle: { row: 0, count: 6, fps: 4.5, loop: true },
      walk: { row: 0, count: 6, fps: 10, loop: true },
      attack: { row: 1, count: 6, fps: 7.7, loop: false },
      hurt: { row: 2, count: 6, fps: 16, loop: false },
      death: { row: 3, count: 4, fps: 6.6, loop: false },
    },
    corpse: { row: 3, col: 4 },
  },
  wretch: {
    sheet: "wretch", hp: 22, r: 8, speed: 24, sight: 250,
    hitY: 38, hitR: 13, souls: 13, drop: 0.25, barH: 76, name: "Wretch",
    anims: {
      idle: { row: 0, count: 6, fps: 5.5, loop: true },
      walk: { row: 0, count: 6, fps: 7, loop: true },
      attack: { row: 1, count: 6, fps: 6.4, loop: false },
      hurt: { row: 2, count: 6, fps: 16, loop: false },
      death: { row: 3, count: 4, fps: 7, loop: false },
    },
    corpse: { row: 3, col: 4 },
  },
  warden: {
    sheet: "warden", hp: 200, r: 20, speed: 25, sight: 500,
    hitY: 54, hitR: 30, souls: 120, drop: 0, barH: 112, name: "The Pale Warden",
    anims: {
      idle: { row: 0, count: 6, fps: 4.5, loop: true },
      walk: { row: 1, count: 6, fps: 6, loop: true },
      cleave: { row: 2, count: 6, fps: 4.1, loop: false },
      slam: { row: 3, count: 6, fps: 3.6, loop: false },
      hurt: { row: 4, count: 6, fps: 12, loop: false },
      death: { row: 5, count: 4, fps: 3.2, loop: false },
    },
    corpse: { row: 5, col: 4 },
  },
};

const game = {
  mode: "title",
  time: 0,
  titleTime: 0,
  roomId: null,
  room: null,
  roomState: null,
  run: null,
  player: null,
  enemies: [],
  boss: null,
  projectiles: [],
  shocks: [],
  particles: [],
  texts: [],
  pickups: [],
  slashes: [],
  ghosts: [],
  fxLights: [],
  cam: { x: 0, y: 0, shake: 0 },
  mouse: { x: VIEW_W / 2, y: VIEW_H / 2 },
  sigils: 0,
  kills: 0,
  souls: 0,
  hitstop: 0,
  flash: 0,
  white: 0,
  fade: 0,
  transition: null,
  doorCd: 0,
  bossIntro: 0,
  bossPhase2Announced: false,
  introT: 0,
  deathT: 0,
  outroT: 0,
  victorySounded: false,
  muted: false,
  toastT: 0,
  sealNoticeShown: false,
  promptHTML: "",
  heartsSig: "",
  relicSig: "",
  sigilSig: "",
  bgCache: new Map(),
  titleBg: null,
  minimapSig: "",
  stats: { rooms: new Set() },
  audio: null,
};

/* ------------------------------ helpers ------------------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const TAU = Math.PI * 2;

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}
function norm(x, y) {
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
}
function rand(a, b) { return a + Math.random() * (b - a); }
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function fract(v) { return v - Math.floor(v); }
function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* --------------------------- tiny 3x5 font --------------------------- */
const TINY = {
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "011", "010", "010"],
  "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
  A: ["010", "101", "111", "101", "101"], C: ["011", "100", "100", "100", "011"],
  E: ["111", "100", "110", "100", "111"], H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"], L: ["100", "100", "100", "100", "111"],
  R: ["110", "101", "110", "101", "101"], T: ["111", "010", "010", "010", "010"],
  "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
  "!": ["010", "010", "010", "000", "010"], "?": ["110", "001", "010", "000", "010"],
};
function drawTiny(g, text, x, y, scale = 1, color = "#fff6d0", align = "center") {
  text = String(text).toUpperCase();
  const w = text.length * 4 * scale - scale;
  let px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  g.fillStyle = "rgba(6,5,9,0.8)";
  for (let i = 0; i < text.length; i++) {
    const glyph = TINY[text[i]];
    if (!glyph) { px += 4 * scale; continue; }
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 3; gx++) {
      if (glyph[gy][gx] === "1") g.fillRect(px + gx * scale + 1, y + gy * scale + 1, scale, scale);
    }
    px += 4 * scale;
  }
  px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  g.fillStyle = color;
  for (let i = 0; i < text.length; i++) {
    const glyph = TINY[text[i]];
    if (!glyph) { px += 4 * scale; continue; }
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 3; gx++) {
      if (glyph[gy][gx] === "1") g.fillRect(px + gx * scale, y + gy * scale, scale, scale);
    }
    px += 4 * scale;
  }
}

/* ------------------------------- input ------------------------------- */
const keys = new Set();
const input = { attack: false, dash: false, interact: false, aimWorld: null, escape: false, mute: false };

function isTypingTarget(t) {
  return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

window.addEventListener("keydown", (e) => {
  if (isTypingTarget(e.target)) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyM") { toggleMute(); return; }
  if (game.mode === "ledger") {
    if (e.code === "Escape" || e.code === "KeyI" || e.code === "Tab") closeLedger();
    else if (e.code === "ArrowLeft" || e.code === "ArrowRight") setLedgerTab(ledgerState.tab === "relics" ? "gear" : "relics");
    else if (e.code === "ArrowUp" || e.code === "ArrowDown") moveLedgerSelection(e.code === "ArrowDown" ? 1 : -1);
    return;
  }
  if (game.mode === "title") {
    if (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") startRun();
    return;
  }
  if (game.mode === "dead" || game.mode === "won") {
    if (e.code === "KeyR" || e.code === "Enter" || e.code === "Space") startRun();
    return;
  }
  if (e.code === "Escape" || e.code === "KeyP") {
    if (game.mode === "play") pauseGame();
    else if (game.mode === "paused") resumeGame();
    return;
  }
  if (e.code === "KeyI" || e.code === "Tab") {
    if (game.mode === "play" || game.mode === "paused") openLedger();
    return;
  }
  if (game.mode !== "play") return;
  if (e.code === "KeyJ" || e.code === "Space") input.attack = true;
  if (e.code === "KeyK" || e.code === "ShiftLeft" || e.code === "ShiftRight") input.dash = true;
  if (e.code === "KeyE") input.interact = true;
});
window.addEventListener("keyup", (e) => { keys.delete(e.code); });
window.addEventListener("blur", () => {
  keys.clear();
  if (game.mode === "play" && !game.transition) pauseGame();
});

canvas.addEventListener("pointerdown", (e) => {
  if (game.mode !== "play" || e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  input.attack = true;
  input.aimWorld = { x: mx + game.cam.x, y: my + game.cam.y };
});
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  game.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("pointerdown", () => {
  if (!game.audio) { /* audio initialised on run start */ }
  else game.audio.resume();
}, { passive: true });

function readMove() {
  let x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  let y = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  if (x && y) { x *= 0.70710678; y *= 0.70710678; }
  return { x, y };
}

/* ---------------------------- HUD helpers ---------------------------- */
const iconStyle = (icon, size = 32) => {
  const col = icon % 8, row = Math.floor(icon / 8);
  return `${-col * size}px ${-row * size}px`;
};

function refreshHearts(force = false) {
  const p = game.player;
  if (!p) return;
  const sig = `${p.hp}/${p.maxHp}`;
  if (!force && sig === game.heartsSig) return;
  game.heartsSig = sig;
  const total = Math.ceil(p.maxHp / 2);
  let html = "";
  for (let i = 0; i < total; i++) {
    const halves = p.hp - i * 2;
    let cls = "heart empty";
    if (halves >= 2) cls = "heart full";
    else if (halves === 1) cls = "heart half";
    html += `<span class="${cls}"></span>`;
  }
  ui.hearts.innerHTML = html;
  ui.hearts.classList.toggle("low", p.hp <= 2);
}

function refreshRelics(force = false) {
  if (!game.run) return;
  const owned = [...game.run.relics];
  const sig = owned.join(",");
  if (!force && sig === game.relicSig) return;
  game.relicSig = sig;
  ui.relics.innerHTML = owned.map((id) => {
    const r = RELICS.find((x) => x.id === id);
    if (!r) return "";
    return `<span class="relic" style="background-position:${iconStyle(r.icon)}" data-tip="${r.name} — ${r.desc}"></span>`;
  }).join("");
}

function refreshSigils(force = false) {
  const sig = `${game.sigils}`;
  if (!force && sig === game.sigilSig) return;
  game.sigilSig = sig;
  ui.sigils.innerHTML = SIGILS.map((s, i) =>
    `<span class="sigil ${i < game.sigils ? "lit" : ""}" style="background-position:${iconStyle(ICON.sigil)}" title="${s.name}"></span>`
  ).join("");
}

function refreshSouls() {
  ui.souls.textContent = String(game.souls).padStart(2, "0");
}

function setPrompt(html) {
  if (html === game.promptHTML) return;
  game.promptHTML = html;
  if (!html) {
    ui.prompt.classList.remove("show");
    ui.prompt.innerHTML = "";
    return;
  }
  ui.prompt.innerHTML = html;
  ui.prompt.classList.add("show");
}

let roomCardTimer = 0;
function showRoomCard(room) {
  ui.roomname.textContent = room.name;
  ui.roomsub.textContent = room.subtitle;
  ui.roomcard.classList.remove("show");
  void ui.roomcard.offsetWidth;
  ui.roomcard.classList.add("show");
  clearTimeout(roomCardTimer);
  roomCardTimer = setTimeout(() => ui.roomcard.classList.remove("show"), 2900);
}

function showToast(title, desc, opts = {}) {
  ui.toasttitle.textContent = title || "";
  ui.toastdesc.textContent = desc || "";
  const icon = opts.icon;
  if (icon === undefined || icon === null) {
    ui.toasticon.style.display = "none";
  } else {
    ui.toasticon.style.display = "block";
    ui.toasticon.style.backgroundPosition = iconStyle(icon);
  }
  ui.toast.classList.toggle("quiet", !title);
  ui.toast.classList.remove("show");
  void ui.toast.offsetWidth;
  ui.toast.classList.add("show");
  game.toastT = opts.dur || 3.4;
}
function updateToast(dt) {
  if (game.toastT > 0) {
    game.toastT -= dt;
    if (game.toastT <= 0) ui.toast.classList.remove("show");
  }
}

function refreshHudAll() {
  refreshHearts(true);
  refreshRelics(true);
  refreshSigils(true);
  refreshSouls();
}

function updateBossBar() {
  const boss = game.boss;
  const show = game.roomId === "warden_gate" && boss && boss.state !== "dead" && boss.hp > 0 && game.mode !== "title";
  ui.bossbar.classList.toggle("show", !!show);
  if (!show) return;
  const pct = clamp(boss.hp / boss.maxHp, 0, 1) * 100;
  ui.bossfill.style.width = pct.toFixed(2) + "%";
  ui.bossbar.classList.toggle("phase2", !!boss.phase2);
}

function toggleMute() {
  if (!game.audio) return;
  game.muted = !game.muted;
  game.audio.setMuted(game.muted);
  showToast("", game.muted ? "The keep falls silent." : "Sound returns to the hall.", { dur: 1.8 });
}

/* ----------------------------- run building ----------------------------- */
function makeRoomState(room) {
  const chests = {};
  for (const c of room.chests) {
    chests[`${c.x},${c.y}`] = { opened: false, content: null };
  }
  const secrets = {};
  for (const d of room.doors) {
    if (d.secret) secrets[d.id] = { broken: false, hp: 0 };
  }
  return {
    entered: false,
    cleared: room.spawns.length === 0,
    sealShown: false,
    enemies: [],
    corpses: [],
    pickups: [],
    chests,
    secrets,
    sigilTaken: false,
    altarUsed: false,
    bossDead: false,
  };
}

function buildRun() {
  const roomStates = {};
  for (const room of ROOMS) roomStates[room.id] = makeRoomState(room);
  const relicOrder = shuffle([...RELICS]);
  const relicChests = [];
  for (const room of ROOMS) for (const c of room.chests) {
    if (c.type === "relic") relicChests.push({ room, chest: c });
  }
  shuffle(relicChests);
  relicChests.forEach((entry, i) => {
    const st = roomStates[entry.room.id];
    st.chests[`${entry.chest.x},${entry.chest.y}`].content =
      i < relicOrder.length ? { kind: "relic", relic: relicOrder[i].id } : { kind: "heal" };
  });
  for (const room of ROOMS) for (const c of room.chests) {
    const cell = roomStates[room.id].chests[`${c.x},${c.y}`];
    if (!cell.content) cell.content = { kind: c.type };
  }
  return { roomStates, relicOrder, relics: new Set(), relicChestCount: relicChests.length };
}

function makePlayer() {
  return {
    x: (START_TILE.x + 0.5) * TILE, y: (START_TILE.y + 0.7) * TILE, r: 7,
    hp: 10, maxHp: 10,
    face: 1, facing: { x: 0, y: 1 }, moveDir: { x: 0, y: 1 }, view: 1,
    state: "idle", stateT: 0,
    animName: "idle", anim: { row: 0, count: 8, fps: 6, t: 0, loop: true },
    atkStep: 0, atkTime: 0, atkBuffered: false, atkDir: { x: 0, y: -1 }, atkAngle: 0,
    dashT: 0, dashCd: 0, dashDir: { x: 1, y: 0 }, ghostT: 0,
    invuln: 0, flash: 0, kx: 0, ky: 0, bloodHits: 0, stepT: 0,
  };
}

function maxDashCd() { return game.run && game.run.relics.has("iron_feather") ? 0.55 : 0.85; }
function hasRelic(id) { return !!(game.run && game.run.relics.has(id)); }

function startRun() {
  if (!images.knight || !images.tiles) return;
  keys.clear();
  input.attack = false; input.dash = false; input.interact = false; input.aimWorld = null;
  if (!game.audio) game.audio = new DungeonAudio();
  game.audio.init();
  game.audio.setMuted(game.muted);
  titleEl.classList.add("hide");
  endEl.classList.add("hide");
  pauseEl.classList.add("hide");
  stopLedgerFigure();
  ui.ledger.classList.add("hide");
  ledgerState.tab = "relics";
  ledgerState.relicId = null;
  ledgerState.gearId = "longsword";
  hudEl.classList.remove("hud-hidden");
  ui.endscreen.classList.add("hide");

  game.run = buildRun();
  game.player = makePlayer();
  game.sigils = 0;
  game.kills = 0;
  game.souls = 0;
  game.time = 0;
  game.hitstop = 0;
  game.flash = 0;
  game.white = 0;
  game.fade = 1;
  game.transition = null;
  game.doorCd = 0.6;
  game.bossIntro = 0;
  game.bossPhase2Announced = false;
  game.deathT = 0;
  game.outroT = 0;
  game.victorySounded = false;
  game.toastT = 0;
  game.sealNoticeShown = false;
  game.promptHTML = "";
  game.bgCache = new Map();
  game.stats = { rooms: new Set() };
  game.interactTarget = null;
  game.lanternHintRoom = null;
  game.secretGlintT = 0;
  game.projectiles = [];
  game.shocks = [];
  game.particles = [];
  game.texts = [];
  game.slashes = [];
  game.ghosts = [];
  game.fxLights = [];
  game.mode = "play";

  enterRoom(START_ROOM, null, { initial: true });
  refreshHudAll();
  audioSetMood("calm");
  ui.hearts.classList.remove("low");
  ui.toast.classList.remove("show");
  setTimeout(() => {
    if (game.mode === "play" || game.mode === "paused") {
      showToast("Three Sigils", "The Warden's Gate waits below. Claim the sigils of Bone, Gilt and Ash.", { icon: ICON.sigil, dur: 5.2 });
    }
  }, 1500);
}

function audioSetMood(m) {
  if (game.audio) game.audio.setMood(m);
}

function findReturnDoor(room, fromRoomId) {
  return room.doors.find((d) => d.to === fromRoomId) || room.doors[0] || null;
}

function enterRoom(id, fromRoomId, opts = {}) {
  const room = roomById(id);
  if (!room) return;
  game.roomId = id;
  game.room = room;
  const st = game.run.roomStates[id];
  game.roomState = st;
  game.enemies = st.enemies;
  game.pickups = st.pickups;
  game.boss = st.enemies.find((e) => e.type === "warden") || null;
  game.projectiles = [];
  game.shocks = [];
  game.slashes = [];
  game.ghosts = [];
  game.particles = [];
  game.texts = [];
  game.fxLights = [];
  game.transition = game.transition;
  game.doorCd = 0.75;
  game.toastT = 0;
  ui.toast.classList.remove("show");

  const first = !st.entered;
  if (first) {
    st.entered = true;
    game.stats.rooms.add(id);
    if (room.spawns.length) {
      for (const spawn of room.spawns) st.enemies.push(makeEnemy(spawn.type, spawn.x, spawn.y));
      st.cleared = false;
      game.boss = st.enemies.find((e) => e.type === "warden") || null;
      if (!st.sealShown) {
        st.sealShown = true;
        game.audio && game.audio.door(false);
        addShake(3);
        if (!game.sealNoticeShown) {
          game.sealNoticeShown = true;
          setTimeout(() => {
            if (game.mode === "play") showToast("", "The stones grind shut. Slay every keeper to open the way.", { dur: 3.4 });
          }, 700);
        }
      }
    }
  }
  if (!st.cleared && st.enemies.every((e) => e.state === "dying" || e.state === "dead")) st.cleared = true;

  const p = game.player;
  if (opts.initial) {
    p.x = (START_TILE.x + 0.5) * TILE;
    p.y = (START_TILE.y + 0.7) * TILE;
    p.facing = { x: 0, y: 1 };
    p.face = 1;
    p.view = 1;
  } else {
    const door = findReturnDoor(room, fromRoomId);
    if (door) {
      const inward = doorInward(door);
      let spot = null;
      for (const off of [2.1, 1.5, 2.7]) {
        const tx = (door.x + 0.5) * TILE + inward.x * TILE * off;
        const ty = (door.y + 0.5) * TILE + inward.y * TILE * off;
        if (ty > 10 && ty < room.h * TILE - 10 && !collides(room, tx, ty, p.r)) { spot = { x: tx, y: ty }; break; }
      }
      if (!spot) {
        spot = { x: (door.x + 0.5) * TILE + inward.x * TILE * 2.1, y: (door.y + 0.5) * TILE + inward.y * TILE * 2.1 };
      }
      p.x = spot.x; p.y = spot.y;
      p.facing = { x: inward.x, y: inward.y };
      p.view = viewForDir(inward);
      if (inward.x !== 0) p.face = inward.x < 0 ? -1 : 1;
    }
  }
  p.state = "idle";
  p.stateT = 0;
  setPlayerAnim("idle", 0, 8, 6, true);
  p.invuln = Math.max(p.invuln, 0.15);
  p.kx = p.ky = 0;

  if (!game.bgCache.has(id)) game.bgCache.set(id, buildBackground(room));
  const camT = desiredCamera();
  game.cam.x = camT.x;
  game.cam.y = camT.y;
  game.cam.shake = 0;

  const bossE = st.enemies.find((e) => e.type === "warden" && e.state !== "dead");
  if (room.music === "boss" && bossE && !st.bossDead) {
    game.bossIntro = bossE.introDone ? 0 : 1.9;
    audioSetMood("boss");
    if (game.audio) { game.audio.bossActive = true; game.audio.phase2 = !!bossE.phase2; }
  } else {
    audioSetMood(room.music === "tense" ? "tense" : "calm");
    if (game.audio) game.audio.bossActive = false;
  }

  showRoomCard(room);
  refreshSigils(true);
  updateBossBar();
  setPrompt("");
  game.sigilSig = "";
  game.hudSig = "";
  if (first && room.secret) {
    setTimeout(() => {
      if (game.mode === "play") showToast("A hidden chamber", "The water kept its promise.", { icon: ICON.flame, dur: 3 });
    }, 600);
  }
}

/* ---------------------------- static backdrop ---------------------------- */
function drawTileTo(g, index, dx, dy, scale = 1) {
  const img = images.tiles;
  const sx = (index % 8) * 32, sy = Math.floor(index / 8) * 32;
  g.drawImage(img, sx, sy, 32, 32, Math.round(dx), Math.round(dy), 32 * scale, 32 * scale);
}

function drawIcon(g, icon, x, y, scale = 1) {
  const sx = (icon % 8) * 16, sy = Math.floor(icon / 8) * 16;
  g.drawImage(images.icons, sx, sy, 16, 16, Math.round(x), Math.round(y), 16 * scale, 16 * scale);
}

function wallTileIndex(room, x, y) {
  const h = hash2(x, y, room.w);
  if (["ossuary", "cellar", "vault"].includes(room.theme) && h % 5 === 0) return 10;
  return h % 2 ? 8 : 9;
}

function drawRug(g, rug) {
  const styles = {
    crimson: { edge: "#260a14", rim: "#7c521d", field: "#521626", inner: "#84263a", hi: "#b23a4b", motif: "#e6b455" },
    azure: { edge: "#0c1a2e", rim: "#3f91aa", field: "#152f4f", inner: "#235a7c", hi: "#3f91aa", motif: "#7fd2d4" },
    verdant: { edge: "#0e2a23", rim: "#57b184", field: "#1d4d3d", inner: "#2f7a5c", hi: "#57b184", motif: "#8be3b7" },
  };
  const c = styles[rug.style] || styles.crimson;
  const x = rug.x * TILE, y = rug.y * TILE, w = rug.w * TILE, h = rug.h * TILE;
  g.fillStyle = c.edge; g.fillRect(x, y, w, h);
  g.fillStyle = c.rim; g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.fillStyle = c.field; g.fillRect(x + 5, y + 5, w - 10, h - 10);
  g.fillStyle = c.inner; g.fillRect(x + 9, y + 9, w - 18, h - 18);
  g.fillStyle = c.hi;
  g.fillRect(x + 9, y + 9, w - 18, 1);
  g.fillRect(x + 9, y + h - 10, w - 18, 1);
  g.fillStyle = c.motif;
  const cx = x + w / 2;
  for (let yy = y + 26; yy < y + h - 16; yy += 40) {
    for (let k = -1; k <= 1; k++) {
      const px = cx + k * 12;
      g.globalAlpha = 0.3;
      g.fillRect(px, yy, 2, 2);
      g.fillRect(px - 4, yy + 4, 2, 2);
      g.fillRect(px + 4, yy + 4, 2, 2);
      g.fillRect(px, yy + 8, 2, 2);
      g.globalAlpha = 1;
    }
  }
  for (let i = 0; i < 12; i++) {
    const hsh = hash2(rug.x, rug.y, i);
    g.fillStyle = i % 3 === 0 ? c.hi : c.edge;
    g.globalAlpha = 0.25;
    g.fillRect(x + 8 + (hsh % Math.max(1, w - 16)), y + 8 + ((hsh >> 8) % Math.max(1, h - 16)), 2, 1);
    g.globalAlpha = 1;
  }
}

function drawRuneRing(g, ring, palette = "verdant") {
  const cx = (ring.cx + 0.5) * TILE, cy = (ring.cy + 0.5) * TILE;
  const rx = ring.rx * TILE, ry = ring.ry * TILE;
  const cols = palette === "ember"
    ? { outer: "#4a1c0c", mid: "#8a3313", bright: "#d55f1e", glow: "#f59b3d" }
    : { outer: "#0e2a23", mid: "#1d4d3d", bright: "#2f7a5c", glow: "#57b184" };
  g.save();
  g.lineCap = "round";
  g.strokeStyle = cols.outer; g.lineWidth = 5;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
  g.strokeStyle = cols.mid; g.lineWidth = 2;
  g.beginPath(); g.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, TAU); g.stroke();
  g.strokeStyle = cols.bright; g.lineWidth = 1;
  g.beginPath(); g.ellipse(cx, cy, rx * 0.68, ry * 0.68, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const x0 = cx + Math.cos(a) * (rx - 6), y0 = cy + Math.sin(a) * (ry - 6);
    const x1 = cx + Math.cos(a) * (rx + 5), y1 = cy + Math.sin(a) * (ry + 5);
    if (i % 3 === 0) {
      g.strokeStyle = cols.glow; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  }
  g.strokeStyle = cols.glow; g.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const px = cx + Math.cos(a) * rx * 0.68, py = cy + Math.sin(a) * ry * 0.68;
    g.beginPath();
    g.moveTo(px - 4, py); g.lineTo(px, py - 5); g.lineTo(px + 4, py); g.lineTo(px, py + 5); g.closePath();
    g.stroke();
  }
  g.restore();
}

function buildBackground(room) {
  const c = document.createElement("canvas");
  c.width = room.w * TILE;
  c.height = room.h * TILE;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#07060a";
  g.fillRect(0, 0, c.width, c.height);

  for (let y = 0; y < room.h; y++) {
    for (let x = 0; x < room.w; x++) {
      const ch = room.grid[y][x];
      const px = x * TILE, py = y * TILE;
      if (ch === "#") {
        let idx = wallTileIndex(room, x, y);
        const decor = room.wallDecor.find((w) => w.x === x && w.y === y);
        if (decor) idx = decor.t === "gargoyle" ? 13 : 15;
        drawTileTo(g, idx, px, py);
      } else if (ch === "D") {
        drawTileTo(g, wallTileIndex(room, x, y), px, py);
      } else {
        const h = hash2(x, y, room.w * 3);
        let idx = FLOOR_TILE[ch];
        if (idx === -1 || idx === undefined) idx = h % 3;
        drawTileTo(g, idx, px, py);
      }
    }
  }
  for (const rug of room.rugs) drawRug(g, rug);
  for (const ring of room.rings) drawRuneRing(g, ring, room.theme === "boss" ? "ember" : "verdant");

  // damp stone gives way to darkness at every edge
  const top = g.createLinearGradient(0, TILE, 0, TILE * 4);
  top.addColorStop(0, "rgba(3,3,6,0.75)");
  top.addColorStop(1, "rgba(3,3,6,0)");
  g.fillStyle = top;
  g.fillRect(0, TILE, c.width, TILE * 3);
  const left = g.createLinearGradient(0, 0, TILE * 2, 0);
  left.addColorStop(0, "rgba(3,3,6,0.6)");
  left.addColorStop(1, "rgba(3,3,6,0)");
  g.fillStyle = left; g.fillRect(0, 0, TILE * 2, c.height);
  const right = g.createLinearGradient(c.width, 0, c.width - TILE * 2, 0);
  right.addColorStop(0, "rgba(3,3,6,0.6)");
  right.addColorStop(1, "rgba(3,3,6,0)");
  g.fillStyle = right; g.fillRect(c.width - TILE * 2, 0, TILE * 2, c.height);
  const bottom = g.createLinearGradient(0, c.height - TILE * 2, 0, c.height);
  bottom.addColorStop(0, "rgba(3,3,6,0)");
  bottom.addColorStop(1, "rgba(3,3,6,0.55)");
  g.fillStyle = bottom; g.fillRect(0, c.height - TILE * 2, c.width, TILE * 2);
  return c;
}

/* --------------------------- collision / sight --------------------------- */
function isSolidTile(room, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return true;
  const ch = room.grid[ty][tx];
  if (ch === "#") return true;
  if (ch === "D") {
    const door = doorAt(room, tx, ty);
    return door ? !doorPassable(door) : true;
  }
  return room.solidKeys.has(`${tx},${ty}`);
}

function isWallTile(room, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return true;
  const ch = room.grid[ty][tx];
  if (ch === "#") return true;
  if (ch === "D") {
    const door = doorAt(room, tx, ty);
    return door ? !doorPassable(door) : true;
  }
  return false;
}

function doorPassable(door) {
  const room = game.room;
  if (!room) return false;
  const st = game.run.roomStates[room.id];
  if (!st.cleared && !(door.secret && st.secrets[door.id]?.broken)) return false;
  if (door.secret) return !!st.secrets[door.id]?.broken;
  if (door.gate) return game.sigils >= SIGILS.length;
  if (room.id === "warden_gate") return !!st.bossDead;
  return true;
}

function collides(room, x, y, r) {
  const pts = [[0, 0]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (const [ox, oy] of pts) {
    const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
    if (isSolidTile(room, tx, ty)) return true;
  }
  return false;
}

function tryMove(ent, dx, dy) {
  const room = game.room;
  let moved = false;
  if (dx && !collides(room, ent.x + dx, ent.y, ent.r)) { ent.x += dx; moved = true; }
  if (dy && !collides(room, ent.x, ent.y + dy, ent.r)) { ent.y += dy; moved = true; }
  return moved;
}

function moveToward(ent, tx, ty, speed, dt) {
  const dx = tx - ent.x, dy = ty - ent.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return false;
  const nx = dx / d, ny = dy / d;
  const step = speed * dt;
  const bx = ent.x, by = ent.y;
  if (!tryMove(ent, nx * step, ny * step) || (Math.abs(ent.x - bx) < 0.01 && Math.abs(ent.y - by) < 0.01)) {
    tryMove(ent, -ny * step, nx * step);
  }
  return Math.hypot(ent.x - bx, ent.y - by) > 0.01;
}

function hasLOS(room, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1);
  const steps = Math.ceil(d / 10);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + (x1 - x0) * t) / TILE);
    const ty = Math.floor((y0 + (y1 - y0) * t) / TILE);
    if (isWallTile(room, tx, ty)) return false;
  }
  return true;
}

function applyKnockback(ent, dt) {
  if (!ent.kx && !ent.ky) return;
  tryMove(ent, ent.kx * dt, ent.ky * dt);
  const damp = Math.pow(0.0025, dt);
  ent.kx *= damp;
  ent.ky *= damp;
  if (Math.abs(ent.kx) < 2) ent.kx = 0;
  if (Math.abs(ent.ky) < 2) ent.ky = 0;
}

/* ------------------------------ camera ------------------------------ */
function desiredCamera() {
  if (!game.room || !game.player) return { x: 0, y: 0 };
  const room = game.room, p = game.player;
  const maxX = Math.max(0, room.w * TILE - VIEW_W);
  const maxY = Math.max(0, room.h * TILE - VIEW_H);
  return {
    x: clamp(p.x - VIEW_W / 2, 0, maxX),
    y: clamp(p.y - 40 - VIEW_H / 2, 0, maxY),
  };
}
function updateCamera(dt, follow = true) {
  if (follow) {
    const t = desiredCamera();
    const k = Math.min(1, dt * 8);
    game.cam.x = lerp(game.cam.x, t.x, k);
    game.cam.y = lerp(game.cam.y, t.y, k);
  }
  game.cam.shake = Math.max(0, game.cam.shake - dt * 34);
}
function addShake(n) { game.cam.shake = Math.min(10, Math.max(game.cam.shake, n)); }

/* ------------------------------ player ------------------------------ */
function setPlayerAnim(name, row, count, fps, loop) {
  const p = game.player;
  if (p.animName === name) return;
  p.animName = name;
  p.anim.row = row; p.anim.count = count; p.anim.fps = fps; p.anim.t = 0; p.anim.loop = loop;
}

function viewForDir(d) {
  if (!d) return game.player ? game.player.view : 1;
  if (Math.abs(d.x) >= Math.abs(d.y)) return 0;
  return d.y > 0 ? 1 : 2;
}

function tickAnim(a, dt) {
  a.anim.t += dt;
  if (!a.anim.loop) {
    const dur = a.anim.count / a.anim.fps;
    if (a.anim.t > dur) a.anim.t = dur;
  }
}
function animCol(a) {
  const a2 = a.anim;
  let col = Math.floor(a2.t * a2.fps);
  if (a2.loop) col %= a2.count;
  else col = Math.min(col, a2.count - 1);
  return col;
}

function playerAimDir() {
  const p = game.player;
  if (input.aimWorld) {
    const dx = input.aimWorld.x - p.x, dy = input.aimWorld.y - (p.y - 14);
    const d = Math.hypot(dx, dy);
    if (d > 4) return { x: dx / d, y: dy / d };
  }
  const mv = readMove();
  if (mv.x || mv.y) return norm(mv.x, mv.y);
  if (p.moveDir && (p.moveDir.x || p.moveDir.y)) return norm(p.moveDir.x, p.moveDir.y);
  return norm(p.facing.x, p.facing.y);
}

function startAttack(step) {
  const p = game.player;
  const atk = ATTACKS[step];
  const dir = playerAimDir();
  p.state = "attack";
  p.stateT = 0;
  p.atkStep = step;
  p.atkTime = 0;
  p.atkBuffered = false;
  p.atkDir = dir;
  p.atkAngle = Math.atan2(dir.y, dir.x);
  input.aimWorld = null;
  p.facing = dir;
  p.view = viewForDir(dir);
  if (Math.abs(dir.x) > 0.18) p.face = dir.x < 0 ? -1 : 1;
  setPlayerAnim("atk" + step, atk.row, atk.count, atk.count / atk.dur, false);
  if (game.audio) game.audio.swing(step);
}

function startDash() {
  const p = game.player;
  const mv = readMove();
  const dir = (mv.x || mv.y) ? norm(mv.x, mv.y) : norm(p.moveDir.x, p.moveDir.y);
  if (!dir.x && !dir.y) { dir.x = p.face; dir.y = 0; }
  p.state = "dash";
  p.stateT = 0;
  p.dashT = 0;
  p.dashDir = dir;
  p.dashCd = maxDashCd();
  p.invuln = Math.max(p.invuln, 0.26);
  p.facing = dir;
  p.view = viewForDir(dir);
  if (Math.abs(dir.x) > 0.18) p.face = dir.x < 0 ? -1 : 1;
  setPlayerAnim("dash", 5, 8, 47, false);
  p.ghostT = 0;
  if (game.audio) game.audio.dash();
  spawnParticles(p.x, p.y - 2, { count: 7, colors: ["#4b4659", "#5a5566", "#736d80"], speed: 26, life: 0.35, size: 2, grav: 20, spread: Math.PI * 2, dir: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    game.fxLights.push({ x: p.x, y: p.y - 20, r: 26, life: 0.25, max: 0.25, color: "warm" });
  }
}

function doPlayerHit() {
  const p = game.player;
  const atk = ATTACKS[p.atkStep];
  const ang = p.atkAngle;
  const ox = p.x, oy = p.y - 16;
  tryMove(p, Math.cos(ang) * atk.lunge, Math.sin(ang) * atk.lunge);
  game.slashes.push({ x: p.x, y: p.y - 18, ang, range: atk.range + 8, arc: atk.arc, life: 0.24, max: 0.24, step: p.atkStep });
  spawnParticles(p.x + Math.cos(ang) * 22, p.y - 16 + Math.sin(ang) * 22, {
    count: 5, colors: ["#f8e4a0", "#e6b455", "#fffdf4"], speed: 50, life: 0.25, size: 1, grav: 0, spread: 0.9, dir: ang, add: true,
  });
  let hitAny = false;
  for (const e of game.enemies) {
    if (e.state === "dying" || e.state === "dead") continue;
    const ex = e.x, ey = e.y - e.def.hitY;
    const d = dist(ox, oy, ex, ey);
    if (d > atk.range + e.def.hitR) continue;
    const a = Math.atan2(ey - oy, ex - ox);
    if (Math.abs(angDiff(a, ang)) > atk.arc / 2 + 0.12) continue;
    let dmg = atk.dmg;
    if (hasRelic("bone_crown")) dmg = Math.round(dmg * 1.25);
    const crit = hasRelic("grave_eye") && Math.random() < 0.15;
    if (crit) dmg *= 2;
    hitEnemy(e, dmg, ang, crit);
    hitAny = true;
  }
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const pr = game.projectiles[i];
    const d = dist(ox, oy, pr.x, pr.y);
    if (d > atk.range + 12) continue;
    const a = Math.atan2(pr.y - oy, pr.x - ox);
    if (Math.abs(angDiff(a, ang)) > atk.arc / 2 + 0.15) continue;
    burstProjectile(pr, false);
    game.projectiles.splice(i, 1);
    if (game.audio) game.audio.orbHit();
  }
  const room = game.room;
  for (const door of room.doors) {
    if (!door.secret) continue;
    const st = game.roomState;
    const sec = st.secrets[door.id];
    if (!sec || sec.broken) continue;
    const dx = (door.x + 0.5) * TILE, dy = (door.y + 0.5) * TILE;
    const d = dist(ox, oy, dx, dy);
    if (d > atk.range + 18) continue;
    const a = Math.atan2(dy - oy, dx - ox);
    if (Math.abs(angDiff(a, ang)) > atk.arc / 2 + 0.2) continue;
    damageSecret(door, 24);
    hitAny = true;
  }
  if (hitAny) {
    game.hitstop = Math.max(game.hitstop, 0.055);
    addShake(3.2);
    p.bloodHits++;
    if (p.bloodHits % 5 === 0) healPlayer(1, { silent: true, color: "#8be3b7" });
  }
}

function updatePlayer(dt) {
  const p = game.player;
  if (!p) return;
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  const mv = readMove();
  if (mv.x || mv.y) p.moveDir = { x: mv.x, y: mv.y };

  if (p.state === "dead") { p.stateT += dt; tickAnim(p, dt); return; }

  if (p.state === "hurt") {
    p.stateT += dt;
    applyKnockback(p, dt);
    if (p.stateT >= 0.3) {
      p.state = "idle";
      setPlayerAnim("idle", 0, 8, 6, true);
    }
    tickAnim(p, dt);
    return;
  }

  if (p.state === "dash") {
    p.stateT += dt;
    p.dashT += dt;
    tryMove(p, p.dashDir.x * DASH_SPEED * dt, p.dashDir.y * DASH_SPEED * dt);
    p.ghostT -= dt;
    if (p.ghostT <= 0) {
      p.ghostT = 0.035;
      game.ghosts.push({ x: p.x, y: p.y, face: p.face, view: p.view, frame: animCol(p), row: 5, life: 0.2, max: 0.2 });
    }
    if (p.stateT >= DASH_TIME) {
      p.state = "idle";
      setPlayerAnim("idle", 0, 8, 6, true);
      spawnParticles(p.x, p.y - 1, { count: 5, colors: ["#4b4659", "#736d80"], speed: 20, life: 0.3, size: 2, grav: 16, spread: TAU });
    }
    tickAnim(p, dt);
    return;
  }

  if (p.state === "attack") {
    const atk = ATTACKS[p.atkStep];
    const prev = p.atkTime;
    p.atkTime += dt;
    if (prev < atk.hitAt && p.atkTime >= atk.hitAt) doPlayerHit();
    if (input.attack && p.atkTime > atk.dur * 0.32 && !p.atkBuffered) {
      p.atkBuffered = true;
      input.attack = false;
    }
    if (p.atkTime >= atk.dur) {
      if (p.atkBuffered && p.atkStep < ATTACKS.length - 1) {
        startAttack(p.atkStep + 1);
      } else {
        p.state = "idle";
        setPlayerAnim("idle", 0, 8, 6, true);
      }
    }
    tickAnim(p, dt);
    return;
  }

  if (input.attack) {
    input.attack = false;
    startAttack(0);
    tickAnim(p, dt);
    return;
  }
  if (input.dash) {
    input.dash = false;
    if (p.dashCd <= 0) {
      startDash();
      tickAnim(p, dt);
      return;
    }
  }

  if (mv.x || mv.y) {
    p.state = "walk";
    p.facing = { x: mv.x, y: mv.y };
    p.view = viewForDir(mv);
    if (Math.abs(mv.x) > 0.18) p.face = mv.x < 0 ? -1 : 1;
    tryMove(p, mv.x * PLAYER_SPEED * dt, mv.y * PLAYER_SPEED * dt);
    setPlayerAnim("walk", 1, 12, 12, true);
    p.stepT += dt;
    if (p.stepT > 0.27) {
      p.stepT = 0;
      if (game.audio) game.audio.step();
      spawnParticles(p.x - p.face * 4, p.y, { count: 2, colors: ["#454150", "#353241"], speed: 8, life: 0.3, size: 1, grav: 8, spread: 1.2, dir: Math.PI / 2 });
    }
  } else {
    p.state = "idle";
    setPlayerAnim("idle", 0, 8, 6, true);
    p.stepT = 0;
  }
  tickAnim(p, dt);
}

function healPlayer(halves, opts = {}) {
  const p = game.player;
  if (!p || p.hp <= 0) return 0;
  let amount = halves;
  if (hasRelic("silver_grail")) amount += 1;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  const healed = p.hp - before;
  if (healed > 0) {
    refreshHearts();
    spawnParticles(p.x, p.y - 20, { count: 6, colors: ["#8be3b7", "#ddfff0", "#57b184"], speed: 24, life: 0.5, size: 1, grav: -20, spread: TAU, add: true });
    floatText("HEAL", p.x, p.y - 50, opts.color || "#8be3b7", 1);
    if (!opts.silent && game.audio) game.audio.heal();
  }
  return healed;
}

function hurtPlayer(halves, srcX, srcY) {
  const p = game.player;
  if (!p || game.mode !== "play") return;
  if (p.invuln > 0 || p.state === "dead") return;
  p.hp -= halves;
  p.invuln = 1.0;
  p.state = "hurt";
  p.stateT = 0;
  p.animName = "hurt";
  p.anim = { row: 6, count: 5, fps: 16, t: 0, loop: false };
  const d = norm(p.x - srcX, p.y - srcY);
  p.kx = d.x * 150; p.ky = d.y * 150;
  if (game.audio) game.audio.hurt();
  game.flash = 0.55;
  game.hitstop = Math.max(game.hitstop, 0.06);
  addShake(5);
  spawnParticles(p.x, p.y - 20, { count: 9, colors: ["#b23a4b", "#84263a", "#d96a6c"], speed: 60, life: 0.5, size: 2, grav: 90, spread: TAU });
  refreshHearts();
  if (p.hp <= 0) {
    p.hp = 0;
    p.state = "dead";
    p.animName = "dead";
    p.anim = { row: 7, count: 12, fps: 8, t: 0, loop: false };
    game.mode = "dying";
    game.deathT = 0;
    game.projectiles = [];
    setPrompt("");
    if (game.audio) game.audio.death();
  }
}

/* ------------------------- extended tiny glyphs ------------------------- */
Object.assign(TINY, {
  B: ["110", "101", "110", "101", "110"], D: ["110", "101", "101", "101", "110"],
  F: ["111", "100", "110", "100", "100"], G: ["011", "100", "101", "101", "011"],
  J: ["001", "001", "001", "101", "010"], K: ["101", "101", "110", "101", "101"],
  M: ["101", "111", "111", "101", "101"], N: ["110", "101", "101", "101", "101"],
  O: ["010", "101", "101", "101", "010"], P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"], S: ["011", "100", "010", "001", "110"],
  U: ["101", "101", "101", "101", "111"], V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"], X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"], Z: ["111", "001", "010", "100", "111"],
  ".": ["000", "000", "000", "000", "010"], ":": ["000", "010", "000", "010", "000"],
  "/": ["001", "001", "010", "100", "100"], "*": ["000", "101", "010", "101", "000"],
});

/* ------------------------------ enemies ------------------------------ */
function makeEnemy(type, tx, ty) {
  const def = ENEMY_DEFS[type];
  const base = def.anims.idle;
  return {
    type, def,
    x: (tx + 0.5) * TILE,
    y: (ty + 0.78) * TILE,
    r: def.r,
    hp: def.hp, maxHp: def.hp,
    state: "idle", stateT: 0,
    animName: "idle",
    anim: { row: base.row, count: base.count, fps: base.fps, t: Math.random() * 2, loop: true },
    face: 1, facing: { x: 0, y: 1 },
    kx: 0, ky: 0, flash: 0,
    aware: false, cd: rand(0.5, 1.9),
    attackT: 0, attack: null, barT: 0,
    bobSeed: rand(0, TAU), strafe: Math.random() < 0.5 ? -1 : 1, strafeT: rand(1, 2.4),
    phase2: false, introDone: type !== "warden",
    deathT: 0,
  };
}

function setEnemyAnim(e, name) {
  if (e.animName === name) return;
  const a = e.def.anims[name];
  if (!a) return;
  e.animName = name;
  e.anim.row = a.row; e.anim.count = a.count; e.anim.fps = a.fps;
  e.anim.t = 0; e.anim.loop = a.loop;
}

function hitEnemy(e, dmg, ang, crit) {
  if (!e || e.state === "dying" || e.state === "dead") return;
  e.hp -= dmg;
  e.flash = 0.14;
  e.barT = 3.4;
  e.aware = true;
  const isBoss = e.type === "warden";
  const kb = isBoss ? 0 : 82;
  e.kx += Math.cos(ang) * kb;
  e.ky += Math.sin(ang) * kb * 0.6;
  if (game.audio) game.audio.hit(crit);
  const hy = e.y - e.def.hitY - 26;
  floatText(String(Math.round(dmg)), e.x + rand(-7, 7), hy, crit ? "#ffd76a" : "#fff6d0", crit ? 1.4 : 1);
  const cols = e.type === "skeleton"
    ? ["#e8ddc2", "#b9ab8e", "#7c7462"]
    : e.type === "wretch"
      ? ["#8be3b7", "#2f7a5c", "#ddfff0"]
      : ["#cfd6df", "#8a93a3", "#e6b455"];
  spawnParticles(e.x, hy + 10, {
    count: crit ? 13 : 8, colors: cols, speed: 62, life: 0.45,
    size: crit ? 2 : 1, grav: 130, spread: TAU,
  });
  if (e.hp <= 0) { killEnemy(e, ang); return; }
  if (isBoss) {
    if (!e.phase2 && e.hp <= e.maxHp * 0.5) startPhase2(e);
    updateBossBar();
    return;
  }
  e.state = "hurt";
  e.stateT = 0;
  e.attack = null;
  setEnemyAnim(e, "hurt");
}

function startPhase2(e) {
  e.phase2 = true;
  e.state = "roar";
  e.stateT = 0;
  e.cd = 0.6;
  setEnemyAnim(e, "idle");
  game.white = 0.4;
  game.flash = 0.3;
  addShake(9);
  if (game.audio) { game.audio.roar(); game.audio.phase2 = true; }
  showToast("The Warden Unbound", "The pale armor splits. The gate shudders.", { icon: ICON.skull, dur: 4.6 });
  spawnParticles(e.x, e.y - 44, {
    count: 26, colors: ["#f59b3d", "#d55f1e", "#7a2d10", "#ffd88a"],
    speed: 88, life: 0.95, size: 2, grav: -18, spread: TAU, add: true,
  });
  game.fxLights.push({ x: e.x, y: e.y - 44, r: 90, life: 1.4, max: 1.4, color: "warm" });
}

function dropLoot(e) {
  if (e.type === "warden") return;
  const st = game.roomState;
  if (!st) return;
  if (Math.random() < e.def.drop) {
    st.pickups.push({ type: "heart", x: e.x + rand(-4, 4), y: e.y + rand(-3, 3), z: 9, vz: 30, t: 0 });
  }
  if (Math.random() < 0.16) {
    st.pickups.push({ type: "soul", x: e.x + rand(-5, 5), y: e.y + rand(-4, 2), z: 12, vz: 44, t: 0 });
  }
}

function killEnemy(e, ang) {
  if (e.state === "dying" || e.state === "dead") return;
  e.hp = 0;
  e.state = "dying";
  e.deathT = 0;
  e.attackT = 0;
  e.animName = "death";
  const a = e.def.anims.death;
  e.anim = { row: a.row, count: a.count, fps: a.fps, t: 0, loop: false };
  e.kx = Math.cos(ang) * (e.type === "warden" ? 0 : 110);
  e.ky = Math.sin(ang) * (e.type === "warden" ? 0 : 70);
  game.kills++;
  game.souls += e.def.souls;
  refreshSouls();
  floatText("+" + e.def.souls, e.x, e.y - e.def.hitY - 18, "#c9b6ff", 1);
  spawnParticles(e.x, e.y - e.def.hitY, {
    count: e.type === "warden" ? 40 : 16,
    colors: e.type === "warden"
      ? ["#e6b455", "#8a93a3", "#ffd88a", "#521626"]
      : ["#84263a", "#b23a4b", "#2c2530", "#e8ddc2"],
    speed: e.type === "warden" ? 120 : 80,
    life: e.type === "warden" ? 1.1 : 0.6,
    size: 2, grav: 170, spread: TAU,
  });
  dropLoot(e);
  if (e.type === "warden") {
    game.white = 0.55;
    addShake(10);
    game.hitstop = Math.max(game.hitstop, 0.09);
    if (game.audio) game.audio.bossDeath();
    game.fxLights.push({ x: e.x, y: e.y - 40, r: 120, life: 1.6, max: 1.6, color: "warm" });
  } else {
    game.hitstop = Math.max(game.hitstop, 0.05);
    addShake(2.6);
  }
}

function updateEnemyDeath(e, dt) {
  tickAnim(e, dt);
  e.deathT += dt;
  applyKnockback(e, dt);
  const dur = e.anim.count / e.anim.fps;
  if (e.deathT >= dur + 0.08) {
    e.state = "dead";
    const st = game.roomState;
    if (st) {
      st.corpses.push({ x: e.x, y: e.y, type: e.type, seed: hash2(Math.floor(e.x), Math.floor(e.y), 7) % 100 });
      if (st.corpses.length > 18) st.corpses.shift();
    }
    if (e.type === "warden") bossDefeated();
    checkRoomClear();
  }
}

function startSkeletonAttack(e) {
  const p = game.player;
  e.state = "attack";
  e.attackT = 0;
  e.attack = { hitAt: 0.34, hitDone: false };
  e.face = p.x < e.x ? -1 : 1;
  setEnemyAnim(e, "attack");
  if (game.audio) game.audio.swing(0);
}

function skeletonStrike(e) {
  const p = game.player;
  const ang = e.face > 0 ? 0 : Math.PI;
  game.slashes.push({ x: e.x, y: e.y - 20, ang, range: 40, arc: 1.5, life: 0.22, max: 0.22, hostile: true });
  const d = dist(e.x, e.y - 20, p.x, p.y - 16);
  if (d < 40) {
    const a = Math.atan2(p.y - 16 - (e.y - 20), p.x - e.x);
    if (Math.abs(angDiff(a, ang)) < 1.0) hurtPlayer(2, e.x, e.y);
  }
  spawnParticles(e.x + e.face * 16, e.y - 20, {
    count: 4, colors: ["#9a8f7a", "#c9bfa6"], speed: 30, life: 0.28, size: 1, grav: 70, spread: 0.9, dir: ang,
  });
}

function updateSkeleton(e, dt) {
  const p = game.player;
  if (e.state === "dying") { updateEnemyDeath(e, dt); return; }
  if (e.state === "hurt") {
    e.stateT += dt;
    applyKnockback(e, dt);
    tickAnim(e, dt);
    if (e.stateT >= 0.34) { e.state = "idle"; setEnemyAnim(e, "idle"); }
    return;
  }
  if (e.state === "attack") {
    e.attackT += dt;
    if (!e.attack.hitDone && e.attackT >= e.attack.hitAt) {
      e.attack.hitDone = true;
      skeletonStrike(e);
    }
    tickAnim(e, dt);
    if (e.attackT >= e.anim.count / e.anim.fps) {
      e.state = "idle";
      e.cd = rand(0.9, 1.7);
      setEnemyAnim(e, "idle");
    }
    return;
  }
  const d = dist(e.x, e.y, p.x, p.y);
  if (!e.aware && d < e.def.sight && hasLOS(game.room, e.x, e.y - 20, p.x, p.y - 16)) e.aware = true;
  if (!e.aware) {
    setEnemyAnim(e, "idle");
    tickAnim(e, dt);
    return;
  }
  e.face = p.x < e.x ? -1 : 1;
  if (e.cd > 0) e.cd -= dt;
  if (d <= 34 && e.cd <= 0 && hasLOS(game.room, e.x, e.y - 20, p.x, p.y - 16)) {
    startSkeletonAttack(e);
    tickAnim(e, dt);
    return;
  }
  if (d > 27) {
    moveToward(e, p.x, p.y, e.def.speed, dt);
    setEnemyAnim(e, "walk");
  } else {
    setEnemyAnim(e, "idle");
  }
  tickAnim(e, dt);
}

function wretchFire(e) {
  const p = game.player;
  const base = Math.atan2(p.y - 20 - (e.y - 40), p.x - e.x);
  for (let i = -1; i <= 1; i++) {
    const a = base + i * 0.16;
    game.projectiles.push({
      x: e.x + Math.cos(a) * 10, y: e.y - 40 + Math.sin(a) * 10,
      vx: Math.cos(a) * 66, vy: Math.sin(a) * 66,
      r: 6, life: 3.4, t: 0, dmg: 2,
    });
  }
  if (game.audio) game.audio.projectile();
  game.fxLights.push({ x: e.x, y: e.y - 40, r: 30, life: 0.35, max: 0.35, color: "green" });
}

function updateWretch(e, dt) {
  const p = game.player;
  if (e.state === "dying") { updateEnemyDeath(e, dt); return; }
  if (e.state === "hurt") {
    e.stateT += dt;
    applyKnockback(e, dt);
    tickAnim(e, dt);
    if (e.stateT >= 0.34) { e.state = "idle"; setEnemyAnim(e, "idle"); }
    return;
  }
  if (e.state === "attack") {
    e.attackT += dt;
    if (!e.attack.hitDone && e.attackT >= 0.5) {
      e.attack.hitDone = true;
      wretchFire(e);
    }
    tickAnim(e, dt);
    if (e.attackT >= e.anim.count / e.anim.fps) {
      e.state = "idle";
      e.cd = rand(1.7, 2.5);
      setEnemyAnim(e, "idle");
    }
    return;
  }
  const d = dist(e.x, e.y, p.x, p.y);
  if (!e.aware && d < e.def.sight && hasLOS(game.room, e.x, e.y - 34, p.x, p.y - 16)) e.aware = true;
  if (!e.aware) {
    setEnemyAnim(e, "idle");
    tickAnim(e, dt);
    return;
  }
  e.face = p.x < e.x ? -1 : 1;
  e.cd -= dt;
  if (e.cd <= 0 && d < 245 && hasLOS(game.room, e.x, e.y - 34, p.x, p.y - 18)) {
    e.state = "attack";
    e.attackT = 0;
    e.attack = { hitDone: false };
    setEnemyAnim(e, "attack");
    return;
  }
  e.strafeT -= dt;
  if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(1.2, 2.4); }
  if (d < 82) {
    moveToward(e, e.x * 2 - p.x, e.y * 2 - p.y, e.def.speed * 0.9, dt);
  } else if (d > 152) {
    moveToward(e, p.x, p.y, e.def.speed, dt);
  } else {
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.PI / 2) * e.strafe;
    moveToward(e, e.x + Math.cos(a) * 28, e.y + Math.sin(a) * 28, e.def.speed * 0.62, dt);
  }
  setEnemyAnim(e, "walk");
  tickAnim(e, dt);
}

function startBossCleave(e) {
  e.state = "cleave";
  e.attackT = 0;
  e.attack = { hitAt: 0.72, hitDone: false };
  e.face = game.player.x < e.x ? -1 : 1;
  setEnemyAnim(e, "cleave");
  if (game.audio) game.audio.swing(2);
}

function startBossSlam(e) {
  e.state = "slam";
  e.attackT = 0;
  e.attack = { hitAt: 0.84, hitDone: false };
  e.face = game.player.x < e.x ? -1 : 1;
  setEnemyAnim(e, "slam");
}

function bossCleave(e) {
  const p = game.player;
  const ang = e.face > 0 ? 0 : Math.PI;
  game.slashes.push({ x: e.x, y: e.y - 34, ang, range: 98, arc: 2.0, life: 0.34, max: 0.34, hostile: true, big: true });
  tryMove(e, Math.cos(ang) * 18, Math.sin(ang) * 10);
  const d = dist(e.x, e.y - 30, p.x, p.y - 14);
  if (d < 100) {
    const a = Math.atan2(p.y - 14 - (e.y - 30), p.x - e.x);
    if (Math.abs(angDiff(a, ang)) < 1.15) hurtPlayer(4, e.x, e.y);
  }
  addShake(6);
  spawnParticles(e.x + Math.cos(ang) * 50, e.y - 30, {
    count: 9, colors: ["#f59b3d", "#d55f1e", "#ffd88a"], speed: 70, life: 0.35, size: 1, grav: 40, spread: 1.2, dir: ang, add: true,
  });
}

function bossSlam(e) {
  const p = game.player;
  if (game.audio) game.audio.slam();
  addShake(9);
  game.hitstop = Math.max(game.hitstop, 0.09);
  game.shocks.push({ x: e.x, y: e.y - 4, r: 16, max: 180, speed: 235, dmg: 2, hit: false });
  if (dist(e.x, e.y - 10, p.x, p.y - 10) < 42) hurtPlayer(3, e.x, e.y);
  spawnParticles(e.x, e.y - 2, {
    count: 22, colors: ["#6a6172", "#4b4659", "#9a8f7a", "#f59b3d"],
    speed: 95, life: 0.7, size: 2, grav: 130, spread: TAU,
  });
  game.fxLights.push({ x: e.x, y: e.y - 8, r: 80, life: 0.45, max: 0.45, color: "warm" });
}

function updateWarden(e, dt) {
  const p = game.player;
  if (e.state === "dying") { updateEnemyDeath(e, dt); return; }
  if (!e.introDone) {
    e.face = p.x < e.x ? -1 : 1;
    tickAnim(e, dt);
    if (game.bossIntro <= 0) {
      e.introDone = true;
      e.state = "roar";
      e.stateT = 0;
      setEnemyAnim(e, "idle");
      if (game.audio) { game.audio.roar(); game.audio.bossActive = true; }
      addShake(7);
      game.flash = 0.2;
    }
    return;
  }
  if (e.state === "roar") {
    e.stateT += dt;
    tickAnim(e, dt);
    if (e.stateT >= 1.05) { e.state = "walk"; e.cd = 0.7; }
    return;
  }
  if (e.state === "cleave" || e.state === "slam") {
    e.attackT += dt;
    if (!e.attack.hitDone && e.attackT >= e.attack.hitAt) {
      e.attack.hitDone = true;
      if (e.state === "cleave") bossCleave(e); else bossSlam(e);
    }
    tickAnim(e, dt);
    if (e.attackT >= e.anim.count / e.anim.fps + 0.06) {
      e.state = "walk";
      e.cd = rand(e.phase2 ? 0.85 : 1.2, e.phase2 ? 1.4 : 1.9);
    }
    return;
  }
  const d = dist(e.x, e.y, p.x, p.y);
  e.face = p.x < e.x ? -1 : 1;
  e.cd -= dt;
  if (e.cd <= 0 && hasLOS(game.room, e.x, e.y - 40, p.x, p.y - 14)) {
    if (d < 98) { startBossCleave(e); return; }
    if (e.phase2 && d < 200) { startBossSlam(e); return; }
  }
  if (d > 68) {
    moveToward(e, p.x, p.y, e.def.speed * (e.phase2 ? 1.35 : 1), dt);
    setEnemyAnim(e, "walk");
  } else {
    setEnemyAnim(e, "idle");
  }
  tickAnim(e, dt);
}

function separateEnemies() {
  const arr = game.enemies.filter((e) => e.state !== "dead" && e.state !== "dying");
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      const min = a.r + b.r + 2;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        if (b.type !== "warden") tryMove(b, nx * push, ny * push);
        if (a.type !== "warden") tryMove(a, -nx * push, -ny * push);
      }
    }
  }
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    if (e.state === "dead") continue;
    e.flash = Math.max(0, e.flash - dt);
    if (e.barT > 0) e.barT -= dt;
    if (e.type === "skeleton") updateSkeleton(e, dt);
    else if (e.type === "wretch") updateWretch(e, dt);
    else updateWarden(e, dt);
  }
  separateEnemies();
  updateBossBar();
  checkRoomClear();
}

/* ---------------------------- projectiles ---------------------------- */
function burstProjectile(pr) {
  spawnParticles(pr.x, pr.y, {
    count: 11, colors: ["#8be3b7", "#57b184", "#ddfff0", "#2f7a5c"],
    speed: 58, life: 0.4, size: 1, grav: 30, spread: TAU, add: true,
  });
  game.fxLights.push({ x: pr.x, y: pr.y, r: 28, life: 0.25, max: 0.25, color: "green" });
}

function updateProjectiles(dt) {
  const p = game.player;
  const room = game.room;
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const pr = game.projectiles[i];
    pr.t += dt;
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (Math.random() < 0.45) {
      spawnParticles(pr.x, pr.y, {
        count: 1, colors: ["#57b184", "#8be3b7"], speed: 5, life: 0.3,
        size: 1, grav: -12, spread: TAU, add: true,
      });
    }
    let dead = pr.life <= 0;
    if (!dead && isSolidTile(room, Math.floor(pr.x / TILE), Math.floor(pr.y / TILE))) dead = true;
    if (!dead) {
      const d = dist(pr.x, pr.y, p.x, p.y - 18);
      if (d < 13) {
        hurtPlayer(pr.dmg, pr.x, pr.y);
        dead = true;
      }
    }
    if (dead) {
      burstProjectile(pr);
      if (game.audio) game.audio.orbHit();
      game.projectiles.splice(i, 1);
    }
  }
}

function updateShocks(dt) {
  const p = game.player;
  for (let i = game.shocks.length - 1; i >= 0; i--) {
    const sh = game.shocks[i];
    sh.r += sh.speed * dt;
    if (!sh.hit) {
      const d = dist(sh.x, sh.y, p.x, p.y - 4);
      if (Math.abs(d - sh.r) < 15) {
        sh.hit = true;
        hurtPlayer(sh.dmg, sh.x, sh.y);
      }
    }
    if (sh.r >= sh.max) game.shocks.splice(i, 1);
  }
}

/* ----------------------------- particles ----------------------------- */
function spawnParticles(x, y, opts = {}) {
  if (game.particles.length > 360) game.particles.splice(0, 70);
  const count = opts.count ?? 8;
  const colors = opts.colors ?? ["#fff6d0"];
  const speed = opts.speed ?? 40;
  const life = opts.life ?? 0.4;
  const size = opts.size ?? 1;
  const grav = opts.grav ?? 0;
  const spread = opts.spread ?? 1.2;
  const dir = opts.dir;
  const add = !!opts.add;
  for (let i = 0; i < count; i++) {
    const a = dir !== undefined ? dir + rand(-spread / 2, spread / 2) : rand(0, TAU);
    const sp = speed * rand(0.3, 1.15);
    game.particles.push({
      x: x + rand(-3, 3), y: y + rand(-3, 3),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: life * rand(0.65, 1.2), max: life, size,
      color: colors[Math.floor(Math.random() * colors.length)],
      grav, add, drag: opts.drag ?? 2.2,
    });
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) { game.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
    const damp = Math.exp(-p.drag * dt);
    p.vx *= damp; p.vy *= damp;
  }
}

function floatText(text, x, y, color = "#fff6d0", scale = 1) {
  if (game.texts.length > 36) game.texts.shift();
  game.texts.push({ text, x, y, color, scale, life: 0.9, max: 0.9 });
}

function updateTexts(dt) {
  for (let i = game.texts.length - 1; i >= 0; i--) {
    const t = game.texts[i];
    t.life -= dt;
    t.y -= 24 * dt;
    if (t.life <= 0) game.texts.splice(i, 1);
  }
}

/* ------------------------------ pickups ------------------------------ */
function updatePickups(dt) {
  const p = game.player;
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const pk = game.pickups[i];
    pk.t += dt;
    if (pk.z > 0 || pk.vz !== 0) {
      pk.z += pk.vz * dt;
      pk.vz -= 260 * dt;
      if (pk.z <= 0) { pk.z = 0; pk.vz = 0; }
    }
    const d = dist(p.x, p.y - 10, pk.x, pk.y - pk.z);
    if (pk.type === "heart" && p.hp >= p.maxHp) continue;
    const magnet = pk.type === "soul" ? pk.t > 0.24 : d < 34;
    if (magnet) {
      const sp = (pk.type === "soul" ? 190 : 130) * dt;
      const dd = Math.max(1, d);
      pk.x += ((p.x - pk.x) / dd) * sp;
      pk.y += ((p.y - 8 - pk.y) / dd) * sp;
    }
    if (d < 12) {
      if (pk.type === "heart") {
        healPlayer(2);
        spawnParticles(pk.x, pk.y - 4, {
          count: 7, colors: ["#d96a6c", "#f0a2a0", "#fff6d0"], speed: 30, life: 0.4,
          size: 1, grav: -30, spread: TAU, add: true,
        });
      } else {
        game.souls += 8;
        refreshSouls();
        floatText("+8", pk.x, pk.y - 14, "#c9b6ff", 1);
      }
      if (game.audio) game.audio.pickup();
      game.pickups.splice(i, 1);
    }
  }
}

/* ------------------------------ progress ------------------------------ */
function bossDefeated() {
  const st = game.roomState;
  if (!st || st.bossDead) return;
  st.bossDead = true;
  st.cleared = true;
  game.stats.boss = true;
  game.outroT = 0;
  game.victorySounded = true;
  if (game.audio) {
    game.audio.bossActive = false;
    game.audio.phase2 = false;
    game.audio.setMood("calm");
    game.audio.victory();
  }
  addShake(8);
  game.white = 0.2;
  showToast("The Warden Falls", "The gate remembers your vow.", { icon: ICON.crown, dur: 6 });
  for (let i = 0; i < 5; i++) {
    game.pickups.push({
      type: "heart",
      x: game.boss.x + rand(-44, 44),
      y: game.boss.y + rand(-16, 22),
      z: rand(8, 18), vz: rand(-20, 10), t: 0,
    });
  }
}

function checkRoomClear() {
  const room = game.room, st = game.roomState;
  if (!room || !st || st.cleared) return;
  if (!st.enemies.every((e) => e.state === "dead")) return;
  st.cleared = true;
  if (game.audio) game.audio.door(true);
  addShake(2.4);
  game.white = Math.max(game.white, 0.07);
  if (room.id !== "warden_gate") {
    showToast("The Seal Breaks", "Every keeper has fallen. The doors open.", { icon: ICON.key, dur: 3.6 });
  }
}

function damageSecret(door, dmg) {
  const st = game.roomState;
  if (!st) return;
  const sec = st.secrets[door.id];
  if (!sec || sec.broken) return;
  sec.hp += dmg;
  const x = (door.x + 0.5) * TILE, y = (door.y + 0.5) * TILE;
  spawnParticles(x, y, {
    count: 5, colors: ["#8d8597", "#5c5666", "#c9c2d4"], speed: 38,
    life: 0.42, size: 2, grav: 140, spread: TAU,
  });
  addShake(2);
  if (game.audio) game.audio.hit(false);
  if (sec.hp >= 56) {
    sec.broken = true;
    game.white = 0.26;
    addShake(6);
    if (game.audio) game.audio.secret();
    showToast("A Hidden Way", "Cold air spills through the broken stone.", { icon: ICON.key, dur: 4.2 });
    spawnParticles(x, y, {
      count: 26, colors: ["#8d8597", "#c9c2d4", "#5c5666", "#e6b455"],
      speed: 75, life: 0.85, size: 2, grav: 150, spread: TAU,
    });
    game.fxLights.push({ x, y, r: 44, life: 1, max: 1, color: "gold" });
  } else {
    floatText("CRACK", x, y - 16, "#c9c2d4", 1);
  }
}

/* ---------------------------- interactions ---------------------------- */
function findInteractable() {
  const room = game.room, p = game.player, st = game.roomState;
  if (!room || !p || !st) return null;
  let best = null, bestD = 1e9;
  const consider = (kind, ref, x, y, label, range) => {
    const d = dist(p.x, p.y - 8, x, y);
    if (d < range && d < bestD) { best = { kind, ref, x, y, label }; bestD = d; }
  };
  for (const c of room.chests) {
    const cell = st.chests[`${c.x},${c.y}`];
    if (!cell || cell.opened) continue;
    consider("chest", c, (c.x + 0.5) * TILE, (c.y + 0.7) * TILE, "Open chest", 36);
  }
  for (const s of room.sigils) {
    if (st.sigilTaken) continue;
    consider("sigil", s, (s.x + 0.5) * TILE, (s.y + 0.55) * TILE, "Claim " + s.name, 40);
  }
  if (room.altar && !st.altarUsed) {
    consider("altar", room.altar, (room.altar.x + 0.5) * TILE, (room.altar.y + 0.6) * TILE, "Pray at the altar", 42);
  }
  if (!best) {
    for (const door of room.doors) {
      if (door.secret) {
        const sec = st.secrets[door.id];
        if (!sec || sec.broken) continue;
        consider("secret", door, (door.x + 0.5) * TILE, (door.y + 0.5) * TILE, "Cracked stone", 44);
        continue;
      }
      if (doorPassable(door)) continue;
      let label = "Sealed door";
      if (door.gate) label = "Sealed gate · three sigils";
      else if (room.id === "warden_gate") label = "Sealed by the Warden";
      else label = "Sealed · slay the keepers";
      consider("door", door, (door.x + 0.5) * TILE, (door.y + 0.5) * TILE, label, 48);
    }
  }
  return best;
}

function openChest(c) {
  const cell = game.roomState.chests[`${c.x},${c.y}`];
  if (!cell || cell.opened) return;
  cell.opened = true;
  const px = (c.x + 0.5) * TILE, py = (c.y + 0.7) * TILE;
  if (game.audio) game.audio.chest();
  spawnParticles(px, py - 14, {
    count: 18, colors: ["#f8e4a0", "#e6b455", "#fffdf4"],
    speed: 62, life: 0.7, size: 1, grav: -20, spread: TAU, add: true,
  });
  game.fxLights.push({ x: px, y: py - 16, r: 42, life: 0.85, max: 0.85, color: "gold" });
  game.white = Math.max(game.white, 0.08);
  const content = cell.content || { kind: "souls" };
  if (content.kind === "relic") {
    const rel = RELICS.find((r) => r.id === content.relic);
    if (!rel) return;
    game.run.relics.add(rel.id);
    if (rel.id === "ember_heart") {
      game.player.maxHp += 2;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 2);
      refreshHearts(true);
    }
    refreshRelics(true);
    if (game.audio) game.audio.sigil();
    showToast(rel.name, rel.desc, { icon: rel.icon, dur: 5.4 });
  } else if (content.kind === "heal") {
    healPlayer(6, { silent: true });
    if (game.audio) game.audio.heal();
    showToast("Mended", "A flask of grave-wine, still warm.", { icon: ICON.heart, dur: 3.4 });
  } else {
    game.souls += 40;
    refreshSouls();
    showToast("Souls", "Forty souls whisper from the chest.", { icon: ICON.skull, dur: 3.4 });
  }
}

function takeSigil(s) {
  const st = game.roomState;
  if (st.sigilTaken) return;
  st.sigilTaken = true;
  game.sigils++;
  refreshSigils(true);
  const px = (s.x + 0.5) * TILE, py = (s.y + 0.6) * TILE;
  if (game.audio) game.audio.sigil();
  game.white = 0.36;
  addShake(4);
  spawnParticles(px, py - 18, {
    count: 30, colors: ["#f8e4a0", "#e6b455", "#fffdf4", "#f59b3d"],
    speed: 80, life: 0.9, size: 2, grav: -12, spread: TAU, add: true,
  });
  game.fxLights.push({ x: px, y: py - 18, r: 70, life: 1.4, max: 1.4, color: "gold" });
  showToast(s.name, `Sigil ${game.sigils} of ${SIGILS.length}. The seal weakens.`, { icon: ICON.sigil, dur: 4.4 });
  if (game.sigils >= SIGILS.length) {
    setTimeout(() => {
      if (game.mode === "play") {
        showToast("The Gate Below", "Three sigils burn as one. The way to the Warden is open.", { icon: ICON.key, dur: 5 });
        if (game.audio) game.audio.unlock();
      }
    }, 1200);
  }
}

function useAltar() {
  const p = game.player, st = game.roomState;
  if (st.altarUsed) return;
  if (p.hp >= p.maxHp) {
    showToast("", "You are already whole.", { dur: 2.2 });
    return;
  }
  st.altarUsed = true;
  const healing = healPlayer(6);
  const px = (game.room.altar.x + 0.5) * TILE, py = (game.room.altar.y + 0.6) * TILE;
  spawnParticles(px, py - 18, {
    count: 20, colors: ["#f8e4a0", "#ddfff0", "#8be3b7"],
    speed: 40, life: 0.9, size: 1, grav: -30, spread: TAU, add: true,
  });
  if (game.audio) game.audio.heal();
  showToast("The Vow Mends", healing > 0 ? "Warmth returns to your limbs." : "The candles gutter.", { icon: ICON.heart, dur: 3.4 });
}

function doInteract(it) {
  if (!it) return;
  if (it.kind === "chest") openChest(it.ref);
  else if (it.kind === "sigil") takeSigil(it.ref);
  else if (it.kind === "altar") useAltar();
  else if (it.kind === "secret") {
    if (game.audio) game.audio.locked();
    showToast("", "Steel alone will open this stone.", { dur: 2.2 });
  } else if (it.kind === "door") {
    if (game.audio) game.audio.locked();
    let desc = "The keepers still hold this room.";
    if (it.ref.gate) desc = `The gate bears ${Math.max(0, SIGILS.length - game.sigils)} empty sockets.`;
    else if (game.roomId === "warden_gate") desc = "The Pale Warden holds the final gate.";
    showToast("Sealed", desc, { dur: 2.6 });
  }
}

function updateInteraction(dt) {
  if (game.transition) { setPrompt(""); return; }
  const it = findInteractable();
  game.interactTarget = it;
  if (it) setPrompt(`<span class="key">E</span><span>${it.label}</span>`);
  else setPrompt("");
  if (input.interact) {
    input.interact = false;
    if (it) doInteract(it);
  }
  const st = game.roomState;
  const secret = game.room.doors.find((d) => d.secret && st.secrets[d.id] && !st.secrets[d.id].broken);
  if (secret) {
    game.secretGlintT = (game.secretGlintT || 0) - dt;
    if (game.secretGlintT <= 0) {
      game.secretGlintT = 1.15;
      const gx = (secret.x + 0.5) * TILE, gy = (secret.y + 0.5) * TILE;
      spawnParticles(gx, gy, { count: 1, colors: ["#f0a2a0", "#f8e4a0"], speed: 4, life: 0.8, size: 1, grav: -10, spread: TAU, add: true });
    }
    if (hasRelic("grave_lantern") && game.lanternHintRoom !== game.roomId) {
      game.lanternHintRoom = game.roomId;
      showToast("The Lantern Stirs", "A false wall hums nearby.", { icon: ICON.flame, dur: 3.4 });
    }
  }
}

/* --------------------------- room transitions --------------------------- */
function startTransition(door) {
  if (game.transition) return;
  game.transition = { t: 0, dur: 0.95, door, from: game.roomId, swapped: false };
  game.doorCd = 1.2;
  const p = game.player;
  p.state = "idle";
  setPlayerAnim("idle", 0, 8, 6, true);
  p.kx = p.ky = 0;
  game.projectiles = [];
  setPrompt("");
  if (game.audio) game.audio.door(true);
}

function updateTransition(dt) {
  const tr = game.transition;
  if (!tr) return;
  tr.t += dt;
  const mid = tr.dur * 0.48;
  if (!tr.swapped && tr.t >= mid) {
    tr.swapped = true;
    enterRoom(tr.door.to, tr.from);
  }
  if (tr.t >= tr.dur) {
    game.transition = null;
    game.fade = 0;
    game.doorCd = 0.5;
    return;
  }
  game.fade = tr.swapped ? 1 - (tr.t - mid) / (tr.dur - mid) : Math.min(1, tr.t / mid);
}

function checkDoorStep() {
  if (game.transition || game.doorCd > 0) return;
  const room = game.room, p = game.player;
  const door = doorAt(room, Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  if (door && doorPassable(door)) startTransition(door);
}

/* ------------------------------- effects ------------------------------- */
function updateSlashes(dt) {
  for (let i = game.slashes.length - 1; i >= 0; i--) {
    game.slashes[i].life -= dt;
    if (game.slashes[i].life <= 0) game.slashes.splice(i, 1);
  }
}
function updateGhosts(dt) {
  for (let i = game.ghosts.length - 1; i >= 0; i--) {
    game.ghosts[i].life -= dt;
    if (game.ghosts[i].life <= 0) game.ghosts.splice(i, 1);
  }
}
function updateFxLights(dt) {
  for (let i = game.fxLights.length - 1; i >= 0; i--) {
    game.fxLights[i].life -= dt;
    if (game.fxLights[i].life <= 0) game.fxLights.splice(i, 1);
  }
}

/* ------------------------------ game loop ------------------------------ */
function updateDying(dt) {
  const p = game.player;
  game.deathT += dt;
  if (p) {
    p.anim.t += dt;
    const dur = p.anim.count / p.anim.fps;
    if (p.anim.t > dur) p.anim.t = dur;
  }
  updateCamera(dt, false);
  updateParticles(dt);
  updateTexts(dt);
  updateSlashes(dt);
  updateGhosts(dt);
  updateFxLights(dt);
  game.flash = Math.max(0, game.flash - dt * 1.2);
  if (game.deathT > 1.55) game.fade = Math.min(1, game.fade + dt * 0.7);
  if (game.deathT > 2.95) showEnd(false);
}

function update(dt) {
  if (game.toastT > 0) updateToast(dt);
  if (game.mode === "title") {
    game.titleTime += dt;
    game.time += dt;
    return;
  }
  if (game.mode === "paused" || game.mode === "ledger" || game.mode === "dead" || game.mode === "won") return;

  game.time += dt;
  game.flash = Math.max(0, game.flash - dt * 2.6);
  game.white = Math.max(0, game.white - dt * 1.7);
  if (game.audio) game.audio.update(dt);

  if (game.mode === "dying") { updateDying(dt); return; }

  let wdt = dt;
  if (game.hitstop > 0) {
    game.hitstop = Math.max(0, game.hitstop - dt);
    wdt = dt * 0.1;
  }
  game.cam.shake = Math.max(0, game.cam.shake - dt * 34);

  if (game.transition) {
    updateTransition(dt);
    updateParticles(wdt);
    updateTexts(wdt);
    updateSlashes(wdt);
    updateGhosts(wdt);
    updateFxLights(wdt);
    updateHud();
    return;
  }

  if (!game.transition) game.fade = Math.max(0, game.fade - dt * 2.2);
  game.doorCd = Math.max(0, game.doorCd - dt);
  if (game.bossIntro > 0) game.bossIntro = Math.max(0, game.bossIntro - dt);

  updatePlayer(wdt);
  updateEnemies(wdt);
  updateProjectiles(wdt);
  updateShocks(wdt);
  updatePickups(wdt);
  updateParticles(wdt);
  updateTexts(wdt);
  updateSlashes(wdt);
  updateGhosts(wdt);
  updateFxLights(wdt);
  updateInteraction(dt);
  checkDoorStep();

  const bossFight = game.roomId === "warden_gate" && game.boss && game.boss.state !== "dead" && game.boss.state !== "dying" && !game.roomState.bossDead;
  if (bossFight && game.bossIntro > 0) {
    const room = game.room;
    const tx = clamp(game.boss.x - VIEW_W / 2, 0, Math.max(0, room.w * TILE - VIEW_W));
    const ty = clamp(game.boss.y - 30 - VIEW_H / 2, 0, Math.max(0, room.h * TILE - VIEW_H));
    const k = Math.min(1, dt * 2.6);
    game.cam.x = lerp(game.cam.x, tx, k);
    game.cam.y = lerp(game.cam.y, ty, k);
  } else if (bossFight) {
    const room = game.room;
    const midX = game.player.x * 0.62 + game.boss.x * 0.38;
    const midY = game.player.y * 0.62 + (game.boss.y - 26) * 0.38;
    const tx = clamp(midX - VIEW_W / 2, 0, Math.max(0, room.w * TILE - VIEW_W));
    const ty = clamp(midY - 34 - VIEW_H / 2, 0, Math.max(0, room.h * TILE - VIEW_H));
    const k = Math.min(1, dt * 3.4);
    game.cam.x = lerp(game.cam.x, tx, k);
    game.cam.y = lerp(game.cam.y, ty, k);
  } else {
    updateCamera(dt);
  }

  updateHud();
  updateBossBar();

  if (game.roomState && game.roomState.bossDead && game.roomId === "warden_gate" && game.mode === "play") {
    game.outroT += dt;
    if (game.outroT > 3.4) showEnd(true);
  }
}

function pauseGame() {
  if (game.mode !== "play" || game.transition) return;
  game.mode = "paused";
  input.attack = false; input.dash = false; input.interact = false;
  keys.clear();
  setPrompt("");
  const owned = [...game.run.relics].map((id) => RELICS.find((r) => r.id === id)).filter(Boolean);
  ui.pauseRelics.innerHTML = owned.length
    ? owned.map((r) => `<div class="pauserelic"><span class="picon" style="background-position:${iconStyle(r.icon)}"></span><div><b>${r.name}</b><small>${r.desc}</small></div></div>`).join("")
    : '<p class="muted">No relics claimed yet.</p>';
  pauseEl.classList.remove("hide");
  if (game.audio) game.audio.resume();
}

function resumeGame() {
  if (game.mode !== "paused") return;
  game.mode = "play";
  pauseEl.classList.add("hide");
  if (game.audio) game.audio.resume();
}

/* ------------------------------- ledger ------------------------------- */
const ledgerState = { tab: "relics", relicId: null, gearId: "longsword", origin: "play" };
let ledgerFigureTimer = 0;
let ledgerFigureTick = 0;

function stopLedgerFigure() {
  if (ledgerFigureTimer) { clearInterval(ledgerFigureTimer); ledgerFigureTimer = 0; }
}

function startLedgerFigure() {
  stopLedgerFigure();
  ledgerFigureTick = 0;
  if (ui.ledgerFigure) ui.ledgerFigure.style.backgroundPosition = "0px -1536px";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const order = [1, 0, 2];
  ledgerFigureTimer = setInterval(() => {
    ledgerFigureTick += 1;
    const view = order[Math.floor(ledgerFigureTick / 24) % order.length];
    const frame = ledgerFigureTick % 8;
    if (ui.ledgerFigure) {
      ui.ledgerFigure.style.backgroundPosition = `${-frame * 256}px ${-(view * 8) * 192}px`;
    }
  }, 170);
}

function openLedger() {
  if (!game.run || !game.player) return;
  if (game.mode !== "play" && game.mode !== "paused") return;
  if (game.transition) return;
  ledgerState.origin = game.mode;
  game.mode = "ledger";
  keys.clear();
  input.attack = false; input.dash = false; input.interact = false; input.aimWorld = null;
  setPrompt("");
  pauseEl.classList.add("hide");
  hudEl.classList.add("hud-hidden");
  if (!ledgerState.relicId) {
    const firstOwned = RELICS.find((r) => game.run.relics.has(r.id));
    ledgerState.relicId = (firstOwned || RELICS[0]).id;
  }
  renderLedger();
  ui.ledger.classList.remove("hide");
  startLedgerFigure();
  if (game.audio) game.audio.resume();
}

function closeLedger() {
  if (game.mode !== "ledger") return;
  stopLedgerFigure();
  ui.ledger.classList.add("hide");
  keys.clear();
  input.attack = false; input.dash = false; input.interact = false; input.aimWorld = null;
  hudEl.classList.remove("hud-hidden");
  if (ledgerState.origin === "paused") {
    game.mode = "paused";
    pauseEl.classList.remove("hide");
  } else {
    game.mode = "play";
  }
  if (game.audio) game.audio.resume();
}

function setLedgerTab(tab) {
  ledgerState.tab = tab === "gear" ? "gear" : "relics";
  renderLedger();
}

function moveLedgerSelection(dir) {
  const list = ledgerState.tab === "relics" ? RELICS : EQUIPMENT;
  const key = ledgerState.tab === "relics" ? "relicId" : "gearId";
  let i = list.findIndex((x) => x.id === ledgerState[key]);
  if (i < 0) i = 0;
  ledgerState[key] = list[(i + dir + list.length) % list.length].id;
  renderLedger();
  const sel = ui.ledger.querySelector(".relic-card.selected, .gear-row.selected");
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
}

function ledgerRelicCard(r) {
  const owned = game.run.relics.has(r.id);
  const selected = r.id === ledgerState.relicId;
  return `<button type="button" class="relic-card ${owned ? "owned" : "locked"} ${selected ? "selected" : ""}" data-relic="${r.id}">
    <span class="relic-glyph" style="background-position:${iconStyle(r.icon)}"></span>
    <span class="rcopy"><b>${r.name}</b><small>${r.tag}</small></span>
    <span class="owned-mark">${owned ? "CLAIMED" : "UNFOUND"}</span>
  </button>`;
}

function ledgerGearRow(item) {
  const selected = item.id === ledgerState.gearId;
  return `<button type="button" class="gear-row ${selected ? "selected" : ""}" data-gear="${item.id}">
    <span class="gear-glyph" style="background-position:${iconStyle(item.icon)}"></span>
    <span class="gear-copy"><b>${item.name}</b><small>${item.slot} · EQUIPPED</small></span>
    <span class="gear-stat">${item.stat}</span>
  </button>`;
}

function renderLedgerDetail() {
  if (!ui.ledgerDetail) return;
  if (ledgerState.tab === "gear") {
    const item = EQUIPMENT.find((e) => e.id === ledgerState.gearId) || EQUIPMENT[0];
    ui.ledgerDetail.innerHTML = `
      <div class="detail-top">
        <span class="detail-glyph" style="background-size:384px 96px;background-position:${iconStyle(item.icon, 48)}"></span>
        <div><div class="detail-kind">${item.slot} · EQUIPPED</div><h3>${item.name}</h3></div>
      </div>
      <p class="detail-effect">${item.stat}. ${item.desc}</p>
      <p class="detail-lore">&ldquo;${item.lore}&rdquo;</p>
      <div class="detail-tags"><span>${item.slot}</span><span>OATHBOUND SET</span><span class="dim">CANNOT BE UNBOUND</span></div>`;
    return;
  }
  const r = RELICS.find((x) => x.id === ledgerState.relicId) || RELICS[0];
  const owned = game.run.relics.has(r.id);
  ui.ledgerDetail.innerHTML = `
    <div class="detail-top">
      <span class="detail-glyph" style="background-size:384px 96px;background-position:${iconStyle(r.icon, 48)};${owned ? "" : "filter:grayscale(1) brightness(0.4);"}"></span>
      <div><div class="detail-kind">${r.tag} RELIC · ${owned ? "CLAIMED" : "UNFOUND"}</div><h3>${r.name}</h3></div>
    </div>
    <p class="detail-effect">${owned ? r.desc : "Sealed. Its boon has not yet been claimed from the keep."}</p>
    <p class="detail-lore">${owned ? `&ldquo;${r.lore}&rdquo;` : "The ledger leaves this page blank until the relic is found."}</p>
    <div class="detail-tags"><span>${r.tag}</span><span class="${owned ? "" : "dim"}">${owned ? "BOUND TO THE VOW" : "NOT YET FOUND"}</span><span class="dim">${owned ? "RELIC" : "??? RELIC"}</span></div>`;
}

function renderLedger() {
  if (!game.run || !ui.ledger) return;
  const owned = RELICS.filter((r) => game.run.relics.has(r.id));
  ui.ledgerRelicCount.textContent = `${owned.length} / ${RELICS.length}`;
  if (ui.ledgerRelicNote) {
    ui.ledgerRelicNote.textContent = owned.length === RELICS.length
      ? "THE RELIQUARY IS COMPLETE"
      : `${RELICS.length - owned.length} STILL LOST`;
  }
  ui.ledgerGrid.innerHTML = RELICS.map(ledgerRelicCard).join("");
  ui.ledgerGearList.innerHTML = EQUIPMENT.map(ledgerGearRow).join("");
  ui.ledgerSlots.innerHTML = EQUIPMENT.map((item) => `
    <button type="button" class="ledger-slot filled ${item.id === ledgerState.gearId ? "active" : ""}" data-gear="${item.id}" title="${item.name}">
      <span class="sloticon" style="background-position:${iconStyle(item.icon)}"></span>
      <small>${item.slot}</small>
    </button>`).join("");
  ui.ledger.querySelectorAll(".ledger-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === ledgerState.tab);
  });
  ui.ledgerRelics.classList.toggle("hide", ledgerState.tab !== "relics");
  ui.ledgerGear.classList.toggle("hide", ledgerState.tab !== "gear");
  renderLedgerDetail();
  const p = game.player;
  const crown = hasRelic("bone_crown");
  const minHit = Math.round(ATTACKS[0].dmg * (crown ? 1.25 : 1));
  const maxHit = Math.round(ATTACKS[2].dmg * (crown ? 1.25 : 1));
  ui.ledgerStats.innerHTML = `
    <div class="ledger-stat"><span>Hearts</span><b>${Math.ceil(p.hp / 2)} / ${Math.ceil(p.maxHp / 2)}</b></div>
    <div class="ledger-stat"><span>Strike</span><b>${minHit} &ndash; ${maxHit}</b></div>
    <div class="ledger-stat"><span>Crit</span><b>${hasRelic("grave_eye") ? "15%" : "0%"}</b></div>
    <div class="ledger-stat"><span>Dash</span><b>${maxDashCd().toFixed(2)} s</b></div>
    <div class="ledger-stat"><span>Souls</span><b>${String(game.souls).padStart(2, "0")}</b></div>
    <div class="ledger-stat"><span>Rooms</span><b>${game.stats.rooms.size} / ${ROOMS.length}</b></div>`;
}

if (ui.ledger) {
  ui.ledger.addEventListener("click", (e) => {
    if (e.target === ui.ledger) { closeLedger(); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) { setLedgerTab(tab.dataset.tab); return; }
    const relic = e.target.closest("[data-relic]");
    if (relic) { ledgerState.relicId = relic.dataset.relic; renderLedger(); return; }
    const gear = e.target.closest("[data-gear]");
    if (gear) {
      ledgerState.gearId = gear.dataset.gear;
      if (ledgerState.tab !== "gear") setLedgerTab("gear");
      else renderLedger();
    }
  });
  if (ui.ledgerClose) ui.ledgerClose.addEventListener("click", (e) => { e.stopPropagation(); closeLedger(); });
}

function showEnd(won) {
  if (game.mode === "won" || game.mode === "dead") return;
  game.mode = won ? "won" : "dead";
  setPrompt("");
  ui.bossbar.classList.remove("show");
  ui.toast.classList.remove("show");
  ui.hint.classList.add("hide");
  hudEl.classList.add("hud-hidden");
  endEl.classList.remove("hide");
  endEl.classList.toggle("won", !!won);
  const relicDefs = [...game.run.relics].map((id) => RELICS.find((r) => r.id === id)).filter(Boolean);
  ui.endstats.innerHTML = `
    <div class="stat"><span>Time</span><b>${formatTime(game.time)}</b></div>
    <div class="stat"><span>Rooms</span><b>${game.stats.rooms.size} / ${ROOMS.length}</b></div>
    <div class="stat"><span>Keepers Slain</span><b>${game.kills}</b></div>
    <div class="stat"><span>Souls Gathered</span><b>${game.souls}</b></div>
    <div class="stat"><span>Sigils</span><b>${game.sigils} / ${SIGILS.length}</b></div>
    <div class="stat"><span>Relics</span><b>${relicDefs.length}</b></div>`;
  if (won) {
    ui.endeyebrow.textContent = "THE VOW IS FULFILLED";
    ui.endtitle.textContent = "Ashen Vow";
    ui.endtext.textContent = "The Pale Warden falls. The keep exhales, and dawn finds the gate at last.";
    ui.endprompt.textContent = "Press R or click to swear the vow again";
    game.white = 0.85;
    if (game.audio && !game.victorySounded) { game.victorySounded = true; game.audio.victory(); }
  } else {
    ui.endeyebrow.textContent = "THE VOW BREAKS";
    ui.endtitle.textContent = "You Died";
    ui.endtext.textContent = "The dark keeps its knight. Another vow waits to be sworn.";
    ui.endprompt.textContent = "Press R or click to rise again";
  }
}

/* ------------------------------- sprites ------------------------------- */
const tints = {};

function drawSheetFrom(img, name, row, col, x, y, face = 1, alpha = 1) {
  if (!img) return;
  const sh = SHEETS[name];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), 0);
  if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, col * sh.w, row * sh.h, sh.w, sh.h, -sh.ax, Math.round(y) - sh.ay, sh.w, sh.h);
  ctx.restore();
}
function drawSheet(name, row, col, x, y, face = 1, alpha = 1) {
  drawSheetFrom(images[name], name, row, col, x, y, face, alpha);
}
function drawShadow(x, y, rx, ry = rx * 0.34) {
  ctx.fillStyle = "rgba(3,3,7,0.5)";
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU);
  ctx.fill();
}
function drawTorchSprite(tx, ty) {
  if (!images.torch) return;
  const f = Math.floor(game.time * 8 + (tx * 7 + ty * 13)) % 8;
  ctx.drawImage(images.torch, f * 16, 0, 16, 32, Math.round(tx * TILE + 8), Math.round(ty * TILE), 16, 32);
}
function drawCracks(x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    const h = hash2(seed, i, 9);
    let px = 6 + (h % 18), py = 4 + ((h >> 8) % 22);
    ctx.strokeStyle = "rgba(4,3,6,0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let k = 0; k < 4; k++) {
      px += ((h >> (k * 3)) % 9) - 4;
      py += 3 + ((h >> (k * 2 + 1)) % 5);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(196,186,208,0.16)";
  ctx.beginPath();
  ctx.moveTo(10, 8); ctx.lineTo(16, 14); ctx.lineTo(13, 21);
  ctx.stroke();
  ctx.restore();
}

function drawDoorOverlays() {
  const room = game.room, st = game.roomState;
  for (const door of room.doors) {
    const x = door.x * TILE, y = door.y * TILE;
    if (door.secret) {
      const sec = st.secrets[door.id];
      if (!sec || !sec.broken) {
        drawTileTo(ctx, wallTileIndex(room, door.x, door.y), x, y);
        drawCracks(x, y, door.x * 31 + door.y * 17);
        if (hasRelic("grave_lantern")) {
          const pulse = 0.5 + 0.5 * Math.sin(game.time * 3.2);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(255,214,106,${0.18 + pulse * 0.3})`;
          ctx.beginPath();
          ctx.arc(x + 16, y + 20, 2 + pulse, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        continue;
      }
      drawTileTo(ctx, 25, x, y);
      ctx.fillStyle = "#2a2731";
      ctx.fillRect(x + 2, y + 26, 7, 4);
      ctx.fillRect(x + 23, y + 27, 6, 3);
      ctx.fillRect(x + 12, y + 29, 8, 2);
      continue;
    }
    const pass = doorPassable(door);
    drawTileTo(ctx, pass ? 25 : 24, x, y);
    if (door.gate) {
      for (let i = 0; i < SIGILS.length; i++) {
        const sx = x + 8 + i * 8, sy = y + 24;
        const lit = i < game.sigils;
        ctx.fillStyle = lit ? "#f8e4a0" : "#15121c";
        ctx.beginPath();
        ctx.arc(sx, sy, 2.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = lit ? "#e6b455" : "#4a4353";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (!pass && (room.id === "warden_gate" || door.gate)) {
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 2.2);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(180,40,36,${0.05 + pulse * 0.06})`;
      ctx.fillRect(x + 2, y + 2, 28, 28);
      ctx.restore();
    }
  }
}

function drawBanners() {
  for (const p of game.room.props) {
    if (p.t !== "banner") continue;
    drawTileTo(ctx, 23, p.x * TILE, 0);
  }
}

function drawChestWorld(c, cell) {
  drawShadow((c.x + 0.5) * TILE, (c.y + 0.82) * TILE, 12, 4);
  drawTileTo(ctx, cell && cell.opened ? 17 : 16, c.x * TILE, c.y * TILE);
  if (cell && !cell.opened) {
    const gl = 0.5 + 0.5 * Math.sin(game.time * 3.4 + c.x * 1.7);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,214,106,${0.1 + gl * 0.18})`;
    ctx.fillRect(c.x * TILE + 14, c.y * TILE + 8, 2, 2);
    ctx.fillRect(c.x * TILE + 18, c.y * TILE + 13, 1, 1);
    ctx.restore();
  }
}

function drawSigilWorld(s) {
  const x = (s.x + 0.5) * TILE, y = (s.y + 0.5) * TILE;
  const bob = Math.sin(game.time * 2.2 + s.id) * 2.5;
  drawShadow(x, y + 12, 13, 4);
  ctx.fillStyle = "#16131d";
  ctx.fillRect(x - 10, y + 6, 20, 6);
  ctx.fillStyle = "#2a2434";
  ctx.fillRect(x - 8, y + 5, 16, 2);
  ctx.strokeStyle = "rgba(230,180,85,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 18, 6, 0, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y - 14 + bob, 0, x, y - 14 + bob, 26);
  g.addColorStop(0, "rgba(255,220,140,0.3)");
  g.addColorStop(1, "rgba(255,200,90,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 28, y - 44 + bob, 56, 56);
  ctx.restore();
  drawIcon(ctx, ICON.sigil, x - 16, y - 30 + bob, 2);
  if (Math.random() < 0.06) {
    spawnParticles(x + rand(-10, 10), y - 14 + bob, {
      count: 1, colors: ["#f8e4a0", "#e6b455"], speed: 4, life: 0.9, size: 1, grav: -16, spread: TAU, add: true,
    });
  }
}

function drawAltarWorld(a) {
  const x = (a.x + 0.5) * TILE, y = (a.y + 0.5) * TILE;
  drawShadow(x, y + 12, 16, 5);
  drawTileTo(ctx, 28, a.x * TILE, a.y * TILE);
  if (!game.roomState.altarUsed) {
    const t = game.time;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 2; i++) {
      const fx = x - 6 + i * 12, fy = y - 2 + Math.sin(t * 7 + i * 2.2) * 1.2;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5);
      g.addColorStop(0, "rgba(255,230,160,0.9)");
      g.addColorStop(0.4, "rgba(245,155,61,0.5)");
      g.addColorStop(1, "rgba(245,155,61,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - 5, fy - 5, 10, 10);
    }
    ctx.restore();
  }
}

function drawPropTile(p) {
  const idx = PROP_TILE[p.t];
  if (idx === undefined) return;
  drawTileTo(ctx, idx, p.x * TILE, p.y * TILE);
}

function drawCorpse(c) {
  const def = ENEMY_DEFS[c.type];
  const frac = c.seed / 100;
  ctx.fillStyle = c.type === "wretch" ? "rgba(40,90,70,0.28)" : "rgba(70,16,22,0.32)";
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 1, def.r + 9 + frac * 4, 4, 0, 0, TAU);
  ctx.fill();
  drawSheet(c.type, def.corpse.row, def.corpse.col, c.x, c.y, 1, 0.9);
}

function drawPickupWorld(pk) {
  const y = pk.y - pk.z;
  if (pk.type === "soul") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(pk.x, y - 6, 0, pk.x, y - 6, 12);
    g.addColorStop(0, "rgba(190,240,220,0.85)");
    g.addColorStop(0.4, "rgba(139,227,183,0.4)");
    g.addColorStop(1, "rgba(47,122,92,0)");
    ctx.fillStyle = g;
    ctx.fillRect(pk.x - 12, y - 18, 24, 24);
    ctx.fillStyle = "rgba(221,255,240,0.9)";
    ctx.fillRect(Math.round(pk.x) - 1, Math.round(y - 8), 2, 2);
    ctx.restore();
  } else {
    const bob = Math.sin(game.time * 3 + pk.x * 0.2) * 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(pk.x, y - 12 + bob, 0, pk.x, y - 12 + bob, 16);
    g.addColorStop(0, "rgba(255,120,120,0.3)");
    g.addColorStop(1, "rgba(255,90,90,0)");
    ctx.fillStyle = g;
    ctx.fillRect(pk.x - 16, y - 28 + bob, 32, 32);
    ctx.restore();
    drawIcon(ctx, ICON.heart, pk.x - 8, y - 20 + bob, 1);
  }
}

function drawEnemy(e) {
  if (e.state === "dead") return;
  const def = e.def;
  const fly = e.type === "wretch" ? -5 + Math.sin(game.time * 2.4 + e.bobSeed) * 2 : 0;
  drawShadow(e.x, e.y, e.type === "warden" ? 23 : 10, e.type === "warden" ? 7 : 3.4);
  const col = animCol(e);
  drawSheet(e.type, e.anim.row, col, e.x, e.y + fly, e.face, 1);
  if (e.flash > 0 && tints[e.type]) {
    drawSheetFrom(tints[e.type], e.type, e.anim.row, col, e.x, e.y + fly, e.face, Math.min(0.75, e.flash * 5));
  }
  if (e.type !== "warden" && e.barT > 0 && e.state !== "dying") {
    const w = e.type === "wretch" ? 22 : 18;
    const bx = Math.round(e.x - w / 2), by = Math.round(e.y - def.barH);
    ctx.fillStyle = "rgba(6,5,9,0.8)";
    ctx.fillRect(bx - 1, by - 1, w + 2, 4);
    ctx.fillStyle = "#b23a4b";
    ctx.fillRect(bx, by, Math.round(w * clamp(e.hp / e.maxHp, 0, 1)), 2);
  }
  if (e.type === "warden" && e.phase2 && e.state !== "dying") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(200,70,30,0.08)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 40, 30, 44, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const p = game.player;
  if (!p) return;
  const blink = p.invuln > 0 && p.state !== "dash" && p.state !== "dead" && Math.floor(game.time * 22) % 2 === 0;
  drawShadow(p.x, p.y, 11, 3.6);
  const col = animCol(p) % (p.anim.count || 1);
  drawSheet("knight", (p.view || 0) * 8 + p.anim.row, col, p.x, p.y, p.face, blink ? 0.6 : 1);
  if (p.invuln > 0 && p.state !== "dead") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,210,140,${0.02 + Math.min(1, p.invuln) * 0.045})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 24, 15, 22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawGhosts() {
  for (const g of game.ghosts) {
    drawSheet("knight", (g.view || 0) * 8 + g.row, g.frame, g.x, g.y, g.face, 0.3 * (g.life / g.max));
  }
}

function floorWedge(x, y, ang, range, arc, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.55);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, ang - arc / 2, ang + arc / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = Math.min(1, alpha * 2.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawTelegraphs() {
  for (const e of game.enemies) {
    if (e.state === "dying" || e.state === "dead") continue;
    if (e.type === "skeleton" && e.state === "attack" && e.attack && e.attackT < e.attack.hitAt) {
      const k = clamp(e.attackT / e.attack.hitAt, 0, 1);
      const ang = e.face > 0 ? 0 : Math.PI;
      floorWedge(e.x, e.y - 8, ang, 44, 1.5, "#b23a4b", 0.05 + 0.12 * k);
    }
    if (e.type === "wretch" && e.state === "attack") {
      const k = clamp(e.attackT / 0.5, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.25 + 0.25 * k;
      ctx.strokeStyle = "#8be3b7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - 38, 16 + 10 * k, 8 + 5 * k, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - 38, 8 + 5 * k, 4 + 2.5 * k, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (e.type === "warden") {
      if (e.state === "cleave" && e.attack && e.attackT < e.attack.hitAt) {
        const k = clamp(e.attackT / e.attack.hitAt, 0, 1);
        const ang = e.face > 0 ? 0 : Math.PI;
        floorWedge(e.x, e.y - 14, ang, 104, 2.0, "#d55f1e", 0.05 + 0.15 * k);
        floorWedge(e.x, e.y - 14, ang, 88, 1.7, "#f59b3d", 0.03 + 0.06 * k);
      }
      if (e.state === "slam" && e.attack && e.attackT < e.attack.hitAt) {
        const k = clamp(e.attackT / e.attack.hitAt, 0, 1);
        ctx.save();
        ctx.translate(e.x, e.y - 6);
        ctx.scale(1, 0.55);
        ctx.globalAlpha = 0.06 + 0.13 * k;
        ctx.fillStyle = "#d55f1e";
        ctx.beginPath();
        ctx.arc(0, 0, 180, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.25 + 0.3 * k;
        ctx.strokeStyle = "#f59b3d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 180 * (0.35 + 0.65 * k), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawShocks() {
  for (const sh of game.shocks) {
    const k = clamp(sh.r / sh.max, 0, 1);
    ctx.save();
    ctx.translate(sh.x, sh.y);
    ctx.scale(1, 0.55);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - k * 0.5;
    ctx.strokeStyle = "rgba(245,155,61,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, sh.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,235,190,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, sh.r - 4), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSlashes() {
  for (const s of game.slashes) {
    const k = 1 - s.life / s.max;
    const alpha = Math.sin(Math.min(1, k) * Math.PI);
    const range = s.range * (0.7 + 0.3 * k);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.62);
    ctx.globalCompositeOperation = "lighter";
    const col = s.hostile ? "220,80,60" : "255,232,170";
    ctx.strokeStyle = `rgba(${col},${0.65 * alpha})`;
    ctx.lineWidth = s.big ? 5 : 3.4;
    ctx.beginPath();
    ctx.arc(0, 0, range, s.ang - s.arc / 2, s.ang + s.arc / 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,230,${0.65 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, range + 2, s.ang - s.arc * 0.36, s.ang + s.arc * 0.36);
    ctx.stroke();
    for (const side of [-1, 1]) {
      const a = s.ang + side * s.arc / 2;
      ctx.strokeStyle = `rgba(${col},${0.35 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * range * 0.55, Math.sin(a) * range * 0.55);
      ctx.lineTo(Math.cos(a) * (range + 8), Math.sin(a) * (range + 8));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const pr of game.projectiles) {
    const wob = Math.sin(pr.t * 18) * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 16);
    g.addColorStop(0, "rgba(190,255,225,0.5)");
    g.addColorStop(0.35, "rgba(87,177,132,0.32)");
    g.addColorStop(1, "rgba(47,122,92,0)");
    ctx.fillStyle = g;
    ctx.fillRect(pr.x - 16, pr.y - 16, 32, 32);
    ctx.fillStyle = "#0d241d";
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8be3b7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y + wob * 0.3, 5, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#ddfff0";
    ctx.fillRect(Math.round(pr.x) - 1, Math.round(pr.y) - 1 + Math.round(wob * 0.3), 2, 2);
    ctx.restore();
  }
}

function drawParticlesWorld() {
  for (const pass of [false, true]) {
    ctx.globalCompositeOperation = pass ? "lighter" : "source-over";
    for (const p of game.particles) {
      if (p.add !== pass) continue;
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawTextsWorld() {
  for (const t of game.texts) {
    ctx.globalAlpha = clamp(t.life / 0.4, 0, 1);
    drawTiny(ctx, t.text, t.x, t.y, t.scale, t.color);
  }
  ctx.globalAlpha = 1;
}

function drawWorldItems() {
  const room = game.room, st = game.roomState;
  const items = [];
  for (const p of room.props) {
    if (p.t === "banner") continue;
    items.push({ y: p.y * TILE + 30, draw: () => drawPropTile(p) });
  }
  for (const c of room.chests) {
    const cell = st.chests[`${c.x},${c.y}`];
    items.push({ y: c.y * TILE + 30, draw: () => drawChestWorld(c, cell) });
  }
  for (const s of room.sigils) {
    if (st.sigilTaken) continue;
    items.push({ y: s.y * TILE + 28, draw: () => drawSigilWorld(s) });
  }
  if (room.altar) items.push({ y: room.altar.y * TILE + 30, draw: () => drawAltarWorld(room.altar) });
  for (const c of st.corpses) items.push({ y: c.y, draw: () => drawCorpse(c) });
  for (const e of game.enemies) {
    if (e.state === "dead") continue;
    items.push({ y: e.y, draw: () => drawEnemy(e) });
  }
  for (const pk of game.pickups) items.push({ y: pk.y, draw: () => drawPickupWorld(pk) });
  if (game.player) items.push({ y: game.player.y, draw: () => drawPlayer() });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
}

/* ------------------------------ lighting ------------------------------ */
const GLOW = {
  warm: [255, 152, 70],
  gold: [255, 205, 100],
  green: [105, 230, 165],
  ember: [225, 90, 40],
  cold: [130, 170, 235],
  violet: [185, 150, 255],
};

function collectLights() {
  const room = game.room, st = game.roomState, p = game.player;
  const lights = [];
  if (p) lights.push({ x: p.x, y: p.y - 18, r: hasRelic("grave_lantern") ? 136 : 108, color: "warm", seed: 1, glow: 0.045 });
  for (let i = 0; i < room.torches.length; i++) {
    const t = room.torches[i];
    lights.push({ x: t.x * TILE + 16, y: t.y * TILE + 16, r: 80, color: "warm", seed: 10 + i, flick: true, glow: 0.13 });
  }
  for (const pr of room.props) {
    if (pr.t === "brazier") lights.push({ x: pr.x * TILE + 16, y: pr.y * TILE + 14, r: 60, color: "warm", seed: 30 + pr.x * 3, flick: true, glow: 0.1 });
  }
  for (const c of room.chests) {
    const cell = st.chests[`${c.x},${c.y}`];
    if (cell && !cell.opened) lights.push({ x: (c.x + 0.5) * TILE, y: (c.y + 0.6) * TILE, r: 28, color: "gold", glow: 0.09 });
  }
  for (const s of room.sigils) {
    if (!st.sigilTaken) lights.push({ x: (s.x + 0.5) * TILE, y: (s.y + 0.4) * TILE, r: 64, color: "gold", seed: 50 + s.id, pulse: true, glow: 0.13 });
  }
  if (room.altar && !st.altarUsed) {
    lights.push({ x: (room.altar.x + 0.5) * TILE, y: (room.altar.y + 0.4) * TILE, r: 66, color: "warm", seed: 70, flick: true, glow: 0.11 });
  }
  for (const pr of game.projectiles) lights.push({ x: pr.x, y: pr.y, r: 30, color: "green", glow: 0.1 });
  for (const fl of game.fxLights) {
    const k = clamp(fl.life / fl.max, 0, 1);
    lights.push({ x: fl.x, y: fl.y, r: fl.r * k, color: fl.color, glow: 0.12 * k });
  }
  if (game.boss && game.boss.state !== "dead" && game.boss.state !== "dying") {
    lights.push({ x: game.boss.x, y: game.boss.y - 44, r: 118, color: "ember", seed: 90, flick: true, glow: 0.1 });
  }
  return lights;
}

function renderLights(lights, ox, oy, ambient) {
  lctx.globalCompositeOperation = "source-over";
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const dark = clamp(ambient * 0.7 + 0.03, 0, 0.72);
  lctx.fillStyle = `rgba(5,4,10,${dark})`;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = "destination-out";
  const radii = [];
  for (let i = 0; i < lights.length; i++) {
    const l = lights[i];
    let r = l.r;
    if (l.flick) r *= 0.92 + 0.08 * Math.sin(game.time * 8.5 + (l.seed || i) * 2.3);
    if (l.pulse) r *= 0.95 + 0.05 * Math.sin(game.time * 2.1);
    radii.push(r);
    if (r < 1) continue;
    const x = l.x + ox, y = l.y + oy;
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) continue;
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.95)");
    g.addColorStop(0.38, "rgba(0,0,0,0.78)");
    g.addColorStop(0.72, "rgba(0,0,0,0.32)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    lctx.fillStyle = g;
    lctx.beginPath();
    lctx.arc(x, y, r, 0, TAU);
    lctx.fill();
  }
  lctx.globalCompositeOperation = "source-over";
  ctx.drawImage(lightCanvas, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < lights.length; i++) {
    const l = lights[i];
    const r = radii[i];
    if (r < 4) continue;
    const x = l.x + ox, y = l.y + oy;
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) continue;
    const c = GLOW[l.color] || GLOW.warm;
    const a = (l.glow ?? 0.1) * (l.flick ? 0.9 + 0.1 * Math.sin(game.time * 8.5 + (l.seed || i) * 2.3) : 1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.05);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    g.addColorStop(0.45, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.35})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawMotes(room, ox, oy) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const t = game.time;
  for (let i = 0; i < 34; i++) {
    const h = hash2(i, 7, 11);
    const wx = (h % 1000) / 1000 * room.w * TILE;
    const wy = ((h >> 10) % 1000) / 1000 * room.h * TILE;
    const px = wx + ox + Math.sin(t * 0.35 + i * 1.7) * 9;
    const py = wy + oy + Math.cos(t * 0.27 + i * 2.1) * 7;
    if (px < 0 || py < 0 || px > VIEW_W || py > VIEW_H) continue;
    const a = 0.05 + 0.11 * (0.5 + 0.5 * Math.sin(t * 1.4 + i));
    ctx.fillStyle = `rgba(240,210,160,${a})`;
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  ctx.restore();
}

function drawVignette() {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.28, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.98);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.65, "rgba(0,0,0,0.13)");
  g.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/* ------------------------------- minimap ------------------------------- */
function drawMinimap() {
  const mm = ui.minimap;
  if (!mm || !game.run) return;
  const g = mm.getContext("2d");
  const W = mm.width, H = mm.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#0a080e";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(230,180,85,0.5)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, W - 1, H - 1);
  g.fillStyle = "rgba(240,198,110,0.92)";
  g.font = "600 6px ui-monospace, monospace";
  g.textAlign = "center";
  g.fillText("T H E   K E E P", W / 2, 9);
  g.strokeStyle = "rgba(230,180,85,0.26)";
  g.beginPath();
  g.moveTo(10, 12.5);
  g.lineTo(W - 10, 12.5);
  g.stroke();

  const visited = game.stats.rooms;
  const centers = {};
  const at = (pos) => ({ x: W / 2 + pos[0] * 24, y: 26 + (pos[1] + 2.6) * 17 });
  for (const room of ROOMS) centers[room.id] = at(room.pos);
  const nearby = new Set();
  for (const room of ROOMS) {
    if (!visited.has(room.id)) continue;
    for (const d of room.doors) if (!visited.has(d.to)) nearby.add(d.to);
  }

  for (const room of ROOMS) {
    if (!visited.has(room.id)) continue;
    const a = centers[room.id];
    for (const d of room.doors) {
      if (!visited.has(d.to) && !d.secret) continue;
      const b = centers[d.to];
      const both = visited.has(d.to);
      g.strokeStyle = both ? "rgba(214,178,120,0.66)" : "rgba(170,145,105,0.34)";
      g.setLineDash(d.secret && !both ? [2, 2] : []);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
  }
  g.setLineDash([]);

  for (const id of nearby) {
    const room = ROOM_BY_ID[id];
    const c = centers[id];
    const w = Math.max(9, room.w * 0.55), h = Math.max(5, room.h * 0.44);
    g.strokeStyle = "rgba(190,170,140,0.5)";
    g.setLineDash([2, 2]);
    g.strokeRect(c.x - w / 2 + 0.5, c.y - h / 2 + 0.5, w - 1, h - 1);
    g.setLineDash([]);
  }

  for (const room of ROOMS) {
    if (!visited.has(room.id)) continue;
    const c = centers[room.id];
    const w = Math.max(9, room.w * 0.55), h = Math.max(5, room.h * 0.44);
    const cur = room.id === game.roomId;
    const st = game.run.roomStates[room.id];
    g.fillStyle = cur
      ? "rgba(240,196,110,0.5)"
      : room.secret ? "rgba(118,90,162,0.85)"
        : "rgba(88,78,100,0.95)";
    g.fillRect(Math.round(c.x - w / 2), Math.round(c.y - h / 2), Math.round(w), Math.round(h));
    g.strokeStyle = cur ? "#f4cc78"
      : room.id === "warden_gate" ? (st.bossDead ? "rgba(150,135,120,0.8)" : "rgba(224,92,80,0.95)")
        : "rgba(214,190,150,0.85)";
    g.lineWidth = cur ? 1.5 : 1;
    g.strokeRect(Math.round(c.x - w / 2) + 0.5, Math.round(c.y - h / 2) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
    if (room.sigils.length && !st.sigilTaken) {
      g.fillStyle = "#f8e4a0";
      g.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, 2, 2);
    }
    if (room.id === "warden_gate") {
      g.fillStyle = st.bossDead ? "rgba(120,180,140,0.85)" : "#c8463c";
      g.fillRect(Math.round(c.x) - 1, Math.round(c.y + h / 2 - 2), 3, 2);
    }
  }

  const cur = centers[game.roomId];
  if (cur && game.player) {
    const room = game.room;
    const w = Math.max(9, room.w * 0.55), h = Math.max(5, room.h * 0.44);
    const px = cur.x + ((game.player.x / (room.w * TILE)) - 0.5) * w;
    const py = cur.y + ((game.player.y / (room.h * TILE)) - 0.5) * h;
    g.fillStyle = "rgba(8,6,12,0.8)";
    g.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    g.fillStyle = "#fff6d0";
    g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
  }
}

function updateHud() {
  if (!game.player) return;
  const p = game.player;
  const frac = 1 - clamp(p.dashCd / maxDashCd(), 0, 1);
  ui.dashfill.style.width = Math.round(frac * 100) + "%";
  ui.dashrow.classList.toggle("ready", p.dashCd <= 0.001);
  drawMinimap();
}

/* ------------------------------- render ------------------------------- */
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (game.mode === "title" || !game.room) {
    renderTitle();
    return;
  }
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const shake = game.cam.shake;
  const ox = Math.round(-game.cam.x + (shake > 0 ? rand(-shake, shake) * 0.8 : 0));
  const oy = Math.round(-game.cam.y + (shake > 0 ? rand(-shake, shake) * 0.8 : 0));
  ctx.save();
  ctx.translate(ox, oy);
  const bg = game.bgCache.get(game.roomId);
  if (bg) ctx.drawImage(bg, 0, 0);
  drawDoorOverlays();
  drawBanners();
  for (const torch of game.room.torches) drawTorchSprite(torch.x, torch.y);
  drawTelegraphs();
  drawShocks();
  drawGhosts();
  drawWorldItems();
  drawSlashes();
  drawProjectiles();
  drawParticlesWorld();
  drawTextsWorld();
  ctx.restore();

  const lights = collectLights();
  renderLights(lights, ox, oy, game.room.ambient);
  drawMotes(game.room, ox, oy);
  drawVignette();

  if (game.roomId === "warden_gate" && game.bossIntro > 0) {
    const a = clamp(Math.min((1.9 - game.bossIntro) / 0.35, game.bossIntro / 0.4), 0, 1);
    ctx.fillStyle = `rgba(3,2,5,${0.9 * a})`;
    const h = Math.round(20 * a);
    ctx.fillRect(0, 0, VIEW_W, h);
    ctx.fillRect(0, VIEW_H - h, VIEW_W, h);
  }

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(150,22,30,${clamp(game.flash, 0, 1) * 0.4})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (game.white > 0) {
    ctx.fillStyle = `rgba(255,242,216,${clamp(game.white, 0, 1) * 0.62})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (game.fade > 0) {
    ctx.fillStyle = `rgba(4,3,7,${clamp(game.fade, 0, 1)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function renderTitle() {
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const room = roomById("gatehouse");
  if (!game.titleBg && images.tiles) game.titleBg = buildBackground(room);
  if (game.titleBg) {
    const t = game.titleTime;
    const maxX = Math.max(0, room.w * TILE - VIEW_W);
    const maxY = Math.max(0, room.h * TILE - VIEW_H);
    const camX = clamp((room.w * TILE - VIEW_W) / 2 + Math.sin(t * 0.085) * 34, 0, maxX);
    const camY = clamp((room.h * TILE - VIEW_H) / 2 + 26 + Math.cos(t * 0.062) * 14, 0, maxY);
    const ox = -Math.round(camX), oy = -Math.round(camY);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.drawImage(game.titleBg, 0, 0);
    for (const p of room.props) if (p.t === "banner") drawTileTo(ctx, 23, p.x * TILE, 0);
    for (const torch of room.torches) drawTorchSprite(torch.x, torch.y);
    for (const p of room.props) if (p.t === "brazier") drawPropTile(p);
    const kx = Math.round(VIEW_W * 0.765) - ox, ky = Math.round(VIEW_H * 0.79) - oy;
    drawShadow(kx, ky, 12, 4);
    drawSheet("knight", 8, Math.floor(t * 6) % 8, kx, ky, 1, 1);
    ctx.restore();
    const lights = [
      { x: kx, y: ky - 20, r: 118, color: "warm", seed: 1, glow: 0.06 },
      { x: room.torches[0].x * TILE + 16, y: room.torches[0].y * TILE + 16, r: 68, color: "warm", seed: 2, flick: true, glow: 0.12 },
      { x: room.torches[1].x * TILE + 16, y: room.torches[1].y * TILE + 16, r: 68, color: "warm", seed: 5, flick: true, glow: 0.12 },
    ];
    for (const p of room.props) if (p.t === "brazier") lights.push({ x: p.x * TILE + 16, y: p.y * TILE + 14, r: 50, color: "warm", seed: p.x * 3, flick: true, glow: 0.09 });
    renderLights(lights, ox, oy, room.ambient);
    drawMotes(room, ox, oy);
  }
  drawVignette();
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(5,4,10,0.72)");
  g.addColorStop(0.38, "rgba(5,4,10,0.18)");
  g.addColorStop(1, "rgba(5,4,10,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/* ------------------------------- assets ------------------------------- */
function makeTint(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#fff4e2";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn("Missing asset", src); resolve(null); };
    img.src = src;
  });
}

async function loadAll() {
  const keys = Object.keys(ASSET_FILES);
  const loaded = await Promise.all(keys.map(async (k) => [k, await loadImage(ASSET_FILES[k])]));
  for (const [k, img] of loaded) {
    if (img) images[k] = img;
  }
  for (const k of ["knight", "skeleton", "wretch", "warden"]) {
    if (images[k]) tints[k] = makeTint(images[k]);
  }
  game.titleBg = buildBackground(roomById("gatehouse"));
  game.mode = "title";
  ui.loading.classList.add("hide");
  titleEl.classList.remove("hide");
  hudEl.classList.add("hud-hidden");
}

/* -------------------------------- boot -------------------------------- */
function fitStage() {
  const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener("resize", fitStage);
fitStage();

titleEl.addEventListener("click", () => { if (game.mode === "title") startRun(); });
endEl.addEventListener("click", () => { if (game.mode === "dead" || game.mode === "won") startRun(); });
const resumeBtn = document.getElementById("resume");
if (resumeBtn) resumeBtn.addEventListener("click", (e) => { e.stopPropagation(); resumeGame(); });
const pauseLedgerBtn = document.getElementById("pauseLedger");
if (pauseLedgerBtn) pauseLedgerBtn.addEventListener("click", (e) => { e.stopPropagation(); openLedger(); });

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

loadAll().then(() => requestAnimationFrame(frame));

window.__ASHEN = {
  game, startRun, enterRoom, showEnd, update, render, images, tints,
  ROOMS, RELICS, SIGILS, EQUIPMENT, hitEnemy, hurtPlayer, healPlayer, damageSecret,
  collectLights, renderLights, openChest, takeSigil, bossDefeated, findInteractable,
  openLedger, closeLedger, setLedgerTab, renderLedger, ledgerState,
};

