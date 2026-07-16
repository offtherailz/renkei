// Riapplica al seed committato lo split delle voci combinate (word-splits.mjs),
// senza fetch di rete — stesso ruolo di fix-numbers-counters.mjs. Aggiorna anche
// le parole correlate dei kanji e ri-chiava gli overrides sull'id spezzato.
import fs from "node:fs";
import { WORD_SPLITS, applyWordSplits, fixKanjiRelatedWords } from "./lib/word-splits.mjs";

const SEED = "static/seed-n5n4.json";
const OVERRIDES = "scripts/data/word-overrides.json";

const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
const before = seed.words.length;
seed.words = applyWordSplits(seed.words);
fixKanjiRelatedWords(seed.kanji ?? []);

// Overrides: l'entry con l'id combinato non matcherebbe più nulla — la si
// sostituisce con le entry per-id (significato + frasi della carta spezzata),
// così restano la fonte curata durevole anche per i sync futuri.
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

fs.writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
fs.writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 1) + "\n");
console.log(`words: ${before} → ${seed.words.length}; overrides ri-chiavati: ${Object.keys(WORD_SPLITS).length} → ${Object.values(WORD_SPLITS).flat().length}`);
