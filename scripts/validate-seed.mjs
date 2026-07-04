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

async function main() {
  const seed = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
  const index = buildJmdictIndex(await ensureJmdictData(CACHE_DIR));

  const mismatches = [];
  const notFound = [];

  for (const word of seed.words) {
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

  const report = {
    generato_il: new Date().toISOString(),
    parole_totali: seed.words.length,
    non_trovate_in_jmdict: notFound.length,
    discrepanze: mismatches.length,
    dettaglio_discrepanze: mismatches,
    dettaglio_non_trovate: notFound
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
