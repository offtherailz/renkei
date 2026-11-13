<script lang="ts">
	import { base } from '$app/paths';
	// Il foglio di プリクラ, come esce dalla macchinetta: le stesse foto in più
	// copie di misure diverse (3 grandi, 4 medie, 12 piccole), la data e i nomi in
	// alto; ogni foto-adesivo ha la cornice scelta.
	const {
		pose, scritta, cornice = null, data = '', nomi = '', piccola = false, striscia = null
	}: { pose: string[]; scritta: string; cornice?: string | null; data?: string; nomi?: string; piccola?: boolean; striscia?: string | null } = $props();
	// striscia: lo stile della striscia dell'album (lucida, pellicola, pois); assente = il foglio intero
	const stile = $derived(striscia ?? 'lucida');
	const STICKER = [['✨', '💖'], ['⭐', '🎀'], ['🌸', '💫']];
	const n = $derived(pose.length);
	const medie = $derived([0, 1, 2, 0].map((i) => i % n));
	const piccole = $derived([0, 1, 2, 0, 1, 2, 1, 2, 0, 2, 0, 1].map((i) => i % n));
</script>

{#snippet scatto(i: number, conScritta: boolean)}
	<div class="scatto" style="background-image: url({base}/giorno/sfondi/purikura.jpg)">
		<img src="{base}/giorno/ritratti/studentessa_rossa_{pose[i]}-chiusa.png" alt="" />
		{#if cornice}<img class="bordo" src="{base}/giorno/cornici/{cornice}.png" alt="" />
		{:else}<span class="st a">{STICKER[i % 3]![0]}</span><span class="st b">{STICKER[i % 3]![1]}</span>{/if}
		{#if conScritta}<span class="scritta">{scritta}</span>{/if}
	</div>
{/snippet}

{#if striscia}
	<div class="striscia {stile}">
		{#each pose as _, i (i)}{@render scatto(i, i === n - 1)}{/each}
		<div class="piede"><span>♡ {data}</span><span>{nomi}</span></div>
	</div>
{:else}
<div class="cornice" class:piccola>
	<div class="foglio">
		<div class="testa"><span>♡ {data} ♡</span><b>{nomi}</b></div>
		<div class="g grandi">{#each pose as _, i (i)}{@render scatto(i, i === n - 1)}{/each}</div>
		<div class="g medie">{#each medie as i, k (k)}{@render scatto(i, false)}{/each}</div>
		<div class="g piccole">{#each piccole as i, k (k)}{@render scatto(i, false)}{/each}</div>
		<div class="firma">PURI★KURA 山野駅前</div>
	</div>
</div>
{/if}

<style>
	.cornice { width: 100%; max-width: 380px; }
	.cornice.piccola { max-width: 200px; }
	.foglio { position: relative; background: linear-gradient(135deg, #fff 0%, #f6f0ff 100%); padding: 8px; display: grid; gap: 5px; color: #ff5fa2; }
	.foglio { border-radius: 6px; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25), 0 0 0 1px #ddd; }
	/* il riflesso della carta lucida */
	.foglio::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255, 255, 255, 0.5) 0%, transparent 35%, transparent 60%, rgba(255, 255, 255, 0.22) 75%, transparent 90%); pointer-events: none; }
	.testa { display: flex; justify-content: space-between; align-items: center; gap: 6px; font: 900 0.8rem sans-serif; }
	.testa b { font-size: 0.95rem; letter-spacing: 1px; }
	.g { display: grid; gap: 5px; }
	.grandi { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.medie { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.piccole { grid-template-columns: repeat(6, minmax(0, 1fr)); }
	.scatto { position: relative; aspect-ratio: 3 / 4; background-size: cover; background-position: center; overflow: hidden; border-radius: 7px; box-shadow: 0 0 0 1px #fff, 0 0 0 2px #f4c6da; }
	.scatto img.bordo { inset: 0; left: 0; bottom: auto; width: 100%; height: 100%; transform: none; z-index: 1; }
	.scatto .scritta { z-index: 2; }
	.scatto img { position: absolute; left: 50%; bottom: 0; height: 92%; transform: translateX(-50%); image-rendering: pixelated; }
	.st { position: absolute; font-size: 0.9rem; line-height: 1; }
	.medie .st { font-size: 0.65rem; }
	.piccole .st { font-size: 0.45rem; }
	.st.a { top: 4%; left: 6%; }
	.st.b { top: 10%; right: 6%; }
	.scritta { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%) rotate(-6deg); white-space: nowrap; font-weight: 900; font-size: 1.1rem; color: #e8247a; -webkit-text-stroke: 4px #fff; paint-order: stroke fill; }
	.firma { text-align: right; color: #a58bd6; font: 700 0.7rem sans-serif; }
	.piccola .foglio { padding: 4px; gap: 3px; }
	.piccola .g { gap: 3px; }
	.piccola .testa { font-size: 0.5rem; }
	.piccola .testa b { font-size: 0.6rem; }
	.piccola .scritta { font-size: 0.55rem; -webkit-text-stroke: 2px #fff; }
	.piccola .st, .piccola .firma { display: none; }
	.piccola .scatto { border-radius: 3px; }
	/* strisce dell'album */
	.striscia { position: relative; width: 120px; display: grid; gap: 6px; padding: 7px; box-sizing: border-box; }
	.striscia .scritta { font-size: 0.85rem; -webkit-text-stroke: 3px #fff; }
	.striscia .st { font-size: 0.6rem; }
	.piede { display: flex; justify-content: space-between; gap: 4px; color: #ff5fa2; font: 900 0.5rem sans-serif; white-space: nowrap; }
	.lucida { background: linear-gradient(160deg, #fff, #fbeef6); border-radius: 5px; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25); }
	.lucida::after { content: ''; position: absolute; inset: 0; border-radius: 5px; background: linear-gradient(115deg, rgba(255, 255, 255, 0.55), transparent 35%, transparent 65%, rgba(255, 255, 255, 0.2) 78%, transparent 90%); pointer-events: none; }
	.lucida .scatto { border-radius: 4px; }
	.pellicola { width: 136px; background: #1d1a24; padding: 9px 16px; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
	.pellicola::before, .pellicola::after { content: ''; position: absolute; top: 0; bottom: 0; width: 7px; background: repeating-linear-gradient(#1d1a24 0 5px, #f2eee6 5px 12px, #1d1a24 12px 17px); }
	.pellicola::before { left: 4px; }
	.pellicola::after { right: 4px; }
	.pellicola .scatto { border-radius: 0; box-shadow: 0 0 0 2px #fff; }
	.pellicola .piede { color: #f2c94c; }
	.pois { border-radius: 7px; background: #fff radial-gradient(#ffd3e6 1.5px, transparent 2px) 0 0 / 9px 9px; box-shadow: 0 0 0 4px #ff9cc6, 0 4px 0 4px rgba(0, 0, 0, 0.2); }
	.pois .scatto { border-radius: 4px; box-shadow: 0 0 0 2px #fff; }
</style>
