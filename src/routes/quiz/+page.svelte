<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { appState } from '$lib/stores.svelte';
	import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from '$lib/core/i18n';
	import { createInitialSrs, applySrsReview, normalizeMastery } from '$lib/core/srs';
	import { speakWordReading, speakSentenceJapanese } from '$lib/core/tts';
	import { renderFuriganaToHtml } from '$lib/core/furigana';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import {
		createFlashcardProductionQuestion,
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createListeningQuestion,
		createGrammarQuestion,
		createParticleClozeQuestion,
		createCounterQuestion,
		createConjugationQuizQuestion,
		createTransitivityPairQuestion,
		createCounterReadingQuestion,
		createTimeReadingQuestion,
		calculateQuizXp,
		shuffle
	} from '$lib/quiz/engine';
	import { DEFAULT_KNOWN_FORMS } from '$lib/core/conjugation';
	import { isTimeTriggerWord } from '$lib/core/timeReadings';
	import type {
		QuizQuestion, QuizContext, DistractorIndex,
		FlashcardQuestion, MultipleChoiceQuestion,
		SentenceOrderingQuestion, ClozeQuestion, ReadingChoiceQuestion, ListeningQuestion,
		ParticleClozeQuestion, CounterQuestion, ConjugationQuizQuestion,
		TransitivityPairQuestion, CounterReadingQuestion, TimeReadingQuestion
	} from '$lib/quiz/types';
	import type { Word, Kanji, Grammar, SrsProgress, StudyObjective, Counter } from '$lib/types/models';
	import type { ItemRef, StudySessionState, ActiveQuiz } from '$lib/stores.svelte';

	const locale = detectUserLocale();

	// ── State ─────────────────────────────────────────────────────────────────────
	let phase = $state<'init' | 'quiz' | 'summary'>('init');
	let loadError = $state('');

	// In-session data (loaded once)
	let words = $state<Word[]>([]);
	let kanjiRows = $state<Kanji[]>([]);
	let grammarRows = $state<Grammar[]>([]);
	let counterRows = $state<Counter[]>([]);
	let objectives = $state<StudyObjective[]>([]);
	let srsMap = $state(new Map<string, SrsProgress>());
	let context = $state<QuizContext | null>(null);
	let distractorIndex = $state<DistractorIndex>({ N5: [], N4: [], N3: [], N2: [], N1: [] });

	// Session
	let session = $state<StudySessionState | null>(null);
	let quiz = $state<ActiveQuiz | null>(null);
	let revealedProduction = $state(false);
	let answerFeedback = $state<'correct' | 'wrong' | null>(null);
	let bankTokens = $state<string[]>([]);
	let answerTokens = $state<string[]>([]);
	let nowTick = $state(Date.now());
	let answerRemainingS = $state(0);
	let autoNextProgress = $state(0);
	let autoNextRemainingS = $state(0);
	let sessionTimerId: ReturnType<typeof setInterval> | null = null;
	let autoNextTimer: ReturnType<typeof setTimeout> | null = null;
	let autoNextCountdownId: ReturnType<typeof setInterval> | null = null;
	let answerTimerId: ReturnType<typeof setInterval> | null = null;

	// Summary
	let summarySession = $state<StudySessionState | null>(null);

	// ── Helpers ───────────────────────────────────────────────────────────────────
	function sample<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)] as T;
	}

	function getSrs(key: string): SrsProgress | undefined {
		return srsMap.get(key);
	}

	const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window;

	function pickWordMode(stage: number, word: Word): FlashcardQuestion['mode'] | 'multiple-choice' | 'listening' {
		const hasKanji = word.kanji_usati.length > 0;
		// Ascolto: skill separata, entra in rotazione dallo stage 1.
		if (hasTts && stage >= 1 && Math.random() < 0.15) return 'listening';
		if (stage <= 1) {
			const r = Math.random();
			if (r < (hasKanji ? 0.45 : 0.2)) return 'flashcard-reading-recognition';
			return r < (hasKanji ? 0.8 : 0.45) ? 'flashcard-recognition' : 'multiple-choice';
		}
		if (stage <= 3) {
			const r = Math.random();
			if (hasKanji && r < 0.35) return 'flashcard-reading-recognition';
			return r < (hasKanji ? 0.6 : 0.75) ? 'multiple-choice' : 'flashcard-recognition';
		}
		if (hasKanji && Math.random() < 0.28) return 'flashcard-reading-recognition';
		if (hasKanji && Math.random() < 0.3) return 'flashcard-recognition';
		return Math.random() < 0.55 ? 'flashcard-production' : 'multiple-choice';
	}

	function getActivePool(): ItemRef[] {
		const enabled = objectives.filter((o) => o.study_enabled);
		const keys = new Set<string>();
		const stack = [...enabled];
		while (stack.length) {
			const obj = stack.pop()!;
			for (const k of obj.catalog_item_keys) keys.add(k);
			for (const child of objectives.filter((o) => o.parent_objective_id === obj.id)) {
				stack.push(child);
			}
		}
		return [...keys]
			.map((key): ItemRef | null => {
				if (key.startsWith('word:')) return { key, kind: 'word' };
				if (key.startsWith('kanji:')) return { key, kind: 'kanji' };
				if (key.startsWith('grammar:')) return { key, kind: 'grammar' };
				return null;
			})
			.filter((x): x is ItemRef => x !== null);
	}

	async function generateQuestion(ref: ItemRef): Promise<QuizQuestion | null> {
		if (!context) return null;

		if (ref.kind === 'word') {
			const word = context.wordsById.get(ref.key.replace('word:', ''));
			if (!word) return null;
			const srs = getSrs(ref.key) ?? createInitialSrs(ref.key);

			// Modalità speciali con distrattori pedagogici: si raccolgono quelle
			// applicabili alla parola e se ne tenta una a caso (~40% delle volte).
			const specials: (() => QuizQuestion | null | Promise<QuizQuestion | null>)[] = [];
			if (word.frasi_esempio?.length) {
				specials.push(() => createParticleClozeQuestion(word, locale));
				if (word.id_verbo_corrispondente) {
					specials.push(() => createTransitivityPairQuestion(word, context!, locale));
				}
			}
			if (word.id_contatore_suggerito) {
				specials.push(() => createCounterQuestion(word, counterRows, locale));
				specials.push(() => createCounterReadingQuestion(word, counterRows));
			}
			if (
				(word.tipo_jp.startsWith('動詞') || word.tipo_jp.startsWith('形容詞')) &&
				srs.srs_stage >= 1
			) {
				const allowed = new Set(appState.settings.forme_note ?? DEFAULT_KNOWN_FORMS);
				specials.push(() => createConjugationQuizQuestion(word, allowed));
			}
			if (isTimeTriggerWord(word.scrittura)) {
				specials.push(() => createTimeReadingQuestion(word));
			}
			if (specials.length > 0 && Math.random() < 0.4) {
				const pick = specials[Math.floor(Math.random() * specials.length)]!;
				const special = await pick();
				if (special) return special;
			}

			const mode = pickWordMode(srs.srs_stage, word);
			if (mode === 'flashcard-production') return createFlashcardProductionQuestion(word, locale);
			if (mode === 'flashcard-recognition') return createFlashcardRecognitionQuestion(word, locale, distractorIndex, context);
			if (mode === 'flashcard-reading-recognition') return createFlashcardReadingRecognitionQuestion(word, locale, distractorIndex, context);
			if (mode === 'listening') return createListeningQuestion(word, distractorIndex, context);
			return createMultipleChoiceQuestion(word, context, distractorIndex);
		}

		if (ref.kind === 'kanji') {
			const kanji = kanjiRows.find((k) => k.id === ref.key.replace('kanji:', ''));
			if (!kanji) return null;
			const correct = locale === 'it' ? kanji.significato.it : kanji.significato.en;
			const distractors = shuffle(kanjiRows.filter((k) => k.id !== kanji.id))
				.map((k) => (locale === 'it' ? k.significato.it : k.significato.en))
				.filter((value, index, values) => values.indexOf(value) === index)
				.filter((value) => value !== correct && value.length > 0)
				.slice(0, 3);
			return {
				mode: 'multiple-choice',
				wordId: kanji.id,
				prompt: kanji.id,
				correctChoice: correct,
				choices: shuffle([correct, ...distractors])
			} satisfies MultipleChoiceQuestion;
		}

		const entry = context.grammarById.get(ref.key.replace('grammar:', ''));
		if (!entry || entry.frasi_esempio.length === 0) return null;
		const example = sample(entry.frasi_esempio);
		return createGrammarQuestion({ grammar: entry, example }, distractorIndex, entry.livello_jlpt, context, locale);
	}

	function pickNextItem(pool: ItemRef[]): ItemRef | null {
		if (pool.length === 0) return null;
		const now = Date.now();
		const due = pool.filter((item) => {
			const srs = getSrs(item.key);
			return srs ? srs.next_review_date <= now : false;
		}).sort((a, b) => (getSrs(a.key)?.next_review_date ?? 0) - (getSrs(b.key)?.next_review_date ?? 0));

		if (due.length > 0) return due[0]!;
		const unseen = pool.filter((item) => !getSrs(item.key));
		return unseen.length > 0 ? sample(unseen) : sample(pool);
	}

	async function upsertSrs(key: string, correct: boolean): Promise<SrsProgress> {
		const current = getSrs(key) ?? createInitialSrs(key);
		const updated = applySrsReview(current, correct);
		await db.srs_progress.put(updated);
		srsMap.set(key, updated);
		return updated;
	}

	async function addXp(delta: number): Promise<void> {
		const current = await db.user_profile.get('default');
		const now = Date.now();
		if (!current) {
			const xp = Math.max(0, delta);
			await db.user_profile.put({ id: 'default', xp_totali: xp, livello: 1, streak_giorni: 0, badge_sbloccati: [], updated_at: now });
			if (appState.userProfile) appState.userProfile = { ...appState.userProfile, xp_totali: xp };
			return;
		}
		const total = Math.max(0, current.xp_totali + delta);
		const updated = { ...current, xp_totali: total, livello: Math.max(1, Math.floor(total / 220) + 1), updated_at: now };
		await db.user_profile.put(updated);
		appState.userProfile = updated;
	}

	async function advanceToNext(): Promise<void> {
		if (!session) return;
		stopAutoNext();
		// Riprende il timer se era in pausa (risposta sbagliata), recuperando il tempo fermo.
		if (session.pausedAt) {
			session.deadlineAt += Date.now() - session.pausedAt;
			session.pausedAt = null;
		}
		if (isSessionExpired()) {
			endSession();
			return;
		}
		const pool = getActivePool();
		const next = pickNextItem(pool);
		if (!next) {
			endSession();
			return;
		}
		const question = await generateQuestion(next);
		if (!question) {
			// skip ungenerable and try another
			const fallback = pool.filter((p) => p.key !== next.key);
			const alt = pickNextItem(fallback);
			if (alt) {
				const q2 = await generateQuestion(alt);
				if (q2) {
					quiz = { itemRef: alt, question: q2, startedAt: Date.now(), answered: false };
					revealedProduction = false;
					answerFeedback = null;
					bankTokens = q2.mode === 'sentence-ordering' ? shuffle(q2.tokens) : [];
					answerTokens = [];
					startAnswerTimer();
					return;
				}
			}
			endSession();
			return;
		}
		quiz = { itemRef: next, question, startedAt: Date.now(), answered: false };
		revealedProduction = false;
		answerFeedback = null;
		bankTokens = question.mode === 'sentence-ordering' ? shuffle(question.tokens) : [];
		answerTokens = [];
		if (question.mode === 'listening') speakSentenceJapanese(question.readingToSpeak);
		startAnswerTimer();
	}

	function isSessionExpired(): boolean {
		if (!session) return true;
		if (session.pausedAt) return false;
		return Date.now() >= session.deadlineAt;
	}

	function endSession(): void {
		if (!session) return;
		summarySession = { ...session };
		appState.sessionState = null;
		appState.lastSummary = summarySession;

		void db.study_sessions.put({
			id: String(session.startedAt),
			startedAt: session.startedAt,
			endedAt: Date.now(),
			answers: session.answers,
			correct: session.correct,
			wrong: session.wrong,
			timeout: session.timeout,
			xp: session.xp ?? 0
		});

		session = null;
		phase = 'summary';
		clearTimers();
	}

	function clearTimers(): void {
		if (sessionTimerId) { clearInterval(sessionTimerId); sessionTimerId = null; }
		stopAutoNext();
		stopAnswerTimer();
	}

	function stopAutoNext(): void {
		if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
		if (autoNextCountdownId) { clearInterval(autoNextCountdownId); autoNextCountdownId = null; }
		autoNextProgress = 0;
		autoNextRemainingS = 0;
	}

	function stopAnswerTimer(): void {
		if (answerTimerId) { clearInterval(answerTimerId); answerTimerId = null; }
	}

	// Timer per singola domanda (max_answer_time_ms): allo scadere conta timeout.
	function startAnswerTimer(): void {
		stopAnswerTimer();
		const maxMs = appState.settings.max_answer_time_ms;
		if (!maxMs || maxMs <= 0) { answerRemainingS = 0; return; }
		const startedAt = Date.now();
		answerRemainingS = maxMs / 1000;
		answerTimerId = setInterval(() => {
			if (!quiz || quiz.answered) { stopAnswerTimer(); return; }
			const remaining = Math.max(0, maxMs - (Date.now() - startedAt));
			answerRemainingS = remaining / 1000;
			if (remaining <= 0) {
				stopAnswerTimer();
				handleAnswer(false, '', true);
			}
		}, 100);
	}

	// Countdown auto-avanzamento dopo risposta corretta, con progresso sul pulsante.
	function startAutoNext(): void {
		stopAutoNext();
		const totalMs = Math.max(500, appState.settings.auto_next_delay_ms);
		const startedAt = Date.now();
		autoNextRemainingS = totalMs / 1000;
		autoNextCountdownId = setInterval(() => {
			const elapsed = Date.now() - startedAt;
			autoNextProgress = Math.min(1, elapsed / totalMs);
			autoNextRemainingS = Math.max(0, (totalMs - elapsed) / 1000);
			if (elapsed >= totalMs && autoNextCountdownId) {
				clearInterval(autoNextCountdownId);
				autoNextCountdownId = null;
			}
		}, 90);
		autoNextTimer = setTimeout(advanceToNext, totalMs);
	}

	function startTimer(): void {
		clearTimers();
		nowTick = Date.now();
		sessionTimerId = setInterval(() => {
			nowTick = Date.now();
			if (session && !session.pausedAt && nowTick >= session.deadlineAt) {
				endSession();
			}
		}, 1000);
	}

	// ── Answer handling ───────────────────────────────────────────────────────────
	function questionSummary(q: QuizQuestion): { prompt: string; correct: string } {
		switch (q.mode) {
			case 'flashcard-production':
			case 'flashcard-recognition':
			case 'flashcard-reading-recognition':
				return { prompt: q.prompt, correct: q.correctAnswer };
			case 'multiple-choice':
				return { prompt: q.prompt, correct: q.correctChoice };
			case 'sentence-ordering':
				return { prompt: q.prompt, correct: q.correctOrder.join('') };
			case 'reading-choice':
				return { prompt: q.plainSentence, correct: q.correctChoice };
			case 'listening':
				return { prompt: `🔊 ${q.readingToSpeak}`, correct: q.correctChoice };
			case 'particle-cloze':
			case 'transitivity-pair':
				return { prompt: q.sentenceWithBlank, correct: q.correctChoice };
			case 'counter-quiz':
				return { prompt: `Contatore per ${q.prompt}`, correct: q.correctChoice };
			case 'conjugation':
				return { prompt: `${q.dictionary} → ${q.formLabel}`, correct: q.correctChoice };
			case 'counter-reading':
			case 'time-reading':
				return { prompt: `Lettura di ${q.prompt}`, correct: q.correctChoice };
			case 'cloze':
				return { prompt: q.sentenceWithBlank.replace(/<[^>]*>/g, ''), correct: q.correctChoice };
		}
	}

	// Recap dell'elemento dopo la risposta: è il momento di massimo apprendimento.
	const answeredRecap = $derived.by(() => {
		if (!quiz?.answered) return null;
		const rawId = quiz.itemRef.key.split(':').slice(1).join(':');
		if (quiz.itemRef.kind === 'word') {
			const w = context?.wordsById.get(rawId);
			if (!w) return null;
			return {
				jp: w.scrittura,
				reading: w.lettura !== w.scrittura ? w.lettura : '',
				text: pickLocalizedArray(w.significato, locale).join(' / ')
			};
		}
		if (quiz.itemRef.kind === 'grammar') {
			const g = context?.grammarById.get(rawId);
			if (!g) return null;
			return { jp: g.struttura, reading: '', text: pickLocalizedText(g.spiegazione, locale) };
		}
		if (quiz.itemRef.kind === 'kanji') {
			const k = kanjiRows.find((row) => row.id === rawId);
			if (!k) return null;
			return {
				jp: k.id,
				reading: [...k.letture_kun, ...k.letture_on].slice(0, 3).join('、'),
				text: locale === 'it' ? k.significato.it : k.significato.en
			};
		}
		return null;
	});

	// ── Approfondimenti post-risposta: argomento principale + elementi della frase ──
	interface DeepDive {
		label: string;
		href: string;
		primary?: boolean;
	}

	function wordsInSentence(sentence: string, excludeId?: string): DeepDive[] {
		return words
			.filter((w) => w.id !== excludeId && !w.id_nome_origine)
			.filter((w) => (w.scrittura.length >= 2 || /[一-龯]/.test(w.scrittura)) && sentence.includes(w.scrittura))
			.sort((a, b) => b.scrittura.length - a.scrittura.length)
			.slice(0, 4)
			.map((w) => ({ label: w.scrittura, href: `${base}/detail/${encodeURIComponent(`word:${w.id}`)}` }));
	}

	function buildDeepDives(): DeepDive[] {
		if (!quiz) return [];
		const q = quiz.question;
		const rawId = quiz.itemRef.key.split(':').slice(1).join(':');
		const word = quiz.itemRef.kind === 'word' ? context?.wordsById.get(rawId) : undefined;
		const wordLink: DeepDive | null = word
			? { label: word.scrittura, href: `${base}/detail/${encodeURIComponent(quiz.itemRef.key)}` }
			: null;
		const dives: DeepDive[] = [];

		if (q.mode === 'particle-cloze') {
			dives.push(
				q.correctChoice === 'な'
					? { label: 'Aggettivi in -な', href: `${base}/forme#na-keiyoushi`, primary: true }
					: q.correctChoice === 'の' && word?.tipo_jp.startsWith('名詞')
						? { label: 'Il の tra nomi', href: `${base}/forme#meishi`, primary: true }
						: { label: `Particella ${q.correctChoice}`, href: `${base}/forme#joshi`, primary: true }
			);
			if (wordLink) dives.push(wordLink);
			dives.push(...wordsInSentence(q.fullSentence, word?.id));
		} else if (q.mode === 'transitivity-pair') {
			dives.push({ label: 'Transitivo vs intransitivo', href: `${base}/forme#tadoushi`, primary: true });
			if (wordLink) dives.push(wordLink);
			if (word?.id_verbo_corrispondente) {
				const pair = context?.wordsById.get(word.id_verbo_corrispondente);
				if (pair) dives.push({ label: pair.scrittura, href: `${base}/detail/${encodeURIComponent(`word:${pair.id}`)}` });
			}
			dives.push(...wordsInSentence(q.fullSentence, word?.id));
		} else if (q.mode === 'conjugation') {
			const classSlug = word?.classe_verbo_jp?.startsWith('五段')
				? 'godan'
				: word?.classe_verbo_jp?.startsWith('一段')
					? 'ichidan'
					: word?.classe_verbo_jp?.startsWith('不規則')
						? 'fukisoku'
						: word?.tipo_aggettivo_jp?.startsWith('な')
							? 'na-keiyoushi'
							: 'i-keiyoushi';
			dives.push({ label: q.formLabel, href: `${base}/forme#${classSlug}`, primary: true });
			if (wordLink) dives.push(wordLink);
		} else if (q.mode === 'counter-quiz' || q.mode === 'counter-reading') {
			const counterId = word?.id_contatore_suggerito;
			if (counterId) {
				dives.push({
					label: `Contatore ${counterId}`,
					href: `${base}/contatori#${encodeURIComponent(counterId)}`,
					primary: true
				});
			}
			if (wordLink) dives.push(wordLink);
		} else if (q.mode === 'time-reading') {
			dives.push({ label: `Lettura di ${q.prompt}`, href: `${base}/contatori`, primary: true });
			if (wordLink) dives.push(wordLink);
		} else if (quiz.itemRef.kind === 'grammar') {
			const grammar = context?.grammarById.get(rawId);
			dives.push({
				label: grammar?.struttura ?? 'Grammatica',
				href: `${base}/detail/${encodeURIComponent(quiz.itemRef.key)}`,
				primary: true
			});
			const sentence =
				q.mode === 'reading-choice'
					? q.plainSentence
					: q.mode === 'sentence-ordering'
						? q.correctOrder.join('')
						: q.mode === 'cloze'
							? q.sentenceWithBlank.replace(/<[^>]*>/g, '').replace(/___/g, '')
							: '';
			if (sentence) dives.push(...wordsInSentence(sentence));
		} else {
			// modalità parola classiche: la parola stessa + i suoi kanji
			if (wordLink) dives.push({ ...wordLink, primary: true });
			for (const k of word?.kanji_usati ?? []) {
				dives.push({ label: k, href: `${base}/detail/${encodeURIComponent(`kanji:${k}`)}` });
			}
		}

		// dedupe per href, massimo 6 chip
		const seen = new Set<string>();
		return dives.filter((d) => !seen.has(d.href) && seen.add(d.href)).slice(0, 6);
	}

	function confirmEndSession(): void {
		if (session && session.answers > 0 && !window.confirm('Terminare la sessione di studio?')) {
			return;
		}
		endSession();
	}

	async function handleAnswer(correct: boolean, selectedText = '', isTimeout = false): Promise<void> {
		if (!quiz || quiz.answered || !session) return;
		quiz.answered = true;
		answerFeedback = correct ? 'correct' : 'wrong';
		stopAnswerTimer();

		session.answers++;
		if (correct) session.correct++;
		else {
			session.wrong++;
			if (isTimeout) session.timeout++;
			// Sull'errore il timer di sessione si ferma: si riparte con "Avanti".
			if (!session.pausedAt) session.pausedAt = Date.now();
			const summary = questionSummary(quiz.question);
			session.wrongAnswers.push({
				happenedAt: Date.now(),
				itemRef: quiz.itemRef,
				questionMode: quiz.question.mode,
				prompt: summary.prompt,
				selectedAnswer: isTimeout ? '⏱ tempo scaduto' : selectedText,
				correctAnswer: summary.correct
			});
		}

		const before = getSrs(quiz.itemRef.key) ?? createInitialSrs(quiz.itemRef.key);
		await upsertSrs(quiz.itemRef.key, correct);

		const xpBreakdown = calculateQuizXp({
			quizMode: quiz.question.mode,
			isCorrect: correct,
			responseTimeMs: Date.now() - quiz.startedAt,
			jlptLevel: (quiz.question as MultipleChoiceQuestion).wordId
				? (words.find((w) => w.id === (quiz!.question as MultipleChoiceQuestion).wordId)?.livello_jlpt ?? 'N5')
				: 'N5',
			srsStage: before.srs_stage,
			completedCustomGroup: false
		});
		session.xp += correct ? xpBreakdown.total : -6;
		await addXp(correct ? xpBreakdown.total : -6);

		// TTS
		if (quiz.question.mode === 'particle-cloze' || quiz.question.mode === 'transitivity-pair') {
			speakSentenceJapanese((quiz.question as ParticleClozeQuestion).fullSentence);
		} else if (quiz.question.mode === 'conjugation' || quiz.question.mode === 'counter-reading' || quiz.question.mode === 'time-reading') {
			speakSentenceJapanese((quiz.question as ConjugationQuizQuestion).correctChoice);
		} else if (quiz.itemRef.kind === 'word') {
			const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
			if (word) speakWordReading(word);
		} else if (quiz.question.mode === 'sentence-ordering') {
			speakSentenceJapanese((quiz.question as SentenceOrderingQuestion).correctOrder.join(''));
		}

		if (correct) startAutoNext();
	}

	function handleChoiceClick(choice: string): void {
		if (!quiz || quiz.answered) return;
		const q = quiz.question;
		let correct = false;
		if (q.mode === 'multiple-choice') correct = choice === (q as MultipleChoiceQuestion).correctChoice;
		else if (q.mode === 'flashcard-recognition' || q.mode === 'flashcard-reading-recognition')
			correct = choice === (q as FlashcardQuestion).correctAnswer;
		else if (q.mode === 'cloze') correct = choice === (q as ClozeQuestion).correctChoice;
		else if (q.mode === 'reading-choice') correct = choice === (q as ReadingChoiceQuestion).correctChoice;
		else if (q.mode === 'listening') correct = choice === (q as ListeningQuestion).correctChoice;
		else if (q.mode === 'particle-cloze') correct = choice === (q as ParticleClozeQuestion).correctChoice;
		else if (q.mode === 'counter-quiz') correct = choice === (q as CounterQuestion).correctChoice;
		else if (q.mode === 'conjugation') correct = choice === (q as ConjugationQuizQuestion).correctChoice;
		else if (q.mode === 'transitivity-pair') correct = choice === (q as TransitivityPairQuestion).correctChoice;
		else if (q.mode === 'counter-reading') correct = choice === (q as CounterReadingQuestion).correctChoice;
		else if (q.mode === 'time-reading') correct = choice === (q as TimeReadingQuestion).correctChoice;
		handleAnswer(correct, choice);
	}

	function handleSentenceOrderSubmit(): void {
		if (!quiz || quiz.answered || bankTokens.length > 0) return;
		const q = quiz.question as SentenceOrderingQuestion;
		const correct = answerTokens.join('') === q.correctOrder.join('');
		handleAnswer(correct, answerTokens.join(''));
	}

	function pickFromBank(index: number): void {
		const token = bankTokens[index];
		if (token === undefined) return;
		answerTokens = [...answerTokens, token];
		bankTokens = bankTokens.filter((_, i) => i !== index);
	}

	function returnToBank(index: number): void {
		const token = answerTokens[index];
		if (token === undefined) return;
		bankTokens = [...bankTokens, token];
		answerTokens = answerTokens.filter((_, i) => i !== index);
	}

	function resetOrdering(): void {
		bankTokens = [...bankTokens, ...answerTokens];
		answerTokens = [];
	}

	// Scorciatoie: 1-4 scelgono la risposta, Invio rivela/conferma/avanza.
	function handleKeydown(e: KeyboardEvent): void {
		if (phase !== 'quiz' || !quiz) return;
		const target = e.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

		if (e.key === 'Enter') {
			e.preventDefault();
			if (quiz.answered) { advanceToNext(); return; }
			if (quiz.question.mode === 'flashcard-production' && !revealedProduction) {
				revealedProduction = true;
				return;
			}
			if (quiz.question.mode === 'sentence-ordering' && bankTokens.length === 0) {
				handleSentenceOrderSubmit();
			}
			return;
		}

		const num = Number(e.key);
		if (!Number.isInteger(num) || num < 1 || num > 4 || quiz.answered) return;
		const q = quiz.question;
		if (q.mode === 'flashcard-production') {
			if (!revealedProduction) return;
			if (num === 1) handleAnswer(true, 'Ricordata');
			else if (num === 2) handleAnswer(false, 'Non ricordata');
			return;
		}
		if (q.mode === 'sentence-ordering') return;
		const choice = (q.choices ?? [])[num - 1];
		if (choice) handleChoiceClick(choice);
	}

	// ── Init ─────────────────────────────────────────────────────────────────────
	async function startSession(): Promise<void> {
		loadError = '';
		appState.lastSummary = null;
		try {
			[words, kanjiRows, grammarRows, counterRows, objectives] = await Promise.all([
				db.words.toArray(),
				db.kanji.toArray(),
				db.grammar.toArray(),
				db.counters.toArray(),
				db.study_objectives.toArray()
			]);
			const srsRows = await db.srs_progress.toArray();
			srsMap = new Map(srsRows.map((s) => [s.id_item, s]));
			distractorIndex = await preloadDistractorIndex();
			context = {
				locale,
				wordsById: new Map(words.map((w) => [w.id, w])),
				grammarById: new Map(grammarRows.map((g) => [g.id, g]))
			};

			const now = Date.now();

			// Riprende una sessione ancora in corso (es. ritorno da "Approfondisci"),
			// recuperando il tempo di pausa se il timer era fermo nel dettaglio.
			const existing = appState.sessionState;
			if (existing) {
				if (existing.pausedAt) {
					existing.deadlineAt += now - existing.pausedAt;
					existing.pausedAt = null;
				}
				if (now < existing.deadlineAt) {
					session = existing;
					phase = 'quiz';
					startTimer();
					await advanceToNext();
					return;
				}
				appState.sessionState = null;
			}

			const durationMs = (appState.settings.session_duration_minutes || 5) * 60_000;
			session = {
				startedAt: now,
				deadlineAt: now + durationMs,
				answers: 0,
				correct: 0,
				wrong: 0,
				timeout: 0,
				xp: 0,
				pausedAt: null,
				wrongAnswers: []
			};
			appState.sessionState = session;
			phase = 'quiz';
			startTimer();

			await advanceToNext();
		} catch (e) {
			loadError = String(e);
		}
	}

	function boot(): void {
		// Riepilogo ancora aperto (es. ritorno dal dettaglio di un errore) e
		// nessuna sessione attiva: si torna al riepilogo, non a una nuova sessione.
		if (!appState.sessionState && appState.lastSummary) {
			summarySession = appState.lastSummary;
			phase = 'summary';
			return;
		}
		startSession();
	}

	onMount(() => {
		if (appState.initialized) boot();
		else {
			const stop = $effect.root(() => {
				$effect(() => { if (appState.initialized) { boot(); stop(); } });
			});
		}
	});

	onDestroy(() => {
		clearTimers();
		if (session) {
			if (!appState.settings.session_timer_runs_in_detail && !session.pausedAt) {
				session.pausedAt = Date.now();
			}
			appState.sessionState = session;
		}
	});

	// ── Derived UI ────────────────────────────────────────────────────────────────
	const timeLeftLabel = $derived.by(() => {
		if (!session) return '';
		const ref = session.pausedAt ?? nowTick;
		const ms = Math.max(0, session.deadlineAt - ref);
		const mins = Math.floor(ms / 60_000);
		const secs = Math.floor((ms % 60_000) / 1000);
		return `${session.pausedAt ? '⏸ ' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
	});

	const accuracy = $derived(() => {
		if (!summarySession || summarySession.answers === 0) return 0;
		return Math.round((summarySession.correct / summarySession.answers) * 100);
	});

	function getTier(acc: number): string {
		if (acc >= 90) return '🏆 Legend';
		if (acc >= 75) return '🥇 Gold';
		if (acc >= 55) return '🥈 Silver';
		return '🥉 Bronze';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- INIT PHASE -->
{#if phase === 'init'}
<div class="quiz-init">
	{#if loadError}
		<p class="error-text">Errore: {loadError}</p>
	{:else}
		<p class="muted-text">Caricamento sessione…</p>
	{/if}
</div>

<!-- QUIZ PHASE -->
{:else if phase === 'quiz' && quiz}
<div class="quiz-shell">
	<div class="quiz-topbar">
		<div class="session-stats">
			<span class="stat-chip">✅ {session?.correct ?? 0}</span>
			<span class="stat-chip bad">❌ {session?.wrong ?? 0}</span>
		</div>
		{#if !quiz.answered && answerRemainingS > 0}
			<div class="answer-timer" class:answer-timer-low={answerRemainingS <= 5}>
				⏱ {answerRemainingS.toFixed(1)}s
			</div>
		{/if}
		<div class="timer">{timeLeftLabel}</div>
		<button class="ghost-btn" onclick={confirmEndSession}>Termina</button>
	</div>

	<div class="quiz-meta">
		{quiz.itemRef.kind.toUpperCase()}
		{#if quiz.question.mode !== 'sentence-ordering' && quiz.question.mode !== 'cloze'}
			• {quiz.question.mode.replace(/-/g, ' ')}
		{/if}
	</div>

	<article class="quiz-card" class:correct={answerFeedback === 'correct'} class:wrong={answerFeedback === 'wrong'}>
		<!-- flashcard-production -->
		{#if quiz.question.mode === 'flashcard-production'}
			{@const q = quiz.question as FlashcardQuestion}
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">Produci significato e pronuncia</p>
			{#if !quiz.answered}
				{#if !revealedProduction}
					<button class="choice-btn" onclick={() => revealedProduction = true}>Mostra soluzione</button>
				{:else}
					<div class="solution">{q.correctAnswer}</div>
					<div class="production-btns">
						<button class="choice-btn good" onclick={() => handleAnswer(true, 'Ricordata')}>✅ Ricordata</button>
						<button class="choice-btn bad" onclick={() => handleAnswer(false, 'Non ricordata')}>❌ Non ricordata</button>
					</div>
				{/if}
			{:else}
				<div class="solution">{q.correctAnswer}</div>
			{/if}

		<!-- flashcard-recognition / reading-recognition -->
		{:else if quiz.question.mode === 'flashcard-recognition' || quiz.question.mode === 'flashcard-reading-recognition'}
			{@const q = quiz.question as FlashcardQuestion}
			<p class="question-prompt">{q.prompt}</p>
			<p class="question-hint">{quiz.question.mode === 'flashcard-reading-recognition' ? 'Scegli la scrittura corretta' : 'Scegli la parola giusta'}</p>
			<div class="choices ja-choices">
				{#each (q.choices ?? []) as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctAnswer}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctAnswer}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- multiple-choice -->
		{:else if quiz.question.mode === 'multiple-choice'}
			{@const q = quiz.question as MultipleChoiceQuestion}
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">Scegli il significato corretto</p>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- sentence-ordering -->
		{:else if quiz.question.mode === 'sentence-ordering'}
			{@const q = quiz.question as SentenceOrderingQuestion}
			<p class="question-prompt">{q.prompt}</p>
			<p class="question-hint">Componi la frase toccando le parole nell'ordine giusto. Tocca una parola nella frase per rimetterla giù.</p>
			<div class="answer-area" class:answer-filled={answerTokens.length > 0}>
				{#if answerTokens.length === 0}
					<span class="answer-placeholder">La frase apparirà qui…</span>
				{/if}
				{#each answerTokens as tok, i}
					<button class="token token-picked" disabled={quiz.answered} onclick={() => returnToBank(i)}>{tok}</button>
				{/each}
			</div>
			<div class="token-area">
				{#each bankTokens as tok, i}
					<button class="token" disabled={quiz.answered} onclick={() => pickFromBank(i)}>{tok}</button>
				{/each}
				{#if bankTokens.length === 0 && !quiz.answered}
					<span class="bank-done">Tutte le parole usate ✓</span>
				{/if}
			</div>
			{#if !quiz.answered}
				<div class="ordering-actions">
					<button class="ghost-btn" onclick={resetOrdering} disabled={answerTokens.length === 0}>↺ Ricomincia</button>
					<button class="choice-btn confirm-order" onclick={handleSentenceOrderSubmit} disabled={bankTokens.length > 0}>
						Conferma frase
					</button>
				</div>
			{:else}
				<div class="solution">{q.correctOrder.join('')}</div>
			{/if}

		<!-- reading-choice -->
		{:else if quiz.question.mode === 'reading-choice'}
			{@const q = quiz.question as ReadingChoiceQuestion}
			<p class="question-hint">Come si legge la parte evidenziata?</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="reading-sentence">{@html q.sentenceHtml}</div>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- listening -->
		{:else if quiz.question.mode === 'listening'}
			{@const q = quiz.question as ListeningQuestion}
			<p class="question-hint">Ascolta e scegli la scrittura corretta</p>
			<button class="listen-btn" onclick={() => speakSentenceJapanese(q.readingToSpeak)}>
				🔊 Riascolta
			</button>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- transitivity-pair -->
		{:else if quiz.question.mode === 'transitivity-pair'}
			{@const q = quiz.question as TransitivityPairQuestion}
			<p class="question-hint">Quale verbo serve qui? Attento a chi agisce (が/を)</p>
			<p class="question-prompt ja-sentence">{quiz.answered ? q.fullSentence : q.sentenceWithBlank}</p>
			{#if quiz.answered}<p class="question-hint">{q.translation}</p>{/if}
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- counter-reading / time-reading -->
		{:else if quiz.question.mode === 'counter-reading' || quiz.question.mode === 'time-reading'}
			{@const q = quiz.question as CounterReadingQuestion | TimeReadingQuestion}
			<p class="question-hint">Come si legge?</p>
			<p class="question-prompt ja-text">{q.prompt}</p>
			{#if quiz.question.mode === 'time-reading'}
				<p class="question-hint">{(quiz.question as TimeReadingQuestion).hint}</p>
			{/if}
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- particle-cloze -->
		{:else if quiz.question.mode === 'particle-cloze'}
			{@const q = quiz.question as ParticleClozeQuestion}
			<p class="question-hint">Cosa completa la frase?</p>
			<p class="question-prompt ja-sentence">{quiz.answered ? q.fullSentence : q.sentenceWithBlank}</p>
			{#if quiz.answered}<p class="question-hint">{q.translation}</p>{/if}
			<div class="choices ja-choices particle-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- counter-quiz -->
		{:else if quiz.question.mode === 'counter-quiz'}
			{@const q = quiz.question as CounterQuestion}
			<p class="question-hint">Con quale contatore si conta?</p>
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">{q.promptMeaning}</p>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- conjugation -->
		{:else if quiz.question.mode === 'conjugation'}
			{@const q = quiz.question as ConjugationQuizQuestion}
			<p class="question-hint">Coniuga il verbo/aggettivo</p>
			<p class="question-prompt ja-text">{q.dictionary}</p>
			<p class="question-hint">→ {q.formLabel}</p>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- cloze -->
		{:else}
			{@const q = quiz.question as ClozeQuestion}
			<p class="question-hint">Completa la frase:</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="question-prompt">{@html q.sentenceWithBlank}</p>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>
		{/if}

		{#if !quiz.answered && quiz.question.mode !== 'flashcard-production'}
			<button class="dontknow-btn" onclick={() => handleAnswer(false, 'Non la so', true)}>
				🤷 Non la so
			</button>
		{/if}

		{#if quiz.answered && answerFeedback}
			<div class="feedback-bar" class:feedback-correct={answerFeedback === 'correct'} class:feedback-wrong={answerFeedback === 'wrong'}>
				{answerFeedback === 'correct' ? '✅ Corretto!' : '❌ Sbagliato'}
			</div>
			{#if answeredRecap}
				<div class="answer-recap">
					<span class="recap-jp">{answeredRecap.jp}</span>
					{#if answeredRecap.reading}<span class="recap-reading">{answeredRecap.reading}</span>{/if}
					<span class="recap-meaning">{answeredRecap.text}</span>
				</div>
			{/if}
			{#if buildDeepDives().length > 0}
				<div class="deep-dives">
					<span class="deep-dives-label">🔍 Approfondisci:</span>
					{#each buildDeepDives() as dive (dive.href)}
						<a
							class="dive-chip"
							class:dive-primary={dive.primary}
							href={dive.href}
							onclick={stopAutoNext}
						>{dive.label}</a>
					{/each}
				</div>
			{/if}
			<div class="after-actions">
				<button
					class="skip-btn"
					style="--countdown-progress: {Math.round(autoNextProgress * 100)}%"
					onclick={advanceToNext}
				>
					{autoNextRemainingS > 0 ? `Avanti (${autoNextRemainingS.toFixed(1)}s) →` : 'Avanti →'}
				</button>
			</div>
		{/if}
	</article>
</div>

<!-- SUMMARY PHASE -->
{:else if phase === 'summary' && summarySession}
<div class="summary-shell">
	<div class="summary-card">
		<div class="summary-tier">{getTier(accuracy())}</div>
		<h2 class="summary-title">Sessione completata!</h2>
		<div class="summary-stats">
			<div class="summary-stat">
				<span class="stat-num">{summarySession.answers}</span>
				<span class="stat-label">Risposte</span>
			</div>
			<div class="summary-stat">
				<span class="stat-num">{summarySession.correct}</span>
				<span class="stat-label">Corrette</span>
			</div>
			<div class="summary-stat">
				<span class="stat-num">{accuracy()}%</span>
				<span class="stat-label">Accuracy</span>
			</div>
			<div class="summary-stat">
				<span class="stat-num">{(summarySession.xp ?? 0) >= 0 ? '+' : ''}{summarySession.xp ?? 0}</span>
				<span class="stat-label">XP</span>
			</div>
		</div>
		{#if summarySession.wrongAnswers.length > 0}
			<div class="summary-errors">
				<p class="errors-title">Errori da ripassare ({summarySession.wrongAnswers.length})</p>
				{#each summarySession.wrongAnswers as wa}
					<a class="error-row" href="{base}/detail/{encodeURIComponent(wa.itemRef.key)}">
						<span class="error-prompt">{wa.prompt}</span>
						<span class="error-detail">
							<span class="error-selected">{wa.selectedAnswer || '—'}</span>
							→ <span class="error-correct">{wa.correctAnswer}</span>
						</span>
					</a>
				{/each}
			</div>
		{/if}
		<div class="summary-actions">
			<button class="btn-primary" onclick={startSession}>🔁 Nuova sessione</button>
			<a href="{base}/" class="btn-ghost">← Home</a>
		</div>
	</div>
</div>
{/if}

<style>
	.quiz-shell, .quiz-init, .summary-shell {
		display: grid;
		gap: 12px;
	}

	.quiz-init {
		min-height: 200px;
		place-items: center;
	}

	.quiz-topbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--surface);
		border-radius: 14px;
		box-shadow: 0 2px 8px rgba(14,29,51,0.07);
	}

	.session-stats { display: flex; gap: 6px; flex: 1; }

	.stat-chip {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 8px;
		background: #dcfce7;
		color: #166534;
	}

	.stat-chip.bad { background: #fee2e2; color: #991b1b; }

	.timer {
		font-size: 1rem;
		font-weight: 700;
		color: var(--brand);
		font-variant-numeric: tabular-nums;
	}

	.ghost-btn {
		font-size: 0.78rem;
		padding: 4px 10px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: transparent;
		cursor: pointer;
		color: var(--muted);
	}

	.ghost-btn:hover { background: var(--line); }

	.quiz-meta {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0 4px;
	}

	.quiz-card {
		background: var(--surface);
		border-radius: 18px;
		padding: 24px 20px;
		box-shadow: 0 4px 20px rgba(14,29,51,0.09);
		display: grid;
		gap: 12px;
		transition: box-shadow 250ms;
	}

	.quiz-card.correct { box-shadow: 0 4px 20px rgba(15,143,86,0.25); }
	.quiz-card.wrong { box-shadow: 0 4px 20px rgba(209,67,67,0.25); }

	.question-prompt {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.3;
	}

	.ja-text {
		font-size: 2rem;
		text-align: center;
	}

	.question-hint {
		font-size: 0.78rem;
		color: var(--muted);
		margin: 0;
	}

	.choices {
		display: grid;
		gap: 8px;
	}

	.choice-btn {
		padding: 12px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		background: var(--surface-2);
		cursor: pointer;
		font-size: 0.9rem;
		text-align: left;
		transition: all 150ms;
		color: var(--ink);
	}

	.choice-btn:hover:not(:disabled) { border-color: var(--brand); background: #eef2ff; }

	.ja-choices .choice-btn { font-size: 1.2rem; }

	.ja-sentence { font-size: 1.35rem; line-height: 1.9; text-align: center; }

	.particle-choices {
		grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
	}

	.particle-choices .choice-btn { text-align: center; font-size: 1.4rem; }

	.key-hint {
		display: inline-block;
		min-width: 1.3em;
		margin-right: 8px;
		padding: 1px 4px;
		border: 1px solid var(--line);
		border-radius: 5px;
		background: var(--surface);
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--muted);
		text-align: center;
	}

	@media (hover: none) {
		.key-hint { display: none; }
	}
	.choice-btn:disabled { cursor: default; }
	.choice-btn.good { border-color: var(--success); background: #dcfce7; color: #166534; }
	.choice-btn.bad { border-color: var(--danger); background: #fee2e2; color: #991b1b; }
	.choice-btn.correct-choice { border-color: var(--success); background: #dcfce7; color: #166534; }
	.choice-btn.wrong-choice { border-color: var(--danger); background: #fee2e2; color: #991b1b; }

	.solution {
		padding: 12px 16px;
		border-radius: 10px;
		background: #f0fdf4;
		border: 1px solid #86efac;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.production-btns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.answer-area {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 12px;
		border: 2px dashed var(--line);
		border-radius: 10px;
		min-height: 56px;
	}

	.answer-area.answer-filled { border-style: solid; border-color: var(--brand); }

	.answer-placeholder { font-size: 0.82rem; color: var(--muted); }

	.token-area {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		min-height: 56px;
	}

	.bank-done { font-size: 0.82rem; color: var(--success); font-weight: 600; }

	.token {
		padding: 8px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 1.15rem;
		min-height: 44px;
		cursor: pointer;
	}

	.token:hover:not(:disabled) { background: #dde6ff; }

	.token-picked {
		background: var(--brand);
		color: #fff;
	}

	.token-picked:hover:not(:disabled) { opacity: 0.85; background: var(--brand); }

	.ordering-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.confirm-order {
		flex: 1;
		max-width: 240px;
		text-align: center;
		font-weight: 700;
	}

	.confirm-order:disabled { opacity: 0.45; }

	.listen-btn {
		justify-self: center;
		padding: 14px 28px;
		border-radius: 12px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
	}

	.listen-btn:hover { background: var(--brand); color: #fff; }

	.reading-sentence {
		font-size: 1.1rem;
		line-height: 1.8;
		padding: 10px;
		background: var(--surface-2);
		border-radius: 8px;
	}

	.dontknow-btn {
		justify-self: center;
		padding: 6px 14px;
		border: 1px dashed var(--line);
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.dontknow-btn:hover { border-color: var(--danger); color: var(--danger); }

	.answer-recap {
		display: grid;
		gap: 2px;
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface-2);
		text-align: center;
	}

	.recap-jp { font-size: 1.5rem; font-weight: 700; }

	.recap-reading { font-size: 0.95rem; color: var(--brand); }

	.recap-meaning { font-size: 0.85rem; color: var(--muted); }

	.feedback-bar {
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 600;
		text-align: center;
	}

	.feedback-correct { background: #dcfce7; color: #166534; }
	.feedback-wrong { background: #fee2e2; color: #991b1b; }

	.deep-dives {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.deep-dives-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted);
	}

	.dive-chip {
		padding: 4px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--ink);
		font-size: 0.95rem;
		text-decoration: none;
	}

	.dive-chip:hover { border-color: var(--brand); }

	.dive-primary {
		border-color: var(--brand);
		background: rgba(107, 160, 242, 0.14);
		color: var(--brand);
		font-weight: 700;
	}

	.after-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
	}

	.skip-btn {
		--countdown-progress: 0%;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: linear-gradient(
			90deg,
			rgba(14, 165, 160, 0.24) var(--countdown-progress),
			transparent var(--countdown-progress)
		);
		color: var(--brand);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.skip-btn:hover { background: var(--brand); color: #fff; }

	.answer-timer {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.answer-timer-low { color: var(--danger); }

	/* Summary */
	.summary-shell {
		place-items: center;
		min-height: 70vh;
	}

	.summary-card {
		background: var(--surface);
		border-radius: 20px;
		padding: 32px 28px;
		box-shadow: 0 8px 32px rgba(14,29,51,0.12);
		text-align: center;
		display: grid;
		gap: 16px;
		max-width: 360px;
		width: 100%;
	}

	.summary-tier { font-size: 2rem; }
	.summary-title { margin: 0; font-size: 1.3rem; font-weight: 700; }

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 12px 6px;
		background: var(--surface-2);
		border-radius: 10px;
		border: 1px solid var(--line);
	}

	.stat-num { font-size: 1.4rem; font-weight: 700; color: var(--brand); }
	.stat-label { font-size: 0.68rem; color: var(--muted); }

	.summary-errors {
		display: grid;
		gap: 6px;
		text-align: left;
	}

	.errors-title {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.error-row {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		text-decoration: none;
		color: var(--ink);
	}

	.error-row:hover { border-color: var(--brand); background: #eef2ff; }

	.error-prompt { font-size: 0.92rem; font-weight: 600; }

	.error-detail { font-size: 0.78rem; color: var(--muted); }

	.error-selected { color: var(--danger); text-decoration: line-through; }

	.error-correct { color: var(--success); font-weight: 600; }

	.summary-actions {
		display: grid;
		gap: 8px;
	}

	.btn-primary {
		padding: 12px;
		border-radius: 10px;
		background: var(--brand);
		color: #fff;
		border: none;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-primary:hover { opacity: 0.9; }

	.btn-ghost {
		display: block;
		padding: 10px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		text-decoration: none;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.muted-text { color: var(--muted); }
	.error-text { color: var(--danger); }
</style>
