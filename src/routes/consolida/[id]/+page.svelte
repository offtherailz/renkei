<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import { speakWordReading } from '$lib/core/tts';
	import {
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createConjugationQuizQuestion,
		createCounterQuestion,
		shuffle
	} from '$lib/quiz/engine';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import { DEFAULT_KNOWN_FORMS } from '$lib/core/conjugation';
	import type { Word, Counter } from '$lib/types/models';
	import type { QuizContext, DistractorIndex, QuizQuestion } from '$lib/quiz/types';

	const locale = detectUserLocale();
	const wordId = $derived($page.params.id ?? '');

	let word = $state<Word | null>(null);
	let queue = $state<QuizQuestion[]>([]);
	let idx = $state(0);
	let picked = $state<string | null>(null);
	let revealed = $state(false);
	let score = $state({ ok: 0, tot: 0 });
	let loading = $state(true);

	const current = $derived(queue[idx] ?? null);

	async function build(): Promise<void> {
		loading = true;
		picked = null; revealed = false; idx = 0; score = { ok: 0, tot: 0 };
		const w = await db.words.get(wordId);
		word = w ?? null;
		if (!w) { loading = false; return; }

		const [words, counters] = await Promise.all([db.words.toArray(), db.counters.toArray()]);
		const context: QuizContext = {
			locale,
			wordsById: new Map(words.map((x) => [x.id, x])),
			grammarById: new Map()
		};
		const distractors: DistractorIndex = await preloadDistractorIndex();

		const qs: QuizQuestion[] = [];
		// Diretto (JP→significato)
		qs.push(createMultipleChoiceQuestion(w, context, distractors));
		// Inverso (significato→scrittura)
		qs.push(createFlashcardRecognitionQuestion(w, locale, distractors, context));
		// Lettura (se ha kanji)
		if (w.kanji_usati.length > 0 && w.scrittura !== w.lettura) {
			qs.push(createFlashcardReadingRecognitionQuestion(w, locale, distractors, context));
		}
		// Coniugazione (verbi/aggettivi)
		if (w.tipo_jp.startsWith('動詞') || w.tipo_jp.startsWith('形容詞')) {
			const cq = createConjugationQuizQuestion(w, new Set(DEFAULT_KNOWN_FORMS));
			if (cq) qs.push(cq);
		}
		// Contatore
		if (w.id_contatore_suggerito) {
			const cq = createCounterQuestion(w, counters as Counter[], locale);
			if (cq) qs.push(cq);
		}
		queue = shuffle(qs);
		loading = false;
	}

	function choicesOf(q: QuizQuestion): string[] {
		return 'choices' in q && q.choices ? q.choices : [];
	}
	function correctOf(q: QuizQuestion): string {
		if ('correctChoice' in q) return q.correctChoice;
		if ('correctAnswer' in q) return q.correctAnswer;
		return '';
	}
	function promptOf(q: QuizQuestion): string {
		if (q.mode === 'conjugation') return `${q.dictionary} → ${q.formLabel}`;
		if (q.mode === 'counter-quiz') return `Contatore per ${q.prompt}`;
		if ('prompt' in q && q.prompt) return q.prompt;
		return '';
	}

	function pick(choice: string): void {
		if (picked !== null || !current) return;
		picked = choice;
		revealed = true;
		score = { ok: score.ok + (choice === correctOf(current) ? 1 : 0), tot: score.tot + 1 };
		if (word) speakWordReading(word);
	}

	function next(): void {
		if (idx + 1 >= queue.length) { build(); return; }
		idx += 1; picked = null; revealed = false;
	}

	onMount(build);
	$effect(() => { void wordId; build(); });
</script>

<div class="consolida">
	<div class="nav"><button class="back" onclick={() => history.back()}>← Indietro</button></div>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if !word}
		<p class="muted">Parola non trovata.</p>
	{:else}
		<header class="head">
			<h1>💪 Consolida: {word.scrittura}</h1>
			<p class="sub">Allenamento libero — non conta nei punteggi. {score.ok}/{score.tot}</p>
		</header>

		{#if current}
			<article class="card">
				<p class="qmode">{current.mode}</p>
				<p class="qprompt">{promptOf(current)}</p>
				<div class="choices">
					{#each choicesOf(current) as choice (choice)}
						<button
							class="choice"
							class:right={revealed && choice === correctOf(current)}
							class:wrong={picked === choice && choice !== correctOf(current)}
							disabled={picked !== null}
							onclick={() => pick(choice)}
						>{choice}</button>
					{/each}
				</div>
				{#if revealed}
					<button class="next" onclick={next}>{idx + 1 >= queue.length ? '🔁 Altro giro' : 'Avanti →'}</button>
				{/if}
			</article>
		{/if}

		<div class="meanings">
			{#each pickLocalizedArray(word.significato, locale) as m, i}<span>{i + 1}. {m}</span>{/each}
		</div>
	{/if}
</div>

<style>
	.consolida { display: grid; gap: 12px; }
	.nav { margin-bottom: 4px; }
	.back { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; cursor: pointer; color: var(--muted); }
	.head h1 { margin: 0; font-size: 1.2rem; }
	.sub { margin: 2px 0 0; font-size: 0.8rem; color: var(--muted); }
	.card { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 12px; }
	.qmode { margin: 0; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.qprompt { margin: 0; font-size: 1.5rem; font-weight: 700; text-align: center; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }
	.next { justify-self: end; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--brand); background: transparent; color: var(--brand); font-weight: 600; cursor: pointer; }
	.next:hover { background: var(--brand); color: #fff; }
	.meanings { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--muted); }
	.muted { color: var(--muted); }
</style>
