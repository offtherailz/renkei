// Riapplica al seed committato split, rinomine e fusioni (word-splits.mjs),
// senza fetch di rete — stesso ruolo di fix-numbers-counters.mjs. Aggiorna anche
// le parole correlate dei kanji e ri-chiava gli overrides sugli id nuovi.
import fs from "node:fs";
import {
  WORD_SPLITS,
  WORD_RENAMES,
  WORD_MERGES,
  applyWordSplits,
  applyWordRenames,
  fixKanjiRelatedWords,
  fixKanjiRenamedWords
} from "./lib/word-splits.mjs";

const SEED = "static/seed-n5n4.json";
const OVERRIDES = "scripts/data/word-overrides.json";

const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
const before = seed.words.length;
seed.words = applyWordRenames(applyWordSplits(seed.words));
fixKanjiRenamedWords(fixKanjiRelatedWords(seed.kanji ?? []));

// Overrides: le entry con gli id vecchi non matcherebbero più nulla — si
// ri-chiavano sugli id nuovi (fusioni: i campi del duplicato si scartano,
// restano quelli della voce che sopravvive).
const overrides = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
for (const [combinedId, parts] of Object.entries(WORD_SPLITS)) {
  if (overrides[combinedId]) delete overrides[combinedId];
  for (const part of parts) {
    overrides[part.id] = {
      ...(overrides[part.id] ?? {}),
      significato: part.significato,
      frasi_esempio: part.frasi_esempio,
      tipo_jp: part.tipo_jp,
      classe_verbo_jp: part.classe_verbo_jp,
      transitivita_jp: part.transitivita_jp,
      id_verbo_corrispondente: part.id_verbo_corrispondente
    };
  }
}
for (const [oldId, patch] of Object.entries(WORD_RENAMES)) {
  const prev = overrides[oldId] ?? {};
  delete overrides[oldId];
  const { id, ...fields } = patch;
  overrides[id] = { ...prev, ...(overrides[id] ?? {}), ...fields };
}
for (const oldId of Object.keys(WORD_MERGES)) {
  delete overrides[oldId];
}

fs.writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
fs.writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 1) + "\n");
console.log(`words: ${before} → ${seed.words.length}; overrides ri-chiavati: ${Object.keys(WORD_SPLITS).length} → ${Object.values(WORD_SPLITS).flat().length}`);
