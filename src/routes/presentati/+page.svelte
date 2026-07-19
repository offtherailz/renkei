<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { INTRO_ITEMS } from '$lib/core/presentazione';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches, sentenceMatchVariants } from '$lib/core/speech';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';

	interface Round {
		situazione: string;
		opzioni: string[];
		corretta: string;
	}

	const ROUNDS_PER_GAME = 8;

	function buildRounds(): Round[] {
		return shuffle(INTRO_ITEMS)
			.slice(0, ROUNDS_PER_GAME)
			.map((it) => ({ situazione: it.situazione, opzioni: shuffle(it.opzioni), corretta: it.opzioni[0]! }));
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let canSpeak = $state(false);
	let micBusy = $state(false);
	let heard = $state('');

	onMount(() => {
		canSpeak = speechAvailable();
	});

	// Conserva la partita quando vai alla 💪 Consolida e torni con Indietro.
	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked }),
		(s) => ({ scene, rounds, idx, score, picked } = s)
	);

	function start(): void {
		rounds = buildRounds();
		idx = 0;
		score = 0;
		picked = null;
		heard = '';
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	async function trySay(): Promise<void> {
		if (micBusy || picked !== null) return;
		micBusy = true;
		heard = '';
		const alts = await listenJapanese();
		micBusy = false;
		if (alts.length === 0) {
			heard = '（niente capito, riprova）';
			return;
		}
		heard = alts[0]!;
		const r = cur();
		if (speechMatches(alts, [sentenceMatchVariants(r.corretta)])) {
			await pick(r.corretta);
		}
	}

	async function pick(choice: string): Promise<void> {
		if (picked !== null) return;
		picked = choice;
		const r = cur();
		if (choice === r.corretta) {
			score += 1;
		}
		if (choice === r.corretta) await recordPractice('phrase:' + r.corretta, true);
		speakSentenceJapanese(r.corretta);
	}

	function next(): void {
		picked = null;
		heard = '';
		if (idx < rounds.length - 1) idx += 1;
		else scene = 'done';
	}
</script>

<div class="presentati">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🙋 Presentati — Primo incontro</h1>
			<p class="hint">
				Ti presenti per la prima volta: cosa dici, come reagisci se ti fanno un
				complimento sul tuo giapponese, e come reagisci se una domanda ti sfugge
				— ripetere? rallentare? scrivere? Scegli la mossa giusta per ogni momento.
			</p>
			<button class="proceed" onclick={start}>はじめる</button>
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<p class="hint">{r.situazione}</p>
			<div class="choices">
				{#each r.opzioni as c (c)}
					<button
						class="choice"
						class:right={picked !== null && c === r.corretta}
						class:wrong={picked === c && c !== r.corretta}
						disabled={picked !== null}
						onclick={() => pick(c)}
					>
						{#if picked !== null}
							<InteractiveSentence text={c} />
						{:else}
							{c}
						{/if}
					</button>
				{/each}
			</div>
			{#if picked === null && canSpeak}
				<button class="mic" class:listening={micBusy} disabled={micBusy} onclick={trySay}>
					{micBusy ? '🎙️ Parla!' : '🎤 Prova a dirla'}
				</button>
				<HeardDiff {heard} candidates={[r.corretta]} />
			{/if}
			{#if picked !== null}
				<div class="after">
					<a class="detail-link" href="{base}/consolida/{encodeURIComponent('phrase:' + r.corretta)}">💪 Consolida</a>
					<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
				</div>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le frasi sbagliate sono nei tuoi punti deboli.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.presentati { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); text-align: center; }
	.hint { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.02rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.after { display: flex; gap: 12px; justify-content: center; align-items: center; }
	.detail-link { color: var(--brand); font-weight: 600; text-decoration: none; }
	.mic { justify-self: center; padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	.mic:disabled { opacity: 0.5; cursor: default; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
