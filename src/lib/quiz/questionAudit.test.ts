// Generatore di domande per l'AUDIT linguistico (non un test di regressione):
// campiona il catalogo con i generatori veri e scrive un file leggibile da dare
// in pasto all'insegnante madrelingua per scovare domande sbagliate (es. il
// cloze che oscurava il か dentro かれ). Si lancia a mano:
//
//   AUDIT=1 npx vitest run src/lib/quiz/questionAudit.test.ts
//
// Output: plans/question-audit-sample.md (sovrascritto a ogni run).
import { describe, it } from "vitest";
import fs from "node:fs";
import {
  createMultipleChoiceQuestion,
  createFlashcardRecognitionQuestion,
  createFlashcardReadingRecognitionQuestion,
  createConjugationQuizQuestion,
  createVerbFormClozeQuestion,
  createUsageClozeQuestion,
  createParticleClozeQuestion,
  createTransitivityPairQuestion,
  createGrammarQuestion,
  createCompositionQuestion,
  shuffle
} from "./engine";
import { DEFAULT_KNOWN_FORMS } from "../core/conjugation";
import type { DistractorIndex, QuizContext, QuizQuestion } from "./types";
import type { Grammar, Word } from "../types/models";
import { pickLocalizedArray } from "../core/i18n";

const PER_MODE = 40;

function renderQuestion(q: QuizQuestion): string {
  const lines: string[] = [`- **${q.mode}**`];
  const anyQ = q as unknown as Record<string, unknown>;
  for (const field of ["prompt", "sentenceWithBlank", "fullSentence", "formLabel", "reading", "targetText", "plainSentence"]) {
    if (typeof anyQ[field] === "string" && anyQ[field]) lines.push(`  - ${field}: ${anyQ[field]}`);
  }
  if (Array.isArray(anyQ.choices)) lines.push(`  - scelte: ${(anyQ.choices as string[]).join(" ・ ")}`);
  if (Array.isArray(anyQ.tokens)) lines.push(`  - banco: ${(anyQ.tokens as string[]).join(" ・ ")}`);
  const correct = (anyQ.correctChoice ?? anyQ.correctAnswer ?? (Array.isArray(anyQ.correctOrder) ? (anyQ.correctOrder as string[]).join("") : "")) as string;
  if (correct) lines.push(`  - ✅ corretta: ${correct}`);
  return lines.join("\n");
}

describe("audit domande (solo con AUDIT=1)", () => {
  const run = process.env.AUDIT ? it : it.skip;

  run("genera il campione per l'insegnante", async () => {
    const seed = JSON.parse(fs.readFileSync("static/seed-n5n4.json", "utf8"));
    const words: Word[] = seed.words;
    const grammar: Grammar[] = seed.grammar ?? [];
    const context: QuizContext = {
      locale: "it",
      wordsById: new Map(words.map((w) => [w.id, w])),
      grammarById: new Map(grammar.map((g) => [g.id, g]))
    };
    const index: DistractorIndex = { N5: [], N4: [], N3: [], N2: [], N1: [], EXTRA: [] };
    for (const w of words) {
      index[w.livello_jlpt].push({ id: w.id, meaning: pickLocalizedArray(w.significato, "it")[0] ?? "", scrittura: w.scrittura });
    }

    const sections: string[] = [
      "# Campione di domande generate (per audit linguistico)",
      "",
      `Generato con AUDIT=1 da questionAudit.test.ts — ${PER_MODE} domande per modalità, parole/grammatica pescate a caso dal seed.`,
      ""
    ];
    const push = (title: string, qs: (QuizQuestion | null)[]) => {
      const ok = qs.filter((q): q is QuizQuestion => q !== null);
      sections.push(`## ${title} (${ok.length})`, "", ...ok.map(renderQuestion), "");
    };

    const someWords = () => shuffle([...words]);
    const verbsAdj = shuffle(words.filter((w) => w.tipo_jp.startsWith("動詞") || w.tipo_jp.startsWith("形容詞")));
    const withSentences = shuffle(words.filter((w) => w.frasi_esempio?.length));
    const pairs = shuffle(words.filter((w) => w.id_verbo_corrispondente && w.frasi_esempio?.length));
    const allowed = new Set(DEFAULT_KNOWN_FORMS);

    push("multiple-choice (significato)", someWords().slice(0, PER_MODE).map((w) => createMultipleChoiceQuestion(w, context, index)));
    push("flashcard-recognition (IT→JP)", someWords().slice(0, PER_MODE).map((w) => createFlashcardRecognitionQuestion(w, "it", index, context)));
    push("reading-recognition (lettura→scrittura)", someWords().filter((w) => w.kanji_usati.length).slice(0, PER_MODE).map((w) => createFlashcardReadingRecognitionQuestion(w, "it", index, context)));
    push("conjugation", verbsAdj.slice(0, PER_MODE).map((w) => createConjugationQuizQuestion(w, allowed)));
    push("verb-form-cloze (forma nel contesto)", verbsAdj.filter((w) => w.frasi_esempio?.length).slice(0, PER_MODE).map((w) => createVerbFormClozeQuestion(w, "it")));
    push("usage-cloze (parola nel contesto)", withSentences.slice(0, PER_MODE).map((w) => createUsageClozeQuestion(w, "it", context)));
    push("particle-cloze", await Promise.all(withSentences.slice(0, PER_MODE).map((w) => createParticleClozeQuestion(w, "it"))));
    push("transitivity-pair", pairs.slice(0, PER_MODE).map((w) => createTransitivityPairQuestion(w, context, "it")));
    push("composition", someWords().slice(0, PER_MODE).map((w) => createCompositionQuestion(w, "it", context)));

    const grammarQs: QuizQuestion[] = [];
    for (const g of shuffle([...grammar]).slice(0, PER_MODE)) {
      const ex = g.frasi_esempio?.[0];
      if (!ex) continue;
      grammarQs.push(await createGrammarQuestion({ grammar: g, example: ex }, index, g.livello_jlpt, context, "it"));
    }
    push("grammatica (cloze/reading/ordering)", grammarQs);

    fs.writeFileSync("plans/question-audit-sample.md", sections.join("\n") + "\n");
  }, 120_000);
});
