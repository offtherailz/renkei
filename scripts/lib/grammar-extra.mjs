// Voci di grammatica curate a mano (scripts/data/grammar-extra-n5n4.json):
// coprono strutture che l'API jlpt-grammar-api non ha. A differenza di
// applyGrammarOverrides (che patcha solo voci esistenti), questa funzione ne
// può anche CREARE di nuove.
//
// source_name deve restare "Renkei — curato" (diverso da GRAMMAR_SOURCE.name)
// così normalizeGrammar, ad ogni sync successivo, la riconosce come "non
// dell'API" e la preserva invece di sovrascriverla (vedi il check
// `item.source_name === GRAMMAR_SOURCE.name` in normalizeGrammar).
export const CURATED_GRAMMAR_SOURCE_NAME = "Renkei — curato";

// Stesso categoria_jp usato dalle voci importate dall'API (vedi normalizeGrammar
// in scripts/sync-open-source-seed.mjs): tenerlo identico evita rendering
// diverso nella UI tra voci curate e voci importate.
const CATEGORIA_JP_DEFAULT = "文法[ぶんぽう]";

/**
 * Crea o aggiorna voci grammar a partire dal catalogo curato a mano.
 *
 * @param {Array<object>} grammar - array di voci grammar del seed (mutate in place e ritornate).
 * @param {Array<object>} curated - voci da scripts/data/grammar-extra-n5n4.json.
 * @param {object} deps
 * @param {(sentence: string, level: string, words: Array<object>) => string[]} deps.buildLinkedWords -
 *   riusa buildGrammarLinkedWords già presente in sync-open-source-seed.mjs (non riscritta qui).
 * @param {Array<object>} deps.words - catalogo parole del seed, passato a buildLinkedWords.
 * @returns {Array<object>} l'array grammar aggiornato.
 */
export function mergeCuratedGrammar(grammar, curated, { buildLinkedWords, words }) {
  const byId = new Map(grammar.map((g) => [g.id, g]));
  const now = Date.now();
  let added = 0;
  let updated = 0;

  for (const entry of curated) {
    const frasiEsempio = (entry.esempi ?? []).map((ex) => {
      const linkedWords = buildLinkedWords(ex.jp, entry.livello, words);
      return {
        testo: ex.jp,
        traduzione: { it: ex.it, en: ex.en ?? ex.it },
        parole_linkate: linkedWords
      };
    });
    const frasiEsempioLinkate = [...new Set(frasiEsempio.flatMap((f) => f.parole_linkate))];

    const existing = byId.get(entry.id);
    const record = {
      ...(existing ?? {}),
      id: entry.id,
      struttura: entry.struttura,
      spiegazione: { it: entry.spiegazione.it, en: entry.spiegazione.en },
      chapter_tags: entry.chapter_tags ?? existing?.chapter_tags ?? [],
      study_tags: entry.study_tags ?? existing?.study_tags ?? [],
      source_name: CURATED_GRAMMAR_SOURCE_NAME,
      source_license: undefined,
      source_url: undefined,
      livello_jlpt: entry.livello,
      categoria_jp: existing?.categoria_jp ?? CATEGORIA_JP_DEFAULT,
      frasi_esempio: frasiEsempio,
      frasi_esempio_parole_linkate: frasiEsempioLinkate,
      updated_at: now
    };
    delete record.source_license;
    delete record.source_url;

    if (existing) {
      Object.assign(existing, record);
      updated += 1;
    } else {
      grammar.push(record);
      byId.set(entry.id, record);
      added += 1;
    }
  }

  console.log(`Grammatica curata: ${added} aggiunte, ${updated} aggiornate.`);
  return grammar;
}
