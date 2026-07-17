<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { normalizePracticeOnlyMastery } from '$lib/core/srs';
	import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { db } from '$lib/db/schema';

	// In /forme stanno le parti del discorso + le contrazioni; le forme
	// composte hanno una pagina dedicata (/forme-composte). Ogni voce apre la
	// sua scheda esaustiva in /forme/<slug>.
	const forms = GRAMMAR_FORMS.filter((f) => !f.composed);

	const CONJ_DRILL_BY_SLUG: Record<string, string> = {
		godan: 'godan',
		ichidan: 'ichidan',
		fukisoku: 'irregular',
		'i-keiyoushi': 'i-keiyoushi',
		'na-keiyoushi': 'na-keiyoushi'
	};

	let drillPct = $state<Record<string, number>>({});

	onMount(async () => {
		const pct: Record<string, number> = {};
		for (const [slug, cls] of Object.entries(CONJ_DRILL_BY_SLUG)) {
			const row = await db.srs_progress.get(`conj:${cls}`);
			if (row) pct[slug] = normalizePracticeOnlyMastery(row.mastery_points);
		}
		drillPct = pct;
	});
</script>

<div class="forms-page">
	<h1 class="page-title">Forme grammaticali</h1>
	<p class="page-sub">Le categorie che vedi nei badge, spiegate. Tocca un badge in qualsiasi punto dell'app per aprire la scheda.</p>

	<a class="composte-link" href="{base}/forme-composte">🧩 Forme composte (〜てみる, 〜たい, condizionali…) →</a>

	<div class="forms-index">
		{#each forms as form}
			<a class="form-row" href="{base}/forme/{form.slug}">
				{#if form.icon === 'い' || form.icon === 'な'}
					<span class="row-icon kana-emoji kana-emoji-{form.icon === 'い' ? 'i' : 'na'}">{form.icon}</span>
				{:else}
					<span class="row-icon">{form.icon}</span>
				{/if}
				<span class="row-body">
					<span class="row-title">
						{form.title}
						<span class="row-label"><FuriganaText text={form.label} /></span>
					</span>
					<span class="row-summary">{form.summary}</span>
				</span>
				{#if drillPct[form.slug] !== undefined}
					<span class="row-pct" title="Padronanza del drill di classe">💪 {drillPct[form.slug]}%</span>
				{/if}
				<span class="row-arrow">→</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.forms-page { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.composte-link {
		display: inline-block; background: var(--info-bg); border: 1px solid var(--info-border);
		border-radius: 12px; padding: 10px 14px; font-size: 0.88rem; font-weight: 600;
		color: var(--brand); text-decoration: none;
	}
	.composte-link:hover { background: var(--info-border); }

	.forms-index { display: grid; gap: 8px; }
	.form-row {
		display: flex; align-items: center; gap: 12px;
		background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
		padding: 12px 14px; text-decoration: none; color: var(--ink);
		box-shadow: 0 1px 4px rgba(14, 29, 51, 0.05);
	}
	.form-row:hover { border-color: var(--brand); }
	.row-icon { font-size: 1.5rem; flex-shrink: 0; width: 1.8rem; text-align: center; }
	.row-body { display: grid; gap: 2px; flex: 1; min-width: 0; }
	.row-title { font-size: 1rem; font-weight: 700; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
	.row-label { font-size: 0.82rem; font-weight: 400; color: var(--muted); }
	.row-summary { font-size: 0.8rem; color: var(--muted); }
	.row-pct { font-size: 0.75rem; font-weight: 700; color: var(--brand); white-space: nowrap; }
	.row-arrow { color: var(--muted); font-size: 1.1rem; }

	.kana-emoji {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.4em; height: 1.4em; border-radius: 50%; color: #fff;
		font-weight: 800; font-size: 0.9em; line-height: 1;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
		box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.18), inset 0 2px 3px rgba(255, 255, 255, 0.35);
	}
	.kana-emoji-i { background: radial-gradient(circle at 30% 30%, #fb7185, var(--danger)); }
	.kana-emoji-na { background: radial-gradient(circle at 30% 30%, #5eead4, #0d9488); }
</style>
