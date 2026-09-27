<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadN4Readiness, loadMondaiMastery, type N4Readiness } from '$lib/db/queries';
	import { findMondai } from '$lib/data/esame-n4';
	import { db } from '$lib/db/schema';
	import { appState } from '$lib/stores.svelte';

	let readiness = $state<N4Readiness | null>(null);
	let mastery = $state<Record<string, number>>({});
	let loading = $state(true);
	let deadlineOn = $state(false);

	async function toggleDeadline() {
		if (!appState.settings) return;
		deadlineOn = !deadlineOn;
		const updated = {
			...$state.snapshot(appState.settings),
			esame_scadenza: deadlineOn ? new Date('2026-12-06T00:00:00').getTime() : undefined,
			updated_at: Date.now()
		};
		await db.app_settings.put(updated);
		appState.settings = updated;
	}

	interface StoricoItem { t: number; giuste: number; totali: number; ll: number; as: number; pass: boolean }
	let storico = $state<StoricoItem[]>([]);

	onMount(async () => {
		try {
			const raw = localStorage.getItem('esame:storico:v1');
			if (raw) storico = JSON.parse(raw);
		} catch {
			storico = [];
		}
		readiness = await loadN4Readiness();
		mastery = await loadMondaiMastery();
		deadlineOn = !!appState.settings?.esame_scadenza;
		loading = false;
	});

	// JLPT dicembre 2026 (di norma la 1ª domenica di dicembre). Approssimato.
	const EXAM_DATE = new Date('2026-12-06T00:00:00');
	const daysLeft = Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000));
	// Elementi N4 ancora da padroneggiare e ritmo/giorno per coprirli in tempo.
	const rimasti = $derived(
		readiness
			? readiness.kanji.total - readiness.kanji.done +
					(readiness.words.total - readiness.words.done) +
					(readiness.grammar.total - readiness.grammar.done)
			: 0
	);
	const perGiorno = $derived(daysLeft > 0 ? Math.ceil(rimasti / daysLeft) : rimasti);

	const pct = (p: { done: number; total: number }) => (p.total ? Math.round((p.done / p.total) * 100) : 0);
	// Prontezza globale: media pesata sul numero di elementi delle tre aree.
	const overall = $derived.by(() => {
		if (!readiness) return 0;
		const parts = [readiness.kanji, readiness.words, readiness.grammar];
		const done = parts.reduce((n, p) => n + p.done, 0);
		const tot = parts.reduce((n, p) => n + p.total, 0);
		return tot ? Math.round((done / tot) * 100) : 0;
	});
	function barClass(p: number): string {
		if (p < 40) return 'low';
		if (p < 70) return 'mid';
		return 'ok';
	}
	const covCards = $derived(
		readiness
			? [
					{ titolo: '漢 Kanji N4', part: readiness.kanji, href: 'quiz?ripasso=n4-kanji' },
					{ titolo: '📦 Parole N4', part: readiness.words, href: 'quiz?ripasso=n4-word' },
					{ titolo: '📖 Grammatica N4', part: readiness.grammar, href: 'quiz?ripasso=n4-grammar' }
				]
			: []
	);

	// 問題 più deboli (padronanza più bassa tra quelli provati).
	const deboli = $derived.by(() => {
		return Object.entries(mastery)
			.map(([slug, p]) => ({ slug, p, label: findMondai(slug)?.mondai.titolo_jp ?? slug }))
			.sort((a, b) => a.p - b.p)
			.slice(0, 5);
	});

	function fmtDate(t: number): string {
		const d = new Date(t);
		return `${d.getDate()}/${d.getMonth() + 1}`;
	}
</script>

<div class="pronto">
	<a class="back" href="{base}/esame">← Esame N4</a>
	<h1 class="page-title">📊 Pronto per l'N4?</h1>
	<p class="page-sub">Quanto sei coperto su kanji, parole e grammatica N4, dove sei debole e come vanno le prove.</p>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<section class="overall">
			<div class="ov-ring" style="--p:{overall}">
				<span class="ov-num">{overall}%</span>
			</div>
			<div class="ov-txt">
				<strong>Prontezza complessiva</strong>
				<span class="muted">padronanza media su kanji + parole + grammatica N4</span>
			</div>
		</section>

		<section class="countdown">
			<div class="cd-days"><strong>{daysLeft}</strong> <span>giorni all'esame</span></div>
			<div class="cd-plan">
				{#if rimasti > 0 && daysLeft > 0}
					Per coprire l'N4 in tempo: ~<strong>{perGiorno}</strong> elementi/giorno (kanji+parole+grammatica ancora da padroneggiare: {rimasti}).
				{:else if rimasti === 0}
					Copertura N4 completa 🎉 — ora consolida e fai prove.
				{:else}
					Esame passato o data non valida.
				{/if}
			</div>
			<label class="cd-toggle">
				<input type="checkbox" checked={deadlineOn} onchange={toggleDeadline} />
				🎯 Punta all'esame: comprimi i ripassi SRS verso dicembre (più esposizioni prima della data)
			</label>
		</section>

		<section class="cards">
			{#each covCards as c (c.titolo)}
				{@const p = pct(c.part)}
				<a class="cov-card" href="{base}/{c.href}">
					<div class="cc-top"><span class="cc-title">{c.titolo}</span><span class="cc-num">{c.part.done}/{c.part.total}</span></div>
					<div class="bar"><div class="bar-fill {barClass(p)}" style="width:{p}%"></div></div>
					<span class="cc-pct">{p}% padroneggiato · ripassa →</span>
				</a>
			{/each}
		</section>

		<section class="block">
			<h2 class="sec-title">🎯 I tuoi 問題 più deboli</h2>
			{#if deboli.length === 0}
				<p class="muted">Ancora nessun dato. Fai una <a href="{base}/esame/prova">prova simulata</a> per scoprirli.</p>
			{:else}
				<div class="weak-list">
					{#each deboli as w (w.slug)}
						<a class="weak-row" href="{base}/esame/{w.slug}">
							<span class="w-label">{w.label}</span>
							<span class="w-pct" class:low={w.p < 40}>{w.p}%</span>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<section class="block">
			<h2 class="sec-title">📈 Storico prove</h2>
			{#if storico.length === 0}
				<p class="muted">Nessuna prova ancora. <a href="{base}/esame/prova">Iniziane una →</a></p>
			{:else}
				<div class="storico">
					{#each storico.slice(-8) as s (s.t)}
						<div class="st-row" class:pass={s.pass}>
							<span class="st-date">{fmtDate(s.t)}</span>
							<span class="st-score">{s.giuste}/{s.totali}</span>
							<span class="st-pts">~{s.ll + s.as}/180 {s.pass ? '🎉' : ''}</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div class="cta-row">
			<a class="cta primary" href="{base}/esame/prova">▶️ Prova simulata</a>
			<a class="cta ghost" href="{base}/punti-deboli?kind=mondai">💪 Punti deboli d'esame</a>
		</div>
	{/if}
</div>

<style>
	.pronto { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.muted { color: var(--muted); }

	.overall { display: flex; align-items: center; gap: 14px; }
	.ov-ring {
		position: relative;
		width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0;
		background: conic-gradient(var(--brand) calc(var(--p) * 1%), var(--line) 0);
		display: grid; place-items: center;
	}
	.ov-ring::before { content: ''; position: absolute; inset: 11px; border-radius: 50%; background: var(--bg); }
	.ov-num { position: relative; font-weight: 800; font-size: 1.1rem; }
	.ov-txt { display: grid; gap: 2px; }

	.countdown { display: grid; gap: 4px; border: 1px solid var(--brand); border-radius: 12px; background: var(--info-bg); padding: 12px; }
	.cd-days { font-size: 0.95rem; }
	.cd-days strong { font-size: 1.4rem; color: var(--brand); }
	.cd-plan { font-size: 0.82rem; color: var(--ink); }
	.cd-toggle { display: flex; gap: 8px; align-items: flex-start; font-size: 0.8rem; margin-top: 4px; cursor: pointer; }

	.cards { display: grid; gap: 8px; }
	.cov-card { display: grid; gap: 6px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; text-decoration: none; color: var(--ink); }
	.cov-card:hover { border-color: var(--brand); }
	.cc-top { display: flex; justify-content: space-between; align-items: baseline; }
	.cc-title { font-weight: 700; }
	.cc-num { font-size: 0.85rem; color: var(--muted); }
	.bar { height: 10px; border-radius: 999px; background: var(--line); overflow: hidden; }
	.bar-fill { height: 100%; border-radius: 999px; }
	.bar-fill.low { background: var(--danger); }
	.bar-fill.mid { background: var(--warn-ink); }
	.bar-fill.ok { background: var(--success); }
	.cc-pct { font-size: 0.75rem; color: var(--muted); }

	.block { display: grid; gap: 6px; }
	.sec-title { margin: 4px 0 0; font-size: 1.05rem; }
	.weak-list { display: grid; gap: 6px; }
	.weak-row { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 8px 12px; text-decoration: none; color: var(--ink); }
	.weak-row:hover { border-color: var(--brand); }
	.w-label { font-weight: 600; }
	.w-pct { font-size: 0.82rem; font-weight: 700; color: var(--warn-ink); background: var(--warn-bg); border-radius: 999px; padding: 2px 9px; }
	.w-pct.low { color: var(--danger); background: var(--danger-bg); }

	.storico { display: grid; gap: 4px; }
	.st-row { display: flex; gap: 10px; align-items: baseline; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; font-size: 0.82rem; background: var(--surface); }
	.st-row.pass { border-color: var(--success); }
	.st-date { color: var(--muted); min-width: 44px; }
	.st-score { font-weight: 700; }
	.st-pts { margin-left: auto; color: var(--muted); }

	.cta-row { display: flex; flex-wrap: wrap; gap: 8px; }
	.cta { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 0.9rem; }
	.cta.primary { background: var(--brand); color: #fff; }
	.cta.ghost { border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
</style>
