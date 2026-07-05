<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { createDefaultTokenizer } from '$lib/core/tokenizer';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { ensureWordIndex, lookupToken, jishoUrl, type WordHit } from '$lib/core/wordLookup';
	import { detectUserLocale } from '$lib/core/i18n';
	import { speakSentenceJapanese } from '$lib/core/tts';

	// testo con eventuale notazione furigana base[lettura]
	const { text }: { text: string } = $props();

	const plain = $derived(stripFuriganaNotation(text));
	let tokens = $state<string[]>([]);
	let hits = $state<(WordHit | null)[]>([]);
	let open = $state<number | null>(null);

	onMount(async () => {
		const [tok, idx] = await Promise.all([createDefaultTokenizer(), ensureWordIndex(detectUserLocale())]);
		tokens = tok.tokenize(plain);
		hits = tokens.map((t) => (/[ぁ-んァ-ヶ一-龯々]/.test(t) ? lookupToken(idx, t) : null));
	});

	function toggle(i: number): void {
		open = open === i ? null : i;
	}
</script>

<span class="isentence">
	{#if tokens.length === 0}
		{plain}
	{:else}
		{#each tokens as tok, i (i)}
			{#if /[ぁ-んァ-ヶ一-龯々]/.test(tok)}
				<button class="tok" class:known={hits[i]} onclick={() => toggle(i)}>{tok}</button>
				{#if open === i}
					<span class="tok-pop">
						{#if hits[i]}
							<span class="pop-reading">{hits[i]!.lettura}</span>
							<span class="pop-gloss">{hits[i]!.significato}</span>
							<span class="pop-actions">
								<a href="{base}/detail/{encodeURIComponent(`word:${hits[i]!.id}`)}">📖 Scheda</a>
								<a href="{base}/consolida/{encodeURIComponent(hits[i]!.id)}">💪 Consolida</a>
							</span>
						{:else}
							<span class="pop-gloss">🔗 fuori catalogo</span>
							<span class="pop-actions">
								<a href={jishoUrl(tok)} target="_blank" rel="noopener">Cerca su Jisho ↗</a>
							</span>
						{/if}
						<button class="pop-tts" onclick={() => speakSentenceJapanese(tok)}>🔊</button>
					</span>
				{/if}
			{:else}
				<span class="punct">{tok}</span>
			{/if}
		{/each}
	{/if}
</span>

<style>
	.isentence { font-size: 1.15rem; line-height: 2; }
	.tok {
		border: none;
		background: none;
		padding: 1px 2px;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
		border-bottom: 2px dotted var(--line);
	}
	.tok.known { border-bottom-color: var(--brand); }
	.tok:hover { background: rgba(107, 160, 242, 0.14); border-radius: 4px; }
	.punct { color: var(--ink); }

	.tok-pop {
		position: relative;
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin: 0 4px;
		padding: 4px 10px;
		border-radius: 8px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		font-size: 0.8rem;
		vertical-align: middle;
	}
	.pop-reading { color: var(--brand); font-weight: 700; }
	.pop-gloss { color: var(--muted); }
	.pop-actions { display: inline-flex; gap: 8px; }
	.pop-actions a { color: var(--brand); text-decoration: none; font-weight: 600; }
	.pop-tts { border: none; background: none; cursor: pointer; font-size: 0.85rem; }
</style>
