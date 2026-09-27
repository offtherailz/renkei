<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		EXAM_N4_SECTIONS,
		EXAM_N4_HOT_POINTS,
		EXAM_N4_SCORING,
		MONDAI_GIOCHI_UTILI,
		findMondai,
		totalQuestions,
		type ExamSectionId
	} from '$lib/data/esame-n4';
	import { loadMondaiMastery } from '$lib/db/queries';
	import { countByMondai, examActiveMinutes } from '$lib/data/esame-n4-prova';
	import TimeClock from '$lib/components/TimeClock.svelte';

	let mastery = $state<Record<string, number>>({});
	let loading = $state(true);
	let openTips = $state<Record<string, boolean>>({});
	// Prova sospesa (salvata in localStorage da /esame/prova): la segnaliamo qui.
	let pending = $state<{ sez: number; tot: number; date: number; mode: string } | null>(null);

	onMount(async () => {
		try {
			const raw = localStorage.getItem('esame:prova:v1');
			if (raw) {
				const s = JSON.parse(raw);
				pending = {
					sez: (s.secIndex ?? 0) + 1,
					tot: s.mock?.sezioni?.length ?? 0,
					date: (s.answers ?? []).filter((a: { answered?: boolean }) => a.answered).length,
					mode: s.mode === 'honban' ? '本番' : '練習'
				};
			}
		} catch {
			pending = null;
		}
		mastery = await loadMondaiMastery();
		loading = false;
	});

	function toggleTip(slug: string) {
		openTips[slug] = !openTips[slug];
	}

	function pctClass(p: number): string {
		if (p < 30) return 'low';
		if (p < 60) return 'mid';
		return 'ok';
	}

	const total = totalQuestions();
	const esempiCount = countByMondai();
	const examTotalMin = examActiveMinutes();
	function groupMin(count: number, tempoSec: number): number {
		return Math.max(1, Math.round((count * tempoSec) / 60));
	}

	// Punti INDICATIVI (il JLPT usa punteggio scalato IRT, senza punti fissi per
	// domanda): stima = massimo del gruppo / numero domande del gruppo di punteggio.
	function scoreGroupQ(sezioni: ExamSectionId[]): number {
		return EXAM_N4_SECTIONS.filter((s) => sezioni.includes(s.id))
			.flatMap((s) => s.mondai)
			.reduce((n, m) => n + m.count, 0);
	}
	const qLingua = scoreGroupQ(EXAM_N4_SCORING.linguaLettura.sezioni);
	const qAscolto = scoreGroupQ(EXAM_N4_SCORING.ascolto.sezioni);
	function ptPerDomanda(sez: ExamSectionId): number {
		return EXAM_N4_SCORING.ascolto.sezioni.includes(sez)
			? EXAM_N4_SCORING.ascolto.max / qAscolto
			: EXAM_N4_SCORING.linguaLettura.max / qLingua;
	}

	// Da slug 問題 al suo titolo giapponese leggibile (per i chip «dove si allena»).
	function mondaiLabel(slug: string): string {
		return findMondai(slug)?.mondai.titolo_jp ?? slug;
	}
</script>

<div class="esame">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">🎯 Esame JLPT N4</h1>
	<p class="page-sub">
		Preparazione mirata alla prova reale: {EXAM_N4_SECTIONS.length} sezioni, {total} domande.
		Ogni tipo di domanda (問題) ha il suo ritmo, i trucchi dell'insegnante e — dopo la risposta —
		la spiegazione del perché.
	</p>

	{#if pending}
		<a class="resume-banner" href="{base}/esame/prova">
			<span class="rb-icon">📝</span>
			<span class="rb-body">
				<strong>Hai una prova in sospeso — riprendi</strong>
				<span class="rb-sub">Sezione {pending.sez}/{pending.tot} · {pending.date} risposte date · modalità {pending.mode}</span>
			</span>
			<span class="rb-go">▶︎</span>
		</a>
	{/if}

	<h2 class="block-title">Fai una prova</h2>
	<div class="prove-grid">
		<a class="prova-card" href="{base}/esame/prova?tipo=esami">
			<span class="pc-icon">📄</span>
			<span class="pc-label">Esami completi</span>
			<span class="pc-sub">Prove intere ai numeri reali (fisse o casuale)</span>
		</a>
		<a class="prova-card" href="{base}/esame/prova?tipo=mini">
			<span class="pc-icon">🧩</span>
			<span class="pc-label">Mini esami</span>
			<span class="pc-sub">Pochi item, ma di tutti i tipi</span>
		</a>
		<a class="prova-card" href="{base}/esame/prova?tipo=continua">
			<span class="pc-icon">♾️</span>
			<span class="pc-label">Continua</span>
			<span class="pc-sub">Domande random, senza timer</span>
		</a>
		<a class="prova-card" href="{base}/esame/prova?tipo=deboli">
			<span class="pc-icon">🎯</span>
			<span class="pc-label">Punti deboli</span>
			<span class="pc-sub">Le tipologie dove vai peggio</span>
		</a>
	</div>
	<div class="cta-row">
		<a class="cta ghost" href="{base}/esame/pronto">📊 Pronto per l'N4?</a>
		<a class="cta ghost" href="{base}/punti-deboli?kind=mondai">💪 I miei punti deboli d'esame</a>
	</div>
	<p class="score-note">
		Punteggio: {EXAM_N4_SCORING.linguaLettura.max} (lingua+lettura, min {EXAM_N4_SCORING.linguaLettura.minimo}) + {EXAM_N4_SCORING.ascolto.max} (ascolto, min {EXAM_N4_SCORING.ascolto.minimo}), si passa con ≥ {EXAM_N4_SCORING.totaleMinimo}/{EXAM_N4_SCORING.totaleMax}. Il JLPT usa punteggio <strong>scalato (IRT)</strong>: non ci sono punti fissi per domanda.
	</p>

	<h2 class="block-title">Allena per tipo (問題)</h2>
	<p class="block-sub">Ogni tipo di domanda, col ritmo consigliato, il trucco e la tua padronanza (%). Tocca «Esercitati» per allenare solo quel tipo.</p>
	{#each EXAM_N4_SECTIONS as sec (sec.id)}
		<section class="sec">
			<header class="sec-head">
				<span class="sec-jp">{sec.titolo_jp}</span>
				<span class="sec-it">{sec.titolo_it}</span>
				<span class="sec-time">⏱️ {sec.tempo_sezione_min} min</span>
			</header>
			<div class="mondai-list">
				{#each sec.mondai as m (m.slug)}
					{@const p = mastery[m.slug]}
					<article class="mondai">
						<div class="m-clock" title="verde: tutta la prova · rosso: questo gruppo">
							<TimeClock total={120} green={examTotalMin} red={groupMin(m.count, m.tempo_medio_sec)} size={44} />
							<span class="m-clock-cap">{groupMin(m.count, m.tempo_medio_sec)}m</span>
						</div>
						<div class="m-body">
						<div class="m-top">
							<span class="m-num">問題{m.numero}</span>
							<span class="m-jp">{m.titolo_jp}</span>
							<span class="m-it">{m.titolo_it}</span>
							{#if !loading && typeof p === 'number'}
								<span class="m-pct {pctClass(p)}">{p}%</span>
							{/if}
						</div>
						<p class="m-tipo">{m.tipo}</p>
						<div class="m-meta">
							<span class="badge">✏️ {m.count} domande</span>
							<span class="badge">⏱️ ~{m.tempo_medio_sec}s/domanda</span>
							<span class="badge">⌛ ~{groupMin(m.count, m.tempo_medio_sec)} min gruppo</span>
							<span class="badge">🎯 ~{ptPerDomanda(sec.id).toFixed(1)} pt/dom · {Math.round(ptPerDomanda(sec.id) * m.count)} pt gruppo</span>
							<button class="tip-btn" onclick={() => toggleTip(m.slug)} title="Trucco">
								💡 {openTips[m.slug] ? '▲' : '▼'}
							</button>
						</div>
						{#if openTips[m.slug]}
							<p class="m-tip">{m.suggerimento}</p>
						{/if}
						{#if MONDAI_GIOCHI_UTILI[m.slug]?.length}
							<div class="m-giochi">
								<span class="mg-label">Allenati:</span>
								{#each MONDAI_GIOCHI_UTILI[m.slug] as g (g.href)}
									<a class="mg-chip" href="{base}/{g.href}">{g.label}</a>
								{/each}
							</div>
						{/if}
						{#if esempiCount[m.slug]}
							<a class="m-drill" href="{base}/esame/{m.slug}">▶️ Esercitati <small>{esempiCount[m.slug]} esempi</small></a>
						{:else}
							<span class="m-drill prep">In preparazione</span>
						{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/each}

	<section class="games">
		<h2 class="hot-title">🎮 Mini-giochi mirati</h2>
		<div class="game-cards">
			<a class="game-card" href="{base}/esame/gioco/juju">
				<span class="gc-icon">🎁</span>
				<span class="gc-label">Direzione del favore</span>
				<span class="gc-sub">授受 · あげる/くれる/もらう</span>
			</a>
			<a class="game-card" href="{base}/esame/gioco/joken">
				<span class="gc-icon">🔀</span>
				<span class="gc-label">Condizionali</span>
				<span class="gc-sub">と / ば / たら / なら</span>
			</a>
		</div>
	</section>

	<section class="hot">
		<h2 class="hot-title">🔥 Punti caldi ricorrenti N4</h2>
		<p class="hot-sub">Gli argomenti che tornano più spesso nella prova. Tocca un trucco: spiegazione, esempi, mini-quiz e drill collegato.</p>
		<ul class="hot-list">
			{#each EXAM_N4_HOT_POINTS as h (h.id)}
				<li>
					<a class="hot-row" href="{base}/esame/trucco/{h.id}">
						<span class="hot-label">💡 {h.label}</span>
						<span class="hot-where">Si allena in: {h.mondai.map(mondaiLabel).join(' · ')} →</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.esame { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }

	.block-title { margin: 8px 0 0; font-size: 1.1rem; }
	.block-sub { margin: 0; font-size: 0.8rem; color: var(--muted); }
	.prove-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.prova-card { display: grid; gap: 2px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); text-decoration: none; color: var(--ink); }
	.prova-card:hover { border-color: var(--brand); }
	.pc-icon { font-size: 1.4rem; }
	.pc-label { font-weight: 700; font-size: 0.95rem; }
	.pc-sub { font-size: 0.72rem; color: var(--muted); }
	.cta-row { display: flex; flex-wrap: wrap; gap: 8px; }
	.cta { display: inline-flex; align-items: baseline; gap: 6px; padding: 10px 14px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 0.9rem; }
	.cta.primary { background: var(--brand); color: #fff; }
	.cta.ghost { border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
	.cta.ghost:hover { border-color: var(--brand); }
	.score-note { margin: 0; font-size: 0.76rem; color: var(--muted); }
	.resume-banner { display: flex; align-items: center; gap: 10px; border: 2px solid var(--brand); border-radius: 12px; background: var(--info-bg); padding: 12px; text-decoration: none; color: var(--ink); }
	.rb-icon { font-size: 1.3rem; }
	.rb-body { display: grid; gap: 2px; flex: 1; }
	.rb-sub { font-size: 0.78rem; color: var(--muted); }
	.rb-go { color: var(--brand); font-weight: 800; }

	.sec { display: grid; gap: 8px; }
	.sec-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; border-bottom: 2px solid var(--line); padding-bottom: 4px; }
	.sec-jp { font-size: 1.05rem; font-weight: 800; }
	.sec-it { font-size: 0.82rem; color: var(--muted); }
	.sec-time { margin-left: auto; font-size: 0.8rem; color: var(--muted); }

	.mondai-list { display: grid; gap: 8px; }
	.mondai { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 10px 12px; display: flex; gap: 10px; align-items: flex-start; }
	.m-clock { display: grid; justify-items: center; gap: 2px; flex-shrink: 0; }
	.m-clock-cap { font-size: 0.68rem; color: var(--muted); font-weight: 700; }
	.m-body { flex: 1; min-width: 0; display: grid; gap: 6px; }
	.m-top { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
	.m-num { font-size: 0.72rem; font-weight: 700; color: var(--muted); }
	.m-jp { font-size: 1rem; font-weight: 700; }
	.m-it { font-size: 0.82rem; color: var(--muted); }
	.m-pct { margin-left: auto; font-size: 0.8rem; font-weight: 700; border-radius: 999px; padding: 2px 9px; }
	.m-pct.low { color: var(--danger); background: var(--danger-bg); }
	.m-pct.mid { color: var(--warn-ink); background: var(--warn-bg); }
	.m-pct.ok { color: var(--ok-ink); background: var(--ok-bg); }
	.m-tipo { margin: 0; font-size: 0.85rem; }
	.m-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.badge { font-size: 0.72rem; color: var(--muted); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; }
	.tip-btn { font-size: 0.72rem; line-height: 1; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 3px 7px; cursor: pointer; }
	.tip-btn:hover { border-color: var(--brand); }
	.m-tip { margin: 0; font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 8px 10px; }
	.m-giochi { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.mg-label { font-size: 0.72rem; color: var(--muted); }
	.mg-chip { font-size: 0.75rem; text-decoration: none; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; background: var(--bg); }
	.mg-chip:hover { border-color: var(--brand); }
	.m-drill { justify-self: start; font-size: 0.85rem; font-weight: 700; text-decoration: none; color: #fff; background: var(--brand); border-radius: 999px; padding: 6px 14px; }
	.m-drill small { font-weight: 400; opacity: 0.9; }
	.m-drill.prep { background: var(--surface); color: var(--muted); border: 1px dashed var(--line); font-weight: 400; }

	.games { display: grid; gap: 6px; margin-top: 6px; }
	.game-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.game-card { display: grid; gap: 2px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); text-decoration: none; color: var(--ink); }
	.game-card:hover { border-color: var(--brand); }
	.gc-icon { font-size: 1.4rem; }
	.gc-label { font-weight: 700; font-size: 0.95rem; }
	.gc-sub { font-size: 0.72rem; color: var(--muted); }

	.hot { display: grid; gap: 6px; margin-top: 6px; }
	.hot-title { margin: 0; font-size: 1.05rem; }
	.hot-sub { margin: 0; font-size: 0.8rem; color: var(--muted); }
	.hot-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.hot-row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 8px 10px; text-decoration: none; color: var(--ink); }
	.hot-row:hover { border-color: var(--brand); }
	.hot-label { font-size: 0.9rem; font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
	.hot-where { font-size: 0.72rem; color: var(--muted); min-width: 0; overflow-wrap: anywhere; }
</style>
