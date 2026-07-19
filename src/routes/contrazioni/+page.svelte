<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import type { Word } from '$lib/types/models';

	// ✂️ Contrazioni (beta): forme contratte del parlato ↔ forme estese.
	// Direzione mista: a volte dalla contratta trovi l'estesa, a volte il contrario.
	// Regole standard: mic opzionale (di' la risposta), la voce non penalizza mai;
	// il credito va alla parola base (cella Usare 🧩) quando è in catalogo.
	const ROUNDS_PER_GAME = 8;

	interface Pair { contratta: string; estesa: string; it: string; parola?: string }
	// Coppie concrete sui pattern di 縮約形 (grammarForms slug 'contrazioni').
	const PAIRS: Pair[] = [
		{ contratta: '食べちゃった', estesa: '食べてしまった', it: 'ho finito per mangiarlo (ops)', parola: '食べる' },
		{ contratta: '忘れちゃった', estesa: '忘れてしまった', it: 'mi sono dimenticato (purtroppo)', parola: '忘れる' },
		{ contratta: '飲んじゃった', estesa: '飲んでしまった', it: 'ho finito per berlo', parola: '飲む' },
		{ contratta: '読んじゃった', estesa: '読んでしまった', it: "l'ho letto tutto", parola: '読む' },
		{ contratta: '行かなきゃ', estesa: '行かなければならない', it: 'devo andare', parola: '行く' },
		{ contratta: '起きなきゃ', estesa: '起きなければならない', it: 'devo alzarmi', parola: '起きる' },
		{ contratta: '勉強しなくちゃ', estesa: '勉強しなくてはいけない', it: 'devo studiare', parola: '勉強する' },
		{ contratta: '帰らなくちゃ', estesa: '帰らなくてはいけない', it: 'devo tornare a casa', parola: '帰る' },
		{ contratta: '買っとく', estesa: '買っておく', it: 'lo compro in anticipo', parola: '買う' },
		{ contratta: '予約しとく', estesa: '予約しておく', it: 'prenoto in anticipo', parola: '予約する' },
		{ contratta: '冷やしといた', estesa: '冷やしておいた', it: "l'ho messo in fresco (in anticipo)", parola: '冷やす' },
		{ contratta: '食べてる', estesa: '食べている', it: 'sto mangiando', parola: '食べる' },
		{ contratta: '待ってる', estesa: '待っている', it: 'sto aspettando', parola: '待つ' },
		{ contratta: '住んでる', estesa: '住んでいる', it: 'ci abito', parola: '住む' },
		{ contratta: '知ってる', estesa: '知っている', it: 'lo so / lo conosco', parola: '知る' },
		{ contratta: '持ってく', estesa: '持っていく', it: 'lo porto (con me)', parola: '持つ' },
		{ contratta: '連れてく', estesa: '連れていく', it: 'lo porto (una persona)', parola: '連れる' },
		{ contratta: '田中さんって人', estesa: '田中さんという人', it: 'una persona chiamata Tanaka' },
		{ contratta: 'ラーメンっておいしいね', estesa: 'ラーメンというのはおいしいね', it: 'il ramen (come categoria) è buono, eh' }
	];

	type Dir = 'to-estesa' | 'to-contratta';
	interface Round {
		pair: Pair;
		dir: Dir;
		domanda: string;
		corretta: string;
		scelte: string[];
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	let wordIdByForm = new Map<string, string>();

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked }),
		(s) => ({ scene, rounds, idx, score, picked } = s)
	);

	onMount(async () => {
		canSpeak = speechAvailable();
		const words = (await db.words.toArray()) as Word[];
		for (const w of words) wordIdByForm.set(w.scrittura, w.id);
	});

	function buildRound(p: Pair, dir: Dir): Round {
		const corretta = dir === 'to-estesa' ? p.estesa : p.contratta;
		const pool = PAIRS.filter((x) => x !== p).map((x) => (dir === 'to-estesa' ? x.estesa : x.contratta));
		return {
			pair: p,
			dir,
			domanda: dir === 'to-estesa' ? p.contratta : p.estesa,
			corretta,
			scelte: shuffle([corretta, ...shuffle(pool).slice(0, 3)])
		};
	}

	function start(): void {
		rounds = shuffle(PAIRS)
			.slice(0, ROUNDS_PER_GAME)
			.map((p, i) => buildRound(p, i % 2 === 0 ? 'to-estesa' : 'to-contratta'));
		idx = 0;
		score = 0;
		picked = null;
		heard = '';
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	async function pick(choice: string, viaVoce = false): Promise<void> {
		if (picked !== null) return;
		const r = cur();
		// la voce non penalizza: una pronuncia non riconosciuta non "sceglie" mai
		if (viaVoce && choice !== r.corretta) return;
		picked = choice;
		const ok = choice === r.corretta;
		if (ok) {
			score += 1;
			const wid = r.pair.parola ? wordIdByForm.get(r.pair.parola) : undefined;
			if (wid) void recordPractice('word:' + wid, true, 'facet_use');
		}
		speakSentenceJapanese(r.corretta);
	}

	// Di' la risposta: match solo sulla corretta (dire altro non penalizza).
	async function speakAnswer(): Promise<void> {
		if (micState !== 'idle' || picked !== null) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (picked !== null) return;
		if (alts.length === 0) { heard = '（何も聞こえませんでした…riprova）'; return; }
		heard = alts[0]!;
		const r = cur();
		if (speechMatches(alts, [[...phraseVariants(r.corretta), r.corretta]])) void pick(r.corretta, true);
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			picked = null;
			heard = '';
		} else {
			scene = 'done';
		}
	}
</script>

<div class="ctr">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">✂️ Contrazioni <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Il parlato accorcia: 食べてしまった → 食べちゃった, 行かなければならない → 行かなきゃ.
				Qui ti alleni nei due sensi: dalla forma contratta risali all'estesa (scritto/esame)
				e viceversa. Puoi anche <strong>dire la risposta a voce</strong> 🎤.
			</p>
			<button class="proceed" onclick={start}>はじめる</button>
			<a class="explain-link" href="{base}/forme/contrazioni">📖 La scheda delle contrazioni</a>
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<p class="hint">{r.dir === 'to-estesa' ? 'Qual è la forma ESTESA (scritto/esame)?' : 'Come si accorcia nel PARLATO?'}</p>
			<p class="prompt">{r.domanda}</p>

			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={speakAnswer}>
					{micState === 'listening' ? '🎙️ Ti ascolto…' : '🎤 Dilla a voce'}
				</button>
				<HeardDiff {heard} candidates={[r.corretta]} />
			{/if}

			<div class="choices">
				{#each r.scelte as c, i (i)}
					<button
						class="choice"
						class:right={picked !== null && c === r.corretta}
						class:wrong={picked === c && c !== r.corretta}
						class:answered={picked !== null}
						onclick={() => pick(c)}
					>{c}</button>
				{/each}
			</div>

			{#if picked !== null}
				<div class="reveal">
					<p class="pair-line">{r.pair.contratta} ＝ {r.pair.estesa}</p>
					<p class="hint">💬 {r.pair.it}</p>
					<button class="listen" onclick={() => speakSentenceJapanese(r.corretta)}>🔊 もう一度</button>
				</div>
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
	.ctr { display: grid; gap: 14px; }
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
	.prompt { margin: 0; text-align: center; font-size: 1.5rem; font-weight: 700; line-height: 1.6; }
	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: center; cursor: pointer; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.reveal { display: grid; gap: 6px; justify-items: center; text-align: center; }
	.pair-line { margin: 0; font-size: 1.1rem; font-weight: 700; }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.explain-link { justify-self: center; font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
