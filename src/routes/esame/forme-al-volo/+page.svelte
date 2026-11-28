<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapanese, speakSequence } from '$lib/core/tts';
	import { recordGameResult, MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT } from '$lib/core/gameBelts';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import {
		FORMA,
		TE_INDIZIO,
		teTipo,
		costruisciSessioneFV,
		verbiDaParole,
		nomeVariante,
		N_VARIANTI,
		type Registro,
		formaParlata,
		type FormaId,
		type RoundFV,
		type VerboFV
	} from '$lib/core/formeVeloci';
	import type { Word } from '$lib/types/models';

	const ROUNDS = 10;
	type Fase = 'intro' | 'gioco' | 'fine';

	let fase = $state<Fase>('intro');
	let verbi: VerboFV[] = [];
	let pronto = $state(false);
	let veloce = $state(false);
	let rounds = $state<RoundFV[]>([]);
	let idx = $state(0);
	let picked = $state<FormaId | null>(null);
	let score = $state(0);
	let riascolti = $state(0);
	let errori = $state<RoundFV[]>([]);
	// Prima domanda del giro: quale verbo? (si può spegnere)
	let conVerbo = $state(true);
	// contratte (ちゃった), estese (てしまった / てしまいました) o un po' e un po'
	let registro = $state<Registro>('miste');
	const varianteSimile = (f: FormaId) => (r && r.variante < N_VARIANTI(f) ? r.variante : 0);
	let verboPick = $state<string | null>(null);
	let verbiGiusti = $state(0);
	let registrato = false;

	const r = $derived(rounds[idx]);
	const rate = $derived(veloce ? 1.2 : 1);

	onMount(async () => {
		verbi = verbiDaParole((await db.words.toArray()) as Word[]);
		pronto = verbi.length >= 10;
	});

	function start(): void {
		rounds = costruisciSessioneFV(verbi, ROUNDS, Math.random, registro);
		idx = 0;
		score = 0;
		riascolti = 0;
		errori = [];
		picked = null;
		verboPick = null;
		verbiGiusti = 0;
		registrato = false;
		fase = 'gioco';
		ascolta();
	}

	function ascolta(lento = false): void {
		if (!r) return;
		speakSentenceJapanese(r.audio, { rate: lento ? 0.7 : rate });
	}
	function riascolta(lento = false): void {
		if (picked === null) riascolti += 1;
		ascolta(lento);
	}

	function scegliVerbo(lettura: string): void {
		if (!r || verboPick !== null) return;
		verboPick = lettura;
		if (lettura === r.verbo.lettura) verbiGiusti += 1;
	}
	const verboFatto = $derived(!conVerbo || verboPick !== null);

	// 🔊 Scomponi: dizionario → forma て → forma parlata, lenta.
	function scomponi(): void {
		if (!r) return;
		const o = { rate: 0.8 };
		speakSequence([{ text: r.verbo.lettura, options: o }, { text: r.te, options: o }, { text: r.audio, options: o }]);
	}

	function scegli(f: FormaId): void {
		if (!r || picked !== null || !verboFatto) return;
		picked = f;
		if (f === r.forma) score += 1;
		else errori = [...errori, r];
	}

	// Confronto a orecchio: come suonerebbe la forma che hai scelto.
	function suonoDi(f: FormaId): string {
		return r ? (formaParlata(r.verbo.lettura, r.verbo.cls, f, varianteSimile(f)) ?? '') : '';
	}
	function scrittaDi(f: FormaId): string {
		return r ? (formaParlata(r.verbo.scrittura, r.verbo.cls, f, varianteSimile(f)) ?? '') : '';
	}

	function avanti(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			picked = null;
			verboPick = null;
			ascolta();
		} else {
			fase = 'fine';
			registra(rounds.length);
		}
	}

	// Pulita: max 1 errore. Impresa: zero errori e zero riascolti.
	function registra(fatti: number): void {
		if (registrato || fatti === 0) return;
		registrato = true;
		const sbagliati = errori.length;
		const giusti = fatti - sbagliati;
		const clean = fatti >= MIN_ROUNDS_FOR_EARLY_EXIT_CREDIT && giusti >= fatti - 1;
		recordGameResult('forme-al-volo', clean, clean && sbagliati === 0 && riascolti === 0);
	}
	function leaveEarly(): void {
		if (fase !== 'gioco') return;
		registra(picked !== null ? idx + 1 : idx);
	}
</script>

<div class="fv">
	<div class="nav">
		<a class="back" href="{base}/esame" onclick={leaveEarly}>← Esame N4</a>
		{#if fase === 'gioco'}<span class="chip">{idx + 1} / {rounds.length} · {veloce ? '⚡ 1.2x' : '1x'}</span>{/if}
	</div>

	{#if fase === 'intro'}
		<article class="scene">
			<h1 class="page-title">👂 Forme al volo</h1>
			<p>Nei dialoghi la risposta cambia per una forma detta in fretta: <strong>行かなきゃ</strong> (devo andare) o <strong>行かなくてもいい</strong> (non serve)? <strong>食べてもいい</strong> o <strong>食べちゃだめ</strong>?</p>
			<p>Senti <strong>solo la forma</strong>, senza testo, e scegli cosa vuol dire. Le opzioni sono le forme con cui si confonde. Quando sbagli puoi sentire le due forme una dopo l’altra.</p>
			<p class="lbl">Forme</p>
			<div class="pills">
				<button class:on={registro === 'miste'} onclick={() => (registro = 'miste')}>Miste</button>
				<button class:on={registro === 'contratte'} onclick={() => (registro = 'contratte')}>Contratte (〜ちゃった)</button>
				<button class:on={registro === 'estese'} onclick={() => (registro = 'estese')}>Estese (〜てしまいました)</button>
			</div>
			<label class="toggle"><input type="checkbox" bind:checked={conVerbo} /> 🔎 Prima riconosci il verbo</label>
			<label class="toggle"><input type="checkbox" bind:checked={veloce} /> ⚡ Velocità parlata (1.2x)</label>
			<button class="proceed" disabled={!pronto} onclick={start}>{pronto ? '▶️ Inizia (10 forme)' : 'Carico i verbi…'}</button>
		</article>
	{:else if fase === 'gioco' && r}
		<article class="scene">
			<p class="ear">👂</p>
			<div class="row">
				<button class="mini" onclick={() => riascolta()}>🔁 もう一度</button>
				<button class="mini" onclick={() => riascolta(true)}>🐢 ゆっくり</button>
			</div>
			{#if conVerbo}
				<p class="lbl">① Quale verbo?</p>
				<div class="choices two">
					{#each r.verbiOpzioni as v (v.lettura)}
						<button class="choice verb" class:right={verboPick !== null && v.lettura === r.verbo.lettura} class:wrong={verboPick === v.lettura && v.lettura !== r.verbo.lettura} disabled={verboPick !== null} onclick={() => scegliVerbo(v.lettura)}>
							<span>{v.scrittura}</span>
							<small>{v.lettura} · {v.it}</small>
						</button>
					{/each}
				</div>
				{#if verboPick !== null}
					<p class="tip">🔎 {TE_INDIZIO[teTipo(r.verbo.lettura, r.verbo.cls)]}</p>
				{/if}
			{/if}
			{#if verboFatto}
			<p class="lbl">{conVerbo ? '② ' : ''}Cosa vuol dire la forma?</p>
			<div class="choices">
				{#each r.opzioni as f (f)}
					<button class="choice" class:right={picked !== null && f === r.forma} class:wrong={picked === f && f !== r.forma} disabled={picked !== null} onclick={() => scegli(f)}>{FORMA[f].it}</button>
				{/each}
			</div>
			{/if}
			{#if picked !== null}
				<div class="reveal">
					<p class="big-jp"><FuriganaText text={r.scritta} force={true} /> <button class="tts" onclick={() => ascolta()}>🔊</button></p>
					<p><strong>{nomeVariante(r.forma, r.variante)}</strong>{r.variante > 0 ? ` (forma estesa di ${nomeVariante(r.forma, 0)})` : ` = ${FORMA[r.forma].estesa}`} · <em>{r.verbo.it}</em> → {FORMA[r.forma].it}</p>
					<div class="chain">
						<span>{r.verbo.lettura}</span><span class="arr">→</span><span>{r.te}</span><span class="arr">→</span><strong>{r.audio}</strong>
						<button class="mini" onclick={scomponi}>🔊 Scomponi</button>
					</div>
					{#if picked !== r.forma}
						<div class="contrast">
							<p class="lbl">Confronta a orecchio</p>
							<button class="mini" onclick={() => speakSentenceJapanese(r.audio, { rate })}>🔊 {r.scritta} — {FORMA[r.forma].it}</button>
							<button class="mini" onclick={() => speakSentenceJapanese(suonoDi(picked!), { rate })}>🔊 {scrittaDi(picked)} — {FORMA[picked].it}</button>
						</div>
					{/if}
				</div>
				<button class="proceed" onclick={avanti}>{idx < rounds.length - 1 ? 'Prossima →' : 'Risultato →'}</button>
			{/if}
		</article>
	{:else if fase === 'fine'}
		<article class="scene">
			<p class="who">{errori.length === 0 ? '🎉 Orecchio veloce!' : '📝 Risultato'}</p>
			<p class="score">{score} / {rounds.length}</p>
			<p class="hint">Riascolti: {riascolti}{conVerbo ? ` · verbi riconosciuti: ${verbiGiusti}/${rounds.length}` : ''}</p>
			{#if errori.length > 0}
				<p class="lbl">Da ripassare</p>
				{#each errori as e (e.scritta)}
					<div class="line">
						<button class="tts" onclick={() => speakSentenceJapanese(e.audio, { rate })}>🔊</button>
						<FuriganaText text={e.scritta} force={true} />
						<span class="muted">{nomeVariante(e.forma, e.variante)} · {FORMA[e.forma].it}</span>
					</div>
				{/each}
			{/if}
			<div class="row">
				<button class="proceed" onclick={start}>🎲 Altre 10</button>
				<label class="toggle"><input type="checkbox" bind:checked={veloce} /> ⚡ 1.2x</label>
			</div>
		</article>
	{/if}
</div>

<style>
	.fv { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.chip { font-size: 0.78rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.scene { background: var(--surface); border-radius: 16px; padding: 18px; box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); display: grid; gap: 12px; }
	.scene p { margin: 0; }
	.who { font-weight: 700; }
	.lbl { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
	.hint, .muted { font-size: 0.82rem; color: var(--muted); }
	.hint { text-align: center; }
	.ear { text-align: center; font-size: 2.6rem; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.toggle { display: flex; gap: 6px; align-items: center; font-size: 0.9rem; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 11px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 0.98rem; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); }
	.pills { display: flex; flex-wrap: wrap; gap: 6px; }
	.pills button { border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); border-radius: 999px; padding: 6px 12px; font-size: 0.85rem; cursor: pointer; }
	.pills button.on { border-color: var(--brand); background: var(--brand); color: #fff; }
	.choices.two { grid-template-columns: 1fr 1fr; }
	.choice.verb { display: grid; gap: 2px; font-size: 1.05rem; }
	.choice.verb small { font-size: 0.75rem; color: var(--muted); }
	.tip { font-size: 0.85rem; background: var(--info-bg); color: var(--info-ink); border-radius: 8px; padding: 7px 10px; }
	.chain { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; font-size: 1.05rem; }
	.chain .arr { color: var(--muted); }
	.reveal { display: grid; gap: 6px; border-top: 1px solid var(--line); padding-top: 10px; font-size: 0.9rem; }
	.big-jp { font-size: 1.4rem; text-align: center; }
	.contrast { display: grid; gap: 6px; background: var(--warn-bg); color: var(--warn-ink); border-radius: 10px; padding: 8px 10px; }
	.contrast .mini { text-align: left; color: var(--ink); }
	.score { text-align: center; font-size: 2.2rem; font-weight: 800; }
	.line { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; padding: 6px 10px; border-radius: 8px; background: var(--surface-2); }
	.tts { border: none; background: none; cursor: pointer; font-size: 1rem; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.85rem; cursor: pointer; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.6; cursor: default; }
</style>
