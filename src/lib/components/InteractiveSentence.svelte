<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { createDefaultTokenizer } from '$lib/core/tokenizer';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { ensureWordIndex, lookupToken, jishoUrl, type WordHit } from '$lib/core/wordLookup';
	import { detectUserLocale } from '$lib/core/i18n';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';

	// testo con eventuale notazione furigana base[lettura]; mark = sottostringhe
	// del testo da evidenziare (es. la frase che conteneva la risposta)
	const { text, mark = [] }: { text: string; mark?: string[] } = $props();

	const plain = $derived(stripFuriganaNotation(text));
	let tokens = $state<string[]>([]);
	let hits = $state<(WordHit | null)[]>([]);
	let open = $state<number | null>(null);

	// Popover flottante: non spinge il testo, si posiziona sotto il token
	// cliccato (con clamp ai bordi dello schermo) e si chiude cliccando fuori,
	// con Escape o scorrendo (la posizione fixed non lo seguirebbe).
	const POP_WIDTH = 260;
	let popPos = $state<{ top: number; left: number } | null>(null);
	let anchorEl: HTMLElement | null = null;
	let popEl = $state<HTMLElement | null>(null);

	function closePopover(): void {
		open = null;
		popPos = null;
		anchorEl = null;
	}

	// Scorrere la pagina non chiude il popover: lo riaggancia sotto il token
	// (che si muove con lo scroll, essendo "fixed" solo lui).
	function repositionPopover(): void {
		if (!anchorEl) return;
		const rect = anchorEl.getBoundingClientRect();
		const left = Math.max(8, Math.min(rect.left + rect.width / 2 - POP_WIDTH / 2, window.innerWidth - POP_WIDTH - 8));
		popPos = { top: rect.bottom + 6, left };
	}

	function onWindowClick(e: MouseEvent): void {
		const target = e.target as Node;
		if (anchorEl?.contains(target) || popEl?.contains(target)) return;
		closePopover();
	}
	function onWindowKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') closePopover();
	}

	$effect(() => {
		if (open === null) return;
		window.addEventListener('click', onWindowClick, true);
		window.addEventListener('keydown', onWindowKeydown);
		window.addEventListener('scroll', repositionPopover, true);
		window.addEventListener('resize', repositionPopover);
		return () => {
			window.removeEventListener('click', onWindowClick, true);
			window.removeEventListener('keydown', onWindowKeydown);
			window.removeEventListener('scroll', repositionPopover, true);
			window.removeEventListener('resize', repositionPopover);
		};
	});

	// intervalli [inizio, fine) delle sottostringhe da evidenziare
	const ranges = $derived(
		mark
			.map((m) => {
				const i = plain.indexOf(m);
				return i >= 0 ? ([i, i + m.length] as const) : null;
			})
			.filter((r) => r !== null)
	);
	// offset dei token nel testo (BudouX scarta gli spazi: si riallinea cercando)
	const offsets = $derived.by(() => {
		const out: [number, number][] = [];
		let cursor = 0;
		for (const t of tokens) {
			const i = plain.indexOf(t, cursor);
			if (i < 0) {
				out.push([cursor, cursor]);
				continue;
			}
			out.push([i, i + t.length]);
			cursor = i + t.length;
		}
		return out;
	});
	function marked(i: number): boolean {
		const o = offsets[i];
		if (!o) return false;
		return ranges.some(([a, b]) => o[0] < b && o[1] > a);
	}

	onMount(async () => {
		const [tok, idx] = await Promise.all([createDefaultTokenizer(), ensureWordIndex(detectUserLocale())]);
		tokens = tok.tokenize(plain);
		hits = tokens.map((t, i) => (/[ぁ-んァ-ヶ一-龯々]/.test(t) ? lookupToken(idx, t, tokens[i - 1]) : null));
	});

	function toggle(i: number, e: MouseEvent): void {
		if (open === i) {
			closePopover();
			return;
		}
		anchorEl = e.currentTarget as HTMLElement;
		open = i;
		repositionPopover();
	}

	// «Non la conoscevo»: la parola entra nel consolidamento (punti deboli in
	// home) senza lasciare il flusso — stessa via degli errori nelle avventure.
	let flagged = $state<Set<string>>(new Set());
	async function flagUnknown(hit: WordHit): Promise<void> {
		await recordPracticeMiss('word:' + hit.id);
		flagged = new Set([...flagged, hit.id]);
	}
</script>

<span class="isentence">
	{#if tokens.length === 0}
		{plain}
	{:else}
		{#each tokens as tok, i (i)}
			{#if /[ぁ-んァ-ヶ一-龯々]/.test(tok)}
				<button class="tok" class:known={hits[i]} class:marked={marked(i)} onclick={(e) => toggle(i, e)}>{tok}</button>
				{#if open === i && popPos}
					<span class="tok-pop" style="top:{popPos.top}px; left:{popPos.left}px; width:{POP_WIDTH}px" bind:this={popEl}>
						{#if hits[i]}
							<span class="pop-reading">{hits[i]!.scrittura !== tok ? hits[i]!.scrittura + '・' : ''}{hits[i]!.lettura}</span>
							<span class="pop-gloss">{hits[i]!.significato}</span>
							{#if hits[i]!.forma}
								<span class="pop-form">{hits[i]!.forma}</span>
							{/if}
							<span class="pop-actions">
								<a href="{base}/detail/{encodeURIComponent(`word:${hits[i]!.id}`)}">📖 Scheda</a>
								<a href="{base}/consolida/{encodeURIComponent(hits[i]!.id)}">💪 Consolida</a>
								{#if flagged.has(hits[i]!.id)}
									<span class="pop-flagged">✓ nei ripassi</span>
								{:else}
									<button class="pop-flag" onclick={() => flagUnknown(hits[i]!)}>➕ Non la conoscevo</button>
								{/if}
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
				<span class="punct" class:marked={marked(i)}>{tok}</span>
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
	.marked { background: rgba(245, 158, 11, 0.22); border-radius: 4px; }
	.tok:hover { background: rgba(107, 160, 242, 0.14); border-radius: 4px; }
	.punct { color: var(--ink); }

	.tok-pop {
		position: fixed;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 10px;
		background: var(--surface);
		border: 1px solid var(--line);
		box-shadow: 0 6px 20px rgba(14, 29, 51, 0.18);
		font-size: 0.8rem;
		z-index: 200;
	}
	.pop-reading { color: var(--brand); font-weight: 700; }
	.pop-form { color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 6px; padding: 1px 6px; font-size: 0.72rem; }
	.pop-gloss { color: var(--muted); }
	.pop-actions { display: inline-flex; gap: 8px; flex-wrap: wrap; align-items: center; }
	.pop-actions a { color: var(--brand); text-decoration: none; font-weight: 600; }
	.pop-flag { border: 1px solid var(--warn-border); background: var(--warn-bg); color: var(--warn-ink); border-radius: 8px; padding: 2px 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
	.pop-flagged { color: var(--success); font-weight: 700; font-size: 0.78rem; }
	.pop-tts { border: none; background: none; cursor: pointer; font-size: 0.85rem; }
</style>
