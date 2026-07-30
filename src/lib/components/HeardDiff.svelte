<script lang="ts">
	import { diffChars, bestDiffTarget, type DiffPart } from '$lib/core/speechDiff';
	import { readingOnlyNotation } from '$lib/core/furigana';

	interface Props {
		heard: string;
		candidates: (string | undefined)[];
		// Testo originale con notazione 漢字[よみ] (se disponibile): se una
		// parola non annotata è comune in kana nel parlato (es. 時々/ときどき),
		// il confronto a soli caratteri contro il solo kanji la segnava tutta
		// sbagliata anche quando l'utente la diceva giusta — bug segnalato.
		// Passandolo qui la lettura diventa un candidato IN PIÙ, centralizzato
		// una volta sola invece che ricostruito in ogni pagina che usa HeardDiff.
		annotatedText?: string;
	}
	const { heard, candidates, annotatedText }: Props = $props();

	// Confronto detto/atteso: barrato rosso ciò che non corrisponde (detto per
	// sbaglio o non richiesto), verde ciò che manca o va corretto.
	const diffParts = $derived.by((): DiffPart[] => {
		if (!heard) return [];
		const readingVariant = annotatedText ? readingOnlyNotation(annotatedText) : undefined;
		const list = [...candidates, readingVariant].filter((c): c is string => !!c);
		if (!list.length) return [];
		const target = bestDiffTarget(heard, list);
		return diffChars(heard, target);
	});
</script>

{#if heard}
	<p class="heard-label">Hai detto:</p>
	{#if diffParts.length}
		<p class="diff-line">
			{#each diffParts as part, i (i)}
				{#if part.kind === 'same'}<span>{part.text}</span>
				{:else if part.kind === 'extra'}<span class="diff-extra">{part.text}</span>
				{:else}<span class="diff-miss">{part.text}</span>{/if}
			{/each}
		</p>
		<p class="diff-legend"><span class="diff-extra">rosso barrato</span> = detto per sbaglio o non richiesto · <span class="diff-miss">verde</span> = da aggiungere/correggere</p>
	{:else}
		<p class="heard-text">「{heard}」</p>
	{/if}
{/if}

<style>
	.heard-label { margin: 0; text-align: center; font-size: 0.75rem; color: var(--muted); font-weight: 600; }
	.diff-line { margin: 0; text-align: center; font-size: 1.05rem; line-height: 1.6; }
	.diff-extra { color: var(--danger); text-decoration: line-through; }
	.diff-miss { color: var(--success); font-weight: 700; }
	.diff-legend { margin: 0; text-align: center; font-size: 0.7rem; color: var(--muted); }
	.heard-text { margin: 0; text-align: center; font-size: 0.8rem; color: var(--muted); }
</style>
