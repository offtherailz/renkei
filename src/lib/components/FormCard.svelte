<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { normalizePracticeOnlyMastery } from '$lib/core/srs';
	import { GRAMMAR_FORMS, formPath, type GrammarForm } from '$lib/data/grammarForms';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { db } from '$lib/db/schema';
	import type { Word } from '$lib/types/models';

	const { form }: { form: GrammarForm } = $props();

	// Classi con un drill di coniugazione dedicato (/consolida/conj:*).
	const CONJ_DRILL_BY_SLUG: Record<string, string> = {
		godan: 'godan',
		ichidan: 'ichidan',
		fukisoku: 'irregular',
		'i-keiyoushi': 'i-keiyoushi',
		'na-keiyoushi': 'na-keiyoushi'
	};

	// Predicato parola per ogni scheda: collega la forma al catalogo.
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
	let words = $state<Word[]>([]);
	let shown = $state(WORDS_PAGE_SIZE);
	let drillPct = $state<number | undefined>(undefined);

	function formTitle(slug: string): string {
		return GRAMMAR_FORMS.find((f) => f.slug === slug)?.title ?? slug;
	}

	onMount(async () => {
		const filter = WORD_FILTERS[form.slug];
		if (filter) {
			words = (await db.words.toArray())
				.filter(filter)
				.sort((a, b) => a.lettura.localeCompare(b.lettura, 'ja'));
		}
		const cls = CONJ_DRILL_BY_SLUG[form.slug];
		if (cls) {
			const row = await db.srs_progress.get(`conj:${cls}`);
			if (row) drillPct = normalizePracticeOnlyMastery(row.mastery_points);
		}
	});
</script>

<article class="form-card">
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
		{#if CONJ_DRILL_BY_SLUG[form.slug]}
			<a class="drill-badge" href="{base}/consolida/{encodeURIComponent(`conj:${CONJ_DRILL_BY_SLUG[form.slug]}`)}" title="Drill di coniugazione della classe{drillPct !== undefined ? ` — padronanza ${drillPct}%` : ''}">
				💪{#if drillPct !== undefined}<small class="drill-pct">{drillPct}%</small>{/if}
			</a>
		{/if}
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
	{#if form.exceptions && form.exceptions.length > 0}
		<div class="form-exceptions">
			<span class="exc-label">Eccezioni</span>
			<ul>
				{#each form.exceptions as e}<li><FuriganaText text={e} /></li>{/each}
			</ul>
		</div>
	{/if}
	{#if form.contractions}
		<div class="contractions">
			{#each form.contractions as c}
				<div class="contraction-row">
					<span class="contraction-short"><FuriganaText text={c.short} /></span>
					<span class="contraction-badge">contrazione di</span>
					{#if c.fullSlug}
						<a class="contraction-full is-link" href="{base}/{formPath(c.fullSlug)}"><FuriganaText text={c.full} /></a>
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
				<a class="related-chip" href="{base}/{formPath(slug)}">{formTitle(slug)}</a>
			{/each}
		</div>
	{/if}
	{#if form.consolidaId}
		<a class="drill-link" href="{base}/consolida/{encodeURIComponent(`grammar:${form.consolidaId}`)}">💪 Esercitati con questa forma</a>
	{/if}
	{#if form.slug === 'josuushi'}
		<a class="words-toggle" href="{base}/contatori">→ Vai al catalogo dei contatori</a>
	{/if}
	{#if form.slug === 'joshi'}
		<a class="words-toggle" href="{base}/particelle">→ Guida completa alle particelle (usi ed esempi)</a>
	{/if}
	{#if words.length > 0}
		<p class="words-title">Le {words.length} parole di questo tipo nel catalogo</p>
		<div class="words-list">
			{#each words.slice(0, shown) as w (w.id)}
				<a class="word-chip" href="{base}/detail/{encodeURIComponent(`word:${w.id}`)}">
					<span class="word-chip-jp">{w.scrittura}</span>
					{#if w.lettura !== w.scrittura}<span class="word-chip-reading">{w.lettura}</span>{/if}
				</a>
			{/each}
		</div>
		{#if words.length > shown}
			<button class="words-toggle" onclick={() => (shown += WORDS_PAGE_SIZE)}>
				Mostra altre {Math.min(WORDS_PAGE_SIZE, words.length - shown)}…
			</button>
		{/if}
	{/if}
</article>

<style>
	.form-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 10px;
	}
	.form-head { display: flex; align-items: center; gap: 12px; }
	.form-icon { font-size: 1.8rem; }
	.drill-badge {
		margin-left: auto; display: inline-flex; align-items: center; justify-content: center; gap: 3px;
		min-width: 36px; height: 36px; padding: 0 8px; border-radius: 10px;
		border: 1px solid var(--line); text-decoration: none; font-size: 1.1rem;
	}
	.drill-badge:hover { border-color: var(--brand); background: rgba(107, 160, 242, 0.14); }
	.drill-pct { font-size: 0.68rem; font-weight: 700; color: var(--muted); }
	.kana-emoji {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.4em; height: 1.4em; border-radius: 50%; color: #fff;
		font-weight: 800; font-size: 0.9em; line-height: 1;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
		box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.18), inset 0 2px 3px rgba(255, 255, 255, 0.35);
	}
	.kana-emoji-big { width: 1.5em; height: 1.5em; font-size: 1.4rem; }
	.kana-emoji-i { background: radial-gradient(circle at 30% 30%, #fb7185, var(--danger)); }
	.kana-emoji-na { background: radial-gradient(circle at 30% 30%, #5eead4, #0d9488); }
	.form-title { margin: 0; font-size: 1.15rem; }
	.form-label { margin: 0; font-size: 0.95rem; color: var(--muted); }
	.form-summary { margin: 0; font-weight: 600; font-size: 0.92rem; }
	.form-text { margin: 0; font-size: 0.88rem; line-height: 1.6; color: var(--ink); }
	.form-examples { display: grid; gap: 8px; }
	.form-example {
		display: grid; gap: 2px; padding: 8px 10px;
		background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px;
	}
	.example-jp { font-size: 1.05rem; }
	.example-it { font-size: 0.8rem; color: var(--muted); }
	.tts-mini { border: none; background: none; cursor: pointer; font-size: 0.9rem; padding: 0 4px; }
	.form-exceptions { font-size: 0.84rem; background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 10px; padding: 8px 12px; }
	.exc-label { font-weight: 700; color: var(--warn-ink); font-size: 0.78rem; }
	.form-exceptions ul { margin: 4px 0 0; padding-left: 18px; }
	.contractions { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 2px; }
	.contraction-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.92rem; }
	.contraction-short { font-weight: 700; color: var(--ink); }
	.contraction-badge {
		font-size: 0.68rem; font-weight: 600; color: var(--warn-ink);
		background: var(--warn-bg); border-radius: 999px; padding: 1px 8px; white-space: nowrap;
	}
	.contraction-full { color: var(--brand); font-weight: 600; }
	.contraction-full.is-link { text-decoration: none; border-bottom: 1px dashed var(--brand); }
	.contraction-full.is-link:hover { border-bottom-style: solid; }
	.contraction-note { font-size: 0.72rem; color: var(--muted); }
	.form-related { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
	.related-label { font-size: 0.75rem; color: var(--muted); font-weight: 600; }
	.related-chip {
		font-size: 0.78rem; padding: 3px 10px; border: 1px solid var(--line);
		border-radius: 999px; text-decoration: none; color: var(--brand);
	}
	.related-chip:hover { background: var(--info-bg); border-color: var(--brand); }
	.drill-link {
		justify-self: start; display: inline-block; margin-top: 2px;
		background: var(--info-bg); border: 1px solid var(--info-border);
		border-radius: 10px; padding: 6px 12px; text-decoration: none; color: var(--brand); font-weight: 600; font-size: 0.84rem;
	}
	.words-title { margin: 6px 0 0; font-size: 0.82rem; font-weight: 700; color: var(--muted); }
	.words-toggle {
		justify-self: start; border: none; background: none; padding: 0;
		font-size: 0.82rem; font-weight: 600; color: var(--brand); cursor: pointer; text-decoration: none;
	}
	.words-toggle:hover { text-decoration: underline; }
	.words-list { display: flex; flex-wrap: wrap; gap: 6px; }
	.word-chip {
		display: inline-flex; align-items: baseline; gap: 5px; padding: 4px 10px;
		border: 1px solid var(--line); border-radius: 8px; background: var(--surface-2);
		text-decoration: none; color: var(--ink);
	}
	.word-chip:hover { border-color: var(--brand); background: var(--info-bg); }
	.word-chip-jp { font-size: 1.05rem; font-weight: 600; }
	.word-chip-reading { font-size: 0.78rem; color: var(--muted); }
</style>
