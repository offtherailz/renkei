<script lang="ts">
	import { base } from '$app/paths';
	import { gameSnapshot } from '$lib/core/gameKit';
	import { recordGameResult, MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT } from '$lib/core/gameBelts';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
	import { buildRounds, computeScore, type Round } from '$lib/core/certezza';

	// 🎲 Quanto sei sicuro? (beta): でしょう/かもしれない/かな/はず/そう/らしい/
	// みたい/っぽい/に違いない — stessa frase base, 4 costruzioni diverse: solo
	// una si adatta alla FONTE di certezza del contesto dato. L'esito accredita
	// gram:<slug> (visibile in /forme-composte).

	// Indizio dell'Aiuto: il "summary" della costruzione giusta dal catalogo
	// (/forme-composte), senza svelare QUALE bottone è — solo la sfumatura da cercare.
	function hintFor(slug: string): string {
		return GRAMMAR_FORMS.find((f) => f.slug === slug)?.summary ?? '';
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let picked = $state<number | null>(null);
	let correctCount = $state(0);
	let hintsUsed = $state(0);
	let showReason = $state(false);
	let best = $state(0);
	let finalScore = $state(0);
	let isRecord = $state(false);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, picked, correctCount, hintsUsed, showReason, finalScore, isRecord }),
		(s) => ({ scene, rounds, idx, picked, correctCount, hintsUsed, showReason, finalScore, isRecord } = s)
	);

	function cur(): Round {
		return rounds[idx]!;
	}

	function start(): void {
		rounds = buildRounds();
		idx = 0;
		picked = null;
		correctCount = 0;
		hintsUsed = 0;
		showReason = false;
		best = getHighscore('certezza');
		scene = 'play';
	}

	async function choose(i: number): Promise<void> {
		if (picked !== null) return;
		picked = i;
		const r = cur();
		const opt = r.options[i]!;
		if (opt.correct) correctCount += 1;
		await recordPractice('gram:' + r.situation.slug, opt.correct);
		speakSentenceJapanese(r.options[r.correctIndex]!.jp);
	}

	function useHint(): void {
		if (showReason) return;
		showReason = true;
		hintsUsed += 1;
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			picked = null;
			showReason = false;
		} else {
			finalScore = computeScore(rounds.length, correctCount, hintsUsed);
			isRecord = submitScore('certezza', finalScore);
			best = getHighscore('certezza');
			scene = 'done';
			recordGameResult('certezza', correctCount === rounds.length && hintsUsed === 0, correctCount === rounds.length && hintsUsed === 0);
		}
	}

	// Uscire con «← Giochi» a metà serie perdeva la cintura: si registrava
	// solo a fine sessione. Valuta sui round DAVVERO fatti finora.
	function leaveEarly(): void {
		if (scene !== 'play') return;
		const attempted = picked !== null ? idx + 1 : idx;
		if (attempted === 0) return;
		const clean = attempted >= MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT && correctCount === attempted && hintsUsed === 0;
		recordGameResult('certezza', clean, clean);
	}
</script>

<div class="cert">
	<a class="back" href="{base}/giochi" onclick={leaveEarly}>← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🎲 Quanto sei sicuro? <span class="beta-chip">beta</span></h1>
			<p class="hint">
				でしょう, かもしれない, かな, はず, そう, らしい, みたい, っぽい, に違いない…
				si traducono quasi tutte con «forse/sembra», ma la fonte della certezza è diversa:
				previsione, dubbio, pensiero interiore, deduzione logica, sentito dire, impressione
				visiva, tratto caratteriale, certezza forte. Il contesto ti dice quale ci vuole.
			</p>
			<button class="proceed" onclick={start}>はじめる</button>
			<p class="record">🏆 Record: {best}</p>
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — corrette: {correctCount}</p>
			<p class="prompt">💬 {r.situation.contextIt}</p>
			<div class="choices">
				{#each r.options as o, i (i)}
					<button
						class="choice"
						class:right={picked !== null && o.correct}
						class:wrong={picked === i && !o.correct}
						class:answered={picked !== null}
						disabled={picked !== null}
						onclick={() => choose(i)}
					>{o.jp}</button>
				{/each}
			</div>

			{#if picked === null}
				{#if showReason}
					<p class="reason">💡 Cerchi: {hintFor(r.situation.slug)}</p>
				{:else}
					<button class="hint-btn" onclick={useHint}>💡 Aiuto</button>
				{/if}
			{/if}

			{#if picked !== null}
				<div class="reveal">
					<p class="who">{r.options[picked]!.correct ? '✅ Giusto!' : '❌ Non era così'}</p>
					<div class="reveal-line"><InteractiveSentence text={r.options[r.correctIndex]!.jp} /></div>
					<p class="hint">{r.situation.revealIt}</p>
					{#if !r.options[picked]!.correct && r.options[picked]!.reason}
						<p class="reason">☝️ {r.options[picked]!.reason}</p>
					{/if}
					<button class="listen" onclick={() => speakSentenceJapanese(r.options[r.correctIndex]!.jp)}>🔊 もう一度</button>
				</div>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{correctCount === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{finalScore}</p>
			<p class="hint">Corrette: {correctCount}/{rounds.length} · aiuti usati: {hintsUsed} · 🏆 record: {best}{isRecord ? ' — nuovo record!' : ''}</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.cert { display: grid; gap: 14px; }
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
	.prompt { margin: 0; text-align: center; font-size: 1.05rem; font-weight: 600; line-height: 1.6; }
	.record { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: center; cursor: pointer; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.hint-btn { justify-self: center; padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.hint-btn:disabled { opacity: 0.4; cursor: default; }
	.reveal { display: grid; gap: 8px; justify-items: center; text-align: center; }
	.reveal-line { font-size: 1.15rem; }
	.reason { margin: 0; text-align: center; font-size: 0.85rem; color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 10px; padding: 8px 12px; }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
