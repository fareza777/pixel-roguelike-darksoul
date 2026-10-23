// Automated density + integrity gates for Ashen Vow. Run: node tools/gates.mjs
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { decodePNG } from "./art/png.mjs";
import {
  TILE, VIEW_W, VIEW_H, START_ROOM, START_TILE, RELICS, SIGILS, EQUIPMENT,
  ROOMS, ROOM_BY_ID, doorInward, walkableChar,
} from "../game/js/level.mjs";

const ROOT = resolve(".");
const gameDir = resolve(ROOT, "game");
let checks = 0;
let failures = [];

function ok(cond, msg) {
  checks++;
  if (!cond) failures.push(msg);
}
function eq(a, b, msg) { ok(a === b, `${msg} (expected ${b}, got ${a})`); }
function between(v, a, b, msg) { ok(typeof v === "number" && v >= a && v <= b, `${msg} (${v} not in ${a}..${b})`); }
function inside(room, x, y) { return x >= 0 && y >= 0 && x < room.w && y < room.h; }
function tileAt(room, x, y) { return inside(room, x, y) ? room.grid[y][x] : "#"; }
function isDoorTile(room, x, y) { return room.doors.some((d) => d.x === x && d.y === y); }
function isSolid(room, x, y) {
  if (!inside(room, x, y)) return true;
  const ch = room.grid[y][x];
  if (ch === "#" || ch === "D") return true;
  return room.solidKeys.has(`${x},${y}`);
}
const DIRS = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const OPP = { N: "S", S: "N", W: "E", E: "W" };

/* ------------------------------ data shape ------------------------------ */
ok(ROOMS.length >= 12, `at least 12 rooms (found ${ROOMS.length})`);
eq(new Set(ROOMS.map((r) => r.id)).size, ROOMS.length, "room ids unique");
for (const room of ROOMS) {
  ok(!!ROOM_BY_ID[room.id], `room ${room.id} indexed`);
  const area = room.w * room.h;
  ok(area >= 160, `${room.id} has substantial area (${area} tiles)`);
  between(room.w, 16, 30, `${room.id} width in range`);
  between(room.h, 10, 20, `${room.id} height in range`);
  between(room.ambient, 0.76, 0.94, `${room.id} ambient in gothic range`);
  ok(["calm", "tense", "boss"].includes(room.music), `${room.id} has valid music mood`);
  ok(room.doors.length >= 1, `${room.id} has at least one door`);
  ok((room.props || []).length >= 4, `${room.id} prop density >= 4 (${(room.props || []).length})`);
  ok((room.torches || []).length >= 2, `${room.id} has two light sources (${(room.torches || []).length})`);
  for (const t of room.torches) {
    ok(inside(room, t.x, t.y), `${room.id} torch inside room`);
    ok(t.x === 0 || t.y === 0 || t.x === room.w - 1 || t.y === room.h - 1, `${room.id} torch on a wall`);
    ok(!isDoorTile(room, t.x, t.y), `${room.id} torch not blocking a door`);
  }
  for (let y = 0; y < room.h; y++) {
    for (let x = 0; x < room.w; x++) {
      const ch = room.grid[y][x];
      if (x === 0 || y === 0 || x === room.w - 1 || y === room.h - 1) {
        ok(ch === "#" || ch === "D", `${room.id} boundary at ${x},${y} is wall/door`);
      } else {
        ok(ch !== "#", `${room.id} interior ${x},${y} not a wall glyph`);
      }
    }
  }
  for (const d of room.doors) {
    ok(!!ROOM_BY_ID[d.to], `${room.id} door leads to known room ${d.to}`);
    ok([0, 1].includes(d.y) || d.y === room.h - 1 || [0, 1].includes(d.x) || d.x === room.w - 1, `${room.id} door sits on a wall`);
    const target = ROOM_BY_ID[d.to];
    if (!target) continue;
    const onSide = d.wall === "N" ? target.pos[1] < room.pos[1]
      : d.wall === "S" ? target.pos[1] > room.pos[1]
        : d.wall === "W" ? target.pos[0] < room.pos[0]
          : target.pos[0] > room.pos[0];
    ok(onSide, `${room.id} ${d.wall} door points toward ${target.id} on the map`);
    const back = target.doors.find((b) => b.to === room.id);
    ok(!!back, `${room.id}->${d.to} door is reciprocated`);
    if (back) eq(back.wall, OPP[d.wall], `${room.id}/${d.to} doors face each other`);
    if (d.secret) ok(!!target.secret, `${room.id} secret wall opens into a secret room`);
    const inward = doorInward(d);
    const ix = d.x + inward.x, iy = d.y + inward.y;
    ok(inside(room, ix, iy), `${room.id} door inward tile inside room`);
    ok(!isSolid(room, ix, iy), `${room.id} door inward tile is walkable`);
  }
  ok(new Set(room.doors.map((d) => `${d.x},${d.y}`)).size === room.doors.length, `${room.id} door tiles unique`);
}

/* ---------------------------- graph + density ---------------------------- */
const adj = {};
for (const room of ROOMS) adj[room.id] = room.doors.map((d) => d.to);
const seen = new Set([START_ROOM]);
const queue = [START_ROOM];
while (queue.length) {
  const id = queue.shift();
  for (const to of adj[id]) if (!seen.has(to)) { seen.add(to); queue.push(to); }
}
eq(seen.size, ROOMS.length, "every room reachable from the start");
ok(ROOMS.every((r) => r.doors.every((d) => ROOM_BY_ID[d.to])), "no dangling door targets");
ok(new Set(ROOMS.map((r) => `${r.pos[0]},${r.pos[1]}`)).size === ROOMS.length, "no two rooms share a map position");

let enemies = 0, skeletons = 0, wretches = 0, bosses = 0;
let chests = 0, relicChests = 0, healChests = 0, soulChests = 0, props = 0, torches = 0, sigilCount = 0, secrets = 0;
const sigilIds = new Set();
for (const room of ROOMS) {
  enemies += room.spawns.length;
  torches += room.torches.length;
  props += room.props.length;
  chests += room.chests.length;
  for (const c of room.chests) {
    ok(["souls", "relic", "heal"].includes(c.type), `${room.id} chest type valid`);
    if (c.type === "relic") relicChests++;
    if (c.type === "heal") healChests++;
    if (c.type === "souls") soulChests++;
    ok(inside(room, c.x, c.y) && tileAt(room, c.x, c.y) !== "#" && !isDoorTile(room, c.x, c.y), `${room.id} chest on open floor`);
    ok(!room.spawns.some((s) => s.x === c.x && s.y === c.y), `${room.id} chest not sharing a spawn tile`);
  }
  for (const s of room.spawns) {
    ok(inside(room, s.x, s.y) && walkableChar(tileAt(room, s.x, s.y)) && !isDoorTile(room, s.x, s.y), `${room.id} spawn walkable`);
    ok(!room.solidKeys.has(`${s.x},${s.y}`), `${room.id} spawn not inside furniture`);
    ok(["skeleton", "wretch", "warden"].includes(s.type), `${room.id} known enemy type ${s.type}`);
    if (s.type === "skeleton") skeletons++;
    if (s.type === "wretch") wretches++;
    if (s.type === "warden") bosses++;
    ok(s.y >= 1 && s.y <= room.h - 2, `${room.id} spawn not embedded in a wall`);
    for (const other of room.spawns) {
      if (other === s) continue;
      ok(Math.hypot(other.x - s.x, other.y - s.y) >= 1.4, `${room.id} enemy spawns not stacked`);
    }
    for (const d of room.doors) {
      ok(Math.hypot(d.x - s.x, d.y - s.y) >= 1.5, `${room.id} spawn keeps clear of doors`);
    }
  }
  for (const s of room.sigils) {
    sigilCount++;
    sigilIds.add(s.id);
    ok(inside(room, s.x, s.y) && tileAt(room, s.x, s.y) !== "#" && !isDoorTile(room, s.x, s.y), `${room.id} sigil on open floor`);
    const def = SIGILS.find((x) => x.id === s.id);
    ok(!!def, `${room.id} sigil id ${s.id} defined`);
    if (def) ok(def.room === room.id, `${room.id} hosts the ${def.name}`);
  }
  if (room.altar) {
    ok(inside(room, room.altar.x, room.altar.y), `${room.id} altar inside room`);
    ok(!isDoorTile(room, room.altar.x, room.altar.y), `${room.id} altar not on a door`);
    ok(!room.spawns.some((s) => s.x === room.altar.x && s.y === room.altar.y), `${room.id} altar not on a spawn`);
  }
  for (const p of room.props) {
    ok(inside(room, p.x, p.y) && tileAt(room, p.x, p.y) !== "#", `${room.id} prop ${p.t} on floor`);
    ok(["barrel", "crate", "pillar", "bones", "brazier", "banner"].includes(p.t), `${room.id} known prop ${p.t}`);
    ok(!isDoorTile(room, p.x, p.y), `${room.id} prop ${p.t} not blocking a door tile`);
    ok(!room.chests.some((c) => c.x === p.x && c.y === p.y), `${room.id} prop ${p.t} not on a chest`);
    ok(!room.sigils.some((s) => s.x === p.x && s.y === p.y), `${room.id} prop ${p.t} not on a sigil`);
    ok(!room.spawns.some((s) => s.x === p.x && s.y === p.y), `${room.id} prop ${p.t} not on a spawn`);
    if (room.altar) ok(!(room.altar.x === p.x && room.altar.y === p.y), `${room.id} prop not on altar`);
  }
  const solidProps = room.props.filter((p) => room.solidKeys.has(`${p.x},${p.y}`));
  const solidKeys = new Set(solidProps.map((p) => `${p.x},${p.y}`));
  ok(solidKeys.size === solidProps.length, `${room.id} solid props do not overlap`);
  for (const d of room.doors) if (d.secret) secrets++;

  // Flood fill the interior, treating walls, doors and solid furniture as blockers.
  const start = room.id === START_ROOM
    ? { x: START_TILE.x, y: START_TILE.y }
    : (() => {
        for (const d of room.doors) {
          const iv = doorInward(d);
          const x = d.x + iv.x, y = d.y + iv.y;
          if (!isSolid(room, x, y)) return { x, y };
        }
        for (let y = 1; y < room.h - 1; y++) for (let x = 1; x < room.w - 1; x++) if (!isSolid(room, x, y)) return { x, y };
        return null;
      })();
  ok(!!start && !isSolid(room, start.x, start.y), `${room.id} has a walkable start tile`);
  const reachable = new Set();
  if (start) {
    const q = [start];
    reachable.add(`${start.x},${start.y}`);
    while (q.length) {
      const { x, y } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inside(room, nx, ny) || isSolid(room, nx, ny)) continue;
        const k = `${nx},${ny}`;
        if (!reachable.has(k)) { reachable.add(k); q.push({ x: nx, y: ny }); }
      }
    }
  }
  let floorTiles = 0, floorReached = 0;
  for (let y = 1; y < room.h - 1; y++) for (let x = 1; x < room.w - 1; x++) {
    if (isSolid(room, x, y)) continue;
    floorTiles++;
    if (reachable.has(`${x},${y}`)) floorReached++;
  }
  ok(floorTiles > 40, `${room.id} has a substantial open floor (${floorTiles})`);
  eq(floorReached, floorTiles, `${room.id} open floor fully connected`);
  for (const s of room.spawns) ok(reachable.has(`${s.x},${s.y}`), `${room.id} spawn ${s.type} reachable`);
  const nearReachable = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachable.has(`${x + dx},${y + dy}`));
  for (const c of room.chests) ok(nearReachable(c.x, c.y), `${room.id} chest reachable`);
  for (const s of room.sigils) ok(nearReachable(s.x, s.y), `${room.id} sigil reachable`);
  if (room.altar) ok(nearReachable(room.altar.x, room.altar.y), `${room.id} altar reachable`);
  for (const d of room.doors) {
    const iv = doorInward(d);
    ok(reachable.has(`${d.x + iv.x},${d.y + iv.y}`), `${room.id} door access is clear`);
  }
  for (const rug of room.rugs) {
    ok(rug.x >= 1 && rug.y >= 1 && rug.x + rug.w <= room.w - 1 && rug.y + rug.h <= room.h - 1, `${room.id} rug fits inside floor`);
  }
  for (const ring of room.rings) {
    ok(ring.cx - ring.rx > 0 && ring.cy - ring.ry > 0 && ring.cx + ring.rx < room.w && ring.cy + ring.ry < room.h, `${room.id} ritual ring fits inside room`);
  }
  for (const deco of room.wallDecor) {
    ok(inside(room, deco.x, deco.y), `${room.id} wall decor on wall`);
    ok(tileAt(room, deco.x, deco.y) === "#", `${room.id} wall decor anchored to solid wall`);
  }
}

/* ------------------------------ totals/locks ------------------------------ */
ok(enemies >= 32, `at least 32 keepers (found ${enemies})`);
ok(skeletons >= 20, `at least 20 skeletons (found ${skeletons})`);
ok(wretches >= 8, `at least 8 wretches (found ${wretches})`);
eq(bosses, 1, "exactly one Warden boss");
ok(chests >= 10, `at least 10 chests (found ${chests})`);
eq(relicChests, RELICS.length, "relic chests match the relic roster");
eq(new Set(RELICS.map((r) => r.id)).size, RELICS.length, "relic ids unique");
ok(RELICS.length >= 6, `at least 6 relics (found ${RELICS.length})`);
for (const r of RELICS) {
  ok(typeof r.tag === "string" && r.tag.length >= 3, `relic ${r.id} has a ledgers tag`);
  ok(typeof r.lore === "string" && r.lore.length >= 24, `relic ${r.id} has a ledgers lore entry`);
  between(r.icon, 0, 15, `relic ${r.id} icon inside the icon sheet`);
}
eq(EQUIPMENT.length, 5, "five bound equipment pieces fill the set");
eq(new Set(EQUIPMENT.map((e) => e.id)).size, EQUIPMENT.length, "equipment ids unique");
eq(new Set(EQUIPMENT.map((e) => e.slot)).size, EQUIPMENT.length, "equipment slots unique");
for (const item of EQUIPMENT) {
  ok(["HELM", "CHEST", "ARMS", "BLADE", "SHIELD"].includes(item.slot), `equipment ${item.id} has a valid slot`);
  between(item.icon, 0, 15, `equipment ${item.id} icon inside the icon sheet`);
  ok(item.name.length > 4 && item.stat.length > 3, `equipment ${item.id} has a name and stat line`);
  ok(item.desc.length >= 24 && item.lore.length >= 24, `equipment ${item.id} has description and lore`);
}
ok(healChests >= 1 && soulChests >= 1, "loot includes healing and souls");
ok(props >= 100, `at least 100 props dressing the keep (found ${props})`);
ok(torches >= 22, `at least 22 torches lighting the keep (found ${torches})`);
eq(sigilCount, SIGILS.length, "three sigils placed in the world");
eq(sigilIds.size, SIGILS.length, "sigil ids unique in world");
eq(secrets, 2, "two secret walls");
eq(new Set(ROOMS.filter((r) => r.secret).map((r) => r.id)).size, 2, "two secret rooms");
for (const room of ROOMS.filter((r) => r.secret)) {
  ok(room.chests.length >= 1, `${room.id} secret room holds loot`);
  ok(room.spawns.length === 0, `${room.id} secret room is a quiet vault`);
  ok(room.doors.some((d) => d.secret) || ROOMS.some((r) => r.doors.some((d) => d.secret && d.to === room.id)), `${room.id} entered through a secret`);
}
const bossRoom = ROOMS.find((r) => r.spawns.some((s) => s.type === "warden"));
ok(!!bossRoom, "boss room exists");
if (bossRoom) {
  eq(bossRoom.id, "warden_gate", "boss waits at the Warden's Gate");
  eq(bossRoom.music, "boss", "boss room uses boss music");
  eq(bossRoom.chests.length, 0, "boss room is a pure arena");
}
const gateDoors = ROOMS.flatMap((r) => r.doors.filter((d) => d.gate).map((d) => ({ room: r, d })));
eq(gateDoors.length, 1, "one sigil gate exists");
if (gateDoors.length) {
  eq(gateDoors[0].room.id, START_ROOM, "sigil gate guards the start hall");
  eq(gateDoors[0].d.to, bossRoom?.id, "sigil gate leads to the boss");
}
for (const def of SIGILS) {
  const room = ROOM_BY_ID[def.room];
  ok(!!room, `sigil ${def.name} room exists`);
  if (room) ok(room.sigils.some((s) => s.id === def.id), `sigil ${def.name} placed in ${def.room}`);
  ok(room && !room.secret, `sigil ${def.name} not hidden behind a secret`);
}
const sigilPathSeen = new Set([START_ROOM]);
const sigilQ = [START_ROOM];
while (sigilQ.length) {
  const id = sigilQ.shift();
  for (const d of ROOM_BY_ID[id].doors) {
    if (d.gate || d.secret) continue;
    if (!sigilPathSeen.has(d.to)) { sigilPathSeen.add(d.to); sigilQ.push(d.to); }
  }
}
for (const def of SIGILS) ok(sigilPathSeen.has(def.room), `sigil ${def.name} reachable without the gate`);
ok(VIEW_W === 480 && VIEW_H === 270, "virtual viewport is the intended 480x270");
eq(TILE, 32, "tile size is 32");
ok(ROOM_BY_ID[START_ROOM].w * TILE >= VIEW_W, "start room is wider than the viewport");
ok(ROOM_BY_ID[START_ROOM].h * TILE >= VIEW_H, "start room is taller than the viewport");
ok(inside(ROOM_BY_ID[START_ROOM], START_TILE.x, START_TILE.y), "start tile inside start room");
ok(!ROOM_BY_ID[START_ROOM].solidKeys.has(`${START_TILE.x},${START_TILE.y}`), "start tile is free");

/* -------------------------------- art gate -------------------------------- */
const KNIGHT_COUNTS = [8, 12, 10, 12, 16, 8, 5, 12];
const KNIGHT_VIEWS = ["side", "front", "back"];
const knightRows = [];
for (let view = 0; view < KNIGHT_VIEWS.length; view++) {
  for (let anim = 0; anim < KNIGHT_COUNTS.length; anim++) knightRows.push([view * 8 + anim, 0, KNIGHT_COUNTS[anim]]);
}
const frames = [
  ["knight", 128, 96, knightRows],
  ["skeleton", 72, 72, [[0, 0, 6], [1, 0, 6], [2, 0, 6], [3, 0, 4]]],
  ["wretch", 80, 84, [[0, 0, 6], [1, 0, 6], [2, 0, 6], [3, 0, 4]]],
  ["warden", 120, 120, [[0, 0, 6], [1, 0, 6], [2, 0, 6], [3, 0, 6], [4, 0, 6], [5, 0, 4]]],
  ["dungeon_tiles", 32, 32, [[0, 0, 8], [1, 0, 8], [2, 0, 8], [3, 0, 8]]],
  ["torch", 16, 32, [[0, 0, 8]]],
  ["icons", 16, 16, [[0, 0, 8], [1, 0, 8]]],
];
let artFrames = 0;
for (const [name, fw, fh, rows] of frames) {
  const path = resolve(gameDir, "assets/art", `${name}.png`);
  ok(existsSync(path), `sheet exists: ${name}.png`);
  if (!existsSync(path)) continue;
  const img = decodePNG(path);
  ok(img.w % fw === 0 && img.h % fh === 0, `${name} sheet aligns to ${fw}x${fh} frames`);
  const cols = img.w / fw, totalRows = img.h / fh;
  for (const [row, startCol, count] of rows) {
    ok(row < totalRows, `${name} row ${row} exists`);
    for (let i = 0; i < count; i++) {
      const col = startCol + i;
      if (col >= cols) { ok(false, `${name} frame ${row}:${col} exists`); continue; }
      let opaque = 0;
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          if (img.data[((row * fh + y) * img.w + (col * fw + x)) * 4 + 3] > 0) opaque++;
        }
      }
      ok(opaque > 30, `${name} frame ${row}:${col} has artwork (${opaque} px)`);
      artFrames++;
    }
  }
}
ok(artFrames >= 360, `animated art frame count >= 360 (found ${artFrames})`);

const knightImg = decodePNG(resolve(gameDir, "assets/art/knight.png"));
eq(knightImg.w, 2048, "knight sheet is 16 columns wide");
eq(knightImg.h, 2304, "knight sheet holds 24 rows (three views)");
const knightFrames = KNIGHT_VIEWS.length * KNIGHT_COUNTS.reduce((a, b) => a + b, 0);
eq(knightFrames, 249, "knight frame roster is 249 hand-drawn frames");
let knightEdgeTouches = 0;
for (let view = 0; view < KNIGHT_VIEWS.length; view++) {
  for (let anim = 0; anim < KNIGHT_COUNTS.length; anim++) {
    for (let col = 0; col < KNIGHT_COUNTS[anim]; col++) {
      const row = view * 8 + anim;
      let touch = false;
      for (let y = 0; y < 96 && !touch; y++) {
        for (let x = 0; x < 128; x++) {
          if (x !== 0 && x !== 127 && y !== 0 && y !== 95) { x = 126; continue; }
          const o = ((row * 96 + y) * knightImg.w + (col * 128 + x)) * 4;
          if (knightImg.data[o + 3] > 8) { touch = true; break; }
        }
      }
      if (touch) knightEdgeTouches++;
    }
  }
}
eq(knightEdgeTouches, 0, "no knight frame is clipped at its cell edge");

// Walk and attack must actually change between frames in every view, not just breathe in place.
function frameDiff(row, a, b, fw = 128, fh = 96) {
  let n = 0;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const o = ((row * fh + y) * knightImg.w + a * fw + x) * 4;
    const p = ((row * fh + y) * knightImg.w + b * fw + x) * 4;
    if (knightImg.data[o] !== knightImg.data[p] || knightImg.data[o + 3] !== knightImg.data[p + 3]) n++;
  }
  return n;
}
for (let view = 0; view < KNIGHT_VIEWS.length; view++) {
  const base = view * 8;
  for (const [name, anim] of [["walk", 1], ["atk0", 2], ["atk1", 3], ["atk2", 4]]) {
    const n = KNIGHT_COUNTS[anim];
    const diffs = Array.from({ length: n - 1 }, (_, i) => frameDiff(base + anim, i, i + 1));
    ok(Math.min(...diffs) >= 200, `${KNIGHT_VIEWS[view]} ${name} changes every frame (min ${Math.min(...diffs)} px)`);
    if (anim === 1) {
      const loop = frameDiff(base + anim, n - 1, 0);
      ok(loop >= 300, `${KNIGHT_VIEWS[view]} walk loops cleanly (${loop} px changed)`);
    }
  }
}

/* ------------------------------ ui integrity ------------------------------ */
const html = readFileSync(resolve(gameDir, "index.html"), "utf8");
const css = readFileSync(resolve(gameDir, "style.css"), "utf8");
const js = readFileSync(resolve(gameDir, "js/game.mjs"), "utf8");
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]));
for (const id of usedIds) ok(htmlIds.has(id), `game.mjs element #${id} exists in index.html`);
ok(usedIds.size >= 40, `HUD and ledger wiring covers >= 40 elements (${usedIds.size})`);
ok(html.includes('class="screen ledger hide"'), "ledger overlay exists in the stage");
ok(html.includes("THE KNIGHT'S LEDGER") && html.includes("OATHBOUND SET"), "ledger presents the knight and the oathbound set");
ok(/data-tab="relics"/.test(html) && /data-tab="gear"/.test(html), "ledger has relic and equipment tabs");
ok(html.includes('id="ledgerSlots"') && html.includes('id="ledgerDetail"') && html.includes('id="ledgerGrid"'), "ledger exposes slots, collection and detail panes");
ok(css.includes(".ledger-figure") && css.includes('url("assets/art/knight.png")'), "ledger shows the hand-drawn knight figure");
ok(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "relic collection grid cannot squeeze its second column");
ok(/function openLedger\(/.test(js) && /function closeLedger\(/.test(js), "ledger has open and close handlers");
ok(js.includes('game.mode === "ledger"') && js.includes('game.mode = "ledger"'), "ledger freezes the world while open");
ok(js.includes("EQUIPMENT.map") && js.includes("RELICS.map(ledgerRelicCard)"), "ledger renders relics and equipment from data");
ok(js.includes("KeyI") && js.includes('game.mode === "paused"'), "ledger opens from play and pause with I");
const cssUrls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]).filter((u) => !/^data:|^https?:/.test(u));
for (const u of cssUrls) ok(existsSync(resolve(gameDir, u)), `CSS asset exists: ${u}`);
for (const f of ["js/game.mjs", "js/level.mjs", "js/audio.mjs", "index.html", "style.css"]) {
  ok(existsSync(resolve(gameDir, f)), `runtime file exists: ${f}`);
}
const checksJs = ["game/js/game.mjs", "game/js/level.mjs", "game/js/audio.mjs"].map((f) =>
  spawnSync(process.execPath, ["--check", resolve(ROOT, f)], { encoding: "utf8" }));
ok(checksJs.every((r) => r.status === 0), "all runtime modules pass node --check");

/* --------------------------------- report --------------------------------- */
console.log("== ASHEN VOW — DENSITY & INTEGRITY GATES ==");
for (const room of ROOMS) {
  const st = room.id === START_ROOM ? "start" : room.id === bossRoom?.id ? "BOSS" : room.secret ? "secret" : "room";
  console.log(
    `${room.id.padEnd(14)} ${String(room.w + "x" + room.h).padEnd(6)} ${st.padEnd(6)} ` +
    `enemies ${String(room.spawns.length).padStart(2)}  chests ${room.chests.length}  props ${String(room.props.length).padStart(2)}  ` +
    `torches ${room.torches.length}${room.sigils.length ? "  sigil" : ""}${room.altar ? "  altar" : ""}`
  );
}
console.log("-".repeat(78));
console.log(
  `rooms ${ROOMS.length} · enemies ${enemies} (${skeletons} skeletons, ${wretches} wretches, ${bosses} warden) · ` +
  `chests ${chests} (${relicChests} relics, ${healChests} heal, ${soulChests} souls)`
);
console.log(`sigils ${sigilCount} · secret walls ${secrets} · props ${props} · torches ${torches} · animated frames ${artFrames}`);
console.log(`floor tiles ${ROOMS.reduce((n, r) => n + (r.w - 2) * (r.h - 2), 0)} · checks ${checks}`);
if (failures.length) {
  console.error(`\nFAILED ${failures.length} gate(s):`);
  for (const f of failures) console.error(" - " + f);
  process.exitCode = 1;
} else {
  console.log(`\nPASS — ${checks} automated gates green.`);
}
