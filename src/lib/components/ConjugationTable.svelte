<script lang="ts">
	import type { Word } from '$lib/types/models';
	import { buildConjugationTable } from '$lib/core/conjugation';
	import { speakSentenceJapanese } from '$lib/core/tts';

	const { word }: { word: Word } = $props();

	const forms = $derived(buildConjugationTable(word));
	let open = $state(false);
</script>

{#if forms.length > 0}
	<article class="table-card">
		<button class="table-toggle" onclick={() => (open = !open)}>
			{open ? '▾' : '▸'} Tabella coniugazioni ({forms.length} forme)
		</button>
		{#if open}
			<div class="forms-grid">
				{#each forms as form (form.key)}
					<div class="form-row">
						<span class="form-label">{form.label}</span>
						<button
							class="form-value"
							onclick={() => speakSentenceJapanese(form.value)}
							title="Ascolta"
						>{form.value} <span class="form-tts">🔊</span></button>
					</div>
				{/each}
			</div>
		{/if}
	</article>
{/if}

<style>
	.table-card {
		display: grid;
		gap: 10px;
		background: var(--surface);
		border-radius: 16px;
		padding: 14px 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
	}

	.table-toggle {
		border: none;
		background: none;
		padding: 0;
		text-align: left;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--ink);
		cursor: pointer;
	}

	.forms-grid { display: grid; gap: 4px; }

	.form-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		padding: 6px 8px;
		border-radius: 8px;
	}

	.form-row:nth-child(odd) { background: var(--surface-2); }

	.form-label { font-size: 0.78rem; color: var(--muted); }

	.form-value {
		border: none;
		background: none;
		padding: 0;
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--ink);
		cursor: pointer;
		text-align: right;
	}

	.form-value:hover { color: var(--brand); }

	.form-tts { font-size: 0.75rem; opacity: 0.6; }
</style>
