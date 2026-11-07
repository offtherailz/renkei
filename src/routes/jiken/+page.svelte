<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import Frase from '$lib/jiken/Frase.svelte';
	import { speakSentenceJapaneseAsync, stopSpeaking } from '$lib/core/tts';
	import { speechAvailable, abortableListen } from '$lib/core/speech';
	import { ensureWordIndex } from '$lib/core/wordLookup';
	import { caricaImpostazioni, declina, IMPOSTAZIONI_BASE, lettureKanji, nomeKatakana, opzioneDetta, salvaImpostazioni, voceGiocatore, vociGiapponesi, vocePersonaggio, type Impostazioni, type VoceDisponibile } from '$lib/jiken/voce';
	import { romajiToHiragana } from '$lib/core/romaji';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import {
		apertura, avanza, conNome, dataIt, dataJa, fascia, giustaSoldi, hhmm, notte, nuovoStato, orarioTesto, scenaPer, tr, viaggia, VIAGGIO, type Visibile
	} from '$lib/jiken/motore';
	import { LUOGHI, LUOGO, OGGETTI, PERSONAGGI, iconaOggetto } from '$lib/jiken/mondo';
	import { M1 } from '$lib/jiken/missioni/m1';
	import { UI } from '$lib/jiken/ui';
	import type { Lingua, LuogoId, Missione, Passo, Stato, Testo } from '$lib/jiken/tipi';

	const MISSIONI: Record<string, Missione> = { m1: M1 };
	const SALVA = 'renkei_jiken';

	// impostazioni del giocatore: nome, uomo/donna, voce, lingua dell'interfaccia…
	let imp = $state<Impostazioni>({ ...IMPOSTAZIONI_BASE });
	let impostazioni = $state(false); // pannello ⚙️
	let voci = $state<VoceDisponibile[]>([]);
	const lingua = $derived(imp.lingua);
	const L = (t: Testo): string => declina(tr(t, lingua), imp.sesso);
	function salvaImp(): void {
		imp = { ...imp, nome: nomeGiusto(imp.nome) };
		salvaImpostazioni(imp);
		if (stato && stato.nome !== imp.nome) {
			stato = { ...stato, nome: imp.nome };
			salva();
		}
	}

	// nome di un luogo nella lingua scelta
	const nomeLuogo = (id: LuogoId): string => (lingua === 'ja' ? stripFuriganaNotation(LUOGO[id].nome) : tr({ ja: LUOGO[id].nome, it: LUOGO[id].it, en: LUOGO[id].en }, lingua));

	let stato = $state<Stato | null>(null);
	let salvato = $state<Stato | null>(null);
	let fase = $state<'inizio' | 'mappa' | 'scena' | 'fine'>('inizio');

	// scena in corso
	let coda: Passo[] = [];
	let corrente = $state<Visibile | null>(null);
	let parlante = $state<string | null>(null); // chi è in scena (resta finché non parla un altro)
	let parla = $state(false);
	let tick = $state(0);
	let scelto = $state<number | null>(null); // risposta a una domanda
	let provaEsito = $state<boolean | null>(null);
	let obAperti = $state(false); // tendina degli obiettivi nella barra in alto
	let rivelati = $state<number[]>([]); // frasi del taccuino con la traduzione aperta
	let mostraIt = $state(false); // traduzione della battuta corrente
	let dividi = $state(false); // battuta corrente divisa in parole da toccare
	let taccuino = $state(false);
	let infoLuogo = $state<LuogoId | null>(null);
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let loop: ReturnType<typeof setInterval> | null = null;

	const missione = $derived(stato ? MISSIONI[stato.missione]! : M1);
	const luogoAttuale = $derived(stato ? LUOGO[stato.luogo] : null);
	const notturna = $derived(stato ? notte(stato.minuti) : false);
	const testo = (t: string): string => declina(conNome(t, stato?.nome ?? imp.nome), imp.sesso);

	function avvisa(t: string): void {
		toast = t;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2600);
	}

	function salva(): void {
		if (!stato) return;
		try {
			localStorage.setItem(SALVA, JSON.stringify(stato));
		} catch {
			/* niente storage */
		}
	}

	// ── nome: katakana o hiragana; il romaji si converte (luca → るか → ルカ)
	const nomeGiusto = (n: string): string => nomeKatakana(n, romajiToHiragana);


	function nuovaPartita(): void {
		if (salvato && !confirm(L(UI.sicuro))) return;
		salvaImp();
		stato = nuovoStato(imp.nome, 'm1');
		salva();
		entra('casa');
	}
	function continua(): void {
		if (!salvato) return;
		stato = salvato;
		if (stato.finita) fase = 'fine';
		else entra(stato.luogo);
	}

	// ── spostamenti
	function vai(dest: LuogoId): void {
		if (!stato) return;
		infoLuogo = null;
		const l = LUOGO[dest];
		if (apertura(l, stato) === 'bloccato') {
			avvisa(`🔒 ${nomeLuogo(dest)}${l.perche ? ': ' + L(l.perche) : ''}`);
			return;
		}
		stato = viaggia(stato, dest);
		entra(dest);
	}

	function entra(dest: LuogoId): void {
		if (!stato) return;
		const l = LUOGO[dest];
		const ap = apertura(l, stato);
		parlante = null;
		if (ap !== 'aperto') {
			const o = orarioTesto(l.orario);
			avvia([{ narra: `${UI.chiuso.ja}（${o.ja}）`, it: `${UI.chiuso.it} (${o.it})` }]);
			return;
		}
		const sc = scenaPer(dest, stato, missione);
		if (sc) {
			stato = { ...stato, fatte: [...stato.fatte, sc.id] };
			avvia(sc.passi);
		} else avvia(l.ambiente ?? [{ narra: UI.niente.ja, it: UI.niente.it }]);
	}

	function avvia(passi: Passo[]): void {
		coda = [...passi];
		fase = 'scena';
		prossimo();
	}

	// avanza nella coda: applica i passi invisibili e mostra il prossimo
	function prossimo(): void {
		if (!stato) return;
		hush();
		const prima = stato;
		const r = avanza(stato, coda);
		coda = r.coda;
		stato = r.stato;
		notaCambi(prima, stato);
		corrente = r.mostra;
		scelto = null;
		provaEsito = null;
		mostraIt = false;
		dividi = false;
		salva();
		if (!corrente) {
			finisciScena();
			return;
		}
		if ('dice' in corrente) {
			const c = PERSONAGGI[corrente.dice];
			if (c?.sprite) parlante = corrente.dice;
			if (corrente.taccuino) annota(corrente.dice, corrente.ja, corrente.it);
			if (imp.autoVoce) void voce(corrente.ja, c?.voce ?? 'F');
		} else if ('io' in corrente) {
			// la tua battuta con la tua voce, se non l'hai già detta tu al microfono
			if (imp.autoVoce && !corrente.detto) void voceMia(corrente.io);
		} else if ('pensa' in corrente) {
			if (imp.autoVoce) void voceMia(corrente.pensa, true);
		} else if ('domanda' in corrente) {
			if (imp.autoVoce) void voce(corrente.domanda.ja, 'F', false);
		}
		else if ('fine' in corrente) stato = { ...stato, finita: corrente.fine };
	}

	function notaCambi(a: Stato, b: Stato): void {
		const nuovi = b.oggetti.filter((o) => !a.oggetti.includes(o));
		const msg: string[] = [];
		if (nuovi.length) msg.push(`🎒 ${nuovi.map((o) => (OGGETTI[o] ? stripFuriganaNotation(L(OGGETTI[o])) : o)).join(', ')}`);
		if (b.soldi !== a.soldi && b.oggetti.includes('portafoglio') === a.oggetti.includes('portafoglio')) msg.push(`¥ ${b.soldi > a.soldi ? '+' : '−'}${Math.abs(b.soldi - a.soldi)}`);
		const ob = b.obiettivi.filter((o) => !a.obiettivi.some((x) => x.id === o.id));
		if (ob.length) msg.push(L(UI.nuovoOb));
		const fatti = b.obiettivi.filter((o) => o.fatto && !a.obiettivi.find((x) => x.id === o.id)?.fatto);
		if (fatti.length) msg.push(L(UI.obFatto));
		if (b.giorno !== a.giorno) msg.push(`🌙 ${lingua === 'ja' ? dataJa(b.giorno) : dataIt(b.giorno)}`);
		if (msg.length) avvisa(msg.join(' · '));
	}

	function annota(chi: string, ja: string, it: string): void {
		if (!stato) return;
		if (stato.taccuino.some((a) => a.ja === ja && a.giorno === stato!.giorno)) return;
		stato = { ...stato, taccuino: [...stato.taccuino, { giorno: stato.giorno, chi, ja: testo(ja), it: testo(it) }] };
	}

	function finisciScena(): void {
		if (!stato) return;
		parlante = null;
		if (stato.finita) {
			fase = 'fine';
			return;
		}
		// dopo una scena (o una notte) può essercene subito un'altra nello stesso luogo
		const l = LUOGO[stato.luogo];
		const sc = apertura(l, stato) === 'aperto' ? scenaPer(stato.luogo, stato, missione) : null;
		if (sc) {
			stato = { ...stato, fatte: [...stato.fatte, sc.id] };
			avvia(sc.passi);
			return;
		}
		fase = 'mappa';
		salva();
	}

	// ── interazioni coi passi
	function scegli(i: number, detto = false): void {
		if (!corrente || !('scelta' in corrente)) return;
		const o = corrente.scelta[i]!;
		coda = [{ io: o.ja, it: o.it ?? '', detto }, ...(o.passi ?? []), ...coda];
		prossimo();
	}
	// risposta detta a voce: si riconosce quale opzione hai detto
	const microfono = typeof window !== 'undefined' && speechAvailable();
	let ascolto = $state<{ abort: () => void } | null>(null);
	let letture: Map<string, string> | null = null; // kanji → kana, dal dizionario dell'app
	async function rispondiAVoce(): Promise<void> {
		if (!corrente || !('scelta' in corrente)) return;
		if (ascolto) {
			ascolto.abort();
			return;
		}
		hush();
		const opzioni = corrente.scelta.map((o) => testo(o.ja));
		const l = abortableListen('ja-JP');
		ascolto = l;
		if (!letture) letture = lettureKanji((await ensureWordIndex('it')).values());
		const sentito = await l.promise;
		ascolto = null;
		if (!corrente || !('scelta' in corrente)) return;
		const i = opzioneDetta(sentito, opzioni, letture);
		if (i === null) avvisa(sentito.length ? `🎤 「${sentito[0]}」 — ${L(UI.nonCapito)}` : `🎤 ${L(UI.nonSentito)}`);
		else scegli(i, true);
	}
	function giustaDomanda(): number {
		if (!corrente || !('domanda' in corrente) || !stato) return -1;
		const d = corrente.domanda;
		return d.giusta === 'soldi' ? giustaSoldi(d.opzioni.map((o) => o.valore), stato.soldi) : d.giusta;
	}
	function rispondi(i: number): void {
		if (!stato || scelto !== null) return;
		scelto = i;
		const ok = i === giustaDomanda();
		stato = { ...stato, domande: { ok: stato.domande.ok + (ok ? 1 : 0), tot: stato.domande.tot + 1 } };
		salva();
	}
	function mostra(oggetto: string | null): void {
		if (!corrente || !('prova' in corrente) || !stato) return;
		const ok = oggetto !== null && corrente.prova.giuste.includes(oggetto);
		provaEsito = ok;
		coda = [...(ok ? corrente.prova.ok : corrente.prova.no), ...coda];
	}

	function aspetta(min: number): void {
		if (!stato) return;
		stato = { ...stato, minuti: Math.min(stato.minuti + min, 23 * 60 + 59) };
		salva();
	}

	// ── voce e bocca
	async function voce(t: string, chi: 'F' | 'M', bocca = true): Promise<void> {
		parla = bocca;
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(t)), vocePersonaggio(chi, imp));
		parla = false;
	}
	// la tua voce (nei pensieri più piano)
	async function voceMia(t: string, pensiero = false): Promise<void> {
		const v = voceGiocatore(imp);
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(t)), pensiero ? { ...v, volume: 0.55, rate: (v.rate ?? 1) * 0.92 } : v);
	}
	function hush(): void {
		stopSpeaking();
		parla = false;
	}
	function riascolta(): void {
		if (!corrente) return;
		if ('dice' in corrente) void voce(corrente.ja, PERSONAGGI[corrente.dice]?.voce ?? 'F');
		else if ('io' in corrente) void voceMia(corrente.io);
		else if ('pensa' in corrente) void voceMia(corrente.pensa, true);
		else if ('domanda' in corrente) void voce(corrente.domanda.ja, 'F', false);
	}

	// ── scena: sfondo del luogo e personaggio
	const sfondo = $derived(luogoAttuale ? `${base}/giorno/sfondi/${luogoAttuale.sfondo}.jpg` : '');
	const sprite = $derived(parlante ? PERSONAGGI[parlante]?.sprite : null);
	const bocca = $derived(parla && corrente !== null && 'dice' in corrente && corrente.dice === parlante && tick % 4 < 2);
	$effect(() => {
		if (!sprite) return;
		for (const t of ['chiusa', 'parla']) new Image().src = `${base}/giorno/ritratti/${sprite}-${t}.png`;
	});

	// luoghi con qualcosa della storia da fare adesso (❗ sulla mappa)
	const conStoria = $derived.by(() => {
		const s = stato;
		if (!s) return new Set<LuogoId>();
		return new Set(LUOGHI.filter((l) => apertura(l, s) === 'aperto' && scenaPer(l.id, { ...s, minuti: s.minuti + (l.id === s.luogo ? 0 : VIAGGIO) }, missione)).map((l) => l.id));
	});
	const giorniPercorso = $derived(stato ? [...new Set(stato.percorso.map((t) => t.giorno))] : []);

	// sul telefono la mappa scorre: centrala sul luogo dove sei
	function centra(node: HTMLElement, luogo: LuogoId) {
		const go = (id: LuogoId) => requestAnimationFrame(() => {
			const inner = node.firstElementChild as HTMLElement | null;
			if (inner) node.scrollLeft = (LUOGO[id].x / 100) * inner.offsetWidth - node.clientWidth / 2;
		});
		go(luogo);
		return { update: go };
	}

	onMount(() => {
		try {
			const raw = JSON.parse(localStorage.getItem(SALVA) ?? 'null') as Stato | null;
			imp = caricaImpostazioni();
			if (raw?.versione === 1) salvato = raw;
		} catch {
			/* niente storage */
		}
		loop = setInterval(() => (tick += 1), 110);
		// le voci del sistema arrivano anche dopo
		voci = vociGiapponesi();
		if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => (voci = vociGiapponesi());
	});
	onDestroy(() => {
		if (loop) clearInterval(loop);
		if (toastTimer) clearTimeout(toastTimer);
		hush();
		ascolto?.abort();
	});
</script>

<svelte:head>
	<title>事件 — さくら町</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
</svelte:head>

<div class="game">
	<div class="game-top">
		<a class="back" href="{base}/avventure" title={L(UI.indietro)}>←<span class="largo"> {L(UI.indietro).replace('← ', '')}</span></a>
		<span class="barra">
			<button class="mini" onclick={() => (impostazioni = true)} title={L(UI.impostazioni)}>⚙️</button>
			{#if stato && fase !== 'inizio'}
				{@const aperti = stato.obiettivi.filter((o) => !o.fatto).length}
				<button class="mini" class:on={obAperti} onclick={() => (obAperti = !obAperti)}>🎯 {aperti}</button>
				<button class="mini" onclick={() => (taccuino = true)} title={L(UI.ノート)}>📓<span class="largo"> {L(UI.ノート).replace('📓 ', '')}</span></button>
			{/if}
		</span>
	</div>
	{#if obAperti && stato && fase !== 'inizio'}
		<div class="obiettivo tendina">
			{#each stato.obiettivi.filter((o) => !o.fatto) as o (o.id)}<p>🎯 {@render testoUI({ ja: o.ja ?? o.it, it: o.it, en: o.en })}</p>{:else}<p>{L(UI.nessuno)}</p>{/each}
		</div>
	{/if}

	{#snippet testoUI(t: Testo)}
		<!-- in giapponese: parole da toccare, traduzione col 🇮🇹 -->
		{#if lingua === 'ja'}
			<Frase text={testo(t.ja)} {dividi} />
		{:else}{testo(L(t))}{/if}
	{/snippet}

	{#if fase === 'inizio'}
		<section class="panel intro">
			<h1>🕵️ 事件 <small>{L(UI.titolo)}</small></h1>
			<p class="paper">{@render testoUI(UI.intro)}</p>
			<ul class="paper">
				{#each UI.regole as t, i (i)}<li>{@render testoUI(t)}</li>{/each}
			</ul>
			<label class="nome">{L(UI.nome)}
				<input bind:value={imp.nome} maxlength="12" onchange={salvaImp} />
			</label>
			<div class="row sesso">
				<span>{L(UI.sesso)}</span>
				<button class="btn small" class:ghost={imp.sesso !== 'M'} onclick={() => { imp.sesso = 'M'; salvaImp(); }}>👨 {L(UI.uomo)}</button>
				<button class="btn small" class:ghost={imp.sesso !== 'F'} onclick={() => { imp.sesso = 'F'; salvaImp(); }}>👩 {L(UI.donna)}</button>
				<button class="btn small ghost" onclick={() => (impostazioni = true)}>{L(UI.impostazioni)}</button>
			</div>
			<div class="row">
				{#if salvato && !salvato.finita}
					<button class="btn big" onclick={continua}>{L(UI.continua)} ({salvato.nome}, {dataJa(salvato.giorno)} {hhmm(salvato.minuti)})</button>
				{/if}
				<button class="btn big" class:ghost={salvato && !salvato.finita} onclick={nuovaPartita}>{L(UI.nuova)}</button>
			</div>
			<p class="muted">{L(UI.missione1)}</p>
		</section>
	{:else if stato}
		<div class="hud">
			<span class="data">📅 {lingua === 'ja' ? dataJa(stato.giorno) : dataIt(stato.giorno)}</span>
			<span class="ora">{notturna ? '🌙' : '☀️'} {hhmm(stato.minuti)} <small>{lingua === 'ja' ? fascia(stato.minuti) : ''}</small></span>
			<span class="soldi">¥{stato.oggetti.includes('portafoglio') ? stato.soldi : '—'}</span>
		</div>

		{#if fase === 'mappa'}
			{@const obiettivi = stato.obiettivi.filter((o) => !o.fatto)}
			<div class="vista-mappa">
			<div class="mappa-scroll" use:centra={stato.luogo}>
				<div class="mappa">
					<img src="{base}/giorno/mappa/sakura-{notturna ? 'notte' : 'giorno'}.jpg" alt="さくら町" />
					{#each LUOGHI as l (l.id)}
						{@const ap = apertura(l, stato)}
						<button
							class="spot"
							class:qui={stato.luogo === l.id}
							class:chiuso={ap === 'chiuso'}
							class:bloccato={ap === 'bloccato'}
							style="left:{l.x}%; top:{l.y}%"
							onclick={() => (infoLuogo = infoLuogo === l.id ? null : l.id)}
						>
							<span class="pin">{ap === 'bloccato' ? '🔒' : l.icona}{#if conStoria.has(l.id)}<b class="bang">❗</b>{/if}</span>
							<span class="etichetta">{nomeLuogo(l.id)}</span>
						</button>
					{/each}
				</div>
			</div>
			<div class="colonna">
			{#if infoLuogo}
				{@const l = LUOGO[infoLuogo]}
				{@const ap = apertura(l, stato)}
				<div class="panel info">
					<p><strong>{l.icona} {stripFuriganaNotation(l.nome)}</strong></p>
					<p class="small">🕐 {ap === 'bloccato' && l.perche ? `🔒 ${L(l.perche)}` : L(orarioTesto(l.orario))} · {ap === 'aperto' ? L(UI.aperto) : ap === 'chiuso' ? L(UI.chiusoOra) : ''}</p>
					<div class="row">
						{#if ap !== 'bloccato'}
							<button class="btn" onclick={() => vai(l.id)}>{stato.luogo === l.id ? L(UI.entra) : L(UI.vai)}</button>
						{/if}
						<button class="btn ghost" onclick={() => (infoLuogo = null)}>✖</button>
					</div>
				</div>
			{/if}
			<div class="row">
				<span class="small">{L(UI.seiA)}{nomeLuogo(stato.luogo)}</span>
				<button class="btn small ghost" onclick={() => aspetta(30)}>{L(UI.aspetta)}</button>
			</div>
			<!-- su desktop gli obiettivi stanno qui, sempre aperti -->
			{#if obiettivi.length}
				<div class="obiettivo lato">{#each obiettivi as o (o.id)}<p>🎯 {@render testoUI({ ja: o.ja ?? o.it, it: o.it, en: o.en })}</p>{/each}</div>
			{/if}
			</div>
			</div>
		{:else if fase === 'scena' && corrente}
			<section class="panel scena">
				<div class="scene-wrap">
					<img class="scene" src={sfondo} alt="" />
					{#if sprite}<img class="sprite" src="{base}/giorno/ritratti/{sprite}-{bocca ? 'parla' : 'chiusa'}.png" alt="" />{/if}
					<span class="luogo-tag">{luogoAttuale?.icona} {nomeLuogo(stato.luogo)}</span>
				</div>

				<div class="dialog">
					{#key corrente}
					{#if 'dice' in corrente}
						<p class="dname">{stripFuriganaNotation(PERSONAGGI[corrente.dice]?.nome ?? corrente.dice)}{#if corrente.taccuino}<span class="nota">📓</span>{/if}</p>
						<p class="ja"><Frase text={testo(corrente.ja)} {dividi} /></p>
						{#if mostraIt}<p class="it">{testo(corrente.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							<button class="btn ghost small" onclick={riascolta}>🔊</button>
							{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'io' in corrente}
						<p class="dname io">{stato.nome}{corrente.detto ? ' 🎤' : ''}</p>
						<p class="ja mia">「<Frase text={testo(corrente.io)} {dividi} />」</p>
						{#if mostraIt && corrente.it}<p class="it">{testo(corrente.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							<button class="btn ghost small" onclick={riascolta}>🔊</button>
							{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt && corrente.it}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'pensa' in corrente}
						<p class="dname io">💭 {stato.nome} <small>{L(UI.pensiero)}</small></p>
						<p class="ja pensiero">（<Frase text={testo(corrente.pensa)} {dividi} />）</p>
						{#if mostraIt}<p class="it">{testo(corrente.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							<button class="btn ghost small" onclick={riascolta}>🔊</button>
							{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'narra' in corrente || 'nota' in corrente}
						{@const t = 'narra' in corrente ? { ja: corrente.narra, it: corrente.it, en: corrente.en } : { ja: corrente.nota, it: corrente.it, en: corrente.en }}
						<p class="narra" class:didascalia={'narra' in corrente} class:nota-gioco={'nota' in corrente}>
							{'nota' in corrente ? '💡 ' : ''}{#if lingua === 'ja'}<Frase text={testo(t.ja)} {dividi} />{:else}{testo(L(t))}{/if}
						</p>
						{#if lingua === 'ja' && mostraIt}<p class="it">{testo(t.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							{#if lingua === 'ja' && !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if lingua === 'ja' && !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'scelta' in corrente}
						<p class="dname io">{stato.nome} {L(UI.cosaDici)}</p>
						<div class="scelte">
							{#each corrente.scelta as o, i (i)}
								<button class="opzione" onclick={() => scegli(i)}>
									<span class="ja">{stripFuriganaNotation(testo(o.ja))}</span>
									{#if mostraIt && o.it}<small>{testo(o.it)}</small>{/if}
								</button>
							{/each}
						</div>
						{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							<div class="row">
							{#if microfono}<button class="btn small" class:ascolta={ascolto} onclick={rispondiAVoce}>{ascolto ? L(UI.ascolto) : L(UI.dillo)}</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'domanda' in corrente}
						{@const g = giustaDomanda()}
						<p class="dname">{L(UI.domanda)}</p>
						<p class="ja"><Frase text={testo(corrente.domanda.ja)} {dividi} /></p>
						{#if mostraIt}<p class="it">{testo(corrente.domanda.it)}</p>{/if}
						<div class="scelte">
							{#each corrente.domanda.opzioni as o, i (i)}
								<button class="opzione" class:ok={scelto !== null && i === g} class:ko={scelto === i && i !== g} disabled={scelto !== null} onclick={() => rispondi(i)}>
									<span class="ja">{i + 1}. {stripFuriganaNotation(testo(o.ja))}</span>
									{#if mostraIt}<small>{o.it}</small>{/if}
								</button>
							{/each}
						</div>
						{#if scelto !== null}
							<p class="esito" class:giusto={scelto === g}>{scelto === g ? L(UI.giusto) : L(UI.sbagliato)}</p>
							<details class="spiega"><summary>{L(UI.spiega)}</summary>{corrente.domanda.spiega}</details>
							<div class="row">
								<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
								{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
							</div>
						{:else}
							<div class="row">
								<button class="btn ghost small" onclick={riascolta}>🔊</button>
								{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
								<button class="btn ghost small" onclick={() => (taccuino = true)}>📓</button>
							</div>
						{/if}
					{:else if 'prova' in corrente}
						<p class="dname">{L(UI.prova)}</p>
						<p class="ja"><Frase text={testo(corrente.prova.ja)} {dividi} /></p>
						{#if mostraIt}<p class="it">{corrente.prova.it}</p>{/if}
						{#if provaEsito === null}
							<div class="oggetti">
								{#each stato.oggetti.filter((o) => o !== 'portafoglio') as o (o)}
									<button class="oggetto" onclick={() => mostra(o)}>
										<img src="{base}/giorno/oggetti/{iconaOggetto(o)}.png" alt="" />
										<span>{OGGETTI[o] ? stripFuriganaNotation(L(OGGETTI[o])) : o}</span>
									</button>
								{/each}
								<button class="oggetto" onclick={() => mostra(null)}><span class="nessuno">🤷</span><span>{L(UI.nonSo)}</span></button>
							</div>
							{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						{:else}
							<p class="esito" class:giusto={provaEsito}>{provaEsito ? L(UI.provaOk) : L(UI.provaNo)}</p>
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
						{/if}
					{:else if 'fine' in corrente}
						<p class="fine">{L(UI.completata)}<strong>{corrente.fine}</strong></p>
						<p class="small">{L(UI.punti)}{stato.domande.ok}/{stato.domande.tot}</p>
						<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
					{/if}
					{/key}
				</div>
			</section>
		{:else if fase === 'fine'}
			<section class="panel intro">
				<h1>🎉 {missione.titolo}</h1>
				<p class="paper">{@render testoUI(UI.fine)}</p>
				<p>{L(UI.punti)}<strong>{stato.domande.ok}/{stato.domande.tot}</strong></p>
				<p class="paper">{@render testoUI(UI.prossima)}</p>
				<div class="row">
					<button class="btn" onclick={() => (taccuino = true)}>{L(UI.rileggi)}</button>
					<button class="btn ghost" onclick={() => { salvato = stato; fase = 'inizio'; }}>{L(UI.inizio)}</button>
				</div>
			</section>
		{/if}
	{/if}

	{#if toast}<div class="toast">{toast}</div>{/if}

	{#if impostazioni}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) { salvaImp(); impostazioni = false; } }}>
			<section class="panel taccuino">
				<header><h2>{L(UI.impostazioni)}</h2><button class="mini" onclick={() => { salvaImp(); impostazioni = false; }}>✖</button></header>
				<div class="paper imp">
					<label>{L(UI.nome)}<input bind:value={imp.nome} maxlength="12" onchange={salvaImp} /></label>
					<div class="row"><span>{L(UI.sesso)}</span>
						<button class="btn small" class:ghost={imp.sesso !== 'M'} onclick={() => { imp.sesso = 'M'; imp.voce = null; salvaImp(); }}>👨 {L(UI.uomo)}</button>
						<button class="btn small" class:ghost={imp.sesso !== 'F'} onclick={() => { imp.sesso = 'F'; imp.voce = null; salvaImp(); }}>👩 {L(UI.donna)}</button>
					</div>
					<label>{L(UI.voceTua)}
						<select bind:value={imp.voce} onchange={salvaImp}>
							<option value={null}>{L(UI.predefinita)} ({imp.sesso === 'F' ? '👩' : '👨'})</option>
							{#each [...voci].sort((a, b) => Number(b.sesso === imp.sesso) - Number(a.sesso === imp.sesso)) as v (v.uri)}
								<option value={v.uri}>{v.sesso === 'F' ? '👩' : v.sesso === 'M' ? '👨' : '🗣️'} {v.nome}</option>
							{/each}
						</select>
					</label>
					<label>{L(UI.tono)} ({imp.tono.toFixed(2)})<input type="range" min="0.6" max="1.4" step="0.05" bind:value={imp.tono} onchange={salvaImp} /></label>
					<label>{L(UI.velocita)}
						<select bind:value={imp.velocita} onchange={salvaImp}>
							<option value={0.8}>0.8×</option><option value={0.9}>0.9×</option><option value={1}>1×</option><option value={1.1}>1.1×</option>
						</select>
					</label>
					<label class="check"><input type="checkbox" bind:checked={imp.autoVoce} onchange={salvaImp} /> {L(UI.autoVoce)}</label>
					<label>{L(UI.linguaUI)}
						<select bind:value={imp.lingua} onchange={salvaImp}>
							<option value="ja">日本語</option><option value="it">Italiano</option>
						</select>
					</label>
					<button class="btn small" onclick={() => void voceMia(UI.frasePerProva.ja)}>{L(UI.provaVoce)}</button>
				</div>
			</section>
		</div>
	{/if}

	{#if taccuino && stato}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) taccuino = false; }}>
			<section class="panel taccuino">
				<header><h2>📓 {stato.nome}{L(UI.taccuinoDi)}</h2><button class="mini" onclick={() => (taccuino = false)}>✖</button></header>
				<div class="paper">
					<h3>{L(UI.obiettivi)}</h3>
					{#each stato.obiettivi as o (o.id)}<p class="ob" class:fatto={o.fatto}>{o.fatto ? '✅' : '⬜'} {@render testoUI({ ja: o.ja ?? o.it, it: o.it, en: o.en })}</p>{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
					<h3>{L(UI.oggetti)}</h3>
					<div class="oggetti">
						{#each stato.oggetti as o (o)}
							<span class="oggetto"><img src="{base}/giorno/oggetti/{iconaOggetto(o)}.png" alt="" /><span>{OGGETTI[o] ? stripFuriganaNotation(L(OGGETTI[o])) : o}</span></span>
						{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
					</div>
					<h3>{L(UI.percorso)}</h3>
					{#each giorniPercorso as g (g)}
						<p class="small"><strong>{lingua === 'ja' ? dataJa(g) : dataIt(g)}</strong> {stato.percorso.filter((t) => t.giorno === g).map((t) => `${hhmm(t.minuti)} ${nomeLuogo(t.luogo)}`).join(' → ')}</p>
					{/each}
					<h3>{L(UI.frasi)}</h3>
					{#each [...stato.taccuino].reverse() as a, i (i)}
						<div class="appunto">
							<p class="small">{dataJa(a.giorno)} · {stripFuriganaNotation(PERSONAGGI[a.chi]?.nome ?? a.chi)}</p>
							<p class="ja"><Frase text={a.ja} /></p>
							{#if rivelati.includes(i)}<p class="it">{a.it}</p>{:else}<button class="mini piccolo" onclick={() => (rivelati = [...rivelati, i])}>🇮🇹</button>{/if}
						</div>
					{:else}<p class="small">{L(UI.nessuno)}</p>{/each}
					<h3>{L(UI.domande)}</h3>
					<p class="small">{stato.domande.ok}/{stato.domande.tot}</p>
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	.game {
		--px-ink: #f4f4f4;
		--px-bg: #222034;
		--px-panel: #3f3f74;
		--px-line: #0e0d1a;
		--px-ok: #99e550;
		--px-ko: #d95763;
		font-family: 'DotGothic16', system-ui, sans-serif;
		display: grid;
		gap: 10px;
		max-width: 980px;
		margin: 0 auto;
	}
	.game-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.barra { display: flex; gap: 6px; flex-wrap: nowrap; }
	.barra .mini { padding: 4px 8px; }
	.back { font-size: 1.05rem; }
	.largo { display: none; }
	@media (min-width: 600px) { .largo { display: inline; } }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.panel { background: var(--px-bg); color: var(--px-ink); border: 3px solid var(--px-line); box-shadow: inset 0 0 0 2px var(--px-panel); padding: 12px; display: grid; gap: 8px; }
	.intro h1 { margin: 0; font-size: 1.4rem; }
	.intro h1 small { font-size: 0.85rem; opacity: 0.8; margin-left: 6px; }
	.intro p, .intro li { font-size: 0.9rem; line-height: 1.5; }
	.intro ul { margin: 0; padding-left: 1.2rem; }
	.nome { display: grid; gap: 4px; font-size: 0.85rem; }
	.nome input { font: inherit; font-size: 1.1rem; padding: 6px 8px; border: 3px solid var(--px-line); background: #f4f4f4; color: #222034; max-width: 220px; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.btn { font-family: inherit; background: #5b6ee1; color: #fff; border: 3px solid var(--px-line); box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8fa0ff; padding: 8px 14px; font-size: 0.95rem; cursor: pointer; }
	.btn.big { font-size: 1.05rem; padding: 12px 16px; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; }
	.mini { font-family: inherit; border: 2px solid var(--px-line); background: #f4f4f4; color: #222034; padding: 3px 8px; cursor: pointer; font-size: 0.85rem; }
	.mini.on { background: #fbf236; }
	.muted, .small { font-size: 0.8rem; opacity: 0.85; margin: 0; }

	.hud { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: var(--px-bg); color: var(--px-ink); border: 3px solid var(--px-line); padding: 6px 10px; font-size: 0.95rem; }
	.hud small { opacity: 0.75; font-size: 0.75rem; }
	.hud .soldi { margin-left: auto; color: #fbf236; }
	.obiettivo { background: #fbf236; color: #222034; border: 3px solid var(--px-line); padding: 6px 10px; font-size: 0.85rem; display: grid; gap: 2px; }
	.obiettivo p { margin: 0; }

	.mappa-scroll { overflow-x: auto; border: 3px solid var(--px-line); }
	.mappa { position: relative; min-width: 720px; line-height: 0; }
	.mappa img { width: 100%; display: block; image-rendering: pixelated; }
	.spot { position: absolute; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 2px; background: none; border: 0; cursor: pointer; padding: 0; line-height: 1; font-family: inherit; }
	.pin { position: relative; color: #222034; font-size: 1.25rem; background: rgba(255, 255, 255, 0.92); border: 2px solid var(--px-line); border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; box-shadow: 0 2px 0 var(--px-line); }
	.bang { position: absolute; top: -12px; right: -10px; font-size: 0.95rem; animation: salta 0.9s ease-in-out infinite; }
	@keyframes salta { 50% { transform: translateY(-4px); } }
	.etichetta { font-size: 0.7rem; background: rgba(34, 32, 52, 0.85); color: #fff; padding: 2px 5px; white-space: nowrap; }
	.spot.qui .pin { background: #fbf236; }
	.spot.chiuso .pin { opacity: 0.6; filter: grayscale(1); }
	.spot.bloccato { opacity: 0.75; }
	.spot.bloccato .etichetta { opacity: 0.7; }
	.info p { margin: 0; }

	.scene-wrap { position: relative; border: 3px solid #f4f4f4; outline: 3px solid #0e0d1a; line-height: 0; margin: 3px; background: #000; aspect-ratio: 2 / 1; overflow: hidden; }
	.scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
	.sprite { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 92%; image-rendering: pixelated; }
	.luogo-tag { position: absolute; left: 6px; top: 6px; background: rgba(34, 32, 52, 0.85); color: #fff; padding: 3px 6px; font-size: 0.75rem; line-height: 1.2; }
	.dialog { --ink: #222034; --line: #9a98b5; background: #f4f4f4; color: #222034; border: 3px solid var(--px-line); padding: 10px 12px; display: grid; gap: 8px; min-height: 120px; align-content: start; }
	.dialog p { margin: 0; }
	.dname { font-size: 0.8rem; font-weight: 700; color: #5b6ee1; }
	.dname.io { color: #b44d7a; }
	.nota { margin-left: 6px; }
	.ja { font-size: 1.15rem; line-height: 1.7; }
	.it { font-size: 0.85rem; color: #555; }
	.narra { font-style: italic; font-size: 0.92rem; }
	.scelte { display: grid; gap: 6px; }
	.opzione { font-family: inherit; text-align: left; background: #fff; border: 3px solid var(--px-line); padding: 8px 10px; cursor: pointer; display: grid; gap: 2px; color: #222034; }
	.opzione .ja { font-size: 1.05rem; }
	.opzione small { color: #666; font-size: 0.78rem; }
	.opzione:hover:not(:disabled) { background: #e8ecff; }
	.opzione.ok { background: #d8f5c0; border-color: #4b8a1f; }
	.opzione.ko { background: #f8d0d4; border-color: #a83240; }
	.esito { font-size: 0.88rem; padding: 6px 8px; background: #f8d0d4; }
	.esito.giusto { background: #d8f5c0; }
	.fine { font-size: 1.1rem; }
	.oggetti { display: flex; flex-wrap: wrap; gap: 8px; }
	.oggetto { font-family: inherit; display: grid; justify-items: center; gap: 2px; width: 92px; background: #fff; color: #222034; border: 2px solid var(--px-line); padding: 6px 4px; cursor: pointer; font-size: 0.72rem; text-align: center; }
	.oggetto img { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
	.nessuno { font-size: 2rem; line-height: 48px; }

	.paper { --ink: #222034; --line: #9a98b5; background: #f4f4f4; color: #222034; border: 3px solid var(--px-line); padding: 8px 10px; margin: 0; }
	ul.paper { padding-left: 1.6rem; display: grid; gap: 4px; }
	.nota-gioco { font-style: normal; background: #fff7c2; padding: 4px 6px; }
	.spiega { font-size: 0.85rem; }
	.spiega summary { cursor: pointer; color: #5b6ee1; }
	.obiettivo { --ink: #222034; --line: #8a7f2a; }
	.obiettivo :global(.isentence), .paper :global(.isentence) { font-size: 0.95rem; line-height: 1.7; }
	.mini.piccolo { font-size: 0.7rem; padding: 1px 5px; justify-self: start; }
	.tendina { position: relative; z-index: 5; }
	.game > :global(*), .vista-mappa > * { min-width: 0; }
	.vista-mappa { display: grid; gap: 8px; }
	.colonna { display: grid; gap: 8px; align-content: start; }
	.obiettivo.lato { display: none; }
	@media (min-width: 900px) {
		.game { max-width: 1240px; }
		.vista-mappa { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 10px; align-items: start; }
		.mappa { min-width: 0; }
		.obiettivo.lato { display: grid; }
		.scena { grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr); align-items: start; }
		.scena .dialog { min-height: 100%; }
	}
	.mia { text-align: right; color: #7a2d55; }
	.pensiero { color: #6b6890; font-style: italic; }
	.dname small { font-weight: 400; color: #888; }
	.narra.didascalia { background: #3f3f74; color: #f4f4f4; --ink: #f4f4f4; --line: #8f8dc0; padding: 8px 10px; border-left: 5px solid #fbf236; font-style: normal; }
	.btn.ascolta { background: #d95763; animation: pulsa 1s ease-in-out infinite; }
	@keyframes pulsa { 50% { opacity: 0.7; } }
	.sesso span { font-size: 0.9rem; }
	.imp { display: grid; gap: 10px; }
	.imp label { display: grid; gap: 4px; font-size: 0.88rem; }
	.imp label.check { display: flex; align-items: center; gap: 6px; }
	.imp input:not([type]), .imp select { font: inherit; padding: 5px 6px; border: 2px solid var(--px-line); background: #fff; color: #222034; }
	.toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); background: #222034; color: #fff; border: 3px solid #fbf236; padding: 8px 14px; font-size: 0.9rem; z-index: 50; max-width: 90vw; }
	.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 40; display: grid; place-items: start center; overflow-y: auto; padding: 20px 10px; }
	.taccuino { width: min(680px, 100%); }
	.taccuino header { display: flex; justify-content: space-between; align-items: center; }
	.taccuino h2 { margin: 0; font-size: 1.1rem; }
	.taccuino h3 { margin: 8px 0 2px; font-size: 0.95rem; color: #3f3f74; }
	.taccuino .it { color: #555; }
	.taccuino .paper { display: grid; gap: 4px; }
	.taccuino .oggetto { cursor: default; }
	.ob { margin: 0; font-size: 0.88rem; }
	.ob.fatto { opacity: 0.6; text-decoration: line-through; }
	.appunto { border-left: 3px solid #5b6ee1; padding-left: 8px; display: grid; gap: 2px; }
	.appunto p { margin: 0; }
	.appunto .ja { font-size: 1rem; }
</style>
