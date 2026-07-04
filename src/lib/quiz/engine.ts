import { pickLocalizedArray, pickLocalizedText } from "../core/i18n";
import { createDefaultTokenizer } from "../core/tokenizer";
import { renderFuriganaToHtml } from "../core/furigana";
import { stripFuriganaNotation } from "../core/furigana";
import type { JLPTLevel, Word } from "../types/models";
import { buildDistractors } from "./distractorIndex";
import type {
  ClozeQuestion,
  ClozeSource,
  DistractorIndex,
  FlashcardQuestion,
  MultipleChoiceQuestion,
  QuizContext,
  ReadingChoiceQuestion,
  SentenceOrderingQuestion,
  XpBreakdown,
  XpInput
} from "./types";

const FURIGANA_SEGMENT_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;
const NON_ORDERING_GRAMMAR_MARKER_REGEX =
  /(意向形|辞書形|ます形|て形|ない形|た形|命令形|可能形|受身形|受け身形|使役|条件形|仮定形|連用形|終止形|未然形|活用|語幹|原形|丁寧形)/;
const SENTENCE_CONTEXT_HINT_REGEX = /[はがをにでとへもやの]|。|、|！|？/;
const GRAMMAR_STRUCTURE_SPLIT_REGEX = /[\s/／・、,()（）「」『』【】]+/;

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

export function createFlashcardRecognitionQuestion(
  word: Word,
  locale: "it" | "en",
  distractorIndex: DistractorIndex,
  context: QuizContext
): FlashcardQuestion {
  const correct = word.scrittura;
  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 6)
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

export function createFlashcardReadingRecognitionQuestion(
  word: Word,
  locale: "it" | "en",
  distractorIndex: DistractorIndex,
  context: QuizContext
): FlashcardQuestion {
  const correct = word.scrittura;
  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 4)
    .map((d) => d.id)
    .map((id) => context.wordsById.get(id)?.scrittura)
    .filter((v): v is string => Boolean(v))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct)
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

export function createMultipleChoiceQuestion(
  word: Word,
  context: QuizContext,
  distractorIndex: DistractorIndex
): MultipleChoiceQuestion {
  const locale = context.locale;
  const correct = pickFirstMeaning(word, locale);

  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 6)
    .map((d) => context.wordsById.get(d.id))
    .filter((w): w is Word => Boolean(w))
    .map((w) => pickFirstMeaning(w, locale))
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value !== correct && value.length > 0)
    .slice(0, 3);

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
    prompt: pickLocalizedText(source.grammar.spiegazione, locale),
    tokens: shuffle(plainTokens),
    correctOrder: plainTokens
  };
}

async function canCreateSentenceOrderingQuestion(source: ClozeSource): Promise<boolean> {
  const plainSentence = stripFuriganaNotation(source.example.testo);
  const grammarStructure = source.grammar.struttura;

  // Skip ordering prompts for conjugation/form labels where there is no meaningful token order.
  if (NON_ORDERING_GRAMMAR_MARKER_REGEX.test(plainSentence) || NON_ORDERING_GRAMMAR_MARKER_REGEX.test(grammarStructure)) {
    return false;
  }

  const tokenizer = await createDefaultTokenizer();
  const tokens = tokenizer.tokenize(plainSentence).filter((token) => token.trim().length > 0);
  const jpTokens = tokens.filter((token) => /[ぁ-んァ-ヶ一-龯]/.test(token));

  if (jpTokens.length < 3) {
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
  const structurePlain = stripFuriganaNotation(source.grammar.struttura ?? "")
    .replace(/[〜~]/g, "")
    .trim();

  if (!structurePlain) {
    return null;
  }

  const candidates = structurePlain
    .split(GRAMMAR_STRUCTURE_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter((part) => /[ぁ-んァ-ヶ一-龯]/.test(part))
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

  return sourceText.replace(target, "___");
}

function pickReadingTarget(sourceText: string): { base: string; reading: string; match: string } | null {
  const candidates = [...sourceText.matchAll(FURIGANA_SEGMENT_REGEX)]
    .map((match) => ({ match: match[0], base: match[1] ?? "", reading: match[2] ?? "" }))
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
  return shuffle(readings).slice(0, 3);
}

function createReadingChoiceQuestion(source: ClozeSource, jlptLevel: JLPTLevel, context: QuizContext): ReadingChoiceQuestion | null {
  const target = pickReadingTarget(source.example.testo);
  if (!target) {
    return null;
  }

  const distractors = buildReadingDistractors(context, jlptLevel, target.reading);
  return {
    mode: "reading-choice",
    grammarId: source.grammar.id,
    sentenceHtml: buildReadingSentenceHtml(source.example.testo, target.match),
    plainSentence: stripFuriganaNotation(source.example.testo),
    targetText: target.base,
    choices: shuffle([target.reading, ...distractors]).slice(0, 4),
    correctChoice: target.reading
  };
}

export async function createClozeQuestion(
  source: ClozeSource,
  distractorIndex: DistractorIndex,
  jlptLevel: JLPTLevel,
  context: QuizContext
): Promise<ClozeQuestion> {
  const tokenizer = await createDefaultTokenizer();
  const plainSentence = stripFuriganaNotation(source.example.testo);
  const tokens = tokenizer.tokenize(plainSentence);
  const randomTarget = pickClozeTarget(tokens);
  const structureTarget = pickGrammarStructureTarget(source, plainSentence);
  const target = structureTarget ?? (randomTarget.length < plainSentence.length ? randomTarget : "");

  const fallbackTarget =
    target ||
    tokens.find((token) => /[ぁ-んァ-ヶ一-龯]/.test(token) && token.length > 0 && token.length < plainSentence.length) ||
    (plainSentence.length > 1 ? plainSentence.slice(-1) : plainSentence);

  const distractorChoices = buildDistractors(jlptLevel, distractorIndex, "", 3)
    .map((d) => context.wordsById.get(d.id)?.scrittura)
    .filter((v): v is string => Boolean(v));

  let blanked = blankClozeTarget(source.example.testo, fallbackTarget);
  if (stripFuriganaNotation(blanked).trim() === "___") {
    blanked = source.example.testo;
  }

  return {
    mode: "cloze",
    grammarId: source.grammar.id,
    sentenceWithBlank: renderFuriganaToHtml(blanked),
    choices: shuffle([fallbackTarget, ...distractorChoices]).slice(0, 4),
    correctChoice: fallbackTarget
  };
}

const JLPT_DIFFICULTY_MULTIPLIER: Record<JLPTLevel, number> = {
  N5: 1,
  N4: 1.15,
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
  "reading-choice": 13
};

export async function createGrammarQuestion(
  source: ClozeSource,
  distractorIndex: DistractorIndex,
  jlptLevel: JLPTLevel,
  context: QuizContext,
  locale: "it" | "en"
): Promise<SentenceOrderingQuestion | ClozeQuestion | ReadingChoiceQuestion> {
  if (Math.random() < 0.5 && (await canCreateSentenceOrderingQuestion(source))) {
    return createSentenceOrderingQuestion(source, locale);
  }

  const readingQuestion = createReadingChoiceQuestion(source, jlptLevel, context);
  if (readingQuestion) {
    return readingQuestion;
  }

  return createClozeQuestion(source, distractorIndex, jlptLevel, context);
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
