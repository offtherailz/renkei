<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { shuffle, pickRandom, gameSnapshot } from '$lib/core/gameKit';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';
	import { SITUATIONS, type UsefulPhrase } from '$lib/core/usefulPhrases';
	import { speakSentenceJapaneseAsync } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches, sentenceMatchVariants, normalizeSpeech } from '$lib/core/speech';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	interface DiffPart { text: string; kind: 'same' | 'miss' | 'extra' }

	function levenshtein(a: string, b: string): number {
		const m = a.length, n = b.length;
		let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
		for (let i = 1; i <= m; i += 1) {
			const row = [i];
			for (let j = 1; j <= n; j += 1) {
				row.push(a[i - 1] === b[j - 1] ? prevRow[j - 1]! : 1 + Math.min(prevRow[j - 1]!, prevRow[j]!, row[j - 1]!));
			}
			prevRow = row;
		}
		return prevRow[n]!;
	}

	// Diff a livello di carattere tra quello che hai detto e la frase attesa:
	// 'miss' = dovevi dirlo e non l'hai detto (barrato rosso, da aggiungere in
	// verde nella resa), 'extra' = hai detto qualcosa che non c'era (barrato
	// rosso), 'same' = combacia.
	function diffChars(said: string, expected: string): DiffPart[] {
		const m = said.length, n = expected.length;
		const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
		for (let i = 1; i <= m; i += 1) {
			for (let j = 1; j <= n; j += 1) {
				dp[i]![j] = said[i - 1] === expected[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
			}
		}
		const rev: DiffPart[] = [];
		let i = m, j = n;
		while (i > 0 && j > 0) {
			if (said[i - 1] === expected[j - 1]) { rev.push({ kind: 'same', text: said[i - 1]! }); i -= 1; j -= 1; }
			else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) { rev.push({ kind: 'extra', text: said[i - 1]! }); i -= 1; }
			else { rev.push({ kind: 'miss', text: expected[j - 1]! }); j -= 1; }
		}
		while (i > 0) { rev.push({ kind: 'extra', text: said[i - 1]! }); i -= 1; }
		while (j > 0) { rev.push({ kind: 'miss', text: expected[j - 1]! }); j -= 1; }
		rev.reverse();
		// unisce caratteri consecutivi dello stesso tipo in un unico span
		const parts: DiffPart[] = [];
		for (const part of rev) {
			const last = parts[parts.length - 1];
			if (last && last.kind === part.kind) last.text += part.text;
			else parts.push({ ...part });
		}
		return parts;
	}

	// Sceglie a quale forma (jp coi kanji, yomi in kana, o una variante) è più
	// vicino ciò che hai detto, così il confronto non mescola kanji e kana.
	function bestDiffTarget(said: string, candidates: string[]): string {
		const normSaid = normalizeSpeech(said);
		let best = candidates[0] ?? '';
		let bestDist = Infinity;
		for (const c of candidates) {
			const d = levenshtein(normSaid, normalizeSpeech(c));
			if (d < bestDist) { bestDist = d; best = c; }
		}
		return best;
	}

	const GAME_ID = 'shadowing';
	const ROUNDS_PER_GAME = 10;

	// Pool piatto di tutte le frasi utili, ognuna con la situazione di provenienza.
	interface Round {
		phrase: UsefulPhrase;
		situazione: string;
		emoji: string;
	}
	const POOL: Round[] = SITUATIONS.flatMap((s) => s.frasi.map((p) => ({ phrase: p, situazione: s.titolo, emoji: s.emoji })));

	function buildRounds(): Round[] {
		return shuffle(POOL).slice(0, ROUNDS_PER_GAME);
	}

	type Scene = 'intro' | 'play' | 'done';
	type Step = 'ready' | 'listening' | 'said' | 'revealed';

	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let streak = $state(0);
	let best = $state(0);
	let isRecord = $state(false);
	let gameOver = $state(false);

	let step = $state<Step>('ready');
	let canSpeak = $state(false);
	let heard = $state('');
	let lastOk = $state<boolean | null>(null);

	// Confronto detto/atteso solo quando ha senso mostrarlo (mic usato, non
	// riuscito capire qualcosa di significativo).
	const diffParts = $derived.by((): DiffPart[] => {
		if (!heard || step !== 'revealed' || rounds.length === 0) return [];
		const r = cur();
		const target = bestDiffTarget(heard, [r.phrase.jp, r.phrase.yomi, ...(r.phrase.varianti ?? [])]);
		return diffChars(heard, target);
	});

	onMount(() => {
		canSpeak = speechAvailable();
		best = getHighscore(GAME_ID);
	});

	// Conserva la partita quando vai alla 📖 Scheda (non serve qui, ma coerente
	// col pattern degli altri giochi) e torni con Indietro.
	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, streak, best, isRecord, gameOver, step, heard, lastOk }),
		(s) => ({ scene, rounds, idx, streak, best, isRecord, gameOver, step, heard, lastOk } = s)
	);

	function start(): void {
		rounds = buildRounds();
		idx = 0;
		streak = 0;
		best = getHighscore(GAME_ID);
		isRecord = false;
		gameOver = false;
		newRound();
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	function newRound(): void {
		step = 'ready';
		heard = '';
		lastOk = null;
	}

	// Ascolta la frase (TTS) e poi, subito dopo, attiva il microfono per la
	// ripetizione dell'utente — il cuore dello shadowing. Se il mic non è
	// disponibile, si ferma dopo l'ascolto e l'utente si autovaluta.
	// Riascolta l'audio senza rimettere in gioco il microfono: usato dopo il
	// riscontro, per non rifare un secondo tentativo che sovrascrive quello
	// già giudicato (era la causa del verdetto contraddittorio).
	async function replay(rate = 1): Promise<void> {
		await speakSentenceJapaneseAsync(cur().phrase.jp, { rate });
	}

	async function listenAndShadow(rate = 1): Promise<void> {
		if (step === 'listening' || step === 'revealed') return;
		const r = cur();
		heard = '';
		lastOk = null;
		await speakSentenceJapaneseAsync(r.phrase.jp, { rate });
		if (!canSpeak) {
			step = 'said';
			return;
		}
		step = 'listening';
		const alts = await listenJapanese();
		if (step !== 'listening') return; // il round è cambiato nel frattempo
		if (alts.length === 0) {
			heard = '（niente capito, riprova）';
			step = 'said';
			return;
		}
		heard = alts[0]!;
		const ok = speechMatches(alts, [sentenceMatchVariants(r.phrase.jp, r.phrase.yomi, ...(r.phrase.varianti ?? []))]);
		lastOk = ok;
		step = 'revealed';
		void registerResult(ok);
	}

	// Senza microfono (o se l'utente preferisce autovalutarsi): rivela la
	// frase e lascia che sia lui a giudicare la propria pronuncia.
	function revealSelf(ok: boolean): void {
		if (step === 'revealed') return;
		lastOk = ok;
		step = 'revealed';
		void registerResult(ok);
	}

	async function registerResult(ok: boolean): Promise<void> {
		const r = cur();
		if (!ok) await recordPracticeMiss('phrase:' + r.phrase.jp);
		if (ok) {
			streak += 1;
			if (streak > best) { best = streak; isRecord = true; }
		} else {
			gameOver = true;
			submitScore(GAME_ID, streak);
		}
	}

	function next(): void {
		if (gameOver) { start(); return; }
		if (idx < rounds.length - 1) {
			idx += 1;
			newRound();
		} else {
			submitScore(GAME_ID, streak);
			scene = 'done';
		}
	}
</script>

<div class="shadowing">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🗣️ Shadowing — Ripeti subito</h1>
			<p class="hint">
				Senti la frase, poi <strong>ripetila ad alta voce</strong> il più vicino possibile
				all'audio — ritmo e pronuncia, non solo le parole. Il microfono si attiva da solo
				appena finisce l'ascolto: non serve toccare nulla, parla e basta.
			</p>
			<p class="hint">La frase resta nascosta finché non hai provato: la vedi solo dopo, per il riscontro.</p>
			<p class="best">🏆 Record serie: {best}</p>
			<button class="proceed" onclick={start}>はじめる</button>
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — serie: {streak}</p>
			<p class="situazione">{r.emoji} {r.situazione}</p>

			{#if step === 'ready'}
				<p class="prompt-hidden">🔒 Ascolta e ripeti subito dopo</p>
				<div class="listen-actions">
					<button class="proceed" onclick={() => listenAndShadow()}>▶ Ascolta</button>
					<button class="mini" onclick={() => listenAndShadow(0.6)}>🐢 ゆっくり</button>
				</div>
			{:else if step === 'listening'}
				<p class="prompt-hidden">🔒 …</p>
				<button class="mic listening" disabled>🎙️ Ripeti ora!</button>
			{:else}
				<!-- said (senza mic) o revealed: mostra la frase per il riscontro -->
				<div class="reveal">
					<p class="p-jp"><InteractiveSentence text={r.phrase.jp} /></p>
					<p class="p-yomi">{r.phrase.yomi}</p>
					<p class="p-it">{r.phrase.it}</p>
				</div>
				{#if heard}
					<p class="heard-label">Hai detto:</p>
					{#if diffParts.length}
						<p class="diff-line">
							{#each diffParts as part, i (i)}
								{#if part.kind === 'same'}<span>{part.text}</span>
								{:else if part.kind === 'extra'}<span class="diff-extra">{part.text}</span>
								{:else}<span class="diff-miss">{part.text}</span>{/if}
							{/each}
						</p>
						<p class="diff-legend"><span class="diff-extra">rosso barrato</span> = detto per sbaglio o non richiesto · <span class="diff-miss">verde</span> = da aggiungere/correggere</p>
					{:else}
						<p class="heard-text">「{heard}」</p>
					{/if}
				{/if}

				{#if step === 'said'}
					<div class="listen-actions">
						<button class="mini" onclick={() => listenAndShadow()}>🔊 もう一度</button>
						<button class="mini" onclick={() => listenAndShadow(0.6)}>🐢 ゆっくり</button>
					</div>
					<p class="hint">Come è andata la tua ripetizione?</p>
					<div class="self-judge">
						<button class="judge ok" onclick={() => revealSelf(true)}>✓ Bene</button>
						<button class="judge ko" onclick={() => revealSelf(false)}>✗ Da rifare</button>
					</div>
				{:else}
					<p class="verdict" class:ok={lastOk} class:ko={!lastOk}>
						{lastOk ? (isRecord ? '🏆 Nuovo record!' : '✓ Bene detto!') : 'Non hai detto la frase giusta.'}
					</p>
					<div class="listen-actions">
						<button class="mini" onclick={() => replay()}>🔊 Risenti l'audio</button>
						<button class="proceed" onclick={next}>{gameOver ? '🔁 Ricomincia da capo' : idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
					</div>
				{/if}
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{streak === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{streak} / {rounds.length}</p>
			<p class="best">🏆 Record serie: {best}</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.shadowing { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); text-align: center; }
	.hint { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.best { margin: 0; text-align: center; font-size: 0.85rem; color: var(--brand); font-weight: 600; }
	.situazione { margin: 0; text-align: center; font-size: 0.8rem; color: var(--muted); font-weight: 600; }

	.prompt-hidden { margin: 0; text-align: center; font-size: 1.1rem; color: var(--muted); background: var(--surface-2); border-radius: 12px; padding: 22px 12px; }

	.listen-actions { display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap; }
	.mini { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 0.82rem; cursor: pointer; }
	.mini:hover { border-color: var(--brand); }

	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; cursor: default; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.reveal { display: grid; gap: 4px; text-align: center; background: var(--surface-2); border-radius: 12px; padding: 14px; }
	.p-jp { margin: 0; font-size: 1.3rem; font-weight: 700; }
	.p-yomi { margin: 0; font-size: 0.85rem; color: var(--brand); }
	.p-it { margin: 0; font-size: 0.92rem; color: var(--muted); }
	.heard-text { margin: 0; text-align: center; font-size: 0.8rem; color: var(--muted); }
	.heard-label { margin: 0; text-align: center; font-size: 0.75rem; color: var(--muted); font-weight: 600; }
	.diff-line { margin: 0; text-align: center; font-size: 1.1rem; line-height: 1.6; }
	.diff-extra { color: var(--danger); text-decoration: line-through; }
	.diff-miss { color: var(--success); font-weight: 700; }
	.diff-legend { margin: 0; text-align: center; font-size: 0.72rem; color: var(--muted); }

	.self-judge { display: flex; gap: 12px; justify-content: center; }
	.judge { padding: 10px 20px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.judge.ok { border-color: var(--success); color: var(--success); }
	.judge.ok:hover { background: var(--ok-bg); }
	.judge.ko { border-color: var(--danger); color: var(--danger); }
	.judge.ko:hover { background: var(--danger-bg); }

	.verdict { margin: 0; text-align: center; font-size: 0.95rem; font-weight: 600; min-height: 1.2em; }
	.verdict.ok { color: var(--success); }
	.verdict.ko { color: var(--danger); }

	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
