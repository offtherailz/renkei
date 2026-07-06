<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { GRAMMAR_FORMS, formPage } from '$lib/data/grammarForms';

	// In /forme stanno le parti del discorso + le contrazioni; le forme
	// composte hanno una pagina dedicata (/forme-composte).
	const forms = GRAMMAR_FORMS.filter((f) => !f.composed);
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { db } from '$lib/db/schema';
	import type { Word } from '$lib/types/models';

	function scrollToHash(): void {
		const slug = $page.url.hash.replace('#', '');
		if (!slug) return;
		document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	onMount(scrollToHash);
	$effect(() => { void $page.url.hash; scrollToHash(); });

	function formTitle(slug: string): string {
		return GRAMMAR_FORMS.find((f) => f.slug === slug)?.title ?? slug;
	}

	// Predicato parola per ogni scheda: collega le forme al catalogo.
	const WORD_FILTERS: Record<string, (w: Word) => boolean> = {
		meishi: (w) => w.tipo_jp.startsWith('名詞'),
		doushi: (w) => w.tipo_jp.startsWith('動詞'),
		keiyoushi: (w) => w.tipo_jp.startsWith('形容詞'),
		fukushi: (w) => w.tipo_jp.startsWith('副詞'),
		joshi: (w) => w.tipo_jp.startsWith('助詞'),
		josuushi: (w) => w.tipo_jp.startsWith('助数詞'),
		kanyouhyougen: (w) => w.tipo_jp.startsWith('慣用表現'),
		godan: (w) => Boolean(w.classe_verbo_jp?.startsWith('五段')),
		ichidan: (w) => Boolean(w.classe_verbo_jp?.startsWith('一段')),
		fukisoku: (w) => Boolean(w.classe_verbo_jp?.startsWith('不規則')),
		tadoushi: (w) => Boolean(w.transitivita_jp?.startsWith('他動詞')),
		jidoushi: (w) => Boolean(w.transitivita_jp?.startsWith('自動詞')),
		'i-keiyoushi': (w) => Boolean(w.tipo_aggettivo_jp?.startsWith('い形容詞')),
		'na-keiyoushi': (w) => Boolean(w.tipo_aggettivo_jp?.startsWith('な形容詞'))
	};

	const WORDS_PAGE_SIZE = 30;
	let counts = $state<Record<string, number>>({});
	let openWords = $state<Record<string, Word[]>>({});
	let shownCount = $state<Record<string, number>>({});
	let allWords: Word[] = [];

	onMount(async () => {
		allWords = await db.words.toArray();
		const next: Record<string, number> = {};
		for (const [slug, filter] of Object.entries(WORD_FILTERS)) {
			next[slug] = allWords.filter(filter).length;
		}
		counts = next;
	});

	function toggleWords(slug: string): void {
		if (openWords[slug]) {
			const { [slug]: _removed, ...rest } = openWords;
			openWords = rest;
			return;
		}
		const filter = WORD_FILTERS[slug];
		if (!filter) return;
		const matched = allWords.filter(filter).sort((a, b) => a.lettura.localeCompare(b.lettura, 'ja'));
		openWords = { ...openWords, [slug]: matched };
		shownCount = { ...shownCount, [slug]: WORDS_PAGE_SIZE };
	}

	function showMore(slug: string): void {
		shownCount = { ...shownCount, [slug]: (shownCount[slug] ?? WORDS_PAGE_SIZE) + WORDS_PAGE_SIZE };
	}
</script>

<div class="forms-page">
	<h1 class="page-title">Forme grammaticali</h1>
	<p class="page-sub">Le categorie che vedi nei badge, spiegate. Tocca un badge in qualsiasi punto dell'app per arrivare qui.</p>

	<a class="composte-link" href="{base}/forme-composte">🧩 Forme composte (〜てみる, 〜たい, condizionali…) →</a>

	<nav class="forms-toc">
		{#each forms as form}
			<a class="toc-chip" href="#{form.slug}">
				{#if form.icon === 'い' || form.icon === 'な'}
					<span class="kana-emoji kana-emoji-{form.icon === 'い' ? 'i' : 'na'}">{form.icon}</span>
				{:else}{form.icon}{/if}
				{form.title}
			</a>
		{/each}
	</nav>

	{#each forms as form}
		<article class="form-card" id={form.slug}>
			<div class="form-head">
				{#if form.icon === 'い' || form.icon === 'な'}
					<span class="form-icon kana-emoji kana-emoji-{form.icon === 'い' ? 'i' : 'na'} kana-emoji-big">{form.icon}</span>
				{:else}
					<span class="form-icon">{form.icon}</span>
				{/if}
				<div>
					<h2 class="form-title">{form.title}</h2>
					<p class="form-label"><FuriganaText text={form.label} /></p>
				</div>
			</div>
			<p class="form-summary">{form.summary}</p>
			{#each form.explanation as paragraph}
				<p class="form-text">{paragraph}</p>
			{/each}
			{#if form.examples.length > 0}
				<div class="form-examples">
					{#each form.examples as ex}
						<div class="form-example">
							<span class="example-jp">
								<FuriganaText text={ex.jp} />
								<button class="tts-mini" onclick={() => speakSentenceJapanese(stripFuriganaNotation(ex.jp))} title="Ascolta">🔊</button>
							</span>
							<span class="example-it">{ex.it}</span>
						</div>
					{/each}
				</div>
			{/if}
			{#if form.contractions}
				<div class="contractions">
					{#each form.contractions as c}
						<div class="contraction-row">
							<span class="contraction-short"><FuriganaText text={c.short} /></span>
							<span class="contraction-badge">contrazione di</span>
							{#if c.fullSlug}
								<a class="contraction-full is-link" href="{base}/{formPage(c.fullSlug)}#{c.fullSlug}"><FuriganaText text={c.full} /></a>
							{:else}
								<span class="contraction-full"><FuriganaText text={c.full} /></span>
							{/if}
							{#if c.note}<span class="contraction-note">{c.note}</span>{/if}
						</div>
					{/each}
				</div>
			{/if}
			{#if form.related.length > 0}
				<div class="form-related">
					<span class="related-label">Vedi anche:</span>
					{#each form.related as slug}
						<a class="related-chip" href="{base}/{formPage(slug)}#{slug}">{formTitle(slug)}</a>
					{/each}
				</div>
			{/if}
			{#if form.consolidaId}
				<a class="words-toggle drill-link" href="{base}/consolida/{encodeURIComponent(`grammar:${form.consolidaId}`)}">💪 Esercitati con questa forma</a>
			{/if}
			{#if form.slug === 'josuushi'}
				<a class="words-toggle" href="{base}/contatori">→ Vai al catalogo dei contatori</a>
			{/if}
			{#if form.slug === 'joshi'}
				<a class="words-toggle" href="{base}/particelle">→ Guida completa alle particelle (usi ed esempi)</a>
			{/if}
			{#if (counts[form.slug] ?? 0) > 0}
				<button class="words-toggle" onclick={() => toggleWords(form.slug)}>
					{openWords[form.slug] ? '▾ Nascondi le parole' : `▸ Vedi le ${counts[form.slug]} parole di questo tipo`}
				</button>
				{#if openWords[form.slug]}
					<div class="words-list">
						{#each openWords[form.slug].slice(0, shownCount[form.slug] ?? WORDS_PAGE_SIZE) as w (w.id)}
							<a class="word-chip" href="{base}/detail/{encodeURIComponent(`word:${w.id}`)}">
								<span class="word-chip-jp">{w.scrittura}</span>
								{#if w.lettura !== w.scrittura}<span class="word-chip-reading">{w.lettura}</span>{/if}
							</a>
						{/each}
					</div>
					{#if openWords[form.slug].length > (shownCount[form.slug] ?? WORDS_PAGE_SIZE)}
						<button class="words-toggle" onclick={() => showMore(form.slug)}>
							Mostra altre {Math.min(WORDS_PAGE_SIZE, openWords[form.slug].length - (shownCount[form.slug] ?? WORDS_PAGE_SIZE))}…
						</button>
					{/if}
				{/if}
			{/if}
		</article>
	{/each}
</div>

<style>
	.forms-page { display: grid; gap: 12px; }

	.page-title { margin: 0; font-size: 1.3rem; }

	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.forms-toc {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.toc-chip {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 4px 10px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		text-decoration: none;
	}

	.toc-chip:hover { border-color: var(--brand); background: #eef2ff; }

	.form-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 10px;
		scroll-margin-top: 12px;
	}

	.form-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.form-icon { font-size: 1.8rem; }

	.kana-emoji {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.4em;
		height: 1.4em;
		border-radius: 50%;
		color: #fff;
		font-weight: 800;
		font-size: 0.9em;
		line-height: 1;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
		box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.18), inset 0 2px 3px rgba(255, 255, 255, 0.35);
	}

	.kana-emoji-big { width: 1.5em; height: 1.5em; font-size: 1.4rem; }

	.kana-emoji-i { background: radial-gradient(circle at 30% 30%, #fb7185, #dc2626); }

	.kana-emoji-na { background: radial-gradient(circle at 30% 30%, #5eead4, #0d9488); }

	.form-title { margin: 0; font-size: 1.05rem; }

	.form-label { margin: 0; font-size: 0.95rem; color: var(--muted); }

	.form-summary { margin: 0; font-weight: 600; font-size: 0.9rem; }

	.form-text { margin: 0; font-size: 0.86rem; line-height: 1.55; color: var(--ink); }

	.form-examples { display: grid; gap: 8px; }

	.form-example {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 8px;
	}

	.example-jp { font-size: 1rem; }

	.example-it { font-size: 0.78rem; color: var(--muted); }

	.tts-mini {
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0 4px;
	}

	.contractions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 4px 0 2px;
	}

	.contraction-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		font-size: 0.9rem;
	}

	.contraction-short {
		font-weight: 700;
		color: var(--ink);
	}

	.contraction-badge {
		font-size: 0.68rem;
		font-weight: 600;
		color: #92400e;
		background: #fef3c7;
		border-radius: 999px;
		padding: 1px 8px;
		white-space: nowrap;
	}

	.contraction-full { color: var(--brand); font-weight: 600; }
	.contraction-full.is-link { text-decoration: none; border-bottom: 1px dashed var(--brand); }
	.contraction-full.is-link:hover { border-bottom-style: solid; }

	.composte-link {
		display: inline-block;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		border-radius: 12px;
		padding: 10px 14px;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--brand);
		text-decoration: none;
	}
	.composte-link:hover { background: #e0e7ff; }

	.contraction-note {
		font-size: 0.72rem;
		color: var(--muted);
	}

	.drill-link {
		display: inline-block;
		margin-top: 4px;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 10px;
		padding: 6px 12px;
	}

	.form-related {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.related-label { font-size: 0.75rem; color: var(--muted); font-weight: 600; }

	.related-chip {
		font-size: 0.75rem;
		padding: 2px 8px;
		border: 1px solid var(--line);
		border-radius: 999px;
		text-decoration: none;
		color: var(--brand);
	}

	.related-chip:hover { background: #eef2ff; border-color: var(--brand); }

	.words-toggle {
		justify-self: start;
		border: none;
		background: none;
		padding: 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--brand);
		cursor: pointer;
		text-decoration: none;
	}

	.words-toggle:hover { text-decoration: underline; }

	.words-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.word-chip {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		padding: 4px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		text-decoration: none;
		color: var(--ink);
	}

	.word-chip:hover { border-color: var(--brand); background: #eef2ff; }

	.word-chip-jp { font-size: 1.05rem; font-weight: 600; }

	.word-chip-reading { font-size: 0.72rem; color: var(--muted); }
</style>
