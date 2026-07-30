<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import { gameSnapshot } from '$lib/core/gameKit';
	import { recordGameResult, cleanOnEarlyExit, epicOnEarlyExit } from '$lib/core/gameBelts';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import { buildTransitiviPool, pickTransitiviRounds, type TransitiviRound } from '$lib/core/transitivi';
	import type { QuizContext } from '$lib/quiz/types';
	import type { Word } from '$lib/types/models';

	// ↔️ Transitivo o intransitivo? (beta): stessa frase, buco al posto del
	// verbo — il gemello della coppia (開ける/開く, 消す/消える…) è sempre tra
	// le scelte, coniugato nella stessa forma: la particella が/を appena prima
	// del buco è l'indizio. Riusa lo stesso motore del quiz principale
	// (createTransitivityPairQuestion), qui pescando solo tra le coppie
	// 自動詞/他動詞 invece che tra tutte le parole.

	const locale = detectUserLocale();
	const ROUNDS_PER_GAME = 8;

	let loading = $state(true);
	let pool = $state<TransitiviRound[]>([]);
	let wordsById = $state<Map<string, Word>>(new Map());

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<TransitiviRound[]>([]);
	let idx = $state(0);
	let picked = $state<string | null>(null);
	let correctCount = $state(0);
	let best = $state(0);
	let finalScore = $state(0);
	let isRecord = $state(false);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, picked, correctCount, finalScore, isRecord }),
		(s) => ({ scene, rounds, idx, picked, correctCount, finalScore, isRecord } = s)
	);

	onMount(async () => {
		const words = await db.words.toArray();
		const map = new Map(words.map((w) => [w.id, w]));
		wordsById = map;
		const context: QuizContext = { locale, wordsById: map, grammarById: new Map() };
		pool = buildTransitiviPool(words, context, locale);
		best = getHighscore('transitivi');
		loading = false;
	});

	function cur(): TransitiviRound {
		return rounds[idx]!;
	}

	function meaningLine(w: Word): string {
		const m = pickLocalizedArray(w.significato, locale)[0] ?? '';
		const kind = w.transitivita_jp?.split('[')[0] ?? '';
		return `${w.scrittura} = ${m}${kind ? ` (${kind})` : ''}`;
	}

	function detailHref(id: string): string {
		return `${base}/detail/${encodeURIComponent(`word:${id}`)}`;
	}

	function start(): void {
		rounds = pickTransitiviRounds(pool, ROUNDS_PER_GAME);
		idx = 0;
		picked = null;
		correctCount = 0;
		best = getHighscore('transitivi');
		scene = 'play';
	}

	async function choose(choice: string): Promise<void> {
		if (picked !== null) return;
		picked = choice;
		const r = cur();
		const ok = choice === r.question.correctChoice;
		if (ok) correctCount += 1;
		await recordPractice(`word:${r.wordId}`, ok, 'facet_use');
		if (ok) await recordPractice(`word:${r.pairId}`, true, 'facet_use');
		speakSentenceJapanese(r.question.fullSentence);
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			picked = null;
		} else {
			finalScore = correctCount;
			isRecord = submitScore('transitivi', finalScore);
			best = getHighscore('transitivi');
			scene = 'done';
			recordGameResult('transitivi', correctCount >= rounds.length - 1, correctCount === rounds.length);
		}
	}

	// Uscire con «← Giochi» a metà serie perdeva la cintura: si registrava
	// solo a fine sessione. Valuta sui round DAVVERO fatti finora.
	function leaveEarly(): void {
		if (scene !== 'play') return;
		const attempted = picked !== null ? idx + 1 : idx;
		if (attempted === 0) return;
		recordGameResult('transitivi', cleanOnEarlyExit(correctCount, attempted), epicOnEarlyExit(correctCount, attempted));
	}
</script>

<div class="trans">
	<a class="back" href="{base}/giochi" onclick={leaveEarly}>← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">↔️ Transitivo o intransitivo? <span class="beta-chip">beta</span></h1>
			<p class="hint">
				開ける o 開く? 消す o 消える? Stessa frase, un buco al posto del verbo: il gemello
				della coppia è sempre tra le scelte, coniugato uguale. Guarda cosa c'è appena prima
				del buco — が (succede da sé) o を (qualcuno lo fa) — ed è quasi fatta.
			</p>
			{#if loading}
				<p class="hint">Caricamento…</p>
			{:else if pool.length === 0}
				<p class="hint">Nessuna coppia disponibile al momento.</p>
			{:else}
				<button class="proceed" onclick={start}>はじめる</button>
				<p class="record">🏆 Record: {best}</p>
			{/if}
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — corrette: {correctCount}</p>
			<p class="prompt ja-sentence">{picked !== null ? r.question.fullSentence : r.question.sentenceWithBlank}</p>
			<div class="choices">
				{#each r.question.choices as c (c)}
					<button
						class="choice"
						class:right={picked !== null && c === r.question.correctChoice}
						class:wrong={picked === c && c !== r.question.correctChoice}
						class:answered={picked !== null}
						disabled={picked !== null}
						onclick={() => choose(c)}
					>{c}</button>
				{/each}
			</div>

			{#if picked !== null}
				<div class="reveal">
					<p class="who">{picked === r.question.correctChoice ? '✅ Giusto!' : '❌ Non era così'}</p>
					<p class="hint">{r.question.translation}</p>
					{#if wordsById.get(r.wordId) && wordsById.get(r.pairId)}
						<p class="nota">💡 {meaningLine(wordsById.get(r.wordId)!)}; {meaningLine(wordsById.get(r.pairId)!)}.</p>
					{/if}
					<button class="listen" onclick={() => speakSentenceJapanese(r.question.fullSentence)}>🔊 もう一度</button>
					<div class="after">
						<a class="detail-link" href={detailHref(r.wordId)}>📖 {r.question.correctChoice}</a>
						<a class="detail-link" href={detailHref(r.pairId)}>📖 {wordsById.get(r.pairId)?.scrittura ?? ''}</a>
					</div>
				</div>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{correctCount === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{finalScore}</p>
			<p class="hint">Corrette: {correctCount}/{rounds.length} · 🏆 record: {best}{isRecord ? ' — nuovo record!' : ''}</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.trans { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.prompt { margin: 0; text-align: center; background: var(--surface-2); border-radius: 12px; padding: 14px; font-size: 1.1rem; font-weight: 600; }
	.record { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.15rem; text-align: center; cursor: pointer; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.reveal { display: grid; gap: 8px; justify-items: center; text-align: center; }
	.nota { margin: 0; text-align: center; font-size: 0.85rem; color: var(--info-ink); background: var(--info-bg); border-radius: 10px; padding: 8px 12px; }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.after { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }
	.detail-link { color: var(--brand); font-weight: 600; text-decoration: none; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
