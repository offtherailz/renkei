// Valida il seed contro JMdict: segnala tipo/classe/transitività che non
// coincidono e le parole non trovate. Report su console e in
// scripts/validation-report.json.
//
// Uso: npm run validate:seed

import fs from "node:fs/promises";
import path from "node:path";
import {
  buildJmdictIndex,
  deriveJmdictMetadata,
  ensureJmdictData,
  lookupJmdict
} from "./lib/jmdict.mjs";

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "static", "seed-n5n4.json");
const REPORT_PATH = path.join(ROOT, "scripts", "validation-report.json");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache");

const FIELDS = ["tipo_jp", "classe_verbo_jp", "transitivita_jp", "tipo_aggettivo_jp"];

const FURIGANA_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;
const STRUCTURE_SPLIT_REGEX = /[\s/／・、,()（）「」『』【】〜~]+/;

function stripFurigana(text) {
  return text.replace(FURIGANA_REGEX, (_m, base) => base);
}

// Etichette di forme/categorie: la struttura è un nome (命令形, 敬語…) che per
// definizione non compare nell'esempio — non vanno giudicate.
const FORM_LABEL_REGEX = /^(意向形|可能形|禁止形|命令形|条件形|使役形|受身形|使役受身形|自動詞|他動詞|敬語|謙譲語|尊敬語|い形容詞|な形容詞)$/;

// Una voce grammaticale è coerente se almeno un pezzo giapponese della
// struttura compare nella frase d'esempio (stessa logica del quiz engine).
function grammarExampleMatchesStructure(grammar) {
  const structureTokens = stripFurigana(grammar.struttura ?? "")
    .split(STRUCTURE_SPLIT_REGEX)
    .map((t) => t.trim())
    .filter((t) => /[ぁ-んァ-ヶ一-龯]/.test(t));
  if (structureTokens.length === 0) {
    return true; // struttura non ispezionabile: non giudicabile
  }
  if (structureTokens.every((t) => FORM_LABEL_REGEX.test(t))) {
    return true;
  }
  return (grammar.frasi_esempio ?? []).some((ex) => {
    const sentence = stripFurigana(ex.testo ?? "");
    return structureTokens.some((token) => {
      if (sentence.includes(token)) return true;
      // Le frasi usano forme coniugate: accetta anche lo stem senza 1 o 2
      // caratteri finali (てしまう → てしま/てし matcha てしまいました;
      // ようにする → ようにし).
      const stem1 = token.length >= 3 ? token.slice(0, -1) : token;
      if (stem1.length >= 2 && sentence.includes(stem1)) return true;
      const stem2 = token.length >= 4 ? token.slice(0, -2) : "";
      return stem2.length >= 2 && sentence.includes(stem2);
    });
  });
}

async function main() {
  const seed = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
  const index = buildJmdictIndex(await ensureJmdictData(CACHE_DIR));

  const mismatches = [];
  const notFound = [];

  for (const word of seed.words) {
    // i verbi in -する generati dalla pipeline non sono entry autonome di JMdict
    if (word.id_nome_origine) continue;
    const entry = lookupJmdict(index, word.scrittura, word.lettura);
    if (!entry) {
      notFound.push({ id: word.id, scrittura: word.scrittura, lettura: word.lettura });
      continue;
    }
    const expected = deriveJmdictMetadata(entry);
    for (const field of FIELDS) {
      if (expected[field] && word[field] !== expected[field]) {
        mismatches.push({
          id: word.id,
          scrittura: word.scrittura,
          campo: field,
          seed: word[field] ?? null,
          jmdict: expected[field]
        });
      }
    }
  }

  const grammarSuspects = (seed.grammar ?? [])
    .filter((g) => !grammarExampleMatchesStructure(g))
    .map((g) => ({
      id: g.id,
      struttura: g.struttura,
      spiegazione: g.spiegazione?.en ?? g.spiegazione?.it ?? "",
      esempio: g.frasi_esempio?.[0]?.testo ?? ""
    }));

  const report = {
    generato_il: new Date().toISOString(),
    parole_totali: seed.words.length,
    non_trovate_in_jmdict: notFound.length,
    discrepanze: mismatches.length,
    grammatica_totale: (seed.grammar ?? []).length,
    grammatica_sospetta: grammarSuspects.length,
    dettaglio_discrepanze: mismatches,
    dettaglio_non_trovate: notFound,
    dettaglio_grammatica_sospetta: grammarSuspects
  };
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Parole: ${seed.words.length}`);
  console.log(`Non trovate in JMdict: ${notFound.length}`);
  console.log(`Discrepanze: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 20)) {
    console.log(`  ${m.scrittura} (${m.id}) ${m.campo}: seed=${m.seed} jmdict=${m.jmdict}`);
  }
  if (mismatches.length > 20) {
    console.log(`  ... e altre ${mismatches.length - 20} (vedi ${path.relative(ROOT, REPORT_PATH)})`);
  }
  console.log(`Grammatica: ${(seed.grammar ?? []).length} voci, sospette (esempio ≠ struttura): ${grammarSuspects.length}`);
  for (const g of grammarSuspects.slice(0, 15)) {
    console.log(`  ${g.id} ${g.struttura} — "${g.spiegazione}" — es: ${g.esempio}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
