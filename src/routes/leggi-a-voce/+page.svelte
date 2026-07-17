<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { speechAvailable, listenJapanese, speechMatches, sentenceMatchVariants } from '$lib/core/speech';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import type { Dialogue } from '$lib/types/models';

	// 📢 Leggi a voce (beta): leggi TU la frase, ad alta voce — prima con i
	// furigana, poi senza. Il modello TTS si sente solo DOPO il tentativo
	// (è lettura, non ripetizione). Mic assente → autovalutazione.
	const ROUNDS_PER_GAME = 8;
	const ASSISTED_ROUNDS = 3; // i primi round hanno i furigana accesi
	const locale = detectUserLocale();

	interface Round {
		testo: string; // con notazione 漢字[よみ]
		plain: string;
		translation: string;
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let furiganaOn = $state(true);
	let answered = $state<null | boolean>(null);
	let scored = $state(false); // il punto conta solo il PRIMO tentativo del round
	let micBusy = $state(false);
	let heard = $state('');
	let canSpeak = $state(false);
	let loading = $state(true);
	let pool: Round[] = [];

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, furiganaOn, answered, heard }),
		(s) => ({ scene, rounds, idx, score, furiganaOn, answered, heard } = s)
	);

	onMount(async () => {
		canSpeak = speechAvailable();
		// fonti con la notazione furigana vera: righe dei dialoghi + esempi
		// delle forme grammaticali (mai furigana indovinata)
		const dialogues = (await db.dialogues.toArray()) as Dialogue[];
		// via le frasi non leggibili ad alta voce: frecce/simboli/lettere latine
		// (righe di scena tipo «A → B» non si possono pronunciare)
		const unreadable = /[→←↔⇒·・~〜*＊a-zA-Z0-9]/;
		for (const d of dialogues) {
			for (const r of d.righe ?? []) {
				if (!/\[[^\]]+\]/.test(r.testo)) continue; // serve i furigana
				const plain = stripFuriganaNotation(r.testo);
				if (plain.length < 8 || plain.length > 40 || unreadable.test(plain)) continue;
				const translation = pickLocalizedText(r.traduzione, locale);
				if (!translation) continue;
				pool.push({ testo: r.testo, plain, translation });
			}
		}
		for (const f of GRAMMAR_FORMS) {
			for (const ex of f.examples) {
				if (!/\[[^\]]+\]/.test(ex.jp)) continue;
				const plain = stripFuriganaNotation(ex.jp);
				if (plain.length < 8 || plain.length > 40 || unreadable.test(plain)) continue;
				pool.push({ testo: ex.jp, plain, translation: ex.it });
			}
		}
		loading = false;
	});

	function start(): void {
		rounds = shuffle(pool).slice(0, ROUNDS_PER_GAME);
		idx = 0;
		score = 0;
		scene = 'play';
		setupRound();
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	function setupRound(): void {
		answered = null;
		scored = false;
		heard = '';
		furiganaOn = idx < ASSISTED_ROUNDS; // assistita → autonoma
	}

	// 🔁 riprova la stessa frase (dopo l'esito): il punteggio resta quello del
	// primo tentativo, ma puoi rileggerla finché non ti suona giusta.
	function retry(): void {
		answered = null;
		heard = '';
	}

	async function tryRead(): Promise<void> {
		if (micBusy || answered !== null) return;
		micBusy = true;
		heard = '';
		const alts = await listenJapanese();
		micBusy = false;
		if (alts.length === 0) {
			heard = '（niente capito, riprova）';
			return;
		}
		heard = alts[0]!;
		finish(speechMatches(alts, [sentenceMatchVariants(cur().plain)]));
	}

	function finish(ok: boolean): void {
		answered = ok;
		if (!scored) {
			if (ok) score += 1;
			scored = true;
		}
		// dopo il tentativo senti il modello (prima no: è lettura, non eco)
		speakSentenceJapanese(cur().plain);
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			setupRound();
		} else {
			scene = 'done';
		}
	}
</script>

<div class="leggi">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">📢 Leggi a voce <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Leggi TU la frase ad alta voce: i primi round hanno i furigana, poi spariscono
				(puoi riaccenderli con 👁). Il modello audio lo senti solo dopo il tuo tentativo.
				Senza microfono ti autovaluti.
			</p>
			{#if loading}
				<p class="hint">Carico le frasi…</p>
			{:else}
				<button class="proceed" onclick={start}>はじめる</button>
			{/if}
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<div class="sentence-box" class:right={answered === true} class:wrong={answered === false}>
				{#if furiganaOn || answered !== null}
					<FuriganaText text={r.testo} force />
				{:else}
					{r.plain}
				{/if}
			</div>
			{#if answered === null}
				<button class="eye" onclick={() => (furiganaOn = !furiganaOn)}>
					{furiganaOn ? '🙈 Nascondi i furigana' : '👁 Mostra i furigana'}
				</button>
				{#if canSpeak}
					<button class="mic" class:listening={micBusy} disabled={micBusy} onclick={tryRead}>
						{micBusy ? '🎙️ Leggi ora!' : '🎤 Leggi ad alta voce'}
					</button>
					<HeardDiff {heard} candidates={[r.plain]} />
				{:else}
					<p class="hint">Leggi la frase ad alta voce, poi valutati:</p>
					<div class="self-row">
						<button class="self ok" onclick={() => finish(true)}>✅ Letta bene</button>
						<button class="self ko" onclick={() => finish(false)}>❌ Ho sbagliato</button>
					</div>
				{/if}
			{:else}
				<p class="who">{answered ? '✅ Bene!' : '❌ Confronta e riprova, se vuoi'}</p>
				{#if heard}
					<HeardDiff {heard} candidates={[r.plain]} />
				{/if}
				<p class="hint">{r.translation}</p>
				<div class="listen-row">
					<button class="listen" onclick={() => speakSentenceJapanese(r.plain)}>🔊 もう一度</button>
					<button class="listen" onclick={() => speakSentenceJapanese(r.plain, { rate: 0.6 })}>🐢 ゆっくり</button>
					<button class="listen" onclick={retry}>🔁 Riprova a leggerla</button>
				</div>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Rifalla con meno furigana: la lettura autonoma è l'obiettivo.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.leggi { display: grid; gap: 14px; }
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
	.sentence-box {
		text-align: center; font-size: 1.35rem; line-height: 2.2; padding: 18px 12px;
		background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 12px;
	}
	.sentence-box.right { border-color: var(--success); background: var(--ok-bg); }
	.sentence-box.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.eye { justify-self: center; border: none; background: none; color: var(--brand); font-weight: 600; font-size: 0.85rem; cursor: pointer; }
	.mic { justify-self: center; padding: 10px 18px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	.mic:disabled { opacity: 0.6; cursor: default; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
	.self-row { display: flex; gap: 10px; justify-content: center; }
	.self { padding: 9px 16px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); font-weight: 700; cursor: pointer; }
	.self.ok { border-color: var(--success); color: var(--success); }
	.self.ko { border-color: var(--danger); color: var(--danger); }
	.listen-row { display: flex; gap: 10px; justify-content: center; }
	.listen { padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
