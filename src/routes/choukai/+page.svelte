<script lang="ts">
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import {
		LISTENING_DIALOGUES,
		instantiateListening,
		type ListeningRun
	} from '$lib/core/listeningDialogues';
	import type { JlptLevel } from '$lib/core/readingTexts';
	import { speakDialogue, stopSpeaking } from '$lib/core/tts';
	import { pickRandom, gameSnapshot } from '$lib/core/gameKit';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	const QUESTION_SECONDS = 25;
	const MAX_LISTENS = 2; // come all'esame: primo ascolto + un replay (anche lento)

	type Scene = 'level' | 'brief' | 'listen' | 'quiz' | 'result';
	let scene = $state<Scene>('level');
	let level = $state<JlptLevel>('N5');
	let run = $state<ListeningRun | null>(null);
	let lastId = '';
	let listens = $state(0);
	let playing = $state(false);

	function pickLevel(l: JlptLevel): void {
		level = l;
		next();
	}
	function next(): void {
		stopSpeaking();
		const pool = LISTENING_DIALOGUES.filter((d) => d.livello === level && d.id !== lastId);
		const d = pickRandom(pool.length > 0 ? pool : LISTENING_DIALOGUES.filter((x) => x.livello === level));
		lastId = d.id;
		run = instantiateListening(d);
		listens = 0;
		scene = 'brief';
	}

	async function play(slow: boolean): Promise<void> {
		if (!run || playing || listens >= MAX_LISTENS) return;
		scene = 'listen';
		playing = true;
		listens += 1;
		await speakDialogue(
			run.lines.map((l) => ({ personaggio: l.who, testo: l.text })),
			slow ? 0.65 : 0.95
		);
		playing = false;
	}
	onDestroy(stopSpeaking);

	// ── Domande (a tempo) ──
	let qIdx = $state(0);
	let qPicked = $state<number | null>(null);
	let score = $state(0);
	let wrongLines = $state<number[]>([]);
	let answers = $state<number[]>([]); // scelta data per ogni domanda (-1 = tempo)
	let timeLeft = $state(QUESTION_SECONDS);
	let ticker: ReturnType<typeof setInterval> | null = null;

	function enterQuiz(): void {
		stopSpeaking();
		scene = 'quiz';
		qIdx = 0;
		score = 0;
		wrongLines = [];
		answers = [];
		armQuestion();
	}
	function armQuestion(): void {
		qPicked = null;
		timeLeft = QUESTION_SECONDS;
		clearTicker();
		ticker = setInterval(() => {
			timeLeft -= 0.1;
			if (timeLeft <= 0) {
				timeLeft = 0;
				answer(-1);
			}
		}, 100);
	}
	function clearTicker(): void {
		if (ticker) clearInterval(ticker);
		ticker = null;
	}
	onDestroy(clearTicker);

	function answer(i: number): void {
		if (qPicked !== null || !run) return;
		clearTicker();
		qPicked = i;
		answers = [...answers, i];
		const q = run.questions[qIdx]!;
		if (i === q.correct) score += 1;
		else if (q.evidenceLine !== undefined) wrongLines = [...wrongLines, q.evidenceLine];
	}

	// riascolta l'INTERO dialogo nel copione finale (non conta come ascolto
	// d'esame, non cambia scena)
	let replaying = $state(false);
	async function replayAll(): Promise<void> {
		if (!run || replaying) return;
		stopSpeaking();
		replaying = true;
		await speakDialogue(
			run.lines.map((l) => ({ personaggio: l.who, testo: l.text })),
			0.95
		);
		replaying = false;
	}

	// riascolta UNA battuta con la voce del suo personaggio
	function playLine(i: number): void {
		if (!run) return;
		stopSpeaking();
		const l = run.lines[i]!;
		void speakDialogue([{ personaggio: l.who, testo: l.text }], 0.95);
	}
	function nextQuestion(): void {
		if (!run) return;
		if (qIdx < run.questions.length - 1) {
			qIdx += 1;
			armQuestion();
		} else {
			scene = 'result';
		}
	}

	// Conserva la partita quando navighi via (popup → scheda) e torni indietro.
	// Se eri su una domanda senza risposta, il timer riparte da capo.
	export const snapshot = gameSnapshot(
		() => ({ scene, level, run, listens, qIdx, qPicked, score, wrongLines, answers }),
		(s) => {
			({ scene, level, run, listens, qIdx, qPicked, score, wrongLines, answers } = s);
			if (!answers) answers = []; // snapshot di versioni precedenti
			playing = false;
			replaying = false;
			if (scene === 'quiz' && qPicked === null) armQuestion();
		}
	);
</script>

<div class="choukai">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if scene !== 'level'}
			<span class="lvl-chip">{level} · 聴解</span>
		{/if}
	</div>

	{#if scene === 'level'}
		<article class="scene">
			<h1 class="page-title">👂 聴解 — Ascolto trappola</h1>
			<p class="hint">
				Come all'esame: prima la situazione e la domanda, poi il dialogo <strong>solo audio</strong>
				(massimo {MAX_LISTENS} ascolti). Occhio: cambiano idea, ci ripensano, tornano
				all'originale…
			</p>
			<div class="choices plat">
				<button class="choice" onclick={() => pickLevel('N5')}>🌱 N5</button>
				<button class="choice" onclick={() => pickLevel('N4')}>🌿 N4</button>
			</div>
		</article>
	{:else if scene === 'brief' && run}
		<article class="scene">
			<p class="who">📻 {run.dialogue.scena}</p>
			<p class="bubble big">{run.dialogue.domanda}</p>
			<p class="hint">Ascolta e trova la risposta. Niente testo!</p>
			<button class="proceed" onclick={() => play(false)}>▶️ Ascolta</button>
		</article>
	{:else if scene === 'listen' && run}
		<article class="scene">
			<p class="who">📻 {run.dialogue.scena}</p>
			<p class="bubble sm">❓ {run.dialogue.domanda}</p>
			<p class="ear" class:playing>👂</p>
			<div class="listen-actions">
				{#if !playing && listens < MAX_LISTENS}
					<button class="mini" onclick={() => play(false)}>🔁 もう一度 ({MAX_LISTENS - listens})</button>
					<button class="mini" onclick={() => play(true)}>🐢 ゆっくり</button>
				{/if}
				{#if !playing}
					<button class="proceed" onclick={enterQuiz}>Alle domande →</button>
				{:else}
					<p class="hint">Sto parlando… ascolta bene.</p>
				{/if}
			</div>
		</article>
	{:else if scene === 'quiz' && run}
		{@const q = run.questions[qIdx]}
		<article class="scene">
			<p class="who">❓ Domanda {qIdx + 1} di {run.questions.length}</p>
			<div class="progress timer"><div class="bar" style="width:{(timeLeft / QUESTION_SECONDS) * 100}%"></div></div>
			<p class="bubble">{q.q}</p>
			<div class="choices">
				{#each q.choices as c, i (c)}
					<button
						class="choice"
						class:right={qPicked !== null && i === q.correct}
						class:wrong={qPicked === i && i !== q.correct}
						disabled={qPicked !== null}
						onclick={() => answer(i)}
					>{c}</button>
				{/each}
			</div>
			{#if qPicked !== null}
				{#if qPicked === -1}<p class="hint">⏰ Tempo scaduto!</p>{/if}
				<button class="proceed" onclick={nextQuestion}>{qIdx < run.questions.length - 1 ? 'Prossima →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else if scene === 'result' && run}
		<article class="scene">
			<p class="who">{score === run.questions.length ? '🎉 Orecchio fino!' : '📝 Risultato'}</p>
			<p class="score-big">{score} / {run.questions.length}</p>
			<p class="hint">Ascolti usati: {listens} di {MAX_LISTENS}</p>
			<div class="transcript">
				<p class="script-title">❓ Le domande, con le risposte giuste <span class="beta-chip">beta</span></p>
				{#each run.questions as q, i}
					{@const mine = answers[i]}
					<div class="recap" class:ok={mine === q.correct}>
						<p class="recap-q">{q.q}</p>
						<p class="recap-a">✅ {q.choices[q.correct]}</p>
						{#if mine !== undefined && mine !== q.correct}
							<p class="recap-a wrong-a">✗ la tua: {mine === -1 ? '(tempo scaduto)' : q.choices[mine]}</p>
						{/if}
						{#if q.evidenceLine !== undefined && run.lines[q.evidenceLine]}
							<p class="recap-ev">
								<button class="tts-mini" onclick={() => playLine(q.evidenceLine!)} title="Riascolta la battuta">🔊</button>
								la prova: «{run.lines[q.evidenceLine]!.text}»
							</p>
						{/if}
						<p class="recap-why">💡 {q.spiega}</p>
					</div>
				{/each}
				<div class="script-head">
					<p class="script-title">📜 Il dialogo (riascolta ogni battuta — tocca le parole)</p>
					<button class="mini" onclick={replayAll} disabled={replaying}>{replaying ? '🔊 …' : '▶️ Tutto il dialogo'}</button>
				</div>
				{#each run.lines as l, i}
					<div class="line {l.who}" class:missed={wrongLines.includes(i)}>
						<span class="line-who">{l.who === 'M' ? '👨' : '👩'}</span>
						<InteractiveSentence text={l.text} />
						<button class="tts-mini line-tts" onclick={() => playLine(i)} title="Riascolta">🔊</button>
					</div>
				{/each}
				{#if wrongLines.length > 0}
					<p class="hint">Le battute evidenziate contenevano le risposte che hai sbagliato.</p>
				{/if}
			</div>
			<div class="result-actions">
				<button class="proceed" onclick={next}>🎲 Un altro dialogo</button>
				<button class="mini" onclick={() => (scene = 'level')}>Cambia livello</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.choukai { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.lvl-chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.big { font-size: 1.25rem; }
	.bubble.sm { font-size: 0.92rem; }

	.ear { margin: 0; text-align: center; font-size: 3rem; opacity: 0.5; }
	.ear.playing { opacity: 1; animation: pulse 1s ease-in-out infinite; }
	@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
	.listen-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }

	.progress { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
	.progress.timer .bar { height: 100%; background: #f59e0b; transition: width 0.1s linear; }

	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }

	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.transcript { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 6px; }
	.script-title { margin: 0; font-size: 0.85rem; font-weight: 700; }
	.line { display: flex; gap: 8px; align-items: baseline; padding: 6px 10px; border-radius: 8px; background: var(--surface-2); border-left: 3px solid var(--line); }
	.line.F { border-left-color: #f59e0b; }
	.line.M { border-left-color: var(--brand); }
	.line.missed { background: rgba(245, 158, 11, 0.18); }
	.line-who { font-size: 1rem; }
	.line-tts { margin-left: auto; }
	.tts-mini { border: none; background: none; cursor: pointer; font-size: 0.95rem; padding: 0 4px; }
	.beta-chip {
		font-size: 0.58rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 1px 7px; vertical-align: middle;
	}
	.recap { display: grid; gap: 4px; padding: 8px 12px; border-radius: 10px; background: var(--surface-2); border-left: 3px solid var(--danger); }
	.recap.ok { border-left-color: var(--success); }
	.recap-q { margin: 0; font-size: 0.88rem; font-weight: 700; }
	.recap-a { margin: 0; font-size: 0.85rem; color: var(--success); }
	.recap-a.wrong-a { color: var(--danger); }
	.recap-ev { margin: 0; font-size: 0.82rem; color: var(--muted); display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
	.recap-why { margin: 2px 0 0; font-size: 0.82rem; line-height: 1.5; color: var(--ink); }
	.script-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
	.script-head .script-title { margin: 0; }
	.result-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; align-items: center; }

	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
