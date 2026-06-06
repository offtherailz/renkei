import { pickLocalizedArray, pickLocalizedText } from "../core/i18n";
import { createDefaultTokenizer } from "../core/tokenizer";
import { renderFuriganaToHtml } from "../core/furigana";
import { stripFuriganaNotation } from "../core/furigana";
import { JLPTLevel, Word } from "../types/models";
import { buildDistractors } from "./distractorIndex";
import {
  ClozeQuestion,
  ClozeSource,
  DistractorIndex,
  FlashcardQuestion,
  MultipleChoiceQuestion,
  QuizContext,
  SentenceOrderingQuestion,
  XpBreakdown,
  XpInput
} from "./types";

function shuffle<T>(items: T[]): T[] {
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
  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 3)
    .map((d) => d.id)
    .map((id) => context.wordsById.get(id)?.scrittura)
    .filter((v): v is string => Boolean(v))
    .filter(Boolean);

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

export function createMultipleChoiceQuestion(
  word: Word,
  context: QuizContext,
  distractorIndex: DistractorIndex
): MultipleChoiceQuestion {
  const locale = context.locale;
  const correct = pickFirstMeaning(word, locale);

  const distractors = buildDistractors(word.livello_jlpt, distractorIndex, word.id, 3)
    .map((d) => context.wordsById.get(d.id))
    .filter((w): w is Word => Boolean(w))
    .map((w) => pickFirstMeaning(w, locale));

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

function pickClozeTarget(tokens: string[]): string {
  const filtered = tokens.filter((t) => /[ぁ-んァ-ヶ一-龯]/.test(t));
  if (filtered.length === 0) {
    return tokens[Math.floor(Math.random() * tokens.length)] ?? "";
  }
  return filtered[Math.floor(Math.random() * filtered.length)] ?? filtered[0];
}

export async function createClozeQuestion(
  source: ClozeSource,
  distractorIndex: DistractorIndex,
  jlptLevel: JLPTLevel,
  context: QuizContext
): Promise<ClozeQuestion> {
  const tokenizer = await createDefaultTokenizer();
  const tokens = tokenizer.tokenize(source.example.testo);
  const target = pickClozeTarget(tokens);

  const distractorChoices = buildDistractors(jlptLevel, distractorIndex, "", 3)
    .map((d) => context.wordsById.get(d.id)?.scrittura)
    .filter((v): v is string => Boolean(v));

  const blanked = source.example.testo.replace(target, "___");

  return {
    mode: "cloze",
    grammarId: source.grammar.id,
    sentenceWithBlank: renderFuriganaToHtml(blanked),
    choices: shuffle([target, ...distractorChoices]).slice(0, 4),
    correctChoice: target
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
  "multiple-choice": 12,
  "sentence-ordering": 15,
  cloze: 14
};

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
