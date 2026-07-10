<script lang="ts">
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import {
		READING_TEXTS,
		instantiate,
		type JlptLevel,
		type ReadingRun
	} from '$lib/core/readingTexts';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

	type Scene = 'level' | 'question' | 'scan' | 'over';
	let scene = $state<Scene>('level');
	let level = $state<JlptLevel>('N5');
	let run = $state<ReadingRun | null>(null);
	let question = $state<{ q: string; choices: string[]; correct: number; evidence?: string } | null>(null);
	let lastTextId = '';
	let streak = $state(0);
	let best = $state(0);
	let picked = $state<number | null>(null);
	let timedOut = $state(false);

	// tempo per round: proporzionale al testo, si stringe man mano che la serie sale
	const SCAN_CPS = 10; // caratteri/secondo concessi per la scansione
	let budget = $state(20);
	let timeLeft = $state(20);
	let ticker: ReturnType<typeof setInterval> | null = null;

	function bestKey(l: JlptLevel): string {
		return `renkei-skim-best-${l}`;
	}
	function loadBest(l: JlptLevel): number {
		const n = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(bestKey(l)) : 0);
		return Number.isFinite(n) ? n : 0;
	}
	function saveBest(): void {
		try {
			localStorage.setItem(bestKey(level), String(best));
		} catch {
			/* niente storage: pazienza */
		}
	}

	function pickLevel(l: JlptLevel): void {
		level = l;
		best = loadBest(l);
		streak = 0;
		nextRound();
	}

	function nextRound(): void {
		const pool = READING_TEXTS.filter((t) => t.livello === level && t.id !== lastTextId);
		const text = rnd(pool);
		lastTextId = text.id;
		run = instantiate(text);
		question = rnd(run.questions);
		picked = null;
		timedOut = false;
		const shrink = Math.max(0.55, 1 - streak * 0.05);
		budget = Math.max(6, Math.round(((run.rendered.length / SCAN_CPS) * shrink + 3) * 10) / 10);
		scene = 'question';
	}

	function startScan(): void {
		scene = 'scan';
		timeLeft = budget;
		clearTicker();
		ticker = setInterval(() => {
			timeLeft -= 0.1;
			if (timeLeft <= 0) {
				timeLeft = 0;
				timedOut = true;
				gameOver();
			}
		}, 100);
	}
	function clearTicker(): void {
		if (ticker) clearInterval(ticker);
		ticker = null;
	}
	onDestroy(clearTicker);

	function answer(i: number): void {
		if (picked !== null || !question) return;
		clearTicker();
		picked = i;
		if (i === question.correct) {
			streak += 1;
			if (streak > best) {
				best = streak;
				saveBest();
			}
		} else {
			gameOver();
		}
	}
	function gameOver(): void {
		clearTicker();
		scene = 'over';
	}
</script>

<div class="skim">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if scene !== 'level'}
			<span class="lvl-chip">{level} · Serie: <strong>{streak}</strong> · 🏆 {best}</span>
		{/if}
	</div>

	{#if scene === 'level'}
		<article class="scene">
			<h1 class="page-title">🔎 Skimming</h1>
			<p class="hint">
				Prima leggi la domanda, poi appare il testo: trova l'informazione prima che scada il
				tempo. Più vai avanti, meno tempo hai. Un errore e la serie riparte.
			</p>
			<div class="choices plat">
				<button class="choice" onclick={() => pickLevel('N5')}>🌱 N5</button>
				<button class="choice" onclick={() => pickLevel('N4')}>🌿 N4</button>
			</div>
		</article>
	{:else if scene === 'question' && run && question}
		<article class="scene">
			<p class="who">❓ Cosa devi trovare ({run.text.tipo}: {run.text.titolo})</p>
			<p class="bubble big">{question.q}</p>
			<p class="hint">Avrai ⏱️ {Math.round(budget)} secondi. Pronto?</p>
			<button class="proceed" onclick={startScan}>🔎 Trova! →</button>
		</article>
	{:else if scene === 'scan' && run && question}
		<article class="scene">
			<div class="progress timer"><div class="bar" style="width:{(timeLeft / budget) * 100}%"></div></div>
			<p class="q-recall">❓ {question.q}</p>
			<p class="fulltext-body">{run.plain}</p>
			<div class="choices">
				{#each question.choices as c, i (c)}
					<button
						class="choice"
						class:right={picked !== null && i === question.correct}
						class:wrong={picked === i && i !== question.correct}
						disabled={picked !== null}
						onclick={() => answer(i)}
					>{c}</button>
				{/each}
			</div>
			{#if picked !== null && picked === question.correct}
				<button class="proceed" onclick={nextRound}>✅ Prossimo →</button>
			{/if}
		</article>
	{:else if scene === 'over' && run && question}
		<article class="scene">
			<p class="who">{timedOut ? '⏰ Tempo scaduto!' : '❌ Sbagliato!'}</p>
			<p class="score-big">Serie: {streak}</p>
			<p class="hint">🏆 Record {level}: {best}</p>
			<p class="bubble sm">❓ {question.q} → <strong>{question.choices[question.correct]}</strong></p>
			<div class="fulltext">
				<p class="script-title">📄 Il testo (la frase evidenziata aveva la risposta)</p>
				<InteractiveSentence text={run.rendered} mark={question.evidence ? [question.evidence] : []} />
			</div>
			<div class="over-actions">
				<button class="proceed" onclick={() => { streak = 0; nextRound(); }}>🔁 Ricomincia</button>
				<button class="mini" onclick={() => (scene = 'level')}>Cambia livello</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.skim { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.lvl-chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.big { font-size: 1.25rem; }
	.bubble.sm { font-size: 0.95rem; }
	.q-recall { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--brand); }
	.fulltext-body { margin: 0; font-size: 1.02rem; line-height: 1.9; }
	.fulltext { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 6px; }
	.script-title { margin: 0; font-size: 0.85rem; font-weight: 700; }

	.progress { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
	.progress .bar { height: 100%; background: #f59e0b; transition: width 0.1s linear; }

	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success, #16a34a); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger, #dc2626); background: rgba(239,107,107,0.16); }

	.score-big { margin: 0; text-align: center; font-size: 2.2rem; font-weight: 800; }
	.over-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
