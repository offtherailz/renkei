<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadGrammarGroupStats, type GrammarGroupStat } from '$lib/db/queries';
	import { AUTO_MAZZI } from '$lib/data/mazzi';

	// meta dei gruppi (titolo/emoji/deck) dagli AUTO_MAZZI grammatica per funzione
	const meta = AUTO_MAZZI.filter((m) => m.kind === 'grammar' && m.gruppo).map((m) => ({ gruppo: m.gruppo!, titolo: m.titolo, emoji: m.emoji, deck: m.id }));

	let stats = $state<Record<string, GrammarGroupStat>>({});
	let loading = $state(true);
	onMount(async () => {
		stats = await loadGrammarGroupStats();
		loading = false;
	});

	const rows = $derived(
		meta
			.map((m) => ({ ...m, st: stats[m.gruppo] ?? { gruppo: m.gruppo, total: 0, tested: 0, mastery: -1 } }))
			.sort((a, b) => {
				// prima: non provati, poi padronanza crescente (deboli in alto)
				const am = a.st.mastery, bm = b.st.mastery;
				if (am < 0 && bm >= 0) return -1;
				if (bm < 0 && am >= 0) return 1;
				return am - bm;
			})
	);
	function cls(m: number): string {
		if (m < 0) return 'none';
		if (m < 40) return 'low';
		if (m < 70) return 'mid';
		return 'ok';
	}
	function label(m: number, tested: number): string {
		if (m < 0 || tested === 0) return 'da sondare';
		return `${m}%`;
	}
</script>

<div class="gram">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">📖 Grammatica — forte / debole</h1>
	<p class="sub">Fai un <strong>giro diagnostico</strong> (una domanda per gruppo), poi vedi dove sei forte o debole e allena i gruppi deboli. I risultati alimentano i ripassi.</p>
	<a class="cta" href="{base}/quiz?auto=gram-diagnostica">🎯 Giro diagnostico (≈16 domande)</a>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<div class="list">
			{#each rows as r (r.gruppo)}
				<a class="row" href="{base}/quiz?auto={r.deck}">
					<div class="r-top">
						<span class="r-titolo">{r.emoji} {r.titolo}</span>
						<span class="r-pct {cls(r.st.mastery)}">{label(r.st.mastery, r.st.tested)}</span>
					</div>
					<div class="bar"><div class="bar-fill {cls(r.st.mastery)}" style="width:{r.st.mastery < 0 ? 0 : r.st.mastery}%"></div></div>
					<span class="r-sub">{r.st.tested}/{r.st.total} punti provati · tocca per il mini-test →</span>
				</a>
			{/each}
		</div>
		<p class="note">«da sondare» = gruppo non ancora provato. Fai il giro diagnostico per riempirlo.</p>
	{/if}
</div>

<style>
	.gram { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.muted { color: var(--muted); }
	.note { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.cta { display: inline-block; justify-self: start; background: var(--brand); color: #fff; border-radius: 12px; padding: 9px 15px; font-weight: 700; text-decoration: none; font-size: 0.9rem; }
	.list { display: grid; gap: 8px; }
	.row { display: grid; gap: 6px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 11px 13px; text-decoration: none; color: var(--ink); }
	.row:hover { border-color: var(--brand); }
	.r-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
	.r-titolo { font-weight: 700; font-size: 0.95rem; }
	.r-pct { font-size: 0.82rem; font-weight: 800; border-radius: 999px; padding: 2px 9px; }
	.r-pct.none { color: var(--muted); background: var(--surface-2, var(--bg)); }
	.r-pct.low { color: var(--danger); background: var(--danger-bg); }
	.r-pct.mid { color: var(--warn-ink); background: var(--warn-bg); }
	.r-pct.ok { color: var(--ok-ink); background: var(--ok-bg); }
	.bar { height: 9px; border-radius: 999px; background: var(--line); overflow: hidden; }
	.bar-fill { height: 100%; border-radius: 999px; }
	.bar-fill.none { background: transparent; }
	.bar-fill.low { background: var(--danger); }
	.bar-fill.mid { background: var(--warn-ink); }
	.bar-fill.ok { background: var(--success); }
	.r-sub { font-size: 0.74rem; color: var(--muted); }
</style>
