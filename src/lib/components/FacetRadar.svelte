<script lang="ts">
	import { base } from '$app/paths';
	import { FACET_META } from '$lib/core/facets';
	import { normalizePracticeOnlyMastery, type FacetField } from '$lib/core/srs';
	import type { SrsProgress, Word } from '$lib/types/models';
	import { applicableFacets } from '$lib/core/facets';

	// Diagramma di Kiviat delle 7 sfaccettature (modello Nation) di una parola.
	// Celle non applicabili (es. Scrivere per una parola full-kana): tratteggiate
	// e senza valore — N.A., non "da fare". Celle mai toccate: 0.
	const { word, srs }: { word: Word; srs: SrsProgress | null } = $props();

	const SIZE = 240;
	const CX = SIZE / 2;
	const CY = SIZE / 2 + 4;
	const R = 78;
	const LABEL_R = R + 26;

	const applicable = $derived(applicableFacets(word));

	function pct(field: FacetField): number {
		const v = srs?.[field];
		return v === undefined ? 0 : normalizePracticeOnlyMastery(v);
	}

	function angle(i: number): number {
		return -Math.PI / 2 + (i * 2 * Math.PI) / FACET_META.length;
	}
	function px(i: number, r: number): number {
		return CX + r * Math.cos(angle(i));
	}
	function py(i: number, r: number): number {
		return CY + r * Math.sin(angle(i));
	}

	// Poligono dei valori: le celle N.A. contribuiscono 0 (restano al centro).
	const valuePoints = $derived(
		FACET_META.map((m, i) => {
			const r = applicable.has(m.field) ? (pct(m.field) / 100) * R : 0;
			return `${px(i, r)},${py(i, r)}`;
		}).join(' ')
	);
	const gridLevels = [25, 50, 75, 100];
	function gridPoints(level: number): string {
		return FACET_META.map((_, i) => `${px(i, (level / 100) * R)},${py(i, (level / 100) * R)}`).join(' ');
	}
</script>

<figure class="facet-radar">
	<svg viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label="Radar delle sfaccettature">
		{#each gridLevels as level (level)}
			<polygon class="grid" points={gridPoints(level)} />
		{/each}
		{#each FACET_META as m, i (m.field)}
			<line class="axis" class:na={!applicable.has(m.field)} x1={CX} y1={CY} x2={px(i, R)} y2={py(i, R)} />
		{/each}
		<polygon class="value" points={valuePoints} />
		{#each FACET_META as m, i (m.field)}
			{#if applicable.has(m.field)}
				<circle class="dot" cx={px(i, (pct(m.field) / 100) * R)} cy={py(i, (pct(m.field) / 100) * R)} r="3" />
			{/if}
			<text
				class="label"
				class:na={!applicable.has(m.field)}
				x={px(i, LABEL_R)}
				y={py(i, LABEL_R)}
				text-anchor="middle"
				dominant-baseline="middle"
			>
				<tspan x={px(i, LABEL_R)} dy="-0.35em">{m.icon}</tspan>
				<tspan x={px(i, LABEL_R)} dy="1.15em">{applicable.has(m.field) ? `${pct(m.field)}%` : '—'}</tspan>
			</text>
		{/each}
	</svg>
	<figcaption class="legend">
		{#each FACET_META as m (m.field)}
			<span
				class="legend-item"
				class:na={!applicable.has(m.field)}
				title={applicable.has(m.field)
					? `${m.label} (${pct(m.field)}%) — ${m.desc} Si rafforza con: ${m.train}`
					: `${m.label} — ${m.desc} Non applicabile a questa parola.`}
			>
				{m.icon} {m.label}
			</span>
		{/each}
		<a class="legend-help" href="{base}/sfaccettature" title="Cosa sono le sfaccettature e come si allenano">?</a>
	</figcaption>
</figure>

<style>
	.facet-radar { margin: 0; display: grid; gap: 6px; justify-items: center; }
	svg { width: min(280px, 100%); height: auto; }
	.grid { fill: none; stroke: var(--line); stroke-width: 1; }
	.axis { stroke: var(--line); stroke-width: 1; }
	.axis.na { stroke-dasharray: 3 3; opacity: 0.5; }
	.value { fill: rgba(107, 160, 242, 0.25); stroke: var(--brand); stroke-width: 2; stroke-linejoin: round; }
	.dot { fill: var(--brand); }
	.label { font-size: 11px; fill: var(--ink); }
	.label.na { opacity: 0.45; }
	.legend { display: flex; flex-wrap: wrap; gap: 6px 12px; justify-content: center; font-size: 0.72rem; color: var(--muted); }
	.legend-item.na { opacity: 0.5; text-decoration: line-through; }
	.legend-help {
		display: inline-grid; place-items: center; width: 18px; height: 18px;
		border-radius: 50%; border: 1px solid var(--line); color: var(--muted);
		font-size: 0.7rem; font-weight: 700; text-decoration: none;
	}
	.legend-help:hover { border-color: var(--brand); color: var(--brand); }
</style>
