// Ashen Vow — dungeon graph, room layouts and loot. Shared by the game and the density gates.
export const TILE = 32;
export const VIEW_W = 480;
export const VIEW_H = 270;
export const START_ROOM = "gatehouse";
export const START_TILE = { x: 10, y: 11 };

export const RELICS = [
  { id: "ember_heart", name: "Ember Heart", icon: 0, tag: "VITALITY", desc: "+1 max heart. Warmth in the dark.", lore: "Cut from the first hearth of the keep. It still remembers a hand that fed the fire." },
  { id: "iron_feather", name: "Iron Feather", icon: 1, tag: "AGILITY", desc: "Dash recovers 35% faster.", lore: "A plume from the Warden's helm, shed on the day the vow was broken." },
  { id: "bloodfang", name: "Bloodfang", icon: 2, tag: "SUSTENANCE", desc: "Every 5th landed strike mends half a heart.", lore: "The blade remembers every wound. So does the knight." },
  { id: "grave_eye", name: "Grave Eye", icon: 3, tag: "PERCEPTION", desc: "+15% critical strikes. Secrets shimmer.", lore: "It sees the seams in the world, and the secrets pressed between them." },
  { id: "silver_grail", name: "Silver Grail", icon: 4, tag: "MERCY", desc: "All healing is increased by half a heart.", lore: "A cup for the living. It has never once been filled with water." },
  { id: "bone_crown", name: "Bone Crown", icon: 5, tag: "POWER", desc: "+25% damage dealt.", lore: "Worn by the last king beneath the keep. It still expects a head." },
  { id: "grave_lantern", name: "Grave Lantern", icon: 10, tag: "REVELATION", desc: "A cold flame. Widens your light and reveals hidden ways.", lore: "The flame gives no warmth. It only gives sight." },
];

export const EQUIPMENT = [
  {
    id: "sallet", slot: "HELM", name: "Weathered Sallet", icon: 15, stat: "Dented, but unbowed",
    desc: "A close helm with a flattened brow and a votive mark punched above the visor.",
    lore: "The visor was hammered flat the night the keep fell. The knight never had it remade.",
  },
  {
    id: "vowplate", slot: "CHEST", name: "Oathbound Plate", icon: 5, stat: "5 hearts of resolve",
    desc: "Scarred breastplate bound with red cord and a single ember clasp.",
    lore: "Every scratch is a name. Most of them are not the knight's.",
  },
  {
    id: "gauntlets", slot: "ARMS", name: "Ash-Stained Gauntlets", icon: 14, stat: "Three-strike vow",
    desc: "Mail-backed gauntlets that remember the weight of the longsword.",
    lore: "Ash never leaves the knuckles. It is said the gauntlets refuse to be clean.",
  },
  {
    id: "longsword", slot: "BLADE", name: "Ashen Longsword", icon: 12, stat: "8–15 strike",
    desc: "A tapered blade with a gilded guard and a fuller that catches embers.",
    lore: "Forged for a vigil that had no end. Balanced to be swung until the arms give out.",
  },
  {
    id: "vigil", slot: "SHIELD", name: "Shield of the Vigil", icon: 11, stat: "Weathers the first blow",
    desc: "A heater shield in midnight blue, bearing a sword and an ember diamond.",
    lore: "The paint is newer than the dents. Someone still tends the vow.",
  },
];

export const SIGILS = [
  { id: 1, name: "Sigil of Bone", room: "ossuary" },
  { id: 2, name: "Gilded Sigil", room: "gallery" },
  { id: 3, name: "Ritual Sigil", room: "ritual" },
];

export const PROP_TILE = { barrel: 18, crate: 19, pillar: 20, bones: 21, brazier: 22, banner: 23 };
const SOLID_PROPS = new Set(["barrel", "crate", "pillar", "brazier"]);

const RAW_ROOMS = [
  {
    id: "gatehouse", name: "Ashen Threshold", subtitle: "Where the vow was sworn", theme: "gatehouse",
    w: 22, h: 14, pos: [0, 0], ambient: 0.82, music: "calm",
    doors: [
      { x: 10, y: 0, wall: "N", to: "hall" },
      { x: 10, y: 13, wall: "S", to: "warden_gate", gate: true },
    ],
    spawns: [
      { type: "skeleton", x: 4, y: 8 },
      { type: "skeleton", x: 17, y: 5 },
    ],
    chests: [{ x: 17, y: 10, type: "souls" }],
    torches: [{ x: 5, y: 0 }, { x: 15, y: 0 }],
    props: [
      { t: "pillar", x: 6, y: 3 }, { t: "pillar", x: 15, y: 3 },
      { t: "banner", x: 4, y: 1 }, { t: "banner", x: 17, y: 1 },
      { t: "brazier", x: 8, y: 2 }, { t: "brazier", x: 13, y: 2 },
      { t: "crate", x: 4, y: 11 }, { t: "barrel", x: 18, y: 11 },
      { t: "bones", x: 12, y: 7 },
    ],
    rugs: [{ x: 9, y: 1, w: 3, h: 12, style: "crimson" }],
    wallDecor: [{ t: "gargoyle", x: 19, y: 0 }],
  },
  {
    id: "hall", name: "Hall of Dying Flames", subtitle: "The heart of the keep", theme: "hall",
    w: 28, h: 18, pos: [0, -1], ambient: 0.8, music: "calm",
    doors: [
      { x: 13, y: 17, wall: "S", to: "gatehouse" },
      { x: 13, y: 0, wall: "N", to: "chapel" },
      { x: 0, y: 9, wall: "W", to: "ossuary" },
      { x: 27, y: 9, wall: "E", to: "cellar" },
    ],
    spawns: [
      { type: "skeleton", x: 7, y: 5 },
      { type: "skeleton", x: 20, y: 5 },
      { type: "skeleton", x: 5, y: 12 },
      { type: "wretch", x: 21, y: 12 },
    ],
    chests: [{ x: 23, y: 15, type: "relic" }],
    torches: [{ x: 5, y: 0 }, { x: 20, y: 0 }],
    props: [
      { t: "pillar", x: 8, y: 4 }, { t: "pillar", x: 18, y: 4 },
      { t: "pillar", x: 8, y: 13 }, { t: "pillar", x: 18, y: 13 },
      { t: "brazier", x: 11, y: 2 }, { t: "brazier", x: 15, y: 2 },
      { t: "brazier", x: 11, y: 15 }, { t: "brazier", x: 15, y: 15 },
      { t: "banner", x: 4, y: 1 }, { t: "banner", x: 23, y: 1 },
      { t: "bones", x: 14, y: 8 },
      { t: "crate", x: 3, y: 14 }, { t: "crate", x: 24, y: 5 },
    ],
    rugs: [{ x: 12, y: 1, w: 3, h: 16, style: "crimson" }],
    wallDecor: [],
  },
  {
    id: "ossuary", name: "The Ossuary", subtitle: "The faithful do not sleep", theme: "ossuary",
    w: 22, h: 14, pos: [-1, -1], ambient: 0.86, music: "calm",
    doors: [
      { x: 21, y: 8, wall: "E", to: "hall" },
      { x: 16, y: 0, wall: "N", to: "gallery" },
      { x: 0, y: 7, wall: "W", to: "flooded_vault", secret: true },
    ],
    spawns: [
      { type: "skeleton", x: 4, y: 5 },
      { type: "skeleton", x: 10, y: 4 },
      { type: "skeleton", x: 15, y: 10 },
      { type: "skeleton", x: 9, y: 9 },
      { type: "wretch", x: 17, y: 6 },
      { type: "wretch", x: 6, y: 11 },
    ],
    chests: [{ x: 4, y: 10, type: "relic" }],
    sigils: [{ x: 18, y: 3, id: 1, name: "Sigil of Bone" }],
    torches: [{ x: 7, y: 0 }, { x: 12, y: 0 }],
    props: [
      { t: "pillar", x: 7, y: 3 }, { t: "pillar", x: 13, y: 3 },
      { t: "bones", x: 6, y: 6 }, { t: "bones", x: 15, y: 7 },
      { t: "bones", x: 9, y: 12 }, { t: "bones", x: 17, y: 11 },
      { t: "bones", x: 12, y: 8 },
      { t: "brazier", x: 5, y: 2 }, { t: "brazier", x: 19, y: 1 },
      { t: "banner", x: 3, y: 1 },
    ],
    wallDecor: [{ t: "cobweb", x: 1, y: 0 }, { t: "cobweb", x: 20, y: 0 }],
  },
  {
    id: "cellar", name: "The Sunken Cellar", subtitle: "Water remembers everything", theme: "cellar",
    w: 22, h: 14, pos: [1, -1], ambient: 0.87, music: "calm",
    doors: [
      { x: 0, y: 8, wall: "W", to: "hall" },
      { x: 11, y: 0, wall: "N", to: "armory" },
    ],
    spawns: [
      { type: "skeleton", x: 5, y: 4 },
      { type: "skeleton", x: 16, y: 9 },
      { type: "wretch", x: 11, y: 10 },
      { type: "wretch", x: 17, y: 4 },
      { type: "wretch", x: 7, y: 11 },
    ],
    chests: [{ x: 15, y: 10, type: "relic" }],
    torches: [{ x: 5, y: 0 }, { x: 17, y: 0 }],
    props: [
      { t: "barrel", x: 4, y: 3 }, { t: "barrel", x: 17, y: 3 },
      { t: "barrel", x: 6, y: 9 }, { t: "barrel", x: 13, y: 6 },
      { t: "crate", x: 9, y: 4 }, { t: "crate", x: 15, y: 3 },
      { t: "crate", x: 19, y: 9 },
      { t: "brazier", x: 11, y: 5 },
      { t: "bones", x: 20, y: 12 },
    ],
    wallDecor: [{ t: "cobweb", x: 1, y: 0 }, { t: "cobweb", x: 20, y: 0 }, { t: "cobweb", x: 0, y: 1 }],
  },
  {
    id: "chapel", name: "Chapel of the Vow", subtitle: "Kneel, and be mended", theme: "chapel",
    w: 20, h: 14, pos: [0, -2], ambient: 0.8, music: "calm",
    doors: [{ x: 9, y: 13, wall: "S", to: "hall" }],
    spawns: [
      { type: "skeleton", x: 5, y: 7 },
      { type: "skeleton", x: 14, y: 7 },
    ],
    chests: [{ x: 16, y: 10, type: "relic" }],
    torches: [{ x: 5, y: 0 }, { x: 14, y: 0 }],
    altar: { x: 9, y: 3 },
    props: [
      { t: "pillar", x: 3, y: 8 }, { t: "pillar", x: 16, y: 8 },
      { t: "banner", x: 4, y: 1 }, { t: "banner", x: 15, y: 1 },
      { t: "brazier", x: 6, y: 4 }, { t: "brazier", x: 13, y: 4 },
    ],
    rugs: [{ x: 8, y: 4, w: 2, h: 9, style: "crimson" }],
    wallDecor: [],
  },
  {
    id: "gallery", name: "Hall of Witnesses", subtitle: "Stone eyes follow the living", theme: "gallery",
    w: 24, h: 14, pos: [-1, -2], ambient: 0.84, music: "calm",
    doors: [
      { x: 9, y: 13, wall: "S", to: "ossuary" },
      { x: 17, y: 0, wall: "N", to: "ritual" },
      { x: 0, y: 7, wall: "W", to: "reliquary", secret: true },
    ],
    spawns: [
      { type: "skeleton", x: 4, y: 5 },
      { type: "skeleton", x: 13, y: 4 },
      { type: "skeleton", x: 18, y: 9 },
      { type: "wretch", x: 8, y: 10 },
      { type: "wretch", x: 15, y: 7 },
    ],
    chests: [{ x: 12, y: 11, type: "heal" }],
    sigils: [{ x: 20, y: 4, id: 2, name: "Gilded Sigil" }],
    torches: [{ x: 6, y: 0 }, { x: 20, y: 0 }],
    props: [
      { t: "pillar", x: 6, y: 4 }, { t: "pillar", x: 12, y: 4 },
      { t: "pillar", x: 6, y: 9 }, { t: "pillar", x: 12, y: 9 },
      { t: "pillar", x: 18, y: 11 },
      { t: "banner", x: 3, y: 1 }, { t: "banner", x: 21, y: 1 },
      { t: "bones", x: 10, y: 7 }, { t: "bones", x: 19, y: 9 },
      { t: "brazier", x: 15, y: 2 },
    ],
    wallDecor: [
      { t: "gargoyle", x: 4, y: 0 }, { t: "gargoyle", x: 13, y: 0 },
      { t: "gargoyle", x: 21, y: 0 },
    ],
  },
  {
    id: "armory", name: "The Rusted Armory", subtitle: "Steel for a war long lost", theme: "armory",
    w: 20, h: 12, pos: [1, -2], ambient: 0.85, music: "calm",
    doors: [
      { x: 6, y: 11, wall: "S", to: "cellar" },
      { x: 19, y: 6, wall: "E", to: "barracks" },
    ],
    spawns: [
      { type: "skeleton", x: 5, y: 5 },
      { type: "skeleton", x: 14, y: 4 },
    ],
    chests: [{ x: 15, y: 8, type: "relic" }],
    torches: [{ x: 4, y: 0 }, { x: 13, y: 0 }],
    props: [
      { t: "crate", x: 4, y: 2 }, { t: "crate", x: 12, y: 2 },
      { t: "crate", x: 9, y: 6 }, { t: "crate", x: 16, y: 2 },
      { t: "barrel", x: 7, y: 3 }, { t: "barrel", x: 14, y: 7 },
      { t: "banner", x: 16, y: 1 }, { t: "brazier", x: 5, y: 8 },
    ],
    wallDecor: [],
  },
  {
    id: "barracks", name: "The Bone Barracks", subtitle: "Their watch never ended", theme: "barracks",
    w: 24, h: 14, pos: [2, -2], ambient: 0.86, music: "calm",
    doors: [
      { x: 0, y: 8, wall: "W", to: "armory" },
      { x: 17, y: 0, wall: "N", to: "ritual" },
    ],
    spawns: [
      { type: "skeleton", x: 5, y: 5 },
      { type: "skeleton", x: 11, y: 4 },
      { type: "skeleton", x: 16, y: 9 },
      { type: "wretch", x: 19, y: 6 },
    ],
    chests: [{ x: 8, y: 11, type: "relic" }],
    torches: [{ x: 5, y: 0 }, { x: 20, y: 0 }],
    props: [
      { t: "crate", x: 3, y: 3 }, { t: "crate", x: 12, y: 3 },
      { t: "crate", x: 19, y: 10 }, { t: "crate", x: 15, y: 4 },
      { t: "barrel", x: 4, y: 9 }, { t: "barrel", x: 20, y: 4 },
      { t: "bones", x: 9, y: 7 }, { t: "bones", x: 17, y: 11 },
      { t: "brazier", x: 8, y: 2 }, { t: "brazier", x: 14, y: 2 },
      { t: "banner", x: 21, y: 1 },
    ],
    wallDecor: [{ t: "cobweb", x: 1, y: 0 }],
  },
  {
    id: "ritual", name: "The Ritual of Ash", subtitle: "The last sigil burns here", theme: "ritual",
    w: 24, h: 16, pos: [0, -3], ambient: 0.86, music: "tense",
    doors: [
      { x: 6, y: 15, wall: "S", to: "gallery" },
      { x: 18, y: 15, wall: "S", to: "barracks" },
    ],
    spawns: [
      { type: "skeleton", x: 6, y: 6 },
      { type: "skeleton", x: 11, y: 5 },
      { type: "skeleton", x: 16, y: 8 },
      { type: "skeleton", x: 13, y: 11 },
      { type: "wretch", x: 8, y: 10 },
      { type: "wretch", x: 18, y: 12 },
    ],
    sigils: [{ x: 12, y: 3, id: 3, name: "Ritual Sigil" }],
    torches: [{ x: 6, y: 0 }, { x: 17, y: 0 }],
    props: [
      { t: "pillar", x: 7, y: 6 }, { t: "pillar", x: 16, y: 6 },
      { t: "pillar", x: 7, y: 11 }, { t: "pillar", x: 16, y: 11 },
      { t: "brazier", x: 5, y: 3 }, { t: "brazier", x: 18, y: 3 },
      { t: "brazier", x: 9, y: 13 }, { t: "brazier", x: 14, y: 13 },
      { t: "bones", x: 10, y: 8 }, { t: "bones", x: 15, y: 9 },
      { t: "banner", x: 3, y: 1 }, { t: "banner", x: 20, y: 1 },
    ],
    rings: [{ cx: 12, cy: 6, rx: 6.5, ry: 4.6 }],
    wallDecor: [{ t: "cobweb", x: 1, y: 0 }, { t: "cobweb", x: 22, y: 0 }],
  },
  {
    id: "warden_gate", name: "The Warden's Gate", subtitle: "The last door of the keep", theme: "boss",
    w: 26, h: 18, pos: [0, 1], ambient: 0.88, music: "boss",
    doors: [{ x: 12, y: 0, wall: "N", to: "gatehouse" }],
    spawns: [{ type: "warden", x: 13, y: 13 }],
    torches: [{ x: 6, y: 0 }, { x: 19, y: 0 }],
    props: [
      { t: "pillar", x: 5, y: 5 }, { t: "pillar", x: 20, y: 5 },
      { t: "pillar", x: 5, y: 12 }, { t: "pillar", x: 20, y: 12 },
      { t: "brazier", x: 6, y: 3 }, { t: "brazier", x: 19, y: 3 },
      { t: "brazier", x: 4, y: 9 }, { t: "brazier", x: 21, y: 9 },
      { t: "bones", x: 7, y: 14 }, { t: "bones", x: 18, y: 14 },
      { t: "bones", x: 12, y: 16 },
      { t: "banner", x: 3, y: 1 }, { t: "banner", x: 22, y: 1 },
    ],
    rings: [{ cx: 13, cy: 9, rx: 6.8, ry: 4.8 }],
    wallDecor: [
      { t: "gargoyle", x: 4, y: 0 }, { t: "gargoyle", x: 8, y: 0 },
      { t: "gargoyle", x: 17, y: 0 }, { t: "gargoyle", x: 21, y: 0 },
    ],
  },
  {
    id: "flooded_vault", name: "The Flooded Vault", subtitle: "A secret the water kept", theme: "vault",
    w: 16, h: 10, pos: [-2, -1], ambient: 0.9, music: "calm", secret: true,
    doors: [{ x: 15, y: 5, wall: "E", to: "ossuary" }],
    spawns: [],
    chests: [
      { x: 5, y: 3, type: "heal" },
      { x: 10, y: 6, type: "souls" },
    ],
    torches: [{ x: 3, y: 0 }, { x: 12, y: 0 }],
    props: [
      { t: "barrel", x: 4, y: 6 }, { t: "barrel", x: 11, y: 3 },
      { t: "brazier", x: 8, y: 2 }, { t: "bones", x: 7, y: 7 },
    ],
    wallDecor: [{ t: "cobweb", x: 1, y: 0 }, { t: "cobweb", x: 14, y: 0 }],
  },
  {
    id: "reliquary", name: "The Hidden Reliquary", subtitle: "What the gargoyles guarded", theme: "vault",
    w: 16, h: 10, pos: [-2, -2], ambient: 0.88, music: "calm", secret: true,
    doors: [{ x: 15, y: 5, wall: "E", to: "gallery" }],
    spawns: [],
    chests: [{ x: 8, y: 3, type: "relic" }],
    torches: [{ x: 4, y: 0 }, { x: 11, y: 0 }],
    props: [
      { t: "pillar", x: 4, y: 3 }, { t: "pillar", x: 11, y: 6 },
      { t: "banner", x: 5, y: 1 }, { t: "banner", x: 10, y: 1 },
      { t: "brazier", x: 5, y: 6 }, { t: "bones", x: 12, y: 7 },
    ],
    rugs: [{ x: 6, y: 1, w: 5, h: 4, style: "azure" }],
    wallDecor: [],
  },
];

const THEME_SCATTER = {
  gatehouse: { rubble: 4, blood: 1 },
  hall: { rubble: 2, blood: 1 },
  ossuary: { moss: 10, rubble: 4, blood: 2 },
  cellar: { moss: 10, puddle: 7, grate: 4, rubble: 2 },
  chapel: { rubble: 1 },
  gallery: { blood: 3, rubble: 2, moss: 2 },
  armory: { rubble: 3, moss: 1 },
  barracks: { blood: 4, rubble: 3, moss: 2 },
  ritual: { moss: 3, blood: 3, rubble: 2 },
  boss: { blood: 5, rubble: 2 },
  vault: { puddle: 6, moss: 3, grate: 2, rubble: 1 },
};
const SCATTER_CHAR = { moss: "m", blood: "b", puddle: "p", grate: "g", rubble: "r" };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function buildRoom(spec) {
  const { w, h } = spec;
  const grid = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : ".")));
  const doors = spec.doors.map((d) => {
    const side = d.wall;
    if (side === "N") { if (d.y !== 0) throw new Error(`${spec.id} N door off-wall`); }
    if (side === "S") { if (d.y !== h - 1) throw new Error(`${spec.id} S door off-wall`); }
    if (side === "W") { if (d.x !== 0) throw new Error(`${spec.id} W door off-wall`); }
    if (side === "E") { if (d.x !== w - 1) throw new Error(`${spec.id} E door off-wall`); }
    grid[d.y][d.x] = "D";
    return { ...d, id: `${spec.id}:${d.x},${d.y}` };
  });

  const rng = mulberry32(strSeed(spec.id + ":floors"));
  const interior = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) interior.push([x, y]);
  const scatter = THEME_SCATTER[spec.theme] || {};
  for (const [kind, count] of Object.entries(scatter)) {
    for (let i = 0; i < count; i++) {
      const [x, y] = interior[Math.floor(rng() * interior.length)];
      if (grid[y][x] === ".") grid[y][x] = SCATTER_CHAR[kind];
    }
  }
  for (const [x, y, ch] of spec.floors || []) grid[y][x] = ch;

  const props = (spec.props || []).map((p) => ({ ...p, solid: SOLID_PROPS.has(p.t) }));
  const solidKeys = new Set(props.filter((p) => p.solid).map((p) => `${p.x},${p.y}`));
  const sigils = spec.sigils || [];
  const chests = spec.chests || [];
  const altar = spec.altar || null;
  for (const s of sigils) solidKeys.add(`${s.x},${s.y}`);
  for (const c of chests) solidKeys.add(`${c.x},${c.y}`);
  if (altar) solidKeys.add(`${altar.x},${altar.y}`);

  return {
    ...spec,
    grid, doors, props, sigils, chests, altar,
    solidKeys,
    spawnPoint: spec.spawnPoint || null,
    wallDecor: spec.wallDecor || [],
    rugs: spec.rugs || [],
    rings: spec.rings || [],
  };
}

export const ROOMS = RAW_ROOMS.map(buildRoom);
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export function roomById(id) { return ROOM_BY_ID[id]; }

export function doorAt(room, tx, ty) {
  return room.doors.find((d) => d.x === tx && d.y === ty) || null;
}

export function isBoundaryWall(room, tx, ty) {
  return tx === 0 || ty === 0 || tx === room.w - 1 || ty === room.h - 1;
}

export function walkableChar(ch) {
  return ch !== "#" && ch !== undefined;
}

export function spawnFeet(spawn) {
  return { x: (spawn.x + 0.5) * TILE, y: (spawn.y + 0.78) * TILE };
}

export function doorInward(door) {
  switch (door.wall) {
    case "N": return { x: 0, y: 1 };
    case "S": return { x: 0, y: -1 };
    case "W": return { x: 1, y: 0 };
    default: return { x: -1, y: 0 };
  }
}
