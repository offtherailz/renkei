<script lang="ts">
	import { base } from '$app/paths';
	import { shuffle, pickRandom, findWord, gameSnapshot } from '$lib/core/gameKit';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';
	import { KEIGO_VERBS, KEIGO_ITEMS } from '$lib/core/keigo';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	// Un round: o "verbo → forma keigo giusta" o una frase situazionale.
	type Round =
		| { kind: 'verbo'; prompt: string; glossa: string; tipo: '尊敬語' | '謙譲語'; opzioni: string[]; corretta: string; parola?: string }
		| { kind: 'frase'; situazione: string; opzioni: string[]; corretta: string; parola?: string };

	const ROUNDS_PER_GAME = 10;

	function buildVerbRound(): Round {
		const withBoth = KEIGO_VERBS.filter((v) => v.sonkeigo || v.kenjougo);
		const v = pickRandom(withBoth);
		const tipi = (['尊敬語', '謙譲語'] as const).filter((t) => (t === '尊敬語' ? v.sonkeigo : v.kenjougo));
		const tipo = pickRandom(tipi);
		const target = tipo === '尊敬語' ? v.sonkeigo! : v.kenjougo!;
		// esche: la forma "gemella" sbagliata dello stesso verbo + forme di altri verbi
		const esche = new Set<string>();
		const twin = tipo === '尊敬語' ? v.kenjougo?.forma : v.sonkeigo?.forma;
		if (twin) esche.add(twin);
		for (const o of shuffle(KEIGO_VERBS)) {
			for (const f of [o.sonkeigo?.forma, o.kenjougo?.forma]) {
				if (f && f !== target.forma && esche.size < 3) esche.add(f);
			}
		}
		return {
			kind: 'verbo',
			prompt: v.plain,
			glossa: v.glossa,
			tipo,
			opzioni: shuffle([target.forma, ...esche]),
			corretta: target.forma,
			parola: target.parola
		};
	}

	function buildRounds(): Round[] {
		const frasi: Round[] = shuffle(KEIGO_ITEMS)
			.slice(0, 5)
			.map((it) => ({ kind: 'frase', situazione: it.situazione, opzioni: shuffle(it.opzioni), corretta: it.opzioni[0]!, parola: it.parola }));
		const verbi: Round[] = [];
		const seen = new Set<string>();
		while (verbi.length < ROUNDS_PER_GAME - frasi.length) {
			const r = buildVerbRound();
			const key = r.kind === 'verbo' ? r.prompt + r.tipo : '';
			if (seen.has(key)) continue;
			seen.add(key);
			verbi.push(r);
		}
		return shuffle([...frasi, ...verbi]);
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let detailHref = $state<string | null>(null);

	// Conserva la partita quando vai alla 📖 Scheda e torni con Indietro.
	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, picked, detailHref }),
		(s) => ({ scene, rounds, idx, score, picked, detailHref } = s)
	);

	function start(): void {
		rounds = buildRounds();
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
		detailHref = null;
		if (r.parola) {
			const hit = await findWord(r.parola);
			if (hit) {
				detailHref = hit.detailHref;
				if (choice !== r.corretta) await recordPracticeMiss('word:' + hit.id);
			}
		}
		if (choice === r.corretta) score += 1;
	}

	function next(): void {
		picked = null;
		detailHref = null;
		if (idx < rounds.length - 1) idx += 1;
		else scene = 'done';
	}
</script>

<div class="keigo">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🙇 敬語 — Il linguaggio cortese</h1>
			<p class="hint">
				尊敬語 eleva le azioni <strong>degli altri</strong> (capo, cliente); 謙譲語 abbassa
				le <strong>tue</strong>. Scegli la forma o la frase giusta per la situazione: gli
				errori finiscono nei tuoi punti deboli.
			</p>
			<button class="proceed" onclick={start}>はじめる</button>
		</article>
	{:else if scene === 'play'}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			{#if r.kind === 'verbo'}
				<p class="hint">Qual è il <strong>{r.tipo}</strong> di…</p>
				<p class="prompt big">「{r.prompt}」 <span class="glossa">({r.glossa})</span></p>
			{:else}
				<p class="hint">{r.situazione}</p>
				<p class="prompt small">Quale frase è quella giusta?</p>
			{/if}
			<div class="choices">
				{#each r.opzioni as c (c)}
					<button
						class="choice"
						class:right={picked !== null && c === r.corretta}
						class:wrong={picked === c && c !== r.corretta}
						disabled={picked !== null}
						onclick={() => pick(c)}
					>
						{#if picked !== null && r.kind === 'frase'}
							<InteractiveSentence text={c} />
						{:else}
							{c}
						{/if}
					</button>
				{/each}
			</div>
			{#if picked !== null}
				<div class="after">
					{#if detailHref}
						<a class="detail-link" href={detailHref}>📖 Scheda</a>
					{/if}
					<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
				</div>
			{/if}
		</article>
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le forme sbagliate sono nei tuoi punti deboli.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.keigo { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.prompt { margin: 0; text-align: center; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.prompt.big { font-size: 1.4rem; font-weight: 700; }
	.prompt.small { font-size: 0.9rem; }
	.glossa { font-size: 0.85rem; font-weight: 400; color: var(--muted); }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.02rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }
	.after { display: flex; gap: 12px; justify-content: center; align-items: center; }
	.detail-link { color: var(--brand); font-weight: 600; text-decoration: none; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
