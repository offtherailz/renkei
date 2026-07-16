<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadWeakItems, type WeakItem } from '$lib/db/queries';
	import { CONJ_CLASS_ICONS } from '$lib/core/conjugation';

	let items = $state<WeakItem[]>([]);
	let loading = $state(true);
	let kind = $state<string | null>(null);

	const KIND_META: Record<string, { icon: string; label: string }> = {
		word: { icon: '📦', label: 'Parole' },
		grammar: { icon: '📖', label: 'Grammatica' },
		counter: { icon: '🔢', label: 'Contatori' },
		kanji: { icon: '漢', label: 'Kanji' },
		phrase: { icon: '🗣️', label: 'Frasi' },
		conj: { icon: '🔄', label: 'Coniugazione' },
		particella: { icon: '🪝', label: 'Particelle' }
	};
	function kindMeta(k: string): { icon: string; label: string } {
		return KIND_META[k] ?? { icon: '❓', label: 'Altro' };
	}
	// Le righe di coniugazione usano l'icona canonica della classe (5️⃣/1️⃣/い/な…),
	// coerente col resto dell'app; il chip di gruppo resta 🔄.
	function rowIcon(w: WeakItem): string {
		if (w.kind === 'conj') return CONJ_CLASS_ICONS[w.raw] ?? kindMeta('conj').icon;
		return kindMeta(w.kind).icon;
	}
	// I glifi giapponesi (漢, い, な) riusano i badge globali condivisi (app.css);
	// le emoji restano nude.
	function glyphClass(icon: string): string {
		if (icon === '漢') return 'jp-kanji-badge';
		if (icon === 'い') return 'jp-kana-badge jp-kana-badge-i';
		if (icon === 'な') return 'jp-kana-badge jp-kana-badge-na';
		return '';
	}

	onMount(async () => {
		items = await loadWeakItems();
		loading = false;
	});

	const kinds = $derived.by(() => {
		const seen = new Map<string, number>();
		for (const it of items) seen.set(it.kind, (seen.get(it.kind) ?? 0) + 1);
		return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
	});

	const filtered = $derived(kind ? items.filter((i) => i.kind === kind) : items);
</script>

<div class="weak-index">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">💪 Punti deboli</h1>
	<p class="page-sub">Tutto ciò che è sotto il 60% di padronanza, dal peggiore. Tocca una voce per aprire la sua scheda o pagina di riferimento.</p>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if items.length === 0}
		<p class="muted">Nessun punto debole al momento. 🎉</p>
	{:else}
		{#if kinds.length > 1}
			<div class="filters">
				<button class="chip" class:on={kind === null} onclick={() => (kind = null)}>Tutti <small>{items.length}</small></button>
				{#each kinds as k (k)}
					{@const meta = kindMeta(k)}
					<button class="chip" class:on={kind === k} onclick={() => (kind = kind === k ? null : k)}>
						<span class={glyphClass(meta.icon)}>{meta.icon}</span> {meta.label} <small>{items.filter((i) => i.kind === k).length}</small>
					</button>
				{/each}
			</div>
		{/if}
		<p class="count">{filtered.length} {filtered.length === 1 ? 'voce' : 'voci'}</p>
		<div class="weak-list">
			{#each filtered as w (w.href)}
				{@const ic = rowIcon(w)}
				<a class="weak-row" href="{base}/{w.href}">
					<span class="w-icon {glyphClass(ic)}">{ic}</span>
					<span class="w-label">{w.label}</span>
					<span class="w-pct" class:low={w.pct < 30}>{w.pct}%</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.weak-index { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.filters { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.85rem; cursor: pointer; }
	.chip small { font-size: 0.68rem; color: var(--muted); }
	.chip:hover { border-color: var(--brand); }
	.chip.on { border-color: var(--brand); background: rgba(107,160,242,0.14); font-weight: 700; }
	.count { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.weak-list { display: grid; gap: 6px; }
	.weak-row {
		display: flex; align-items: center; gap: 10px;
		border: 1px solid var(--line); border-radius: 10px;
		background: var(--surface); padding: 10px 12px;
		text-decoration: none; color: var(--ink);
	}
	.weak-row:hover { border-color: var(--brand); }
	.w-icon { font-size: 1.1rem; }
	.w-label { flex: 1; min-width: 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
	.w-pct { font-size: 0.82rem; font-weight: 700; color: var(--warn-ink); background: var(--warn-bg); border-radius: 999px; padding: 2px 9px; }
	.w-pct.low { color: var(--danger); background: var(--danger-bg); }
	.muted { color: var(--muted); font-size: 0.85rem; }
</style>
