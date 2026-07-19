<script lang="ts">
	import { base } from '$app/paths';
	import { shuffle, findWord, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import raw from '$lib/data/coppie-n5n4.json';

	// 🔀 Coppie difficili (beta, 18/07): parole legate ma NON interscambiabili
	// (妻/奥さん, 着る/はく, 切符/切手…) — il contesto forza una delle due, il
	// «perché» spiega la differenza. Rispondere bene = saperle distinguere:
	// l'esito accredita ENTRAMBE le parole (idea utente: potenzia la coppia).
	interface Item {
		a: string;
		b: string;
		domanda: string;
		corretta: string;
		perche: string;
	}
	const ITEMS = (raw as { items: Item[] }).items;
	const ROUNDS_PER_GAME = 8;

	interface Round {
		item: Item;
		scelte: string[]; // le due parole, mescolate
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let detailA = $state<string | null>(null);
	let detailB = $state<string | null>(null);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked, detailA, detailB }),
		(s) => ({ scene, rounds, idx, score, picked, detailA, detailB } = s)
	);

	// la scrittura mostrata: via i disambiguatori degli id (私::わたし → 私)
	function label(id: string): string {
		return id.split('::')[0]!.split('-')[0]!;
	}

	function start(): void {
		rounds = shuffle(ITEMS)
			.slice(0, ROUNDS_PER_GAME)
			.map((item) => ({ item, scelte: shuffle([item.a, item.b]) }));
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
		const ok = choice === r.item.corretta;
		if (ok) score += 1;
		// doppio incremento: distinguere la coppia allena ENTRAMBE le parole
		if (ok) {
			await recordPractice(`word:${r.item.a}`, true, 'facet_use');
			await recordPractice(`word:${r.item.b}`, true, 'facet_use');
		}
		const [ha, hb] = await Promise.all([findWord(label(r.item.a)), findWord(label(r.item.b))]);
		detailA = ha?.detailHref ?? null;
		detailB = hb?.detailHref ?? null;
		speakSentenceJapanese(label(r.item.corretta));
	}

	function next(): void {
		picked = null;
		detailA = null;
		detailB = null;
		if (idx < rounds.length - 1) idx += 1;
		else scene = 'done';
	}
</script>

<div class="coppie">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🔀 Coppie difficili <span class="beta-chip">beta</span></h1>
			<p class="hint">
				妻 o 奥さん? 切符 o 切手? 熱い o 暑い? Parole legate ma NON interscambiabili:
				il contesto ne forza una sola. Dopo la risposta, il perché della differenza.
			</p>
			<button class="proceed" onclick={start}>はじめる</button>
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<p class="prompt">{r.item.domanda}</p>
			<div class="choices two">
				{#each r.scelte as c, i (i)}
					<button
						class="choice big"
						class:right={picked !== null && c === r.item.corretta}
						class:wrong={picked === c && c !== r.item.corretta}
						class:answered={picked !== null}
						onclick={() => pick(c)}
					>{label(c)}</button>
				{/each}
			</div>
			{#if picked !== null}
				<p class="nota">💡 {r.item.perche}</p>
				<div class="after">
					{#if detailA}<a class="detail-link" href={detailA}>📖 {label(r.item.a)}</a>{/if}
					{#if detailB}<a class="detail-link" href={detailB}>📖 {label(r.item.b)}</a>{/if}
					<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
				</div>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Rispondere bene rafforza ENTRAMBE le parole della coppia — nei giochi gli errori non penalizzano.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.coppie { display: grid; gap: 14px; }
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
	.prompt { margin: 0; text-align: center; background: var(--surface-2); border-radius: 12px; padding: 14px; font-size: 1rem; font-weight: 600; }
	.choices.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
	.choice.big {
		padding: 18px 10px; border-radius: 12px; border: 1.5px solid var(--line);
		background: var(--surface-2); color: var(--ink); font-size: 1.5rem; font-weight: 700;
		text-align: center; cursor: pointer;
	}
	.choice.big:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.nota { margin: 0; text-align: center; font-size: 0.85rem; color: var(--info-ink); background: var(--info-bg); border-radius: 10px; padding: 8px 12px; }
	.after { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }
	.detail-link { color: var(--brand); font-weight: 600; text-decoration: none; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
