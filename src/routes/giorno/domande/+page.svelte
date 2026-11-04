<script lang="ts">
	// Tutte le domande d'esame del gioco, per guardarle e provarle una a una.
	// Qui le risposte non contano per il ripasso: la rotazione dello studio resta
	// quella della giornata.
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { speakSentenceJapaneseAsync, stopSpeaking } from '$lib/core/tts';
	import { voiceParams } from '$lib/core/voices';
	import type { BankItem, Progress } from '$lib/game/giorno';
	import { db } from '$lib/db/schema';

	let bank = $state<BankItem[]>([]);
	let prog = $state.raw<Progress>({});
	let loading = $state(true);
	let tipo = $state<string>('tutti');
	let fonte = $state<string>('tutte');
	let stato = $state<'tutte' | 'nuove' | 'da rivedere' | 'consolidate'>('tutte');
	let cerca = $state('');
	let aperta = $state<string | null>(null);
	let scelta = $state<Record<string, number>>({});
	let quante = $state(60);

	const TIPI: Record<string, string> = {
		moji: '🈁 Kanji (文字)', goi: '📚 Parole (語彙)', bunpou: '🧩 Grammatica (文法)', dokkai: '📖 Lettura (読解)',
		kadai: '📝 Ascolto: cosa si fa (課題理解)', point: '🤔 Ascolto: il punto (ポイント理解)', hatsuwa: '💬 Cosa dici (発話表現)', sokuji: '⚡ Risposta rapida (即時応答)'
	};
	const fonti = $derived([...new Set(bank.map((b) => b.fonte ?? '—'))].sort());
	const statoDi = (b: BankItem) => {
		const p = prog[b.id];
		if (!p || !p.seen) return 'nuove';
		return p.streak >= 2 ? 'consolidate' : 'da rivedere';
	};
	const filtrate = $derived(
		bank.filter(
			(b) =>
				(tipo === 'tutti' || b.tipo === tipo) &&
				(fonte === 'tutte' || (b.fonte ?? '—') === fonte) &&
				(stato === 'tutte' || statoDi(b) === stato) &&
				(!cerca.trim() || JSON.stringify(b).includes(cerca.trim()))
		)
	);
	const conta = (t: string) => bank.filter((b) => b.tipo === t).length;
	const anteprima = (b: BankItem) => (b.testo?.titolo ? `「${b.testo.titolo}」 ` : '') + (b.domanda.ja || b.righe[0]?.ja || '').replace(/[【】]/g, '');

	async function ascolta(b: BankItem) {
		stopSpeaking();
		const righe = b.righe.length ? b.righe : [{ who: b.voce ?? 'F', ja: b.domanda.ja.replace(/[【】]/g, ''), it: '' }];
		for (const r of righe) await speakSentenceJapaneseAsync(r.ja, { ...voiceParams(r.who === 'M' ? 'maschile' : 'femminile'), waitMs: 20000 });
	}

	onMount(async () => {
		try {
			const raw = JSON.parse(localStorage.getItem('renkei_giorno_prog') ?? 'null') as { prog: Progress } | null;
			if (raw) prog = raw.prog;
		} catch {
			/* niente storage */
		}
		const rows = await db.course_giorno.toArray().catch(() => []);
		bank = rows.map(({ corso_id: _c, updated_at: _u, ...b }) => b);
		loading = false;
	});
</script>

<svelte:head><title>Domande d'esame</title></svelte:head>

<div class="wrap">
	<a class="back" href="{base}/giorno">← Un giorno in Giappone</a>
	<h1>🗂️ Domande d'esame</h1>
	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if !bank.length}
		<p>Nessuna domanda caricata: caricale dalla schermata iniziale del gioco (📥 Carica le prove d'esame).</p>
	{:else}
		<p class="muted">{bank.length} domande. Qui puoi guardarle e provarle: le risposte date qui non cambiano il ripasso della giornata.</p>
		<div class="tipi">
			<button class:on={tipo === 'tutti'} onclick={() => (tipo = 'tutti')}>Tutte ({bank.length})</button>
			{#each Object.entries(TIPI) as [k, v] (k)}
				{#if conta(k)}<button class:on={tipo === k} onclick={() => (tipo = k)}>{v} ({conta(k)})</button>{/if}
			{/each}
		</div>
		<div class="filtri">
			<select bind:value={fonte}>
				<option value="tutte">Tutte le fonti</option>
				{#each fonti as f (f)}<option value={f}>{f}</option>{/each}
			</select>
			<select bind:value={stato}>
				<option value="tutte">Tutte</option>
				<option value="nuove">Mai viste</option>
				<option value="da rivedere">Da rivedere</option>
				<option value="consolidate">Consolidate</option>
			</select>
			<input type="search" placeholder="Cerca (giapponese o italiano)" bind:value={cerca} />
		</div>
		<p class="muted small">{filtrate.length} trovate</p>
		<ul class="lista">
			{#each filtrate.slice(0, quante) as b (b.id)}
				{@const s = statoDi(b)}
				<li>
					<button class="riga" onclick={() => (aperta = aperta === b.id ? null : b.id)}>
						<span class="pill {s.replace(' ', '-')}">{s === 'nuove' ? 'nuova' : s === 'da rivedere' ? 'da rivedere' : '✓'}</span>
						<span class="ja">{anteprima(b)}</span>
						<span class="meta">{TIPI[b.tipo]?.split(' ')[0]} {b.fonte}</span>
					</button>
					{#if aperta === b.id}
						{@const r = scelta[b.id]}
						<div class="card">
							{#if b.titolo}<p class="muted small">{b.titolo}</p>{/if}
							{#if b.intro}<p class="small">{b.intro}</p>{/if}
							{#if b.scena}<p class="small">🖼️ {b.scena}</p>{/if}
							{#if b.testo}
								<div class="doc"><p class="doc-head">{b.testo.titolo}</p><pre class="ja">{b.testo.ja}</pre></div>
							{/if}
							{#if b.righe.length}
								<button class="btn ghost small" onclick={() => ascolta(b)}>🔊 Ascolta</button>
								{#if r !== undefined}
									<div class="script">
										{#each b.righe as l, i (i)}<p><span class="ja">{l.ja}</span><br /><span class="tr">{l.it}</span></p>{/each}
									</div>
								{/if}
							{/if}
							<p class="ja q">{b.domanda.ja}</p>
							<div class="opts">
								{#each b.opzioni as o, i (i)}
									<button
										class="opt"
										class:right={r !== undefined && i === b.risposta}
										class:wrong={r === i && i !== b.risposta}
										disabled={r !== undefined}
										onclick={() => (scelta = { ...scelta, [b.id]: i })}
									>
										<span class="ja">{i + 1}. {o.ja}</span>
										{#if r !== undefined && o.it}<span class="tr">{o.it}</span>{/if}
									</button>
								{/each}
							</div>
							{#if r !== undefined}
								<p class:ok={r === b.risposta} class:ko={r !== b.risposta}>{r === b.risposta ? '✓ Giusto!' : `✗ Era la ${b.risposta + 1}.`}</p>
								{#if b.domanda.it}<p class="tr">💬 {b.domanda.it}</p>{/if}
								{#if b.completa}<p class="ja">✅ {b.completa}</p>{/if}
								{#if b.spiega}<p class="tr">💡 {b.spiega}</p>{/if}
								{#if b.testo?.it}<p class="tr">📖 {b.testo.it}</p>{/if}
								<button class="btn ghost small" onclick={() => { const { [b.id]: _x, ...rest } = scelta; scelta = rest; }}>↺ Riprova</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if filtrate.length > quante}<button class="btn ghost" onclick={() => (quante += 60)}>Mostra altre ({filtrate.length - quante})</button>{/if}
	{/if}
</div>

<style>
	.wrap { max-width: 760px; width: 100%; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; min-width: 0; }
	h1 { margin: 0; font-size: 1.3rem; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.muted { color: var(--muted); margin: 0; }
	.small { font-size: 0.85rem; }
	.tipi { display: flex; flex-wrap: wrap; gap: 6px; }
	.tipi button { border: 1px solid var(--border, #ccd); background: var(--surface, #fff); border-radius: 999px; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; }
	.tipi button.on { background: var(--brand); color: #fff; border-color: var(--brand); }
	.filtri { display: flex; flex-wrap: wrap; gap: 6px; }
	.filtri select, .filtri input { font-size: 0.9rem; padding: 4px 6px; flex: 1 1 140px; min-width: 0; }
	.lista li { min-width: 0; }
	.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
	.riga { width: 100%; display: flex; gap: 8px; align-items: baseline; text-align: left; background: #fff; color: #1d2333; border: 1px solid var(--border, #dde); border-radius: 8px; padding: 6px 8px; cursor: pointer; }
	.riga .ja { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.meta { font-size: 0.7rem; color: var(--muted); white-space: nowrap; }
	.pill { font-size: 0.7rem; padding: 0 6px; border-radius: 999px; background: #e6e9f5; white-space: nowrap; }
	.pill.da-rivedere { background: #fde2c8; }
	.pill.consolidate { background: #d4f0d4; }
	.card { border: 1px solid var(--border, #dde); border-top: none; border-radius: 0 0 8px 8px; padding: 10px; display: grid; gap: 8px; background: #fff; color: #1d2333; }
	.doc { background: #fbfaf3; border: 1px solid #d9d4bf; padding: 8px; border-radius: 4px; }
	.doc-head { margin: 0 0 4px; font-weight: 700; }
	pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
	.q { font-weight: 600; margin: 0; }
	.opts { display: grid; gap: 6px; }
	.opt { text-align: left; display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--border, #ccd); border-radius: 8px; background: #fff; color: #1d2333; cursor: pointer; font-size: 0.95rem; }
	.opt:disabled { color: #1d2333; opacity: 1; cursor: default; }
	.opt .tr { color: #56607a; }
	.opt.right { background: #d4f0d4; border-color: #3a9a3a; }
	.opt.wrong { background: #f8d4d6; border-color: #c0392b; }
	.tr { color: var(--muted); font-size: 0.85rem; margin: 0; }
	.ok { color: #2e7d32; margin: 0; font-weight: 600; }
	.ko { color: #c0392b; margin: 0; font-weight: 600; }
	.script p { margin: 4px 0; }
	.btn { justify-self: start; }
</style>
