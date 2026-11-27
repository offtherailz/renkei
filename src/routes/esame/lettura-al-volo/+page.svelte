<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import { examStrip } from '$lib/data/kanjiN4';
	import { findMondai, mondaiKey } from '$lib/data/esame-n4';
	import { mondaiPool, type ProvaQuestion, type PoolItem } from '$lib/data/esame-n4-prova';
	import { generaDaCatalogo } from '$lib/data/esame-n4-genera';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { recordGameResult, MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT } from '$lib/core/gameBelts';
	import {
		MONDAI_LETTURA,
		TECNICA,
		VELOCITA_OBIETTIVO,
		budgetTesto,
		caratteri,
		cpm,
		dividiTesto,
		frasi,
		frasePerProva,
		type MondaiLettura
	} from '$lib/core/letturaVolo';

	const ROUNDS = 6;
	type Ritmo = 'esame' | 'veloce' | 'libero';
	const FATTORE: Record<Ritmo, number> = { esame: 1, veloce: 0.75, libero: 0 };
	type Fase = 'start' | 'domanda' | 'testo' | 'revisione' | 'fine';
	type Fonte = 'libri' | 'app' | 'tutte';

	interface Giro {
		q: ProvaQuestion;
		slug: MondaiLettura;
		budget: number; // secondi (0 = libero)
		scelta: number | null;
		secondi: number;
	}

	let fase = $state<Fase>('start');
	let ritmo = $state<Ritmo>('esame');
	let tipi = $state<Record<MondaiLettura, boolean>>({ 'dokkai-tan': true, 'dokkai-chu': true, joho: true });
	let fonte = $state<Fonte>('tutte');
	let giri = $state<Giro[]>([]);
	let idx = $state(0);
	let t0 = 0;
	let elapsed = $state(0);
	let ticker: ReturnType<typeof setInterval> | null = null;
	let registrato = false;

	// prove dei libri sul dispositivo (come in Contesto al volo)
	let extra: Record<string, PoolItem[]> = {};
	let promptLibri = new Set<string>();
	let nLibri = $state(0);
	let nApp = $state(0);
	onMount(async () => {
		extra = await generaDaCatalogo().catch(() => ({}));
		promptLibri = new Set(MONDAI_LETTURA.flatMap((s) => (extra[s] ?? []).map((q) => q.prompt)));
		const all = MONDAI_LETTURA.flatMap((s) => mondaiPool(s, { extra }));
		nLibri = all.filter((q) => promptLibri.has(q.prompt)).length;
		nApp = all.length - nLibri;
	});

	const giro = $derived(giri[idx]);
	const testo = $derived(giro ? dividiTesto(giro.q.prompt) : null);
	const restante = $derived(giro && giro.budget > 0 ? Math.max(0, giro.budget - elapsed) : 0);
	const fuoriTempo = $derived(!!giro && giro.budget > 0 && elapsed > giro.budget);

	function budgetDi(slug: MondaiLettura, q: ProvaQuestion): number {
		if (FATTORE[ritmo] === 0) return 0;
		const maxEsame = findMondai(slug)?.mondai.tempo_medio_sec ?? 120;
		return budgetTesto(caratteri(dividiTesto(q.prompt).corpo), maxEsame, FATTORE[ritmo]);
	}

	function start(): void {
		const scelti = MONDAI_LETTURA.filter((s) => tipi[s]);
		const pool = scelti.flatMap((slug) =>
			mondaiPool(slug, { extra })
				.filter((q) => fonte === 'tutte' || (fonte === 'libri') === promptLibri.has(q.prompt))
				.map((q) => ({ q, slug }))
		);
		giri = pool
			.sort(() => Math.random() - 0.5)
			.slice(0, ROUNDS)
			.map(({ q, slug }) => ({ q, slug, budget: budgetDi(slug, q), scelta: null, secondi: 0 }));
		idx = 0;
		registrato = false;
		if (giri.length > 0) apri();
	}

	function apri(): void {
		fase = 'domanda';
		t0 = Date.now();
		elapsed = 0;
		clearTicker();
		ticker = setInterval(() => (elapsed = (Date.now() - t0) / 1000), 200);
	}
	function clearTicker(): void {
		if (ticker) clearInterval(ticker);
		ticker = null;
	}
	onDestroy(clearTicker);

	function rispondi(i: number): void {
		if (!giro || giro.scelta !== null || fase !== 'testo') return;
		clearTicker();
		giro.secondi = (Date.now() - t0) / 1000;
		giro.scelta = i;
		void recordPractice(mondaiKey(giro.slug), i === giro.q.correct);
		fase = 'revisione';
	}

	function avanti(): void {
		if (idx < giri.length - 1) {
			idx += 1;
			apri();
		} else {
			fase = 'fine';
			registra(giri.length);
		}
	}

	const inTempo = (g: Giro) => g.budget === 0 || g.secondi <= g.budget;
	const giusti = $derived(giri.filter((g) => g.scelta === g.q.correct).length);
	const giustiInTempo = $derived(giri.filter((g) => g.scelta === g.q.correct && inTempo(g)).length);
	const velocita = $derived.by(() => {
		const fatti = giri.filter((g) => g.scelta !== null);
		const ch = fatti.reduce((n, g) => n + caratteri(dividiTesto(g.q.prompt).corpo), 0);
		const sec = fatti.reduce((n, g) => n + g.secondi, 0);
		return cpm(ch, sec);
	});

	// record di velocità (per vederla crescere): solo comodità locale
	const KEY = 'renkei_lettura_volo_best_cpm';
	let best = $state(0);
	onMount(() => {
		try { best = Number(localStorage.getItem(KEY) ?? 0) || 0; } catch { best = 0; }
	});

	// Pulita: max 1 errore. Impresa: tutto giusto e in tempo, a ritmo d'esame o veloce.
	function registra(fatti: number): void {
		if (registrato || fatti === 0) return;
		registrato = true;
		const g = giri.slice(0, fatti);
		const ok = g.filter((x) => x.scelta === x.q.correct).length;
		const clean = fatti >= MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT && ok >= fatti - 1;
		const epic = clean && ritmo !== 'libero' && g.every((x) => x.scelta === x.q.correct && inTempo(x));
		recordGameResult('lettura-al-volo', clean, epic);
		if (fatti === giri.length && ok >= fatti - 1 && velocita > best) {
			best = velocita;
			try { localStorage.setItem(KEY, String(best)); } catch { /* niente */ }
		}
	}
	function leaveEarly(): void {
		if (fase === 'start' || fase === 'fine') return;
		registra(giro?.scelta !== null ? idx + 1 : idx);
	}

	const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

<div class="lv">
	<div class="nav">
		<a class="back" href="{base}/esame" onclick={leaveEarly}>← Esame N4</a>
		{#if giro && (fase === 'domanda' || fase === 'testo' || fase === 'revisione')}
			<span class="chip">{idx + 1}/{giri.length} · {TECNICA[giro.slug].jp}</span>
		{/if}
	</div>

	{#if fase === 'start'}
		<article class="scene">
			<h1 class="page-title">📖 Lettura al volo</h1>
			<p>Il 読解 N4 a tempo, con la tecnica d’esame: <strong>prima la domanda</strong> (così sai cosa cerchi), <strong>poi il testo</strong>. Il cronometro parte subito, come all’esame.</p>
			<p class="hint">Tempo per testo: 15 s per la domanda + il testo a ~{VELOCITA_OBIETTIVO} caratteri/minuto (mai oltre il ritmo d’esame).</p>
			<p class="lbl">Tipi di testo</p>
			<div class="pills">
				{#each MONDAI_LETTURA as s (s)}
					<button class:on={tipi[s]} onclick={() => (tipi[s] = !tipi[s])}>{TECNICA[s].jp}</button>
				{/each}
			</div>
			{#if nLibri > 0}
				<p class="lbl">Fonte</p>
				<div class="pills">
					<button class:on={fonte === 'libri'} onclick={() => (fonte = 'libri')}>📚 Prove dei libri ({nLibri})</button>
					<button class:on={fonte === 'app'} onclick={() => (fonte = 'app')}>✏️ App ({nApp})</button>
					<button class:on={fonte === 'tutte'} onclick={() => (fonte = 'tutte')}>Tutte</button>
				</div>
			{/if}
			<p class="lbl">Ritmo</p>
			<div class="pills">
				<button class:on={ritmo === 'esame'} onclick={() => (ritmo = 'esame')}>⏱️ Esame</button>
				<button class:on={ritmo === 'veloce'} onclick={() => (ritmo = 'veloce')}>⚡ Veloce (−25%)</button>
				<button class:on={ritmo === 'libero'} onclick={() => (ritmo = 'libero')}>🐢 Libero</button>
			</div>
			<ul class="tips">
				{#each MONDAI_LETTURA.filter((s) => tipi[s]) as s (s)}
					<li><strong>{TECNICA[s].jp}</strong> — {TECNICA[s].tip}</li>
				{/each}
			</ul>
			{#if best > 0}<p class="hint">Il tuo record: {best} caratteri/minuto</p>{/if}
			<button class="proceed" disabled={!MONDAI_LETTURA.some((s) => tipi[s])} onclick={start}>▶️ Inizia ({ROUNDS} testi)</button>
		</article>
	{:else if giro && testo && (fase === 'domanda' || fase === 'testo')}
		<article class="scene">
			{#if giro.budget > 0}
				<div class="timer"><div class="bar" class:late={fuoriTempo} style="width:{Math.min(100, (elapsed / giro.budget) * 100)}%"></div></div>
				<p class="clock" class:late={fuoriTempo}>{fuoriTempo ? `⏰ fuori tempo +${Math.ceil(elapsed - giro.budget)}s` : `⏱️ ${Math.ceil(restante)}s`}</p>
			{:else}
				<p class="clock">⏱️ {fmt(elapsed)}</p>
			{/if}
			<p class="lbl">❓ Domanda — cosa cerchi?</p>
			<p class="q"><FuriganaText text={examStrip(testo.domanda)} force={true} /></p>
			{#if fase === 'domanda'}
				<ul class="opts-preview">
					{#each giro.q.choices as c, i (i)}<li><FuriganaText text={examStrip(c)} force={true} /></li>{/each}
				</ul>
				<p class="tip">💡 {TECNICA[giro.slug].tip}</p>
				<button class="proceed" onclick={() => (fase = 'testo')}>📖 Mostra il testo</button>
			{:else}
				<div class="text">
					{#if testo.scena}<p class="scena">〔{testo.scena}〕</p>{/if}
					{#each frasi(testo.corpo) as f, i (i)}<span class="f"><FuriganaText text={examStrip(f)} force={true} /></span>{/each}
				</div>
				<div class="choices">
					{#each giro.q.choices as c, i (i)}
						<button class="choice" onclick={() => rispondi(i)}><FuriganaText text={examStrip(c)} force={true} /></button>
					{/each}
				</div>
			{/if}
		</article>
	{:else if giro && testo && fase === 'revisione'}
		{@const ok = giro.scelta === giro.q.correct}
		{@const prova = frasePerProva(testo.corpo, giro.q.perche_giusta)}
		{@const v = cpm(caratteri(testo.corpo), giro.secondi)}
		<article class="scene">
			<p class="who">{ok ? '✅ Giusto' : '❌ Sbagliato'} · {Math.round(giro.secondi)}s{giro.budget > 0 ? ` / ${giro.budget}s` : ''} {giro.budget > 0 ? (inTempo(giro) ? '· in tempo' : '· ⏰ fuori tempo') : ''}</p>
			<p class="hint">Velocità: {v} caratteri/minuto</p>
			<p class="ans">✅ <FuriganaText text={examStrip(giro.q.choices[giro.q.correct] ?? '')} force={true} /></p>
			{#if !ok && giro.scelta !== null}<p class="ans bad">✗ la tua: <FuriganaText text={examStrip(giro.q.choices[giro.scelta] ?? '')} force={true} /></p>{/if}
			{#if giro.q.perche_giusta}<p class="why">{giro.q.perche_giusta}</p>{/if}
			<p class="lbl">📄 Il testo {prova >= 0 ? '— in giallo dove sta la risposta' : ''} (tocca le parole)</p>
			<div class="text">
				{#if testo.scena}<p class="scena">〔{testo.scena}〕</p>{/if}
				{#each frasi(testo.corpo) as f, i (i)}<span class="f" class:prova={i === prova}><InteractiveSentence text={f} /></span>{/each}
			</div>
			{#if giro.q.traduzione}<p class="tr">🇮🇹 {giro.q.traduzione}</p>{/if}
			<button class="proceed" onclick={avanti}>{idx < giri.length - 1 ? 'Prossimo →' : 'Risultato →'}</button>
		</article>
	{:else if fase === 'fine'}
		<article class="scene">
			<p class="who">{giustiInTempo === giri.length ? '🎉 Lettura d’esame!' : '📝 Risultato'}</p>
			<div class="scores">
				<div><span class="big">{giusti}/{giri.length}</span><small>giuste</small></div>
				{#if ritmo !== 'libero'}<div><span class="big">{giustiInTempo}/{giri.length}</span><small>giuste in tempo</small></div>{/if}
				<div><span class="big">{velocita}</span><small>caratteri/min</small></div>
			</div>
			{#if best > 0}<p class="hint">Record: {best} car/min</p>{/if}
			<div class="recap">
				{#each giri as g, i (i)}
					<p class:ok={g.scelta === g.q.correct}>{g.scelta === g.q.correct ? '✅' : '❌'} {TECNICA[g.slug].jp} · {Math.round(g.secondi)}s{g.budget > 0 ? `/${g.budget}s` : ''}</p>
				{/each}
			</div>
			<div class="row">
				<button class="proceed" onclick={start}>🎲 Altri {ROUNDS}</button>
				<button class="mini" onclick={() => (fase = 'start')}>Impostazioni</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.lv { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.scene { background: var(--surface); border-radius: 16px; padding: 18px; box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); display: grid; gap: 12px; }
	.scene p { margin: 0; }
	.lbl { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
	.hint { font-size: 0.82rem; color: var(--muted); text-align: center; }
	.who { font-weight: 700; }
	.pills { display: flex; flex-wrap: wrap; gap: 6px; }
	.pills button { border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); border-radius: 999px; padding: 6px 12px; font-size: 0.85rem; cursor: pointer; }
	.pills button.on { border-color: var(--brand); background: var(--brand); color: #fff; }
	.tips { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.85rem; }
	.timer { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
	.timer .bar { height: 100%; background: var(--brand); transition: width 0.2s linear; }
	.timer .bar.late { background: var(--danger); }
	.clock { text-align: right; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.clock.late { color: var(--danger); }
	.q { font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 10px; padding: 10px; }
	.opts-preview { margin: 0; padding-left: 20px; display: grid; gap: 3px; font-size: 0.95rem; color: var(--muted); }
	.tip { font-size: 0.85rem; background: var(--info-bg); color: var(--info-ink); border-radius: 8px; padding: 7px 10px; }
	.text { font-size: 1.08rem; line-height: 2; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--bg); }
	.scena { font-size: 0.8rem; color: var(--muted); }
	.f.prova { background: var(--warn-bg); color: var(--warn-ink); border-radius: 4px; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 11px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1rem; cursor: pointer; text-align: left; }
	.choice:hover { border-color: var(--brand); }
	.ans { font-size: 1.05rem; color: var(--success); }
	.ans.bad { color: var(--danger); }
	.why { font-size: 0.88rem; }
	.tr { font-size: 0.85rem; color: var(--muted); }
	.scores { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; }
	.scores div { display: grid; text-align: center; }
	.big { font-size: 1.8rem; font-weight: 800; }
	.scores small { color: var(--muted); font-size: 0.78rem; }
	.recap { display: grid; gap: 3px; font-size: 0.85rem; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.6; cursor: default; }
</style>
