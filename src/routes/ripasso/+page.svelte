<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { createInitialSrs, applyPracticeReview } from '$lib/core/srs';
	import { detectUserLocale } from '$lib/core/i18n';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { loadWeakItems, type WeakItem } from '$lib/db/queries';
	import {
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createConjugationQuizQuestion,
		createCounterDrillQuestion,
		createParticleClozeQuestion,
		createGrammarQuestion,
		shuffle
	} from '$lib/quiz/engine';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import { choicesOf, correctOf, promptOf } from '$lib/quiz/questionView';
	import { DEFAULT_KNOWN_FORMS, conjClassKey } from '$lib/core/conjugation';
	import type { Word, Counter } from '$lib/types/models';
	import type { QuizContext, DistractorIndex, QuizQuestion } from '$lib/quiz/types';

	// Ripasso punti deboli: una sessione che ITERA gli item più deboli
	// (parole, coniugazione, particelle, contatori, grammatica, kanji) invece
	// del consolida su un item solo — retrieval practice + interleaving.
	// Solo pratica: muove il mastery degli item, niente XP, niente stage.

	const locale = detectUserLocale();
	const ROUND = 12; // item per giro, i più deboli

	interface Step {
		q: QuizQuestion;
		target: string; // id_item SRS da accreditare
		label: string; // cosa stai allenando (es. "Particella に")
		icon: string;
	}

	let steps = $state<Step[]>([]);
	let idx = $state(0);
	let picked = $state<string | null>(null);
	let score = $state({ ok: 0, tot: 0 });
	let round = $state(1);
	let loading = $state(true);
	let empty = $state(false);

	let context: QuizContext | null = null;
	let distractors: DistractorIndex | null = null;
	let words: Word[] = [];
	let counters: Counter[] = [];

	const current = $derived(steps[idx] ?? null);
	const done = $derived(!loading && !empty && idx >= steps.length);

	const KIND_ICONS: Record<string, string> = {
		word: '📦', grammar: '📖', counter: '🔢', kanji: '漢', conj: '🔄', particella: '🪝'
	};

	async function questionFor(item: WeakItem): Promise<QuizQuestion | null> {
		if (!context || !distractors) return null;
		if (item.kind === 'word') {
			const w = context.wordsById.get(item.raw);
			if (!w) return null;
			const gens: (() => QuizQuestion | null)[] = [
				() => createMultipleChoiceQuestion(w, context!, distractors!),
				() => createFlashcardRecognitionQuestion(w, locale, distractors!, context!)
			];
			if (w.kanji_usati.length > 0 && w.scrittura !== w.lettura) {
				gens.push(() => createFlashcardReadingRecognitionQuestion(w, locale, distractors!, context!));
			}
			if (w.tipo_jp.startsWith('動詞') || w.tipo_jp.startsWith('形容詞')) {
				gens.push(() => createConjugationQuizQuestion(w, new Set(DEFAULT_KNOWN_FORMS)));
			}
			return shuffle(gens)[0]!() ?? gens[0]!();
		}
		if (item.kind === 'kanji') {
			const withKanji = words.filter((w) => w.kanji_usati.includes(item.raw));
			const w = shuffle(withKanji)[0];
			return w ? createMultipleChoiceQuestion(w, context, distractors) : null;
		}
		if (item.kind === 'counter') {
			const c = counters.find((x) => x.id === item.raw);
			return c ? createCounterDrillQuestion(c) : null;
		}
		if (item.kind === 'conj') {
			const pool = shuffle(words.filter((w) => conjClassKey(w) === `conj:${item.raw}`));
			for (const w of pool.slice(0, 6)) {
				const q = createConjugationQuizQuestion(w, new Set(DEFAULT_KNOWN_FORMS));
				if (q) return q;
			}
			return null;
		}
		if (item.kind === 'particella') {
			// il generatore usa la prima frase d'esempio della parola: itero su
			// parole diverse finché il buco non è proprio questa particella
			const pool = shuffle(words.filter((w) => w.frasi_esempio?.length));
			for (const w of pool.slice(0, 40)) {
				const q = await createParticleClozeQuestion(w, locale);
				if (q?.correctChoice === item.raw) return q;
			}
			return null;
		}
		if (item.kind === 'grammar') {
			const g = await db.grammar.get(item.raw);
			const example = g?.frasi_esempio?.length
				? g.frasi_esempio[Math.floor(Math.random() * g.frasi_esempio.length)]
				: null;
			if (!g || !example) return null;
			const q = await createGrammarQuestion({ grammar: g, example }, distractors, g.livello_jlpt, context, locale);
			return q.mode === 'cloze' || q.mode === 'reading-choice' ? q : null;
		}
		return null; // phrase: pratica a voce, ha il suo drill dedicato
	}

	async function build(): Promise<void> {
		loading = true;
		idx = 0;
		picked = null;
		if (!context) {
			const [w, c] = await Promise.all([db.words.toArray(), db.counters.toArray()]);
			words = w;
			counters = c as Counter[];
			context = { locale, wordsById: new Map(w.map((x) => [x.id, x])), grammarById: new Map() };
			distractors = await preloadDistractorIndex();
		}
		const weak = (await loadWeakItems()).filter((it) => it.kind !== 'phrase');
		if (weak.length === 0) {
			empty = true;
			loading = false;
			return;
		}
		const out: Step[] = [];
		for (const item of weak.slice(0, ROUND * 2)) {
			if (out.length >= ROUND) break;
			const q = await questionFor(item);
			if (!q) continue;
			const target = item.kind === 'word' ? `word:${item.raw}` : `${item.kind}:${item.raw}`;
			out.push({ q, target, label: item.label, icon: KIND_ICONS[item.kind] ?? '❓' });
		}
		steps = out;
		empty = out.length === 0;
		loading = false;
	}

	async function recordPractice(target: string, correct: boolean): Promise<void> {
		const existing = await db.srs_progress.get(target);
		const updated = applyPracticeReview(existing ?? createInitialSrs(target), correct);
		await db.srs_progress.put(updated);
	}

	function pick(choice: string): void {
		if (picked !== null || !current) return;
		picked = choice;
		const correct = choice === correctOf(current.q);
		score = { ok: score.ok + (correct ? 1 : 0), tot: score.tot + 1 };
		void recordPractice(current.target, correct);
		const m = current.q.mode;
		if (m === 'particle-cloze') speakSentenceJapanese(current.q.fullSentence);
		else if (m === 'conjugation' || m === 'counter-reading' || m === 'flashcard-reading-recognition' || m === 'flashcard-recognition') {
			speakSentenceJapanese(correctOf(current.q));
		}
	}

	function next(): void {
		idx += 1;
		picked = null;
	}

	function anotherRound(): void {
		round += 1;
		score = { ok: 0, tot: 0 };
		void build();
	}

	onMount(() => void build());
</script>

<div class="ripasso">
	<div class="nav"><a class="back" href="{base}/punti-deboli">← Punti deboli</a></div>

	{#if loading}
		<p class="muted">Preparo il giro di ripasso…</p>
	{:else if empty}
		<p class="muted">Nessun punto debole da ripassare. 🎉</p>
	{:else if done}
		<article class="card summary">
			<h1>🔁 Giro {round} completato</h1>
			<p class="score-line">{score.ok}/{score.tot} corrette</p>
			<p class="muted">La lista dei punti deboli si è già riordinata con questi risultati.</p>
			<div class="choices">
				<button class="next" onclick={anotherRound}>🔁 Un altro giro</button>
				<a class="choice linkbtn" href="{base}/punti-deboli">Rivedi la lista</a>
			</div>
		</article>
	{:else if current}
		<header class="head">
			<h1>🔁 Ripasso punti deboli</h1>
			<p class="sub">Domanda {idx + 1}/{steps.length} — solo pratica, niente XP. {score.ok}/{score.tot}</p>
		</header>

		<article class="card">
			<p class="training">{current.icon} Stai allenando: <strong>{current.label}</strong></p>
			<p class="qprompt">{promptOf(current.q)}</p>
			<div class="choices">
				{#each choicesOf(current.q) as choice (choice)}
					<button
						class="choice"
						class:right={picked !== null && choice === correctOf(current.q)}
						class:wrong={picked === choice && choice !== correctOf(current.q)}
						disabled={picked !== null}
						onclick={() => pick(choice)}
					>
						{choice}
					</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="next" onclick={next}>Avanti →</button>
			{/if}
		</article>
	{/if}
</div>

<style>
	.ripasso { display: grid; gap: 12px; }
	.nav { display: flex; }
	.back { font-size: 0.85rem; color: var(--muted); text-decoration: none; }
	.head h1 { margin: 0; font-size: 1.2rem; }
	.sub { margin: 2px 0 0; font-size: 0.8rem; color: var(--muted); }
	.card { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
	.training { margin: 0; font-size: 0.8rem; color: var(--muted); }
	.qprompt { margin: 0; font-size: 1.15rem; font-weight: 700; }
	.choices { display: grid; gap: 8px; }
	.choice {
		padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line);
		background: var(--surface); color: var(--ink); font-size: 1rem; cursor: pointer; text-align: left;
	}
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.linkbtn { text-decoration: none; text-align: center; }
	.next {
		padding: 10px 12px; border-radius: 10px; border: none;
		background: var(--brand); color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer;
	}
	.summary h1 { margin: 0; font-size: 1.2rem; }
	.score-line { margin: 0; font-size: 1.4rem; font-weight: 800; }
	.muted { color: var(--muted); font-size: 0.9rem; }
</style>
