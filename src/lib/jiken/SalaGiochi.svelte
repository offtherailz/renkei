<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { TARDI } from './motore';
	import {
		domandaQuiz, PREMI, SECONDI_QUIZ, VITE_QUIZ, pagaPartita, paroleGioco, puntiRisposta, puoiGiocare, registraPunti, turnoUfo, vinciPremio,
		type DomandaQuiz, type ParolaGioco, type TurnoUfo
	} from './giochi';
	import { UI } from './ui';
	import Purikura from './Purikura.svelte';
	import FotoPuri from './FotoPuri.svelte';
	import * as suono from './suoni';
	import type { Lingua, Stato, Testo } from './tipi';

	// La sala giochi: menù, UFOキャッチャー e クイズ. Lo stato resta della pagina:
	// qui si chiede di cambiarlo (aggiorna) e di uscire.
	const {
		stato, L, lingua, suoni, aggiorna, esci, parla, avvisa
	}: {
		stato: Stato;
		L: (t: Testo) => string;
		lingua: Lingua;
		suoni: boolean;
		aggiorna: (s: Stato) => void;
		esci: () => void;
		parla: (t: string, chi: 'F' | 'M', lento?: boolean) => Promise<void>;
		avvisa: (t: string) => void;
	} = $props();

	let gioco = $state<'menu' | 'ufo' | 'quiz' | 'puri'>('menu');
	let parole = $state<ParolaGioco[]>([]);
	const pronte = $derived(parole.length >= 12);

	onMount(async () => {
		// il saluto subito, senza aspettare il vocabolario
		void saluta();
		let words = await db.words.where('livello_jlpt').anyOf(['N5', 'N4']).toArray().catch(() => []);
		// vocabolario non ancora caricato nel database: si legge il seed
		if (words.length < 50) words = ((await fetch(`${base}/seed-n5n4.json`).then((r) => r.json()).catch(() => ({ words: [] }))) as { words: typeof words }).words;
		parole = paroleGioco(words);
	});

	// la commessa muove la bocca mentre parla (come i ritratti delle scene)
	let parlando = $state(false);
	let tick = $state(0);
	const bocca = setInterval(() => (tick += 1), 110);
	async function saluta(): Promise<void> {
		parlando = true;
		await parla(UI.sgBenvenuto.ja, 'F');
		parlando = false;
	}

	// prova a pagare una partita: se non si può, dice perché
	function paga(): boolean {
		if (stato.minuti >= TARDI) {
			avvisa(L(UI.chiuso));
			return false;
		}
		const s = pagaPartita(stato);
		if (!s) {
			avvisa(L(stato.oggetti.includes('portafoglio') ? UI.sgSoldi : UI.sgPortafoglio));
			return false;
		}
		aggiorna(s);
		return true;
	}

	// ── UFOキャッチャー
	let ufo = $state<TurnoUfo | null>(null);
	let pinza = $state(0); // posto sopra cui sta la pinza
	let fase = $state<'muovi' | 'scende' | 'sale' | 'fatto'>('muovi');
	let preso = $state<boolean | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;
	const giusta = $derived(ufo ? ufo.posti[ufo.giusto]! : null);

	function nuovaUfo(): void {
		if (!pronte || !paga()) return;
		ufo = turnoUfo(parole, 5);
		pinza = Math.floor(ufo.posti.length / 2);
		fase = 'muovi';
		preso = null;
		gioco = 'ufo';
		setTimeout(() => dici(), 300);
	}
	function dici(lento = false): void {
		if (giusta) void parla(giusta.parola.lettura, 'F', lento);
	}
	function muovi(d: number): void {
		if (!ufo || fase !== 'muovi') return;
		pinza = Math.max(0, Math.min(ufo.posti.length - 1, pinza + d));
	}
	function afferra(): void {
		if (!ufo || fase !== 'muovi') return;
		fase = 'scende';
		const ok = pinza === ufo.giusto;
		timer = setTimeout(() => {
			fase = 'sale';
			preso = ok;
			timer = setTimeout(() => {
				fase = 'fatto';
				if (!ufo) return;
				// pratica sulla parola detta: 👂 riconoscerla all'ascolto
				void recordPractice(`word:${giusta!.parola.id}`, ok, 'facet_form_listen');
				if (ok) {
					aggiorna(vinciPremio(stato, ufo.posti[pinza]!));
					if (suoni) suono.giusto();
				} else if (suoni) suono.sbagliato();
				void parla(giusta!.parola.lettura, 'F');
			}, 900);
		}, 800);
	}
	function tasti(e: KeyboardEvent): void {
		if (gioco !== 'ufo') return;
		if (e.key === 'ArrowLeft') muovi(-1);
		else if (e.key === 'ArrowRight') muovi(1);
		else if (e.key === 'ArrowDown' || e.key === ' ') {
			e.preventDefault();
			afferra();
		} else return;
	}

	// ── クイズ
	let domanda = $state<DomandaQuiz | null>(null);
	let vite = $state(VITE_QUIZ);
	let punti = $state(0);
	let resto = $state(SECONDI_QUIZ); // secondi rimasti per questa domanda
	let risposta = $state<number | null>(null); // -1 = tempo scaduto
	let finito = $state<{ posto: number; record: boolean } | null>(null);
	let fatte: string[] = [];
	let orologio: ReturnType<typeof setInterval> | null = null;

	function nuovoQuiz(): void {
		if (!pronte || !paga()) return;
		vite = VITE_QUIZ;
		punti = 0;
		fatte = [];
		finito = null;
		gioco = 'quiz';
		prossimaDomanda();
	}
	function prossimaDomanda(): void {
		domanda = domandaQuiz(parole, Math.random, fatte);
		fatte = [...fatte, domanda.parola.id].slice(-40);
		risposta = null;
		resto = SECONDI_QUIZ;
		ferma();
		const via = Date.now();
		orologio = setInterval(() => {
			resto = Math.max(0, SECONDI_QUIZ - (Date.now() - via) / 1000);
			if (resto <= 0) rispondi(-1);
		}, 100);
	}
	function ferma(): void {
		if (orologio) clearInterval(orologio);
		orologio = null;
	}
	function rispondi(i: number): void {
		if (!domanda || risposta !== null) return;
		ferma();
		risposta = i;
		const ok = i === domanda.giusta;
		// pratica: 📖 lettura dei kanji o 💡 significato riconosciuto
		void recordPractice(`word:${domanda.parola.id}`, ok, domanda.tipo === 'lettura' ? 'facet_form_read' : 'facet_meaning_r');
		if (ok) {
			punti += puntiRisposta(resto);
			if (suoni) suono.giusto();
		} else {
			vite -= 1;
			if (suoni) suono.sbagliato();
		}
		void parla(domanda.parola.lettura, 'F');
		// giusta: si va avanti da soli; sbagliata: si legge la soluzione e si tocca ▶
		if (ok) timer = setTimeout(prossimaDomanda, 1100);
		else if (vite <= 0) chiudiQuiz();
	}
	function chiudiQuiz(): void {
		const prima = stato.classifica[0]?.punti ?? 0;
		const r = registraPunti(stato, punti);
		aggiorna(r.stato);
		finito = { posto: r.posto, record: punti > prima };
	}

	function menu(): void {
		ferma();
		if (timer) clearTimeout(timer);
		gioco = 'menu';
		domanda = null;
		ufo = null;
	}
	onDestroy(() => {
		clearInterval(bocca);
		ferma();
		if (timer) clearTimeout(timer);
	});

	const premiVinti = $derived([...stato.collezione].reverse());
	const giornoJa = (g: number): string => {
		const d = new Date(2026, 3, 6 + g);
		return lingua === 'ja' ? `${d.getMonth() + 1}月${d.getDate()}日` : `${d.getDate()}/${d.getMonth() + 1}`;
	};
</script>

<svelte:window onkeydown={tasti} />

<section class="sg">
	<!-- uscita sempre in alto: sul telefono in fondo non si vede -->
	<div class="barra-su">
		{#if gioco === 'menu'}<button class="btn ghost small" onclick={esci}>{L(UI.sgEsci)}</button>
		{:else}<button class="btn ghost small" onclick={menu}>{L(UI.sgMenu)}</button>{/if}
	</div>
	{#if gioco === 'menu'}
		<div class="scene-wrap">
			<img class="scene" src="{base}/giorno/sfondi/sala_giochi.jpg" alt="" />
			<img class="sprite" src="{base}/giorno/ritratti/commessa_sg-{parlando && tick % 4 < 2 ? 'parla' : 'chiusa'}.png" alt="" />
		</div>
		<div class="dialog">
			<p class="dname">ゲームセンターの 人</p>
			<p class="ja">{UI.sgBenvenuto.ja} <button class="btn ghost small" onclick={saluta}>🔊</button></p>
			{#if lingua !== 'ja'}<p class="it">{L(UI.sgBenvenuto)}</p>{/if}
		</div>
		<div class="giochi">
			<div class="carta">
				<h3>{L(UI.sgUfo)}</h3>
				<p class="small">{L(UI.sgUfoCome)}</p>
				<button class="btn" disabled={!pronte || !puoiGiocare(stato)} onclick={nuovaUfo}>{pronte ? L(UI.sgGioca) : L(UI.sgCarica)} <small>({L(UI.sgPrezzo)})</small></button>
			</div>
			<div class="carta">
				<h3>{L(UI.sgQuiz)}</h3>
				<p class="small">{L(UI.sgQuizCome)}</p>
				<button class="btn" disabled={!pronte || !puoiGiocare(stato)} onclick={nuovoQuiz}>{pronte ? L(UI.sgGioca) : L(UI.sgCarica)} <small>({L(UI.sgPrezzo)})</small></button>
			</div>
			<div class="carta">
				<h3>{L(UI.sgPuri)}</h3>
				<p class="small">{L(UI.sgPuriDesc)}</p>
				<button class="btn" onclick={() => (gioco = 'puri')}>{L(UI.sgGioca)} <small>({L(UI.sgPuriPrezzo)})</small></button>
			</div>
		</div>
		{#if stato.foto?.length}
			<div class="carta">
				<h3>{L(UI.sgAlbum)} <small>({stato.foto.length})</small></h3>
				<FotoPuri pose={stato.foto.at(-1)!.pose} scritta={stato.foto.at(-1)!.scritta} piccola />
			</div>
		{/if}
		{#if !puoiGiocare(stato)}<p class="small avviso">{L(stato.oggetti.includes('portafoglio') ? UI.sgSoldi : UI.sgPortafoglio)}</p>{/if}
		<div class="carta">
			<h3>{L(UI.sgCollezione)} <small>({stato.collezione.length})</small></h3>
			<div class="premi">
				{#each premiVinti as p, i (i)}
					<span class="premio" title={p.it}>
						<img src="{base}/giorno/oggetti/{p.premio}.png" alt={PREMI[p.premio]?.it ?? ''} />
						<span class="cartellino">{p.ja}</span>
						<small>{p.ja !== p.lettura ? p.lettura : ''} {p.it}</small>
					</span>
				{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
			</div>
		</div>
		<div class="carta">
			<h3>{L(UI.sgClassifica)}</h3>
			{#each stato.classifica as c, i (i)}
				<p class="small">{i + 1}{lingua === 'ja' ? UI.sgPosto.ja : UI.sgPosto.it} — <strong>{c.punti}</strong> {L(UI.sgPunti)} · {giornoJa(c.giorno)}</p>
			{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
		</div>
	{:else if gioco === 'ufo' && ufo}
		<div class="macchina">
			<div class="vetro">
				<div class="pinza" class:giu={fase === 'scende'} class:su={fase === 'sale' || fase === 'fatto'} style="left: {((pinza + 0.5) / ufo.posti.length) * 100}%">
					<span class="filo"></span>
					<span class="artigli">
						<span class="braccio"></span>
						{#if preso && fase !== 'scende'}<img class="appeso" src="{base}/giorno/oggetti/{ufo.posti[pinza]!.premio}.png" alt="" />{/if}
					</span>
				</div>
				<div class="fila" style="grid-template-columns: repeat({ufo.posti.length}, minmax(0, 1fr))">
					{#each ufo.posti as p, i (i)}
						<div class="posto" class:sotto={pinza === i && fase === 'muovi'}>
							<img class:sparito={preso && pinza === i && fase !== 'scende'} src="{base}/giorno/oggetti/{p.premio}.png" alt="" />
							<span class="cartellino" class:ok={fase === 'fatto' && i === ufo.giusto}>{p.parola.scrittura}</span>
							{#if fase === 'fatto'}<small>{p.parola.lettura !== p.parola.scrittura ? p.parola.lettura : ''} {p.parola.it}</small>{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
		<div class="dialog">
			{#if fase === 'fatto' && giusta}
				<p class="esito" class:giusto={preso}>
					{preso ? L(UI.sgPreso) : L(UI.sgMancato)}
					「{giusta.parola.scrittura}」{giusta.parola.lettura !== giusta.parola.scrittura ? `（${giusta.parola.lettura}）` : ''} = {giusta.parola.it}
				</p>
				<div class="row">
					<button class="btn" disabled={!puoiGiocare(stato)} onclick={nuovaUfo}>{L(UI.sgAncora)}</button>
					<button class="btn ghost small" onclick={() => dici()}>🔊</button>
					<button class="btn ghost" onclick={menu}>{L(UI.sgMenu)}</button>
				</div>
			{:else}
				<p class="small">{L(UI.sgUfoCome)}</p>
				<div class="row comandi">
					<button class="btn" disabled={fase !== 'muovi'} onclick={() => muovi(-1)} aria-label="←">◀</button>
					<button class="btn big" disabled={fase !== 'muovi'} onclick={afferra}>{L(UI.sgPrendi)}</button>
					<button class="btn" disabled={fase !== 'muovi'} onclick={() => muovi(1)} aria-label="→">▶</button>
				</div>
				<div class="row">
					<button class="btn ghost small" onclick={() => dici()}>{L(UI.sgAscolta)}</button>
					<button class="btn ghost small" onclick={() => dici(true)}>{L(UI.sgPiano)}</button>
				</div>
			{/if}
		</div>
	{:else if gioco === 'puri'}
		<Purikura {stato} {L} {lingua} {suoni} {aggiorna} {menu} {parla} {avvisa} />
	{:else if gioco === 'quiz'}
		<div class="dialog quiz">
			<div class="row testa">
				<span class="vite">{'❤️'.repeat(Math.max(0, vite))}{'🖤'.repeat(Math.max(0, VITE_QUIZ - vite))}</span>
				<span class="punti">{punti} {L(UI.sgPunti)}</span>
			</div>
			{#if finito}
				{#if domanda && risposta !== domanda.giusta}<p class="esito">{risposta === -1 ? L(UI.sgFuoriTempo) : L(UI.sbagliato)} {domanda.parola.scrittura}（{domanda.parola.lettura}）= {domanda.parola.it}</p>{/if}
				<p class="fine">{L(UI.sgFine)} — <strong>{punti}</strong> {L(UI.sgPunti)}</p>
				{#if finito.record}<p class="esito giusto">{L(UI.sgRecord)}</p>{:else if finito.posto >= 0}<p class="small">{finito.posto + 1}{lingua === 'ja' ? UI.sgPosto.ja : UI.sgPosto.it}</p>{/if}
				<h3>{L(UI.sgClassifica)}</h3>
				{#each stato.classifica as c, i (i)}
					<p class="small" class:mio={i === finito.posto}>{i + 1}{lingua === 'ja' ? UI.sgPosto.ja : UI.sgPosto.it} — <strong>{c.punti}</strong> {L(UI.sgPunti)} · {giornoJa(c.giorno)}</p>
				{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
				<div class="row">
					<button class="btn" disabled={!puoiGiocare(stato)} onclick={nuovoQuiz}>{L(UI.sgAncora)}</button>
					<button class="btn ghost" onclick={menu}>{L(UI.sgMenu)}</button>
				</div>
			{:else if domanda}
				<div class="tempo"><span style="width: {(resto / SECONDI_QUIZ) * 100}%" class:poco={resto < 3}></span></div>
				<p class="dname">{L(domanda.tipo === 'lettura' ? UI.sgLettura : UI.sgSignificato)}</p>
				<p class="parola">{domanda.parola.scrittura}</p>
				<div class="scelte">
					{#each domanda.opzioni as o, i (i)}
						<button class="opzione" class:ok={risposta !== null && i === domanda.giusta} class:ko={risposta === i && i !== domanda.giusta} disabled={risposta !== null} onclick={() => rispondi(i)}>{i + 1}. {o}</button>
					{/each}
				</div>
				{#if risposta !== null && risposta !== domanda.giusta}
					<p class="esito">{risposta === -1 ? L(UI.sgFuoriTempo) : L(UI.sbagliato)} {domanda.parola.scrittura}（{domanda.parola.lettura}）= {domanda.parola.it}</p>
					{#if vite > 0}<div class="row"><button class="btn" onclick={prossimaDomanda}>{L(UI.avanti)}</button></div>{/if}
				{:else if risposta !== null}
					<p class="esito giusto">{L(UI.giusto)} {domanda.parola.scrittura}（{domanda.parola.lettura}）= {domanda.parola.it}</p>
				{/if}
			{/if}
		</div>
	{/if}
</section>

<style>
	.sg { display: grid; gap: 8px; background: var(--px-bg); color: var(--px-ink); border: 3px solid var(--px-line); box-shadow: inset 0 0 0 2px var(--px-panel); padding: 12px; }
	.sg h3 { margin: 0; font-size: 1rem; }
	.sg p { margin: 0; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.btn { font-family: inherit; background: #5b6ee1; color: #fff; border: 3px solid var(--px-line); box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8fa0ff; padding: 8px 14px; font-size: 0.95rem; cursor: pointer; touch-action: manipulation; }
	.barra-su { position: sticky; top: 0; z-index: 3; display: flex; justify-content: flex-end; margin-bottom: -4px; }
	.btn:disabled { opacity: 0.5; cursor: default; }
	.btn.big { font-size: 1.05rem; padding: 12px 16px; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; }
	.small { font-size: 0.8rem; opacity: 0.85; }
	.avviso { color: var(--px-ko); opacity: 1; }

	.scene-wrap { position: relative; border: 3px solid #f4f4f4; outline: 3px solid #0e0d1a; line-height: 0; margin: 3px; background: #000; aspect-ratio: 2 / 1; overflow: hidden; }
	.scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
	.sprite { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 92%; image-rendering: pixelated; }
	.dialog { background: #2a2848; color: #f4f4f4; box-shadow: inset 0 0 0 2px #3f3f74; border: 3px solid var(--px-line); padding: 10px 12px; display: grid; gap: 8px; }
	.dname { color: #fbf236; font-size: 0.85rem; }
	.ja { font-size: 1.1rem; line-height: 1.6; }
	.it { font-size: 0.85rem; color: #b9b6dc; }

	.giochi { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
	.carta { background: #2a2848; border: 3px solid var(--px-line); padding: 8px 10px; display: grid; gap: 6px; align-content: start; }
	.premi { display: flex; flex-wrap: wrap; gap: 8px; }
	.premio { display: grid; justify-items: center; gap: 2px; width: 84px; text-align: center; }
	.premio img { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; }
	.premio small { font-size: 0.65rem; opacity: 0.8; }
	.cartellino { background: #f4f4f4; color: #222034; border: 2px solid var(--px-line); padding: 1px 6px; font-size: 1.05rem; line-height: 1.3; white-space: nowrap; }
	.cartellino.ok { background: #fbf236; }

	.macchina { border: 4px solid #d95763; background: #45283c; padding: 8px; box-shadow: inset 0 0 0 3px #fbf236; }
	.vetro { position: relative; height: 300px; background: linear-gradient(#2a2848, #3f3f74); border: 3px solid var(--px-line); overflow: hidden; }
	.pinza { position: absolute; top: 0; transform: translateX(-50%); display: grid; justify-items: center; transition: left 0.25s steps(4); z-index: 2; }
	.filo { width: 3px; height: 30px; background: #9badb7; transition: height 0.8s ease-in; }
	.pinza.giu .filo { height: 170px; }
	.pinza.su .filo { height: 30px; transition-duration: 0.9s; }
	.artigli { display: grid; justify-items: center; }
	/* la pinza: una testa grigia con due braccia che si aprono scendendo */
	.braccio { position: relative; width: 26px; height: 12px; background: #9badb7; border: 2px solid var(--px-line); }
	.braccio::before, .braccio::after { content: ''; position: absolute; top: 8px; width: 5px; height: 26px; background: #9badb7; border: 2px solid var(--px-line); transition: transform 0.3s; }
	.braccio::before { left: -4px; transform: rotate(18deg); transform-origin: top; }
	.braccio::after { right: -4px; transform: rotate(-18deg); transform-origin: top; }
	.pinza.giu .braccio::before { transform: rotate(35deg); }
	.pinza.giu .braccio::after { transform: rotate(-35deg); }
	.appeso { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; margin-top: -4px; }
	.fila { position: absolute; bottom: 6px; left: 0; right: 0; display: grid; gap: 4px; padding: 0 4px; }
	/* le colonne non si allargano oltre lo schermo per un cartellino lungo */
	.posto { min-width: 0; }
	.posto { display: grid; justify-items: center; gap: 3px; text-align: center; }
	.posto img { width: min(70px, 100%); height: auto; aspect-ratio: 1; object-fit: contain; image-rendering: pixelated; }
	.posto img.sparito { visibility: hidden; }
	.posto.sotto .cartellino { outline: 3px solid #fbf236; }
	.posto small { font-size: 0.65rem; color: #f4f4f4; line-height: 1.2; }
	.posto .cartellino { font-size: clamp(0.75rem, 3.4vw, 1.15rem); white-space: normal; max-width: 100%; overflow-wrap: anywhere; }
	.comandi { justify-content: center; }
	.esito { color: var(--px-ko); }
	.esito.giusto { color: var(--px-ok); }

	.testa { justify-content: space-between; }
	.punti { color: #fbf236; }
	.tempo { height: 10px; background: #0e0d1a; border: 2px solid var(--px-line); }
	.tempo span { display: block; height: 100%; background: var(--px-ok); }
	.tempo span.poco { background: var(--px-ko); }
	.parola { font-size: 2.2rem; text-align: center; line-height: 1.3; }
	.scelte { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
	.opzione { font-family: inherit; text-align: left; background: #353360; border: 3px solid var(--px-line); padding: 10px; cursor: pointer; color: #f4f4f4; font-size: 1.05rem; box-shadow: inset 0 0 0 1px #4f4c8a; touch-action: manipulation; }
	.opzione:hover:not(:disabled) { background: #45437a; }
	.opzione.ok { background: #2f5a24; border-color: #99e550; }
	.opzione.ko { background: #5e2430; border-color: #d95763; }
	.fine { font-size: 1.2rem; }
	.mio { color: #fbf236; opacity: 1; }
</style>
