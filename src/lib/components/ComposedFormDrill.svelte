<script lang="ts">
	import type { Word } from '$lib/types/models';
	import { buildComposedFormQuestions, type ConjugationQuestion } from '$lib/core/conjugation';
	import { shuffle } from '$lib/quiz/engine';
	import { speakSentenceJapanese } from '$lib/core/tts';

	const { word }: { word: Word } = $props();

	let questions = $state<ConjugationQuestion[]>([]);
	let index = $state(0);
	let selected = $state<string | null>(null);
	let correctCount = $state(0);
	let running = $state(false);
	let finished = $state(false);

	const current = $derived(questions[index] ?? null);
	const shuffledChoices = $derived(current ? shuffle(current.choices) : []);

	function start(): void {
		questions = shuffle(buildComposedFormQuestions(word));
		index = 0;
		selected = null;
		correctCount = 0;
		finished = false;
		running = true;
	}

	function pick(choice: string): void {
		if (selected !== null || !current) return;
		selected = choice;
		if (choice === current.correct) correctCount += 1;
		speakSentenceJapanese(current.correct);
	}

	function next(): void {
		if (index + 1 >= questions.length) {
			finished = true;
			return;
		}
		index += 1;
		selected = null;
	}
</script>

{#if buildComposedFormQuestions(word).length > 0}
	<article class="detail-card drill-card">
		{#if !running}
			<button class="drill-start" onclick={start}>🎯 Mettimi alla prova con le forme composte</button>
		{:else if finished}
			<p class="drill-result">
				{correctCount === questions.length ? '🏆' : correctCount >= questions.length / 2 ? '👍' : '💪'}
				{correctCount}/{questions.length} forme corrette
			</p>
			<button class="drill-start" onclick={start}>🔁 Riprova</button>
		{:else if current}
			<p class="drill-progress">Forma composta {index + 1}/{questions.length}</p>
			<p class="drill-prompt">
				<span class="drill-dict">{current.dictionary}</span> → <strong>{current.prompt}</strong>?
			</p>
			<div class="drill-choices">
				{#each shuffledChoices as choice}
					<button
						class="drill-choice"
						class:right={selected !== null && choice === current.correct}
						class:wrong={selected === choice && choice !== current.correct}
						disabled={selected !== null}
						onclick={() => pick(choice)}
					>{choice}</button>
				{/each}
			</div>
			{#if selected !== null}
				<button class="drill-next" onclick={next}>
					{index + 1 >= questions.length ? 'Risultato →' : 'Avanti →'}
				</button>
			{/if}
		{/if}
	</article>
{/if}

<style>
	.drill-card {
		display: grid;
		gap: 10px;
		background: var(--surface);
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
	}

	.drill-start {
		padding: 12px 16px;
		border-radius: 10px;
		border: 1.5px dashed var(--brand);
		background: transparent;
		color: var(--brand);
		font-size: 0.92rem;
		font-weight: 700;
		cursor: pointer;
	}

	.drill-start:hover { background: rgba(107, 160, 242, 0.12); }

	.drill-progress {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.drill-prompt { margin: 0; font-size: 1rem; }

	.drill-dict { font-size: 1.3rem; font-weight: 700; }

	.drill-choices { display: grid; gap: 6px; }

	.drill-choice {
		padding: 10px 14px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		background: var(--surface-2);
		color: var(--ink);
		font-size: 1.15rem;
		text-align: left;
		cursor: pointer;
	}

	.drill-choice:hover:not(:disabled) { border-color: var(--brand); }
	.drill-choice:disabled { cursor: default; }
	.drill-choice.right { border-color: var(--success); background: rgba(52, 201, 138, 0.16); }
	.drill-choice.wrong { border-color: var(--danger); background: rgba(239, 107, 107, 0.16); }

	.drill-next {
		justify-self: end;
		padding: 7px 14px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: transparent;
		color: var(--brand);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.drill-next:hover { background: var(--brand); color: #fff; }

	.drill-result { margin: 0; font-size: 1.05rem; font-weight: 700; text-align: center; }
</style>
