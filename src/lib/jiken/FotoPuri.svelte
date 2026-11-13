<script lang="ts">
	import { base } from '$app/paths';
	// Una striscia di プリクラ: tre scatti di あや nella cabina, la scritta sull'ultimo.
	const { pose, scritta, piccola = false }: { pose: string[]; scritta: string; piccola?: boolean } = $props();
	const STICKER = [['✨', '💖'], ['⭐', '🎀'], ['🌸', '💫']];
</script>

<div class="striscia" class:piccola>
	{#each pose as p, i (i)}
		<div class="scatto" style="background-image: url({base}/giorno/sfondi/purikura.jpg)">
			<img src="{base}/giorno/ritratti/studentessa_rossa_{p}-chiusa.png" alt="" />
			<span class="st a">{STICKER[i % 3]![0]}</span><span class="st b">{STICKER[i % 3]![1]}</span>
			{#if i === pose.length - 1}<span class="scritta">{scritta}</span>{/if}
		</div>
	{/each}
</div>

<style>
	.striscia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #fff; padding: 5px; border: 2px solid #f2a7c3; box-shadow: 0 2px 0 #c97a9a; max-width: 420px; }
	.striscia.piccola { max-width: 220px; padding: 3px; gap: 2px; }
	.scatto { position: relative; aspect-ratio: 3 / 4; background-size: cover; background-position: center; overflow: hidden; }
	.scatto img { position: absolute; left: 50%; bottom: 0; height: 92%; transform: translateX(-50%); image-rendering: pixelated; }
	.st { position: absolute; font-size: 1.1rem; filter: drop-shadow(0 1px 0 #fff); }
	.piccola .st { font-size: 0.7rem; }
	.st.a { top: 4%; left: 6%; }
	.st.b { top: 10%; right: 6%; }
	.scritta { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%) rotate(-6deg); white-space: nowrap; font-weight: 900; font-size: 1.4rem; color: #e8247a; -webkit-text-stroke: 5px #fff; paint-order: stroke fill; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
	.piccola .scritta { font-size: 0.8rem; -webkit-text-stroke: 3px #fff; }
</style>
