<script lang="ts">
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	// Frase giapponese intera; divisa in parole da toccare (lettura, significato)
	// solo a richiesta: col pulsante ✂️ di chi la mostra (dividi) o toccandola.
	const { text, dividi = false }: { text: string; dividi?: boolean } = $props();
	let toccata = $state(false);
	const aperta = $derived(dividi || toccata);
</script>

{#if aperta}
	<InteractiveSentence {text} spazi />
{:else}
	<span class="frase" role="button" tabindex="0" title="✂️" onclick={() => (toccata = true)} onkeydown={(e) => e.key === 'Enter' && (toccata = true)}>
		<FuriganaText {text} />
	</span>
{/if}

<style>
	.frase { cursor: pointer; }
</style>
