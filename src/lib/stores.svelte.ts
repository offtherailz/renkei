import type { AppSettings, StudyGoal, UserProfile } from "./types/models";
import type { QuizQuestion } from "./quiz/types";

export type ItemKind = "word" | "grammar" | "kanji" | "dialogue" | "objective";

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

export interface StudySessionState {
	startedAt: number;
	deadlineAt: number;
	answers: number;
	correct: number;
	wrong: number;
	timeout: number;
	pausedAt: number | null;
	wrongAnswers: SessionWrongAnswer[];
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
	updated_at: 0
};

// Global reactive state (Svelte 5 runes — only usable inside .svelte files or .svelte.ts)
export const appState = $state({
	initialized: false,
	settings: { ...DEFAULT_SETTINGS } as AppSettings,
	studyGoal: null as StudyGoal | null,
	userProfile: null as UserProfile | null,
	sessionState: null as StudySessionState | null,
	activeQuiz: null as ActiveQuiz | null,
	detailItemRef: null as ItemRef | null
});
