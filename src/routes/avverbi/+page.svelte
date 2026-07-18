<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from '$lib/core/i18n';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import type { Word } from '$lib/types/models';

	// 🎚️ Avverbi (副詞) — task 5: gli avverbi non avevano un drill di classe.
	// Cloze in frase: l'avverbio è cancellato dalla sua frase d'esempio, si sceglie
	// quello giusto fra 4 avverbi. Dopo la risposta: frase intera cliccabile,
	// traduzione, TTS. Credito su `word:<id>` facet_use (🧩 Usare) dell'avverbio.
	const ROUNDS_PER_GAME = 8;
	const BLANK = '＿＿＿';
	const locale = detectUserLocale();

	interface Round {
		word: Word;
		glossa: string;
		testo: string; // frase con l'avverbio cancellato
		traduzione: string;
		pieno: string; // frase intera (per rivelazione + TTS)
		corretta: string;
		scelte: string[];
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let loading = $state(true);
	let adverbs = $state<Word[]>([]);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked }),
		(s) => ({ scene, rounds, idx, score, picked } = s)
	);

	// Le forme di superficie con cui l'avverbio può comparire nella frase
	// (scrittura + lettura, separatori giapponesi inclusi: やはり／やっぱり).
	function surfaces(w: Word): string[] {
		const raw = [w.scrittura, w.lettura].filter(Boolean).join('・');
		return raw
			.split(/[・･／\/、,;；\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}

	onMount(async () => {
		const words = (await db.words.toArray()) as Word[];
		adverbs = words.filter((w) => (w.tipo_jp ?? '').startsWith('副詞') && (w.frasi_esempio?.length ?? 0) > 0);
		loading = false;
	});

	function buildRound(w: Word): Round | null {
		const forms = surfaces(w);
		for (const ex of shuffle(w.frasi_esempio ?? [])) {
			const form = forms.find((f) => ex.testo.includes(f));
			if (!form) continue;
			// distrattori: altri avverbi, superficie preferita per la resa
			const others = shuffle(adverbs.filter((a) => a.id !== w.id))
				.slice(0, 3)
				.map((a) => surfaces(a)[0] ?? a.scrittura);
			if (others.length < 3) return null;
			return {
				word: w,
				glossa: pickLocalizedArray(w.significato, locale)[0] ?? '',
				testo: ex.testo.replace(form, BLANK),
				traduzione: pickLocalizedText(ex.traduzione, locale),
				pieno: ex.testo,
				corretta: form,
				scelte: shuffle([form, ...others])
			};
		}
		return null;
	}

	function start(): void {
		const qs: Round[] = [];
		for (const w of shuffle(adverbs)) {
			if (qs.length >= ROUNDS_PER_GAME) break;
			const r = buildRound(w);
			if (r) qs.push(r);
		}
		rounds = qs;
		idx = 0;
		score = 0;
		picked = null;
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	async function pick(choice: string): Promise<void> {
		if (picked !== null) return;
		picked = choice;
		const r = cur();
		const ok = choice === r.corretta;
		if (ok) score += 1;
		await recordPractice('word:' + r.word.id, ok, 'facet_use');
		speakSentenceJapanese(r.pieno);
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			picked = null;
		} else {
			scene = 'done';
		}
	}
</script>

<div class="avverbi">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🎚️ Avverbi <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Gli avverbi (副詞: そろそろ, きっと, なかなか…) danno il colore alla frase.
				Qui manca l'avverbio: scegli quello giusto dal contesto. Dopo la risposta
				vedi la frase intera cliccabile, la traduzione e la ascolti.
			</p>
			{#if loading}
				<p class="hint">Carico gli avverbi…</p>
			{:else if adverbs.length < 4}
				<p class="hint">Servono più avverbi nel catalogo per questo gioco.</p>
			{:else}
				<button class="proceed" onclick={start}>はじめる</button>
			{/if}
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>

			{#if picked === null}
				<p class="prompt">{r.testo}</p>
				<p class="hint">Quale avverbio completa la frase?</p>
			{:else}
				<div class="reveal">
					<InteractiveSentence text={r.pieno} mark={[r.corretta]} />
					<p class="trad">💬 {r.traduzione}</p>
					<p class="gloss">🎚️ <strong>{r.corretta}</strong> — {r.glossa}</p>
					<button class="listen" onclick={() => speakSentenceJapanese(r.pieno)}>🔊 もう一度</button>
				</div>
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
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Gli errori alimentano l'uso (🧩) degli avverbi nei punti deboli.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.avverbi { display: grid; gap: 14px; }
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
	.prompt { margin: 0; text-align: center; font-size: 1.2rem; font-weight: 700; line-height: 1.7; }
	.reveal { display: grid; gap: 8px; justify-items: center; text-align: center; }
	.trad { margin: 0; font-size: 0.9rem; color: var(--muted); }
	.gloss { margin: 0; font-size: 0.95rem; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
