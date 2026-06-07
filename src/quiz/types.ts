import { Grammar, GrammarExample, JLPTLevel, LocaleCode, Word } from "../types/models";

export type QuizMode = "flashcard-production" | "flashcard-recognition" | "multiple-choice" | "sentence-ordering" | "cloze" | "reading-choice";

export interface FlashcardQuestion {
  mode: "flashcard-production" | "flashcard-recognition";
  wordId: string;
  prompt: string;
  promptLanguage: "ja" | LocaleCode;
  choices?: string[];
  correctAnswer: string;
  warningMultipleDefinitions: boolean;
}

export interface MultipleChoiceQuestion {
  mode: "multiple-choice";
  wordId: string;
  prompt: string;
  correctChoice: string;
  choices: string[];
}

export interface SentenceOrderingQuestion {
  mode: "sentence-ordering";
  grammarId: string;
  prompt: string;
  tokens: string[];
  correctOrder: string[];
}

export interface ClozeQuestion {
  mode: "cloze";
  grammarId: string;
  sentenceWithBlank: string;
  choices: string[];
  correctChoice: string;
}

export interface ReadingChoiceQuestion {
  mode: "reading-choice";
  grammarId: string;
  sentenceHtml: string;
  plainSentence: string;
  targetText: string;
  choices: string[];
  correctChoice: string;
}

export type QuizQuestion =
  | FlashcardQuestion
  | MultipleChoiceQuestion
  | SentenceOrderingQuestion
  | ClozeQuestion
  | ReadingChoiceQuestion;

export interface DistractorEntry {
  id: string;
  meaning: string;
}

export type DistractorIndex = Record<JLPTLevel, DistractorEntry[]>;

export interface QuizContext {
  locale: LocaleCode;
  wordsById: Map<string, Word>;
  grammarById: Map<string, Grammar>;
}

export interface XpInput {
  quizMode: QuizMode;
  isCorrect: boolean;
  responseTimeMs: number;
  jlptLevel: JLPTLevel;
  srsStage: number;
  completedCustomGroup?: boolean;
}

export interface XpBreakdown {
  base: number;
  difficultyBonus: number;
  speedBonus: number;
  groupCompletionBonus: number;
  total: number;
}

export interface ClozeSource {
  grammar: Grammar;
  example: GrammarExample;
}
