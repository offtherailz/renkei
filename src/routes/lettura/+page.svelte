<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import {
		READING_TEXTS,
		instantiate,
		type JlptLevel,
		type ReadingText,
		type ReadingRun
	} from '$lib/core/readingTexts';
	import { createDefaultTokenizer, type JapaneseTokenizer } from '$lib/core/tokenizer';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';

	const QUESTION_SECONDS = 20;
	const DEFAULT_CPM: Record<JlptLevel, number> = { N5: 100, N4: 120 };

	let tok: JapaneseTokenizer | null = null;
	onMount(async () => {
		tok = await createDefaultTokenizer();
	});

	type Scene = 'level' | 'texts' | 'prep' | 'rsvp' | 'quiz' | 'result';
	let scene = $state<Scene>('level');
	let level = $state<JlptLevel>('N5');
	let run = $state<ReadingRun | null>(null);
	let cpm = $state(100); // caratteri al minuto

	function cpmKey(l: JlptLevel): string {
		return `renkei-lettura-cpm-${l}`;
	}
	function loadCpm(l: JlptLevel): number {
		const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(cpmKey(l)) : null;
		const n = raw ? Number(raw) : NaN;
		return Number.isFinite(n) && n >= 40 ? n : DEFAULT_CPM[l];
	}
	function saveCpm(): void {
		try {
			localStorage.setItem(cpmKey(level), String(cpm));
		} catch {
			/* storage pieno o bloccato: pazienza */
		}
	}

	function pickLevel(l: JlptLevel): void {
		level = l;
		cpm = loadCpm(l);
		scene = 'texts';
	}
	function textsOfLevel(): ReadingText[] {
		return READING_TEXTS.filter((t) => t.livello === level);
	}
	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

	function pickText(t: ReadingText): void {
		run = instantiate(t);
		scene = 'prep';
		void resolveVocab(t);
	}

	// Collega i vocaboli del pre-ripasso alle card dell'app (parola o forma
	// grammaticale): match a runtime su scrittura/lettura, così i dati dei
	// testi restano semplici. Chi non matcha resta testo semplice.
	type VocabLink = { detail: string; consolida: string };
	let vocabLinks = $state<Record<string, VocabLink | null>>({});
	const clean = (s: string): string => s.replace(/[〜～\s　]/g, '');
	async function resolveVocab(t: ReadingText): Promise<void> {
		const links: Record<string, VocabLink | null> = {};
		const grammar = await db.grammar.toArray();
		for (const v of t.vocab) {
			const cw = clean(v.w);
			const cy = clean(v.yomi);
			const w =
				(await db.words.where('scrittura').equals(cw).first()) ??
				(await db.words.where('lettura').equals(cy).first());
			if (w) {
				links[v.w] = { detail: `word:${w.id}`, consolida: w.id };
				continue;
			}
			const g = grammar.find((x) => cw.length >= 2 && clean(x.struttura).includes(cw));
			links[v.w] = g ? { detail: `grammar:${g.id}`, consolida: `grammar:${g.id}` } : null;
		}
		vocabLinks = links;
	}

	// ── RSVP ──
	let chunks = $state<string[]>([]);
	let chunkIdx = $state(0);
	let paused = $state(false);
	let runToken = 0;

	function chunkText(rendered: string): string[] {
		// I testi N5 sono già in わかち書き (spazi pieni): quelli sono i chunk.
		if (rendered.includes('　')) {
			return rendered
				.replace(/([。！？])/g, '$1　')
				.split(/[\s　]+/)
				.filter(Boolean);
		}
		return tok ? tok.tokenize(rendered) : [rendered];
	}
	function chunkMs(c: string): number {
		const ms = (c.length * 60000) / cpm;
		return Math.max(380, ms) + (/[。！？]$/.test(c) ? 350 : 0);
	}
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function startRsvp(): Promise<void> {
		if (!run) return;
		stopSpeaking();
		chunks = chunkText(run.rendered);
		chunkIdx = 0;
		paused = false;
		scene = 'rsvp';
		const token = ++runToken;
		for (let i = 0; i < chunks.length; i += 1) {
			if (token !== runToken) return;
			chunkIdx = i;
			await sleep(chunkMs(chunks[i]!));
			while (paused) {
				if (token !== runToken) return;
				await sleep(120);
			}
		}
		if (token !== runToken) return;
		enterQuiz();
	}
	function stopRsvp(): void {
		runToken += 1;
	}
	onDestroy(stopRsvp);

	// ── Quiz ──
	let qIdx = $state(0);
	let qPicked = $state<number | null>(null);
	let score = $state(0);
	type QLog = { q: string; pickedText: string; correctText: string; ok: boolean; evidence?: string };
	let qLog = $state<QLog[]>([]);
	let timeLeft = $state(QUESTION_SECONDS);
	let ticker: ReturnType<typeof setInterval> | null = null;

	function enterQuiz(): void {
		stopRsvp();
		scene = 'quiz';
		qIdx = 0;
		score = 0;
		qLog = [];
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
				answer(-1); // tempo scaduto = errore
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
		const q = run.questions[qIdx]!;
		const ok = i === q.correct;
		if (ok) score += 1;
		qLog = [
			...qLog,
			{
				q: q.q,
				pickedText: i >= 0 ? q.choices[i]! : '⏰ tempo scaduto',
				correctText: q.choices[q.correct]!,
				ok,
				evidence: q.evidence
			}
		];
	}
	function nextQuestion(): void {
		if (!run) return;
		if (qIdx < run.questions.length - 1) {
			qIdx += 1;
			armQuestion();
		} else {
			finish();
		}
	}

	// ── Risultato: la velocità si adatta ──
	let cpmDelta = $state(0);
	function finish(): void {
		if (!run) return;
		const wrong = run.questions.length - score;
		const old = cpm;
		if (wrong === 0) cpm = Math.round(cpm * 1.1);
		else if (wrong >= 2) cpm = Math.max(40, Math.round(cpm * 0.9));
		cpmDelta = cpm - old;
		saveCpm();
		scene = 'result';
	}

	function again(sameText: boolean): void {
		stopSpeaking();
		if (sameText && run) {
			run = instantiate(run.text); // stesso testo, slot nuovi
			scene = 'prep';
		} else {
			pickText(rnd(textsOfLevel()));
		}
	}
</script>

<div class="lettura">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if scene !== 'level'}
			<span class="lvl-chip">{level} · ⚡ {cpm} caratteri/min</span>
		{/if}
	</div>

	{#if scene === 'level'}
		<article class="scene">
			<h1 class="page-title">⚡ Lettura veloce</h1>
			<p class="hint">
				Il testo appare un pezzetto alla volta: non puoi tornare indietro. Alla fine, domande a
				tempo. Rispondi bene e la velocità sale; sbagli e rallenta.
			</p>
			<div class="choices plat">
				<button class="choice" onclick={() => pickLevel('N5')}>🌱 N5</button>
				<button class="choice" onclick={() => pickLevel('N4')}>🌿 N4</button>
			</div>
		</article>
	{:else if scene === 'texts'}
		<article class="scene">
			<p class="who">📚 Scegli un testo ({level})</p>
			<div class="text-grid">
				{#each textsOfLevel() as t (t.id)}
					<button class="text-card" onclick={() => pickText(t)}>
						<span class="text-tipo">{t.tipo}</span>
						<span class="text-titolo">{t.titolo}</span>
					</button>
				{/each}
			</div>
			<button class="proceed" onclick={() => pickText(rnd(textsOfLevel()))}>🎲 A caso</button>
		</article>
	{:else if scene === 'prep' && run}
		<article class="scene">
			<p class="who">🔑 Prima di leggere — {run.text.tipo}: {run.text.titolo}</p>
			<p class="hint">Parole e forme che troverai. Consolidale ora: dopo non si torna indietro!</p>
			<ul class="vocab">
				{#each run.text.vocab as v (v.w)}
					{@const link = vocabLinks[v.w]}
					<li>
						{#if link}
							<a class="v-w linked" href="{base}/detail/{encodeURIComponent(link.detail)}">{v.w}</a>
						{:else}
							<span class="v-w">{v.w}</span>
						{/if}
						{#if v.yomi !== v.w}<span class="v-yomi">{v.yomi}</span>{/if}
						<span class="v-it">{v.it}</span>
						<span class="v-actions">
							<button class="v-btn" title="Ascolta" onclick={() => speakSentenceJapanese(v.yomi)}>🔊</button>
							{#if link}
								<a class="v-btn" title="Consolida" href="{base}/consolida/{encodeURIComponent(link.consolida)}">💪</a>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
			<div class="speed">
				<button class="mini" onclick={() => (cpm = Math.max(40, cpm - 10))}>−10</button>
				<span class="speed-val">⚡ {cpm} caratteri/min</span>
				<button class="mini" onclick={() => (cpm = cpm + 10)}>+10</button>
			</div>
			<button class="proceed" onclick={startRsvp}>📖 Via! →</button>
		</article>
	{:else if scene === 'rsvp'}
		<article class="scene rsvp">
			<div class="progress"><div class="bar" style="width:{chunks.length ? ((chunkIdx + 1) / chunks.length) * 100 : 0}%"></div></div>
			<p class="flash">{chunks[chunkIdx]}</p>
			<div class="rsvp-actions">
				<button class="mini" onclick={() => (paused = !paused)}>{paused ? '▶️ Riprendi' : '⏸️ Pausa'}</button>
				<button class="mini" onclick={enterQuiz}>⏭️ Alle domande</button>
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
				{#if qPicked === -1}
					<p class="hint">⏰ Tempo scaduto!</p>
				{/if}
				<button class="proceed" onclick={nextQuestion}>{qIdx < run.questions.length - 1 ? 'Prossima →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else if scene === 'result' && run}
		<article class="scene">
			<p class="who">{score === run.questions.length ? '🎉 Tutto giusto!' : '📝 Risultato'}</p>
			<p class="score-big">{score} / {run.questions.length}</p>
			{#if cpmDelta > 0}
				<p class="hint">⚡ Velocità aumentata a <strong>{cpm}</strong> caratteri/min (+{cpmDelta})</p>
			{:else if cpmDelta < 0}
				<p class="hint">🐢 Velocità ridotta a <strong>{cpm}</strong> caratteri/min ({cpmDelta})</p>
			{:else}
				<p class="hint">⚡ Velocità invariata: {cpm} caratteri/min</p>
			{/if}
			<div class="q-review">
				{#each qLog as l}
					<div class="q-row" class:bad={!l.ok}>
						<p class="q-row-q">{l.ok ? '✅' : '❌'} {l.q}</p>
						{#if !l.ok}
							<p class="q-row-a">Hai risposto: {l.pickedText} · Giusto: <strong>{l.correctText}</strong></p>
						{/if}
					</div>
				{/each}
			</div>
			<div class="fulltext">
				<p class="script-title">📄 Il testo completo <button class="v-btn" title="Ascolta il testo" onclick={() => speakSentenceJapanese(run!.rendered)}>🔊</button></p>
				{#if qLog.some((l) => !l.ok && l.evidence)}
					<p class="hint">Le frasi evidenziate contenevano le risposte che hai sbagliato. Tocca le parole per la scheda.</p>
				{/if}
				{#key run}
					<InteractiveSentence text={run.rendered} mark={qLog.filter((l) => !l.ok && l.evidence).map((l) => l.evidence!)} />
				{/key}
			</div>
			<div class="rsvp-actions">
				<button class="proceed" onclick={() => again(false)}>🎲 Altro testo</button>
				<button class="mini" onclick={() => again(true)}>🔁 Stesso testo (varia)</button>
				<button class="mini" onclick={() => (scene = 'texts')}>📚 Scegli tu</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.lettura { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.lvl-chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }

	.text-grid { display: grid; gap: 8px; }
	.text-card { display: grid; gap: 2px; text-align: left; background: var(--surface-2); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; cursor: pointer; color: var(--ink); }
	.text-card:hover { border-color: var(--brand); }
	.text-tipo { font-size: 0.72rem; font-weight: 700; color: var(--brand); }
	.text-titolo { font-size: 0.95rem; font-weight: 600; }

	.vocab { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.vocab li { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); flex-wrap: wrap; }
	.v-w { font-weight: 700; font-size: 1.05rem; }
	.v-w.linked { color: var(--brand); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
	.v-yomi { font-size: 0.8rem; color: var(--brand); }
	.v-it { margin-left: auto; font-size: 0.82rem; color: var(--muted); }
	.v-actions { display: inline-flex; gap: 6px; }
	.v-btn { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; padding: 3px 8px; font-size: 0.85rem; cursor: pointer; text-decoration: none; }
	.v-btn:hover { border-color: var(--brand); }

	.speed { display: flex; align-items: center; justify-content: center; gap: 10px; }
	.speed-val { font-weight: 700; }

	.rsvp { min-height: 260px; align-content: center; }
	.flash { margin: 0; text-align: center; font-size: 2rem; font-weight: 800; min-height: 2.6em; display: grid; place-items: center; }
	.rsvp-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

	.progress { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
	.progress .bar { height: 100%; background: var(--brand); transition: width 0.15s linear; }
	.progress.timer .bar { background: #f59e0b; transition: width 0.1s linear; }

	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success, #16a34a); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger, #dc2626); background: rgba(239,107,107,0.16); }

	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.q-review { display: grid; gap: 6px; }
	.q-row { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; background: var(--surface-2); display: grid; gap: 2px; }
	.q-row.bad { border-color: rgba(220, 38, 38, 0.4); }
	.q-row-q { margin: 0; font-size: 0.92rem; font-weight: 600; }
	.q-row-a { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.fulltext { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 6px; }
	.script-title { margin: 0; font-size: 0.85rem; font-weight: 700; }

	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
