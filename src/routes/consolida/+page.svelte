<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from '$lib/core/i18n';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { createInitialSrs, markKnown } from '$lib/core/srs';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import JpBadge from '$lib/components/JpBadge.svelte';
	import { ICONS_BY_LABEL } from '$lib/data/posIcons';
	import type { Word, Kanji, SrsProgress } from '$lib/types/models';

	const locale = detectUserLocale();
	const PAGE = 60;

	let words = $state<Word[]>([]);
	let kanji = $state<Kanji[]>([]);
	let query = $state('');
	let lvl = $state<string | null>(null);
	let tipo = $state<string | null>(null);
	let limit = $state(PAGE);
	let loading = $state(true);
	let sentinel = $state<HTMLElement | null>(null);

	// Triage di massa «✓ La so già» (17/07): per il cold-start da tante carte,
	// segnarle una a una nella scheda è troppo lento. Qui si selezionano più
	// righe insieme e si saltano i ripassi iniziali in un colpo solo.
	let selecting = $state(false);
	let selected = $state<Set<string>>(new Set());
	let srsByWord = $state<Map<string, SrsProgress>>(new Map());
	let applying = $state(false);
	let doneMsg = $state('');

	function toggleSelecting(): void {
		selecting = !selecting;
		if (!selecting) selected = new Set();
	}

	function toggleSelected(id: string): void {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	async function applyKnownToSelection(): Promise<void> {
		if (selected.size === 0 || applying) return;
		if (!confirm(`Segnare ${selected.size} parole come già note? Saltano i ripassi iniziali (ripasso tra ~1 settimana).`)) return;
		applying = true;
		doneMsg = '';
		try {
			const updates = [...selected].map((id) => {
				const key = `word:${id}`;
				const existing = srsByWord.get(key) ?? createInitialSrs(key);
				return markKnown(existing, Date.now());
			});
			await db.srs_progress.bulkPut(updates);
			for (const u of updates) srsByWord.set(u.id_item, u);
			srsByWord = new Map(srsByWord);
			doneMsg = `✓ ${updates.length} parole segnate come già note.`;
			selected = new Set();
			selecting = false;
		} finally {
			applying = false;
		}
	}

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
		const [w, k, srs] = await Promise.all([db.words.toArray(), db.kanji.toArray(), db.srs_progress.toArray()]);
		words = w;
		kanji = k;
		srsByWord = new Map(srs.filter((r) => r.id_item.startsWith('word:')).map((r) => [r.id_item, r]));
		loading = false;
	});

	// stage della carta (0 se mai vista): per far vedere subito cosa il triage
	// toccherebbe e cosa invece è già oltre (markKnown non retrocede).
	function stageOf(id: string): number {
		return srsByWord.get(`word:${id}`)?.srs_stage ?? 0;
	}

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

	// Vista Kanji: filtro speciale (tipo === 'kanji') che mostra il catalogo kanji
	// dentro lo stesso vocabolario, con ricerca e livello condivisi.
	const isKanji = $derived(tipo === 'kanji');
	const filteredKanji = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return kanji.filter((k) => {
			if (lvl && k.livello_jlpt !== lvl) return false;
			if (!q) return true;
			return (
				k.id.includes(q) ||
				[...k.letture_on, ...k.letture_kun].some((r) => r.toLowerCase().includes(q)) ||
				pickLocalizedText(k.significato, locale).toLowerCase().includes(q)
			);
		});
	});
	const kanjiResults = $derived(filteredKanji.slice(0, limit));
	const total = $derived(isKanji ? filteredKanji.length : filtered.length);

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
			if (entries.some((e) => e.isIntersecting) && limit < total) {
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

	<div class="triage-row">
		<button class="chip" class:on={selecting} onclick={toggleSelecting} disabled={isKanji}>
			{selecting ? '✕ Annulla selezione' : '✓ Segna più parole come già note'}
		</button>
		{#if doneMsg}<span class="triage-msg">{doneMsg}</span>{/if}
	</div>
	{#if selecting}
		<p class="hint-text">
			Tocca le parole che conosci già: entrano subito a stage 5 (~1 settimana), saltando i
			ripassi iniziali — utile dopo un reset o per il vocabolario che già sai. Non abbassa
			carte già più avanti.
		</p>
	{/if}

	<input class="search" placeholder="Cerca (giapponese, lettura o significato)…" bind:value={query} />

	<div class="filters">
		<button class="chip" class:on={lvl === null} onclick={() => (lvl = null)}>Tutti</button>
		<button class="chip" class:on={lvl === 'N5'} onclick={() => (lvl = lvl === 'N5' ? null : 'N5')}>N5</button>
		<button class="chip" class:on={lvl === 'N4'} onclick={() => (lvl = lvl === 'N4' ? null : 'N4')}>N4</button>
	</div>
	<div class="filters">
		<button class="chip" class:on={isKanji} onclick={() => (tipo = isKanji ? null : 'kanji')}>
			<span class="chip-icon jp-kanji-badge">漢</span>Kanji<small>{kanji.length}</small>
		</button>
		{#each tipi as t (t)}
			<button class="chip" class:on={tipo === t} onclick={() => (tipo = tipo === t ? null : t)}>
				{#if ICONS_BY_LABEL[t]}<span class="chip-icon">{ICONS_BY_LABEL[t]}</span>{/if}{t}<small>{TIPO_IT[t] ?? ''}</small>
			</button>
		{/each}
	</div>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<p class="count">
			{#if isKanji}{filteredKanji.length} kanji{kanjiResults.length < filteredKanji.length ? ` · ne mostro ${kanjiResults.length}, scorri per altre` : ''}
			{:else}{filtered.length} parole{results.length < filtered.length ? ` · ne mostro ${results.length}, scorri per altre` : ''}{/if}
		</p>
		<div class="word-list">
			{#if isKanji}
				{#each kanjiResults as k (k.id)}
					<div class="word-row">
						<a class="w-main" href="{base}/detail/{encodeURIComponent(`kanji:${k.id}`)}">
							<span class="w-jp">{k.id}</span>
							<span class="w-read">{[...k.letture_on, ...k.letture_kun].slice(0, 4).join('・')}</span>
							<span class="w-badges"><JlptBadge level={k.livello_jlpt} /><span class="jp-kanji-badge">漢</span></span>
							<span class="w-gloss">{pickLocalizedText(k.significato, locale)}</span>
						</a>
						<a class="w-drill" href="{base}/consolida/{encodeURIComponent(`kanji:${k.id}`)}" title="Consolida">💪</a>
					</div>
				{/each}
				{#if kanjiResults.length === 0}<p class="muted">Nessun risultato.</p>{/if}
			{:else}
				{#each results as w (w.id)}
					<div class="word-row" class:known={stageOf(w.id) >= 5}>
						{#if selecting}
							<button
								class="w-check"
								class:checked={selected.has(w.id)}
								disabled={stageOf(w.id) >= 5}
								onclick={() => toggleSelected(w.id)}
								title={stageOf(w.id) >= 5 ? 'Già nota' : 'Seleziona'}
							>
								{stageOf(w.id) >= 5 ? '✓' : selected.has(w.id) ? '☑' : '☐'}
							</button>
						{/if}
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
			{/if}
		</div>
		<div bind:this={sentinel} class="sentinel"></div>
	{/if}

	{#if selecting && selected.size > 0}
		<div class="triage-bar">
			<span>{selected.size} selezionate</span>
			<button class="btn-primary" onclick={applyKnownToSelection} disabled={applying}>
				{applying ? 'Applico…' : `✓ Segna come già note`}
			</button>
		</div>
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

	.triage-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
	.triage-msg { font-size: 0.82rem; color: var(--success); font-weight: 600; }
	.chip:disabled { opacity: 0.5; cursor: default; }
	.hint-text { margin: 0; font-size: 0.8rem; color: var(--muted); background: var(--info-bg); border: 1px solid var(--info-border); border-radius: 10px; padding: 8px 12px; }

	.word-row.known { opacity: 0.55; }
	.w-check {
		flex-shrink: 0; width: 44px; display: grid; place-items: center;
		border: none; background: none; font-size: 1.3rem; cursor: pointer; color: var(--brand);
	}
	.w-check.checked { color: var(--success); }
	.w-check:disabled { color: var(--muted); cursor: default; }

	.triage-bar {
		position: sticky; bottom: 8px; display: flex; align-items: center; justify-content: space-between;
		gap: 12px; background: var(--surface); border: 1.5px solid var(--brand); border-radius: 12px;
		padding: 10px 14px; box-shadow: 0 4px 16px rgba(14,29,51,0.15); font-size: 0.88rem; font-weight: 600;
	}
	.btn-primary { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 700; cursor: pointer; }
	.btn-primary:disabled { opacity: 0.6; cursor: default; }
</style>
