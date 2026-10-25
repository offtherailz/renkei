<script lang="ts">
	import { untrack } from 'svelte';
	import { base } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import { kanaSearchKey } from '$lib/core/romaji';
	import { makeWordMatcher, rankWords } from '$lib/core/wordSearch';
	import { saveCardAction } from '$lib/core/cardActions';
	import { noteSessionCardAction } from '$lib/stores.svelte';
	import type { Word } from '$lib/types/models';

	// 🔍 Ricerca rapida da ogni pagina (tasto «/» o bottone): cerchi una parola
	// che non ricordi (anche in romaji), apri la scheda o la metti in ripasso
	// senza perdere il punto in cui eri.
	let { open = $bindable(false) }: { open?: boolean } = $props();

	const locale = detectUserLocale();
	const MAX = 8;
	let query = $state('');
	let words = $state<Word[]>([]);
	let keys = $state(new Map<string, string>());
	let studied = $state<Set<string>>(new Set());
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (!open) return;
		query = '';
		// untrack: il caricamento non deve rieseguire l'effetto (azzererebbe la query)
		if (untrack(() => words.length) === 0) {
			db.words
				.toArray()
				.then((rows) => {
					words = rows.filter((w) => !w.id_nome_origine);
					keys = new Map(words.map((w) => [w.id, kanaSearchKey(w.lettura)]));
				})
				.catch(() => {});
		}
		queueMicrotask(() => inputEl?.focus());
	});

	afterNavigate(() => (open = false));

	const results = $derived.by(() => {
		if (!query.trim()) return [];
		const matches = makeWordMatcher(query, locale);
		return rankWords(words.filter((w) => matches(w, keys.get(w.id)!)), query, locale, keys).slice(0, MAX);
	});

	async function putInStudy(w: Word): Promise<void> {
		const key = `word:${w.id}`;
		if (!(await saveCardAction('forgot', key))) return;
		noteSessionCardAction(key, w.scrittura, 'forgot');
		studied = new Set([...studied, w.id]);
	}

	function onKeydown(e: KeyboardEvent): void {
		if (open && e.key === 'Escape') {
			open = false;
			return;
		}
		if (open || e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
		const t = e.target as HTMLElement | null;
		if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
		e.preventDefault();
		open = true;
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div class="qs-backdrop" role="presentation" onclick={() => (open = false)}></div>
	<div class="qs-panel" role="dialog" aria-label="Ricerca rapida">
		<input
			class="qs-input"
			placeholder="Cerca una parola (説明, せつめい, setsumei, spiegazione)…"
			bind:value={query}
			bind:this={inputEl}
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
		/>
		{#if query.trim() && results.length === 0}
			<p class="qs-empty">Nessun risultato.</p>
		{/if}
		<div class="qs-rows">
			{#each results as w (w.id)}
				<div class="qs-row">
					<a class="qs-main" href="{base}/detail/{encodeURIComponent(`word:${w.id}`)}">
						<span class="qs-jp">{w.scrittura}</span>
						{#if w.lettura !== w.scrittura}<span class="qs-read">{w.lettura}</span>{/if}
						<span class="qs-gloss">{pickLocalizedArray(w.significato, locale)[0] ?? ''}</span>
					</a>
					{#if studied.has(w.id)}
						<span class="qs-btn done" title="Nei ripassi: torna tra pochi minuti">✓</span>
					{:else}
						<button class="qs-btn" onclick={() => putInStudy(w)} title="📚 Metti in ripasso: torna tra pochi minuti">📚</button>
					{/if}
				</div>
			{/each}
		</div>
		<p class="qs-hint">📖 tocca la parola per la scheda · 📚 la rimette in ripasso · Esc per chiudere</p>
	</div>
{/if}

<style>
	.qs-backdrop { position: fixed; inset: 0; background: rgba(14, 29, 51, 0.35); z-index: 300; }
	.qs-panel {
		position: fixed;
		top: 10vh;
		left: 50%;
		transform: translateX(-50%);
		width: min(560px, calc(100vw - 32px));
		max-height: 75vh;
		overflow-y: auto;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		box-shadow: 0 12px 40px rgba(14, 29, 51, 0.25);
		padding: 12px;
		display: grid;
		gap: 8px;
		z-index: 301;
	}
	.qs-input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface-2);
		color: var(--ink);
		font-size: 1rem;
	}
	.qs-input:focus { outline: 2px solid var(--brand); outline-offset: -1px; }
	.qs-rows { display: grid; gap: 6px; }
	.qs-row { display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); overflow: hidden; }
	.qs-main { flex: 1; display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; padding: 8px 12px; text-decoration: none; color: var(--ink); }
	.qs-main:hover { background: rgba(107, 160, 242, 0.1); }
	.qs-jp { font-size: 1.2rem; font-weight: 700; }
	.qs-read { font-size: 0.8rem; color: var(--brand); }
	.qs-gloss { font-size: 0.82rem; color: var(--muted); flex: 1; min-width: 100px; }
	.qs-btn { display: grid; place-items: center; padding: 0 14px; border: none; border-left: 1px solid var(--line); background: none; font-size: 1.05rem; cursor: pointer; }
	.qs-btn:hover { background: rgba(107, 160, 242, 0.14); }
	.qs-btn.done { color: var(--success); font-weight: 700; cursor: default; }
	.qs-empty, .qs-hint { margin: 0; font-size: 0.75rem; color: var(--muted); }
</style>
