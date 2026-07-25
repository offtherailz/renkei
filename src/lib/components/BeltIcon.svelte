<script lang="ts">
	// Cintura di karatè disegnata (fascia annodata coi capi che scendono).
	// Colore dai token --belt-* del tema (mai esadecimali qui).
	import type { BeltColor } from '$lib/core/gameBelts';

	interface Props {
		belt: BeltColor; // 'nessuna' → fascia tratteggiata vuota
		size?: number; // altezza in px
	}
	const { belt, size = 16 }: Props = $props();
	const color = $derived(belt === 'nessuna' ? 'transparent' : `var(--belt-${belt})`);
</script>

<svg
	class="belt"
	class:empty={belt === 'nessuna'}
	width={size * 2}
	height={size}
	viewBox="0 0 48 24"
	aria-hidden="true"
>
	<!-- fascia -->
	<rect x="1" y="7" width="46" height="8" rx="2" fill={color} stroke="var(--belt-edge)" stroke-width="1.5" stroke-dasharray={belt === 'nessuna' ? '3 3' : 'none'} />
	{#if belt !== 'nessuna'}
		<!-- capi che scendono dal nodo -->
		<path d="M22 13 L17 22 L21 22 L24 15 Z" fill={color} stroke="var(--belt-edge)" stroke-width="1" />
		<path d="M26 13 L31 22 L27 22 L24 15 Z" fill={color} stroke="var(--belt-edge)" stroke-width="1" />
		<!-- nodo -->
		<rect x="19" y="6" width="10" height="10" rx="2.5" fill={color} stroke="var(--belt-edge)" stroke-width="1.5" />
	{/if}
</svg>

<style>
	.belt {
		display: inline-block;
		vertical-align: middle;
	}
	.belt.empty {
		opacity: 0.5;
	}
</style>
