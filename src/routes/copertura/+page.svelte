<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		loadCoverageMatrix,
		loadUncoveredItems,
		type CoverageMatrix,
		type CoverageRow,
		type UncoveredItem
	} from '$lib/db/coverage';

	let matrix = $state<CoverageMatrix | null>(null);
	let loading = $state(true);

	// Drill-down: cella selezionata (riga × colonna) + elenco scoperti
	let openRow = $state<CoverageRow | null>(null);
	let openColId = $state<string | null>(null);
	let openColName = $state<string>('');
	let uncovered = $state<UncoveredItem[]>([]);
	let uncoveredTotal = $state(0);
	let uncoveredLoading = $state(false);
	let showAllUncovered = $state(false);

	const PREVIEW_LIMIT = 15;

	async function load(): Promise<void> {
		loading = true;
		matrix = await loadCoverageMatrix();
		loading = false;
	}

	onMount(load);

	function pctColor(pct: number): string {
		if (pct >= 75) return 'var(--progress-good)';
		if (pct >= 40) return 'var(--progress-mid)';
		return 'var(--progress-low)';
	}

	// Intensità della cella: mescola il colore di soglia con lo sfondo, più la
	// percentuale è alta più il colore è pieno — nessun colore nuovo, solo
	// color-mix su token del tema.
	function cellStyle(pct: number): string {
		const color = pctColor(pct);
		const strength = 12 + Math.round((pct / 100) * 55); // 12%..67%
		return `background: color-mix(in srgb, ${color} ${strength}%, var(--surface-2));`;
	}

	async function openCell(row: CoverageRow, colId: string, colName: string): Promise<void> {
		openRow = row;
		openColId = colId;
		openColName = colName;
		showAllUncovered = false;
		uncoveredLoading = true;
		const cell = row.cells[colId];
		uncoveredTotal = cell?.uncovered ?? 0;
		uncovered = await loadUncoveredItems(row.source.id, colId, PREVIEW_LIMIT);
		uncoveredLoading = false;
	}

	async function showAll(): Promise<void> {
		if (!openRow || openColId === null) return;
		showAllUncovered = true;
		uncoveredLoading = true;
		uncovered = await loadUncoveredItems(openRow.source.id, openColId, undefined);
		uncoveredLoading = false;
	}

	function closeDrill(): void {
		openRow = null;
		openColId = null;
	}

	const TYPE_ICON: Record<string, string> = { word: '📦', kanji: '漢', grammar: '📖' };

	// Riepilogo: per ogni corso, quanta parte del suo livello JLPT associato copre
	// (se il corso ha un target_jlpt riconoscibile lo confrontiamo con quella riga,
	// altrimenti mostriamo la copertura media su tutte le righe).
	function courseSummary(colId: string): { label: string; pct: number } {
		const m = matrix;
		if (!m) return { label: '', pct: 0 };
		const cells = m.rows.map((r) => r.cells[colId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
		const withItems = cells.filter((c) => c.total > 0);
		if (withItems.length === 0) return { label: 'nessun dato', pct: 0 };
		const best = withItems.reduce((a, b) => (b.pct > a.pct ? b : a));
		const rowIdx = m.rows.findIndex((r) => r.cells[colId] === best);
		const rowName = m.rows[rowIdx]?.source.name ?? '';
		return { label: rowName, pct: best.pct };
	}

	function rowUncoveredEverywhere(row: CoverageRow): number {
		const m = matrix;
		if (!m || m.cols.length === 0) return row.split.words + row.split.kanji + row.split.grammar;
		// quante chiavi della riga non sono in NESSUNA colonna
		const allColKeys = new Set<string>();
		for (const col of m.cols) for (const k of col.keys) allColKeys.add(k);
		return row.source.keys.filter((k) => !allColKeys.has(k)).length;
	}
</script>

<h1 class="page-title">🗺️ Copertura</h1>
<p class="page-sub">
	Quanto i corsi importati coprono il materiale JLPT — e cosa resta fuori, livello per livello.
</p>

{#if loading}
	<p class="muted-text">Caricamento…</p>
{:else if !matrix || matrix.rows.length === 0}
	<p class="muted-text">Nessuna classificazione JLPT trovata. Il database si sta inizializzando…</p>
{:else if matrix.cols.length === 0}
	<section class="section-card empty-state">
		<p class="card-title">Nessun corso importato</p>
		<p class="muted-text">
			Importa almeno un corso (es. Genki I o Genki II) per vedere quanto copre il catalogo JLPT.
		</p>
		<a href="{base}/courses" class="btn btn-primary">Vai a Corsi</a>
	</section>
{:else}
	<!-- Riepilogo -->
	<section class="section-card">
		<p class="card-title">Riepilogo</p>
		<div class="summary-grid">
			{#each matrix.cols as col (col.id)}
				{@const s = courseSummary(col.id)}
				<div class="summary-box">
					<span class="summary-name">{col.name}</span>
					<span class="summary-pct" style="color:{pctColor(s.pct)}">{s.pct}%</span>
					<span class="summary-sub">di {s.label}</span>
				</div>
			{/each}
		</div>
		<div class="summary-grid">
			{#each matrix.rows as row (row.source.id)}
				{@const uncoveredAll = rowUncoveredEverywhere(row)}
				<div class="summary-box">
					<span class="summary-name">{row.source.name}</span>
					<span class="summary-pct" style="color:{uncoveredAll > 0 ? 'var(--danger)' : 'var(--success)'}"
						>{uncoveredAll}</span
					>
					<span class="summary-sub">fuori da ogni corso</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Matrice -->
	<section class="section-card">
		<p class="card-title">Matrice di copertura</p>
		<div class="matrix-scroll">
			<table class="matrix">
				<thead>
					<tr>
						<th class="row-head"></th>
						{#each matrix.cols as col (col.id)}
							<th class="col-head">{col.name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each matrix.rows as row (row.source.id)}
						<tr>
							<th class="row-head">
								{row.source.name}
								<span class="row-split"
									>{row.split.words} 📦 · {row.split.kanji} 漢 · {row.split.grammar} 📖</span
								>
							</th>
							{#each matrix.cols as col (col.id)}
								{@const cell = row.cells[col.id]}
								<td>
									{#if cell}
										<button
											type="button"
											class="cell-btn"
											style={cellStyle(cell.pct)}
											onclick={() => openCell(row, col.id, col.name)}
											title="{row.source.name} coperto da {col.name}"
										>
											<span class="cell-pct">{cell.pct}%</span>
											<span class="cell-frac">{cell.covered}/{cell.total}</span>
										</button>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="muted-text matrix-hint">Tocca una cella per vedere cosa resta scoperto.</p>
	</section>
{/if}

{#if openRow && openColId !== null}
	<div class="drill-backdrop">
		<section class="drill-panel section-card">
			<div class="drill-head">
				<p class="card-title">
					{openRow.source.name} non coperti da {openColName}
				</p>
				<button type="button" class="close-btn" onclick={closeDrill} aria-label="Chiudi">✕</button>
			</div>
			{#if uncoveredLoading}
				<p class="muted-text">Caricamento…</p>
			{:else if uncovered.length === 0}
				<p class="muted-text">Tutto coperto — nessun elemento scoperto.</p>
			{:else}
				<ul class="uncovered-list">
					{#each uncovered as item (item.key)}
						<li>
							<a href="{base}/{item.href}" class="uncovered-link">
								<span class="uncovered-icon">{TYPE_ICON[item.type] ?? '❓'}</span>
								<span class="uncovered-text">{item.text}</span>
							</a>
						</li>
					{/each}
				</ul>
				{#if !showAllUncovered && uncoveredTotal > uncovered.length}
					<button type="button" class="btn btn-secondary" onclick={showAll}
						>Vedi tutti ({uncoveredTotal})</button
					>
				{/if}
			{/if}
		</section>
	</div>
{/if}

<style>
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0 0 4px; font-size: 0.85rem; color: var(--muted); line-height: 1.55; }
	.muted-text { color: var(--muted); font-size: 0.85rem; margin: 0; }

	.section-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 12px;
		margin-bottom: 14px;
	}

	.card-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.empty-state { justify-items: start; }

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 8px 16px;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.88rem;
		text-decoration: none;
		border: none;
		cursor: pointer;
	}
	.btn-primary { background: var(--brand); color: #fff; }
	.btn-secondary { background: var(--surface-2); color: var(--ink); border: 1px solid var(--line); }

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 10px;
	}
	.summary-box {
		display: grid;
		gap: 2px;
		justify-items: center;
		text-align: center;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 8px;
	}
	.summary-name { font-size: 0.75rem; font-weight: 600; color: var(--ink); }
	.summary-pct { font-size: 1.3rem; font-weight: 800; }
	.summary-sub { font-size: 0.65rem; color: var(--muted); }

	.matrix-scroll { overflow-x: auto; }
	.matrix { border-collapse: separate; border-spacing: 6px; width: 100%; }
	.row-head {
		text-align: left;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--ink);
		padding: 4px 8px;
		white-space: nowrap;
		display: table-cell;
	}
	.row-split { display: block; font-size: 0.62rem; font-weight: 500; color: var(--muted); }
	.col-head {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--muted);
		padding: 4px 8px;
		white-space: nowrap;
	}
	.cell-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-width: 72px;
		min-height: 44px;
		border-radius: 10px;
		border: 1px solid var(--line);
		cursor: pointer;
		padding: 6px 8px;
		font: inherit;
	}
	.cell-pct { font-size: 0.95rem; font-weight: 800; color: var(--ink); }
	.cell-frac { font-size: 0.65rem; color: var(--muted); }
	.matrix-hint { margin: 0; }

	.drill-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(14, 29, 51, 0.45);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 200;
		padding: 0;
	}
	.drill-panel {
		width: 100%;
		max-width: 560px;
		max-height: 75vh;
		overflow-y: auto;
		border-radius: 16px 16px 0 0;
		margin: 0;
	}
	.drill-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.close-btn {
		min-width: 40px;
		min-height: 40px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--surface-2);
		color: var(--ink);
		font-size: 1rem;
		cursor: pointer;
	}

	.uncovered-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.uncovered-link {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 40px;
		padding: 6px 10px;
		border-radius: 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
		font-size: 0.88rem;
	}
	.uncovered-icon { font-size: 1rem; }
	.uncovered-text { font-weight: 600; }
</style>
