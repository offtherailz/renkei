<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
	import FormCard from '$lib/components/FormCard.svelte';

	const slug = $derived($page.params.slug);
	// solo le parti del discorso (non composte) hanno una pagina propria qui;
	// le forme composte vivono nella panoramica /forme-composte.
	const form = $derived(GRAMMAR_FORMS.find((f) => f.slug === slug && !f.composed) ?? null);
</script>

<div class="form-page">
	<a class="back" href="{base}/forme">← Forme grammaticali</a>
	{#if form}
		{#key form.slug}
			<FormCard {form} />
		{/key}
	{:else}
		<article class="notfound">
			<p>Questa forma non ha una scheda qui.</p>
			<p>Torna alle <a href="{base}/forme">parti del discorso</a> o guarda le <a href="{base}/forme-composte">forme composte</a>.</p>
		</article>
	{/if}
</div>

<style>
	.form-page { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.notfound {
		background: var(--surface); border-radius: 16px; padding: 20px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); display: grid; gap: 8px; font-size: 0.9rem;
	}
	.notfound a { color: var(--brand); font-weight: 600; }
</style>
