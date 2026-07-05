<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/db/schema';
	import type { Word } from '$lib/types/models';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import { blankSentence, findConjugatedForm } from '$lib/core/usage';
	import { buildConjugationTable } from '$lib/core/conjugation';
	import { shuffle } from '$lib/quiz/engine';
	import { speakSentenceJapanese } from '$lib/core/tts';

	const { word }: { word: Word } = $props();

	const locale = detectUserLocale();

	interface UsageExercise {
		kind: 'word' | 'conjugation';
		title: string;
		blanked: string;
		fullSentence: string;
		translation: string;
		correct: string;
		choices: string[];
	}

	let exercises = $state<UsageExercise[]>([]);
	let picked = $state<Record<number, string>>({});

	onMount(async () => {
		const built: UsageExercise[] = [];
		const example = (word.frasi_esempio ?? [])[0];
		if (!example) return;
		const translation = pickLocalizedText(example.traduzione, locale);

		// 1. Cloze della parola: la scelta giusta tra i sinonimi, nel contesto.
		const wordBlank = blankSentence(example.testo, word.scrittura);
		if (wordBlank) {
			const synonyms = (
				await Promise.all(word.sinonimi.slice(0, 6).map((id) => db.words.get(id)))
			)
				.map((w) => w?.scrittura)
				.filter((s): s is string => Boolean(s) && s !== word.scrittura);

			let distractors = [...new Set(synonyms)].slice(0, 3);
			if (distractors.length < 3) {
				const sameType = await db.words
					.where('livello_jlpt')
					.equals(word.livello_jlpt)
					.filter((w) => w.tipo_jp === word.tipo_jp && w.scrittura !== word.scrittura)
					.toArray();
				distractors = [
					...new Set([...distractors, ...shuffle(sameType).map((w) => w.scrittura)])
				].slice(0, 3);
			}

			if (distractors.length >= 2) {
				built.push({
					kind: 'word',
					title: 'Quale parola completa la frase?',
					blanked: wordBlank,
					fullSentence: example.testo,
					translation,
					correct: word.scrittura,
					choices: shuffle([word.scrittura, ...distractors])
				});
			}
		}

		// 2. Coniugazione in contesto: quale forma del verbo serve qui?
		if (word.tipo_jp.startsWith('動詞')) {
			const forms = buildConjugationTable(word);
			const hit = findConjugatedForm(example.testo, forms);
			if (hit && hit.key !== 'dict') {
				const blanked = blankSentence(example.testo, hit.value);
				if (blanked) {
					const others = shuffle(forms.filter((f) => f.key !== hit.key))
						.map((f) => f.value)
						.filter((v) => v !== hit.value)
						.slice(0, 3);
					built.push({
						kind: 'conjugation',
						title: 'Quale forma del verbo serve qui?',
						blanked,
						fullSentence: example.testo,
						translation,
						correct: hit.value,
						choices: shuffle([hit.value, ...others])
					});
				}
			}
		}

		exercises = built;
	});

	function pick(index: number, choice: string): void {
		if (picked[index] !== undefined) return;
		picked = { ...picked, [index]: choice };
		speakSentenceJapanese(exercises[index]!.fullSentence);
	}
</script>

{#if exercises.length > 0}
	<article class="usage-card">
		<p class="usage-title">🧪 Prova d'uso</p>
		{#each exercises as ex, i (ex.kind)}
			<div class="usage-exercise">
				<p class="usage-question">{ex.title}</p>
				<p class="usage-sentence ja">{picked[i] !== undefined ? ex.fullSentence : ex.blanked}</p>
				<div class="usage-choices">
					{#each ex.choices as choice}
						<button
							class="usage-choice"
							class:right={picked[i] !== undefined && choice === ex.correct}
							class:wrong={picked[i] === choice && choice !== ex.correct}
							disabled={picked[i] !== undefined}
							onclick={() => pick(i, choice)}
						>{choice}</button>
					{/each}
				</div>
				{#if picked[i] !== undefined}
					<p class="usage-translation">{ex.translation}</p>
				{/if}
			</div>
		{/each}
	</article>
{/if}

<style>
	.usage-card {
		display: grid;
		gap: 14px;
		background: var(--surface);
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
	}

	.usage-title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--ink);
	}

	.usage-exercise { display: grid; gap: 8px; }

	.usage-question { margin: 0; font-size: 0.78rem; color: var(--muted); }

	.usage-sentence {
		margin: 0;
		font-size: 1.15rem;
		line-height: 1.8;
		padding: 10px 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
	}

	.usage-choices {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.usage-choice {
		padding: 8px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--line);
		background: var(--surface-2);
		color: var(--ink);
		font-size: 1.1rem;
		min-height: 42px;
		cursor: pointer;
	}

	.usage-choice:hover:not(:disabled) { border-color: var(--brand); }
	.usage-choice:disabled { cursor: default; }
	.usage-choice.right { border-color: var(--success); background: rgba(52, 201, 138, 0.16); }
	.usage-choice.wrong { border-color: var(--danger); background: rgba(239, 107, 107, 0.16); }

	.usage-translation { margin: 0; font-size: 0.8rem; color: var(--muted); }
</style>
