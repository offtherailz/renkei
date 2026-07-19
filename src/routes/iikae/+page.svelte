<script lang="ts">
	import { base } from '$app/paths';
	import { shuffle, pickRandom, findWord, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import raw from '../../../scripts/data/iikae-n5n4.json';

	interface Gruppo {
		parole: string[];
		senso: string;
	}
	interface Item {
		livello: string;
		frase: string;
		marcata: string;
		parola: string;
		opzioni: string[]; // la prima è quella corretta, si mescola a runtime
		traduzione?: string; // it — vale per frase E parafrasi corretta (stesso senso)
	}
	const GRUPPI = raw.gruppi as Gruppo[];
	const ITEMS = raw.items as Item[];

	// Un round: o un item frase (stile JLPT 言い換え類義) o una domanda
	// parola→sinonimo costruita dai gruppi.
	type Round =
		| { kind: 'frase'; item: Item; opzioni: string[]; corretta: string }
		| { kind: 'parola'; parola: string; senso: string; opzioni: string[]; corretta: string };

	const ROUNDS_PER_GAME = 10;

	function buildWordRound(): Round {
		const gs = shuffle(GRUPPI);
		const g = gs[0]!;
		const [prompt, corretta] = shuffle(g.parole);
		// esche: una parola da ciascuno di 3 altri gruppi
		const esche = gs.slice(1, 4).map((o) => pickRandom(o.parole));
		return { kind: 'parola', parola: prompt!, senso: g.senso, opzioni: shuffle([corretta!, ...esche]), corretta: corretta! };
	}

	function buildRounds(livello: 'N5' | 'N4' | 'tutti'): Round[] {
		const pool = ITEMS.filter((it) => livello === 'tutti' || it.livello === livello);
		const frasi: Round[] = shuffle(pool)
			.slice(0, 6)
			.map((item) => ({ kind: 'frase', item, opzioni: shuffle(item.opzioni), corretta: item.opzioni[0]! }));
		const parole: Round[] = Array.from({ length: ROUNDS_PER_GAME - frasi.length }, buildWordRound);
		return shuffle([...frasi, ...parole]);
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);

	function start(livello: 'N5' | 'N4' | 'tutti'): void {
		rounds = buildRounds(livello);
		idx = 0;
		score = 0;
		picked = null;
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	let detailHref = $state<string | null>(null);

	// Conserva la partita quando vai alla 📖 Scheda e torni con Indietro.
	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked, detailHref }),
		(s) => ({ scene, rounds, idx, score, picked, detailHref } = s)
	);

	async function pick(choice: string): Promise<void> {
		if (picked !== null) return;
		picked = choice;
		const r = cur();
		const parola = r.kind === 'frase' ? r.item.parola : r.corretta;
		const hit = await findWord(parola);
		detailHref = hit?.detailHref ?? null;
		if (choice === r.corretta) score += 1;
		// scelta discreta: delta pieno, successi E errori; il 言い換え è
		// recupero del significato → alimenta la cella 🎯 della parola
		if (hit && choice === r.corretta) await recordPractice('word:' + hit.id, true, 'facet_meaning_p');
	}

	function next(): void {
		picked = null;
		detailHref = null;
		if (idx < rounds.length - 1) idx += 1;
		else scene = 'done';
	}
</script>

<div class="iikae">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🔁 言い換え — Dillo in un altro modo</h1>
			<p class="hint">
				Come all'esame JLPT (言い換え類義): scegli la frase o la parola che ha <strong>lo stesso
				significato</strong>. Gli errori finiscono nei tuoi punti deboli.
			</p>
			<div class="levels">
				<button class="proceed" onclick={() => start('N5')}>N5</button>
				<button class="proceed" onclick={() => start('N4')}>N4</button>
				<button class="proceed" onclick={() => start('tutti')}>Tutti</button>
			</div>
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			{#if r.kind === 'frase'}
				<p class="hint">Quale frase ha lo stesso significato?</p>
				{#if picked !== null}
					<p class="prompt"><InteractiveSentence text={r.item.frase} mark={[r.item.marcata]} /></p>
				{:else}
					<!-- prima della risposta niente sottolineature/popup: le glosse
					     svelerebbero il significato — solo la parola in esame evidenziata -->
					{@const parts = r.item.frase.split(r.item.marcata)}
					<p class="prompt">{parts[0]}<span class="marked-static">{r.item.marcata}</span>{parts.slice(1).join(r.item.marcata)}</p>
				{/if}
			{:else}
				<p class="hint">Quale parola ha (quasi) lo stesso significato di…</p>
				<p class="prompt big">「{r.parola}」</p>
			{/if}
			<div class="choices">
				{#each r.opzioni as c, i (i)}
					<!-- niente `disabled` dopo la risposta: bloccava anche i tocchi
					     sulle parole di InteractiveSentence (popup morto — bug 17/07);
					     pick() ha già la guardia per i click ripetuti -->
					<button
						class="choice"
						class:right={picked !== null && c === r.corretta}
						class:wrong={picked === c && c !== r.corretta}
						class:answered={picked !== null}
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
			{#if picked !== null}
				{#if r.kind === 'parola'}
					<p class="sense">💡 senso comune: <strong>{r.senso}</strong></p>
				{:else if r.item.traduzione}
					<p class="sense">💬 significato (di entrambe): <strong>{r.item.traduzione}</strong></p>
				{/if}
				<div class="after">
					{#if detailHref}
						<a class="detail-link" href={detailHref}>📖 Scheda</a>
					{/if}
					<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
				</div>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le parole sbagliate sono nei tuoi punti deboli: le ritroverai nel piano di oggi.</p>
			<button class="proceed" onclick={() => (scene = 'intro')}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.iikae { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.86rem; color: var(--muted); }
	.prompt { margin: 0; text-align: center; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	/* stessa evidenza della marcata di InteractiveSentence, ma senza interattività */
	.marked-static { background: rgba(245, 158, 11, 0.22); border-radius: 4px; }
	.prompt.big { font-size: 1.5rem; font-weight: 700; }
	.levels { display: flex; gap: 10px; justify-content: center; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.02rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled):not(.answered) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }
	.sense { margin: 0; text-align: center; font-size: 0.86rem; color: var(--ink); }
	.after { display: flex; gap: 12px; justify-content: center; align-items: center; }
	.detail-link { color: var(--brand); font-weight: 600; text-decoration: none; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
