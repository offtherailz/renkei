<script lang="ts">
	// Barra もう一度 / 🐢 ゆっくり condivisa: chiedi la ripetizione a voce e
	// risenti la battuta (le ripetizioni non finiscono nel copione).
	import { askRepeat } from '$lib/core/gameKit';
	import type { Gender } from '$lib/core/voices';

	let { line, gender }: { line: string; gender: Gender } = $props();
</script>

<div class="repeat-bar">
	<button class="mini" onclick={() => askRepeat(line, gender, false)}>🔁 もう一度</button>
	<button class="mini" onclick={() => askRepeat(line, gender, true)}>🐢 ゆっくり</button>
</div>

<style>
	.repeat-bar { display: flex; gap: 8px; justify-content: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
</style>
