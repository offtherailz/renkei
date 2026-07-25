<script lang="ts">
	// 🧑‍🤝‍🧑 Relazioni (beta): conversazione guidata dove il registro cambia
	// col rapporto con l'interlocutore. L'NPC parla a voce (di sé o ti fa una
	// domanda), tu scegli la risposta appropriata (registro + contenuto) tra
	// opzioni — o la dici a voce 🎤 (mic opzionale, fallback bottoni).
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import RepeatBar from '$lib/components/RepeatBar.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import { speakSequence } from '$lib/core/tts';
	import { voiceParams, opposite, type Gender } from '$lib/core/voices';
	import { speechAvailable, listenJapanese, speechMatches, sentenceMatchVariants } from '$lib/core/speech';
	import { recordPractice, recordPracticeMiss } from '$lib/core/practiceMiss';
	import { findWord, gameSnapshot } from '$lib/core/gameKit';
	import { appState } from '$lib/stores.svelte';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import { recordGameResult } from '$lib/core/gameBelts';
	import {
		SCENARIOS,
		THEME_KEYWORD,
		type Scenario,
		type ScenarioId,
		type Turn,
		buildTurns,
		computeScore
	} from '$lib/core/relazioni';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function npcGender(): Gender {
		return opposite(userGender());
	}

	type Who = 'me' | 'npc';
	type Scene = 'pick' | 'play' | 'done';
	let scene = $state<Scene>('pick');

	let scenario = $state<Scenario | null>(null);
	let turns = $state<Turn[]>([]);
	let turnIdx = $state(0);
	let dialog = $state<{ who: Who; text: string }[]>([]);

	let picked = $state<number | null>(null); // indice opzione scelta
	let correctCount = $state(0);
	let hintsUsed = $state(0);
	let showSolution = $state(false); // hint: mostra il testo della battuta NPC prima di ascoltarla di nuovo
	let showScript = $state(false);

	let best = $state(0);
	let finalScore = $state(0);
	let isRecord = $state(false);

	// ── Mic (opzionale, fallback bottoni) ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');

	onMount(() => {
		canSpeak = speechAvailable();
		best = getHighscore('relazioni');
	});

	export const snapshot = gameSnapshot(
		() => ({
			scene,
			scenario,
			turns,
			turnIdx,
			dialog,
			picked,
			correctCount,
			hintsUsed,
			showSolution,
			finalScore,
			isRecord
		}),
		(s) => {
			scene = s.scene;
			scenario = s.scenario;
			turns = s.turns;
			turnIdx = s.turnIdx;
			dialog = s.dialog;
			picked = s.picked;
			correctCount = s.correctCount;
			hintsUsed = s.hintsUsed;
			showSolution = s.showSolution;
			finalScore = s.finalScore;
			isRecord = s.isRecord;
		}
	);

	function pushLine(who: Who, text: string): void {
		dialog = [...dialog, { who, text }];
	}

	function cur(): Turn {
		return turns[turnIdx]!;
	}

	// Fa parlare l'NPC la battuta del turno corrente (una sola voce alla volta:
	// speakSequence, mai due speak consecutivi).
	function speakNpcTurn(): void {
		const t = cur();
		speakSequence([{ text: t.npcLine.jp, options: voiceParams(npcGender()) }]);
	}

	function pick(id: ScenarioId): void {
		scenario = SCENARIOS.find((s) => s.id === id)!;
		turns = buildTurns(scenario);
		turnIdx = 0;
		dialog = [];
		picked = null;
		correctCount = 0;
		hintsUsed = 0;
		showSolution = false;
		showScript = false;
		heard = '';
		scene = 'play';
		pushLine('npc', turns[0]!.npcLine.jp);
		speakNpcTurn();
	}

	function quit(): void {
		// uscire a metà conversazione (Esci) perdeva la cintura: si registrava
		// solo a conversazione conclusa. Qui non c'è un punteggio "parziale"
		// pulito da valutare — si accredita solo la partita.
		if (scene === 'play') recordGameResult('relazioni', false, false);
		scenario = null;
		scene = 'pick';
	}

	function leaveEarly(): void {
		if (scene === 'play') recordGameResult('relazioni', false, false);
	}

	// L'utente sceglie un'opzione (bottone o mic). Registra correttezza,
	// aggiorna il punteggio e alimenta il consolidamento se sbaglia (solo se la
	// parola-chiave del tema esiste nel catalogo — vedi THEME_KEYWORD).
	async function choose(idx: number): Promise<void> {
		if (picked !== null) return;
		picked = idx;
		const t = cur();
		const opt = t.options[idx]!;
		pushLine('me', opt.jp);
		if (opt.correct) {
			correctCount += 1;
		} else {
			const keyword = THEME_KEYWORD[t.theme];
			if (keyword) {
				const hit = await findWord(keyword);
				if (hit) await recordPracticeMiss('word:' + hit.id);
			}
		}
		// tema con costruzione (permesso/obbligo): credito o penalità su gram:<slug>
		if (t.gram) await recordPractice('gram:' + t.gram, opt.correct);
	}

	async function speakMyChoice(): Promise<void> {
		if (micState !== 'idle' || picked !== null) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (alts.length === 0) {
			heard = '（何も聞こえませんでした…riprova）';
			return;
		}
		heard = alts[0]!;
		const t = cur();
		const matchIdx = t.options.findIndex((o) => speechMatches(alts, [sentenceMatchVariants(o.jp)]));
		if (matchIdx >= 0) await choose(matchIdx);
	}

	function useHint(): void {
		if (showSolution) return;
		showSolution = true;
		hintsUsed += 1;
	}

	function next(): void {
		if (turnIdx < turns.length - 1) {
			turnIdx += 1;
			picked = null;
			showSolution = false;
			heard = '';
			pushLine('npc', cur().npcLine.jp);
			speakNpcTurn();
		} else {
			finalScore = computeScore(turns.length, correctCount, hintsUsed);
			isRecord = submitScore('relazioni', finalScore);
			best = getHighscore('relazioni');
			scene = 'done';
			recordGameResult('relazioni', correctCount === turns.length && hintsUsed === 0, correctCount === turns.length && hintsUsed === 0 && scenario?.id === 'joushi');
		}
	}

	function playAgain(): void {
		if (!scenario) return;
		pick(scenario.id);
	}
</script>

{#snippet repeatBar(line: string)}
	<RepeatBar {line} gender={npcGender()} />
{/snippet}

<div class="relazioni">
	<div class="nav">
		<a class="back" href="{base}/giochi" onclick={leaveEarly}>← Giochi</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>

	{#if showScript}
		<ScriptLog
			lines={dialog}
			icons={{ me: '🙂', npc: scenario?.npcIcon ?? '🗣️' }}
			title="📜 La conversazione finora"
		/>
	{/if}

	{#if scene === 'pick'}
		<article class="scene">
			<h1 class="page-title">🧑‍🤝‍🧑 Relazioni <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Il registro cambia col rapporto: scegli con chi stai parlando e adegua 丁寧/普通体/敬語
				di conseguenza. Rispondi in modo appropriato: le opzioni sbagliate sono plausibili ma nel
				registro scorretto o fuori tema.
			</p>
			<div class="scenario-grid">
				{#each SCENARIOS as s (s.id)}
					<button class="scenario-card" onclick={() => pick(s.id)}>
						<span class="scenario-icon">{s.icon}</span>
						<span class="scenario-label">{s.label}</span>
						<span class="scenario-context">{s.context}</span>
					</button>
				{/each}
			</div>
			<p class="record">🏆 Record: {best}</p>
		</article>
	{:else if scene === 'play' && scenario}
		{@const t = cur()}
		<article class="scene">
			<div class="game-head">
				<button class="quit" onclick={quit}>← Esci</button>
				<span class="score-line">{scenario.icon} {scenario.label} · turno {turnIdx + 1}/{turns.length}</span>
			</div>

			<div class="turn">
				<p class="who">{scenario.npcIcon} {scenario.npc}</p>
				<p class="bubble" class:hidden-solution={!showSolution}>
					{#if showSolution}{t.npcLine.jp}{:else}🔊 …ascolta cosa dice{/if}
				</p>
				{@render repeatBar(t.npcLine.jp)}
				{#if showSolution}
					<p class="bubble-read">{t.npcLine.read}</p>
					<p class="bubble-it">{t.npcLine.it}</p>
				{/if}
				<div class="hint-row">
					<button class="hint-btn" disabled={showSolution} onclick={useHint}>
						💡 Aiuto {showSolution ? '(usato)' : ''}
					</button>
					{#if !showSolution}<span class="hint-note">mostra lettura e traduzione</span>{/if}
				</div>
			</div>

			{#if picked === null}
				<div class="choices">
					{#each t.options as opt, i (i)}
						<button class="choice" onclick={() => choose(i)}>{opt.jp}</button>
					{/each}
				</div>
				{#if canSpeak}
					<button class="mic" class:listening={micState === 'listening'} onclick={speakMyChoice}>
						{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
					</button>
					<HeardDiff {heard} candidates={t.options.map((o) => o.jp)} />
				{/if}
			{:else}
				{@const chosen = t.options[picked]!}
				<div class="feedback" class:right={chosen.correct} class:wrong={!chosen.correct}>
					<p class="feedback-line">{chosen.jp}</p>
					<p class="feedback-read">{chosen.read}</p>
					<p class="feedback-it">{chosen.it} · <span class="feedback-en">{chosen.en}</span></p>
					{#if chosen.correct}
						<p class="feedback-verdict ok">✅ Registro e contenuto giusti.</p>
					{:else}
						<p class="feedback-verdict warn">⚠️ {chosen.reason}</p>
						{@const rightOpt = t.options.find((o) => o.correct)!}
						<p class="feedback-correct">Risposta corretta: <strong>{rightOpt.jp}</strong> — {rightOpt.it}</p>
					{/if}
				</div>
				<button class="proceed" onclick={next}>
					{turnIdx < turns.length - 1 ? 'Avanti →' : 'Risultato →'}
				</button>
			{/if}
		</article>
	{:else if scene === 'done' && scenario}
		<article class="scene">
			<p class="who">{isRecord ? '🏆 Nuovo record!' : '🎉 Conversazione finita!'}</p>
			<p class="score-big">{finalScore}</p>
			<p class="hint">
				Risposte giuste: {correctCount}/{turns.length} · aiuti usati: {hintsUsed} · 🏆 record: {best}
			</p>
			<ScriptLog
				lines={dialog}
				icons={{ me: '🙂', npc: scenario.npcIcon }}
				title="📜 Il dialogo completo"
			/>
			<div class="done-actions">
				<button class="proceed" onclick={playAgain}>🔁 Un'altra conversazione</button>
				<button class="proceed secondary" onclick={quit}>Cambia scenario</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.relazioni { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; text-align: center; }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.hidden-solution { color: var(--muted); font-weight: 500; }
	.bubble-read { margin: 0; text-align: center; font-size: 0.8rem; color: var(--muted); }
	.bubble-it { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.record { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }

	.scenario-grid { display: grid; gap: 10px; }
	.scenario-card {
		display: grid; gap: 4px; padding: 14px; border-radius: 14px; border: 1px solid var(--line);
		background: linear-gradient(170deg, var(--surface), var(--surface-2)); cursor: pointer; text-align: left;
	}
	.scenario-card:hover { border-color: var(--brand); }
	.scenario-icon { font-size: 1.5rem; }
	.scenario-label { font-weight: 700; color: var(--ink); }
	.scenario-context { font-size: 0.78rem; color: var(--muted); }

	.game-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.quit { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.score-line { font-size: 0.82rem; color: var(--muted); font-weight: 600; }

	.turn { display: grid; gap: 8px; }
	.hint-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
	.hint-btn { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--warn-border); background: var(--warn-bg); color: var(--warn-ink); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
	.hint-btn:disabled { opacity: 0.6; cursor: default; }
	.hint-note { font-size: 0.7rem; color: var(--muted); }

	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.02rem; text-align: left; cursor: pointer; }
	.choice:hover { border-color: var(--brand); }

	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.feedback { display: grid; gap: 4px; border-radius: 12px; padding: 12px; border: 1.5px solid var(--line); }
	.feedback.right { border-color: var(--success); background: var(--ok-bg); }
	.feedback.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.feedback-line { margin: 0; font-size: 1.05rem; font-weight: 700; text-align: center; }
	.feedback-read { margin: 0; font-size: 0.8rem; color: var(--muted); text-align: center; }
	.feedback-it { margin: 0; font-size: 0.85rem; text-align: center; }
	.feedback-en { color: var(--muted); }
	.feedback-verdict { margin: 0; font-size: 0.85rem; text-align: center; font-weight: 700; }
	.feedback-verdict.ok { color: var(--success); }
	.feedback-verdict.warn { color: var(--warn-ink); }
	.feedback-correct { margin: 0; font-size: 0.82rem; text-align: center; color: var(--muted); }

	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed.secondary { background: var(--surface-2); color: var(--ink); border-color: var(--line); }
	.done-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
</style>
