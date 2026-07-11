// Applica un'ondata di "seconde frasi d'esempio": legge un JSON
// { id: [{ testo, it, en }] }, accoda le frasi nuove a quelle già nel seed
// (dedupe per testo) e scrive il risultato sia in word-overrides.json
// (fonte di verità, sopravvive al sync) sia nel seed.
// Uso: node scripts/apply-frasi2.mjs <ondata.json>
import fs from "node:fs";

const wavePath = process.argv[2];
if (!wavePath) {
  console.error("uso: node scripts/apply-frasi2.mjs <ondata.json>");
  process.exit(1);
}
const wave = JSON.parse(fs.readFileSync(wavePath, "utf8"));
const overrides = JSON.parse(fs.readFileSync("scripts/data/word-overrides.json", "utf8"));
const seed = JSON.parse(fs.readFileSync("static/seed-n5n4.json", "utf8"));
const byId = new Map(seed.words.map((w) => [w.id, w]));

let applied = 0;
const problems = [];
for (const [id, nuove] of Object.entries(wave)) {
  const word = byId.get(id);
  if (!word) {
    problems.push(`id assente nel seed: ${id}`);
    continue;
  }
  const frasi = [...(word.frasi_esempio ?? [])];
  const seen = new Set(frasi.map((f) => f.testo));
  for (const n of nuove) {
    if (seen.has(n.testo)) continue;
    if (!n.testo || !n.it || !n.en) {
      problems.push(`frase incompleta per ${id}`);
      continue;
    }
    frasi.push({ testo: n.testo, traduzione: { it: n.it, en: n.en } });
    seen.add(n.testo);
    applied += 1;
  }
  // le regole del test valgono anche per le frasi legacy che finiscono
  // negli overrides insieme alla nuova: meglio scoprirlo qui che a vitest
  for (const f of frasi) {
    if (!/[。！？!?]$/.test(f.testo)) problems.push(`${id}: senza punteggiatura finale → ${f.testo}`);
    if (/[A-Za-z]/.test(f.testo)) problems.push(`${id}: caratteri latini → ${f.testo}`);
    if (f.testo.length > 34) problems.push(`${id}: troppo lunga (${f.testo.length}) → ${f.testo}`);
    if (/をを|がが|はは|にに|でで/.test(f.testo)) problems.push(`${id}: particella doppia → ${f.testo}`);
  }
  word.frasi_esempio = frasi;
  overrides[id] = { ...(overrides[id] ?? {}), frasi_esempio: frasi };
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
fs.writeFileSync("scripts/data/word-overrides.json", JSON.stringify(overrides, null, 1) + "\n");
fs.writeFileSync("static/seed-n5n4.json", JSON.stringify(seed));
const restano = seed.words.filter((w) => (w.frasi_esempio ?? []).length < 2).length;
console.log(`frasi aggiunte: ${applied} — parole con <2 frasi rimaste: ${restano}`);
