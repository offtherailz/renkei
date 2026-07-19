<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches } from '$lib/core/speech';
	import { monthReading, dayReading, clockReading } from '$lib/core/counterGen';
	import HeardDiff from '$lib/components/HeardDiff.svelte';

	// 🗣️ Dì la data (beta): l'inverso di «Appuntamento» — la data/ora è SCRITTA,
	// tu la leggi a voce. Match tollerante: la lettura kana e la forma scritta
	// convergono in normalizeSpeech (さんがつここのか ↔ 3月9日). Regole standard:
	// la voce non penalizza (ritenti o riveli), credito solo positivo (counter).
	const ROUNDS_PER_GAME = 8;

	interface Round {
		kind: 'data' | 'ora';
		scritta: string; // quello che vedi (es. 3月9日 / 4時半)
		lettura: string; // lettura kana attesa
		counterId: string; // counter da accreditare al successo
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let outcome = $state<null | 'ok' | 'reveal'>(null);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	let canSpeak = $state(false);
	let attempts = $state(0);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, outcome }),
		(s) => ({ scene, rounds, idx, score, outcome } = s)
	);

	onMount(() => { canSpeak = speechAvailable(); });

	const R = (n: number) => 1 + Math.floor(Math.random() * n);

	function makeRound(): Round {
		if (Math.random() < 0.55) {
			const m = R(12);
			const d = R(28);
			return { kind: 'data', scritta: `${m}月${d}日`, lettura: monthReading(m) + dayReading(d), counterId: '日' };
		}
		const h = R(12);
		const mm = Math.floor(Math.random() * 60);
		const scritta = mm === 0 ? `${h}時` : mm === 30 ? `${h}時半` : `${h}時${mm}分`;
		return { kind: 'ora', scritta, lettura: clockReading(h, mm === 30 ? 30 : mm), counterId: '時' };
	}

	function start(): void {
		rounds = Array.from({ length: ROUNDS_PER_GAME }, makeRound);
		idx = 0;
		score = 0;
		outcome = null;
		heard = '';
		attempts = 0;
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	async function speakNow(): Promise<void> {
		if (micState !== 'idle' || outcome !== null) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (outcome !== null) return;
		if (alts.length === 0) { heard = '（何も聞こえませんでした…riprova）'; return; }
		heard = alts[0]!;
		const r = cur();
		// lettura kana + forma scritta: normalizeSpeech le fa convergere entrambe
		if (speechMatches(alts, [[r.lettura, r.scritta]])) {
			outcome = 'ok';
			score += 1;
			void recordPractice('counter:' + r.counterId, true);
			speakSentenceJapanese(r.lettura);
		} else {
			attempts += 1;
			// la voce non penalizza: puoi ritentare quante volte vuoi
		}
	}

	function reveal(): void {
		if (outcome !== null) return;
		outcome = 'reveal';
		speakSentenceJapanese(cur().lettura);
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			outcome = null;
			heard = '';
			attempts = 0;
		} else {
			scene = 'done';
		}
	}
</script>

<div class="dld">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🗣️ Dì la data <span class="beta-chip">beta</span></h1>
			<p class="hint">
				L'inverso di «Appuntamento»: la data (o l'ora) è <strong>scritta</strong>, tu la
				<strong>leggi a voce</strong> — native dei giorni comprese (9日 = ここのか!).
				Sbagliare a voce non penalizza: ritenta o rivela la lettura.
			</p>
			{#if canSpeak}
				<button class="proceed" onclick={start}>▶️ はじめる</button>
			{:else}
				<p class="hint warn">Serve un browser con riconoscimento vocale (Chrome) e https.</p>
			{/if}
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<p class="big-date">{r.scritta}</p>

			{#if outcome === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={speakNow}>
					{micState === 'listening' ? '🎙️ Ti ascolto…' : '🎤 Leggila a voce'}
				</button>
				<HeardDiff {heard} candidates={[r.lettura]} />
				{#if attempts >= 2}
					<button class="ghost" onclick={reveal}>👀 Rivela la lettura</button>
				{/if}
			{:else}
				<p class="who">{outcome === 'ok' ? '✅ Giusto!' : '📖 Si legge:'}</p>
				<p class="reading">{r.lettura}</p>
				<button class="listen" onclick={() => speakSentenceJapanese(r.lettura)}>🔊 もう一度</button>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.dld { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}
	.scene { background: var(--surface); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; justify-items: center; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.9rem; color: var(--muted); line-height: 1.6; }
	.hint.warn { color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 10px; padding: 10px; }
	.big-date { margin: 8px 0; font-size: 3rem; font-weight: 800; line-height: 1.1; }
	.reading { margin: 0; font-size: 1.5rem; font-weight: 700; }
	.mic { padding: 12px 24px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 1.05rem; cursor: pointer; }
	.mic.listening { border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
	.ghost { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.85rem; cursor: pointer; }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
