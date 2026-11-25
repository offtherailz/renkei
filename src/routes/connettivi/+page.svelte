<script lang="ts">
	import { base } from '$app/paths';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordGameResult, cleanOnEarlyExit, epicOnEarlyExit } from '$lib/core/gameBelts';
	import { recordPractice, recordPracticeMiss } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import raw from '$lib/data/connettivi.json';

	// 🔗 Connettivi (beta): due frasi legate da un connettivo. Le scelte sono di
	// funzione diversa (conseguenza / contrasto / aggiunta / sequenza…): l'indizio
	// è il rapporto fra le due frasi. Dopo la risposta: la funzione, il perché e
	// la frase completa da ascoltare. L'esito accredita il connettivo (🧩 Usare).

	interface Item {
		frase: string;
		it: string;
		scelte: string[];
		corretta: string;
		parola: string;
		funzione: string;
		perche: string;
	}
	const DATA = raw as { funzioni: Record<string, string>; items: Item[] };
	const ROUNDS_PER_GAME = 8;

	interface Round {
		item: Item;
		scelte: string[];
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked }),
		(s) => ({ scene, rounds, idx, score, picked } = s)
	);

	const piena = (it: Item): string => it.frase.replace('＿＿', it.corretta);

	function start(): void {
		rounds = shuffle(DATA.items)
			.slice(0, ROUNDS_PER_GAME)
			.map((item) => ({ item, scelte: shuffle(item.scelte) }));
		idx = 0;
		score = 0;
		picked = null;
		scene = 'play';
	}

	async function pick(choice: string): Promise<void> {
		if (picked !== null) return;
		picked = choice;
		const it = rounds[idx]!.item;
		const ok = choice === it.corretta;
		if (ok) {
			score += 1;
			await recordPractice(`word:${it.parola}`, true, 'facet_use');
		} else {
			await recordPracticeMiss(`word:${it.parola}`);
		}
		speakSentenceJapanese(piena(it));
	}

	function next(): void {
		picked = null;
		if (idx < rounds.length - 1) idx += 1;
		else {
			scene = 'done';
			recordGameResult('connettivi', score >= rounds.length - 1, score === rounds.length);
		}
	}

	function leaveEarly(): void {
		if (scene !== 'play') return;
		const attempted = picked !== null ? idx + 1 : idx;
		if (attempted === 0) return;
		recordGameResult('connettivi', cleanOnEarlyExit(score, attempted), epicOnEarlyExit(score, attempted));
	}
</script>

<div class="conn">
	<a class="back" href="{base}/giochi" onclick={leaveEarly}>← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🔗 Connettivi <span class="beta-chip">beta</span></h1>
			<p class="hint">
				それで o それでも? それに o それから? Due frasi e il connettivo che le lega: guarda il
				<strong>rapporto</strong> fra le due (conseguenza, contrasto, aggiunta, sequenza…) e scegli quello giusto.
			</p>
			<ul class="legend">
				{#each Object.values(DATA.funzioni) as f (f)}
					<li>{f}</li>
				{/each}
			</ul>
			<button class="proceed" onclick={start}>はじめる</button>
		</article>
	{:else if scene === 'play'}
		{#key idx}
			{@const r = rounds[idx]!}
			<article class="scene">
				<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
				<p class="frase">{r.item.frase}</p>
				<div class="choices">
					{#each r.scelte as c (c)}
						<button
							class="choice"
							class:right={picked !== null && c === r.item.corretta}
							class:wrong={picked === c && c !== r.item.corretta}
							disabled={picked !== null}
							onclick={() => pick(c)}>{c}</button
						>
					{/each}
				</div>
				{#if picked !== null}
					<p class="funz">{DATA.funzioni[r.item.funzione] ?? ''}</p>
					<div class="full">
						<InteractiveSentence text={piena(r.item)} />
						<button class="listen" onclick={() => speakSentenceJapanese(piena(r.item))}>🔊</button>
					</div>
					<p class="trad">💬 {r.item.it}</p>
					<p class="nota">💡 {r.item.perche}</p>
					<div class="after">
						<a class="detail-link" href="{base}/detail/{encodeURIComponent(`word:${r.item.parola}`)}">📖 {r.item.corretta}</a>
						<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
					</div>
				{/if}
			</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le risposte giuste rafforzano l'uso (🧩) del connettivo, quelle sbagliate lo mettono nei punti deboli.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.conn { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.scene { display: grid; gap: 12px; background: var(--surface); border-radius: 14px; padding: 16px; box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.beta-chip { font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--info-bg); color: var(--info-ink); vertical-align: middle; }
	.hint { margin: 0; font-size: 0.88rem; color: var(--muted); text-align: center; }
	.legend { margin: 0; padding-left: 1.1rem; font-size: 0.8rem; color: var(--ink); display: grid; gap: 2px; }
	.who { margin: 0; font-size: 0.8rem; color: var(--muted); text-align: center; }
	.frase { margin: 0; font-size: 1.2rem; line-height: 1.7; text-align: center; }
	.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.choice { min-height: 48px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); font-size: 1.1rem; font-weight: 600; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice.right { border-color: var(--success); background: var(--ok-bg); color: var(--ok-ink); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); color: var(--danger); }
	.choice:disabled { cursor: default; }
	.funz { margin: 0; font-weight: 700; font-size: 0.9rem; }
	.full { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 1.1rem; }
	.listen { border: 1px solid var(--line); background: var(--surface-2); border-radius: 8px; padding: 2px 8px; cursor: pointer; }
	.trad { margin: 0; font-size: 0.88rem; }
	.nota { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.after { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
	.detail-link { color: var(--brand); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
	.proceed { padding: 10px 18px; border-radius: 10px; border: none; background: var(--brand); color: var(--surface); font-weight: 700; cursor: pointer; justify-self: center; }
	.score-big { margin: 0; font-size: 2rem; font-weight: 800; text-align: center; }
</style>
