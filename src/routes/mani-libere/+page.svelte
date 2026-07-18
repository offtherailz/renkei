<script lang="ts">
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapaneseAsync, speakDialogue, stopSpeaking } from '$lib/core/tts';
	import { listenJapanese, speechAvailable, phraseVariants } from '$lib/core/speech';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { SITUATIONS } from '$lib/core/usefulPhrases';
	import { LISTENING_DIALOGUES, instantiateListening } from '$lib/core/listeningDialogues';
	import { buildRounds, classifyUtterance, judgeAnswer, HF_COMMANDS, type HFRound } from '$lib/core/handsFree';

	// 🚗 Mani libere (beta): ripasso SOLO VOCALE, l'utente non legge nulla. Un tap per
	// partire, poi parla-ascolta-avanza in automatico. Mix: recall di frasi utili
	// (l'app dice in italiano cosa esprimere, tu lo dici in giapponese) e choukai
	// (l'app recita un dialogo, fa la domanda, rispondi a voce). Comandi vocali:
	// もう一度 (ripeti), ゆっくり (lento), 次 (avanti).
	const ROUNDS = 12;
	const canSpeak = speechAvailable();

	type Scene = 'intro' | 'play' | 'done';
	type Status = 'speaking' | 'listening' | 'ok' | 'ko' | 'paused';
	let scene = $state<Scene>('intro');
	let status = $state<Status>('speaking');
	let idx = $state(0);
	let score = $state(0);
	let running = false;
	let rounds = $state<HFRound[]>([]);

	const speakIt = (t: string) => speakSentenceJapaneseAsync(t, { lang: 'it-IT' });
	const speakJp = (t: string, slow = false) => speakSentenceJapaneseAsync(t, slow ? { rate: 0.6 } : {});

	// Prepara e pronuncia il prompt del round. Ritorna, per il choukai, la frase
	// corretta + le sue varianti (per il match); per le frasi, quelle del round.
	async function playPrompt(r: HFRound, slow: boolean): Promise<{ corretta: string; varianti: string[] }> {
		if (r.kind === 'frase') {
			await speakIt(`Come si dice: ${r.cueIt}`);
			return { corretta: r.jp, varianti: r.varianti };
		}
		const d = LISTENING_DIALOGUES.find((x) => x.id === r.dialogueId)!;
		const run = instantiateListening(d);
		await speakIt(run.dialogue.scena);
		await speakIt('Fai attenzione al dialogo e rispondi alla domanda.');
		await speakDialogue(run.lines.map((l) => ({ personaggio: l.who, testo: l.text })), slow ? 0.65 : 0.95);
		const q = run.questions[r.questionIdx]!;
		await speakJp(q.q, slow);
		const corretta = q.choices[q.correct]!;
		return { corretta, varianti: [...new Set([...phraseVariants(corretta), corretta])] };
	}

	// Attende in pausa finché l'utente non riparla (qualsiasi cosa riprende; «やめて» esce).
	async function pauseUntilResume(): Promise<void> {
		status = 'paused';
		await speakIt('In pausa. Riparla quando sei pronto.');
		while (running) {
			const a = await listenJapanese();
			if (!running) return;
			if (a.length === 0) continue;
			if (classifyUtterance(a) === 'quit') { stop(); return; }
			return;
		}
	}

	async function runRound(r: HFRound): Promise<void> {
		status = 'speaking';
		let { corretta, varianti } = await playPrompt(r, false);
		for (let attempt = 0; attempt < 8 && running; attempt += 1) {
			status = 'listening';
			const alts = await listenJapanese();
			if (!running) return;
			if (alts.length === 0) {
				await speakIt('Non ho sentito. Ripeti pure.');
				continue;
			}
			// PRIMA la risposta: così una risposta che contiene un comando non viene rubata.
			if (judgeAnswer(alts, varianti)) {
				status = 'ok';
				score += 1;
				// solo credito POSITIVO sulle risposte giuste (come ogni uso audio: gli
				// errori NON vanno nei punti deboli, per non penalizzare l'ascolto/mic).
				if (r.kind === 'frase') void recordPractice('phrase:' + r.jp, true, 'facet_form_speak');
				await speakJp('そう！');
				await speakJp(corretta);
				return;
			}
			const cls = classifyUtterance(alts);
			if (cls === 'slow') { ({ corretta, varianti } = await playPrompt(r, true)); continue; }
			if (cls === 'repeat') { ({ corretta, varianti } = await playPrompt(r, false)); continue; }
			if (cls === 'pause') { await pauseUntilResume(); if (!running) return; ({ corretta, varianti } = await playPrompt(r, false)); continue; }
			if (cls === 'quit') { stop(); return; }
			if (cls === 'skip') return;
			// non è comando né risposta giusta → si dice la versione giusta, ma NIENTE
			// penalità (nessun punto debole): l'audio non deve penalizzare.
			status = 'ko';
			await speakIt('Quasi. Si dice:');
			await speakJp(corretta, true);
			return;
		}
	}

	async function mainLoop(): Promise<void> {
		while (running && idx < rounds.length) {
			await runRound(rounds[idx]!);
			if (!running) return;
			idx += 1;
		}
		if (running) {
			running = false;
			scene = 'done';
			await speakIt(`Finito. ${score} su ${rounds.length}.`);
		}
	}

	async function start(): Promise<void> {
		const words = await db.words.toArray(); // scalda il DB; non serve altro
		void words;
		rounds = buildRounds(SITUATIONS, LISTENING_DIALOGUES, ROUNDS);
		idx = 0;
		score = 0;
		scene = 'play';
		running = true;
		await speakIt('Parla quando senti il microfono. Di\' «もう一度» per risentire, «次» per saltare.');
		await mainLoop();
	}

	function stop(): void {
		running = false;
		stopSpeaking();
		scene = 'done';
	}
	onDestroy(() => { running = false; stopSpeaking(); });

	const STATUS_ICON: Record<Status, string> = { speaking: '🔊', listening: '🎙️', ok: '✅', ko: '↩️', paused: '⏸️' };
</script>

<div class="hf">
	<a class="back" href="{base}/giochi" onclick={stop}>← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🚗 Mani libere <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Ripasso <strong>solo a voce</strong>: non devi leggere né toccare nulla. L'app ti dice
				cosa dire, tu rispondi in giapponese. Puoi dire <strong>「もう一度」</strong> per
				risentire, <strong>「ゆっくり」</strong> per il lento, <strong>「次」</strong> per saltare.
				Perfetto in auto o mentre fai altro.
			</p>
			{#if canSpeak}
				<button class="proceed" onclick={start}>▶️ はじめる</button>
				<p class="hint small">Al primo avvio concedi il permesso al microfono.</p>
			{:else}
				<p class="hint warn">Serve un browser con riconoscimento vocale (Chrome) e connessione sicura (https). Su questo dispositivo non è disponibile.</p>
			{/if}
		</article>
	{:else if scene === 'play'}
		<article class="scene play">
			<p class="who">{idx + 1} / {rounds.length}</p>
			<div class="big-status" class:pulse={status === 'listening'}>{STATUS_ICON[status]}</div>
			<p class="hint">{status === 'listening' ? 'Parla ora…' : status === 'paused' ? 'In pausa — riparla per riprendere' : status === 'speaking' ? 'Ascolta…' : status === 'ok' ? 'Bravo!' : 'Riascolta la versione giusta'}</p>
			<div class="cmd-legend">
				<p class="cmd-title">Puoi dire a voce:</p>
				{#each HF_COMMANDS as c (c.label)}
					<div class="cmd-row"><span class="cmd-ic">{c.icon}</span> <span class="cmd-lab">{c.label}</span> <span class="cmd-say">{c.say.map((s) => `「${s}」`).join(' / ')}</span></div>
				{/each}
			</div>
			<button class="stop" onclick={stop}>⏹ Ferma</button>
		</article>
	{:else}
		<article class="scene">
			<p class="who">🏁 Finito</p>
			<p class="score-big">{score} / {rounds.length || ROUNDS}</p>
			<button class="proceed" onclick={start}>🔁 Ancora</button>
		</article>
	{/if}
</div>

<style>
	.hf { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}
	.scene { background: var(--surface); border-radius: 16px; padding: 24px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.scene.play { justify-items: center; text-align: center; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.9rem; color: var(--muted); line-height: 1.6; }
	.hint.small { font-size: 0.8rem; }
	.hint.warn { color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 10px; padding: 10px; }
	.big-status { font-size: 5rem; line-height: 1; }
	.big-status.pulse { animation: pulse 1s ease-in-out infinite; }
	@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
	.cmd-legend { width: 100%; display: grid; gap: 4px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-top: 4px; }
	.cmd-title { margin: 0 0 2px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
	.cmd-row { display: flex; align-items: baseline; gap: 8px; font-size: 0.9rem; }
	.cmd-ic { width: 1.4em; text-align: center; }
	.cmd-lab { flex: 0 0 6.5em; color: var(--muted); }
	.cmd-say { font-weight: 700; }
	.score-big { margin: 0; text-align: center; font-size: 2.6rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 12px 26px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 700; font-size: 1.05rem; cursor: pointer; }
	.stop { padding: 8px 18px; border-radius: 999px; border: 1.5px solid var(--danger); background: var(--surface); color: var(--danger); font-weight: 700; cursor: pointer; }
</style>
