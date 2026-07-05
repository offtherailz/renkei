<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import JpBadge from '$lib/components/JpBadge.svelte';
	import type { Word } from '$lib/types/models';

	const locale = detectUserLocale();
	let words = $state<Word[]>([]);
	let query = $state('');
	let loading = $state(true);

	onMount(async () => {
		words = await db.words.toArray();
		loading = false;
	});

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const base = q
			? words.filter(
					(w) =>
						w.scrittura.includes(q) ||
						w.lettura.includes(q) ||
						pickLocalizedArray(w.significato, locale).some((m) => m.toLowerCase().includes(q))
				)
			: words;
		return base.slice(0, 60);
	});
</script>

<div class="consolida-index">
	<h1 class="page-title">Vocabolario</h1>
	<p class="page-sub">Cerca un termine, aprine la 📖 scheda per approfondire o avvia il 💪 drill libero (senza penalità).</p>

	<input class="search" placeholder="Cerca (giapponese, lettura o significato)…" bind:value={query} />

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
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
		{#if !query && words.length > results.length}
			<p class="muted">Mostro i primi {results.length}. Usa la ricerca per trovare il resto.</p>
		{/if}
	{/if}
</div>

<style>
	.consolida-index { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.search { padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.95rem; }
	.search:focus { outline: none; border-color: var(--brand); }
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
</style>
