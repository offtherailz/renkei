<script lang="ts">
	import Frase from './Frase.svelte';
	import { dataIt, dataJa, hhmm } from './motore';
	import { FESTIVI, appuntamenti, dataDi, festivo, giorniMissione, mese, prossimo, routine, type Voce } from './calendario';
	import { LUOGO } from './mondo';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import type { Lingua, Missione, Stato } from './tipi';

	// Il calendario (si apre toccando la data): il mese con feste, missioni e
	// appuntamenti; sotto, l'agenda del giorno scelto e le tue note.
	const {
		stato, lingua, missioni, saluto = null, chiudi, nota
	}: {
		stato: Stato;
		lingua: Lingua;
		missioni: Missione[];
		saluto?: string | null; // riaprendo la partita: «bentornato» e dove eri rimasto
		chiudi: () => void;
		nota: (giorno: number, testo: string) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let scelto = $state(stato.giorno);
	// svelte-ignore state_referenced_locally
	let meseDi = $state(stato.giorno); // un giorno qualunque del mese mostrato
	const m = $derived(mese(meseDi));
	const MESI_JA = (n: number): string => `${n}月`;
	const MESI_IT = ['', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
	const WD = $derived(lingua === 'ja' ? ['月', '火', '水', '木', '金', '土', '日'] : ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do']);
	const COLORI = ['#d95763', '#5b6ee1', '#df7126', '#37946e', '#76428a', '#8f563b'];
	const span = $derived(missioni.map((mi, i) => ({ m: mi, i, gg: giorniMissione(mi) })).filter((x) => x.gg));
	const missioneDi = (g: number) => span.find((x) => g >= x.gg![0] && g <= x.gg![1]) ?? null;
	const cambiaMese = (d: number): void => {
		const x = dataDi(meseDi);
		const primo = new Date(x.getFullYear(), x.getMonth() + d, 1);
		meseDi = Math.round((primo.getTime() - dataDi(0).getTime()) / 86_400_000);
	};
	const ora = (v: { dalle?: number; alle?: number }): string => (v.dalle !== undefined ? hhmm(v.dalle) : '') + (v.alle !== undefined ? `〜${hhmm(v.alle)}` : '');
	const dataLunga = (g: number): string => (lingua === 'ja' ? dataJa(g) : dataIt(g));
	const prox = $derived(prossimo(stato));
	const diario = $derived(stato.percorso.filter((t) => t.giorno === scelto));
	const apertiOggi = $derived(scelto === stato.giorno ? stato.obiettivi.filter((o) => !o.fatto && !o.quando) : []);
	// svelte-ignore state_referenced_locally
	let testoNota = $state(stato.note?.[stato.giorno] ?? '');
	$effect(() => {
		testoNota = stato.note?.[scelto] ?? '';
	});
	const voci = $derived<Voce[]>(routine(scelto));
</script>

<div class="velo" role="presentation" onclick={chiudi}>
	<div class="cal" role="dialog" aria-label="calendario" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && chiudi()}>
		<button class="x" onclick={chiudi} aria-label="chiudi">✖</button>
		{#if saluto}
			<div class="bentornato">
				<p class="titolo">{saluto}</p>
				<p>📅 <b>{dataLunga(stato.giorno)}</b> {hhmm(stato.minuti)} · 📍 <Frase text={LUOGO[stato.luogo].nome} /></p>
				{#if prox}<p>⏰ <Frase text={prox.ja} />{#if lingua !== 'ja'} <small>— {prox.it}</small>{/if}</p>{/if}
			</div>
		{/if}
		<div class="testa">
			<button class="nav" onclick={() => cambiaMese(-1)} aria-label="◀">◀</button>
			<span>{lingua === 'ja' ? `${m.anno}年 ${MESI_JA(m.mese)}` : `${MESI_IT[m.mese]} ${m.anno}`}</span>
			<button class="nav" onclick={() => cambiaMese(1)} aria-label="▶">▶</button>
		</div>
		<div class="griglia">
			{#each WD as w, i (i)}<span class="wd" class:fe={i >= 5}>{w}</span>{/each}
			{#each m.settimane.flat() as g, i (i)}
				{#if g === null}<span></span>
				{:else}
					{@const mi = missioneDi(g)}
					{@const app = appuntamenti(stato, g)}
					<button
						class="giorno"
						class:oggi={g === stato.giorno}
						class:scelto={g === scelto}
						class:passato={g < stato.giorno}
						class:fe={festivo(g)}
						style={mi ? `--mi: ${COLORI[mi.i % COLORI.length]}` : ''}
						class:mi={!!mi}
						onclick={() => (scelto = g)}
					>
						<span class="n">{dataDi(g).getDate()}</span>
						{#if app.length}<span class="punto" class:fatto={app.every((o) => o.fatto)}>●</span>{/if}
						{#if mi && g === mi.gg![0]}<span class="etic">M{mi.i + 1}</span>{/if}
					</button>
				{/if}
			{/each}
		</div>

		<div class="giornata">
			<h3>{dataLunga(scelto)}{#if FESTIVI[scelto]} · <span class="rosso"><Frase text={FESTIVI[scelto]!.ja} /></span>{/if}</h3>
			{#if missioneDi(scelto)}<p class="small">🕵️ <Frase text={missioneDi(scelto)!.m.titolo} /></p>{/if}
			<ul class="agenda">
				{#each [...voci.map((v) => ({ v, ob: null })), ...appuntamenti(stato, scelto).map((o) => ({ v: { ...o.quando!, ja: o.ja, it: o.it }, ob: o }))].sort((a, b) => (a.v.dalle ?? a.v.alle ?? 0) - (b.v.dalle ?? b.v.alle ?? 0)) as r, i (i)}
					<li class:app={r.ob} class:fatto={r.ob?.fatto}>
						<span class="ora">{ora(r.v)}</span>
						<span>{r.ob ? (r.ob.fatto ? '☑ ' : '⏰ ') : ''}<Frase text={r.v.ja} />{#if lingua !== 'ja'}<small> — {r.v.it}</small>{/if}</span>
					</li>
				{/each}
			</ul>
			{#if apertiOggi.length}
				<p class="small">🎯 {lingua === 'ja' ? '今日の やる こと' : 'Da fare'}</p>
				<ul class="agenda">{#each apertiOggi as o (o.id)}<li><span class="ora"></span><span>☐ <Frase text={o.ja} />{#if lingua !== 'ja'}<small> — {o.it}</small>{/if}</span></li>{/each}</ul>
			{/if}
			{#if diario.length}
				<p class="small">🕐 {lingua === 'ja' ? '行った 所' : 'Dove sei stato'}: {diario.map((t) => `${hhmm(t.minuti)} ${stripFuriganaNotation(LUOGO[t.luogo].nome)}`).join(' → ')}</p>
			{/if}
			<label class="nota">
				<span class="small">📝 {lingua === 'ja' ? 'メモ' : 'Note'}</span>
				<textarea rows="2" bind:value={testoNota} onchange={() => nota(scelto, testoNota)} placeholder={lingua === 'ja' ? 'じぶんの メモ…' : 'Le tue note…'}></textarea>
			</label>
		</div>
	</div>
</div>

<style>
	.velo { position: fixed; inset: 0; z-index: 55; background: rgba(14, 13, 26, 0.6); overflow-y: auto; padding: 12px 8px; }
	/* la carta è chiara anche col tema scuro: parole spezzate e popup coi colori del tema chiaro */
	.cal { --ink: #2b2a3a; --muted: #5a5870; --line: #c9c3b0; --brand: #1b5fd1; --surface: #fffdf6; --success: #0f8f56; --warn-bg: #fffbeb; --warn-border: #fbbf24; --warn-ink: #92400e; --info-ink: #1e3a8a; --info-bg: #eef4ff; }
	.cal { --carta: #fbf5e6; --inchiostro: #2a2620; position: relative; box-sizing: border-box; width: 100%; max-width: 560px; margin: 0 auto; min-width: 0; background: var(--carta); color: var(--inchiostro); border: 3px solid #0e0d1a; box-shadow: 0 4px 0 #0e0d1a; padding: 12px; display: grid; gap: 10px; }
	.x { position: sticky; top: 0; justify-self: end; z-index: 2; margin: -4px -4px -40px 0; background: var(--carta); border: 3px solid var(--inchiostro); border-radius: 50%; width: 44px; height: 44px; padding: 0; display: grid; place-items: center; line-height: 1; font-size: 1.1rem; cursor: pointer; color: var(--inchiostro); touch-action: manipulation; }
	.cal > * { min-width: 0; }
	.bentornato p, .giornata { min-width: 0; overflow-wrap: anywhere; }
	.bentornato { margin-right: 46px; background: #fff6c8; border: 2px dashed #d9a520; padding: 8px 10px; display: grid; gap: 2px; }
	.bentornato p { margin: 0; }
	.bentornato .titolo { font-weight: 700; font-size: 1.1rem; }
	.testa { display: flex; align-items: center; justify-content: center; gap: 14px; font-weight: 700; font-size: 1.1rem; }
	.nav { background: none; border: 2px solid var(--inchiostro); cursor: pointer; padding: 2px 8px; color: var(--inchiostro); }
	.griglia { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
	.wd { text-align: center; font-size: 0.8rem; color: #6b6458; }
	.fe { color: #c8102e; }
	.giorno { position: relative; min-width: 0; width: 100%; height: 44px; box-sizing: border-box; border: 1px solid #d8cfb8; background: #fffdf6; cursor: pointer; font-family: inherit; color: var(--inchiostro); display: grid; place-items: center; padding: 0; }
	.giorno.fe { color: #c8102e; }
	.giorno.mi { box-shadow: inset 0 -5px 0 var(--mi); }
	.giorno.passato { opacity: 0.55; }
	.giorno.oggi { border: 3px solid #d9a520; opacity: 1; }
	.giorno.scelto { background: #fff1b8; }
	.n { font-weight: 700; }
	.punto { position: absolute; top: 1px; right: 3px; font-size: 0.6rem; color: #c8102e; }
	.punto.fatto { color: #6abe30; }
	.etic { position: absolute; left: 2px; top: 1px; font-size: 0.55rem; background: var(--mi); color: #fff; padding: 0 2px; }
	.giornata h3 { margin: 0 0 4px; font-size: 1rem; }
	.rosso { color: #c8102e; }
	.small { font-size: 0.85rem; margin: 4px 0; }
	.agenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
	.agenda li > span { min-width: 0; overflow-wrap: anywhere; }
	.agenda li { display: grid; grid-template-columns: 96px 1fr; gap: 6px; border-bottom: 1px dashed #d8cfb8; padding: 2px 0; }
	.agenda li.app { font-weight: 700; }
	.agenda li.fatto { opacity: 0.6; text-decoration: line-through; }
	.ora { font-variant-numeric: tabular-nums; color: #6b6458; white-space: nowrap; font-size: 0.9rem; }
	.nota { display: grid; gap: 2px; }
	.nota textarea { box-sizing: border-box; width: 100%; font-family: inherit; font-size: 0.95rem; border: 2px solid #c9c3b0; background: #fffdf6; color: var(--inchiostro); padding: 4px 6px; resize: vertical; }
</style>
