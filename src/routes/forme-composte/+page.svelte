<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { GRAMMAR_FORMS, ATTACHMENT_SCHEMAS, formPage, type GrammarForm } from '$lib/data/grammarForms';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';

	const composedForms = GRAMMAR_FORMS.filter((f) => f.composed);

	// Ordine e insieme degli schemi effettivamente usati dalle forme composte.
	const SCHEMA_ORDER = ['te', 'stem', 'plain', 'dictionary', 'ta', 'nai', 'ba', 'volitional', 'conjugation'];
	const schemasUsed = SCHEMA_ORDER.filter((id) => composedForms.some((f) => f.schemaId === id)).map((id) => ({
		id,
		...ATTACHMENT_SCHEMAS[id],
		forms: composedForms.filter((f) => f.schemaId === id)
	}));

	function sameSchema(form: GrammarForm): GrammarForm[] {
		if (!form.schemaId) return [];
		return composedForms.filter((f) => f.slug !== form.slug && f.schemaId === form.schemaId);
	}

	function formTitle(slug: string): string {
		return GRAMMAR_FORMS.find((f) => f.slug === slug)?.title ?? slug;
	}
	function formLabel(slug: string): string {
		const f = GRAMMAR_FORMS.find((x) => x.slug === slug);
		return f ? stripFuriganaNotation(f.label) : slug;
	}
	function formHref(slug: string): string {
		return `${base}/${formPage(slug)}#${slug}`;
	}

	function scrollToHash(): void {
		const slug = $page.url.hash.replace('#', '');
		if (!slug) return;
		document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	onMount(scrollToHash);
	$effect(() => { void $page.url.hash; scrollToHash(); });
</script>

<div class="forms-page">
	<h1 class="page-title">Forme composte</h1>
	<p class="page-sub">Costruzioni che si agganciano a verbi, aggettivi o nomi (〜てみる, 〜たい, condizionali…). Ognuna dice <strong>a cosa si attacca</strong> e <strong>con quale forma</strong>.</p>

	<!-- Legenda delle regole d'uso -->
	<section class="legend">
		<h2 class="legend-title">Regole d'uso</h2>
		<p class="legend-hint">A quale parola si aggancia la forma e con quale forma verbale. Forme con la <strong>stessa regola</strong> si usano allo stesso modo.</p>
		{#each schemasUsed as sc}
			<div class="legend-row">
				<div class="legend-head">
					<span class="legend-name">{sc.label}</span>
				</div>
				<p class="legend-desc">{sc.descrizione}</p>
				<div class="legend-forms">
					{#each sc.forms as f}
						<a class="mini-chip" href="#{f.slug}">{stripFuriganaNotation(f.label)}</a>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<nav class="forms-toc">
		{#each composedForms as form}
			<a class="toc-chip" href="#{form.slug}">{form.icon} {form.title}</a>
		{/each}
	</nav>

	{#each composedForms as form}
		<article class="form-card" id={form.slug}>
			<div class="form-head">
				<span class="form-icon">{form.icon}</span>
				<div>
					<h2 class="form-title">{form.title}</h2>
					<p class="form-label"><FuriganaText text={form.label} /></p>
				</div>
			</div>
			<p class="form-summary">{form.summary}</p>

			{#if form.attachment && form.attachment.length > 0}
				<div class="attach-box">
					<span class="attach-title">▸ Regole d'uso — si attacca a</span>
					<ul class="attach-list">
						{#each form.attachment as a}
							<li><span class="attach-base">{a.base}</span> <span class="attach-arrow">→</span> <span class="attach-conn">{a.connessione}</span></li>
						{/each}
					</ul>
					{#if form.schemaId && ATTACHMENT_SCHEMAS[form.schemaId]}
						<div class="schema-line">
							<span class="schema-badge">regola: {ATTACHMENT_SCHEMAS[form.schemaId].label}</span>
							{#if sameSchema(form).length > 0}
								<span class="schema-also">stessa regola di:</span>
								{#each sameSchema(form) as other}
									<a class="mini-chip" href="#{other.slug}">{stripFuriganaNotation(other.label)}</a>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#each form.explanation as paragraph}
				<p class="form-text">{paragraph}</p>
			{/each}

			{#if form.exceptions && form.exceptions.length > 0}
				<div class="exc-box">
					<span class="exc-title">⚠ Eccezioni</span>
					<ul class="exc-list">
						{#each form.exceptions as e}<li>{e}</li>{/each}
					</ul>
				</div>
			{/if}

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

			{#if form.related.length > 0}
				<div class="form-related">
					<span class="related-label">Vedi anche:</span>
					{#each form.related as slug}
						<a class="related-chip" href={formHref(slug)}>{formTitle(slug)}</a>
					{/each}
				</div>
			{/if}

			{#if form.consolidaId}
				<a class="drill-link" href="{base}/consolida/{encodeURIComponent(`grammar:${form.consolidaId}`)}">💪 Esercitati con questa forma</a>
			{/if}
		</article>
	{/each}

	<a class="back-link" href="{base}/forme">← Parti del discorso e forme contratte</a>
</div>

<style>
	.forms-page { display: grid; gap: 14px; }
	.page-title { margin: 0; font-size: 1.2rem; font-weight: 700; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }

	.legend {
		background: var(--surface);
		border-radius: 14px;
		padding: 14px 16px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 10px;
	}
	.legend-title { margin: 0; font-size: 0.95rem; font-weight: 700; }
	.legend-hint { margin: 0; font-size: 0.75rem; color: var(--muted); }
	.legend-row { border-top: 1px solid var(--line); padding-top: 8px; display: grid; gap: 4px; }
	.legend-name { font-weight: 700; font-size: 0.88rem; }
	.legend-desc { margin: 0; font-size: 0.78rem; color: var(--ink); }
	.legend-forms { display: flex; flex-wrap: wrap; gap: 6px; }

	.forms-toc { display: flex; flex-wrap: wrap; gap: 8px; }
	.toc-chip {
		font-size: 0.8rem;
		padding: 6px 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 999px;
		text-decoration: none;
		color: var(--ink);
	}
	.toc-chip:hover { background: #eef2ff; border-color: var(--brand); }

	.form-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 16px 18px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 10px;
		scroll-margin-top: 12px;
	}
	.form-head { display: flex; align-items: center; gap: 12px; }
	.form-icon { font-size: 1.8rem; }
	.form-title { margin: 0; font-size: 1.05rem; font-weight: 700; }
	.form-label { margin: 2px 0 0; font-size: 0.9rem; color: var(--muted); }
	.form-summary { margin: 0; font-size: 0.9rem; font-weight: 600; }
	.form-text { margin: 0; font-size: 0.85rem; line-height: 1.5; }

	.attach-box {
		background: #eaf2fe;
		border: 1px solid #93b4e8;
		border-radius: 10px;
		padding: 10px 12px;
		display: grid;
		gap: 6px;
	}
	.attach-title { font-size: 0.82rem; font-weight: 800; color: #14306e; }
	.attach-list { margin: 0; padding-left: 4px; list-style: none; display: grid; gap: 4px; }
	.attach-list li { font-size: 0.9rem; color: #14306e; }
	.attach-base { font-weight: 700; color: #0f2350; }
	.attach-arrow { color: #4b6bb0; margin: 0 4px; }
	.attach-conn { color: #1d3f8f; font-weight: 600; }
	.schema-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 2px; }
	.schema-badge {
		font-size: 0.72rem;
		font-weight: 700;
		background: #1d3f8f;
		color: #fff;
		border-radius: 999px;
		padding: 3px 10px;
	}
	.schema-also { font-size: 0.76rem; color: #334155; font-weight: 600; }

	.exc-box {
		background: #fdeede;
		border: 1px solid #e6a978;
		border-radius: 10px;
		padding: 10px 12px;
	}
	.exc-title { font-size: 0.82rem; font-weight: 800; color: #7c2d12; }
	.exc-list { margin: 5px 0 0; padding-left: 18px; display: grid; gap: 3px; }
	.exc-list li { font-size: 0.88rem; color: #6b2410; }

	.form-examples { display: grid; gap: 8px; }
	.form-example {
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 8px 10px;
		display: grid;
		gap: 2px;
	}
	.example-jp { font-size: 1rem; display: flex; align-items: center; gap: 6px; }
	.example-it { font-size: 0.8rem; color: var(--muted); }
	.tts-mini { border: none; background: none; cursor: pointer; font-size: 0.9rem; padding: 0; }

	.form-related { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
	.related-label { font-size: 0.75rem; color: var(--muted); font-weight: 600; }
	.related-chip, .mini-chip {
		font-size: 0.75rem;
		padding: 2px 8px;
		border: 1px solid var(--line);
		border-radius: 999px;
		text-decoration: none;
		color: var(--brand);
	}
	.related-chip:hover, .mini-chip:hover { background: #eef2ff; border-color: var(--brand); }

	.drill-link {
		justify-self: start;
		display: inline-block;
		background: var(--info-bg);
		border: 1px solid var(--info-border);
		border-radius: 10px;
		padding: 6px 12px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--brand);
		text-decoration: none;
	}

	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
