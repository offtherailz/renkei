<script lang="ts">
	import { renderFuriganaToHtml, stripFuriganaNotation } from '$lib/core/furigana';
	import { appState } from '$lib/stores.svelte';

	interface Props {
		text: string;
		class?: string;
		// force: mostra sempre i furigana, ignorando il toggle globale — per i
		// contesti dove la lettura È il contenuto (aiuto lettura svelato ecc.).
		force?: boolean;
	}

	const { text, class: cls = '', force = false }: Props = $props();

	// Default true: senza impostazione salvata i furigana restano visibili.
	const show = $derived(force || (appState.settings?.furigana_visibile ?? true));
	const html = $derived(renderFuriganaToHtml(text));
	const plain = $derived(stripFuriganaNotation(text));
</script>

{#if show}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<span class={cls}>{@html html}</span>
{:else}
	<span class={cls}>{plain}</span>
{/if}
