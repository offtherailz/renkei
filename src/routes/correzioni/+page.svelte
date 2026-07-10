<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { exportCorrections, listCorrections, removeCorrection } from '$lib/db/corrections';
	import type { UserCorrection } from '$lib/types/models';

	let corrections = $state<UserCorrection[]>([]);
	let loading = $state(true);

	onMount(async () => {
		corrections = await listCorrections();
		loading = false;
	});

	async function dropCorrection(id: string): Promise<void> {
		if (!confirm('Rimuovere questa correzione e ripristinare il valore originale?')) return;
		await removeCorrection(id);
		corrections = await listCorrections();
	}

	async function exportAll(): Promise<void> {
		const json = await exportCorrections();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `renkei-correzioni-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const label = (c: UserCorrection) => c.id.slice(c.kind.length + 1);
	const fields = (c: UserCorrection) => Object.keys(c.patch).join(', ');
	const when = (c: UserCorrection) => new Date(c.updated_at).toLocaleDateString();
</script>

<div class="corr-page">
	<h1 class="page-title">✏️ Le mie correzioni</h1>
	<p class="page-sub">
		Le modifiche fatte dalle schede (✏️ Correggi): valgono subito e sopravvivono agli
		aggiornamenti. Esportale per farle entrare nell'app pubblicata; rimuovile per
		ripristinare l'originale.
	</p>

	<button class="export-btn" onclick={exportAll} disabled={corrections.length === 0}>
		⬇️ Esporta tutte ({corrections.length})
	</button>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if corrections.length === 0}
		<p class="muted">Nessuna correzione. Aprine una scheda (parola o forma grammaticale) e usa «✏️ Correggi questa voce».</p>
	{:else}
		<div class="corr-list">
			{#each corrections as c (c.id)}
				<div class="corr-row" class:stale={c.stale}>
					<a class="corr-main" href="{base}/detail/{encodeURIComponent(c.id)}">
						<span class="corr-kind">{c.kind === 'word' ? '📖' : '📐'}</span>
						<span class="corr-id">{label(c)}</span>
						<span class="corr-fields">{fields(c)}</span>
						<span class="corr-date">{when(c)}</span>
						{#if c.stale}<span class="corr-stale">⚠️ il dato sotto è cambiato: verifica</span>{/if}
						{#if c.motivo}<span class="corr-motivo">「{c.motivo}」</span>{/if}
					</a>
					<button class="corr-del" title="Rimuovi e ripristina l'originale" onclick={() => dropCorrection(c.id)}>🗑</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.corr-page { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.export-btn { justify-self: start; padding: 8px 16px; border-radius: 10px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.export-btn:disabled { opacity: 0.5; cursor: default; }
	.corr-list { display: grid; gap: 6px; }
	.corr-row { display: flex; align-items: stretch; gap: 6px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); overflow: hidden; }
	.corr-row.stale { border-color: var(--warn-border); }
	.corr-main { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; text-decoration: none; color: var(--ink); font-size: 0.9rem; }
	.corr-main:hover { background: rgba(107,160,242,0.1); }
	.corr-kind { font-size: 1.05rem; }
	.corr-id { font-weight: 700; }
	.corr-fields { color: var(--brand); font-size: 0.75rem; }
	.corr-date { color: var(--muted); font-size: 0.72rem; }
	.corr-motivo { color: var(--muted); font-size: 0.75rem; }
	.corr-stale { color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 6px; padding: 1px 6px; font-size: 0.72rem; }
	.corr-del { border: none; border-left: 1px solid var(--line); background: none; padding: 0 14px; cursor: pointer; font-size: 1rem; }
	.corr-del:hover { background: rgba(239,107,107,0.12); }
	.muted { color: var(--muted); font-size: 0.85rem; }
</style>
