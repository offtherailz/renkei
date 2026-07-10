<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SITUATIONS, type Situation, type UsefulPhrase } from '$lib/core/usefulPhrases';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches } from '$lib/core/speech';

	let current = $state<Situation | null>(null);
	let canSpeak = $state(false);
	onMount(() => {
		canSpeak = speechAvailable();
	});

	// pratica a voce: stato per frase (indice nella situazione corrente)
	let micIdx = $state<number | null>(null); // frase in ascolto
	let heard = $state<Record<number, string>>({});
	let okSet = $state<Set<number>>(new Set());

	function open(s: Situation): void {
		current = s;
		micIdx = null;
		heard = {};
		okSet = new Set();
	}

	function listen(p: UsefulPhrase, rate = 1): void {
		speakSentenceJapanese(p.jp, { rate });
	}

	async function tryToSay(p: UsefulPhrase, i: number): Promise<void> {
		if (micIdx !== null) return;
		micIdx = i;
		heard = { ...heard, [i]: '' };
		const alts = await listenJapanese();
		micIdx = null;
		if (alts.length === 0) {
			heard = { ...heard, [i]: '（何も聞こえませんでした…riprova）' };
			return;
		}
		heard = { ...heard, [i]: alts[0]! };
		if (speechMatches(alts, [[p.jp, p.yomi, ...(p.varianti ?? [])]])) {
			okSet = new Set([...okSet, i]);
		}
	}
</script>

<div class="fu-page">
	<div class="nav">
		{#if current}
			<button class="back" onclick={() => (current = null)}>← Situazioni</button>
		{:else}
			<a class="back" href="{base}/giochi">← Giochi</a>
		{/if}
	</div>

	{#if !current}
		<h1 class="page-title">🆘 Frasi utili</h1>
		<p class="page-sub">
			Le frasi che ti salvano nelle situazioni vere, con il come e il quando usarle — e la
			pratica a voce per averle pronte in bocca.
		</p>
		<div class="sit-grid">
			{#each SITUATIONS as s (s.id)}
				<button class="sit-card" onclick={() => open(s)}>
					<span class="sit-icon">{s.emoji}</span>
					<span class="sit-title">{s.titolo}</span>
					<span class="sit-count">{s.frasi.length} frasi</span>
				</button>
			{/each}
		</div>
	{:else}
		<h1 class="page-title">{current.emoji} {current.titolo}</h1>
		<p class="consigli">💡 {current.consigli}</p>

		<div class="phrase-list">
			{#each current.frasi as p, i (p.jp)}
				<article class="phrase-card" class:done={okSet.has(i)}>
					<p class="p-jp">{p.jp}</p>
					<p class="p-yomi">{p.yomi}</p>
					<p class="p-it">{p.it}</p>
					<p class="p-quando">📌 {p.quando}</p>
					<div class="p-actions">
						<button class="mini" onclick={() => listen(p)}>🔊 Ascolta</button>
						<button class="mini" onclick={() => listen(p, 0.6)}>🐢 Lenta</button>
						{#if canSpeak}
							<button class="mic" class:listening={micIdx === i} disabled={micIdx !== null && micIdx !== i} onclick={() => tryToSay(p, i)}>
								{micIdx === i ? '🎙️ Parla!' : okSet.has(i) ? '✅ Detta bene — ridilla' : '🎤 Prova a dirla'}
							</button>
						{/if}
					</div>
					{#if heard[i]}
						<p class="p-heard">Ho sentito: 「{heard[i]}」{okSet.has(i) ? ' ✓' : ''}</p>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.fu-page { display: grid; gap: 12px; }
	.nav { display: flex; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.sit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
	.sit-card { display: grid; gap: 4px; justify-items: center; padding: 16px 10px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); cursor: pointer; color: var(--ink); }
	.sit-card:hover { border-color: var(--brand); }
	.sit-icon { font-size: 1.8rem; }
	.sit-title { font-weight: 700; font-size: 0.92rem; text-align: center; }
	.sit-count { font-size: 0.72rem; color: var(--muted); }

	.consigli { margin: 0; font-size: 0.85rem; color: var(--ink); background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 10px 12px; line-height: 1.55; }

	.phrase-list { display: grid; gap: 10px; }
	.phrase-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 4px; }
	.phrase-card.done { border-color: var(--success, #16a34a); }
	.p-jp { margin: 0; font-size: 1.2rem; font-weight: 700; }
	.p-yomi { margin: 0; font-size: 0.8rem; color: var(--brand); }
	.p-it { margin: 0; font-size: 0.9rem; }
	.p-quando { margin: 4px 0 0; font-size: 0.8rem; color: var(--muted); line-height: 1.5; }
	.p-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; align-items: center; }
	.p-heard { margin: 4px 0 0; font-size: 0.8rem; color: var(--muted); }

	.mini { padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 0.82rem; cursor: pointer; }
	.mini:hover { border-color: var(--brand); }
	.mic { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.mic.listening { background: rgba(239,107,107,0.12); border-color: #dc2626; color: #dc2626; animation: micpulse 1s ease-in-out infinite; }
	.mic:disabled { opacity: 0.5; cursor: default; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
</style>
