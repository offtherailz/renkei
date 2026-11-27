<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakExamPart, speakExamLine, examDialogueLineCount, stopExamListening } from '$lib/core/examListening';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { recordGameResult, MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT } from '$lib/core/gameBelts';
	import { mondaiKey } from '$lib/data/esame-n4';
	import { examStrip } from '$lib/data/kanjiN4';
	import { mondaiPool, type ProvaQuestion, type PoolItem } from '$lib/data/esame-n4-prova';
	import { noteAltre } from '$lib/core/letturaVolo';
	import { generaDaCatalogo } from '$lib/data/esame-n4-genera';
	import {
		TIPO_LABEL,
		TIPO_CONSIGLIO,
		adattoAlContesto,
		costruisciRound,
		dividiPrompt,
		ruoloIt,
		type ContestoRound,
		type Battuta
	} from '$lib/core/contestoAscolto';

	const ROUNDS = 8;
	type Modo = 'esame' | 'allenamento';
	type Fase = 'start' | 'apertura' | 'indovina' | 'dialogo' | 'risposta' | 'revisione' | 'fine';

	interface Giro {
		q: ProvaQuestion;
		r: ContestoRound;
		battute: Battuta[];
		tipoPick: string | null;
		chiPick: string | null;
		risposta: number | null;
	}

	let modo = $state<Modo>('esame');
	let fase = $state<Fase>('start');
	let giri = $state<Giro[]>([]);
	let idx = $state(0);
	let playing = $state(false);
	let ascoltiApertura = $state(0);
	let ascoltiDialogo = $state(0);
	let finito = false;

	const maxAscolti = $derived(modo === 'esame' ? 1 : 2);
	const giro = $derived(giri[idx]);

	// Fonti: le prove dei libri caricate sul dispositivo (prove ufficiali, 直前対策,
	// MIGII, Best Practice: db.course_giorno via generaDaCatalogo) e i dialoghi
	// scritti per l'app. Se ci sono abbastanza prove dei libri, si parte da quelle.
	type Fonte = 'libri' | 'app' | 'tutte';
	let fonte = $state<Fonte>('tutte');
	let extra: Record<string, PoolItem[]> = {};
	let promptLibri = new Set<string>();
	let nLibri = $state(0);
	let nApp = $state(0);
	onMount(async () => {
		extra = await generaDaCatalogo().catch(() => ({}));
		promptLibri = new Set([...(extra.kadai ?? []), ...(extra.point ?? [])].map((q) => q.prompt));
		const tutte = poolCompleto();
		nLibri = tutte.filter((q) => promptLibri.has(q.prompt)).length;
		nApp = tutte.length - nLibri;
		if (nLibri >= ROUNDS) fonte = 'libri';
	});
	function poolCompleto(): ProvaQuestion[] {
		return [...mondaiPool('kadai', { extra }), ...mondaiPool('point', { extra })].filter((q) => adattoAlContesto(q.prompt));
	}

	function start(m: Modo): void {
		modo = m;
		const pool = poolCompleto().filter((q) => fonte === 'tutte' || (fonte === 'libri') === promptLibri.has(q.prompt));
		const scelti = pool.sort(() => Math.random() - 0.5).slice(0, ROUNDS);
		giri = scelti.map((q) => ({ q, r: costruisciRound(q.prompt), battute: dividiPrompt(q.prompt).battute, tipoPick: null, chiPick: null, risposta: null }));
		idx = 0;
		finito = false;
		apriGiro();
	}

	function apriGiro(): void {
		stopExamListening();
		ascoltiApertura = 0;
		ascoltiDialogo = 0;
		passo = -1;
		fase = 'apertura';
	}

	async function play(part: 'apertura' | 'dialogo', rate = 1): Promise<void> {
		if (!giro || playing) return;
		playing = true;
		await speakExamPart(giro.q.prompt, part, rate);
		playing = false;
	}

	async function ascoltaApertura(rate = 1): Promise<void> {
		if (ascoltiApertura >= maxAscolti || playing) return;
		ascoltiApertura += 1;
		await play('apertura', rate);
		fase = 'indovina';
	}

	function scegliTipo(t: string): void {
		if (!giro || giro.tipoPick !== null) return;
		giro.tipoPick = t;
	}
	function scegliChi(c: string): void {
		if (!giro || giro.chiPick !== null) return;
		giro.chiPick = c;
	}
	const indovinaFatto = $derived(!!giro && giro.tipoPick !== null && (giro.r.chi === null || giro.chiPick !== null));

	async function ascoltaDialogo(rate = 1): Promise<void> {
		if (ascoltiDialogo >= maxAscolti || playing) return;
		fase = 'dialogo';
		ascoltiDialogo += 1;
		await play('dialogo', rate);
		fase = 'risposta';
	}

	// 練習: una battuta alla volta, per seguire i cambi di piano passo passo.
	// passo = indice dell'ultima battuta sentita (-1 = modalità non attiva).
	let passo = $state(-1);
	const nBattute = $derived(giro ? examDialogueLineCount(giro.q.prompt) : 0);
	async function battuta(i: number): Promise<void> {
		if (!giro || playing) return;
		if (passo < 0) {
			if (ascoltiDialogo >= maxAscolti) return;
			ascoltiDialogo += 1;
		}
		passo = i;
		fase = 'dialogo';
		playing = true;
		await speakExamLine(giro.q.prompt, i);
		playing = false;
		if (i >= nBattute - 1) fase = 'risposta';
	}

	function rispondi(i: number): void {
		if (!giro || giro.risposta !== null || playing) return;
		stopExamListening();
		giro.risposta = i;
		void recordPractice(mondaiKey(giro.q.mondaiSlug), i === giro.q.correct);
		fase = 'revisione';
	}

	function avanti(): void {
		if (idx < giri.length - 1) {
			idx += 1;
			apriGiro();
		} else {
			fase = 'fine';
			registra(giri.length);
		}
	}

	const contestoOk = (g: Giro) => g.tipoPick === g.r.tipo && (g.r.chi === null || g.chiPick === g.r.chiCorretta);
	const risposteOk = $derived(giri.filter((g) => g.risposta === g.q.correct).length);
	const contestiOk = $derived(giri.filter((g) => g.tipoPick !== null && contestoOk(g)).length);

	// Pulita: max 1 risposta sbagliata. Impresa: tutto giusto (contesto e risposte) in modalità esame.
	function registra(fatti: number): void {
		if (finito || fatti === 0) return;
		finito = true;
		const g = giri.slice(0, fatti);
		const ok = g.filter((x) => x.risposta === x.q.correct).length;
		const ctx = g.filter(contestoOk).length;
		const clean = fatti >= MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT && ok >= fatti - 1;
		const epic = clean && modo === 'esame' && ok === fatti && ctx === fatti;
		recordGameResult('contesto', clean, epic);
	}
	function leaveEarly(): void {
		if (fase === 'start' || fase === 'fine') return;
		const fatti = giro?.risposta !== null ? idx + 1 : idx;
		registra(fatti);
	}
	onDestroy(stopExamListening);
</script>

<div class="ctx">
	<div class="nav">
		<a class="back" href="{base}/esame" onclick={leaveEarly}>← Esame N4</a>
		{#if fase !== 'start' && fase !== 'fine'}
			<span class="chip">{idx + 1} / {giri.length} · {modo === 'esame' ? '1 ascolto' : '2 ascolti'}</span>
		{/if}
	</div>

	{#if fase === 'start'}
		<article class="scene">
			<h1 class="page-title">🎯 Contesto al volo</h1>
			<p>All’esame, <strong>prima</strong> del dialogo, il narratore ti dice chi parla e ti fa già la domanda. Se la cogli, sai cosa cercare. Se la perdi, ascolti tutto alla cieca.</p>
			<ol class="steps">
				<li>Senti <strong>solo l’apertura</strong> e indovini <em>cosa chiedono</em> e <em>di chi</em>.</li>
				<li>Senti il dialogo e rispondi.</li>
				<li>Rivedi il copione con i <strong>segnali di svolta</strong> (でも, じゃあ, やっぱり…).</li>
			</ol>
			{#if nLibri > 0}
				<div class="fonti" role="group" aria-label="Fonte dei dialoghi">
					<button class:on={fonte === 'libri'} onclick={() => (fonte = 'libri')}>📚 Prove dei libri ({nLibri})</button>
					<button class:on={fonte === 'app'} onclick={() => (fonte = 'app')}>✏️ App ({nApp})</button>
					<button class:on={fonte === 'tutte'} onclick={() => (fonte = 'tutte')}>Tutte</button>
				</div>
			{/if}
			<div class="modes">
				<button class="mode" onclick={() => start('esame')}><strong>本番 Esame</strong><small>1 ascolto, come il giorno dell’esame</small></button>
				<button class="mode" onclick={() => start('allenamento')}><strong>練習 Allenamento</strong><small>2 ascolti, anche 🐢 lento</small></button>
			</div>
		</article>
	{:else if giro && (fase === 'apertura' || fase === 'indovina')}
		<article class="scene">
			<p class="who">① L’apertura</p>
			{#if fase === 'apertura'}
				<p class="hint">Ascolta: chi parla? cosa ti chiedono? Niente testo.</p>
				<p class="ear" class:playing>👂</p>
				{#if !playing}
					<div class="row">
						<button class="proceed" onclick={() => ascoltaApertura()}>▶️ Ascolta l’apertura</button>
						{#if modo === 'allenamento'}<button class="mini" onclick={() => ascoltaApertura(0.7)}>🐢 ゆっくり</button>{/if}
					</div>
				{/if}
			{:else}
				<p class="lbl">Cosa ti chiedono?</p>
				<div class="choices">
					{#each giro.r.tipoOpzioni as t (t)}
						<button class="choice" class:right={giro.tipoPick !== null && t === giro.r.tipo} class:wrong={giro.tipoPick === t && t !== giro.r.tipo} disabled={giro.tipoPick !== null} onclick={() => scegliTipo(t)}>{TIPO_LABEL[t]}</button>
					{/each}
				</div>
				{#if giro.r.chi !== null && giro.tipoPick !== null}
					<p class="lbl">Di chi parla la domanda?</p>
					<div class="choices two">
						{#each giro.r.chiOpzioni as c (c)}
							<button class="choice" class:right={giro.chiPick !== null && c === giro.r.chiCorretta} class:wrong={giro.chiPick === c && c !== giro.r.chiCorretta} disabled={giro.chiPick !== null} onclick={() => scegliChi(c)}>{c}</button>
						{/each}
					</div>
				{/if}
				{#if indovinaFatto}
					<div class="reveal">
						<p class="q-jp"><FuriganaText text={giro.r.domanda} force={true} /></p>
						<p class="tip">💡 {TIPO_CONSIGLIO[giro.r.tipo]}</p>
					</div>
					<div class="row">
						{#if !playing && ascoltiApertura < maxAscolti}<button class="mini" onclick={() => ascoltaApertura()}>🔁 もう一度</button>{/if}
						<button class="proceed" onclick={() => (fase = 'dialogo')}>② Al dialogo →</button>
					</div>
				{/if}
			{/if}
		</article>
	{:else if giro && (fase === 'dialogo' || fase === 'risposta')}
		<article class="scene">
			<p class="who">② Il dialogo</p>
			<p class="bubble sm">❓ <FuriganaText text={giro.r.domanda} force={true} /></p>
			<p class="tip">💡 {TIPO_CONSIGLIO[giro.r.tipo]}</p>
			<div class="choices">
				{#each giro.q.choices as c, i (i)}
					<button class="choice jp" disabled={playing || ascoltiDialogo === 0} onclick={() => rispondi(i)}><FuriganaText text={examStrip(c)} force={true} /></button>
				{/each}
			</div>
			{#if passo >= 0}
				<div class="step">
					<p class="lbl">Battuta {passo + 1} di {nBattute} — cosa è cambiato? cosa farà ora?</p>
					<div class="row">
						<button class="mini" disabled={playing} onclick={() => battuta(passo)}>🔁 Ripeti la battuta</button>
						{#if passo < nBattute - 1}
							<button class="proceed" disabled={playing} onclick={() => battuta(passo + 1)}>▶️ Battuta successiva</button>
						{:else}
							<p class="hint">Fine del dialogo: scegli la risposta.</p>
						{/if}
					</div>
				</div>
			{:else if playing}
				<p class="ear playing">👂</p>
			{:else}
				<div class="row">
					{#if ascoltiDialogo < maxAscolti}
						<button class={ascoltiDialogo === 0 ? 'proceed' : 'mini'} onclick={() => ascoltaDialogo()}>{ascoltiDialogo === 0 ? '▶️ Ascolta il dialogo' : '🔁 もう一度'}</button>
						{#if modo === 'allenamento'}
							<button class="mini" onclick={() => ascoltaDialogo(0.7)}>🐢 ゆっくり</button>
							<button class="mini" onclick={() => battuta(0)}>⏯ Una battuta alla volta</button>
						{/if}
					{:else}
						<p class="hint">Ascolto finito: scegli la risposta.</p>
					{/if}
				</div>
			{/if}
		</article>
	{:else if giro && fase === 'revisione'}
		{@const ok = giro.risposta === giro.q.correct}
		<article class="scene">
			<p class="who">{ok ? '✅ Giusto' : '❌ Sbagliato'}{contestoOk(giro) ? ' · contesto colto 🎯' : ' · contesto da rivedere'}</p>
			<p class="ans">✅ <FuriganaText text={examStrip(giro.q.choices[giro.q.correct] ?? '')} force={true} /></p>
			{#if !ok && giro.risposta !== null}<p class="ans bad">✗ la tua: <FuriganaText text={examStrip(giro.q.choices[giro.risposta] ?? '')} force={true} /></p>{/if}
			<p class="why">{giro.q.perche_giusta}</p>
			<p class="lbl">Le altre opzioni</p>
			<ul class="altre">
				{#each noteAltre(giro.q.choices, giro.q.correct, giro.q.perche_sbagliate, giro.battute.map((b) => b.text).join('。')) as a, i (i)}
					<li class:mine={giro.risposta !== null && giro.q.choices[giro.risposta] === a.scelta}>✗ <FuriganaText text={examStrip(a.scelta)} force={true} /> — {a.nota.replace('nel testo', 'nel dialogo')}</li>
				{/each}
			</ul>
			{#if giro.r.segnali.length > 0}
				<p class="lbl">Segnali di svolta nel dialogo</p>
				<div class="chips">
					{#each giro.r.segnali as s (s.jp)}<span class="sig"><strong>{s.jp}</strong> {s.it}</span>{/each}
				</div>
			{/if}
			<div class="script-head">
				<p class="lbl">📜 Copione (tocca le parole)</p>
				<button class="mini" disabled={playing} onclick={() => play('dialogo')}>🔊 もう一度</button>
				<button class="mini" disabled={playing} onclick={() => play('dialogo', 0.7)}>🐢 ゆっくり</button>
			</div>
			{#each giro.battute as b, i (i)}
				<div class="line">
					<span class="line-who">{ruoloIt(b.who)}</span>
					<InteractiveSentence text={b.text} />
					<button class="tts-mini" title="Riascolta" onclick={() => speakSentenceJapanese(b.text)}>🔊</button>
				</div>
			{/each}
			{#if giro.q.traduzione}<p class="tr">🇮🇹 {giro.q.traduzione}</p>{/if}
			<button class="proceed" onclick={avanti}>{idx < giri.length - 1 ? 'Prossimo →' : 'Risultato →'}</button>
		</article>
	{:else if fase === 'fine'}
		<article class="scene">
			<p class="who">{risposteOk === giri.length ? '🎉 Orecchio d’esame!' : '📝 Risultato'}</p>
			<div class="scores">
				<div><span class="big">{contestiOk}/{giri.length}</span><small>contesti colti</small></div>
				<div><span class="big">{risposteOk}/{giri.length}</span><small>risposte giuste</small></div>
			</div>
			{#if contestiOk < giri.length}
				<p class="hint">Se il contesto ti sfugge, la risposta diventa un tiro a caso: allena l’apertura finché la cogli sempre.</p>
			{/if}
			<div class="row">
				<button class="proceed" onclick={() => start(modo)}>🎲 Altri {ROUNDS}</button>
				<button class="mini" onclick={() => (fase = 'start')}>Cambia modalità</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.ctx { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.scene { background: var(--surface); border-radius: 16px; padding: 18px; box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); display: grid; gap: 12px; }
	.scene p { margin: 0; }
	.steps { margin: 0; padding-left: 20px; display: grid; gap: 4px; font-size: 0.92rem; }
	.fonti { display: flex; flex-wrap: wrap; gap: 6px; }
	.fonti button { border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); border-radius: 999px; padding: 6px 12px; font-size: 0.85rem; cursor: pointer; }
	.fonti button.on { border-color: var(--brand); background: var(--brand); color: #fff; }
	.modes { display: grid; gap: 8px; }
	.mode { display: grid; gap: 2px; text-align: left; border: 2px solid var(--line); border-radius: 12px; background: var(--surface-2); color: var(--ink); padding: 12px; cursor: pointer; }
	.mode small { color: var(--muted); }
	.who { font-size: 0.95rem; font-weight: 700; }
	.lbl { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
	.hint { text-align: center; font-size: 0.85rem; color: var(--muted); }
	.ear { text-align: center; font-size: 3rem; opacity: 0.5; }
	.ear.playing { opacity: 1; animation: pulse 1s ease-in-out infinite; }
	@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
	.row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.choices { display: grid; gap: 8px; }
	.choices.two { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
	.choice { padding: 11px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 0.98rem; text-align: center; cursor: pointer; }
	.choice.jp { font-size: 1.08rem; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg, var(--surface-2)); }
	.choice.wrong { border-color: var(--danger); }
	.step { display: grid; gap: 8px; background: var(--info-bg); color: var(--info-ink); border-radius: 10px; padding: 10px; }
	.reveal { display: grid; gap: 6px; border-top: 1px solid var(--line); padding-top: 10px; }
	.q-jp { font-size: 1.1rem; text-align: center; }
	.tip { font-size: 0.85rem; background: var(--info-bg, var(--surface-2)); color: var(--info-ink, var(--ink)); border-radius: 8px; padding: 7px 10px; }
	.bubble { text-align: center; background: var(--surface-2); border-radius: 12px; padding: 10px; }
	.bubble.sm { font-size: 1rem; }
	.ans { font-size: 1.05rem; color: var(--success); }
	.ans.bad { color: var(--danger); }
	.why { font-size: 0.88rem; }
	.altre { margin: 0; padding-left: 4px; list-style: none; display: grid; gap: 3px; font-size: 0.88rem; }
	.altre li.mine { font-weight: 700; }
	.chips { display: flex; flex-wrap: wrap; gap: 6px; }
	.sig { font-size: 0.8rem; background: var(--warn-bg); color: var(--warn-ink); border-radius: 999px; padding: 3px 10px; }
	.script-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.script-head .lbl { margin-right: auto; }
	.line { display: flex; gap: 8px; align-items: baseline; padding: 6px 10px; border-radius: 8px; background: var(--surface-2); border-left: 3px solid var(--line); }
	.line-who { font-size: 0.75rem; color: var(--muted); white-space: nowrap; }
	.tts-mini { margin-left: auto; border: none; background: none; cursor: pointer; font-size: 0.95rem; }
	.tr { font-size: 0.85rem; color: var(--muted); }
	.scores { display: flex; justify-content: center; gap: 28px; }
	.scores div { display: grid; text-align: center; }
	.big { font-size: 2rem; font-weight: 800; }
	.scores small { color: var(--muted); font-size: 0.8rem; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
