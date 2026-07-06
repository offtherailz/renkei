// Applica al seed già committato la ricategorizzazione di numeri/contatori
// (stessa logica del pipeline sync, senza rifare il fetch di rete) e inserisce
// il contatore 日 se manca. Idempotente.
//
//   node scripts/fix-numbers-counters.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { classifyNumbersAndCounters } from "./lib/numbers-counters.mjs";

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "static", "seed-n5n4.json");
const COUNTERS_PATH = path.join(ROOT, "scripts", "data", "counters-n5n4.json");

const seed = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
const curatedCounters = JSON.parse(await fs.readFile(COUNTERS_PATH, "utf8"));
const now = Date.now();

// 1. Ricategorizza numeri e contatori nel catalogo parole.
const report = classifyNumbersAndCounters(seed.words);

// 2. Allinea la lista contatori del seed a quella curata (aggiunge 日 ecc.).
const seedById = new Map((seed.counters ?? []).map((c) => [c.id, c]));
const wordIds = new Set(seed.words.map((w) => w.id));
for (const counter of curatedCounters) {
  const existing = seedById.get(counter.id);
  const parole = (counter.parole_tipiche ?? []).filter((id) => wordIds.has(id));
  seedById.set(counter.id, {
    ...counter,
    parole_tipiche: parole,
    updated_at: existing?.updated_at ?? now
  });
}
seed.counters = [...seedById.values()];

// 3. Aggancia le parole tipiche al contatore se non già collegate.
const wordsById = new Map(seed.words.map((w) => [w.id, w]));
for (const counter of seed.counters) {
  for (const id of counter.parole_tipiche ?? []) {
    const w = wordsById.get(id);
    if (w && !w.id_contatore_suggerito) w.id_contatore_suggerito = counter.id;
  }
}

await fs.writeFile(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `Seed aggiornato: ${report.numeri} numerali, ${report.contatori} contatori. ` +
    `${seed.counters.length} contatori totali.`
);
