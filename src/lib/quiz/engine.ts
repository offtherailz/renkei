import { pickLocalizedArray, pickLocalizedText } from "../core/i18n";
import { createDefaultTokenizer } from "../core/tokenizer";
import { renderFuriganaToHtml, FIRST_KANJI_REGEX } from "../core/furigana";
import { stripFuriganaNotation } from "../core/furigana";
import { isFormEnumeration } from "../core/sentenceFilters";
import { BLANKABLE_PARTICLES, blankParticleAt, CONFUSABLE_PARTICLES, findParticles } from "../core/particles";
import { buildConjugationQuestions, buildVerbTable, buildAdjectiveTable, detectVerbClass, detectAdjectiveType } from "../core/conjugation";
import { findConjugatedForm, USAGE_BLANK, blankSentence, pickOccurrenceIndex } from "../core/usage";
import { naiveReading, parseIrregularReadings, readCounterN, voicingVariants } from "../core/counterReadings";
import { GENERATED_COUNTERS, generateReading, type GeneratedReading } from "../core/counterGen";
import { isTimeTriggerWord, TIME_READINGS } from "../core/timeReadings";
import { KEIGO_SUPPLETIVE_WORDS } from "../core/keigo";
import type { Grammar, Counter, JLPTLevel, LocaleCode, Word } from "../types/models";
import { buildDistractors } from "./distractorIndex";
import type {
  ClozeQuestion,
  ClozeSource,
  CompositionQuestion,
  ConjugationQuizQuestion,
  SpokenProductionQuestion,
  VerbFormClozeQuestion,
  UsageClozeQuestion,
  CounterQuestion,
  CounterReadingQuestion,
  DistractorIndex,
  FlashcardQuestion,
  ListeningQuestion,
  ListeningMeaningQuestion,
  WordReadingQuestion,
  MultipleChoiceQuestion,
  ParticleClozeQuestion,
  QuizContext,
  ReadingChoiceQuestion,
  SentenceOrderingQuestion,
  TimeReadingQuestion,
  TransitivityPairQuestion,
  XpBreakdown,
  XpInput
} from "./types";

import GRAMMAR_GROUPS from "../data/grammar-gruppi.json";

const FURIGANA_SEGMENT_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;
const NON_ORDERING_GRAMMAR_MARKER_REGEX =
  /(意向形|辞書形|ます形|て形|ない形|た形|命令形|禁止形|可能形|受身形|受け身形|使役|条件形|仮定形|連用形|終止形|未然形|活用|語幹|原形|丁寧形)/;
const SENTENCE_CONTEXT_HINT_REGEX = /[はがをにでとへもやの]|。|、|！|？/;
const GRAMMAR_STRUCTURE_SPLIT_REGEX = /[\s/／・、,()（）「」『』【】〜~]+/;
// Etichette grammaticali in struttura (可能形, 謙譲語, 自動詞): non sono forme da mettere in una frase.
const GRAMMAR_LABEL_REGEX = /(形|語|詞)$|^(依頼|小さい|少ない|短い|下|いる)$/;
// Forme quasi equivalenti: messe insieme nelle opzioni darebbero due risposte giuste.
const SAME_MEANING_FORMS = [
  ["から", "ので"],
  ["けど", "けれども", "でも", "しかし", "が"],
  ["でしょう", "だろう"],
  ["ようだ", "みたいだ", "よう", "みたい"],
  ["なければいけない", "なくてはいけない", "なくてはならない", "なくちゃ"],
  ["てはいけない", "ちゃいけない", "じゃいけない"],
  ["すぎる", "ぎる"],
  ["たら", "ば", "と", "なら"],
  ["一番", "いちばん"],
  ["ほうがいい", "たほうがいい"]
];

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickFirstMeaning(word: Word, locale: "it" | "en"): string {
  return pickLocalizedArray(word.significato, locale)[0] ?? "";
}

export function createFlashcardProductionQuestion(word: Word, locale: "it" | "en"): FlashcardQuestion {
  const meanings = pickLocalizedArray(word.significato, locale);
  return {
    mode: "flashcard-production",
    wordId: word.id,
    prompt: word.scrittura,
    promptLanguage: "ja",
    correctAnswer: `${meanings.join(" / ")} | ${word.lettura}`,
    warningMultipleDefinitions: meanings.length > 1
  };
}

// 🧩 Usare: la parola oscurata nella sua frase d'esempio, distrattori dello
// stesso tipo grammaticale — le "prove d'uso" della scheda, nel quiz vero.
export function createUsageClozeQuestion(
  word: Word,
  locale: LocaleCode,
  context: QuizContext
): UsageClozeQuestion | null {
  const examples = word.frasi_esempio ?? [];
  for (const example of shuffle([...examples])) {
    const sentence = stripFuriganaNotation(example.testo);
    const blanked = blankSentence(sentence, word.scrittura);
    if (!blanked) continue;
    const pool = [...context.wordsById.values()].filter(
      (x) => x.id !== word.id && x.tipo_jp === word.tipo_jp && x.scrittura !== word.scrittura
    );
    const distractors = [...new Set(shuffle(pool).map((x) => x.scrittura))].slice(0, 3);
    if (distractors.length < 2) continue;
    return {
      mode: "usage-cloze",
      wordId: word.id,
      sentenceWithBlank: blanked,
      fullSentence: sentence,
      translation: pickLocalizedText(example.traduzione, locale),
      choices: shuffle([word.scrittura, ...distractors]),
      correctChoice: word.scrittura
    };
  }
  return null;
}

// 🧩 Usare: cloze sulla FORMA del verbo/aggettivo nella sua frase reale — le
// opzioni sono forme diverse della stessa parola: scegli quella giusta per il
// contesto (て per la richiesta, た per il racconto…). Complementa il cloze
// sulle particelle: anche la coniugazione va saputa USARE, non solo produrre.
export function createVerbFormClozeQuestion(
  word: Word,
  locale: LocaleCode
): VerbFormClozeQuestion | null {
  const verbClass = detectVerbClass(word);
  const adjType = detectAdjectiveType(word);
  const forms = verbClass
    ? buildVerbTable(word.scrittura, verbClass)
    : adjType
      ? buildAdjectiveTable(word.scrittura, adjType)
      : null;
  if (!forms) return null;
  const examples = word.frasi_esempio ?? [];
  for (const example of shuffle([...examples])) {
    const sentence = stripFuriganaNotation(example.testo);
    const hit = findConjugatedForm(sentence, forms.filter((f) => f.key !== "dict"));
    if (!hit) continue;
    const distractors = shuffle(forms.filter((f) => f.key !== hit.key))
      .map((f) => f.value)
      .filter((v) => v !== hit.value && !sentence.includes(v))
      .slice(0, 3);
    if (distractors.length < 2) continue;
    return {
      mode: "verb-form-cloze",
      wordId: word.id,
      sentenceWithBlank: sentence.replace(hit.value, USAGE_BLANK),
      fullSentence: sentence,
      translation: pickLocalizedText(example.traduzione, locale),
      formKey: hit.key,
      choices: shuffle([hit.value, ...distractors]),
      correctChoice: hit.value
    };
  }
  return null;
}

// 🎤 Dire: dal significato pronunci la parola al microfono. Punteggio pieno
// come le altre modalità "proprie" della parola (produzione orale).
export function createSpokenProductionQuestion(word: Word, locale: "it" | "en"): SpokenProductionQuestion {
  const meanings = pickLocalizedArray(word.significato, locale);
  return {
    mode: "spoken-production",
    wordId: word.id,
    prompt: meanings.join(" / "),
    promptLanguage: locale,
    expectedReading: word.lettura,
    expectedWriting: word.scrittura,
    warningMultipleDefinitions: meanings.length > 1
  };
}

// ✍️ Scrivere: componi la parola carattere per carattere. Banco = caratteri
// della parola + intrusi pescati da altre parole del catalogo (stesso
// "alfabeto": kanji se la parola ha kanji, kana altrimenti), mai già presenti
// nella parola. Con kanji si mostra la lettura come aiuto (produci la FORMA,
// non la pronuncia); full-kana niente aiuto (sarebbe la soluzione).
export function createCompositionQuestion(
  word: Word,
  locale: "it" | "en",
  context: QuizContext
): CompositionQuestion | null {
  const chars = [...word.scrittura];
  if (chars.length < 2 || chars.length > 8) return null;
  const hasKanji = word.scrittura !== word.lettura;
  const inWord = new Set(chars);
  const isKanjiChar = (c: string) => /[一-龯々]/u.test(c);
  const wanted = hasKanji ? isKanjiChar : (c: string) => /[ぁ-んァ-ンー]/u.test(c) && !isKanjiChar(c);
  const pool: string[] = [];
  for (const other of context.wordsById.values()) {
    if (other.id === word.id) continue;
    for (const c of other.scrittura) {
      if (!inWord.has(c) && wanted(c)) pool.push(c);
    }
    if (pool.length > 200) break;
  }
  const intruders = shuffle([...new Set(pool)]).slice(0, Math.min(3, Math.max(2, chars.length - 1)));
  if (intruders.length < 2) return null;
  const meanings = pickLocalizedArray(word.significato, locale);
  return {
    mode: "composition",
    wordId: word.id,
    prompt: meanings.join(" / "),
    promptLanguage: locale,
    reading: hasKanji ? word.lettura : undefined,
    tokens: shuffle([...chars, ...intruders]),
    correctAnswer: word.scrittura
  };
}

export function createFlashcardRecognitionQuestion(
  word: Word,
  locale: "it" | "en",
  distractorIndex: DistractorIndex,
  context: QuizContext
): FlashcardQuestion {
  const correct = word.scrittura;
  const preferSuru = correct.endsWith("する");
  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 6, { preferSuru })
    .map((d) => d.id)
    .map((id) => context.wordsById.get(id)?.scrittura)
    .filter((v): v is string => Boolean(v))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct)
    .slice(0, 3);

  return {
    mode: "flashcard-recognition",
    wordId: word.id,
    prompt: pickFirstMeaning(word, locale),
    promptLanguage: locale,
    choices: shuffle([correct, ...distractors]).slice(0, 4),
    correctAnswer: correct,
    warningMultipleDefinitions: pickLocalizedArray(word.significato, locale).length > 1
  };
}

// Errore di okurigana classico: 送る scritto 送くる (kanji + un kana di troppo).
export function okuriganaErrorVariant(word: Word): string | null {
  const match = word.scrittura.match(/^(.*[一-龯々])([ぁ-ん]+)$/);
  if (!match) return null;
  const [, kanjiPart, okurigana] = match;
  if (word.lettura.length <= okurigana!.length) return null;
  const wrong = `${kanjiPart}${word.lettura.slice(-(okurigana!.length + 1))}`;
  return wrong !== word.scrittura ? wrong : null;
}

export function createFlashcardReadingRecognitionQuestion(
  word: Word,
  locale: "it" | "en",
  distractorIndex: DistractorIndex,
  context: QuizContext
): FlashcardQuestion {
  const correct = word.scrittura;
  // ATTENZIONE: per "quale scrittura si legge X?" un OMOFONO è una risposta
  // GIUSTA, non un distrattore (春 e 貼る si leggono entrambi はる — bug reale).
  // Si escludono quindi tutte le parole con la stessa lettura; resta l'errore
  // di okurigana (stessa parola scritta male), che è un distrattore legittimo.
  const sameReading = new Set(
    [...context.wordsById.values()].filter((w) => w.lettura === word.lettura).map((w) => w.scrittura)
  );
  const okuriganaError = okuriganaErrorVariant(word);
  const targetHasKanji = word.scrittura !== word.lettura;
  const random = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 12, {
    preferSuru: word.scrittura.endsWith("する")
  })
    .map((d) => context.wordsById.get(d.id))
    .filter((w): w is Word => Boolean(w))
    .filter((w) => !sameReading.has(w.scrittura))
    // stessa "forma" del bersaglio (kanji con kanji) e lunghezza simile: una
    // scrittura in soli kana o lunga il doppio si scarta a colpo d'occhio
    .filter((w) => (w.scrittura !== w.lettura) === targetHasKanji)
    .sort((a, b) => Math.abs(a.scrittura.length - correct.length) - Math.abs(b.scrittura.length - correct.length))
    .map((w) => w.scrittura);

  const distractors = [...(okuriganaError ? [okuriganaError] : []), ...random]
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct && !sameReading.has(value))
    .slice(0, 3);

  return {
    mode: "flashcard-reading-recognition",
    wordId: word.id,
    prompt: word.lettura,
    promptLanguage: "ja",
    choices: shuffle([correct, ...distractors]).slice(0, 4),
    correctAnswer: correct,
    warningMultipleDefinitions: pickLocalizedArray(word.significato, locale).length > 1
  };
}

export function createListeningQuestion(
  word: Word,
  distractorIndex: DistractorIndex,
  context: QuizContext
): ListeningQuestion {
  const correct = word.scrittura;
  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 6, {
    preferSuru: correct.endsWith("する")
  })
    .map((d) => context.wordsById.get(d.id)?.scrittura)
    .filter((v): v is string => Boolean(v))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct)
    .slice(0, 3);

  return {
    mode: "listening",
    wordId: word.id,
    readingToSpeak: word.lettura,
    choices: shuffle([correct, ...distractors]).slice(0, 4),
    correctChoice: correct
  };
}

// 📖 Kanji → lettura: vedi la parola in kanji, scegli la pronuncia. Distrattori
// = letture di altre parole (stesso livello quando possibile), MAI omofoni del
// bersaglio (sarebbero giusti). null se non ha kanji o mancano distrattori.
export function createWordReadingQuestion(
  word: Word,
  context: QuizContext
): WordReadingQuestion | null {
  if (word.scrittura === word.lettura) return null; // full-kana: niente da leggere
  const correct = word.lettura;
  const pool = shuffle([...context.wordsById.values()].filter((w) => w.id !== word.id));
  const sameLevel = pool.filter((w) => w.livello_jlpt === word.livello_jlpt);
  const distractors = [
    ...new Set(
      [...sameLevel, ...pool]
        .map((w) => w.lettura)
        .filter((r) => r && r !== correct)
    )
  ]
    // vicine per lunghezza: più confondibili, meno scartabili a colpo d'occhio
    .sort((a, b) => Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length))
    .slice(0, 3);
  if (distractors.length < 2) return null;
  return {
    mode: "word-reading",
    wordId: word.id,
    prompt: word.scrittura,
    choices: shuffle([correct, ...distractors]).slice(0, 4),
    correctChoice: correct
  };
}

// 👂→💡 Ascolto → significato: senti la parola, scegli la traduzione IT.
// Distrattori = primi significati di altre parole (stesso livello quando
// possibile), diversi dal giusto. null se non si riesce a comporre abbastanza
// opzioni (troppo poche parole con glossa).
export function createListeningMeaningQuestion(
  word: Word,
  locale: "it" | "en",
  context: QuizContext
): ListeningMeaningQuestion | null {
  const correct = pickLocalizedArray(word.significato, locale)[0] ?? "";
  if (!correct) return null;
  const pool = shuffle([...context.wordsById.values()].filter((w) => w.id !== word.id));
  const sameLevel = pool.filter((w) => w.livello_jlpt === word.livello_jlpt);
  const distractors = [
    ...new Set(
      [...sameLevel, ...pool]
        .map((w) => pickLocalizedArray(w.significato, locale)[0] ?? "")
        .filter((m) => m && m !== correct)
    )
  ].slice(0, 3);
  if (distractors.length < 2) return null;
  return {
    mode: "listening-meaning",
    wordId: word.id,
    readingToSpeak: word.lettura,
    choices: shuffle([correct, ...distractors]).slice(0, 4),
    correctChoice: correct
  };
}

export function createMultipleChoiceQuestion(
  word: Word,
  context: QuizContext,
  distractorIndex: DistractorIndex
): MultipleChoiceQuestion {
  const locale = context.locale;
  const correct = pickFirstMeaning(word, locale);

  // «fare: contatto» tra tre glosse "normali" si riconosce dal formato, non
  // dal significato (e viceversa: un suru-verbo nella domanda ha spesso l'unica
  // opzione «fare:…»). Se la glossa giusta è un «fare:…», anche i distrattori
  // devono esserlo — e se non lo è, niente «fare:…» tra i distrattori.
  const isFare = (v: string) => /^fare\s*:/.test(v);
  const correctIsFare = isFare(correct);
  const pool = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 14, {
    preferSuru: correctIsFare
  })
    .map((d) => context.wordsById.get(d.id))
    .filter((w): w is Word => Boolean(w))
    .map((w) => pickFirstMeaning(w, locale))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct && value.length > 0);
  const sameShape = pool.filter((v) => isFare(v) === correctIsFare);
  const distractors = (sameShape.length >= 3 ? sameShape : pool).slice(0, 3);

  return {
    mode: "multiple-choice",
    wordId: word.id,
    prompt: word.scrittura,
    correctChoice: correct,
    choices: shuffle([correct, ...distractors]).slice(0, 4)
  };
}

export async function createSentenceOrderingQuestion(source: ClozeSource, locale: "it" | "en"): Promise<SentenceOrderingQuestion> {
  const tokenizer = await createDefaultTokenizer();
  const plainTokens = tokenizer.tokenize(stripFuriganaNotation(source.example.testo));
  return {
    mode: "sentence-ordering",
    grammarId: source.grammar.id,
    // la traduzione rende unica la frase da comporre (la spiegazione del punto no)
    prompt: pickLocalizedText(source.example.traduzione, locale) || pickLocalizedText(source.grammar.spiegazione, locale),
    tokens: shuffle(plainTokens),
    correctOrder: plainTokens,
    translation: pickLocalizedText(source.example.traduzione, locale)
  };
}

async function canCreateSentenceOrderingQuestion(source: ClozeSource): Promise<boolean> {
  const plainSentence = stripFuriganaNotation(source.example.testo);
  const grammarStructure = source.grammar.struttura;

  // Skip ordering prompts for conjugation/form labels where there is no meaningful token order.
  if (NON_ORDERING_GRAMMAR_MARKER_REGEX.test(plainSentence) || NON_ORDERING_GRAMMAR_MARKER_REGEX.test(grammarStructure)) {
    return false;
  }

  // Elenchi di forme (飲むな、食べるな…): niente ordine da ricostruire.
  if (isFormEnumeration(plainSentence)) {
    return false;
  }

  // Frasi lunghe: comporle richiede troppo tempo → si preferisce il cloze.
  if (plainSentence.length > 22) {
    return false;
  }

  const tokenizer = await createDefaultTokenizer();
  const tokens = tokenizer.tokenize(plainSentence).filter((token) => token.trim().length > 0);
  const jpTokens = tokens.filter((token) => /[ぁ-んァ-ヶ一-龯]/.test(token));

  if (jpTokens.length < 3 || tokens.length > 8) {
    return false;
  }

  if (!SENTENCE_CONTEXT_HINT_REGEX.test(plainSentence) && jpTokens.length < 4) {
    return false;
  }

  return true;
}

function pickClozeTarget(tokens: string[]): string {
  const filtered = tokens.filter((t) => /[ぁ-んァ-ヶ一-龯]/.test(t));
  if (filtered.length === 0) {
    return tokens[Math.floor(Math.random() * tokens.length)] ?? "";
  }
  return filtered[Math.floor(Math.random() * filtered.length)] ?? filtered[0];
}

function pickGrammarStructureTarget(source: ClozeSource, plainSentence: string): string | null {
  const structurePlain = stripFuriganaNotation(source.grammar.struttura ?? "").trim();

  if (!structurePlain) {
    return null;
  }

  const candidates = structurePlain
    .split(GRAMMAR_STRUCTURE_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter((part) => /[ぁ-んァ-ヶ一-龯]/.test(part) && !GRAMMAR_LABEL_REGEX.test(part))
    // Un kana solo è la forma testata solo se è TUTTA la struttura (か): di
    // 〜(に)する oscurerebbe un に qualunque.
    .filter((part) => part.length >= 2 || part === structurePlain.replace(/[〜~]/g, ""))
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    if (candidate.length < plainSentence.length && plainSentence.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function blankClozeTarget(sourceText: string, target: string): string {
  let notationReplaced = false;

  const withBlankedNotation = sourceText.replace(FURIGANA_SEGMENT_REGEX, (match, base) => {
    if (!notationReplaced && base === target) {
      notationReplaced = true;
      return "___";
    }
    return match;
  });

  if (notationReplaced) {
    return withBlankedNotation;
  }

  // Non la prima occorrenza cieca: il cloze su 〜か oscurava il か di かれ.
  const at = pickOccurrenceIndex(sourceText, target);
  if (at === -1) return sourceText.replace(target, "___");
  return `${sourceText.slice(0, at)}___${sourceText.slice(at + target.length)}`;
}

// Il match greedy della notazione furigana può inglobare i kana che
// precedono la parola (ドア[どあ]が開いて[あいて]いる。 → base "が開いて"),
// esattamente come in renderFuriganaToHtml: qui va tolto anche dal match
// completo, altrimenti la domanda evidenzia/testa がinsieme alla parola,
// mostrando un box che parte dalla particella invece che dal kanji.
function trimLeadingKana(segment: { match: string; base: string; reading: string }): {
  match: string;
  base: string;
  reading: string;
} {
  const kanjiIndex = segment.base.search(FIRST_KANJI_REGEX);
  if (kanjiIndex <= 0) return segment;
  return {
    match: segment.match.slice(kanjiIndex),
    base: segment.base.slice(kanjiIndex),
    reading: segment.reading
  };
}

export function pickReadingTarget(sourceText: string): { base: string; reading: string; match: string } | null {
  const candidates = [...sourceText.matchAll(FURIGANA_SEGMENT_REGEX)]
    .map((match) => trimLeadingKana({ match: match[0], base: match[1] ?? "", reading: match[2] ?? "" }))
    .filter((segment) => /[一-龯々]/u.test(segment.base));

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function buildReadingSentenceHtml(sourceText: string, targetMatch: string): string {
  const token = "__READING_TARGET__";
  const markedSource = sourceText.replace(targetMatch, token);
  const targetPlain = stripFuriganaNotation(targetMatch);
  return renderFuriganaToHtml(markedSource).replace(token, `<span class="reading-target">${targetPlain}</span>`);
}

function buildReadingDistractors(context: QuizContext, jlptLevel: JLPTLevel, excludedReading: string): string[] {
  const readings = [...context.wordsById.values()]
    .filter((word) => word.livello_jlpt === jlptLevel)
    .map((word) => word.lettura)
    .filter((reading) => reading !== excludedReading)
    .filter((reading, index, values) => values.indexOf(reading) === index);
  // Preferiamo distrattori con lo stesso numero di more della risposta
  // giusta: letture di lunghezza qualunque (un composto lungo tra letture
  // di 2 more) rendevano la risposta ovvia a colpo d'occhio, senza bisogno
  // di leggere niente.
  const sameLength = readings.filter((r) => r.length === excludedReading.length);
  const pool = sameLength.length >= 3 ? sameLength : readings;
  return shuffle(pool).slice(0, 3);
}

// Cloze SULLA forma del punto grammaticale, mai su una parola a caso: senza la
// forma nella frase (coniugata, per esempio) null, e il chiamante passa ad altro.
export async function createClozeQuestion(
  source: ClozeSource,
  distractorIndex: DistractorIndex,
  jlptLevel: JLPTLevel,
  context: QuizContext
): Promise<ClozeQuestion | null> {
  const plainSentence = stripFuriganaNotation(source.example.testo);
  const target = pickGrammarStructureTarget(source, plainSentence);
  if (!target) return null;
  // Particelle: al quiz bastano e avanzano quelle curate (の/で/に si
  // sovrappongono troppo per generarle senza controllo).
  const groups = GRAMMAR_GROUPS as Record<string, string>;
  const group = groups[source.grammar.id];
  if (target.length === 1 && group === "particelle") return null;

  // Distrattori: pezzi di altre strutture, prima dello stesso gruppo funzionale
  // (si confondono davvero), simili per lunghezza. Mai forme equivalenti al
  // bersaglio, né altre che lo contengono o ne sono contenute.
  const sameMeaning = new Set(SAME_MEANING_FORMS.filter((set) => set.includes(target)).flat());
  const chunksOf = (g: Grammar): string[] =>
    stripFuriganaNotation(g.struttura ?? "")
      .split(GRAMMAR_STRUCTURE_SPLIT_REGEX)
      .map((part) => part.trim())
      .filter((part) => /[ぁ-んァ-ヶ一-龯]/.test(part) && !GRAMMAR_LABEL_REGEX.test(part))
      .filter((part) => part.length >= 2)
      .filter((part) => !sameMeaning.has(part) && !part.includes(target) && !target.includes(part))
      .filter((part) => Math.abs(part.length - target.length) <= 2);
  const others = [...context.grammarById.values()].filter((g) => g.id !== source.grammar.id);
  const fromGroup = shuffle([...new Set(others.filter((g) => groups[g.id] === group).flatMap(chunksOf))]);
  const fromAll = shuffle([...new Set(others.flatMap(chunksOf))]);
  const fromGrammar = [...new Set([...fromGroup, ...fromAll])].slice(0, 3);
  // Lo stampo vuole 4 opzioni: fallback alle parole solo se le forme non bastano.
  const fromWords = buildDistractors(jlptLevel, distractorIndex, "", 3)
    .map((d) => context.wordsById.get(d.id)?.scrittura)
    .filter((v): v is string => Boolean(v));
  const distractorChoices = [...new Set([...fromGrammar, ...fromWords])].filter((v) => v !== target).slice(0, 3);
  if (distractorChoices.length === 0) return null;

  return {
    mode: "cloze",
    grammarId: source.grammar.id,
    sentenceWithBlank: renderFuriganaToHtml(blankClozeTarget(source.example.testo, target)),
    choices: shuffle([target, ...distractorChoices]),
    correctChoice: target,
    fullSentence: plainSentence,
    translation: pickLocalizedText(source.example.traduzione, context.locale)
  };
}

// ── Quiz particelle: cloze sulla frase d'esempio con distrattori confondibili ──
// Radici kanji di verbi di direzione/movimento: con questi verbi に e へ sono
// entrambi corretti (へ indica la direzione generale, に il punto preciso,
// ma sono intercambiabili nell'uso comune insegnato a N5/N4).
const MOTION_VERB_STEMS = ["行", "来", "帰", "戻", "向か", "出発", "到着", "進", "通", "出かけ", "渡"];

function hasMotionVerb(sentence: string): boolean {
  return MOTION_VERB_STEMS.some((stem) => sentence.includes(stem));
}

// Verbi di attraversamento/percorso: を e で sono spesso ENTRAMBI grammaticali
// (公園を散歩する／公園で散歩する) — mai proporli l'uno come distrattore
// dell'altro in quel contesto (audit dell'insegnante).
// 外出/出かける/中を: «雨の中を外出する» vs «雨の中で» — audit 2 (18/07)
const PATH_VERB_STEMS = ['散歩', '歩', '走', '通', '渡', '飛', '曲が', '泳', '外出', '出かけ', '中を', '中で'];
function hasPathVerb(sentence: string): boolean {
  return PATH_VERB_STEMS.some((stem) => sentence.includes(stem));
}

export async function createParticleClozeQuestion(
  word: Word,
  locale: LocaleCode
): Promise<ParticleClozeQuestion | null> {
  const example = (word.frasi_esempio ?? [])[0];
  if (!example) return null;

  const sentence = stripFuriganaNotation(example.testo);

  // Linker な/の: per aggettivi-na e nomi, l'esercizio "ci va な, の o niente?"
  // ha priorità quando la frase contiene proprio quel collegamento.
  const linker = word.tipo_aggettivo_jp?.startsWith("な形容詞")
    ? "な"
    : word.tipo_jp.startsWith("名詞")
      ? "の"
      : null;
  if (linker && Math.random() < 0.5) {
    const target = `${word.scrittura}${linker}`;
    const index = sentence.indexOf(target);
    const after = sentence[index + target.length] ?? "";
    if (index >= 0 && /[一-龯ぁ-んァ-ヶ]/.test(after)) {
      const blankIndex = index + word.scrittura.length;
      return {
        mode: "particle-cloze",
        wordId: word.id,
        sentenceWithBlank: `${sentence.slice(0, blankIndex)}＿＿${sentence.slice(blankIndex + linker.length)}`,
        fullSentence: sentence,
        translation: pickLocalizedText(example.traduzione, locale),
        choices: shuffle(linker === "な" ? ["な", "の", "い", "に"] : ["の", "な", "が", "に"]),
        correctChoice: linker
      };
    }
  }

  const tokenizer = await createDefaultTokenizer();
  const hits = findParticles(tokenizer.tokenize(sentence), sentence).filter((h) =>
    BLANKABLE_PARTICLES.has(h.particle)
  );
  if (hits.length === 0) return null;

  const hit = hits[Math.floor(Math.random() * hits.length)]!;
  let distractors = (CONFUSABLE_PARTICLES[hit.particle] ?? []).filter((p) => p !== hit.particle);
  // に e へ sono intercambiabili con i verbi di direzione (向かう, 行く, 来る,
  // 帰る...): non proporre l'una come distrattore "sbagliato" dell'altra in
  // quel contesto, altrimenti il quiz boccia una risposta che va bene.
  if ((hit.particle === "に" || hit.particle === "へ") && hasMotionVerb(sentence)) {
    distractors = distractors.filter((p) => p !== "に" && p !== "へ");
  }
  // まで è spesso accettabile dove va へ/に coi verbi di moto (図書館へ/まで行く).
  if ((hit.particle === "へ" || hit.particle === "に" || hit.particle === "まで") && hasMotionVerb(sentence)) {
    distractors = distractors.filter((p) => p !== "まで" && p !== "へ" && p !== "に");
  }
  // を/で con i verbi di percorso: entrambe grammaticali (公園を/で散歩).
  if ((hit.particle === "を" || hit.particle === "で") && hasPathVerb(sentence)) {
    distractors = distractors.filter((p) => p !== "を" && p !== "で");
  }
  // から/より: nel senso di punto di partenza より è variante formale di から.
  if (hit.particle === "から") {
    distractors = distractors.filter((p) => p !== "より");
  }
  distractors = distractors.slice(0, 3);
  if (distractors.length < 2) return null;

  return {
    mode: "particle-cloze",
    wordId: word.id,
    sentenceWithBlank: blankParticleAt(sentence, hit),
    fullSentence: sentence,
    translation: pickLocalizedText(example.traduzione, locale),
    choices: shuffle([hit.particle, ...distractors]),
    correctChoice: hit.particle
  };
}

// ── Quiz contatori: con cosa si conta questa parola? ──
// Distrattori pedagogici: i contatori della stessa "famiglia" che si confondono.
const CONFUSABLE_COUNTERS: Record<string, string[]> = {
  匹: ["頭", "羽", "本"],
  頭: ["匹", "羽", "人"],
  羽: ["匹", "頭", "枚"],
  本: ["枚", "個", "冊"],
  枚: ["本", "個", "台"],
  冊: ["本", "枚", "個"],
  台: ["個", "本", "枚"],
  個: ["つ", "本", "枚"],
  つ: ["個", "本", "枚"],
  人: ["匹", "個", "つ"],
  杯: ["本", "個", "枚"],
  階: ["回", "台", "個"],
  回: ["階", "番", "本"],
  歳: ["回", "個", "人"],
  分: ["回", "本", "個"],
  番: ["回", "個", "台"],
  足: ["本", "個", "枚"],
  軒: ["台", "個", "本"]
};

export function createCounterQuestion(
  word: Word,
  counters: Counter[],
  locale: LocaleCode
): CounterQuestion | null {
  if (!word.id_contatore_suggerito) return null;
  const byId = new Map(counters.map((c) => [c.id, c]));
  const correct = byId.get(word.id_contatore_suggerito);
  if (!correct) return null;

  const label = (c: Counter) => `${c.simbolo}（${c.lettura}）`;
  const confusable = (CONFUSABLE_COUNTERS[correct.id] ?? [])
    .map((id) => byId.get(id))
    .filter((c): c is Counter => Boolean(c));
  const fallback = shuffle(counters.filter((c) => c.id !== correct.id));
  const distractors = [...new Set([...confusable, ...fallback].map(label))]
    .filter((l) => l !== label(correct))
    .slice(0, 3);
  if (distractors.length < 2) return null;

  return {
    mode: "counter-quiz",
    wordId: word.id,
    prompt: word.scrittura,
    promptMeaning: pickLocalizedArray(word.significato, locale)[0] ?? "",
    choices: shuffle([label(correct), ...distractors]),
    correctChoice: label(correct)
  };
}

// ── Drill contatore: come si legge N+contatore? ──
// Pensato per Consolida su un contatore (non su una parola): i distrattori
// migliori sono le ALTRE letture irregolari dello stesso contatore
// (みっか vs よっか vs むいか), rinforzate da varianti di voicing e dalla
// concatenazione ingenua numero+contatore.
export function createCounterDrillQuestion(counter: Counter): CounterReadingQuestion | null {
  // Contatori a valore randomizzato (giorni 1-31, ore, minuti, yen): lettura
  // generata al volo, così ogni ripetizione è un numero diverso.
  if (GENERATED_COUNTERS.has(counter.id)) {
    const gen = generateReading(counter.id);
    if (!gen || gen.distractors.length < 2) return null;
    return {
      mode: "counter-reading",
      wordId: `counter:${counter.id}`,
      prompt: gen.prompt,
      choices: shuffle([gen.correct, ...gen.distractors.slice(0, 3)]),
      correctChoice: gen.correct
    };
  }
  const pairs = parseIrregularReadings(counter);
  if (pairs.length < 3) return null;
  const pick = pairs[Math.floor(Math.random() * pairs.length)]!;
  const siblings = pairs.filter((p) => p.reading !== pick.reading).map((p) => p.reading);
  const naive = naiveReading(pick.num, counter);
  const distractors = [...new Set([...shuffle(siblings), ...voicingVariants(pick.reading), ...(naive ? [naive] : [])])]
    .filter((v) => v && v !== pick.reading)
    .slice(0, 3);
  if (distractors.length < 2) return null;
  return {
    mode: "counter-reading",
    wordId: `counter:${counter.id}`,
    prompt: `${pick.num}${counter.simbolo}`,
    choices: shuffle([pick.reading, ...distractors]),
    correctChoice: pick.reading
  };
}

// ── Gioco "conta gli oggetti": N oggetti a schermo → lettura numero+contatore ──
// I distrattori usano lo stesso numero ma il contatore SBAGLIATO (さんびき vs
// さんぼん vs さんまい): allena sia "quale contatore" sia il rendaku.
const COUNT_OBJECTS: { emoji: string; counter: string; confus: string[] }[] = [
  { emoji: "🐟", counter: "匹", confus: ["本", "枚"] },
  { emoji: "🐕", counter: "匹", confus: ["頭", "羽"] },
  { emoji: "🍎", counter: "個", confus: ["本", "枚"] },
  { emoji: "📖", counter: "冊", confus: ["枚", "個"] },
  { emoji: "🚗", counter: "台", confus: ["個", "本"] },
  { emoji: "✏️", counter: "本", confus: ["枚", "冊"] },
  { emoji: "👕", counter: "枚", confus: ["本", "個"] },
  { emoji: "🧑", counter: "人", confus: ["匹", "個"] },
  { emoji: "🍺", counter: "杯", confus: ["本", "個"] }
];

export function generateCountObjects(counters: Counter[]): (GeneratedReading & { emoji: string; count: number; counterId: string }) | null {
  const byId = new Map(counters.map((c) => [c.id, c]));
  const pool = COUNT_OBJECTS.filter((o) => byId.has(o.counter));
  if (pool.length === 0) return null;
  const obj = pool[Math.floor(Math.random() * pool.length)]!;
  const counter = byId.get(obj.counter)!;
  const n = 1 + Math.floor(Math.random() * 9);
  const correct = readCounterN(counter, n);
  if (!correct) return null;
  const distractors = [
    ...new Set(
      obj.confus
        .map((id) => byId.get(id))
        .filter((c): c is Counter => Boolean(c))
        .map((c) => readCounterN(c, n))
        .filter((r): r is string => Boolean(r))
    )
  ].filter((r) => r !== correct).slice(0, 3);
  if (distractors.length < 2) return null;
  return { prompt: obj.emoji.repeat(n), correct, distractors, emoji: obj.emoji, count: n, counterId: obj.counter };
}

// ── Quiz coppie transitivo/intransitivo: quale verbo serve nella frase? ──
// Il distrattore principe è il gemello della coppia (開ける vs 開く),
// coniugato nella stessa forma: l'errore が/を per eccellenza.
export function createTransitivityPairQuestion(
  word: Word,
  context: QuizContext,
  locale: LocaleCode
): TransitivityPairQuestion | null {
  if (!word.id_verbo_corrispondente) return null;
  const pair = context.wordsById.get(word.id_verbo_corrispondente);
  const examples = word.frasi_esempio ?? [];
  if (!pair || examples.length === 0) return null;

  const verbClass = detectVerbClass(word);
  const pairClass = detectVerbClass(pair);
  if (!verbClass || !pairClass) return null;
  const forms = buildVerbTable(word.scrittura, verbClass);
  const pairForms = buildVerbTable(pair.scrittura, pairClass);
  if (!forms || !pairForms) return null;

  // Prova tutte le frasi d'esempio (non solo la prima): le frasi parallele
  // 自動詞/他動詞 aggiunte apposta per la coppia sono spesso l'ultima.
  for (const example of examples) {
    const sentence = stripFuriganaNotation(example.testo);
    const hit = findConjugatedForm(sentence, forms);
    if (!hit) continue;

    const pairSameForm = pairForms.find((f) => f.key === hit.key)?.value;
    if (!pairSameForm || pairSameForm === hit.value) continue;

    // La particella subito prima del verbo (が/を) è l'indizio pedagogico: serve
    // che ci sia, ma la frase va mostrata INTERA col buco — l'estratto
    // nome+particella troncava la testa a metà parola (りの部屋から…) e amputava
    // la coda (…てもいいですか), creando frammenti sospesi e vere ambiguità
    // (audit dell'insegnante).
    const at = sentence.indexOf(hit.value);
    const prefix = sentence.slice(0, at);
    if (!/([一-龯ぁ-んァ-ヶーA-Za-z0-9]{1,8})([がを])\s*$/.test(prefix)) continue;

    const filler = shuffle(pairForms.filter((f) => f.key !== hit.key && f.key !== "dict"))
      .map((f) => f.value)
      .filter((v) => v !== hit.value && v !== pairSameForm)
      .slice(0, 1);

    return {
      mode: "transitivity-pair",
      wordId: word.id,
      sentenceWithBlank: `${prefix}${USAGE_BLANK}${sentence.slice(at + hit.value.length)}`,
      fullSentence: sentence,
      translation: pickLocalizedText(example.traduzione, locale),
      choices: shuffle([hit.value, pairSameForm, ...filler]),
      correctChoice: hit.value
    };
  }
  return null;
}

// ── Quiz lettura numero+contatore: さんぼん o さんほん? ──
export function createCounterReadingQuestion(
  word: Word,
  counters: Counter[]
): CounterReadingQuestion | null {
  if (!word.id_contatore_suggerito) return null;
  const counter = counters.find((c) => c.id === word.id_contatore_suggerito);
  if (!counter) return null;

  const pairs = parseIrregularReadings(counter);
  if (pairs.length === 0) return null;
  const pick = pairs[Math.floor(Math.random() * pairs.length)]!;

  const distractors = [
    ...voicingVariants(pick.reading),
    naiveReading(pick.num, counter)
  ]
    .filter((v): v is string => Boolean(v) && v !== pick.reading)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);
  if (distractors.length < 2) return null;

  return {
    mode: "counter-reading",
    wordId: word.id,
    prompt: `${pick.num}${counter.simbolo}`,
    choices: shuffle([pick.reading, ...distractors]),
    correctChoice: pick.reading
  };
}

// ── Quiz letture di ore/date: le trappole classiche (よじ, ついたち...) ──
export function createTimeReadingQuestion(word: Word): TimeReadingQuestion | null {
  if (!isTimeTriggerWord(word.scrittura)) return null;
  const entry = TIME_READINGS[Math.floor(Math.random() * TIME_READINGS.length)]!;
  return {
    mode: "time-reading",
    wordId: word.id,
    prompt: entry.jp,
    hint: entry.hint,
    choices: shuffle([entry.correct, ...entry.wrong.slice(0, 3)]),
    correctChoice: entry.correct
  };
}

// ── Quiz coniugazioni: una forma a caso tra quelle che l'utente conosce ──
export function createConjugationQuizQuestion(
  word: Word,
  allowedForms: Set<string>
): ConjugationQuizQuestion | null {
  // keigo suppletivi (いただく, 参る…): il punto è il registro, non la
  // morfologia — «passato di いただく?» è una domanda innaturale (feedback
  // utente). Niente coniugazione a secco: restano gioco /keigo e frasi curate.
  if (KEIGO_SUPPLETIVE_WORDS.has(word.scrittura) || KEIGO_SUPPLETIVE_WORDS.has(word.id)) return null;
  const questions = buildConjugationQuestions(word, allowedForms);
  if (questions.length === 0) return null;
  const q = questions[Math.floor(Math.random() * questions.length)]!;
  if (q.choices.length < 3) return null;
  return {
    mode: "conjugation",
    wordId: word.id,
    dictionary: q.dictionary,
    // via le desinenze esplicite dal prompt («Passato negativo (〜くなかった)»
    // rivelava la risposta — audit): restano i nomi di forma (た形, ば形…)
    formLabel: q.prompt.replace(/\s*[（(]〜[^)）]*[)）]/g, "").trim(),
    formKey: q.key,
    choices: shuffle(q.choices),
    correctChoice: q.correct
  };
}

// ✍️ Composizione di una forma coniugata: componi 食べなかった coi caratteri
// della forma giusta + intrusi presi dalle forme SBAGLIATE della stessa domanda
// (な/か/っ/た… le desinenze confondibili sono gli intrusi più utili).
export function createConjugationCompositionQuestion(
  word: Word,
  allowedForms: Set<string>,
  locale: "it" | "en"
): CompositionQuestion | null {
  const cq = createConjugationQuizQuestion(word, allowedForms);
  if (!cq) return null;
  const chars = [...cq.correctChoice];
  if (chars.length < 2 || chars.length > 12) return null;
  const inForm = new Set(chars);
  const wrongChars = [...new Set(cq.choices.filter((c) => c !== cq.correctChoice).flatMap((c) => [...c]))]
    .filter((c) => !inForm.has(c));
  const intruders = shuffle(wrongChars).slice(0, 3);
  if (intruders.length < 1) return null;
  return {
    mode: "composition",
    wordId: word.id,
    prompt: pickLocalizedArray(word.significato, locale).join(" / "),
    promptLanguage: locale,
    tokens: shuffle([...chars, ...intruders]),
    correctAnswer: cq.correctChoice,
    dictionary: cq.dictionary,
    formLabel: cq.formLabel
  };
}

const JLPT_DIFFICULTY_MULTIPLIER: Record<JLPTLevel, number> = {
  N5: 1,
  N4: 1.15,
  EXTRA: 1.15, // fuori liste JLPT: difficoltà da N4
  N3: 1.35,
  N2: 1.6,
  N1: 2
};

const MODE_BASE_XP: Record<XpInput["quizMode"], number> = {
  "flashcard-production": 10,
  "flashcard-recognition": 8,
  "flashcard-reading-recognition": 9,
  "multiple-choice": 12,
  "sentence-ordering": 15,
  cloze: 14,
  "reading-choice": 13,
  listening: 11,
  "listening-meaning": 11,
  "word-reading": 9,
  "particle-cloze": 13,
  "counter-quiz": 12,
  conjugation: 13,
  "transitivity-pair": 15,
  "counter-reading": 12,
  "time-reading": 12,
  composition: 14,
  "spoken-production": 14,
  "verb-form-cloze": 14,
  "usage-cloze": 13
};

// Domanda su un punto grammaticale: la forma in contesto prima di tutto; il
// riordino solo come variante o quando la forma non è isolabile. null se la
// frase non permette nessuno dei due.
export async function createGrammarQuestion(
  source: ClozeSource,
  distractorIndex: DistractorIndex,
  jlptLevel: JLPTLevel,
  context: QuizContext,
  locale: "it" | "en"
): Promise<SentenceOrderingQuestion | ClozeQuestion | null> {
  const canOrder = await canCreateSentenceOrderingQuestion(source);
  if (canOrder && Math.random() < 0.2) {
    return createSentenceOrderingQuestion(source, locale);
  }
  const cloze = await createClozeQuestion(source, distractorIndex, jlptLevel, context);
  if (cloze) return cloze;
  return canOrder ? createSentenceOrderingQuestion(source, locale) : null;
}

export function calculateQuizXp(input: XpInput): XpBreakdown {
  if (!input.isCorrect) {
    return {
      base: 0,
      difficultyBonus: 0,
      speedBonus: 0,
      groupCompletionBonus: 0,
      total: 0
    };
  }

  const base = MODE_BASE_XP[input.quizMode];
  const difficultyBonus = Math.round(base * (JLPT_DIFFICULTY_MULTIPLIER[input.jlptLevel] - 1) + input.srsStage);
  const speedBonus = input.responseTimeMs <= 6000 ? 3 : input.responseTimeMs <= 12000 ? 1 : 0;
  const groupCompletionBonus = input.completedCustomGroup ? 20 : 0;

  return {
    base,
    difficultyBonus,
    speedBonus,
    groupCompletionBonus,
    total: base + difficultyBonus + speedBonus + groupCompletionBonus
  };
}
