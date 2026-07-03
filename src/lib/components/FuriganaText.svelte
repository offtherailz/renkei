<script lang="ts">
	import { renderFuriganaToHtml } from '$lib/core/furigana';

	interface Props {
		text: string;
		class?: string;
	}

	const { text, class: cls = '' }: Props = $props();

	const html = $derived(renderFuriganaToHtml(text));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<span class={cls}>{@html html}</span>
