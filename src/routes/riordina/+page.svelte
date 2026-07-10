<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { createDefaultTokenizer, type JapaneseTokenizer } from '$lib/core/tokenizer';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import type { JLPTLevel } from '$lib/types/models';

	const locale = detectUserLocale();
	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
	function shuffle<T>(xs: T[]): T[] {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	}

	type Candidate = { plain: string; hint: string; level: JLPTLevel; detail: string };
	let pool = $state<Candidate[]>([]);
	let tok: JapaneseTokenizer | null = null;
	let loading = $state(true);

	type Scene = 'level' | 'play' | 'over';
	let scene = $state<Scene>('level');
	let level = $state<JLPTLevel | 'tutti'>('N5');
	let streak = $state(0);
	let best = $state(0);

	// round corrente
	let current = $state<Candidate | null>(null);
	let correctTokens = $state<string[]>([]);
	let chips = $state<{ id: number; text: string; used: boolean }[]>([]);
	let picked = $state<number[]>([]); // id dei chip in ordine
	let checked = $state(false);
	let ok = $state(false);
	let lastPlain = '';

	function bestKey(): string {
		return `renkei-riordina-best-${level}`;
	}
	function loadBest(): number {
		const n = Number(typeof localStorage !== 'undefined' ? localStorage.getItem(bestKey()) : 0);
		return Number.isFinite(n) ? n : 0;
	}
	function saveBest(): void {
		try {
			localStorage.setItem(bestKey(), String(best));
		} catch {
			/* pazienza */
		}
	}

	onMount(async () => {
		tok = await createDefaultTokenizer();
		const [words, grammar] = await Promise.all([db.words.toArray(), db.grammar.toArray()]);
		const out: Candidate[] = [];
		const seen = new Set<string>();
		const add = (testo: string, trad: unknown, level: JLPTLevel, detail: string) => {
			const plain = stripFuriganaNotation(testo);
			if (plain.length < 8 || plain.length > 22) return;
			if (/[A-Za-z0-9０-９]/.test(plain)) return;
			if (seen.has(plain)) return;
			seen.add(plain);
			const hint = trad ? pickLocalizedText(trad as { it: string; en: string }, locale) : '';
			out.push({ plain, hint, level, detail });
		};
		for (const w of words) {
			for (const ex of w.frasi_esempio ?? []) add(ex.testo, ex.traduzione, w.livello_jlpt, `word:${w.id}`);
		}
		for (const g of grammar) {
			for (const ex of g.frasi_esempio ?? []) add(ex.testo, ex.traduzione, g.livello_jlpt, `grammar:${g.id}`);
		}
		pool = out;
		loading = false;
	});

	function pickLevel(l: JLPTLevel | 'tutti'): void {
		level = l;
		best = loadBest();
		streak = 0;
		nextRound();
	}

	function nextRound(): void {
		if (!tok) return;
		const candidates = pool.filter((c) => (level === 'tutti' || c.level === level) && c.plain !== lastPlain);
		for (let i = 0; i < 40; i += 1) {
			const c = rnd(candidates);
			const tokens = tok.tokenize(c.plain).filter((t) => t.trim().length > 0);
			if (tokens.length < 4 || tokens.length > 8) continue;
			current = c;
			lastPlain = c.plain;
			correctTokens = tokens;
			// mescola finché l'ordine è diverso dall'originale
			let mixed = shuffle(tokens);
			for (let k = 0; k < 5 && mixed.join('') === tokens.join(''); k += 1) mixed = shuffle(tokens);
			chips = mixed.map((text, id) => ({ id, text, used: false }));
			picked = [];
			checked = false;
			ok = false;
			scene = 'play';
			return;
		}
		// pool troppo piccolo per il filtro: torna alla scelta
		scene = 'level';
	}

	function tap(id: number): void {
		if (checked) return;
		const chip = chips.find((c) => c.id === id)!;
		if (chip.used) return;
		chip.used = true;
		chips = [...chips];
		picked = [...picked, id];
		if (picked.length === correctTokens.length) check();
	}
	function undo(): void {
		if (checked || picked.length === 0) return;
		const last = picked[picked.length - 1]!;
		picked = picked.slice(0, -1);
		const chip = chips.find((c) => c.id === last)!;
		chip.used = false;
		chips = [...chips];
	}
	function composed(): string {
		return picked.map((id) => chips.find((c) => c.id === id)!.text).join('');
	}
	function check(): void {
		checked = true;
		ok = composed() === correctTokens.join('');
		speakSentenceJapanese(correctTokens.join(''));
		if (ok) {
			streak += 1;
			if (streak > best) {
				best = streak;
				saveBest();
			}
		} else {
			scene = 'over';
		}
	}
</script>

<div class="riordina">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if scene !== 'level'}
			<span class="lvl-chip">{level} · Serie: <strong>{streak}</strong> · 🏆 {best}</span>
		{/if}
	</div>

	{#if scene === 'level'}
		<article class="scene">
			<h1 class="page-title">🧩 Riordina la frase</h1>
			<p class="hint">
				I pezzi della frase sono in disordine: toccali nell'ordine giusto. La traduzione ti
				aiuta. Un errore e la serie riparte.
			</p>
			{#if loading}
				<p class="hint">Caricamento…</p>
			{:else}
				<div class="choices plat">
					<button class="choice" onclick={() => pickLevel('N5')}>🌱 N5</button>
					<button class="choice" onclick={() => pickLevel('N4')}>🌿 N4</button>
					<button class="choice wide" onclick={() => pickLevel('tutti')}>🎲 Tutti</button>
				</div>
			{/if}
		</article>
	{:else if scene === 'play' && current}
		<article class="scene">
			{#if current.hint}
				<p class="hint">💬 {current.hint}</p>
			{/if}
			<div class="answer" class:right={checked && ok}>
				{#if picked.length === 0}
					<span class="placeholder">Tocca i pezzi qui sotto…</span>
				{:else}
					{composed()}
				{/if}
			</div>
			<div class="chips">
				{#each chips as c (c.id)}
					<button class="chip" class:used={c.used} disabled={c.used || checked} onclick={() => tap(c.id)}>{c.text}</button>
				{/each}
			</div>
			<div class="play-actions">
				<button class="mini" onclick={undo} disabled={checked || picked.length === 0}>↩︎ Indietro</button>
				{#if checked && ok}
					<button class="proceed" onclick={nextRound}>✅ Prossima →</button>
				{/if}
			</div>
		</article>
	{:else if scene === 'over' && current}
		<article class="scene">
			<p class="who">❌ Ordine sbagliato!</p>
			<p class="score-big">Serie: {streak}</p>
			<p class="hint">🏆 Record {level}: {best}</p>
			<p class="bubble sm">La tua: {composed()}</p>
			<div class="bubble solution-line"><span>✅</span> <InteractiveSentence text={correctTokens.join('')} /></div>
			<p class="hint">Tocca le parole che non conoscevi: «➕ Non la conoscevo» le mette nei tuoi ripassi.</p>
			{#if current.hint}<p class="hint">💬 {current.hint}</p>{/if}
			<div class="play-actions">
				<a class="mini" href="{base}/detail/{encodeURIComponent(current.detail)}">📖 Scheda</a>
				<button class="proceed" onclick={() => { streak = 0; nextRound(); }}>🔁 Ricomincia</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.riordina { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.lvl-chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.sm { font-size: 0.95rem; }

	.answer { min-height: 3em; display: grid; place-items: center; text-align: center; font-size: 1.3rem; font-weight: 700; background: var(--surface-2); border: 1.5px dashed var(--line); border-radius: 12px; padding: 12px; line-height: 1.8; overflow-wrap: anywhere; }
	.answer.right { border-color: var(--success); border-style: solid; background: rgba(52,201,138,0.16); }
	.placeholder { font-size: 0.85rem; font-weight: 400; color: var(--muted); }

	.chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
	.chip { padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.15rem; cursor: pointer; }
	.chip:hover:not(:disabled) { border-color: var(--brand); }
	.chip.used { opacity: 0.25; cursor: default; }

	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: center; cursor: pointer; }
	.choice.wide { grid-column: 1 / -1; }
	.choice:hover { border-color: var(--brand); }

	.score-big { margin: 0; text-align: center; font-size: 2.2rem; font-weight: 800; }
	.solution-line { display: flex; gap: 6px; align-items: baseline; justify-content: center; flex-wrap: wrap; text-align: left; }
	.play-actions { display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; text-decoration: none; }
	.mini:disabled { opacity: 0.4; cursor: default; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
