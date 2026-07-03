<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
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
		createGrammarQuestion,
		calculateQuizXp
	} from '$lib/quiz/engine';
	import type {
		QuizQuestion, QuizContext, DistractorIndex,
		FlashcardQuestion, MultipleChoiceQuestion,
		SentenceOrderingQuestion, ClozeQuestion, ReadingChoiceQuestion
	} from '$lib/quiz/types';
	import type { Word, Kanji, Grammar, SrsProgress, StudyObjective } from '$lib/types/models';
	import type { ItemRef, StudySessionState, ActiveQuiz } from '$lib/stores.svelte';

	const STUDY_STATS_KEY = 'renkei_study_session_stats_v1';

	const locale = detectUserLocale();

	// ── State ─────────────────────────────────────────────────────────────────────
	let phase = $state<'init' | 'quiz' | 'summary'>('init');
	let loadError = $state('');

	// In-session data (loaded once)
	let words = $state<Word[]>([]);
	let kanjiRows = $state<Kanji[]>([]);
	let grammarRows = $state<Grammar[]>([]);
	let objectives = $state<StudyObjective[]>([]);
	let srsMap = $state(new Map<string, SrsProgress>());
	let context = $state<QuizContext | null>(null);
	let distractorIndex = $state<DistractorIndex>({ N5: [], N4: [], N3: [], N2: [], N1: [] });

	// Session
	let session = $state<StudySessionState | null>(null);
	let quiz = $state<ActiveQuiz | null>(null);
	let revealedProduction = $state(false);
	let answerFeedback = $state<'correct' | 'wrong' | null>(null);
	let tokenOrder = $state<string[]>([]);
	let sessionTimerId: ReturnType<typeof setInterval> | null = null;
	let autoNextTimer: ReturnType<typeof setTimeout> | null = null;

	// Summary
	let summarySession = $state<StudySessionState | null>(null);

	// ── Helpers ───────────────────────────────────────────────────────────────────
	function sample<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)] as T;
	}

	function getSrs(key: string): SrsProgress | undefined {
		return srsMap.get(key);
	}

	function pickWordMode(stage: number, word: Word): FlashcardQuestion['mode'] | 'multiple-choice' {
		const hasKanji = word.kanji_usati.length > 0;
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
			const mode = pickWordMode(srs.srs_stage, word);
			if (mode === 'flashcard-production') return createFlashcardProductionQuestion(word, locale);
			if (mode === 'flashcard-recognition') return createFlashcardRecognitionQuestion(word, locale, distractorIndex, context);
			if (mode === 'flashcard-reading-recognition') return createFlashcardReadingRecognitionQuestion(word, locale, distractorIndex, context);
			return createMultipleChoiceQuestion(word, context, distractorIndex);
		}

		if (ref.kind === 'kanji') {
			const kanji = kanjiRows.find((k) => k.id === ref.key.replace('kanji:', ''));
			if (!kanji) return null;
			const correct = locale === 'it' ? kanji.significato.it : kanji.significato.en;
			const distractors = kanjiRows
				.filter((k) => k.id !== kanji.id)
				.sort(() => Math.random() - 0.5)
				.slice(0, 3)
				.map((k) => (locale === 'it' ? k.significato.it : k.significato.en));
			return {
				mode: 'multiple-choice',
				wordId: kanji.id,
				prompt: kanji.id,
				correctChoice: correct,
				choices: [correct, ...distractors].sort(() => Math.random() - 0.5)
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
					tokenOrder = q2.mode === 'sentence-ordering' ? [...q2.tokens].sort(() => Math.random() - 0.5) : [];
					return;
				}
			}
			endSession();
			return;
		}
		quiz = { itemRef: next, question, startedAt: Date.now(), answered: false };
		revealedProduction = false;
		answerFeedback = null;
		tokenOrder = question.mode === 'sentence-ordering' ? [...question.tokens].sort(() => Math.random() - 0.5) : [];
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

		const stats = JSON.parse(localStorage.getItem(STUDY_STATS_KEY) ?? '[]');
		stats.push({
			startedAt: session.startedAt,
			endedAt: Date.now(),
			answers: session.answers,
			correct: session.correct,
			wrong: session.wrong,
			timeout: session.timeout
		});
		localStorage.setItem(STUDY_STATS_KEY, JSON.stringify(stats.slice(-200)));

		session = null;
		phase = 'summary';
		clearTimers();
	}

	function clearTimers(): void {
		if (sessionTimerId) { clearInterval(sessionTimerId); sessionTimerId = null; }
		if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
	}

	// ── Answer handling ───────────────────────────────────────────────────────────
	async function handleAnswer(correct: boolean, selectedText = ''): Promise<void> {
		if (!quiz || quiz.answered || !session) return;
		quiz.answered = true;
		answerFeedback = correct ? 'correct' : 'wrong';

		session.answers++;
		if (correct) session.correct++;
		else session.wrong++;

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
		await addXp(correct ? xpBreakdown.total : -6);

		// TTS
		if (quiz.itemRef.kind === 'word') {
			const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
			if (word) speakWordReading(word);
		} else if (quiz.question.mode === 'sentence-ordering') {
			speakSentenceJapanese((quiz.question as SentenceOrderingQuestion).correctOrder.join(''));
		}

		const delay = appState.settings.auto_next_delay_ms;
		autoNextTimer = setTimeout(advanceToNext, delay);
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
		handleAnswer(correct, choice);
	}

	function handleSentenceOrderSubmit(): void {
		if (!quiz || quiz.answered) return;
		const q = quiz.question as SentenceOrderingQuestion;
		const correct = tokenOrder.join('') === q.correctOrder.join('');
		handleAnswer(correct, tokenOrder.join(''));
	}

	function moveToken(from: number, to: number): void {
		const arr = [...tokenOrder];
		const [tok] = arr.splice(from, 1);
		arr.splice(to, 0, tok!);
		tokenOrder = arr;
	}

	// ── Init ─────────────────────────────────────────────────────────────────────
	async function startSession(): Promise<void> {
		loadError = '';
		try {
			[words, kanjiRows, grammarRows, objectives] = await Promise.all([
				db.words.toArray(),
				db.kanji.toArray(),
				db.grammar.toArray(),
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

			const durationMs = (appState.settings.session_duration_minutes || 5) * 60_000;
			const now = Date.now();
			session = {
				startedAt: now,
				deadlineAt: now + durationMs,
				answers: 0,
				correct: 0,
				wrong: 0,
				timeout: 0,
				pausedAt: null,
				wrongAnswers: []
			};
			appState.sessionState = session;
			phase = 'quiz';

			sessionTimerId = setInterval(() => {
				if (session && !session.pausedAt && Date.now() >= session.deadlineAt) {
					endSession();
				}
			}, 5000);

			await advanceToNext();
		} catch (e) {
			loadError = String(e);
		}
	}

	onMount(() => {
		if (appState.initialized) startSession();
		else {
			const stop = $effect.root(() => {
				$effect(() => { if (appState.initialized) { startSession(); stop(); } });
			});
		}
	});

	onDestroy(() => {
		clearTimers();
		if (session) {
			appState.sessionState = session;
		}
	});

	// ── Derived UI ────────────────────────────────────────────────────────────────
	const timeLeftLabel = $derived(() => {
		if (!session) return '';
		const ms = Math.max(0, session.deadlineAt - Date.now());
		const mins = Math.floor(ms / 60_000);
		const secs = Math.floor((ms % 60_000) / 1000);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
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
		<div class="timer">{timeLeftLabel()}</div>
		<button class="ghost-btn" onclick={endSession}>Termina</button>
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
			<div class="choices">
				{#each (q.choices ?? []) as choice}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctAnswer}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctAnswer}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					>{choice}</button>
				{/each}
			</div>

		<!-- multiple-choice -->
		{:else if quiz.question.mode === 'multiple-choice'}
			{@const q = quiz.question as MultipleChoiceQuestion}
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">Scegli il significato corretto</p>
			<div class="choices">
				{#each q.choices as choice}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					>{choice}</button>
				{/each}
			</div>

		<!-- sentence-ordering -->
		{:else if quiz.question.mode === 'sentence-ordering'}
			{@const q = quiz.question as SentenceOrderingQuestion}
			<p class="question-prompt">{q.prompt}</p>
			<p class="question-hint">Riordina i token nella frase corretta</p>
			<div class="token-area">
				{#each tokenOrder as tok, i}
					<button
						class="token"
						disabled={quiz.answered}
						onclick={() => {
							if (i > 0) moveToken(i, i - 1);
						}}
					>{tok}</button>
				{/each}
			</div>
			{#if !quiz.answered}
				<button class="choice-btn" onclick={handleSentenceOrderSubmit}>Conferma ordine</button>
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
				{#each q.choices as choice}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					>{choice}</button>
				{/each}
			</div>

		<!-- cloze -->
		{:else}
			{@const q = quiz.question as ClozeQuestion}
			<p class="question-hint">Completa la frase:</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="question-prompt">{@html q.sentenceWithBlank}</p>
			<div class="choices">
				{#each q.choices as choice}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					>{choice}</button>
				{/each}
			</div>
		{/if}

		{#if quiz.answered && answerFeedback}
			<div class="feedback-bar" class:feedback-correct={answerFeedback === 'correct'} class:feedback-wrong={answerFeedback === 'wrong'}>
				{answerFeedback === 'correct' ? '✅ Corretto!' : '❌ Sbagliato'}
			</div>
			<button class="skip-btn" onclick={() => { clearTimeout(autoNextTimer ?? 0); advanceToNext(); }}>
				Avanti →
			</button>
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
		</div>
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

	.token-area {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		min-height: 48px;
	}

	.token {
		padding: 6px 12px;
		border-radius: 8px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 0.95rem;
		cursor: pointer;
	}

	.token:hover:not(:disabled) { background: #dde6ff; }

	.reading-sentence {
		font-size: 1.1rem;
		line-height: 1.8;
		padding: 10px;
		background: var(--surface-2);
		border-radius: 8px;
	}

	.feedback-bar {
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 600;
		text-align: center;
	}

	.feedback-correct { background: #dcfce7; color: #166534; }
	.feedback-wrong { background: #fee2e2; color: #991b1b; }

	.skip-btn {
		align-self: end;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: transparent;
		color: var(--brand);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		text-align: right;
	}

	.skip-btn:hover { background: var(--brand); color: #fff; }

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
		grid-template-columns: repeat(3, 1fr);
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
