<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { createDefaultTokenizer } from '$lib/core/tokenizer';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import type { Word } from '$lib/types/models';

	// ✍️ Dettato (beta): ascolti una frase e la ricomponi col banco di pezzi.
	// Convenzioni: soluzione MAI visibile prima della risposta; もう一度 e 🐢;
	// l'esito accredita la parola della frase sulla cella 👂 (ascolto).
	const ROUNDS_PER_GAME = 8;
	const locale = detectUserLocale();

	interface Round {
		wordId: string;
		sentence: string; // testo pulito (senza notazione furigana)
		translation: string;
		chunks: string[]; // pezzi nell'ordine giusto
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let bank = $state<string[]>([]);
	let composed = $state<string[]>([]);
	let answered = $state<null | boolean>(null);
	let loading = $state(true);
	let pool: Round[] = [];

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, bank, composed, answered }),
		(s) => ({ scene, rounds, idx, score, bank, composed, answered } = s)
	);

	onMount(async () => {
		const tok = await createDefaultTokenizer();
		const words = (await db.words.toArray()) as Word[];
		for (const w of words) {
			for (const ex of w.frasi_esempio ?? []) {
				const sentence = stripFuriganaNotation(ex.testo).trim();
				if (sentence.length < 6 || sentence.length > 32) continue;
				// frasi N5 kana-spaziate: i pezzi sono gli spazi; altrimenti budoux
				const chunks = /[\s　]/.test(sentence)
					? sentence.split(/[\s　]+/).filter(Boolean)
					: tok.tokenize(sentence);
				if (chunks.length < 3 || chunks.length > 9) continue;
				const translation = pickLocalizedText(ex.traduzione, locale);
				if (!translation) continue;
				pool.push({ wordId: w.id, sentence, translation, chunks });
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
		composed = [];
		bank = shuffle([...cur().chunks]);
		speak();
	}

	function speak(slow = false): void {
		speakSentenceJapanese(cur().sentence, slow ? { rate: 0.6 } : undefined);
	}

	function pick(i: number): void {
		if (answered !== null) return;
		composed = [...composed, bank[i]!];
		bank = bank.filter((_, j) => j !== i);
	}

	function unpick(i: number): void {
		if (answered !== null) return;
		bank = [...bank, composed[i]!];
		composed = composed.filter((_, j) => j !== i);
	}

	async function confirm(): Promise<void> {
		if (answered !== null || bank.length > 0) return;
		const r = cur();
		const ok = composed.join('') === r.chunks.join('');
		answered = ok;
		if (ok) score += 1;
		// dettato = ascolto controllato: cella 👂 della parola della frase
		if (ok) await recordPractice(`word:${r.wordId}`, true, 'facet_form_listen');
		speakSentenceJapanese(r.sentence);
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

<div class="dettato">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">✍️ Dettato <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Ascolti una frase e la ricomponi coi pezzi in disordine — la frase non si vede
				finché non rispondi. Puoi riascoltarla quante volte vuoi (もう一度, anche 🐢 lenta).
				Allena l'ascolto fine: ogni particella conta.
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
			<div class="listen-row">
				<button class="listen" onclick={() => speak()}>🔊 もう一度</button>
				<button class="listen" onclick={() => speak(true)}>🐢 ゆっくり</button>
			</div>

			<div class="compose" class:right={answered === true} class:wrong={answered === false}>
				{#if composed.length === 0}
					<span class="placeholder">tocca i pezzi nell'ordine che senti…</span>
				{/if}
				{#each composed as c, i (i)}
					<button class="token picked" disabled={answered !== null} onclick={() => unpick(i)}>{c}</button>
				{/each}
			</div>

			{#if answered === null}
				<div class="bank">
					{#each bank as c, i (i)}
						<button class="token" onclick={() => pick(i)}>{c}</button>
					{/each}
				</div>
				<button class="proceed" disabled={bank.length > 0} onclick={confirm}>Conferma</button>
			{:else}
				<p class="who">{answered ? '✅ Giusto!' : '❌ Non era così'}</p>
				<p class="solution"><InteractiveSentence text={r.sentence} /></p>
				<p class="hint">{r.translation}</p>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le risposte giuste rafforzano l'ascolto (👂) — nei giochi gli errori non penalizzano.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.dettato { display: grid; gap: 14px; }
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
	.listen-row { display: flex; gap: 10px; justify-content: center; }
	.listen { padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; cursor: pointer; }
	.compose {
		min-height: 52px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
		background: var(--surface-2); border: 1.5px dashed var(--line); border-radius: 12px; padding: 10px;
	}
	.compose.right { border-color: var(--success); background: var(--ok-bg); }
	.compose.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.placeholder { font-size: 0.8rem; color: var(--muted); }
	.bank { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
	.token {
		padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--line);
		background: var(--surface); color: var(--ink); font-size: 1.05rem; cursor: pointer;
	}
	.token:hover:not(:disabled) { border-color: var(--brand); }
	.token.picked { background: var(--surface-2); }
	.solution { margin: 0; text-align: center; font-size: 1.15rem; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
</style>
