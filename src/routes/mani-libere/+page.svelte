<script lang="ts">
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapaneseAsync, speakDialogue, stopSpeaking } from '$lib/core/tts';
	import { abortableListen, speechAvailable, phraseVariants, kanaToKanjiWritten } from '$lib/core/speech';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { SITUATIONS } from '$lib/core/usefulPhrases';
	import { LISTENING_DIALOGUES, instantiateListening } from '$lib/core/listeningDialogues';
	import { buildRounds, classifyUtterance, judgeAnswer, HF_COMMANDS, type HFRound, type Command } from '$lib/core/handsFree';

	type Heard = { tap: Command } | { alts: string[] };

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
	const SILENCE_MS = 30_000; // niente sentito per 30s → ferma la sessione
	let lastActivity = 0;

	// Wake Lock: tiene lo SCHERMO acceso durante la partita (per correre col telefono
	// in tasca/fascia senza che si spenga). Non è "schermo bloccato": mic e TTS del
	// browser non girano in background: lo schermo deve restare acceso.
	let wakeLock: { release: () => Promise<void> } | null = null;
	async function acquireWakeLock(): Promise<void> {
		try {
			const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
			if (nav.wakeLock) wakeLock = await nav.wakeLock.request('screen');
		} catch { /* non supportato / negato: pazienza */ }
	}
	function releaseWakeLock(): void {
		void wakeLock?.release?.().catch(() => {});
		wakeLock = null;
	}
	// il wake lock si perde se la scheda va in background: lo riprende al ritorno
	function onVisibility(): void {
		if (document.visibilityState === 'visible' && running && !wakeLock) void acquireWakeLock();
	}

	const speakIt = (t: string) => speakSentenceJapaneseAsync(t, { lang: 'it-IT' });
	const speakJp = (t: string, slow = false) => speakSentenceJapaneseAsync(t, slow ? { rate: 0.6 } : {});

	// Bip lievissimo prima di ascoltare (segnala «parla ora»). Web Audio, ~110ms,
	// volume basso. primeBeep() lo prepara sul gesto d'avvio (sblocca l'AudioContext).
	let audioCtx: AudioContext | null = null;
	function primeBeep(): void {
		try {
			const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (Ctor && !audioCtx) audioCtx = new Ctor();
			void audioCtx?.resume?.();
		} catch { /* niente audio: pazienza */ }
	}
	function beep(): void {
		if (!audioCtx) return;
		try {
			const t = audioCtx.currentTime;
			const o = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			o.type = 'sine';
			o.frequency.value = 880;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
			o.connect(g);
			g.connect(audioCtx.destination);
			o.start(t);
			o.stop(t + 0.12);
		} catch { /* pazienza */ }
	}
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	// I comandi sono anche BOTTONI: un tap durante l'ascolto interrompe il mic e vale
	// come il comando (repeat/slow/pause/skip/quit).
	let tapResolve: ((c: Command) => void) | null = null;
	let listening = $state(false);
	function tapCommand(c: Command): void {
		tapResolve?.(c);
	}

	// bip → breve pausa → ascolto (voce o tap), col mic interrompibile.
	async function listenAfterBeep(): Promise<Heard> {
		beep();
		await sleep(160);
		if (!running) return { alts: [] };
		const { promise, abort } = abortableListen();
		listening = true;
		const tapP = new Promise<Command>((res) => { tapResolve = res; });
		const result = await Promise.race([promise.then((alts) => ({ alts }) as Heard), tapP.then((tap) => ({ tap }) as Heard)]);
		listening = false;
		tapResolve = null;
		if ('tap' in result) abort();
		return result;
	}

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
		// il riconoscitore trascrive in forma scritta: aggiungi la variante kanji
		// della risposta kana (えきのまえ → 駅の前); i numerali kana convergono già
		// in normalizeSpeech (さんじ ↔ 3時)
		const kanji = kanaToKanjiWritten(corretta);
		return { corretta, varianti: [...new Set([...phraseVariants(corretta), corretta, ...(kanji ? [kanji] : [])])] };
	}

	// In pausa NON si ascolta e NON si parla: si aspetta un tap sui bottoni grandi
	// «Riprendi» / «Ferma». Ritorna true se si riprende, false se si esce.
	let pauseResolve: ((action: 'resume' | 'stop') => void) | null = null;
	function resumePause(): void { pauseResolve?.('resume'); }
	function stopPause(): void { pauseResolve?.('stop'); }
	async function pauseUntilResume(): Promise<boolean> {
		status = 'paused';
		const action = await new Promise<'resume' | 'stop'>((res) => { pauseResolve = res; });
		pauseResolve = null;
		if (action === 'stop') { stop(); return false; }
		lastActivity = Date.now();
		return true;
	}

	async function runRound(r: HFRound): Promise<void> {
		status = 'speaking';
		let { corretta, varianti } = await playPrompt(r, false);
		for (let attempt = 0; attempt < 8 && running; attempt += 1) {
			status = 'listening';
			const h = await listenAfterBeep();
			if (!running) return;

			let cls: string;
			if ('tap' in h) {
				cls = h.tap; // comando toccato
			} else {
				const alts = h.alts;
				if (alts.length === 0) {
					if (Date.now() - lastActivity > SILENCE_MS) {
						await speakIt('Non sento risposte da un po\'. Mi fermo. A presto!');
						stop();
						return;
					}
					continue; // niente sentito, riascolta (col bip)
				}
				lastActivity = Date.now();
				// PRIMA la risposta: una risposta che contiene un comando non viene rubata.
				if (judgeAnswer(alts, varianti)) {
					status = 'ok';
					score += 1;
					// solo credito POSITIVO sulle giuste (l'audio non penalizza).
					if (r.kind === 'frase') void recordPractice('phrase:' + r.jp, true, 'facet_form_speak');
					await speakJp('そう！');
					await speakJp(corretta);
					return;
				}
				cls = classifyUtterance(alts);
			}

			if (cls === 'slow') { ({ corretta, varianti } = await playPrompt(r, true)); continue; }
			if (cls === 'repeat') { ({ corretta, varianti } = await playPrompt(r, false)); continue; }
			if (cls === 'pause') { const resumed = await pauseUntilResume(); if (!resumed || !running) return; ({ corretta, varianti } = await playPrompt(r, false)); continue; }
			if (cls === 'quit') { stop(); return; }
			if (cls === 'skip') return;
			// solo voce non riconosciuta come risposta → si dice la giusta, niente penalità.
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
			releaseWakeLock();
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
		lastActivity = Date.now();
		primeBeep();
		await acquireWakeLock();
		if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
		await mainLoop();
	}

	function stop(): void {
		running = false;
		stopSpeaking();
		releaseWakeLock();
		scene = 'done';
	}
	onDestroy(() => {
		running = false;
		stopSpeaking();
		releaseWakeLock();
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
	});

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
				<p class="hint small">Al primo avvio concedi il permesso al microfono. Lo schermo resta acceso durante la partita (utile mentre corri, col telefono in tasca). Nota: non funziona a schermo spento — mic e voce del browser non girano in background.</p>
			{:else}
				<p class="hint warn">Serve un browser con riconoscimento vocale (Chrome) e connessione sicura (https). Su questo dispositivo non è disponibile.</p>
			{/if}
		</article>
	{:else if scene === 'play'}
		<article class="scene play">
			<p class="who">{idx + 1} / {rounds.length}</p>
			<div class="big-status" class:pulse={status === 'listening'}>{STATUS_ICON[status]}</div>
			<p class="hint">{status === 'listening' ? 'Parla ora…' : status === 'paused' ? 'In pausa — riparla per riprendere' : status === 'speaking' ? 'Ascolta…' : status === 'ok' ? 'Bravo!' : 'Riascolta la versione giusta'}</p>
			{#if status === 'paused'}
				<div class="pause-actions">
					<button class="big-btn resume" onclick={resumePause}>▶️ Riprendi</button>
					<button class="big-btn ferma" onclick={stopPause}>⏹️ Ferma</button>
				</div>
			{:else}
				<p class="cmd-title">Comandi — dilli a voce o toccali</p>
				<div class="cmd-grid">
					{#each HF_COMMANDS as c (c.label)}
						<button class="cmd-btn" class:live={listening} onclick={() => tapCommand(c.cmd)}>
							<span class="cmd-say">🎤 {c.say[0]}</span>
							<span class="cmd-lab">{c.icon} {c.label}</span>
						</button>
					{/each}
				</div>
				<button class="stop" onclick={stop}>⏹ Ferma</button>
			{/if}
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
	.hf { display: grid; gap: 14px; max-width: 100%; overflow-x: hidden; }
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
	.big-status { font-size: 3.4rem; line-height: 1; }
	.big-status.pulse { animation: pulse 1s ease-in-out infinite; }
	@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
	.cmd-title { margin: 6px 0 0; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
	.cmd-grid { width: 100%; max-width: 100%; display: grid; grid-template-columns: 1fr; gap: 10px; }
	@media (min-width: 480px) { .cmd-grid { grid-template-columns: repeat(2, 1fr); } }
	.cmd-btn {
		display: grid; gap: 4px; justify-items: center; text-align: center;
		padding: 12px 6px; border-radius: 14px; border: 1.5px solid var(--line);
		background: var(--surface-2); color: var(--ink); cursor: pointer;
		min-width: 0; overflow: hidden;
	}
	.cmd-btn.live { border-color: var(--brand); background: var(--surface); }
	.cmd-btn:active { transform: scale(0.97); }
	/* la frase non va a capo MA si adatta: font fluido + riduzione se serve */
	.cmd-btn .cmd-say { font-size: clamp(1.05rem, 6vw, 1.5rem); font-weight: 800; line-height: 1.1; white-space: nowrap; max-width: 100%; }
	.cmd-btn .cmd-lab { font-size: 0.85rem; color: var(--muted); }
	.pause-actions { width: 100%; display: grid; gap: 12px; }
	.big-btn { padding: 20px; border-radius: 16px; font-size: 1.3rem; font-weight: 800; cursor: pointer; border: 2px solid var(--line); }
	.big-btn.resume { background: var(--brand); color: #fff; border-color: var(--brand); }
	.big-btn.ferma { background: var(--surface); color: var(--danger); border-color: var(--danger); }
	.big-btn:active { transform: scale(0.98); }
	.score-big { margin: 0; text-align: center; font-size: 2.6rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 12px 26px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 700; font-size: 1.05rem; cursor: pointer; }
	.stop { padding: 8px 18px; border-radius: 999px; border: 1.5px solid var(--danger); background: var(--surface); color: var(--danger); font-weight: 700; cursor: pointer; }
</style>
