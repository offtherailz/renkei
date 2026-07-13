<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import JpBadge from '$lib/components/JpBadge.svelte';
	import { ICONS_BY_LABEL } from '$lib/data/posIcons';
	import type { Word } from '$lib/types/models';

	const locale = detectUserLocale();
	const PAGE = 60;

	let words = $state<Word[]>([]);
	let query = $state('');
	let lvl = $state<string | null>(null);
	let tipo = $state<string | null>(null);
	let limit = $state(PAGE);
	let loading = $state(true);
	let sentinel = $state<HTMLElement | null>(null);

	const TIPO_IT: Record<string, string> = {
		名詞: 'nomi',
		動詞: 'verbi',
		形容詞: 'aggettivi',
		副詞: 'avverbi',
		数詞: 'numerali',
		慣用表現: 'espressioni',
		助数詞: 'contatori',
		接続詞: 'congiunzioni',
		連体詞: 'prenominali',
		その他: 'altro'
	};

	onMount(async () => {
		words = await db.words.toArray();
		loading = false;
	});

	const tipi = $derived.by(() => {
		const seen = new Map<string, number>();
		for (const w of words) {
			const t = stripFuriganaNotation(w.tipo_jp);
			seen.set(t, (seen.get(t) ?? 0) + 1);
		}
		return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return words.filter((w) => {
			if (lvl && w.livello_jlpt !== lvl) return false;
			if (tipo && stripFuriganaNotation(w.tipo_jp) !== tipo) return false;
			if (!q) return true;
			return (
				w.scrittura.includes(q) ||
				w.lettura.includes(q) ||
				pickLocalizedArray(w.significato, locale).some((m) => m.toLowerCase().includes(q))
			);
		});
	});
	const results = $derived(filtered.slice(0, limit));

	// nuovo filtro/ricerca → si riparte dalla prima pagina
	$effect(() => {
		void query;
		void lvl;
		void tipo;
		limit = PAGE;
	});

	// scorrimento infinito: quando il fondo entra in vista, altra pagina
	$effect(() => {
		if (!sentinel) return;
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting) && limit < filtered.length) {
				limit += PAGE;
			}
		});
		io.observe(sentinel);
		return () => io.disconnect();
	});
</script>

<div class="consolida-index">
	<h1 class="page-title">Vocabolario</h1>
	<p class="page-sub">Cerca o filtra, apri la 📖 scheda per approfondire o avvia il 💪 drill libero (senza penalità).</p>

	<input class="search" placeholder="Cerca (giapponese, lettura o significato)…" bind:value={query} />

	<div class="filters">
		<button class="chip" class:on={lvl === null} onclick={() => (lvl = null)}>Tutti</button>
		<button class="chip" class:on={lvl === 'N5'} onclick={() => (lvl = lvl === 'N5' ? null : 'N5')}>N5</button>
		<button class="chip" class:on={lvl === 'N4'} onclick={() => (lvl = lvl === 'N4' ? null : 'N4')}>N4</button>
	</div>
	<div class="filters">
		{#each tipi as t (t)}
			<button class="chip" class:on={tipo === t} onclick={() => (tipo = tipo === t ? null : t)}>
				{#if ICONS_BY_LABEL[t]}<span class="chip-icon">{ICONS_BY_LABEL[t]}</span>{/if}{t}<small>{TIPO_IT[t] ?? ''}</small>
			</button>
		{/each}
	</div>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<p class="count">{filtered.length} parole{results.length < filtered.length ? ` · ne mostro ${results.length}, scorri per altre` : ''}</p>
		<div class="word-list">
			{#each results as w (w.id)}
				<div class="word-row">
					<a class="w-main" href="{base}/detail/{encodeURIComponent(`word:${w.id}`)}">
						<span class="w-jp">{w.scrittura}</span>
						{#if w.lettura !== w.scrittura}<span class="w-read">{w.lettura}</span>{/if}
						<span class="w-badges"><JlptBadge level={w.livello_jlpt} /><JpBadge label={w.tipo_jp} variant="jp-badge-pos" /></span>
						<span class="w-gloss">{pickLocalizedArray(w.significato, locale)[0] ?? ''}</span>
					</a>
					<a class="w-drill" href="{base}/consolida/{encodeURIComponent(w.id)}" title="Consolida">💪</a>
				</div>
			{/each}
			{#if results.length === 0}<p class="muted">Nessun risultato.</p>{/if}
		</div>
		<div bind:this={sentinel} class="sentinel"></div>
	{/if}
</div>

<style>
	.consolida-index { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.search { padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.95rem; }
	.search:focus { outline: none; border-color: var(--brand); }
	.filters { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.85rem; cursor: pointer; }
	.chip small { font-size: 0.68rem; color: var(--muted); }
	.chip:hover { border-color: var(--brand); }
	.chip.on { border-color: var(--brand); background: rgba(107,160,242,0.14); font-weight: 700; }
	.count { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.word-list { display: grid; gap: 6px; }
	.word-row {
		display: flex; align-items: stretch; gap: 8px;
		border: 1px solid var(--line); border-radius: 10px;
		background: var(--surface); overflow: hidden;
	}
	.word-row:hover { border-color: var(--brand); }
	.w-main { flex: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 12px; text-decoration: none; color: var(--ink); }
	.w-drill { display: grid; place-items: center; padding: 0 14px; font-size: 1.2rem; text-decoration: none; border-left: 1px solid var(--line); }
	.w-drill:hover { background: rgba(107,160,242,0.14); }
	.w-jp { font-size: 1.25rem; font-weight: 700; }
	.w-read { font-size: 0.8rem; color: var(--muted); }
	.w-badges { display: inline-flex; gap: 4px; }
	.w-gloss { font-size: 0.82rem; color: var(--muted); flex: 1; min-width: 100px; }
	.muted { color: var(--muted); font-size: 0.85rem; }
	.sentinel { height: 1px; }
</style>
