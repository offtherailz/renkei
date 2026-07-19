<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import TokenCompose from '$lib/components/TokenCompose.svelte';
	import DATA from '$lib/data/comparazioni.json';
	import type { Word } from '$lib/types/models';

	// ⚖️ Comparazioni (beta): la grammatica del confronto N5/N4.
	// 4 tipi di round — どっち (のほうが), 一番 (superlativo), componi «AはBより〜»,
	// ほど〜ない (negativo, N4). Dati curati (fatti veri) in comparazioni.json; la
	// traduzione italiana delle frasi è costruita dalle glosse. L'esito accredita
	// l'aggettivo (cella Usare 🧩) quando è nel catalogo.
	const ROUNDS_PER_GAME = 8;

	type Lvl = 'N5' | 'N4';
	interface Item { jp: string; it: string }
	interface Coppia { a: Item; b: Item; adj: { dict: string; neg: string; it: string }; winner: 'a' | 'b'; level: Lvl }
	interface Superlativo { gruppo: { it: string }; items: Item[]; adj: { dict: string; it: string }; winner: number; level: Lvl }
	const coppie = DATA.coppie as Coppia[];
	const superlativi = DATA.superlativi as Superlativo[];

	type Kind = 'dochi' | 'ichiban' | 'compose' | 'hodo';
	interface Round {
		kind: Kind;
		questionJp: string;
		contextIt: string;
		choices: string[]; // vuoto per compose
		correct: string; // scelta giusta, o frase-target per compose
		tokens: string[]; // solo compose
		revealJp: string;
		revealIt: string;
		adjLettura: string;
	}

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	function makeDochi(p: Coppia): Round {
		const win = p.winner === 'a' ? p.a : p.b;
		const los = p.winner === 'a' ? p.b : p.a;
		return {
			kind: 'dochi',
			questionJp: `${p.a.jp}と${p.b.jp}、どちらのほうが${p.adj.dict}ですか。`,
			contextIt: '',
			choices: [p.a.jp, p.b.jp],
			correct: win.jp,
			tokens: [],
			revealJp: `${los.jp}より${win.jp}のほうが${p.adj.dict}です。`,
			revealIt: `${cap(win.it)} è più ${p.adj.it} di ${los.it}.`,
			adjLettura: p.adj.dict
		};
	}
	function makeCompose(p: Coppia): Round {
		const win = p.winner === 'a' ? p.a : p.b;
		const los = p.winner === 'a' ? p.b : p.a;
		const tokens = [win.jp, 'は', los.jp, 'より', p.adj.dict, 'です'];
		return {
			kind: 'compose',
			questionJp: '',
			contextIt: `${cap(win.it)} è più ${p.adj.it} di ${los.it}.`,
			choices: [],
			correct: tokens.join(''),
			tokens,
			revealJp: tokens.join(''),
			revealIt: `${cap(win.it)} è più ${p.adj.it} di ${los.it}.`,
			adjLettura: p.adj.dict
		};
	}
	function makeHodo(p: Coppia): Round {
		const win = p.winner === 'a' ? p.a : p.b;
		const los = p.winner === 'a' ? p.b : p.a;
		const stem = `${los.jp}は${win.jp}ほど`;
		const distr = [p.adj.dict, p.adj.dict.slice(0, -1) + 'くなかった', p.adj.dict + 'じゃない'];
		return {
			kind: 'hodo',
			questionJp: `${stem}＿＿＿`,
			contextIt: `${cap(los.it)} non è ${p.adj.it} quanto ${win.it}.`,
			choices: shuffle([p.adj.neg, ...distr]),
			correct: p.adj.neg,
			tokens: [],
			revealJp: `${stem}${p.adj.neg}です。`,
			revealIt: `${cap(los.it)} non è ${p.adj.it} quanto ${win.it}.`,
			adjLettura: p.adj.dict
		};
	}
	function makeIchiban(s: Superlativo): Round {
		const win = s.items[s.winner]!;
		return {
			kind: 'ichiban',
			questionJp: `つぎの中で、どれがいちばん${s.adj.dict}ですか。`,
			contextIt: `(${s.gruppo.it})`,
			choices: shuffle(s.items.map((i) => i.jp)),
			correct: win.jp,
			tokens: [],
			revealJp: `${win.jp}がいちばん${s.adj.dict}です。`,
			revealIt: `Tra questi, ${win.it} è il più ${s.adj.it}.`,
			adjLettura: s.adj.dict
		};
	}

	type Scene = 'level' | 'play' | 'done';
	let scene = $state<Scene>('level');
	let level = $state<Lvl | 'tutti'>('N5');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let picked = $state<string | null>(null);
	let answered = $state<boolean | null>(null);
	let bank = $state<string[]>([]);
	let answer = $state<string[]>([]);

	// mappa lettura/scrittura → id parola per accreditare l'aggettivo
	let adjIdByForm = new Map<string, string>();

	export const snapshot = gameSnapshot(
		() => ({ scene, level, rounds, idx, score, picked, answered, bank, answer }),
		(s) => ({ scene, level, rounds, idx, score, picked, answered, bank, answer } = s)
	);

	onMount(async () => {
		const words = (await db.words.toArray()) as Word[];
		for (const w of words) {
			if (!(w.tipo_jp ?? '').startsWith('形容詞')) continue;
			if (w.lettura) adjIdByForm.set(w.lettura, w.id);
			if (w.scrittura) adjIdByForm.set(w.scrittura, w.id);
		}
	});

	function inLevel(l: Lvl): boolean {
		return level === 'tutti' || level === l;
	}

	function pickLevel(l: Lvl | 'tutti'): void {
		level = l;
		const cand: Round[] = [];
		for (const p of coppie) {
			if (!inLevel(p.level)) continue;
			cand.push(makeDochi(p));
			cand.push(makeCompose(p));
			if (level !== 'N5') cand.push(makeHodo(p)); // ほど〜ない è N4
		}
		for (const s of superlativi) {
			if (inLevel(s.level)) cand.push(makeIchiban(s));
		}
		rounds = shuffle(cand).slice(0, ROUNDS_PER_GAME);
		idx = 0;
		score = 0;
		scene = 'play';
		setupRound();
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	function setupRound(): void {
		picked = null;
		answered = null;
		const r = cur();
		if (r.kind === 'compose') {
			bank = shuffle([...r.tokens]);
			answer = [];
		} else {
			bank = [];
			answer = [];
		}
	}

	async function credit(ok: boolean): Promise<void> {
		const id = adjIdByForm.get(cur().adjLettura);
		if (id && ok) await recordPractice('word:' + id, true, 'facet_use');
	}

	async function pickChoice(c: string): Promise<void> {
		if (answered !== null) return;
		picked = c;
		const ok = c === cur().correct;
		answered = ok;
		if (ok) score += 1;
		await credit(ok);
		speakSentenceJapanese(cur().revealJp);
	}

	async function confirmCompose(): Promise<void> {
		if (answered !== null || bank.length > 0) return;
		const ok = answer.join('') === cur().correct;
		answered = ok;
		if (ok) score += 1;
		await credit(ok);
		speakSentenceJapanese(cur().revealJp);
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

<div class="cmp">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if scene === 'play'}<span class="lvl-chip">{level} — punti: {score}</span>{/if}
	</div>

	{#if scene === 'level'}
		<article class="scene">
			<h1 class="page-title">⚖️ Comparazioni <span class="beta-chip">beta</span></h1>
			<p class="hint">
				La grammatica del confronto: より・のほうが (più di), いちばん (il più) e ほど〜ない
				(non… quanto). Scegli il vincitore, il superlativo o componi la frase.
			</p>
			<div class="choices plat">
				<button class="choice" onclick={() => pickLevel('N5')}>🌱 N5</button>
				<button class="choice" onclick={() => pickLevel('N4')}>🌿 N4</button>
				<button class="choice wide" onclick={() => pickLevel('tutti')}>🎲 Tutti</button>
			</div>
			<a class="explain-link" href="{base}/comparazioni/guida">📖 Come funzionano le comparazioni</a>
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length}</p>

			{#if r.contextIt}<p class="hint">💬 {r.contextIt}</p>{/if}

			{#if r.kind === 'compose'}
				<TokenCompose bind:bank bind:answer disabled={answered !== null}
					placeholder="componi la frase qui…"
					status={answered === true ? 'right' : answered === false ? 'wrong' : null}
					bankDoneHint />
				{#if answered === null}
					<button class="proceed" disabled={bank.length > 0} onclick={confirmCompose}>Conferma</button>
				{/if}
			{:else}
				{#if r.questionJp}<p class="prompt">{r.questionJp}</p>{/if}
				<div class="choices">
					{#each r.choices as c, i (i)}
						<button
							class="choice"
							class:right={answered !== null && c === r.correct}
							class:wrong={picked === c && c !== r.correct}
							class:answered={answered !== null}
							onclick={() => pickChoice(c)}
						>{c}</button>
					{/each}
				</div>
			{/if}

			{#if answered !== null}
				<div class="reveal">
					<p class="who">{answered ? '✅ Giusto!' : '❌ Non era così'}</p>
					<p class="reveal-jp"><InteractiveSentence text={r.revealJp} /></p>
					<p class="hint">{r.revealIt}</p>
					<button class="listen" onclick={() => speakSentenceJapanese(r.revealJp)}>🔊 もう一度</button>
				</div>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Le risposte giuste rafforzano l'uso (🧩) degli aggettivi — nei giochi gli errori non penalizzano.</p>
			<button class="proceed" onclick={() => pickLevel(level)}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.cmp { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.lvl-chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
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
	.reveal-jp { margin: 0; font-size: 1.15rem; }
	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice.wide { grid-column: 1 / -1; }
	.explain-link { justify-self: center; font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
</style>
