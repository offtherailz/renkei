<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import ExamPrompt from '$lib/components/ExamPrompt.svelte';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { CURATED_ITEMS, type CuratedExamItem } from '$lib/data/esame-n4';
	import { UI } from './ui';
	import * as suono from './suoni';
	import type { Testo } from './tipi';

	// Il viaggio in treno tra le stazioni: il vagone di «Un giorno» col paesaggio
	// che scorre dai finestrini e, durante il tragitto, domande d'esame ★ (文の組み立て).
	const {
		da, verso, minuti, prezzo, L, suoni, risposta, arrivo
	}: {
		da: string;
		verso: string;
		minuti: number;
		prezzo: number;
		L: (t: Testo) => string;
		suoni: boolean;
		risposta: (giusta: boolean) => void; // conta come domanda d'esame
		arrivo: () => void;
	} = $props();

	// una domanda, comunque venga: ★ dell'app (CURATED_ITEMS) o delle prove
	// d'esame dei libri (caricate in «Un giorno»: db.course_giorno, restano sul dispositivo)
	interface DomandaTreno {
		id: string;
		prompt: string;
		choices: string[];
		correct: number;
		frase?: string;
		spiega?: string;
	}
	const RECENTI = 'renkei_jiken_kumitate';
	const recenti = (): string[] => {
		try {
			return JSON.parse(localStorage.getItem(RECENTI) ?? '[]') as string[];
		} catch {
			return [];
		}
	};
	// la meno recente (le mai fatte prima), a parità a caso
	function menoRecente<T extends { id: string }>(xs: T[]): T | null {
		const r = recenti();
		return [...xs].sort(() => Math.random() - 0.5).sort((a, b) => r.indexOf(a.id) - r.indexOf(b.id))[0] ?? null;
	}
	function segna(ids: string[]): void {
		try {
			localStorage.setItem(RECENTI, JSON.stringify([...recenti().filter((id) => !ids.includes(id)), ...ids].slice(-1500)));
		} catch {
			/* niente storage */
		}
	}
	const daCurata = (q: CuratedExamItem): DomandaTreno => ({ id: q.id, prompt: q.prompt, choices: q.choices, correct: q.correct, frase: q.frase_completa?.replace(/[【】]/g, ''), spiega: q.spiegazione.perche_giusta });
	const stelle = CURATED_ITEMS.filter((q) => q.mondai === 'kumitate');
	const prima = menoRecente(stelle)!;
	const seconda = menoRecente(stelle.filter((q) => q.id !== prima.id))!;
	segna([prima.id, seconda.id]);
	let domande = $state<DomandaTreno[]>([daCurata(prima), daCurata(seconda)]);
	// con le prove caricate, la seconda domanda viene da lì (文法・文字・語彙)
	onMount(async () => {
		const prove = await db.course_giorno.where('tipo').anyOf(['bunpou', 'moji', 'goi']).toArray().catch(() => []);
		const p = menoRecente(prove);
		if (!p || n > 0) return;
		domande = [domande[0]!, { id: p.id, prompt: p.domanda.ja, choices: p.opzioni.map((o) => o.ja), correct: p.risposta, frase: p.completa, spiega: p.spiega }];
		segna([p.id]);
	});
	let n = $state(0);
	let scelto = $state<number | null>(null);
	const q = $derived(domande[n] ?? null);

	function rispondi(i: number): void {
		if (!q || scelto !== null) return;
		scelto = i;
		const ok = i === q.correct;
		if (ok && suoni) suono.din();
		risposta(ok);
	}
	function avanti(): void {
		scelto = null;
		n += 1;
	}
</script>

<section class="viaggio">
	<div class="scene-wrap">
		<!-- fuori dai finestrini (trasparenti nel disegno del vagone) scorre il paesaggio -->
		<div class="window-view"><div class="panorama" style="background-image: url({base}/giorno/sfondi/panorama.jpg)"></div></div>
		<img class="scene" src="{base}/giorno/sfondi/treno.png" alt="" />
		<span class="tratta">🚃 {da} → {verso}（{minuti}分・{prezzo}円）</span>
	</div>
	<div class="dialog">
		{#if q}
			<p class="dname">{L(UI.trenoDomanda)} ({n + 1}/{domande.length})</p>
			<div class="domanda"><ExamPrompt text={q.prompt} interactive={scelto !== null} /></div>
			<div class="scelte">
				{#each q.choices as c, i (i)}
					<button class="opzione" class:ok={scelto !== null && i === q.correct} class:ko={scelto === i && i !== q.correct} disabled={scelto !== null} onclick={() => rispondi(i)}>
						{i + 1}. <FuriganaText text={c} />
					</button>
				{/each}
			</div>
			{#if scelto !== null}
				<p class="esito" class:giusto={scelto === q.correct}>{scelto === q.correct ? L(UI.giusto) : L(UI.sbagliato)}</p>
				{#if q.frase}<p class="frase"><FuriganaText text={q.frase} /></p>{/if}
				{#if q.spiega}<p class="spiega">{q.spiega}</p>{/if}
				<div class="row"><button class="btn" onclick={avanti}>{L(UI.avanti)}</button></div>
			{:else}
				<div class="row"><button class="btn ghost small" onclick={arrivo}>{L(UI.trenoSalta)}</button></div>
			{/if}
		{:else}
			<p class="arrivo">{L(UI.trenoArrivo).replace('{dove}', verso)}</p>
			<div class="row"><button class="btn" onclick={arrivo}>{L(UI.trenoScendi)}</button></div>
		{/if}
	</div>
</section>

<style>
	.viaggio { display: grid; gap: 8px; background: var(--px-bg); color: var(--px-ink); border: 3px solid var(--px-line); box-shadow: inset 0 0 0 2px var(--px-panel); padding: 12px; }
	.scene-wrap { position: relative; border: 3px solid #f4f4f4; outline: 3px solid #0e0d1a; line-height: 0; margin: 3px; background: #000; aspect-ratio: 2 / 1; overflow: hidden; }
	.scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
	.window-view { position: absolute; inset: 0; overflow: hidden; container-type: size; }
	/* la striscia (si ripete senza giunture) scorre di una sua larghezza: 1135×320 → 3.547 altezze */
	.panorama { position: absolute; inset: 0; background-repeat: repeat-x; background-size: auto 100%; image-rendering: pixelated; animation: scorre 14s linear infinite; }
	@keyframes scorre { from { background-position-x: 0; } to { background-position-x: calc(-354.7cqh); } }
	.tratta { position: absolute; left: 8px; top: 8px; line-height: 1.3; background: rgba(14, 13, 26, 0.8); color: #fff; padding: 3px 8px; font-size: 0.85rem; }
	/* il testo d'esame usa i colori del tema: qui sul fondo scuro del gioco */
	.dialog { --ink: #f4f4f4; --muted: #b9b6dc; --line: #6e6c8f; --brand: #8fa0ff; --info-ink: #cbdbfc; --info-bg: #353360; background: #2a2848; color: #f4f4f4; box-shadow: inset 0 0 0 2px #3f3f74; border: 3px solid var(--px-line); padding: 10px 12px; display: grid; gap: 8px; }
	.dialog p { margin: 0; }
	.dname { color: #fbf236; font-size: 0.85rem; }
	.domanda { font-size: 1.1rem; line-height: 1.7; }
	.scelte { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px; }
	.opzione { font-family: inherit; text-align: left; background: #353360; border: 3px solid var(--px-line); padding: 8px 10px; cursor: pointer; color: #f4f4f4; font-size: 1.05rem; box-shadow: inset 0 0 0 1px #4f4c8a; touch-action: manipulation; }
	.opzione:hover:not(:disabled) { background: #45437a; }
	.opzione.ok { background: #2f5a24; border-color: #99e550; }
	.opzione.ko { background: #5e2430; border-color: #d95763; }
	.esito { color: var(--px-ko); }
	.esito.giusto { color: var(--px-ok); }
	.frase { font-size: 1.05rem; }
	.spiega { font-size: 0.85rem; color: #cbdbfc; }
	.arrivo { font-size: 1.05rem; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.btn { font-family: inherit; background: #5b6ee1; color: #fff; border: 3px solid var(--px-line); box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8fa0ff; padding: 8px 14px; font-size: 0.95rem; cursor: pointer; touch-action: manipulation; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; }
</style>
