<script lang="ts">
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { mondaiKey } from '$lib/data/esame-n4';
	import { shuffleChoices } from '$lib/data/esame-n4-prova';
	import type { GiocoRound } from '$lib/data/esame-n4-giochi';

	interface Props {
		title: string;
		intro: string;
		rounds: GiocoRound[];
		// slug dei 問題 a cui accreditare la pratica (punti deboli d'esame).
		creditMondai: string[];
		// mostra la freccia chi-dà → chi-riceve (gioco 授受).
		showArrows?: boolean;
		backHref?: string;
	}

	const { title, intro, rounds, creditMondai, showArrows = false, backHref = 'esame' }: Props =
		$props();

	let index = $state(0);
	let picked = $state<number | null>(null);
	let correctCount = $state(0);
	let done = $state(false);

	// Opzioni mescolate una volta (gli originali hanno la giusta in posizione 0).
	const rounds2 = $derived(
		rounds.map((r) => {
			const s = shuffleChoices(r.choices, r.correct);
			return { ...r, choices: s.choices, correct: s.correct };
		})
	);
	const round = $derived(rounds2[index] ?? null);

	function speak(text: string) {
		stopSpeaking();
		speakSentenceJapanese(text);
	}

	async function answer(i: number) {
		if (picked !== null || !round) return;
		picked = i;
		const correct = i === round.correct;
		if (correct) correctCount += 1;
		for (const slug of creditMondai) await recordPractice(mondaiKey(slug), correct);
	}

	function next() {
		if (index + 1 >= rounds.length) done = true;
		else {
			index += 1;
			picked = null;
		}
	}

	function restart() {
		index = 0;
		picked = null;
		correctCount = 0;
		done = false;
	}
</script>

<div class="game">
	<a class="back" href="{base}/{backHref}">← Esame N4</a>
	<h1 class="page-title">{title}</h1>
	<p class="page-sub">{intro}</p>

	{#if done}
		<div class="end">
			<p class="score">{correctCount} / {rounds.length}</p>
			<button class="btn primary" onclick={restart}>🔁 Rigioca</button>
		</div>
	{:else if round}
		<p class="count">Round {index + 1} / {rounds.length}</p>
		<p class="ctx">{round.contesto}</p>

		{#if showArrows && round.da && round.a}
			<div class="arrows">
				<span class="who from">{round.da}</span>
				<span class="arrow">➡️</span>
				<span class="who to">{round.a}</span>
			</div>
		{/if}

		<div class="prompt">
			<FuriganaText text={round.prompt} force={true} />
			<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => speak(round.prompt)}>🔊</button>
		</div>

		<div class="opts">
			{#each round.choices as c, i (i)}
				<button
					class="opt"
					class:right={picked !== null && i === round.correct}
					class:wrong={picked === i && i !== round.correct}
					disabled={picked !== null}
					onclick={() => answer(i)}
				>
					<FuriganaText text={c} force={true} />
				</button>
			{/each}
		</div>

		{#if picked !== null}
			<div class="feedback" class:ok={picked === round.correct}>
				<p class="fb"><strong>{picked === round.correct ? '✅ Giusto!' : '❌ Non proprio.'}</strong> {round.spiega}</p>
				<button class="btn primary" onclick={next}>
					{index + 1 >= rounds.length ? 'Vedi risultato' : 'Prossimo →'}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.game { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.count { margin: 0; font-size: 0.75rem; color: var(--muted); }
	.ctx { margin: 0; font-size: 0.95rem; font-weight: 600; }

	.arrows { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
	.who { font-size: 1.1rem; font-weight: 700; padding: 6px 12px; border-radius: 10px; }
	.who.from { background: var(--info-bg); color: var(--info-ink); }
	.who.to { background: var(--ok-bg); color: var(--ok-ink); }
	.arrow { font-size: 1.3rem; }

	.prompt { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; }
	.tts { border: none; background: transparent; cursor: pointer; font-size: 1.05rem; }

	.opts { display: grid; gap: 6px; }
	.opt { text-align: center; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); padding: 12px; font-size: 1.15rem; cursor: pointer; }
	.opt:hover:enabled { border-color: var(--brand); }
	.opt:disabled { cursor: default; }
	.opt.right { border-color: var(--success); background: var(--ok-bg); }
	.opt.wrong { border-color: var(--danger); background: var(--danger-bg); }

	.feedback { display: grid; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
	.fb { margin: 0; font-size: 0.9rem; }

	.end { display: grid; gap: 12px; justify-items: center; padding: 24px 0; }
	.score { margin: 0; font-size: 2rem; font-weight: 800; }

	.btn { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); padding: 10px 16px; font-size: 0.95rem; font-weight: 700; cursor: pointer; }
	.btn.primary { background: var(--brand); color: #fff; border-color: var(--brand); justify-self: start; }
</style>
