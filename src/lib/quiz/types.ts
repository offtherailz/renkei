import type { Grammar, GrammarExample, JLPTLevel, LocaleCode, Word } from "../types/models";

export type QuizMode =
  | "flashcard-production"
  | "flashcard-recognition"
  | "flashcard-reading-recognition"
  | "multiple-choice"
  | "sentence-ordering"
  | "cloze"
  | "reading-choice"
  | "listening"
  | "particle-cloze"
  | "counter-quiz"
  | "conjugation"
  | "transitivity-pair"
  | "counter-reading"
  | "time-reading"
  | "composition"
  | "spoken-production"
  | "verb-form-cloze"
  | "usage-cloze";

export interface FlashcardQuestion {
  mode: "flashcard-production" | "flashcard-recognition" | "flashcard-reading-recognition";
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

// 🧩 Usare: nella frase reale della carta il verbo/aggettivo è oscurato —
// scegli la FORMA giusta per il contesto (le opzioni sono forme diverse
// della stessa parola: て per la richiesta, た per il passato…).
export interface VerbFormClozeQuestion {
  mode: "verb-form-cloze";
  wordId: string;
  sentenceWithBlank: string;
  fullSentence: string;
  translation: string;
  formKey: string; // chiave della forma corretta (per il credito conj:/gram:)
  choices: string[];
  correctChoice: string;
}

// 🧩 Usare: la PAROLA della carta oscurata nella sua frase d'esempio — quale
// parola completa la frase? (le "prove d'uso" della scheda, dentro il quiz).
export interface UsageClozeQuestion {
  mode: "usage-cloze";
  wordId: string;
  sentenceWithBlank: string;
  fullSentence: string;
  translation: string;
  // «perché è giusta» (solo per le domande curate dall'insegnante)
  explanation?: string;
  // slug della costruzione (item curati forma-contesto): la risposta accredita
  // anche gram:<slug> come pratica, oltre alla parola (doppio incremento).
  gram?: string;
  choices: string[];
  correctChoice: string;
}

// 🎤 Dire: pronuncia la parola al microfono, dal solo significato. Vale dire
// la scrittura O la lettura (un gruppo unico di varianti accettate).
export interface SpokenProductionQuestion {
  mode: "spoken-production";
  wordId: string;
  prompt: string; // significato IT/EN
  promptLanguage: LocaleCode;
  expectedReading: string; // word.lettura
  expectedWriting: string; // word.scrittura
  warningMultipleDefinitions: boolean;
}

// ✍️ Scrivere: componi la parola carattere per carattere (kanji o kana) dal
// significato+lettura. Il banco contiene anche caratteri intrusi.
export interface CompositionQuestion {
  mode: "composition";
  wordId: string;
  prompt: string; // significato (IT/EN)
  promptLanguage: LocaleCode;
  reading?: string; // lettura mostrata come aiuto se la parola ha kanji
  tokens: string[]; // caratteri della parola + intrusi, da mescolare
  correctAnswer: string; // word.scrittura
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

export interface ListeningQuestion {
  mode: "listening";
  wordId: string;
  readingToSpeak: string;
  choices: string[];
  correctChoice: string;
}

export interface ParticleClozeQuestion {
  mode: "particle-cloze";
  wordId: string;
  sentenceWithBlank: string;
  fullSentence: string;
  translation: string;
  choices: string[];
  correctChoice: string;
}

export interface TransitivityPairQuestion {
  mode: "transitivity-pair";
  wordId: string;
  sentenceWithBlank: string;
  fullSentence: string;
  translation: string;
  choices: string[];
  correctChoice: string;
}

export interface CounterReadingQuestion {
  mode: "counter-reading";
  wordId: string;
  prompt: string; // es. 3本
  choices: string[];
  correctChoice: string;
}

export interface TimeReadingQuestion {
  mode: "time-reading";
  wordId: string;
  prompt: string; // es. 4時
  hint: string;
  choices: string[];
  correctChoice: string;
}

export interface CounterQuestion {
  mode: "counter-quiz";
  wordId: string;
  prompt: string; // scrittura della parola da contare
  promptMeaning: string;
  choices: string[]; // "匹 (ひき)"
  correctChoice: string;
}

export interface ConjugationQuizQuestion {
  mode: "conjugation";
  wordId: string;
  dictionary: string;
  formLabel: string;
  formKey: string; // chiave della forma (potential, te, ba…) per il credito gram:*
  choices: string[];
  correctChoice: string;
}

export type QuizQuestion =
  | FlashcardQuestion
  | MultipleChoiceQuestion
  | SentenceOrderingQuestion
  | ClozeQuestion
  | ReadingChoiceQuestion
  | ListeningQuestion
  | ParticleClozeQuestion
  | CounterQuestion
  | ConjugationQuizQuestion
  | TransitivityPairQuestion
  | CounterReadingQuestion
  | TimeReadingQuestion
  | CompositionQuestion
  | SpokenProductionQuestion
  | VerbFormClozeQuestion
  | UsageClozeQuestion;

export interface DistractorEntry {
  id: string;
  meaning: string;
  scrittura: string;
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
