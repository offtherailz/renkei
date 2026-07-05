<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import { speakWordReading, speakSentenceJapanese } from '$lib/core/tts';
	import {
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createConjugationQuizQuestion,
		createCounterQuestion,
		createTransitivityPairQuestion,
		createGrammarQuestion,
		shuffle
	} from '$lib/quiz/engine';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import { DEFAULT_KNOWN_FORMS } from '$lib/core/conjugation';
	import { blankSentence } from '$lib/core/usage';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import type { Word, Counter } from '$lib/types/models';
	import type { QuizContext, DistractorIndex, QuizQuestion } from '$lib/quiz/types';

	const locale = detectUserLocale();
	const wordId = $derived($page.params.id ?? '');

	let word = $state<Word | null>(null);
	let kanjiChar = $state<string | null>(null);
	let grammarMode = $state(false);
	let title = $state('');
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
		word = null; kanjiChar = null; grammarMode = false;

		const [words, counters] = await Promise.all([db.words.toArray(), db.counters.toArray()]);
		const context: QuizContext = {
			locale,
			wordsById: new Map(words.map((x) => [x.id, x])),
			grammarById: new Map()
		};
		const distractors: DistractorIndex = await preloadDistractorIndex();

		// id può essere bare (parola/kanji) o prefissato (grammar:...)
		const [kind, ...rest] = wordId.includes(':') ? wordId.split(':') : ['auto', wordId];
		const rawId = wordId.includes(':') ? rest.join(':') : wordId;

		// Grammatica: micro-drill con le domande grammaticali (cloze/reading).
		if (kind === 'grammar') {
			const g = await db.grammar.get(rawId);
			if (g && g.frasi_esempio?.length) {
				grammarMode = true;
				title = g.struttura;
				const qs: QuizQuestion[] = [];
				for (let i = 0; i < 8 && qs.length < 5; i += 1) {
					const example = g.frasi_esempio[Math.floor(Math.random() * g.frasi_esempio.length)]!;
					const q = await createGrammarQuestion({ grammar: g, example }, distractors, g.livello_jlpt, context, locale);
					if (q.mode === 'cloze' || q.mode === 'reading-choice') qs.push(q);
				}
				queue = qs;
			}
			loading = false;
			return;
		}

		const w = await db.words.get(rawId);
		if (w) {
			word = w;
			title = w.scrittura;
			queue = shuffle(buildWordQuestions(w, context, distractors, counters as Counter[]));
			loading = false;
			return;
		}

		// Kanji: drill sulle parole in catalogo che usano questo kanji.
		const k = await db.kanji.get(rawId);
		if (k) {
			kanjiChar = k.id;
			title = k.id;
			const withKanji = words.filter((x) => x.kanji_usati.includes(k.id));
			const qs: QuizQuestion[] = [];
			for (const x of shuffle(withKanji).slice(0, 8)) {
				qs.push(
					Math.random() < 0.5
						? createMultipleChoiceQuestion(x, context, distractors)
						: createFlashcardRecognitionQuestion(x, locale, distractors, context)
				);
			}
			queue = qs;
			loading = false;
			return;
		}

		loading = false;
	}

	function buildWordQuestions(
		w: Word,
		context: QuizContext,
		distractors: DistractorIndex,
		counters: Counter[]
	): QuizQuestion[] {
		const qs: QuizQuestion[] = [];
		qs.push(createMultipleChoiceQuestion(w, context, distractors)); // diretto JP→IT
		qs.push(createFlashcardRecognitionQuestion(w, locale, distractors, context)); // inverso IT→JP
		const usage = usageQuestion(w, context); // prova d'uso: parola oscurata nella sua frase
		if (usage) qs.push(usage);
		if (w.kanji_usati.length > 0 && w.scrittura !== w.lettura) {
			qs.push(createFlashcardReadingRecognitionQuestion(w, locale, distractors, context));
		}
		if (w.tipo_jp.startsWith('動詞') || w.tipo_jp.startsWith('形容詞')) {
			// più forme di coniugazione (fino a 2 distinte)
			const seen = new Set<string>();
			for (let i = 0; i < 4 && seen.size < 2; i += 1) {
				const cq = createConjugationQuizQuestion(w, new Set(DEFAULT_KNOWN_FORMS));
				if (cq && !seen.has(cq.formLabel)) { seen.add(cq.formLabel); qs.push(cq); }
			}
		}
		if (w.id_verbo_corrispondente) {
			// transitività in contesto (se c'è una frase) o riconoscimento del gemello
			const tq = w.frasi_esempio?.length ? createTransitivityPairQuestion(w, context, locale) : null;
			if (tq) qs.push(tq);
			const rel = relationQuestion(w, [w.id_verbo_corrispondente], context,
				w.transitivita_jp?.startsWith('他') ? "verbo intransitivo corrispondente" : "verbo transitivo corrispondente");
			if (rel) qs.push(rel);
		}
		const syn = relationQuestion(w, w.sinonimi ?? [], context, 'sinonimo');
		if (syn) qs.push(syn);
		const ant = relationQuestion(w, w.contrari ?? [], context, 'contrario');
		if (ant) qs.push(ant);
		if (w.id_contatore_suggerito) {
			const cq = createCounterQuestion(w, counters, locale);
			if (cq) qs.push(cq);
		}
		return qs;
	}

	// Prova d'uso: la parola oscurata nella sua frase d'esempio, distrattori
	// dello stesso tipo. Riusa la forma flashcard (prompt = frase col buco).
	function usageQuestion(w: Word, context: QuizContext): QuizQuestion | null {
		const ex = w.frasi_esempio?.[0];
		if (!ex) return null;
		const sentence = stripFuriganaNotation(ex.testo);
		const blanked = blankSentence(sentence, w.scrittura);
		if (!blanked) return null;
		const pool = [...context.wordsById.values()].filter(
			(x) => x.id !== w.id && x.tipo_jp === w.tipo_jp
		);
		const distractors = shuffle(pool).slice(0, 3).map((x) => x.scrittura);
		if (distractors.length < 2) return null;
		return {
			mode: 'flashcard-recognition',
			wordId: w.id,
			prompt: `Completa: ${blanked}`,
			promptLanguage: 'ja',
			choices: shuffle([w.scrittura, ...distractors]),
			correctAnswer: w.scrittura,
			warningMultipleDefinitions: false
		};
	}

	// Domanda a scelta: "Quale è il <relazione> di X?" — corretta = una parola
	// collegata, distrattori dello stesso tipo. Riusa la forma FlashcardQuestion
	// (prompt in IT, opzioni in JP) così il TTS legge la risposta giusta.
	function relationQuestion(
		w: Word,
		relatedIds: string[],
		context: QuizContext,
		label: string
	): QuizQuestion | null {
		const target = relatedIds.map((id) => context.wordsById.get(id)).find((x) => x);
		if (!target) return null;
		const pool = [...context.wordsById.values()].filter(
			(x) => x.id !== w.id && x.id !== target.id && x.tipo_jp === w.tipo_jp
		);
		const distractors = shuffle(pool).slice(0, 3).map((x) => x.scrittura);
		if (distractors.length < 2) return null;
		const gloss = pickLocalizedArray(w.significato, locale)[0] ?? '';
		return {
			mode: 'flashcard-recognition',
			wordId: w.id,
			prompt: `${label} di ${w.scrittura}${gloss ? ` (${gloss})` : ''}`,
			promptLanguage: locale,
			choices: shuffle([target.scrittura, ...distractors]),
			correctAnswer: target.scrittura,
			warningMultipleDefinitions: false
		};
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
		if (q.mode === 'transitivity-pair') return q.sentenceWithBlank;
		if (q.mode === 'cloze') return `Completa: ${q.sentenceWithBlank.replace(/<[^>]*>/g, '')}`;
		if (q.mode === 'reading-choice') return `Come si legge «${q.targetText}»? ${q.plainSentence}`;
		if ('prompt' in q && q.prompt) return q.prompt;
		return '';
	}

	function pick(choice: string): void {
		if (picked !== null || !current) return;
		picked = choice;
		revealed = true;
		score = { ok: score.ok + (choice === correctOf(current) ? 1 : 0), tot: score.tot + 1 };
		// per coniugazione/transitività leggi la forma corretta, non la parola base
		const m = current.mode;
		if (m === 'conjugation' || m === 'transitivity-pair' || m === 'flashcard-recognition' || m === 'flashcard-reading-recognition') {
			speakSentenceJapanese(correctOf(current));
		} else if (word) {
			speakWordReading(word);
		}
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
	{:else if !word && !kanjiChar && !grammarMode}
		<p class="muted">Elemento non trovato.</p>
	{:else}
		<header class="head">
			<h1>💪 Consolida: {title}</h1>
			<p class="sub">
				{kanjiChar ? 'Parole con questo kanji in studio' : grammarMode ? 'Uso della forma grammaticale' : 'Allenamento libero'} — non conta nei punteggi. {score.ok}/{score.tot}
			</p>
		</header>

		{#if current}
			{#key idx}
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
			{/key}
		{:else if kanjiChar}
			<p class="muted">Nessuna parola in catalogo con {kanjiChar}.</p>
		{:else if grammarMode}
			<p class="muted">Nessuna domanda generabile per questa forma.</p>
		{/if}

		{#if word}
			<div class="meanings">
				{#each pickLocalizedArray(word.significato, locale) as m, i}<span>{i + 1}. {m}</span>{/each}
			</div>
		{/if}
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
