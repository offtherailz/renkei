<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import FuriganaText from './FuriganaText.svelte';
	import type { Dialogue } from '$lib/types/models';

	interface Props {
		dialogue: Dialogue;
		/** word IDs the user already knows (have SRS progress) */
		knownWordIds?: Set<string>;
	}

	const { dialogue, knownWordIds = new Set() }: Props = $props();

	const JLPT_COLORS: Record<string, string> = {
		N5: '#22c55e', N4: '#3b82f6', N3: '#f59e0b', N2: '#ef4444', N1: '#7c3aed'
	};

	// Characters get consistent colors
	const CHAR_PALETTE = ['#4f46e5', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2'];
	const charColors = new Map<string, string>();
	let paletteIdx = 0;
	function colorFor(personaggio: string): string {
		if (!charColors.has(personaggio)) {
			charColors.set(personaggio, CHAR_PALETTE[paletteIdx % CHAR_PALETTE.length]);
			paletteIdx++;
		}
		return charColors.get(personaggio)!;
	}

	function speakLine(text: string): void {
		if (!('speechSynthesis' in window)) return;
		const utter = new SpeechSynthesisUtterance(text.replace(/[一-龯々ぁ-んァ-ン]\[[^\]]+\]/g, (m) => m.split('[')[0]));
		utter.lang = 'ja-JP';
		speechSynthesis.cancel();
		speechSynthesis.speak(utter);
	}

	function goToWord(wordId: string): void {
		goto(`${base}/detail/word:${wordId}`);
	}

	let showTranslation = $state(false);
</script>

<div class="dialogue-card">
	<div class="dialogue-header">
		<div class="dialogue-title-row">
			<h3 class="dialogue-title">{dialogue.titolo.it}</h3>
			{#if dialogue.livello_jlpt}
				<span class="jlpt-badge" style="background:{JLPT_COLORS[dialogue.livello_jlpt] ?? '#888'}">
					{dialogue.livello_jlpt}
				</span>
			{/if}
		</div>
		{#if dialogue.contesto}
			<p class="dialogue-context">{dialogue.contesto.it}</p>
		{/if}
	</div>

	<div class="lines">
		{#each dialogue.righe as riga, i (i)}
			<div class="line">
				<div class="line-meta">
					<span class="character-label" style="color:{colorFor(riga.personaggio)}">
						{riga.personaggio}
					</span>
					<button class="tts-btn" onclick={() => speakLine(riga.testo)} aria-label="Ascolta">
						🔊
					</button>
				</div>
				<div class="line-text">
					<FuriganaText text={riga.testo} />
				</div>
				{#if showTranslation}
					<p class="line-translation">{riga.traduzione.it}</p>
				{/if}
				{#if riga.parole_linkate.length > 0}
					<div class="word-chips">
						{#each riga.parole_linkate as wordId (wordId)}
							<button
								class="word-chip"
								class:known={knownWordIds.has(wordId)}
								onclick={() => goToWord(wordId)}
							>
								{wordId.split('-').pop()}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="dialogue-footer">
		<button
			class="toggle-btn"
			onclick={() => (showTranslation = !showTranslation)}
		>
			{showTranslation ? 'Nascondi traduzioni' : 'Mostra traduzioni'}
		</button>
		{#if dialogue.parole_linkate.length > 0}
			<span class="vocab-count">{dialogue.parole_linkate.length} parole</span>
		{/if}
	</div>
</div>

<style>
	.dialogue-card {
		background: var(--surface);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 2px 12px rgba(14, 29, 51, 0.08);
	}

	.dialogue-header {
		padding: 14px 16px 10px;
		border-bottom: 1px solid var(--line);
	}

	.dialogue-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.dialogue-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
	}

	.jlpt-badge {
		font-size: 0.65rem;
		font-weight: 700;
		color: #fff;
		padding: 2px 6px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.dialogue-context {
		margin: 6px 0 0;
		font-size: 0.78rem;
		color: var(--muted);
	}

	.lines {
		padding: 8px 0;
	}

	.line {
		padding: 10px 16px;
		border-bottom: 1px solid var(--line);
	}

	.line:last-child {
		border-bottom: none;
	}

	.line-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.character-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tts-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-size: 0.85rem;
		opacity: 0.6;
		line-height: 1;
	}

	.tts-btn:hover { opacity: 1; }

	.line-text {
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.line-translation {
		margin: 4px 0 0;
		font-size: 0.82rem;
		color: var(--muted);
		font-style: italic;
	}

	.word-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}

	.word-chip {
		font-size: 0.7rem;
		padding: 2px 8px;
		border-radius: 20px;
		border: 1px solid var(--brand);
		background: transparent;
		color: var(--brand);
		cursor: pointer;
		transition: background 0.15s;
	}

	.word-chip.known {
		background: #eef2ff;
	}

	.word-chip:hover {
		background: var(--brand);
		color: #fff;
	}

	.dialogue-footer {
		padding: 10px 16px;
		border-top: 1px solid var(--line);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.toggle-btn {
		font-size: 0.78rem;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--surface-2);
		color: var(--ink);
		cursor: pointer;
	}

	.toggle-btn:hover { border-color: var(--brand); color: var(--brand); }

	.vocab-count {
		font-size: 0.72rem;
		color: var(--muted);
	}
</style>
