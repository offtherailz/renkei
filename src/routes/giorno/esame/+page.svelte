<script lang="ts">
	// Modalità esame: una sezione del JLPT N4, a tempo, senza città. Le risposte
	// contano per il ripasso (come nella giornata); il risultato si vede alla fine.
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import { speakSentenceJapaneseAsync, stopSpeaking } from '$lib/core/tts';
	import { voiceParams } from '$lib/core/voices';
	import { db } from '$lib/db/schema';
	import {
		EXAM_SECTIONS, examSet, examTime, recordResult, seeded,
		type BankItem, type ExamSection, type Progress
	} from '$lib/game/giorno';

	let bank = $state<BankItem[]>([]);
	let prog = $state.raw<Progress>({});
	let dayNo = 0;
	let loading = $state(true);

	let section = $state<ExamSection>('moji');
	let quante = $state(20);
	let phase = $state<'setup' | 'run' | 'end'>('setup');
	let items = $state<BankItem[]>([]);
	let idx = $state(0);
	let answers = $state<(number | null)[]>([]);
	let left = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;
	let playing = $state(false);

	const ASCOLTO = ['kadai', 'point', 'hatsuwa', 'sokuji'];
	const soloVoce = (b: BankItem) => b.tipo === 'hatsuwa' || b.tipo === 'sokuji';
	const NUM = ['いち', 'に', 'さん', 'よん'];
	const disponibili = (s: ExamSection) => bank.filter((b) => EXAM_SECTIONS[s].tipi.includes(b.tipo)).length;
	const cur = $derived(items[idx]);
	const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	function saveProg(): void {
		try {
			localStorage.setItem('renkei_giorno_prog', JSON.stringify({ prog, dayNo }));
		} catch {
			/* niente storage */
		}
	}

	function start(): void {
		items = examSet(bank, prog, dayNo, section, quante, seeded(Date.now() % 1e9));
		answers = items.map(() => null);
		idx = 0;
		left = examTime(items);
		phase = 'run';
		timer = setInterval(() => {
			left -= 1;
			if (left <= 0) finish();
		}, 1000);
		if (cur && ASCOLTO.includes(cur.tipo)) void play(cur);
	}
	function finish(): void {
		if (timer) clearInterval(timer);
		timer = null;
		stopSpeaking();
		// le risposte contano per il ripasso; le non date valgono come sbagliate
		items.forEach((b, i) => (prog = recordResult(prog, b.id, answers[i] === b.risposta, dayNo)));
		saveProg();
		phase = 'end';
	}
	function choose(i: number): void {
		answers[idx] = i;
	}
	function go(d: number): void {
		stopSpeaking();
		playing = false;
		idx = Math.max(0, Math.min(items.length - 1, idx + d));
		if (ASCOLTO.includes(items[idx]!.tipo) && answers[idx] === null) void play(items[idx]!);
	}
	async function play(b: BankItem): Promise<void> {
		stopSpeaking();
		playing = true;
		const voce = b.voce ?? (b.righe.find((r) => r.who !== 'N')?.who === 'M' ? 'F' : 'M');
		const righe = [...b.righe, ...(soloVoce(b) ? b.opzioni.map((o, i) => ({ who: voce, ja: `${NUM[i]}、${o.ja}`, it: '' })) : [])];
		for (const r of righe) {
			if (!playing) return;
			await speakSentenceJapaneseAsync(r.ja, { ...voiceParams(r.who === 'M' ? 'maschile' : 'femminile'), waitMs: 20000 });
		}
		playing = false;
	}

	const score = $derived(items.filter((b, i) => answers[i] === b.risposta).length);
	const perTipo = $derived(
		Object.entries(
			items.reduce<Record<string, { ok: number; tot: number }>>((acc, b, i) => {
				const s = (acc[b.tipo] ??= { ok: 0, tot: 0 });
				s.tot += 1;
				if (answers[i] === b.risposta) s.ok += 1;
				return acc;
			}, {})
		)
	);
	const TIPO_IT: Record<string, string> = { moji: 'Kanji', goi: 'Parole', bunpou: 'Grammatica', dokkai: 'Lettura', kadai: 'Cosa si fa', point: 'Il punto', hatsuwa: 'Cosa dici', sokuji: 'Risposta rapida' };

	onMount(async () => {
		try {
			const raw = JSON.parse(localStorage.getItem('renkei_giorno_prog') ?? 'null') as { prog: Progress; dayNo: number } | null;
			if (raw) ({ prog, dayNo } = raw);
		} catch {
			/* niente storage */
		}
		const rows = await db.course_giorno.toArray().catch(() => []);
		bank = rows.map(({ corso_id: _c, updated_at: _u, ...b }) => b);
		loading = false;
	});
	onDestroy(() => {
		if (timer) clearInterval(timer);
		stopSpeaking();
	});
</script>

<svelte:head><title>Modalità esame</title></svelte:head>

<div class="wrap">
	<a class="back" href="{base}/giorno">← Un giorno in Giappone</a>
	<h1>⏱️ Modalità esame</h1>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if !bank.length}
		<p>Nessuna domanda caricata: caricale dalla schermata iniziale del gioco (📥 Carica le prove d'esame).</p>
	{:else if phase === 'setup'}
		<p class="muted">Una sezione alla volta, a tempo, come al JLPT. Il risultato si vede alla fine; le risposte contano per il ripasso.</p>
		<div class="sezioni">
			{#each Object.entries(EXAM_SECTIONS) as [k, s] (k)}
				<label class:on={section === k}>
					<input type="radio" name="sez" value={k} bind:group={section} />
					<span>{s.label}</span><small>{disponibili(k as ExamSection)} domande</small>
				</label>
			{/each}
		</div>
		<label class="n">Domande: <input type="number" min="5" max="100" step="5" bind:value={quante} /></label>
		<button class="btn" onclick={start} disabled={!disponibili(section)}>▶ Inizia</button>
	{:else if phase === 'run' && cur}
		<div class="bar">
			<span>{idx + 1}/{items.length}</span>
			<span class:low={left < 60}>⏱️ {mmss(left)}</span>
			<button class="btn ghost small" onclick={finish}>Consegna</button>
		</div>
		<div class="card">
			{#if cur.titolo}<p class="muted small">{cur.titolo}</p>{/if}
			{#if cur.immagine}<img class="pic" src={cur.immagine} alt="" />{/if}
			{#if cur.testo}
				<div class="doc"><p class="doc-head">{cur.testo.titolo}</p><pre class="ja">{cur.testo.ja}</pre></div>
			{/if}
			{#if ASCOLTO.includes(cur.tipo)}
				<button class="btn ghost small" onclick={() => play(cur)}>🔊 {playing ? 'In ascolto…' : 'Riascolta'}</button>
			{:else}
				<p class="ja q">{cur.domanda.ja}</p>
			{/if}
			<div class="opts">
				{#each cur.opzioni as o, i (i)}
					<button class="opt" class:sel={answers[idx] === i} onclick={() => choose(i)}>
						<span class="ja">{i + 1}.{soloVoce(cur) ? '' : ` ${o.ja}`}</span>
					</button>
				{/each}
			</div>
		</div>
		<div class="nav">
			<button class="btn ghost" onclick={() => go(-1)} disabled={idx === 0}>← Indietro</button>
			{#if idx < items.length - 1}
				<button class="btn" onclick={() => go(1)}>Avanti →</button>
			{:else}
				<button class="btn" onclick={finish}>Consegna</button>
			{/if}
		</div>
	{:else if phase === 'end'}
		<p class="score">Risultato: <strong>{score}/{items.length}</strong> ({Math.round((score / items.length) * 100)}%)</p>
		<p class="muted small">All'esame vero per passare serve più o meno il 50-60% per sezione.</p>
		<div class="tipi">{#each perTipo as [t, s] (t)}<span class="chip">{TIPO_IT[t]} {s.ok}/{s.tot}</span>{/each}</div>
		<h2>Da rivedere</h2>
		{#each items as b, i (b.id)}
			{#if answers[i] !== b.risposta}
				<div class="card">
					{#if b.testo}<p class="muted small">「{b.testo.titolo}」</p>{/if}
					<p class="ja q">{b.domanda.ja}</p>
					<p class="small">{answers[i] === null ? '— nessuna risposta' : `✗ ${answers[i]! + 1}. ${b.opzioni[answers[i]!]!.ja}`}</p>
					<p class="small ok">✓ {b.risposta + 1}. {b.opzioni[b.risposta]!.ja}{b.opzioni[b.risposta]!.it ? ` — ${b.opzioni[b.risposta]!.it}` : ''}</p>
					{#if b.domanda.it}<p class="tr">💬 {b.domanda.it}</p>{/if}
					{#if b.completa}<p class="ja small">✅ {b.completa}</p>{/if}
					{#if b.spiega}<p class="tr">💡 {b.spiega}</p>{/if}
					{#if b.righe.length}
						<details><summary class="small">Trascrizione</summary>{#each b.righe as l, j (j)}<p class="small"><span class="ja">{l.ja}</span><br /><span class="tr">{l.it}</span></p>{/each}</details>
					{/if}
				</div>
			{/if}
		{/each}
		<button class="btn" onclick={() => (phase = 'setup')}>↺ Un'altra prova</button>
	{/if}
</div>

<style>
	.wrap { max-width: 760px; width: 100%; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
	h1 { margin: 0; font-size: 1.3rem; }
	h2 { margin: 6px 0 0; font-size: 1.05rem; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.muted { color: var(--muted); margin: 0; }
	.small { font-size: 0.85rem; margin: 0; }
	.sezioni { display: grid; gap: 6px; }
	.sezioni label { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 8px 10px; border: 1px solid #ccd; border-radius: 8px; background: #fff; color: #1d2333; cursor: pointer; }
	.sezioni label.on { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand) inset; }
	.sezioni small { color: #56607a; }
	.n input { width: 5em; font-size: 1rem; }
	.btn { justify-self: start; }
	.bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: 600; }
	.low { color: #c0392b; }
	.card { border: 1px solid #dde; border-radius: 8px; padding: 10px; display: grid; gap: 8px; background: #fff; color: #1d2333; }
	.pic { width: 100%; max-width: 520px; border: 1px solid #ccd; }
	.doc { background: #fbfaf3; border: 1px solid #d9d4bf; padding: 8px; border-radius: 4px; }
	.doc-head { margin: 0 0 4px; font-weight: 700; }
	pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
	.q { font-weight: 600; margin: 0; }
	.opts { display: grid; gap: 6px; }
	.opt { text-align: left; padding: 10px; border: 1px solid #ccd; border-radius: 8px; background: #fff; color: #1d2333; cursor: pointer; font-size: 1rem; }
	.opt.sel { background: #dfe6ff; border-color: var(--brand); }
	.nav { display: flex; justify-content: space-between; }
	.score { font-size: 1.2rem; margin: 0; }
	.tipi { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip { border: 1px solid #ccd; border-radius: 999px; padding: 2px 8px; font-size: 0.85rem; }
	.tr { color: #56607a; font-size: 0.85rem; margin: 0; }
	.ok { color: #2e7d32; }
</style>
