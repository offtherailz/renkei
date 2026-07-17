// Pre-digest per l'agente-insegnante: fa QUI il lavoro meccanico (lettura del
// seed, conteggi, raggruppamenti) e produce SHORTLIST compatte da giudicare —
// così l'agente NON legge il seed (~400k token) ma solo pochi KB. Il giudizio
// da madrelingua è l'unica parte irriducibile; tutto il resto è lavoro da script.
//
// Uso:
//   node scripts/teacher-digest.mjs stats
//   node scripts/teacher-digest.mjs relations [N5|N4]      # sin/con/cor per livello
//   node scripts/teacher-digest.mjs unlinked-pairs         # coppie 自/他 non collegate
//   node scripts/teacher-digest.mjs no-relations [N5|N4]   # parole senza alcuna relazione
//   node scripts/teacher-digest.mjs sample <n> [seed]      # n parole a caso, compatte
//
// Output su stdout (redirigi in un file di plans/ e passa QUELLO all'agente).
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, "static", "seed-n5n4.json"), "utf8"));
const words = seed.words;
const byId = new Map(words.map((w) => [w.id, w]));

const shortType = (t) => (t ?? "").replace(/\[[^\]]*\]/g, "");
const glossa = (w) => (w.significato?.it?.[0] ?? "").slice(0, 40);

function rel(ids) {
  return `[${(ids ?? []).join(",")}]`;
}

const cmd = process.argv[2] ?? "stats";
const arg = process.argv[3];

if (cmd === "stats") {
  const total = words.length;
  const withSin = words.filter((w) => (w.sinonimi ?? []).length).length;
  const withCon = words.filter((w) => (w.contrari ?? []).length).length;
  const withCor = words.filter((w) => (w.correlati ?? []).length).length;
  const withPair = words.filter((w) => w.id_verbo_corrispondente).length;
  const verbs = words.filter((w) => (w.tipo_jp ?? "").startsWith("動詞")).length;
  const byLevel = {};
  for (const w of words) byLevel[w.livello_jlpt] = (byLevel[w.livello_jlpt] ?? 0) + 1;
  console.log(`# Digest catalogo — ${total} parole`);
  console.log(`livelli: ${JSON.stringify(byLevel)}`);
  console.log(`con sinonimi: ${withSin} | con contrari: ${withCon} | con correlati: ${withCor}`);
  console.log(`verbi: ${verbs} | con coppia 自/他 collegata: ${withPair}`);
} else if (cmd === "relations") {
  const rows = words.filter(
    (w) =>
      (!arg || w.livello_jlpt === arg) &&
      ((w.sinonimi ?? []).length || (w.contrari ?? []).length || (w.correlati ?? []).length)
  );
  console.log(`# Relazioni da vagliare${arg ? ` (${arg})` : ""} — ${rows.length} parole`);
  console.log(`# formato: id (tipo) «glossa» sin=… con=… cor=…  → segnala correzioni`);
  for (const w of rows) {
    console.log(
      `${w.id} (${shortType(w.tipo_jp)}) «${glossa(w)}» sin=${rel(w.sinonimi)} con=${rel(w.contrari)} cor=${rel(w.correlati)}`
    );
  }
} else if (cmd === "no-relations") {
  const rows = words.filter(
    (w) =>
      (!arg || w.livello_jlpt === arg) &&
      !(w.sinonimi ?? []).length &&
      !(w.contrari ?? []).length &&
      !(w.correlati ?? []).length &&
      !(w.parafrasi ?? []).length &&
      !w.id_verbo_corrispondente &&
      // nome↔verbo-する sono già una relazione (id_verbo_suru/id_nome_origine)
      !w.id_verbo_suru &&
      !w.id_nome_origine
  );
  console.log(`# Parole SENZA alcuna relazione${arg ? ` (${arg})` : ""} — ${rows.length}`);
  console.log(`# candidate a ricevere sin/con/cor: proponi solo dove sensato`);
  for (const w of rows) console.log(`${w.id} (${shortType(w.tipo_jp)}) «${glossa(w)}»`);
} else if (cmd === "unlinked-pairs") {
  // euristica: verbi con partner probabile per transitività + radice simile, ma
  // senza id_verbo_corrispondente. Solo shortlist: la coppia la conferma l'umano.
  const verbs = words.filter((w) => (w.tipo_jp ?? "").startsWith("動詞"));
  const linked = new Set(verbs.filter((w) => w.id_verbo_corrispondente).map((w) => w.id));
  const rows = verbs.filter((w) => !w.id_verbo_corrispondente);
  console.log(`# Verbi senza coppia 自/他 collegata — ${rows.length} (di ${verbs.length})`);
  console.log(`# per ognuno: id (trans) «glossa» — proponi il partner SE esiste in catalogo`);
  for (const w of rows) {
    const tr = shortType(w.transitivita_jp) || "?";
    console.log(`${w.id} (${tr}) «${glossa(w)}»${linked.has(w.id) ? "" : ""}`);
  }
} else if (cmd === "sample") {
  const n = Number(arg ?? 30);
  let s = Number(process.argv[4] ?? 42) >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 0xffffffff);
  const shuffled = [...words].sort(() => rng() - 0.5).slice(0, n);
  console.log(`# Campione di ${shuffled.length} parole (compatte)`);
  for (const w of shuffled) {
    console.log(`${w.id} (${shortType(w.tipo_jp)}, ${w.livello_jlpt}) «${glossa(w)}»`);
  }
} else {
  console.error(`comando sconosciuto: ${cmd}`);
  process.exit(1);
}
