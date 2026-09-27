<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import ExamPrompt from '$lib/components/ExamPrompt.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { examStrip } from '$lib/data/kanjiN4';
	import { speakExamListening } from '$lib/core/examListening';
	import { detectGrammar } from '$lib/core/examGrammar';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { mondaiKey, findMondai } from '$lib/data/esame-n4';
	import { mondaiPool, type ProvaQuestion } from '$lib/data/esame-n4-prova';
	import { generaDaCatalogo } from '$lib/data/esame-n4-genera';
	import { MONDAI_GIOCHI_UTILI, EXAM_N4_HOT_POINTS, CONSEGNE } from '$lib/data/esame-n4';

	const slug = $derived($page.params.slug ?? '');
	const found = $derived(findMondai(slug));
	// Il pool si fissa una volta all'avvio della sessione (drill).
	let questions = $state<ProvaQuestion[]>([]);
	let started = $state(false);

	let index = $state(0);
	let picked = $state<number | null>(null);
	let showTip = $state(false);
	let correctCount = $state(0);
	let done = $state(false);
	// Timer di scadenza per-domanda (pressione da esame). Soft: allo scadere
	// avvisa soltanto, senza rivelare né contare errore — si può rispondere con calma.
	let qRemaining = $state(0);
	let overTime = $state(false);
	let ticker: ReturnType<typeof setInterval> | null = null;

	function stopTicker() {
		if (ticker) {
			clearInterval(ticker);
			ticker = null;
		}
	}
	onDestroy(() => {
		stopTicker();
		stopSpeaking();
	});

	function startTimer() {
		const cur = questions[index];
		if (!cur) return;
		qRemaining = cur.tempoSec;
		overTime = false;
		stopTicker();
		ticker = setInterval(() => {
			qRemaining -= 1;
			if (qRemaining <= 0) {
				stopTicker();
				overTime = true; // solo avviso: nessun reveal, nessun errore
			}
		}, 1000);
	}

	const q = $derived(questions[index] ?? null);
	// Ascolto: testo nascosto (è la soluzione) finché non si risponde.
	const isListening = $derived(found?.section.id === 'choukai');
	const revealText = $derived(!isListening || picked !== null);

	async function begin() {
		const extra = await generaDaCatalogo();
		questions = mondaiPool(slug, { extra });
		index = 0;
		picked = null;
		showTip = false;
		correctCount = 0;
		done = false;
		started = true;
		maybePlayListening();
		startTimer();
	}

	function speak(text: string, rate = 1) {
		stopSpeaking();
		speakSentenceJapanese(text, { rate });
	}

	function maybePlayListening() {
		const cur = questions[index];
		if (cur && found?.section.id === 'choukai') setTimeout(() => speakExamListening(cur.prompt), 150);
	}

	async function answer(i: number) {
		if (picked !== null || !q) return;
		stopTicker();
		picked = i;
		const correct = i === q.correct;
		if (correct) correctCount += 1;
		await recordPractice(mondaiKey(slug), correct);
	}

	function next() {
		if (index + 1 >= questions.length) {
			done = true;
			stopTicker();
		} else {
			index += 1;
			picked = null;
			showTip = false;
			maybePlayListening();
			startTimer();
		}
	}

	function dontKnow() {
		answer(-1);
	}

	function truccoLinksFor(slug: string) {
		return EXAM_N4_HOT_POINTS.filter((h) => h.mondai.includes(slug)).map((h) => ({ id: h.id, label: h.label }));
	}

	function wrongNote(question: ProvaQuestion, optionIndex: number): string {
		if (!question.perche_sbagliate.length) return '';
		let k = 0;
		for (let j = 0; j < question.choices.length; j += 1) {
			if (j === question.correct) continue;
			if (j === optionIndex) return question.perche_sbagliate[k] ?? '';
			k += 1;
		}
		return '';
	}
</script>

<div class="drill">
	<a class="back" href="{base}/esame">← Esame N4</a>

	{#if !found}
		<h1 class="page-title">Tipo di domanda non trovato</h1>
		<p class="muted">Torna alla <a href="{base}/esame">panoramica esame</a>.</p>
	{:else}
		<h1 class="page-title">{found.mondai.titolo_jp}</h1>
		<p class="page-sub">{found.mondai.titolo_it} · {found.section.titolo_jp}</p>

		{#if !started}
			<p class="tipo">{found.mondai.tipo}</p>
			<p class="tip">💡 {found.mondai.suggerimento}</p>
			{@const disponibili = mondaiPool(slug, { shuffle: false }).length}
			{#if disponibili > 0}
				<p class="count">Domande di esempio disponibili: <strong>{disponibili}</strong></p>
				<button class="cta" onclick={begin}>Inizia l'esercizio</button>
			{:else}
				<p class="prep">Questo tipo è ancora in preparazione: presto ci saranno domande di esempio.</p>
			{/if}

			{#if MONDAI_GIOCHI_UTILI[slug]?.length}
				<div class="giochi">
					<span class="g-label">Nel frattempo allenati:</span>
					{#each MONDAI_GIOCHI_UTILI[slug] as g (g.href)}
						<a class="g-chip" href="{base}/{g.href}">{g.label}</a>
					{/each}
				</div>
			{/if}
		{:else if done}
			<div class="end">
				<p class="score">{correctCount} / {questions.length}</p>
				<button class="cta" onclick={begin}>🔁 Riprova</button>
				<a class="ghost" href="{base}/esame/prova">▶️ Prova simulata</a>
			</div>
		{:else if q}
			<div class="qbar">
				<span class="progress">Domanda {index + 1} / {questions.length}</span>
				{#if picked === null}
					{#if overTime}
						<span class="qtimer over">⏱️ tempo scaduto · rispondi con calma</span>
					{:else}
						<span class="qtimer" class:warn={qRemaining <= 5}>⏱️ {qRemaining}s</span>
					{/if}
				{/if}
			</div>
			{#if CONSEGNE[slug]}<p class="consegna">{CONSEGNE[slug]}</p>{/if}
			{#if isListening && !revealText}
				<div class="prompt listen">
					<span class="listen-hint">{slug === 'sokuji' ? '👂 Ascolta la battuta: scegli la RISPOSTA adatta' : slug === 'hatsuwa' ? '👂 Nella situazione, scegli COSA DIRE' : '🎧 Ascolta e rispondi alla domanda'}</span>
					<div class="listen-btns">
						<button class="lbtn" onclick={() => speakExamListening(q.prompt)}>🔊 もう一度</button>
						<button class="lbtn" onclick={() => speakExamListening(q.prompt, 0.6)}>🐢 ゆっくり</button>
					</div>
				</div>
			{:else}
				<div class="prompt">
					<ExamPrompt text={q.prompt} />
					<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => speak(q.prompt)}>🔊</button>
				</div>
			{/if}

			{#if picked === null}
				<div class="pre-actions">
					<button class="tip-btn" onclick={() => (showTip = !showTip)}>💡 Trucco {showTip ? '▲' : '▼'}</button>
					<button class="tip-btn dunno" onclick={dontKnow}>🤷 Non la so</button>
				</div>
				{#if showTip}<p class="tip">{q.suggerimento}</p>{/if}
			{/if}

			<div class="opts">
				{#each q.choices as c, i (i)}
					<button
						class="opt"
						class:right={picked !== null && i === q.correct}
						class:wrong={picked === i && i !== q.correct}
						disabled={picked !== null}
						onclick={() => answer(i)}
					>
						<FuriganaText text={examStrip(c)} force={true} />
					</button>
				{/each}
			</div>

			{#if picked !== null}
				{@const gram = detectGrammar([q.prompt, ...q.choices])}
				<div class="feedback" class:ok={picked === q.correct}>
					<p class="fb"><strong>{picked === q.correct ? '✅ Giusto!' : picked === -1 ? '🤷 Vediamola insieme.' : '❌ Non proprio.'}</strong></p>
					<div class="fb-jp">
						<ExamPrompt text={q.prompt} interactive={true} mondai={slug} />
						<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => (isListening ? speakExamListening(q.prompt) : speak(q.prompt))}>🔊</button>
					</div>
					{#if q.traduzione}<p class="fb-it">💬 {q.traduzione}</p>{/if}
					<div class="fb-opts">
						{#each q.choices as c, ci (ci)}
							<p class="fb-opt" class:ok={ci === q.correct} class:ko={ci === picked && ci !== q.correct}>
								<span class="fb-mark">{ci === q.correct ? '✔️' : '✖️'}</span>
								<InteractiveSentence text={c} />
								{#if ci === q.correct}
									<span class="fb-note">— {q.perche_giusta}</span>
								{:else if wrongNote(q, ci)}
									<span class="fb-note muted">— {wrongNote(q, ci)}</span>
								{/if}
							</p>
						{/each}
					</div>
					<p class="fb-hint">💬 Tocca una parola: 📖 scheda · 💪 consolida · «📚 Metti in studio»</p>
					{#if gram.length}
						<div class="fb-links">
							<span class="fbl-label">📐 Grammatica:</span>
							{#each gram as g (g.href)}
								<a class="fbl" href="{base}/{g.href}">{g.label}</a>
							{/each}
						</div>
					{/if}
					<div class="fb-links">
						<span class="fbl-label">🔎 Approfondisci:</span>
						{#each truccoLinksFor(slug) as t (t.id)}
							<a class="fbl" href="{base}/esame/trucco/{t.id}">💡 {t.label}</a>
						{/each}
						{#each MONDAI_GIOCHI_UTILI[slug] ?? [] as g (g.href)}
							<a class="fbl" href="{base}/{g.href}">{g.label}</a>
						{/each}
					</div>
					<button class="cta" onclick={next}>{index + 1 >= questions.length ? 'Vedi risultato' : 'Prossima →'}</button>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.drill { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.tipo { margin: 0; font-size: 0.95rem; }
	.count { margin: 0; font-size: 0.9rem; }
	.prep { margin: 0; font-size: 0.88rem; color: var(--warn-ink); background: var(--warn-bg); border-radius: 8px; padding: 8px 10px; }
	.muted { color: var(--muted); }

	.cta { border: none; border-radius: 12px; background: var(--brand); color: #fff; padding: 12px 16px; font-size: 1rem; font-weight: 700; cursor: pointer; justify-self: start; }
	.ghost { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); padding: 10px 14px; font-weight: 700; text-decoration: none; }

	.giochi { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.g-label { font-size: 0.78rem; color: var(--muted); }
	.g-chip { font-size: 0.78rem; text-decoration: none; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; background: var(--surface); }
	.g-chip:hover { border-color: var(--brand); }

	.qbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.progress { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.consegna { margin: 0; font-size: 0.9rem; font-weight: 600; border-left: 3px solid var(--brand); padding: 4px 10px; background: var(--surface); }
	.qtimer { font-size: 0.8rem; font-weight: 700; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; background: var(--surface); }
	.qtimer.warn { color: var(--danger); border-color: var(--danger); }
	.qtimer.over { color: var(--warn-ink); background: var(--warn-bg); border-color: var(--warn-bg); font-weight: 600; }
	.prompt { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 14px; }
	.prompt.listen { flex-direction: column; align-items: stretch; gap: 10px; }
	.listen-hint { font-size: 1rem; font-weight: 700; text-align: center; }
	.listen-btns { display: flex; gap: 8px; justify-content: center; }
	.lbtn { border: 1px solid var(--line); border-radius: 999px; background: var(--bg); color: var(--ink); padding: 8px 14px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.lbtn:hover { border-color: var(--brand); }
	.tts { border: none; background: transparent; cursor: pointer; font-size: 1.05rem; }

	.tip-btn { justify-self: start; font-size: 0.78rem; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
	.tip { margin: 0; font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 8px 10px; }

	.opts { display: grid; gap: 6px; }
	.opt { text-align: center; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); padding: 12px; font-size: 1.15rem; cursor: pointer; }
	.opt:hover:enabled { border-color: var(--brand); }
	.opt:disabled { cursor: default; }
	.opt.right { border-color: var(--success); background: var(--ok-bg); }
	.opt.wrong { border-color: var(--danger); background: var(--danger-bg); }

	.feedback { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 10px 12px; }
	.fb { margin: 0; font-size: 0.9rem; }
	.fb-jp { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.fb-opts { display: grid; gap: 4px; }
	.fb-opt { margin: 0; font-size: 0.9rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; padding: 4px 6px; border-radius: 6px; }
	.fb-opt.ok { background: var(--ok-bg); }
	.fb-opt.ko { background: var(--danger-bg); }
	.fb-mark { font-size: 0.85rem; }
	.fb-note { font-size: 0.8rem; color: var(--info-ink); }
	.fb-note.muted { color: var(--muted); }
	.fb-it { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.fb-hint { margin: 0; font-size: 0.72rem; color: var(--muted); }
	.fb-links { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.fbl-label { font-size: 0.72rem; color: var(--muted); }
	.fbl { font-size: 0.75rem; text-decoration: none; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; background: var(--bg); }
	.fbl:hover { border-color: var(--brand); }
	.pre-actions { display: flex; gap: 6px; }
	.tip-btn.dunno { border-color: var(--warn-bg); }

	.end { display: grid; gap: 12px; justify-items: center; padding: 24px 0; }
	.score { margin: 0; font-size: 2rem; font-weight: 800; }
</style>
