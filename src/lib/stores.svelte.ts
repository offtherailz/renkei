import type { AppSettings, StudyGoal, UserProfile } from "./types/models";
import type { QuizQuestion } from "./quiz/types";
import { DEFAULT_KNOWN_FORMS } from "./core/conjugation";
import { DEFAULT_NEW_CARDS_PER_DAY } from "./core/dailyNewCards";

export type ItemKind = "word" | "grammar" | "kanji" | "counter" | "dialogue" | "objective";

export interface ItemRef {
	key: string;
	kind: ItemKind;
}

export interface SessionWrongAnswer {
	happenedAt: number;
	itemRef: ItemRef;
	questionMode: QuizQuestion["mode"];
	prompt: string;
	selectedAnswer: string;
	correctAnswer: string;
}

export type SkillKey = 'words' | 'kanji' | 'grammar';
export type SkillCounts = Record<SkillKey, { answers: number; correct: number }>;

export function emptySkillCounts(): SkillCounts {
	return {
		words: { answers: 0, correct: 0 },
		kanji: { answers: 0, correct: 0 },
		grammar: { answers: 0, correct: 0 }
	};
}

export interface StudySessionState {
	startedAt: number;
	deadlineAt: number;
	answers: number;
	correct: number;
	wrong: number;
	timeout: number;
	xp: number;
	pausedAt: number | null;
	wrongAnswers: SessionWrongAnswer[];
	answersByType: SkillCounts;
}

export interface ActiveQuiz {
	itemRef: ItemRef;
	question: QuizQuestion;
	startedAt: number;
	answered: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
	id: "default",
	auto_next_delay_ms: 2000,
	max_answer_time_ms: 20000,
	session_duration_minutes: 5,
	session_timer_runs_in_detail: false,
	forme_note: DEFAULT_KNOWN_FORMS,
	voce_utente: "femminile",
	nuove_carte_al_giorno: DEFAULT_NEW_CARDS_PER_DAY,
	updated_at: 0
};

// Global reactive state (Svelte 5 runes — only usable inside .svelte files or .svelte.ts)
export const appState = $state({
	initialized: false,
	settings: { ...DEFAULT_SETTINGS } as AppSettings,
	studyGoal: null as StudyGoal | null,
	userProfile: null as UserProfile | null,
	sessionState: null as StudySessionState | null,
	lastSummary: null as StudySessionState | null,
	activeQuiz: null as ActiveQuiz | null,
	detailItemRef: null as ItemRef | null,
	lastDeepDive: null as DeepDivePayload | null
});

export interface DeepDiveItem {
	label: string;
	href: string;
	primary?: boolean;
	level?: string; // JLPT
	tipo?: string; // tipo_jp
	meaning?: string;
	consolidaHref?: string;
	kanji?: boolean;
}

export interface DeepDivePayload {
	title: string;
	reading?: string;
	meaning?: string;
	question?: string; // riassunto della domanda
	correctReason?: string; // perché la risposta corretta è giusta
	// La frase della domanda (o l'esempio della parola): testo piano,
	// eventuale versione annotata 漢字[かんじ] per le furigana, traduzione.
	sentence?: { testo: string; annotated?: string; traduzione?: string };
	dives: DeepDiveItem[];
	notes: { choice: string; reason: string }[];
}
