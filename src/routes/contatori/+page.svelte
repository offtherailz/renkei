<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import type { Counter, Word } from '$lib/types/models';

	const locale = detectUserLocale();

	let counters = $state<Counter[]>([]);
	let wordsById = $state(new Map<string, Word>());
	let loading = $state(true);

	onMount(async () => {
		const [rows, words] = await Promise.all([db.counters.toArray(), db.words.toArray()]);
		counters = rows.sort(
			(a, b) => a.livello_jlpt.localeCompare(b.livello_jlpt) || a.lettura.localeCompare(b.lettura, 'ja')
		);
		wordsById = new Map(words.map((w) => [w.id, w]));
		loading = false;
		const slug = $page.url.hash.replace('#', '');
		if (slug) {
			requestAnimationFrame(() => {
				document.getElementById(decodeURIComponent(slug))?.scrollIntoView({ behavior: 'smooth' });
			});
		}
	});
</script>

<div class="counters-page">
	<h1 class="page-title">Contatori (助数詞)</h1>
	<p class="page-sub">
		In giapponese non si conta mai "nudo": al numero si attacca il contatore giusto per la
		categoria. Qui trovi quelli N5/N4 con le letture irregolari da memorizzare.
	</p>
	<a class="games-link" href="{base}/giochi">🎮 Mettiti alla prova con i giochi →</a>

	{#if loading}
		<p class="muted-text">Caricamento…</p>
	{:else}
		{#each counters as c (c.id)}
			<article class="counter-card" id={c.id}>
				<div class="counter-head">
					<button
						class="counter-symbol"
						onclick={() => speakSentenceJapanese(c.lettura)}
						title="Ascolta"
					><ruby>{c.simbolo}<rt>{c.lettura}</rt></ruby></button>
					<div class="counter-info">
						<p class="counter-reading">{c.lettura}</p>
						<p class="counter-meaning">{pickLocalizedText(c.significato, locale)}</p>
					</div>
					<JlptBadge level={c.livello_jlpt} />
				</div>
				{#if c.note}
					<p class="counter-note">{pickLocalizedText(c.note, locale)}</p>
				{/if}
				{#if c.letture_irregolari}
					<p class="counter-irregular">⚠️ Letture da ricordare: <span class="ja">{c.letture_irregolari}</span></p>
				{/if}
				{#if c.parole_tipiche?.length}
					<div class="counter-words">
						<span class="words-label">Si usa con:</span>
						{#each c.parole_tipiche as wid}
							{@const w = wordsById.get(wid)}
							{#if w}
								<a class="counter-word-chip" href="{base}/detail/{encodeURIComponent(`word:${w.id}`)}">
									{w.scrittura}
								</a>
							{/if}
						{/each}
					</div>
				{/if}
				{#if c.letture_irregolari}
					<a class="drill-link" href="{base}/consolida/{encodeURIComponent(`counter:${c.id}`)}">💪 Esercitati con le letture</a>
				{/if}
			</article>
		{/each}
	{/if}
</div>

<style>
	.counters-page { display: grid; gap: 12px; }

	.page-title { margin: 0; font-size: 1.3rem; }

	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.games-link {
		display: inline-block;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--brand);
		text-decoration: none;
	}
	.games-link:hover { text-decoration: underline; }

	.counter-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 8px;
		scroll-margin-top: 12px;
	}

	.counter-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.counter-symbol {
		font-size: 1.9rem;
		font-weight: 700;
		min-width: 64px;
		height: 64px;
		padding: 0 8px;
		box-sizing: border-box;
		display: grid;
		place-items: center;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		background: var(--surface-2);
		color: var(--ink);
		cursor: pointer;
		flex-shrink: 0;
		line-height: 1;
	}

	.counter-symbol rt {
		font-size: 0.62rem;
		font-weight: 600;
		color: var(--brand);
	}

	.counter-symbol:hover { border-color: var(--brand); }

	.counter-info { flex: 1; }

	.counter-reading { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--brand); }

	.counter-meaning { margin: 0; font-size: 0.85rem; color: var(--ink); }

	.counter-note { margin: 0; font-size: 0.8rem; color: var(--muted); }

	.counter-irregular {
		margin: 0;
		font-size: 0.8rem;
		padding: 8px 10px;
		border-radius: 8px;
		background: #fffbeb;
		border: 1px solid #fbbf24;
		color: #92400e;
	}

	.counter-irregular .ja { font-size: 0.95rem; }

	.counter-words {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.words-label { font-size: 0.75rem; font-weight: 600; color: var(--muted); }

	.counter-word-chip {
		padding: 3px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		text-decoration: none;
		color: var(--ink);
		font-size: 1.05rem;
	}

	.counter-word-chip:hover { border-color: var(--brand); }

	.drill-link {
		justify-self: start;
		display: inline-block;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 10px;
		padding: 6px 12px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--brand);
		text-decoration: none;
	}

	.drill-link:hover { background: #dbeafe; }

	.muted-text { color: var(--muted); }
</style>
