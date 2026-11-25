<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { formatReviewIn, normalizeMastery } from '$lib/core/srs';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import type { SrsProgress, Word } from '$lib/types/models';

	// 📌 Le mie parole: la lista personale (carte messe in studio a mano) e
	// TUTTE le parole in studio (con una scheda SRS), da cui aggiungerne altre
	// alla lista con un tocco. La lista personale entra nei ripassi anche fuori
	// obiettivi/livello e ha la sua sessione (/quiz?mie=1).

	const locale = detectUserLocale();
	const MAX_RIGHE = 150;

	interface Riga {
		w: Word;
		r: SrsProgress;
		m: number; // padronanza 0-100
		dovuta: boolean;
	}

	let righe = $state<Riga[]>([]);
	let loading = $state(true);
	let cerca = $state('');
	let filtro = $state<'tutte' | 'dovute' | 'deboli'>('tutte');
	let livello = $state<string | null>(null);

	onMount(async () => {
		const [words, srs] = await Promise.all([db.words.toArray(), db.srs_progress.toArray()]);
		const byId = new Map(words.map((w) => [w.id, w]));
		const now = Date.now();
		righe = srs
			.filter((r) => r.id_item.startsWith('word:') && !r.buried)
			.map((r) => ({ r, w: byId.get(r.id_item.slice(5)) }))
			.filter((x): x is { r: SrsProgress; w: Word } => !!x.w)
			.map(({ r, w }) => ({ r, w, m: Math.round(normalizeMastery(r.srs_stage, r.mastery_points)), dovuta: r.next_review_date <= now }));
		loading = false;
	});

	const personali = $derived(righe.filter((x) => x.r.personale).sort((a, b) => (b.r.personale ?? 0) - (a.r.personale ?? 0)));
	const livelli = $derived([...new Set(righe.map((x) => x.w.livello_jlpt))].sort());

	const q = $derived(cerca.trim().toLowerCase());
	const visibili = $derived.by(() => {
		let out = righe;
		if (livello) out = out.filter((x) => x.w.livello_jlpt === livello);
		if (filtro === 'dovute') out = out.filter((x) => x.dovuta);
		if (filtro === 'deboli') out = out.filter((x) => x.m < 60);
		if (q) {
			out = out.filter(
				(x) =>
					x.w.scrittura.includes(q) ||
					x.w.lettura.includes(q) ||
					pickLocalizedArray(x.w.significato, locale).some((s) => s.toLowerCase().includes(q))
			);
		}
		// prima le più deboli, poi in ordine di prossimo ripasso
		return [...out].sort((a, b) => a.m - b.m || a.r.next_review_date - b.r.next_review_date);
	});

	async function toggle(x: Riga): Promise<void> {
		const next: SrsProgress = { ...x.r };
		if (next.personale) delete next.personale;
		else next.personale = Date.now();
		await db.srs_progress.put(next);
		righe = righe.map((y) => (y.r.id_item === next.id_item ? { ...y, r: next } : y));
	}

	const sig = (w: Word): string => pickLocalizedArray(w.significato, locale).slice(0, 2).join(', ');
	const detail = (w: Word): string => `${base}/detail/${encodeURIComponent(`word:${w.id}`)}`;
</script>

<div class="mie">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">📌 Le mie parole</h1>
	<p class="page-sub">
		Le parole che hai messo in studio tu (📚 «Metti in studio» dalle frasi o dalla scheda, o col 📌 qui sotto):
		entrano nei ripassi anche se sono fuori dai tuoi obiettivi o dal tuo livello, ed escono dalla sessione quando
		sono consolidate.
	</p>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<section class="block">
			<h2 class="sec">📌 La tua lista <small>({personali.length})</small></h2>
			{#if personali.length}
				<a class="cta" href="{base}/quiz?mie=1">🔁 Ripassale <small>prima le dovute, poi le meno sicure</small></a>
				<div class="list">
					{#each personali as x (x.r.id_item)}
						{@render riga(x)}
					{/each}
				</div>
			{:else}
				<p class="muted">Ancora vuota: aggiungi parole con 📌 dalla lista qui sotto, o con «📚 Metti in studio» toccando una parola in una frase.</p>
			{/if}
		</section>

		<section class="block">
			<h2 class="sec">📚 Tutte le parole in studio <small>({righe.length})</small></h2>
			<input class="search" type="search" placeholder="Cerca (giapponese, lettura o italiano)…" bind:value={cerca} />
			<div class="filters">
				<button class="chip" class:on={filtro === 'tutte'} onclick={() => (filtro = 'tutte')}>Tutte</button>
				<button class="chip" class:on={filtro === 'dovute'} onclick={() => (filtro = 'dovute')}>⏰ Dovute</button>
				<button class="chip" class:on={filtro === 'deboli'} onclick={() => (filtro = 'deboli')}>💪 Deboli (&lt;60%)</button>
				{#each livelli as l (l)}
					<button class="chip" class:on={livello === l} onclick={() => (livello = livello === l ? null : l)}>{l === 'EXTRA' ? 'EX' : l}</button>
				{/each}
			</div>
			<p class="count">{visibili.length} parole{visibili.length > MAX_RIGHE ? ` — ne mostro ${MAX_RIGHE}, usa la ricerca o i filtri` : ''}</p>
			<div class="list">
				{#each visibili.slice(0, MAX_RIGHE) as x (x.r.id_item)}
					{@render riga(x)}
				{/each}
			</div>
		</section>
	{/if}
</div>

{#snippet riga(x: Riga)}
	<div class="row">
		<a class="row-main" href={detail(x.w)}>
			<span class="jp">{x.w.scrittura}{#if x.w.lettura !== x.w.scrittura}<small>（{x.w.lettura}）</small>{/if}</span>
			<span class="lv lv-{x.w.livello_jlpt}">{x.w.livello_jlpt === 'EXTRA' ? 'EX' : x.w.livello_jlpt}</span>
			<span class="mean">{sig(x.w)}</span>
			<span class="meta">{x.m}% · {x.dovuta ? 'dovuta' : formatReviewIn(x.r.next_review_date)}</span>
		</a>
		<button class="pin" class:on={!!x.r.personale} title={x.r.personale ? 'Togli dalla tua lista' : 'Aggiungi alla tua lista'} onclick={() => toggle(x)}>📌</button>
	</div>
{/snippet}

<style>
	.mie { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.block { display: grid; gap: 8px; }
	.sec { margin: 0; font-size: 1rem; }
	.sec small { color: var(--muted); font-weight: 400; }
	.cta { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 12px; background: var(--brand); color: var(--surface); font-weight: 700; text-decoration: none; }
	.cta small { font-weight: 400; opacity: 0.85; font-size: 0.75rem; }
	.search { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.95rem; }
	.filters { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 0.85rem; cursor: pointer; }
	.chip.on { border-color: var(--brand); font-weight: 700; }
	.count { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.list { display: grid; gap: 6px; }
	.row { display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); overflow: hidden; }
	.row-main { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 9px 12px; text-decoration: none; color: var(--ink); }
	.row-main:hover { background: var(--surface-2); }
	.jp { font-size: 1.05rem; font-weight: 700; }
	.jp small { font-size: 0.78rem; font-weight: 400; color: var(--muted); }
	.lv { font-size: 0.62rem; font-weight: 800; padding: 1px 6px; border-radius: 6px; background: var(--surface-2); color: var(--muted); }
	.lv.lv-N5 { background: var(--ok-bg); color: var(--ok-ink); }
	.lv.lv-N4 { background: var(--info-bg); color: var(--info-ink); }
	.lv.lv-N3 { background: var(--gold-bg); color: var(--gold-ink); }
	.mean { flex: 1; min-width: 120px; font-size: 0.82rem; color: var(--muted); }
	.meta { font-size: 0.72rem; color: var(--muted); }
	.pin { border: none; border-left: 1px solid var(--line); background: none; padding: 0 14px; font-size: 1.1rem; cursor: pointer; filter: grayscale(1); opacity: 0.45; }
	.pin.on { filter: none; opacity: 1; }
	.muted { color: var(--muted); font-size: 0.85rem; }
</style>
