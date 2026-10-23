// Browser test for the knight's ledger: input, tabs, selection, freeze and pause handoff.
import { mkdir } from "node:fs/promises";
import { launch } from "./cdp.mjs";

const OUT = "art/review";
await mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await launch();

let failures = 0;
function check(cond, msg) {
  if (cond) console.log("ok:", msg);
  else { failures++; console.log("FAIL:", msg); }
}
async function press(code, key, vk) { await b.key(code, key, 45, vk); }
const ledgerOpen = () => b.eval(() => !document.getElementById("ledger").classList.contains("hide"));

try {
  await b.send("Page.navigate", { url: "http://127.0.0.1:8123/" });
  await b.waitFor(() => window.__ASHEN && window.__ASHEN.game.mode === "title" && !!window.__ASHEN.images.knight, 20000);
  await press("Enter", "Enter", 13);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  await sleep(400);

  await press("KeyI", "i", 73);
  await b.waitFor(() => window.__ASHEN.game.mode === "ledger");
  await sleep(250);
  check(await ledgerOpen(), "I opens the ledger");
  let state = await b.eval(() => {
    const A = window.__ASHEN;
    return {
      mode: A.game.mode,
      hudHidden: document.getElementById("hud").classList.contains("hud-hidden"),
      cards: document.querySelectorAll("#ledgerGrid .relic-card").length,
      locked: document.querySelectorAll("#ledgerGrid .relic-card.locked").length,
      gearRows: document.querySelectorAll("#ledgerGearList .gear-row").length,
      slots: document.querySelectorAll("#ledgerSlots .ledger-slot").length,
      stats: document.querySelectorAll("#ledgerStats .ledger-stat").length,
      count: document.getElementById("ledgerRelicCount").textContent.trim(),
      gearHidden: document.getElementById("ledgerGear").classList.contains("hide"),
      relicsHidden: document.getElementById("ledgerRelics").classList.contains("hide"),
      figure: document.querySelector(".ledger-figure").style.backgroundPosition,
      detail: document.getElementById("ledgerDetail").textContent,
    };
  });
  console.log("ledger", state);
  check(state.mode === "ledger", "game mode freezes as ledger");
  check(state.hudHidden, "HUD yields to the ledger");
  check(state.cards === 7 && state.locked === 7, "all seven relic slots render, locked");
  check(state.gearRows === 5 && state.slots === 5, "five equipment rows and five worn slots render");
  check(state.stats === 6, "derived stat strip renders six values");
  check(state.count === "0 / 7", "relic count starts at 0 / 7");
  check(state.gearHidden && !state.relicsHidden, "relic tab is shown first");
  check(/Ember Heart/.test(state.detail) && /Sealed/.test(state.detail), "locked relic detail teases without leaking its boon");

  const t0 = await b.eval(() => window.__ASHEN.game.time);
  await sleep(350);
  const t1 = await b.eval(() => window.__ASHEN.game.time);
  const figure1 = await b.eval(() => document.querySelector(".ledger-figure").style.backgroundPosition);
  check(t1 === t0, "world clock is frozen while the ledger is open");
  check(figure1 !== state.figure, "ledger figure breathes through hand-drawn frames");

  await b.eval(() => document.querySelector('.ledger-tab[data-tab="gear"]').click());
  await sleep(200);
  state = await b.eval(() => ({
    gearHidden: document.getElementById("ledgerGear").classList.contains("hide"),
    relicsHidden: document.getElementById("ledgerRelics").classList.contains("hide"),
    rows: [...document.querySelectorAll("#ledgerGearList .gear-row")].map((r) => ({
      selected: r.classList.contains("selected"), text: r.textContent,
    })),
    detail: document.getElementById("ledgerDetail").textContent,
  }));
  check(state.gearHidden === false && state.relicsHidden === true, "equipment tab swaps the list");
  check(state.rows.length === 5 && state.rows.filter((r) => r.selected).length === 1, "one equipment row is selected");
  check(/Ashen Longsword/.test(state.rows.find((r) => r.selected).text), "longsword is the default loadout selection");
  check(/OATHBOUND SET/.test(state.detail) && /Forged for a vigil/.test(state.detail), "equipment detail shows effect and lore");

  await b.eval(() => document.querySelector('#ledgerSlots [data-gear="sallet"]').click());
  await sleep(160);
  state = await b.eval(() => ({
    gearHidden: document.getElementById("ledgerGear").classList.contains("hide"),
    salletSelected: document.querySelector('#ledgerGearList [data-gear="sallet"]').classList.contains("selected"),
    detail: document.getElementById("ledgerDetail").textContent,
  }));
  check(state.gearHidden === false, "clicking a worn slot stays on equipment");
  check(state.salletSelected, "clicking the helm slot selects the sallet");
  check(/Weathered Sallet/.test(state.detail) && /dented|Dented/.test(state.detail), "slot click updates the detail pane");

  await press("ArrowDown", "ArrowDown", 40);
  await sleep(120);
  const moved = await b.eval(() => document.querySelector("#ledgerGearList .gear-row.selected").dataset.gear);
  check(moved === "vowplate", "arrow keys walk the equipment list");

  await press("KeyI", "i", 73);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");
  check(!(await ledgerOpen()), "I closes the ledger back into play");
  const resumed0 = await b.eval(() => window.__ASHEN.game.time);
  await sleep(250);
  const resumed1 = await b.eval(() => window.__ASHEN.game.time);
  check(resumed1 > resumed0, "world clock resumes after closing");

  await b.eval(() => window.__ASHEN.game.run.relics.add("ember_heart"));
  await press("Tab", "Tab", 9);
  await b.waitFor(() => window.__ASHEN.game.mode === "ledger");
  await sleep(200);
  state = await b.eval(() => ({
    count: document.getElementById("ledgerRelicCount").textContent.trim(),
    owned: document.querySelectorAll("#ledgerGrid .relic-card.owned").length,
    chosen: window.__ASHEN.ledgerState.relicId,
    detail: document.getElementById("ledgerDetail").textContent,
  }));
  check(state.count === "1 / 7" && state.owned === 1, "Tab reopens and reflects claimed relics");
  check(state.chosen === "ember_heart", "a claimed relic is selected by default");
  await b.eval(() => {
    document.querySelector('.ledger-tab[data-tab="relics"]').click();
    document.querySelector('#ledgerGrid [data-relic="ember_heart"]').click();
  });
  await sleep(150);
  const claimed = await b.eval(() => ({
    selected: document.querySelector('#ledgerGrid [data-relic="ember_heart"]').classList.contains("selected"),
    detail: document.getElementById("ledgerDetail").textContent,
  }));
  check(claimed.selected, "clicking a claimed relic selects its card");
  check(/Warmth in the dark/.test(claimed.detail) && /first hearth/.test(claimed.detail), "claimed relic shows its boon and lore");
  await b.screenshot(`${OUT}/v2-ledger-claimed.png`);

  await b.eval(() => document.getElementById("ledger").click());
  await sleep(220);
  check(!(await ledgerOpen()) && (await b.eval(() => window.__ASHEN.game.mode)) === "play", "clicking the veil closes the ledger");

  await press("Escape", "Escape", 27);
  await b.waitFor(() => window.__ASHEN.game.mode === "paused");
  check(await b.eval(() => !document.getElementById("pause").classList.contains("hide")), "pause screen opens");
  await press("KeyI", "i", 73);
  await b.waitFor(() => window.__ASHEN.game.mode === "ledger");
  check(await b.eval(() => document.getElementById("pause").classList.contains("hide")), "ledger can open from pause");
  await press("Tab", "Tab", 9);
  await b.waitFor(() => window.__ASHEN.game.mode === "paused");
  await sleep(120);
  check(await b.eval(() => !document.getElementById("pause").classList.contains("hide")), "closing the ledger returns to pause");
  await press("Escape", "Escape", 27);
  await b.waitFor(() => window.__ASHEN.game.mode === "play");

  check(b.errors.length === 0, `no console errors (${b.errors.join(" | ") || "none"})`);
  if (failures) {
    console.error(`\nFAILED ${failures} ledger check(s)`);
    process.exitCode = 1;
  } else {
    console.log("\nPASS — ledger browser checks green.");
  }
} finally {
  await b.close();
}
