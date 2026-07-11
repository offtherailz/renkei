// Come apply-frasi2 ma per la grammatica: accoda frasi a seed.grammar e le
// registra in grammar-examples-n5n4.json (additivo, riapplicato dal sync).
// Uso: node scripts/apply-gram2.mjs <ondata.json>   ({ id: [{testo,it,en}] })
import fs from "node:fs";

const wavePath = process.argv[2];
const wave = JSON.parse(fs.readFileSync(wavePath, "utf8"));
const curatedPath = "scripts/data/grammar-examples-n5n4.json";
const curated = JSON.parse(fs.readFileSync(curatedPath, "utf8"));
const seed = JSON.parse(fs.readFileSync("static/seed-n5n4.json", "utf8"));
const byId = new Map(seed.grammar.map((g) => [g.id, g]));

let applied = 0;
const problems = [];
for (const [id, nuove] of Object.entries(wave)) {
  const g = byId.get(id);
  if (!g) {
    problems.push(`id grammar assente: ${id}`);
    continue;
  }
  g.frasi_esempio = g.frasi_esempio ?? [];
  const seen = new Set(g.frasi_esempio.map((f) => f.testo));
  curated.examples[id] = curated.examples[id] ?? [];
  for (const n of nuove) {
    if (!n.testo || !n.it || !n.en) { problems.push(`${id}: frase incompleta`); continue; }
    if (!/[。！？]$/.test(n.testo)) problems.push(`${id}: punteggiatura finale → ${n.testo}`);
    if (/[A-Za-zＡ-Ｚａ-ｚа-яА-Я]/.test(n.testo)) problems.push(`${id}: caratteri non giapponesi → ${n.testo}`);
    if (n.testo.length > 40) problems.push(`${id}: troppo lunga (${n.testo.length})`);
    if (seen.has(n.testo)) continue;
    g.frasi_esempio.push({ testo: n.testo, traduzione: { it: n.it, en: n.en }, parole_linkate: [] });
    curated.examples[id].push({ jp: n.testo, it: n.it, en: n.en });
    seen.add(n.testo);
    applied += 1;
  }
}
if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
fs.writeFileSync(curatedPath, JSON.stringify(curated, null, 1) + "\n");
fs.writeFileSync("static/seed-n5n4.json", JSON.stringify(seed));
const restano = seed.grammar.filter((g) => (g.frasi_esempio ?? []).length < 2).length;
console.log(`frasi grammar aggiunte: ${applied} — voci con <2 rimaste: ${restano}`);
