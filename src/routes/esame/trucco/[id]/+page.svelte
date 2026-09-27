<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { getTrucco, type TruccoQuiz } from '$lib/data/esame-n4-trucchi';
	import { EXAM_N4_HOT_POINTS, mondaiKey } from '$lib/data/esame-n4';
	import { shuffleChoices } from '$lib/data/esame-n4-prova';

	const id = $derived($page.params.id ?? '');
	const trucco = $derived(getTrucco(id));
	const hotPoint = $derived(EXAM_N4_HOT_POINTS.find((h) => h.id === id) ?? null);

	// Stato del mini-quiz.
	let qIndex = $state(0);
	let picked = $state<number | null>(null);
	let quizDone = $state(false);
	let correctCount = $state(0);

	// Opzioni mescolate una volta per trucco (gli originali hanno la giusta in 0).
	let quiz = $state<TruccoQuiz[]>([]);
	$effect(() => {
		const t = getTrucco(id);
		quiz = (t?.quiz ?? []).map((q) => {
			const s = shuffleChoices(q.choices, q.correct, q.perche_sbagliate);
			return { ...q, choices: s.choices, correct: s.correct, perche_sbagliate: s.wrong };
		});
		qIndex = 0;
		picked = null;
		quizDone = false;
		correctCount = 0;
	});
	const currentQ = $derived(quiz[qIndex] ?? null);

	function speak(text: string) {
		stopSpeaking();
		speakSentenceJapanese(text);
	}

	async function answer(i: number) {
		if (picked !== null || !currentQ) return;
		picked = i;
		const correct = i === currentQ.correct;
		if (correct) correctCount += 1;
		// Il credito d'esame va ai 問題 dove questo punto caldo compare.
		if (hotPoint) {
			for (const slug of hotPoint.mondai) await recordPractice(mondaiKey(slug), correct);
		}
	}

	function next() {
		if (qIndex + 1 >= quiz.length) {
			quizDone = true;
		} else {
			qIndex += 1;
			picked = null;
		}
	}

	function restart() {
		qIndex = 0;
		picked = null;
		quizDone = false;
		correctCount = 0;
	}

	// Etichetta di un'opzione errata → la sua nota (le note escludono la giusta,
	// nell'ordine delle opzioni saltando quella corretta).
	function wrongNote(q: NonNullable<typeof currentQ>, optionIndex: number): string {
		let k = 0;
		for (let j = 0; j < q.choices.length; j += 1) {
			if (j === q.correct) continue;
			if (j === optionIndex) return q.perche_sbagliate[k] ?? '';
			k += 1;
		}
		return '';
	}
</script>

<div class="trucco">
	<a class="back" href="{base}/esame">← Esame N4</a>

	{#if !trucco || !hotPoint}
		<h1 class="page-title">Trucco non trovato</h1>
		<p class="muted">Torna alla <a href="{base}/esame">panoramica esame</a>.</p>
	{:else}
		<h1 class="page-title">💡 {hotPoint.label}</h1>
		<p class="spiega">{trucco.spiegazione}</p>

		{#if trucco.drill || (trucco.grammatica && trucco.grammatica.length)}
			<div class="links">
				{#if trucco.drill}
					<a class="lnk primary" href="{base}/{trucco.drill.href}">{trucco.drill.label}</a>
				{/if}
				{#each trucco.grammatica ?? [] as g (g.href)}
					<a class="lnk" href="{base}/{g.href}">📖 {g.label}</a>
				{/each}
			</div>
		{/if}

		<h2 class="sec-title">Esempi</h2>
		<div class="esempi">
			{#each trucco.esempi as ex, i (i)}
				<article class="esempio">
					<div class="ex-jp">
						<FuriganaText text={ex.jp} force={true} />
						<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => speak(ex.jp)}>🔊</button>
					</div>
					<p class="ex-it">🇮🇹 {ex.it}</p>
					<p class="ex-en">🇬🇧 {ex.en}</p>
					<p class="ex-nota">💡 {ex.nota}</p>
				</article>
			{/each}
		</div>

		{#if trucco.parole && trucco.parole.length}
			<h2 class="sec-title">Parole chiave</h2>
			<div class="parole">
				{#each trucco.parole as p (p.w)}
					<div class="parola">
						<span class="p-w">{p.w}</span>
						<span class="p-yomi">{p.yomi}</span>
						<span class="p-it">{p.it}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if quiz.length}
			<h2 class="sec-title">Mini-quiz</h2>
			{#if quizDone}
				<div class="quiz done">
					<p class="score">Risultato: {correctCount} / {quiz.length}</p>
					<button class="lnk primary" onclick={restart}>🔁 Riprova</button>
					{#if trucco.drill}
						<a class="lnk" href="{base}/{trucco.drill.href}">Continua col drill →</a>
					{/if}
				</div>
			{:else if currentQ}
				<div class="quiz">
					<p class="q-count">Domanda {qIndex + 1} / {quiz.length}</p>
					<p class="q-prompt"><FuriganaText text={currentQ.prompt} force={true} /></p>
					<div class="opts">
						{#each currentQ.choices as c, i (i)}
							<div class="opt-row">
								<button
									class="opt"
									class:right={picked !== null && i === currentQ.correct}
									class:wrong={picked === i && i !== currentQ.correct}
									disabled={picked !== null}
									onclick={() => answer(i)}
								>
									<span class="opt-jp"><FuriganaText text={c} force={true} /></span>
								</button>
								<button class="tts small" title="Ascolta" aria-label="Ascolta opzione" onclick={() => speak(c)}>🔊</button>
							</div>
						{/each}
					</div>

					{#if picked !== null}
						<div class="feedback" class:ok={picked === currentQ.correct}>
							<p class="fb-line"><strong>{picked === currentQ.correct ? '✅ Giusto!' : '❌ Non proprio.'}</strong></p>
							<p class="fb-line">✔️ {currentQ.perche_giusta}</p>
							{#if picked !== currentQ.correct}
								<p class="fb-line muted">La tua scelta «{stripFuriganaNotation(currentQ.choices[picked] ?? '')}»: {wrongNote(currentQ, picked)}</p>
							{/if}
							<button class="lnk primary" onclick={next}>
								{qIndex + 1 >= quiz.length ? 'Vedi risultato' : 'Prossima →'}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.trucco { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; }
	.spiega { margin: 0; font-size: 0.92rem; line-height: 1.5; }
	.muted { color: var(--muted); }

	.links { display: flex; flex-wrap: wrap; gap: 8px; }
	.lnk { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); text-decoration: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.lnk:hover { border-color: var(--brand); }
	.lnk.primary { background: var(--brand); color: #fff; border-color: var(--brand); }

	.sec-title { margin: 8px 0 0; font-size: 1.05rem; }
	.esempi { display: grid; gap: 8px; }
	.esempio { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 10px 12px; display: grid; gap: 4px; }
	.ex-jp { display: flex; align-items: center; gap: 8px; font-size: 1.15rem; }
	.ex-it, .ex-en { margin: 0; font-size: 0.85rem; }
	.ex-en { color: var(--muted); }
	.ex-nota { margin: 2px 0 0; font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 6px 9px; }

	.tts { border: none; background: transparent; cursor: pointer; font-size: 1rem; padding: 2px 4px; }
	.tts.small { font-size: 0.85rem; }

	.parole { display: grid; gap: 6px; }
	.parola { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 8px 10px; }
	.p-w { font-size: 1rem; font-weight: 700; }
	.p-yomi { font-size: 0.8rem; color: var(--muted); }
	.p-it { font-size: 0.85rem; }

	.quiz { display: grid; gap: 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; }
	.quiz.done { text-align: center; gap: 12px; }
	.score { margin: 0; font-size: 1.1rem; font-weight: 700; }
	.q-count { margin: 0; font-size: 0.75rem; color: var(--muted); }
	.q-prompt { margin: 0; font-size: 1.1rem; }
	.opts { display: grid; gap: 6px; }
	.opt-row { display: flex; align-items: center; gap: 6px; }
	.opt { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); padding: 10px 12px; font-size: 1rem; cursor: pointer; }
	.opt:hover:enabled { border-color: var(--brand); }
	.opt:disabled { cursor: default; }
	.opt.right { border-color: var(--success); background: var(--ok-bg); }
	.opt.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.opt-jp { flex: 1; min-width: 0; }

	.feedback { display: grid; gap: 6px; border-top: 1px solid var(--line); padding-top: 10px; }
	.fb-line { margin: 0; font-size: 0.88rem; }
	.feedback .lnk.primary { justify-self: start; margin-top: 4px; }
</style>
