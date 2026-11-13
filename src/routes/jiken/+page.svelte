<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import Frase from '$lib/jiken/Frase.svelte';
	import SalaGiochi from '$lib/jiken/SalaGiochi.svelte';
	import ViaggioTreno from '$lib/jiken/ViaggioTreno.svelte';
	import { LUOGO_GIOCHI } from '$lib/jiken/giochi';
	import { speakSentenceJapaneseAsync, stopSpeaking } from '$lib/core/tts';
	import { speechAvailable, abortableListen } from '$lib/core/speech';
	import { ensureWordIndex } from '$lib/core/wordLookup';
	import { caricaImpostazioni, declina, IMPOSTAZIONI_BASE, lettureKanji, nomeKatakana, opzioneDetta, salvaImpostazioni, voceGiocatore, vociGiapponesi, vocePersonaggio, type Impostazioni, type VoceDisponibile } from '$lib/jiken/voce';
	import { romajiToHiragana } from '$lib/core/romaji';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import {
		apertura, avanza, chiacchieraPer, chiDi, conNome, pulisciObiettivi, dataIt, dataJa, fascia, hhmm, migra, notte, nuovoStato, prendiTreno, prossimaMissione, STAZIONI, TARDI, TRENO, opzioniSoldi, orarioTesto, scenaPer, tr, viaggia, VIAGGIO, type Visibile
	} from '$lib/jiken/motore';
	import { LUOGHI, LUOGO, OGGETTI, PERSONAGGI, iconaOggetto } from '$lib/jiken/mondo';
	import { M1 } from '$lib/jiken/missioni/m1';
	import { M2 } from '$lib/jiken/missioni/m2';
	import { M3 } from '$lib/jiken/missioni/m3';
	import { M4 } from '$lib/jiken/missioni/m4';
	import { UI } from '$lib/jiken/ui';
	import { ICONA_TEMPO, tempo } from '$lib/jiken/meteo';
	import * as suono from '$lib/jiken/suoni';
	import Hanko from '$lib/jiken/Hanko.svelte';
	import Calendario from '$lib/jiken/Calendario.svelte';
	import { livelli, manca, nuoviTimbri, percento, registraRisposta, risultato, stelle, timbri, unisci, valore, livello, type Risultato, type Totali } from '$lib/jiken/punteggio';
	import type { Lingua, LuogoId, Missione, Opzione, Passo, Stato, Testo } from '$lib/jiken/tipi';

	const ORDINE: Missione[] = [M1, M2, M3, M4];
	const MISSIONI: Record<string, Missione> = Object.fromEntries(ORDINE.map((m) => [m.id, m]));
	const dopo = (id: string): Missione | null => ORDINE[ORDINE.findIndex((m) => m.id === id) + 1] ?? null;
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
	// slot: la partita principale, o il rigioco di una missione già finita (a parte)
	let slot = $state<'main' | 'rigioca'>('main');
	let salvatoRigioco = $state<Stato | null>(null);
	const chiaveSlot = (): string => (slot === 'main' ? SALVA : `${SALVA}_rigioca`);

	// riprese: una copia della partita principale a ogni mattina (dopo la notte)
	const SALVA_RIPRESE = `${SALVA}_riprese`;
	let riprese = $state<Stato[]>([]);
	function salvaRipresa(s: Stato): void {
		if (slot !== 'main') return;
		// la mattina riparte da casa, non dal resto della scena della sera prima
		s = { ...s, scena: undefined };
		const altre = riprese.filter((x) => !(x.missione === s.missione && x.giorno === s.giorno));
		riprese = [...altre, s].sort((a, b) => a.giorno - b.giorno).slice(-14);
		try {
			localStorage.setItem(SALVA_RIPRESE, JSON.stringify(riprese));
		} catch {
			/* niente storage */
		}
	}
	function riprendi(r: Stato): void {
		if (!confirm(L(UI.riprendiSicuro))) return;
		slot = 'main';
		stato = pulisciObiettivi(structuredClone($state.snapshot(r)) as Stato, MISSIONI[r.missione] ?? M1);
		caricaStorico(r.giorno);
		// le mattine dopo questa non valgono più
		riprese = riprese.filter((x) => x.missione !== r.missione || x.giorno <= r.giorno);
		try {
			localStorage.setItem(SALVA_RIPRESE, JSON.stringify(riprese));
		} catch {
			/* niente storage */
		}
		salva();
		entra(stato.luogo);
	}

	// esporta / importa: partita, rigioco, riprese e impostazioni in un file
	function esporta(): void {
		const dati = { app: 'renkei-jiken', versione: 1, data: new Date().toISOString(), imp, main: slot === 'main' && stato ? stato : salvato, rigioco: salvatoRigioco, riprese };
		const url = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 1)], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `renkei-jiken-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
	async function importa(e: Event): Promise<void> {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		(e.currentTarget as HTMLInputElement).value = '';
		if (!f) return;
		try {
			const d = JSON.parse(await f.text()) as { app?: string; imp?: Impostazioni; main?: unknown; rigioco?: unknown; riprese?: unknown[] };
			if (d.app !== 'renkei-jiken') throw new Error('file');
			if (!confirm(L(UI.importaSicuro))) return;
			const main = migra(d.main);
			const rg = migra(d.rigioco);
			riprese = (d.riprese ?? []).map(migra).filter((x): x is Stato => x !== null);
			if (d.imp) imp = { ...IMPOSTAZIONI_BASE, ...d.imp };
			salvaImpostazioni(imp);
			localStorage.setItem(SALVA_RIPRESE, JSON.stringify(riprese));
			// lo storico dei dialoghi non è nel file: quello vecchio non vale più
			localStorage.removeItem(`${SALVA}_storico`);
			localStorage.removeItem(`${SALVA}_rigioca_storico`);
			if (main) localStorage.setItem(SALVA, JSON.stringify(main));
			else localStorage.removeItem(SALVA);
			if (rg) localStorage.setItem(`${SALVA}_rigioca`, JSON.stringify(rg));
			else localStorage.removeItem(`${SALVA}_rigioca`);
			salvato = main;
			salvatoRigioco = rg && !rg.finita ? rg : null;
			stato = null;
			slot = 'main';
			impostazioni = false;
			fase = 'inizio';
			avvisa(L(UI.importaOk));
		} catch {
			avvisa(L(UI.importaNo));
		}
	}
	let fase = $state<'inizio' | 'crea' | 'mappa' | 'scena' | 'fine' | 'giochi' | 'treno'>('inizio');

	// scena in corso
	let coda: Passo[] = [];
	let corrente = $state<Visibile | null>(null);
	let parlante = $state<string | null>(null); // chi è in scena (resta finché non parla un altro)
	let faccia = $state<string | null>(null); // espressione di chi è in scena
	let parla = $state(false);
	let tick = $state(0);
	let scelto = $state<number | null>(null); // risposta a una domanda
	let provaEsito = $state<boolean | null>(null);
	let obAperti = $state(false); // tendina degli obiettivi nella barra in alto
	let rivelati = $state<number[]>([]); // frasi del taccuino con la traduzione aperta
	let rivelatiP = $state<string[]>([]); // schede dei personaggi con la traduzione aperta
	let mostraIt = $state(false); // traduzione della battuta corrente
	let dividi = $state(false); // battuta corrente divisa in parole da toccare
	let taccuino = $state(false);
	// storico dei dialoghi della sessione: chi ha parlato, con che faccia, per riascoltare
	interface Battuta {
		chi: string | null; // personaggio; null = tu
		tipo: 'dice' | 'io' | 'pensa' | 'narra';
		sprite: string | null;
		ja: string;
		it: string;
		giorno: number;
		minuti: number;
		luogo: LuogoId;
	}
	let storico = $state<Battuta[]>([]);
	let storicoIt = $state<number[]>([]); // battute con la traduzione aperta
	// lo storico si salva a parte (non nella partita: le riprese ne farebbero 14 copie)
	const chiaveStorico = (): string => `${chiaveSlot()}_storico`;
	function salvaStorico(): void {
		try {
			localStorage.setItem(chiaveStorico(), JSON.stringify(storico));
		} catch {
			/* niente storage */
		}
	}
	// riprende lo storico dello slot; fino = solo i giorni prima di questo (riprese)
	function caricaStorico(fino?: number): void {
		try {
			const tutto = (JSON.parse(localStorage.getItem(chiaveStorico()) ?? '[]') as Battuta[]) ?? [];
			storico = fino === undefined ? tutto : tutto.filter((b) => b.giorno < fino);
		} catch {
			storico = [];
		}
		if (fino !== undefined) salvaStorico();
	}
	function azzeraStorico(): void {
		storico = [];
		salvaStorico();
	}
	function registra(b: Omit<Battuta, 'giorno' | 'minuti' | 'luogo'>): void {
		if (!stato) return;
		const ultima = storico.at(-1);
		if (ultima && ultima.ja === b.ja && ultima.chi === b.chi && ultima.giorno === stato.giorno) return;
		storico = [...storico, { ...b, giorno: stato.giorno, minuti: stato.minuti, luogo: stato.luogo }].slice(-2000);
		salvaStorico();
	}
	function riascoltaBattuta(b: Battuta): void {
		hush();
		if (b.tipo === 'dice') void voce(b.ja, PERSONAGGI[b.chi ?? '']?.voce ?? 'F', false);
		else if (b.tipo === 'io') void voceMia(b.ja);
		else if (b.tipo === 'pensa') void voceMia(b.ja, true);
		else void speakSentenceJapaneseAsync(stripFuriganaNotation(testo(b.ja)), vocePersonaggio('F', imp));
	}
	// il quaderno: una pagina con i segnalibri
	type Scheda = 'conversa' | 'obiettivi' | 'oggetti' | 'frasi' | 'persone' | 'percorso' | 'timbri';
	const SCHEDE: { id: Scheda; t: Testo }[] = [
		{ id: 'conversa', t: UI.storico },
		{ id: 'obiettivi', t: UI.obiettivi },
		{ id: 'oggetti', t: UI.oggetti },
		{ id: 'frasi', t: UI.frasi },
		{ id: 'persone', t: UI.persone },
		{ id: 'percorso', t: UI.percorso },
		{ id: 'timbri', t: UI.timbri }
	];
	let scheda = $state<Scheda>('obiettivi');
	let giornoStorico = $state(0); // giorno mostrato nella scheda dei dialoghi
	const giorniStorico = $derived([...new Set(storico.map((b) => b.giorno))]);
	const battuteGiorno = $derived(storico.map((b, i) => ({ b, i })).filter((x) => x.b.giorno === giornoStorico));
	function apriTaccuino(s: Scheda): void {
		scheda = s;
		storicoIt = [];
		// i dialoghi si aprono sul giorno di oggi (o l'ultimo con dialoghi)
		const oggi = stato?.giorno ?? 0;
		giornoStorico = giorniStorico.includes(oggi) ? oggi : (giorniStorico.at(-1) ?? oggi);
		taccuino = true;
	}
	// lo storico si apre in fondo, sull'ultima battuta
	function inFondo(node: HTMLElement): void {
		requestAnimationFrame(() => node.scrollIntoView({ block: 'end' }));
	}
	let infoLuogo = $state<LuogoId | null>(null);
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let loop: ReturnType<typeof setInterval> | null = null;

	const missione = $derived(stato ? MISSIONI[stato.missione]! : M1);
	const luogoAttuale = $derived(stato ? LUOGO[stato.luogo] : null);
	const notturna = $derived(stato ? notte(stato.minuti) : false);
	// il tempo che fa (quello previsto dalla TV la sera prima): livello animato sulla mappa
	const tempoOra = $derived(stato ? tempo(stato.giorno, stato.minuti) : 'sereno');
	// quartiere in cui sei: decide la mappa e i luoghi che si vedono
	const quartiere = $derived(stato ? (LUOGO[stato.luogo].quartiere ?? 'sakura') : 'sakura');
	const luoghiQui = $derived(LUOGHI.filter((l) => (l.quartiere ?? 'sakura') === quartiere));
	const stazioneOpposta = (id: LuogoId): LuogoId | null => (id === STAZIONI.sakura ? STAZIONI.ekimae : id === STAZIONI.ekimae ? STAZIONI.sakura : null);
	function treno(da: LuogoId): void {
		if (!stato) return;
		if (stato.luogo !== da) stato = viaggia(stato, da);
		const verso = stazioneOpposta(stato.luogo);
		if (!verso) return;
		infoLuogo = null;
		if (stato.soldi < TRENO.prezzo) {
			avvisa(L({ ja: 'お金が たりません。', it: 'Non hai abbastanza soldi.' }));
			return;
		}
		const prima = stato;
		viaggio = { da: stripFuriganaNotation(LUOGO[stato.luogo].nome), verso: stripFuriganaNotation(LUOGO[verso].nome) };
		stato = prendiTreno(stato, verso);
		notaCambi(prima, stato);
		salva();
		fase = 'treno';
	}
	// in treno: domande ★ che contano come domande d'esame; all'arrivo si entra in stazione
	let viaggio = $state<{ da: string; verso: string } | null>(null);
	function rispostaTreno(ok: boolean): void {
		if (!stato) return;
		stato = registraRisposta(stato, ok, { treno: true });
		salva();
	}
	function arrivoTreno(): void {
		if (!stato) return;
		viaggio = null;
		entra(stato.luogo, true);
	}
	const testo = (t: string): string => declina(conNome(t, imp.nome), imp.sesso);

	function avvisa(t: string): void {
		toast = t;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2600);
	}

	// ── timbri: quando uno sale di livello cade sul quaderno, con il suo suono
	const TOTALI_BASE = {
		chiacchiere: LUOGHI.reduce((n, l) => n + (l.chiacchiere?.length ?? 0), 0),
		persone: new Set(Object.entries(PERSONAGGI).filter(([, p]) => p.chi).map(([id, p]) => p.stesso ?? id)).size,
		missioni: ORDINE.length
	};
	const totali = $derived<Totali>({ ...TOTALI_BASE, stelleTre: ORDINE.filter((m) => stelle(imp.migliori?.[m.id]) === 3).length });
	const TIMBRI = $derived(timbri(totali));
	const voto = $derived(stato?.punteggi[missione.id]);
	const top = $derived(imp.migliori?.[missione.id]);
	let timbroNuovo = $state<{ kanji: string; ja: string; it: string; livello: number } | null>(null);
	let timbroTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (!stato) return;
		const ora = livelli(stato, totali);
		const visti = stato.timbri;
		// partita di prima dei timbri: quelli già meritati si segnano senza festa
		if (!visti) {
			stato = { ...stato, timbri: ora };
			return;
		}
		const nuovi = nuoviTimbri(visti, ora);
		if (!nuovi.length) return;
		// un timbro preso resta (anche se con nuove missioni il traguardo «tutte» si sposta)
		stato = { ...stato, timbri: { ...visti, ...Object.fromEntries(nuovi.map((k) => [k, ora[k]!])) } };
		salva();
		const vuota = !timbriInCoda.length && !timbroNuovo;
		timbriInCoda = [...timbriInCoda, ...nuovi.map((id) => { const tb = TIMBRI.find((t) => t.id === id)!; return { kanji: tb.kanji, ja: tb.ja, it: tb.it, livello: ora[id] ?? 1 }; })];
		if (vuota) prossimoTimbro();
	});
	// più timbri insieme: uno dopo l'altro
	let timbriInCoda: NonNullable<typeof timbroNuovo>[] = [];
	function prossimoTimbro(): void {
		if (timbroTimer) clearTimeout(timbroTimer);
		timbroNuovo = timbriInCoda.shift() ?? null;
		if (!timbroNuovo) return;
		if (imp.suoni) setTimeout(suono.timbro, 250);
		timbroTimer = setTimeout(prossimoTimbro, 2400);
	}

	function salva(): void {
		if (!stato) return;
		try {
			localStorage.setItem(chiaveSlot(), JSON.stringify(stato));
			if (slot === 'main') salvato = stato;
		} catch {
			/* niente storage */
		}
	}

	// ── nome: katakana o hiragana; il romaji si converte (luca → るか → ルカ)
	const nomeGiusto = (n: string): string => nomeKatakana(n, romajiToHiragana);


	function nuovaPartita(): void {
		if (salvato && !salvato.finita && !confirm(L(UI.sicuro))) return;
		fase = 'crea';
	}
	function comincia(): void {
		salvaImp();
		slot = 'main';
		azzeraStorico();
		stato = nuovoStato(imp.nome, 'm1');
		riprese = [];
		salvaRipresa(stato);
		salva();
		entra('casa');
	}
	// una missione mai finita, ma con la precedente completata: si comincia da lì
	// nella partita principale (es. dopo aver perso il salvataggio)
	const iniziabile = (id: string): boolean => {
		const i = ORDINE.findIndex((m) => m.id === id);
		return i > 0 && !imp.completate.includes(id) && imp.completate.includes(ORDINE[i - 1]!.id) && salvato?.missione !== id;
	};
	function iniziaDa(id: string): void {
		if (salvato && !salvato.finita && !confirm(L(UI.iniziaSicuro))) return;
		slot = 'main';
		azzeraStorico();
		stato = nuovoStato(imp.nome, id, MISSIONI[id]?.inizio);
		riprese = [];
		salvaRipresa(stato);
		salva();
		entra('casa');
	}
	function rigioca(id: string): void {
		slot = 'rigioca';
		azzeraStorico();
		stato = nuovoStato(imp.nome, id, MISSIONI[id]?.inizio);
		salva();
		entra('casa');
	}
	function continuaConProssima(): void {
		const base = stato && slot === 'main' ? stato : salvato;
		if (!base) return;
		const m = dopo(base.missione);
		if (!m) return;
		slot = 'main';
		caricaStorico();
		stato = prossimaMissione($state.snapshot(base) as Stato, m);
		salva();
		salvaRipresa(stato);
		mattino(stato.giorno);
		entra('casa');
	}
	function continuaRigioco(): void {
		if (!salvatoRigioco) return;
		slot = 'rigioca';
		caricaStorico();
		stato = ricostruisciIncontrati(pulisciObiettivi(salvatoRigioco, MISSIONI[salvatoRigioco.missione] ?? M1));
		riparti();
	}
	// il calendario: toccando la data, e da solo riaprendo una partita (dove eri rimasto)
	let calendario = $state<{ saluto: string | null } | null>(null);
	function nota(g: number, t: string): void {
		if (!stato) return;
		const note = { ...stato.note };
		if (t.trim()) note[g] = t;
		else delete note[g];
		stato = { ...stato, note };
		salva();
	}
	function continua(): void {
		if (!salvato) return;
		calendario = { saluto: lingua === 'ja' ? 'おかえりなさい！' : testo('Bentornat{o}!') };
		slot = 'main';
		caricaStorico();
		stato = ricostruisciIncontrati(pulisciObiettivi(salvato, MISSIONI[salvato.missione] ?? M1));
		if (stato.finita) fase = 'fine';
		else riparti();
	}

	// ── uscire: conferma se sei in partita
	const inPartita = $derived(fase === 'mappa' || fase === 'scena' || fase === 'giochi' || fase === 'treno');
	function esci(e: MouseEvent): void {
		if (inPartita && !confirm(L(UI.esci))) e.preventDefault();
	}
	function primaDiChiudere(e: BeforeUnloadEvent): void {
		if (!inPartita) return;
		e.preventDefault();
		e.returnValue = '';
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
		if (stato.minuti >= TARDI) {
			tornaADormire();
			return;
		}
		stato = viaggia(stato, dest);
		entra(dest);
	}

	// riapertura della partita: se una scena era a metà si riprende da lì,
	// altrimenti si entra nel luogo come sempre
	function riparti(): void {
		if (!stato) return;
		const resto = stato.scena;
		if (resto?.length) avvia(resto);
		else entra(stato.luogo);
	}

	function entra(dest: LuogoId, daTreno = false): void {
		if (!stato) return;
		const l = LUOGO[dest];
		const ap = apertura(l, stato);
		if (imp.suoni && ap === 'aperto') {
			if (dest === 'konbini' || dest === 'kissa' || dest === 'panya' || dest === 'hanaya') suono.campanello();
			else if (dest === 'eki') suono.stazione();
			else if (dest === 'parco' && !notte(stato.minuti)) suono.uccellini(2);
		}
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
			if (sc.ripeti) giro = { id: sc.id, ancora: false };
		} else if (dest === LUOGO_GIOCHI) {
			fase = 'giochi';
			salva();
		} else {
			// una chiacchiera nuova del luogo, se c'è; se no l'ambiente di sempre
			// le chiacchiere non partono da sole: c'è qualcuno, e scegli tu se parlarci
			const ch = chiacchieraPer(l, stato);
			const ambiente = l.ambiente ?? [{ narra: UI.niente.ja, it: UI.niente.it }];
			// in stazione: il treno si prende da qui
			const verso = daTreno ? null : stazioneOpposta(dest);
			const opzioni: Opzione[] = [];
			if (ch) {
				const chi = chiDi(ch);
				const nome = chi ? (PERSONAGGI[chi]?.nome ?? chi) : null;
				opzioni.push({ ja: nome ? `（${nome}と 話す）` : '（まわりを 見る）', it: nome ? `(Parla con ${stripFuriganaNotation(nome)})` : '(Guardati intorno)', passi: [{ sente: ch.id, ...(chi ? { chi } : {}) }, ...ch.passi] });
			}
			if (verso) opzioni.push({ ja: `（🚃 電車で ${LUOGO[verso].nome}へ　${TRENO.prezzo}円）`, it: `(🚃 In treno a ${stripFuriganaNotation(LUOGO[verso].nome)}, ¥${TRENO.prezzo})`, azione: 'treno' });
			if (opzioni.length) avvia([...ambiente, { scelta: [...opzioni, { ja: '（もう 行く）', it: '(Vai via)' }] }], true);
			else avvia(ambiente, true);
		}
	}

	// ── sala giochi: le partite cambiano lo stato (soldi, tempo, premi, classifica)
	function aggiornaGiochi(s: Stato): void {
		if (!stato) return;
		const prima = stato;
		stato = s;
		notaCambi(prima, s);
		salva();
	}
	function esciGiochi(): void {
		if (!stato) return;
		hush();
		if (stato.minuti >= TARDI) tornaADormire();
		else {
			fase = 'mappa';
			salva();
		}
	}

	let giornoScena = -1; // giorno in cui è cominciata la scena (per capire se si è dormito)
	// libera: chiacchiera o ambiente di un luogo, fuori dal voto della missione
	// scena ripetibile «con chi parli?»: finita una risposta si torna alla domanda,
	// finché non scegli l'opzione per andare via (quella senza passi)
	let giro: { id: string; ancora: boolean } | null = null;
	function avvia(passi: Passo[], libera = false): void {
		giro = null;
		if (stato) {
			giornoScena = stato.giorno;
			stato = { ...stato, libera: libera || undefined };
		}
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
		// si salva anche il resto della scena: chiudendo la pagina qui, si riprende da questo passo
		stato = { ...stato, scena: corrente ? [corrente, ...coda] : undefined };
		scelto = null;
		provaEsito = null;
		mostraIt = false;
		dividi = false;
		salva();
		if (!corrente) {
			finisciScena();
			return;
		}
		if (imp.suoni && ('dice' in corrente || 'narra' in corrente) && corrente.suono) suono[corrente.suono]();
		if ('dice' in corrente) {
			const c = PERSONAGGI[corrente.dice];
			if (c?.sprite) {
				parlante = corrente.dice;
				faccia = corrente.faccia ?? null;
			}
			if (corrente.taccuino) annota(corrente.dice, corrente.ja, corrente.it);
			conosci(corrente.dice);
			registra({ chi: corrente.dice, tipo: 'dice', sprite: c?.sprite ? `${c.sprite}${corrente.faccia ? `_${corrente.faccia}` : ''}` : null, ja: corrente.ja, it: corrente.it });
			if (imp.autoVoce) void voce(corrente.ja, c?.voce ?? 'F');
		} else if ('io' in corrente) {
			registra({ chi: null, tipo: 'io', sprite: null, ja: corrente.io, it: corrente.it });
			// la tua battuta con la tua voce, se non l'hai già detta tu al microfono
			if (imp.autoVoce && !corrente.detto) void voceMia(corrente.io);
		} else if ('pensa' in corrente) {
			registra({ chi: null, tipo: 'pensa', sprite: null, ja: corrente.pensa, it: corrente.it });
			if (imp.autoVoce) void voceMia(corrente.pensa, true);
		} else if ('narra' in corrente) {
			registra({ chi: null, tipo: 'narra', sprite: null, ja: corrente.narra, it: corrente.it });
		} else if ('domanda' in corrente) {
			// d'ascolto: prima l'annuncio (sempre, è la domanda), poi la domanda
			if (corrente.domanda.ascolto) void ascoltaDomanda(false);
			else if (imp.autoVoce) void voce(corrente.domanda.ja, 'F', false);
		} else if ('avviso' in corrente) {
			registra({ chi: null, tipo: 'narra', sprite: null, ja: `${corrente.avviso.titolo}：${corrente.avviso.righe.join(' ／ ')}`, it: corrente.avviso.it });
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
		if (imp.suoni && (nuovi.length || ob.length)) suono.din();
		if (b.giorno !== a.giorno) {
			salvaRipresa(b);
			mattino(b.giorno);
		}
		if (b.giorno !== a.giorno) msg.push(`🌙 ${lingua === 'ja' ? dataJa(b.giorno) : dataIt(b.giorno)}`);
		if (msg.length) avvisa(msg.join(' · '));
	}

	// stacco tra la notte e il mattino: la mappa di notte sfuma in quella di giorno
	let stacco = $state<number | null>(null);
	let staccoTimer: ReturnType<typeof setTimeout> | null = null;
	function mattino(giorno: number): void {
		stacco = giorno;
		if (imp.suoni) setTimeout(() => suono.uccellini(3), 900);
		if (staccoTimer) clearTimeout(staccoTimer);
		staccoTimer = setTimeout(() => (stacco = null), 3200);
	}

	// personaggi conosciuti (schede del taccuino): chi ha parlato, in ordine
	const scheda1 = (id: string): string | null => {
		const p = PERSONAGGI[id];
		const vero = p?.stesso ?? id;
		return PERSONAGGI[vero]?.chi ? vero : null;
	};
	function conosci(id: string): void {
		const v = scheda1(id);
		if (!stato || !v || stato.incontrati.includes(v)) return;
		stato = { ...stato, incontrati: [...stato.incontrati, v] };
	}
	// partite di prima delle schede: si ricostruiscono da storico e taccuino
	function ricostruisciIncontrati(s: Stato): Stato {
		if (s.incontrati.length) return s;
		const ids = [...storico.map((b) => b.chi ?? ''), ...s.taccuino.map((a) => a.chi)].map(scheda1).filter((x): x is string => !!x);
		return { ...s, incontrati: [...new Set(ids)] };
	}

	function annota(chi: string, ja: string, it: string): void {
		if (!stato) return;
		if (stato.taccuino.some((a) => a.ja === ja && a.giorno === stato!.giorno)) return;
		stato = { ...stato, taccuino: [...stato.taccuino, { giorno: stato.giorno, chi, ja, it }] };
	}

	function finisciScena(): void {
		if (!stato) return;
		parlante = null;
		if (stato.finita) {
			// anche finita a parte conta: la missione dopo si può cominciare
			if (!imp.completate.includes(stato.missione)) imp = { ...imp, completate: [...imp.completate, stato.missione] };
			// il miglior risultato resta (anche dai rigiochi)
			imp = { ...imp, migliori: { ...imp.migliori, [stato.missione]: unisci(imp.migliori?.[stato.missione], risultato(stato, missione)) } };
			salvaImpostazioni(imp);
			fase = 'fine';
			return;
		}
		// dopo una scena (o una notte) può essercene subito un'altra nello stesso luogo
		const l = LUOGO[stato.luogo];
		const sc = apertura(l, stato) === 'aperto' ? scenaPer(stato.luogo, stato, missione, true) : null;
		if (sc) {
			stato = { ...stato, fatte: [...stato.fatte, sc.id] };
			avvia(sc.passi);
			return;
		}
		// «con chi parli?»: si resta lì e si sceglie qualcun altro
		if (giro?.ancora && stato.minuti < TARDI && apertura(l, stato) === 'aperto') {
			const id = giro.id;
			const r = scenaPer(stato.luogo, stato, missione);
			if (r?.id === id) {
				avvia(r.passi);
				giro = { id, ancora: false };
				return;
			}
		}
		// ci si è appena svegliati e la storia non ha una scena: risveglio in casa
		if (stato.giorno !== giornoScena && stato.luogo === 'casa') {
			avvia([
				{ narra: '朝です。まどから 日が 入って います。', it: 'È mattina. Il sole entra dalla finestra.' },
				{ dice: 'mamma', ja: 'おはよう、{nome}さん。朝ご飯、できて いるよ。', it: 'Buongiorno, {nome}. La colazione è pronta.' },
				{ minuti: 20 }
			]);
			return;
		}
		// troppo tardi per girare: a casa (la cena se manca, altrimenti a letto)
		if (stato.minuti >= TARDI) {
			tornaADormire();
			return;
		}
		fase = 'mappa';
		salva();
	}
	function tornaADormire(): void {
		if (!stato) return;
		let aPiedi = false;
		if ((LUOGO[stato.luogo].quartiere ?? 'sakura') !== 'sakura') {
			aPiedi = stato.soldi < TRENO.prezzo;
			stato = prendiTreno(stato, 'eki');
		}
		if (stato.luogo !== 'casa') stato = viaggia(stato, 'casa');
		parlante = null;
		const sc = scenaPer('casa', stato, missione);
		const piedi: Passo[] = aPiedi ? [{ narra: 'お金が ないので、歩いて 帰りました。', it: 'Non avendo soldi per il treno, torni a piedi.' }] : [];
		if (sc) {
			stato = { ...stato, fatte: [...stato.fatte, sc.id] };
			avvia([{ narra: UI.tardi.ja, it: UI.tardi.it }, ...piedi, ...sc.passi]);
		} else avvia([{ narra: UI.tardi.ja, it: UI.tardi.it }, ...piedi, { dice: 'mamma', ja: 'おかえり。もう おそいから、早く ねなさい。', it: 'Bentornat{o}. È tardi, vai a letto.' }, { dormi: true }]);
	}

	// ── interazioni coi passi
	function scegli(i: number, detto = false): void {
		if (!corrente || !('scelta' in corrente)) return;
		const o = corrente.scelta[i]!;
		if (o.azione === 'treno' && stato) {
			coda = [];
			corrente = null;
			parlante = null;
			stato = { ...stato, scena: undefined };
			treno(stato.luogo);
			if (fase !== 'treno') fase = 'mappa'; // senza soldi: resta in stazione, sulla mappa
			return;
		}
		if (giro) giro.ancora = !!o.passi?.length;
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
	// opzioni della domanda corrente (quella sui soldi si costruisce dai soldi che hai)
	const soldiDomanda = $derived(corrente && 'domanda' in corrente && corrente.domanda.giusta === 'soldi' && stato ? opzioniSoldi(stato.soldi) : null);
	// le opzioni si mescolano a ogni domanda: la giusta non sta sempre allo stesso posto
	// (le domande sui soldi hanno già un ordine sensato, dal più al meno)
	const ordineDomanda = $derived.by(() => {
		if (!corrente || !('domanda' in corrente) || soldiDomanda) return null;
		const idx = corrente.domanda.opzioni.map((_, i) => i);
		for (let i = idx.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[idx[i], idx[j]] = [idx[j]!, idx[i]!];
		}
		return idx;
	});
	const opzioniDomanda = $derived.by(() => {
		const c = corrente;
		if (!c || !('domanda' in c)) return [];
		return soldiDomanda?.opzioni ?? (ordineDomanda ?? []).map((i) => c.domanda.opzioni[i]!);
	});
	function giustaDomanda(): number {
		if (!corrente || !('domanda' in corrente)) return -1;
		return soldiDomanda ? soldiDomanda.giusta : (ordineDomanda ?? []).indexOf(corrente.domanda.giusta as number);
	}
	function rispondi(i: number): void {
		if (!stato || scelto !== null) return;
		scelto = i;
		const ok = i === giustaDomanda();
		if (imp.suoni) (ok ? suono.giusto : suono.sbagliato)();
		// già contata: riaprendo la pagina non deve tornare la stessa domanda
		const d = 'domanda' in corrente! ? corrente.domanda : undefined;
		stato = { ...registraRisposta(stato, ok, { domanda: d, libera: stato.libera }), scena: coda.length ? [...coda] : undefined };
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
		if (stato.minuti >= TARDI) tornaADormire();
	}

	// ── voce e bocca
	// la fine di una battuta vecchia non deve fermare la bocca di quella nuova
	let turnoVoce = 0;
	async function voce(t: string, chi: 'F' | 'M', bocca = true): Promise<void> {
		const mio = ++turnoVoce;
		parla = bocca;
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(t)), vocePersonaggio(chi, imp));
		if (mio === turnoVoce) parla = false;
	}
	// voce di un personaggio senza bocca che si muove; lento = 🐢
	async function voceLenta(t: string, chi: 'F' | 'M', lento = false): Promise<void> {
		const v = vocePersonaggio(chi, imp);
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(t)), lento ? { ...v, rate: 0.6 } : v);
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
	// domanda d'ascolto: annuncio (più piano col 🐢) e poi la domanda
	async function ascoltaDomanda(lento: boolean): Promise<void> {
		if (!corrente || !('domanda' in corrente) || !corrente.domanda.ascolto) return;
		const d = corrente.domanda;
		hush();
		const v = vocePersonaggio(d.ascolto!.chi ?? 'F', imp);
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(d.ascolto!.ja)), lento ? { ...v, rate: 0.7 } : v);
		if (corrente === null || !('domanda' in corrente) || corrente.domanda !== d) return;
		await speakSentenceJapaneseAsync(stripFuriganaNotation(testo(d.ja)), vocePersonaggio('F', imp));
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
	const sprite = $derived(parlante && PERSONAGGI[parlante]?.sprite ? `${PERSONAGGI[parlante]!.sprite}${faccia ? `_${faccia}` : ''}` : null);
	const bocca = $derived(parla && corrente !== null && 'dice' in corrente && corrente.dice === parlante && tick % 4 < 2);
	$effect(() => {
		if (!sprite) return;
		for (const t of ['chiusa', 'parla']) new Image().src = `${base}/giorno/ritratti/${sprite}-${t}.png`;
	});

	// luoghi con qualcosa della storia da fare adesso (❗ sulla mappa)
	const conStoria = $derived.by(() => {
		const s = stato;
		if (!s) return new Set<LuogoId>();
		return new Set(luoghiQui.filter((l) => apertura(l, s) === 'aperto' && scenaPer(l.id, { ...s, minuti: s.minuti + (l.id === s.luogo ? 0 : VIAGGIO) }, missione)).map((l) => l.id));
	});
	// luoghi dove c'è qualcuno con cui parlare (💬 piccolo, il ripasso)
	const conChiacchiera = $derived.by(() => {
		const s = stato;
		if (!s) return new Set<LuogoId>();
		return new Set(luoghiQui.filter((l) => !conStoria.has(l.id) && apertura(l, s) === 'aperto' && chiacchieraPer(l, s)).map((l) => l.id));
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

	// ambiente solo sulla mappa: uccellini di giorno, grilli di notte
	$effect(() => {
		suono.ambiente(fase === 'mappa' && imp.suoni && imp.ambiente ? (tempoOra === 'pioggia' ? 'pioggia' : notturna ? 'notte' : 'giorno') : null);
	});

	onMount(() => {
		try {
			const raw = migra(JSON.parse(localStorage.getItem(SALVA) ?? 'null'));
			imp = caricaImpostazioni();
			if (raw) salvato = raw;
			const rg = migra(JSON.parse(localStorage.getItem(`${SALVA}_rigioca`) ?? 'null'));
			if (rg && !rg.finita) salvatoRigioco = rg;
			riprese = ((JSON.parse(localStorage.getItem(SALVA_RIPRESE) ?? '[]') as unknown[]) ?? []).map(migra).filter((x): x is Stato => x !== null);
			// partite finite prima che esistesse l'elenco delle missioni
			if (raw?.finita && !imp.completate.includes(raw.missione)) imp = { ...imp, completate: [...imp.completate, raw.missione] };
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
		suono.ambiente(null);
		if (staccoTimer) clearTimeout(staccoTimer);
	});
</script>

<svelte:window onbeforeunload={primaDiChiudere} />

<svelte:head>
	<title>事件 — さくら町</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
</svelte:head>

<div class="game">
	<div class="game-top">
		<a class="back" href="{base}/avventure" title={L(UI.indietro)} onclick={esci}>←<span class="largo"> {L(UI.indietro).replace('← ', '')}</span></a>
		<span class="barra">
			<button class="mini" onclick={() => (impostazioni = true)} title={L(UI.impostazioni)}>⚙️</button>
			{#if stato && fase !== 'inizio'}
				{@const aperti = stato.obiettivi.filter((o) => !o.fatto).length}
				<button class="mini" class:on={obAperti} onclick={() => (obAperti = !obAperti)}>🎯 {aperti}</button>
				<button class="mini" onclick={() => apriTaccuino('conversa')} title={L(UI.storico)}>📜<span class="largo"> {L(UI.storico).replace('📜 ', '')}</span></button>
				<button class="mini" onclick={() => apriTaccuino('obiettivi')} title={L(UI.ノート)}>📓<span class="largo"> {L(UI.ノート).replace('📓 ', '')}</span></button>
			{/if}
		</span>
	</div>
	{#if obAperti && stato && fase !== 'inizio'}
		<div class="obiettivo tendina">
			{#each stato.obiettivi.filter((o) => !o.fatto) as o (o.id)}<p>🎯 {@render testoUI({ ja: o.ja ?? o.it, it: o.it, en: o.en })}</p>{:else}<p>{L(UI.nessuno)}</p>{/each}
		</div>
	{/if}

{#snippet riepilogo(r: Risultato, m: Missione)}
	{@const x = manca(r, m)}
	<div class="riepilogo">
		<span class="barra"><span style="width: {x.fatto}%"></span></span>
		<span class="small"><b>{x.fatto}%</b> · <span class="stelle">{'★'.repeat(stelle(r))}<span class="spente">{'★'.repeat(3 - stelle(r))}</span></span> {percento(r)}% · 🎯 {r.obiettivi ?? 0}/{(r.obiettivi ?? 0) + x.obiettivi}{r.risolto === undefined ? '' : ` · ${r.risolto ? L(UI.risolto) : L(UI.nonRisolto)}`}</span>
		{#if x.fatto < 100}
			<span class="small manca">{L(UI.manca)}{[x.stelle ? '★★★ (90%)' : '', x.obiettivi ? `🎯 ${x.obiettivi} ${L(UI.mancaOb)}` : '', x.risolto ? `🕵️ ${L(UI.mancaRisolto)}` : ''].filter(Boolean).join(' · ')}</span>
		{:else}<span class="small">{L(UI.perfetta)}</span>{/if}
	</div>
{/snippet}

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
			<div class="row">
				{#if salvato?.finita && dopo(salvato.missione)}
					<button class="btn big" onclick={continuaConProssima}>{L(UI.vaiProssima)}「{dopo(salvato.missione)!.titolo}」</button>
				{/if}
				{#if salvato && !salvato.finita}
					<button class="btn big" onclick={continua}>{L(UI.continua)} ({salvato.nome}, {dataJa(salvato.giorno)} {hhmm(salvato.minuti)})</button>
				{/if}
				<button class="btn big" class:ghost={salvato && !salvato.finita} onclick={nuovaPartita}>{L(UI.nuova)}</button>
			</div>
			<p class="muted">{L(UI.missione1)}</p>
			{#if riprese.length > 1 && salvato && !salvato.finita}
				<details class="riprese">
					<summary>{L(UI.riprese)}</summary>
					<div class="row">
						{#each riprese.filter((x) => x.missione === salvato?.missione) as rp (rp.giorno)}
							<button class="btn small ghost" onclick={() => riprendi(rp)}>{dataJa(rp.giorno)} {L({ ja: '朝', it: 'mattina' })}</button>
						{/each}
					</div>
				</details>
			{/if}
			{#if imp.completate.length || salvatoRigioco}
				<h2 class="sotto">{L(UI.missioni)}</h2>
				<div class="missioni">
					{#each Object.values(MISSIONI) as m (m.id)}
						{@const r = imp.migliori?.[m.id] ?? (salvato && salvato.missione === m.id && !salvato.finita ? { ...risultato(salvato, m), risolto: undefined } : null)}
						<div class="missione">
							<span><strong><Frase text={m.titolo} /></strong> <small>{lingua === 'ja' ? '' : m.it}</small></span>
							<span class="small">{imp.completate.includes(m.id) ? L(UI.fatta) : salvato?.missione === m.id ? L(UI.inCorso) : ''}</span>
							{#if r}{@render riepilogo(r, m)}{:else if imp.completate.includes(m.id)}<span class="small riepilogo">{L(UI.senzaDati)}</span>{/if}
							{#if imp.completate.includes(m.id)}<button class="btn small ghost" onclick={() => rigioca(m.id)}>{L(UI.rigioca)}</button>
							{:else if iniziabile(m.id)}
								<button class="btn small" onclick={() => iniziaDa(m.id)}>{L(UI.iniziaQui)}</button>
								<button class="btn small ghost" onclick={() => rigioca(m.id)}>{L(UI.aParte)}</button>
							{/if}
						</div>
					{/each}
					{#if salvatoRigioco}<button class="btn small" onclick={continuaRigioco}>{L(UI.continuaRigioco)} ({salvatoRigioco.missione}, {dataJa(salvatoRigioco.giorno)} {hhmm(salvatoRigioco.minuti)})</button>{/if}
					<p class="small">{L(UI.rigiocoNota)}</p>
				</div>
			{/if}
		</section>
	{:else if fase === 'crea'}
		<section class="panel intro">
			<h1>🕵️ {L(UI.chiSei)}</h1>
			<label class="nome">{L(UI.nome)}
				<input bind:value={imp.nome} maxlength="12" onchange={salvaImp} />
			</label>
			<div class="row sesso">
				<span>{L(UI.sesso)}</span>
				<button class="btn small" class:ghost={imp.sesso !== 'M'} onclick={() => { imp.sesso = 'M'; salvaImp(); }}>👨 {L(UI.uomo)}</button>
				<button class="btn small" class:ghost={imp.sesso !== 'F'} onclick={() => { imp.sesso = 'F'; salvaImp(); }}>👩 {L(UI.donna)}</button>
			</div>
			<div class="row">
				<button class="btn small ghost" onclick={() => (impostazioni = true)}>{L(UI.impostazioni)} — {L(UI.voceTua)}</button>
			</div>
			<div class="row">
				<button class="btn big" onclick={comincia}>{L(UI.comincia)}</button>
				<button class="btn ghost" onclick={() => (fase = 'inizio')}>{L(UI.annulla)}</button>
			</div>
		</section>
	{:else if stato}
		<div class="hud">
			<button class="data" onclick={() => (calendario = { saluto: null })} title="📅">📅 {lingua === 'ja' ? dataJa(stato.giorno) : dataIt(stato.giorno)}</button>
			<span class="ora">{tempoOra !== 'sereno' ? ICONA_TEMPO[tempoOra] : notturna ? '🌙' : '☀️'} {hhmm(stato.minuti)} <small>{lingua === 'ja' ? fascia(stato.minuti) : ''}</small></span>
			{#if slot === 'rigioca'}<span class="rig">{L(UI.modoRigioco)}</span>{/if}
			<span class="soldi">¥{stato.oggetti.includes('portafoglio') ? stato.soldi : '—'}</span>
		</div>

		{#if fase === 'mappa'}
			{@const obiettivi = stato.obiettivi.filter((o) => !o.fatto)}
			<div class="vista-mappa">
			<div class="mappa-scroll" use:centra={stato.luogo}>
				<div class="mappa">
					<img src="{base}/giorno/mappa/{quartiere}-{notturna ? 'notte' : 'giorno'}.jpg" alt={quartiere} />
					{#if tempoOra !== 'sereno'}<div class="cielo {tempoOra}" class:notte={notturna}></div>{/if}
					{#each luoghiQui as l (l.id)}
						{@const ap = apertura(l, stato)}
						<button
							class="spot"
							class:qui={stato.luogo === l.id}
							class:chiuso={ap === 'chiuso'}
							class:bloccato={ap === 'bloccato'}
							class:storia={conStoria.has(l.id)}
							style="left:{l.x}%; top:{l.y}%"
							onclick={() => (infoLuogo = infoLuogo === l.id ? null : l.id)}
						>
							<span class="pin">{ap === 'bloccato' ? '🔒' : l.icona}{#if conStoria.has(l.id)}<b class="bang">!</b>{:else if conChiacchiera.has(l.id)}<b class="fumetto">💬</b>{/if}</span>
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
						{#if stazioneOpposta(l.id) && stato.flag.includes('treno.ok')}
							<button class="btn" onclick={() => treno(l.id)}>🚃 {nomeLuogo(stazioneOpposta(l.id)!)}{lingua === 'ja' ? 'へ' : ''} ({TRENO.minuti}{lingua === 'ja' ? '分' : ' min'}・¥{TRENO.prezzo})</button>
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
					{#if parlante && PERSONAGGI[parlante]?.schermo}
						<!-- la TV del salotto: dietro lo schermo trasparente, chi parla in TV -->
						<img class="in-tv" src="{base}/giorno/ritratti/{sprite}-{bocca ? 'parla' : 'chiusa'}.png" alt="" />
						<img class="scene" src="{base}/giorno/sfondi/tv_salotto.png" alt="" />
					{:else}
						<img class="scene" src={sfondo} alt="" />
						{#if sprite}<img class="sprite" src="{base}/giorno/ritratti/{sprite}-{bocca ? 'parla' : 'chiusa'}.png" alt="" />{/if}
					{/if}
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
						<p class="dname io">{imp.nome}{corrente.detto ? ' 🎤' : ''}</p>
						<p class="ja mia">「<Frase text={testo(corrente.io)} {dividi} />」</p>
						{#if mostraIt && corrente.it}<p class="it">{testo(corrente.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							<button class="btn ghost small" onclick={riascolta}>🔊</button>
							{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
							{#if !mostraIt && corrente.it}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'pensa' in corrente}
						<p class="dname io">💭 {imp.nome} <small>{L(UI.pensiero)}</small></p>
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
						<p class="dname io">{imp.nome} {L(UI.cosaDici)}</p>
						<div class="scelte">
							{#each corrente.scelta as o, i (i)}
								<button class="opzione" onclick={() => scegli(i)}>
									<span class="ja">{stripFuriganaNotation(testo(o.ja))}</span>
									{#if mostraIt && o.it}<small>{testo(o.it)}</small>{/if}
								</button>
							{/each}
						</div>
							<div class="row">
							{#if microfono}<button class="btn small" class:ascolta={ascolto} onclick={rispondiAVoce}>{ascolto ? L(UI.ascolto) : L(UI.dillo)}</button>{/if}
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
					{:else if 'domanda' in corrente}
						{@const g = giustaDomanda()}
						<p class="dname">{L(UI.domanda)}{corrente.domanda.ascolto ? ' 👂' : ''}</p>
						{#if corrente.domanda.ascolto}
							<!-- 聴解: il testo dell'annuncio si vede solo dopo la risposta -->
							<div class="row">
								<button class="btn small" onclick={() => ascoltaDomanda(false)}>{L(UI.ascoltaAncora)}</button>
								<button class="btn ghost small" onclick={() => ascoltaDomanda(true)}>{L(UI.ascoltaPiano)}</button>
							</div>
							{#if scelto !== null}
								<p class="trascritto"><Frase text={testo(corrente.domanda.ascolto.ja)} /></p>
								{#if mostraIt}<p class="it">{testo(corrente.domanda.ascolto.it)}</p>{/if}
							{/if}
						{/if}
						<p class="ja"><Frase text={testo(corrente.domanda.ja)} {dividi} /></p>
						{#if mostraIt}<p class="it">{testo(corrente.domanda.it)}</p>{/if}
						<div class="scelte">
							{#each opzioniDomanda as o, i (i)}
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
								<button class="btn ghost small" onclick={() => apriTaccuino('frasi')}>📓</button>
							</div>
						{/if}
					{:else if 'avviso' in corrente}
						{@const av = corrente.avviso}
						<div class="foglio" class:biglietto={av.tipo === 'biglietto' || av.tipo === 'lettera'}>
							<p class="f-titolo"><Frase text={testo(av.titolo)} {dividi} /></p>
							{#if av.righe.some((r) => r.includes('｜'))}
								<table>
									<tbody>
										{#each av.righe as r, i (i)}
											{#if r.includes('｜')}
												<tr><th><Frase text={testo(r.split('｜')[0]!)} /></th><td><Frase text={testo(r.split('｜').slice(1).join('｜'))} /></td></tr>
											{:else}
												<tr><td colspan="2"><Frase text={testo(r)} /></td></tr>
											{/if}
										{/each}
									</tbody>
								</table>
							{:else}
								{#each av.righe as r, i (i)}<p><Frase text={testo(r)} {dividi} /></p>{/each}
							{/if}
						</div>
						{#if mostraIt}<p class="it">{testo(av.it)}</p>{/if}
						<div class="row">
							<button class="btn" onclick={prossimo}>{L(UI.avanti)}</button>
							{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
						</div>
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
							<div class="row">
								{#if !dividi}<button class="btn ghost small" title="dividi in parole" onclick={() => (dividi = true)}>✂️</button>{/if}
								{#if !mostraIt}<button class="btn ghost small" onclick={() => (mostraIt = true)}>🇮🇹</button>{/if}
							</div>
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
		{:else if fase === 'treno' && viaggio}
			<ViaggioTreno da={viaggio.da} verso={viaggio.verso} minuti={TRENO.minuti} prezzo={TRENO.prezzo} {L} suoni={imp.suoni} risposta={rispostaTreno} arrivo={arrivoTreno} />
		{:else if fase === 'giochi'}
			<SalaGiochi {stato} {L} {lingua} suoni={imp.suoni} aggiorna={aggiornaGiochi} esci={esciGiochi} parla={voceLenta} {avvisa} />
		{:else if fase === 'fine'}
			<section class="panel intro">
				<h1>🎉 {missione.titolo}</h1>
				{#if missione.epilogo}<p class="paper">{@render testoUI(missione.epilogo)}</p>{/if}
				{#if top}{@render riepilogo(top, missione)}{/if}
				{#if voto?.tot}
					<p class="voto"><span class="stelle">{'★'.repeat(stelle(voto))}<span class="spente">{'★'.repeat(3 - stelle(voto))}</span></span> {L(UI.missioniVoti)}: <strong>{voto.ok}/{voto.tot}</strong>（{percento(voto)}%）</p>
					{#if top && percento(top) > percento(voto)}<p class="small">{L(UI.migliore)}{'★'.repeat(stelle(top))} {percento(top)}%</p>{/if}
				{:else}
					<p>{L(UI.punti)}<strong>{stato.domande.ok}/{stato.domande.tot}</strong></p>
				{/if}
				{#if slot === 'main' && dopo(missione.id)}
					<button class="btn big" onclick={continuaConProssima}>{L(UI.vaiProssima)}「{dopo(missione.id)!.titolo}」</button>
				{:else if !dopo(missione.id)}
					<p class="paper">{@render testoUI(UI.prossima)}</p>
				{/if}
				<div class="row">
					<button class="btn" onclick={() => apriTaccuino('conversa')}>{L(UI.rileggi)}</button>
					<button class="btn ghost" onclick={() => { if (slot === 'main') salvato = stato; else salvatoRigioco = null; slot = 'main'; fase = 'inizio'; }}>{L(UI.inizio)}</button>
				</div>
			</section>
		{/if}
	{/if}

	{#if stacco !== null}
		<div class="stacco" role="presentation" onclick={() => (stacco = null)}>
			<img class="notte" src="{base}/giorno/mappa/sakura-notte.jpg" alt="" />
			<img class="giorno" src="{base}/giorno/mappa/sakura-giorno.jpg" alt="" />
			<p>☀️ {lingua === 'ja' ? dataJa(stacco) : dataIt(stacco)}<small>{L(UI.mattino)}</small></p>
		</div>
	{/if}

	{#if toast}<div class="toast">{toast}</div>{/if}
	{#if calendario && stato}
		<Calendario {stato} {lingua} missioni={ORDINE} saluto={calendario.saluto} chiudi={() => (calendario = null)} {nota} />
	{/if}
	{#if timbroNuovo}
		{#key timbroNuovo}
		<div class="timbro-nuovo" role="presentation" onclick={prossimoTimbro}>
			<div class="cade"><Hanko kanji={timbroNuovo.kanji} livello={timbroNuovo.livello} grande /></div>
			<p><strong>{L(UI.nuovoTimbro)}</strong><br /><Frase text={timbroNuovo.ja} />{lingua !== 'ja' ? ` — ${timbroNuovo.it}` : ''} {'●'.repeat(timbroNuovo.livello)}{'○'.repeat(3 - timbroNuovo.livello)}</p>
		</div>
		{/key}
	{/if}

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
					<label class="check"><input type="checkbox" bind:checked={imp.suoni} onchange={() => { salvaImp(); if (imp.suoni) suono.campanello(); }} /> {L(UI.suoniUI)}</label>
					<label class="check"><input type="checkbox" bind:checked={imp.ambiente} onchange={() => { salvaImp(); if (imp.ambiente) suono.uccellini(1); }} /> {L(UI.ambienteUI)}</label>
					<label>{L(UI.linguaUI)}
						<select bind:value={imp.lingua} onchange={salvaImp}>
							<option value="ja">日本語</option><option value="it">Italiano</option>
						</select>
					</label>
					<button class="btn small" onclick={() => void voceMia(UI.frasePerProva.ja)}>{L(UI.provaVoce)}</button>
					<h3>{L(UI.salvataggi)}</h3>
					<div class="row">
						<button class="btn small ghost" onclick={esporta}>{L(UI.esporta)}</button>
						<label class="btn small ghost file">{L(UI.importa)}<input type="file" accept="application/json,.json" onchange={importa} /></label>
					</div>
				</div>
			</section>
		</div>
	{/if}

	{#if taccuino && stato}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) taccuino = false; }}>
			<section class="quaderno" style="--attiva: {['#d95763', '#5b6ee1', '#6abe30', '#df7126', '#37946e', '#76428a'][SCHEDE.findIndex((x) => x.id === scheda)]}">
				<nav class="segnalibri">
					{#each SCHEDE as sc, n (sc.id)}
						<button class="segnalibro s{n}" class:attivo={scheda === sc.id} onclick={() => apriTaccuino(sc.id)}>
							{L(sc.t).split(' ')[0]}<span class="largo"> {L(sc.t).split(' ').slice(1).join(' ')}</span>
						</button>
					{/each}
				</nav>
				<div class="pagina">
					<header>
						<h2>{L(SCHEDE.find((x) => x.id === scheda)!.t)} <small>— {imp.nome}{L(UI.taccuinoDi)}</small></h2>
						<button class="chiudi" onclick={() => (taccuino = false)}>✖</button>
					</header>
					{#if scheda === 'conversa'}
						{#if giorniStorico.length > 1}
							<div class="giorni">
								{#each giorniStorico as g (g)}
									<button class="giorno-tab" class:attivo={g === giornoStorico} onclick={() => { giornoStorico = g; storicoIt = []; }}>{dataJa(g).replace(/^\d+月/, '')}</button>
								{/each}
							</div>
						{/if}
						{#key giornoStorico}
							{#each battuteGiorno as { b, i }, n (i)}
								{#if n === 0 || battuteGiorno[n - 1]!.b.luogo !== b.luogo}
									<p class="quando">{hhmm(b.minuti)} · {LUOGO[b.luogo].icona} {nomeLuogo(b.luogo)}</p>
								{/if}
								<div class="battuta" class:mia={b.tipo === 'io' || b.tipo === 'pensa'} class:narrata={b.tipo === 'narra'}>
									<span class="faccina">
										{#if b.sprite}<img src="{base}/giorno/ritratti/{b.sprite}-chiusa.png" alt="" />
										{:else}{b.tipo === 'narra' ? '📖' : b.tipo === 'pensa' ? '💭' : b.chi ? '📞' : '🙂'}{/if}
									</span>
									<div class="testo">
										{#if b.tipo !== 'narra'}<p class="chi">{b.chi ? stripFuriganaNotation(PERSONAGGI[b.chi]?.nome ?? b.chi) : imp.nome}</p>{/if}
										<p class="ja">{b.tipo === 'io' ? '「' : b.tipo === 'pensa' ? '（' : ''}<Frase text={testo(b.ja)} />{b.tipo === 'io' ? '」' : b.tipo === 'pensa' ? '）' : ''}</p>
										{#if storicoIt.includes(i) && b.it}<p class="it">{testo(b.it)}</p>{/if}
									</div>
									<span class="tasti">
										<button class="tasto" title="🔊" onclick={() => riascoltaBattuta(b)}>🔊</button>
										{#if b.it && !storicoIt.includes(i)}<button class="tasto" onclick={() => (storicoIt = [...storicoIt, i])}>🇮🇹</button>{/if}
									</span>
								</div>
							{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
							<span use:inFondo></span>
						{/key}
					{:else if scheda === 'obiettivi'}
						{#each stato.obiettivi as o (o.id)}<p class="ob" class:fatto={o.fatto}>{o.fatto ? '☑' : '☐'} {@render testoUI({ ja: o.ja ?? o.it, it: o.it, en: o.en })}</p>{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
						<h3>{L(UI.domande)}</h3>
						<p>{stato.domande.ok}/{stato.domande.tot} {L(UI.giuste)}</p>
					{:else if scheda === 'oggetti'}
						<div class="oggetti">
							{#each stato.oggetti as o (o)}
								<span class="oggetto"><img src="{base}/giorno/oggetti/{iconaOggetto(o)}.png" alt="" /><span>{OGGETTI[o] ? stripFuriganaNotation(L(OGGETTI[o])) : o}</span></span>
							{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
						</div>
						{#if stato.collezione.length}
							<h3>{L(UI.sgCollezione)}</h3>
							<div class="oggetti">
								{#each stato.collezione as p, i (i)}
									<span class="oggetto"><img src="{base}/giorno/oggetti/{p.premio}.png" alt="" /><span>{p.ja}{p.lettura !== p.ja ? `（${p.lettura}）` : ''} {p.it}</span></span>
								{/each}
							</div>
						{/if}
					{:else if scheda === 'frasi'}
						{#each [...stato.taccuino].reverse() as a, i (i)}
							<div class="appunto">
								<p class="small">{dataJa(a.giorno)} · {stripFuriganaNotation(PERSONAGGI[a.chi]?.nome ?? a.chi)}</p>
								<p class="ja"><Frase text={testo(a.ja)} /></p>
								{#if rivelati.includes(i)}<p class="it">{testo(a.it)}</p>{:else}<button class="tasto" onclick={() => (rivelati = [...rivelati, i])}>🇮🇹</button>{/if}
							</div>
						{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
					{:else if scheda === 'persone'}
						{#each stato.incontrati as id (id)}
							{@const p = PERSONAGGI[id]!}
							<div class="persona">
								<span class="ritratto">{#if p.sprite}<img src="{base}/giorno/ritratti/{p.sprite}-chiusa.png" alt="" />{/if}</span>
								<div class="testo">
									<p class="nome-p">{stripFuriganaNotation(p.nome)} <small>{p.yomi}</small> <button class="tasto" title="🔊" onclick={() => void voce(p.yomi ?? p.nome, p.voce, false)}>🔊</button></p>
									<p class="ja"><Frase text={testo(p.chi!.ja)} /></p>
									{#if rivelatiP.includes(id)}<p class="it">{testo(L(p.chi!))}</p>{:else}<button class="tasto" onclick={() => (rivelatiP = [...rivelatiP, id])}>🇮🇹</button>{/if}
								</div>
							</div>
						{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
					{:else if scheda === 'timbri'}
						<h3>{L(UI.missioniVoti)}</h3>
						{#each ORDINE.filter((m) => stato!.punteggi[m.id]?.tot || imp.migliori?.[m.id]) as m (m.id)}
							{@const v = stato.punteggi[m.id]}
							{@const top = imp.migliori?.[m.id]}
							<p class="voto-riga"><span class="stelle">{'★'.repeat(stelle(top ?? v))}<span class="spente">{'★'.repeat(3 - stelle(top ?? v))}</span></span> <Frase text={m.titolo} /> <small>{v ? `${v.ok}/${v.tot}（${percento(v)}%）` : ''}{top && v !== top ? ` · ${L(UI.migliore)}${percento(top)}%` : ''}</small></p>
						{:else}<p class="vuoto">{L(UI.nessuno)}</p>{/each}
						{#if stato.ripasso.tot}<p class="small">{L(UI.ripasso)}: {stato.ripasso.ok}/{stato.ripasso.tot}（{percento(stato.ripasso)}%）</p>{/if}
						<h3>{L(UI.timbri)}</h3>
						<div class="timbri">
							{#each TIMBRI as tb (tb.id)}
								{@const v = valore(tb.id, stato, totali)}
								{@const lv = Math.max(livello(tb, v), stato.timbri?.[tb.id] ?? 0)}
								<div class="timbro-riga">
									<div class="tre">{#each [1, 2, 3] as k (k)}<Hanko kanji={tb.kanji} livello={lv >= k ? k : 0} />{/each}</div>
									<p><strong><Frase text={tb.ja} /></strong><br /><small>{tb.it} · {lv >= 3 ? L(UI.timbroMax) : `${L(UI.prossimoTimbro)}${Math.min(v, tb.soglie[lv]!)}/${tb.soglie[lv]}`}</small></p>
								</div>
							{/each}
						</div>
					{:else if scheda === 'percorso'}
						{#each giorniPercorso as g (g)}
							<p class="giro"><strong>{lingua === 'ja' ? dataJa(g) : dataIt(g)}</strong><br />{stato.percorso.filter((t) => t.giorno === g).map((t) => `${hhmm(t.minuti)} ${nomeLuogo(t.luogo)}`).join(' → ')}</p>
						{/each}
					{/if}
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
		/* nella griglia dell'app il margin auto la farebbe stringere al contenuto */
		width: 100%;
		max-width: 980px;
		margin: 0 auto;
	}
	/* telefono: niente zoom col doppio tocco (つぎへ toccato due volte), niente pagina più larga dello schermo */
	.game { overflow-x: clip; }
	.game :global(button), .game :global(a), .spot, .opzione { touch-action: manipulation; }
	.game input, .game select { font-size: 16px; }
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
	.nome input { font: inherit; font-size: 1.1rem; padding: 6px 8px; border: 3px solid var(--px-line); background: #353360; color: #f4f4f4; max-width: 220px; }
	.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.btn { font-family: inherit; background: #5b6ee1; color: #fff; border: 3px solid var(--px-line); box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8fa0ff; padding: 8px 14px; font-size: 0.95rem; cursor: pointer; }
	.btn.big { font-size: 1.05rem; padding: 12px 16px; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; }
	.mini { font-family: inherit; border: 2px solid var(--px-line); background: #353360; color: #f4f4f4; box-shadow: inset 0 0 0 1px #4f4c8a; padding: 3px 8px; cursor: pointer; font-size: 0.85rem; }
	.mini.on { background: #fbf236; color: #222034; }
	.muted, .small { font-size: 0.8rem; opacity: 0.85; margin: 0; }

	.hud { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: var(--px-bg); color: var(--px-ink); border: 3px solid var(--px-line); padding: 6px 10px; font-size: 0.95rem; }
	.hud small { opacity: 0.75; font-size: 0.75rem; }
	.hud .data { font: inherit; color: inherit; background: none; border: 0; border-bottom: 2px dotted currentColor; padding: 0; cursor: pointer; }
	.hud .soldi { margin-left: auto; color: #fbf236; }
	.obiettivo { background: #2a2848; color: #f4f4f4; border: 3px solid var(--px-line); border-left: 6px solid #fbf236; padding: 6px 10px; font-size: 0.85rem; display: grid; gap: 2px; }
	.obiettivo p { margin: 0; }

	.mappa-scroll { overflow-x: auto; border: 3px solid var(--px-line); }
	.mappa { position: relative; min-width: 720px; line-height: 0; }
	.mappa img { width: 100%; display: block; image-rendering: pixelated; }
	/* il tempo sulla mappa: velo e pioggia/vento animati, sotto i pin (che vengono dopo nel DOM) */
	.cielo { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
	.cielo.nuvoloso { background: rgba(70, 74, 100, 0.28); }
	.cielo.nebbia { background: rgba(232, 234, 242, 0.5); }
	.cielo.pioggia {
		background-color: rgba(40, 52, 86, 0.32);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg stroke='%23cfe0ff' stroke-width='1.5' stroke-opacity='.75'%3E%3Cpath d='M8 2 l-3 9'/%3E%3Cpath d='M27 14 l-3 9'/%3E%3Cpath d='M17 27 l-3 9'/%3E%3C/g%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cg stroke='%23ffffff' stroke-width='1' stroke-opacity='.55'%3E%3Cpath d='M12 6 l-2 6'/%3E%3Cpath d='M44 22 l-2 6'/%3E%3Cpath d='M30 44 l-2 6'/%3E%3Cpath d='M56 54 l-2 6'/%3E%3C/g%3E%3C/svg%3E");
		animation: piove 0.45s linear infinite;
	}
	.cielo.pioggia.notte { background-color: rgba(10, 14, 30, 0.25); }
	.cielo.vento {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Cg stroke='%23ffffff' stroke-width='1.5' stroke-opacity='.5' fill='none'%3E%3Cpath d='M10 12 q15 -4 30 0'/%3E%3Cpath d='M70 40 q15 -4 30 0'/%3E%3C/g%3E%3C/svg%3E");
		animation: vento 1.2s linear infinite;
	}
	@keyframes piove { to { background-position: -13px 40px, -6px 64px; } }
	@keyframes vento { to { background-position: -120px 0; } }
	@media (prefers-reduced-motion: reduce) { .cielo { animation: none !important; } }
	.spot { position: absolute; z-index: 1; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 2px; background: none; border: 0; cursor: pointer; padding: 0; line-height: 1; font-family: inherit; }
	.pin { position: relative; color: #222034; font-size: 1.25rem; background: rgba(255, 255, 255, 0.92); border: 2px solid var(--px-line); border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; box-shadow: 0 2px 0 var(--px-line); }
	/* ❗ grande, sopra tutto: i luoghi con qualcosa da fare stanno davanti agli altri */
	.spot.storia { z-index: 3; }
	.bang { position: absolute; top: -14px; right: -12px; width: 22px; height: 22px; border-radius: 50%; background: #d95763; color: #fff; border: 2px solid #fff; box-shadow: 0 1px 0 #0e0d1a; font: 900 0.95rem/18px system-ui, sans-serif; text-align: center; animation: salta 0.9s ease-in-out infinite; }
	@keyframes salta { 50% { transform: translateY(-4px); } }
	.fumetto { position: absolute; top: -10px; right: -10px; font-size: 0.8rem; line-height: 1; filter: drop-shadow(0 1px 0 #0e0d1a); }
	.etichetta { font-size: 0.7rem; background: rgba(34, 32, 52, 0.85); color: #fff; padding: 2px 5px; white-space: nowrap; }
	.spot.qui .pin { background: #fbf236; }
	.spot.chiuso .pin { opacity: 0.6; filter: grayscale(1); }
	.spot.bloccato { opacity: 0.75; }
	.spot.bloccato .etichetta { opacity: 0.7; }
	.info p { margin: 0; }

	.scene-wrap { position: relative; border: 3px solid #f4f4f4; outline: 3px solid #0e0d1a; line-height: 0; margin: 3px; background: #000; aspect-ratio: 2 / 1; overflow: hidden; }
	.scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
	/* posizione dello schermo in tv_salotto.png (elabora.cjs schermo), un filo più grande per coprire gli angoli */
	.in-tv { position: absolute; left: 32.9%; top: 18.6%; width: 34.1%; height: 53.2%; object-fit: cover; image-rendering: pixelated; }
	.sprite { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 92%; image-rendering: pixelated; }
	.luogo-tag { position: absolute; left: 6px; top: 6px; background: rgba(34, 32, 52, 0.85); color: #fff; padding: 3px 6px; font-size: 0.75rem; line-height: 1.2; }
	.dialog { --ink: #f4f4f4; --line: #6e6c8f; background: #2a2848; color: #f4f4f4; box-shadow: inset 0 0 0 2px #3f3f74; border: 3px solid var(--px-line); padding: 10px 12px; display: grid; gap: 8px; min-height: 120px; align-content: start; }
	.dialog p { margin: 0; }
	.dname { font-size: 0.8rem; font-weight: 700; color: #8fa0ff; }
	.dname.io { color: #ff9ec7; }
	.nota { margin-left: 6px; }
	.ja { font-size: 1.15rem; line-height: 1.7; }
	.it { font-size: 0.85rem; color: #b9b6dc; }
	.narra { font-style: italic; font-size: 0.92rem; }
	.scelte { display: grid; gap: 6px; }
	.opzione { font-family: inherit; text-align: left; background: #353360; border: 3px solid var(--px-line); padding: 8px 10px; cursor: pointer; display: grid; gap: 2px; color: #f4f4f4; box-shadow: inset 0 0 0 1px #4f4c8a; }
	.opzione .ja { font-size: 1.05rem; }
	.opzione small { color: #b9b6dc; font-size: 0.78rem; }
	.opzione:hover:not(:disabled) { background: #45437a; }
	.opzione.ok { background: #2f5a24; border-color: #99e550; }
	.opzione.ko { background: #5e2430; border-color: #d95763; }
	.esito { font-size: 0.88rem; padding: 6px 8px; background: #5e2430; }
	.esito.giusto { background: #2f5a24; }
	.fine { font-size: 1.1rem; }
	.oggetti { display: flex; flex-wrap: wrap; gap: 8px; }
	.oggetto { font-family: inherit; display: grid; justify-items: center; gap: 2px; width: 92px; background: #353360; color: #f4f4f4; border: 2px solid var(--px-line); padding: 6px 4px; cursor: pointer; font-size: 0.72rem; text-align: center; }
	.oggetto img { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
	.nessuno { font-size: 2rem; line-height: 48px; }

	.paper { --ink: #f4f4f4; --line: #6e6c8f; background: #2a2848; color: #f4f4f4; border: 3px solid var(--px-line); padding: 8px 10px; margin: 0; }
	ul.paper { padding-left: 1.6rem; display: grid; gap: 4px; }
	.nota-gioco { font-style: normal; background: #4a4420; color: #fff3b0; --ink: #fff3b0; padding: 4px 6px; }
	.spiega { font-size: 0.85rem; }
	.spiega summary { cursor: pointer; color: #8fa0ff; }
	.obiettivo { --ink: #f4f4f4; --line: #8a7f2a; }
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
	.mia { text-align: right; color: #ffc2dc; }
	.pensiero { color: #b8b5e0; font-style: italic; }
	.dname small { font-weight: 400; color: #9a98b5; }
	.narra.didascalia { background: #3f3f74; color: #f4f4f4; --ink: #f4f4f4; --line: #8f8dc0; padding: 8px 10px; border-left: 5px solid #fbf236; font-style: normal; }
	.btn.ascolta { background: #d95763; animation: pulsa 1s ease-in-out infinite; }
	@keyframes pulsa { 50% { opacity: 0.7; } }
	.sesso span { font-size: 0.9rem; }
	.imp { display: grid; gap: 10px; }
	.imp label { display: grid; gap: 4px; font-size: 0.88rem; }
	.imp label.check { display: flex; align-items: center; gap: 6px; }
	.imp input:not([type]), .imp select { font: inherit; padding: 5px 6px; border: 2px solid var(--px-line); background: #353360; color: #f4f4f4; }
	.sotto { margin: 6px 0 0; font-size: 1rem; }
	.missioni { display: grid; gap: 6px; }
	.missione { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: #2a2848; color: #f4f4f4; border: 3px solid var(--px-line); padding: 6px 8px; }
	.missione small { color: #b9b6dc; }
	.rig { background: #fbf236; color: #222034; padding: 0 6px; font-size: 0.8rem; }
	.riprese summary { cursor: pointer; font-size: 0.9rem; margin: 4px 0; }
	.file input { display: none; }
	.imp h3 { margin: 6px 0 0; font-size: 0.95rem; color: #fbf236; }
	.stacco { position: fixed; inset: 0; z-index: 60; background: #000; display: grid; place-items: center; cursor: pointer; animation: stacco-out 3.2s ease forwards; }
	.stacco img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
	.stacco .giorno { opacity: 0; animation: alba 2.2s ease 0.6s forwards; }
	.stacco p { position: relative; margin: 0; padding: 10px 18px; background: rgba(14, 13, 26, 0.75); color: #fff; font-size: 1.4rem; display: grid; justify-items: center; gap: 2px; border: 3px solid #fbf236; }
	.stacco p small { font-size: 0.85rem; color: #fbf236; }
	@keyframes alba { to { opacity: 1; } }
	@keyframes stacco-out { 0%, 85% { opacity: 1; } 100% { opacity: 0; } }
	.toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); background: #222034; color: #fff; border: 3px solid #fbf236; padding: 8px 14px; font-size: 0.9rem; z-index: 50; max-width: 90vw; }
	.overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 40; display: grid; place-items: start center; overflow-y: auto; padding: 20px 10px; }
	.taccuino { width: min(680px, 100%); }
	.taccuino header { display: flex; justify-content: space-between; align-items: center; }
	.taccuino h2 { margin: 0; font-size: 1.1rem; }
	.taccuino h3 { margin: 8px 0 2px; font-size: 0.95rem; color: #fbf236; }

	/* ── il quaderno: pagina a righe col margine rosso, segnalibri che sporgono in alto */
	.quaderno { width: min(720px, 100%); display: grid; }
	/* in basso allineati e attaccati alla pagina; spazio sopra perché lo scorrimento orizzontale non tagli gli angoli */
	.segnalibri { display: flex; align-items: flex-end; gap: 3px; padding: 10px 10px 0 52px; margin-bottom: -6px; overflow-x: auto; scrollbar-width: none; position: relative; z-index: 0; }
	/* segnalibri di carta colorata: bordo sottile, angoli tondi, fibra appena visibile */
	.segnalibro {
		--c: #5b6ee1;
		font-family: inherit; flex: none; cursor: pointer;
		background-color: var(--c);
		background-image: repeating-linear-gradient(100deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 6px), linear-gradient(rgba(255, 255, 255, 0.22), transparent 60%);
		color: #fff; font-size: 0.85rem; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(0, 0, 0, 0.3); border-bottom: 0; border-radius: 7px 7px 0 0;
		padding: 6px 11px 9px;
		box-shadow: 2px -1px 3px rgba(0, 0, 0, 0.2);
		transform-origin: bottom center; filter: saturate(0.6) brightness(0.82);
		transition: padding 0.12s, filter 0.12s;
	}
	.segnalibro:nth-child(odd) { rotate: -0.6deg; }
	.segnalibro:nth-child(even) { rotate: 0.5deg; }
	.segnalibro:hover { filter: saturate(0.85) brightness(0.93); padding-top: 8px; }
	/* quella scelta: piena, più alta, attaccata alla fascia colorata in cima alla pagina */
	/* quella scelta: colore pieno, un po' più alta, davanti alle altre */
	.segnalibro.attivo { filter: none; padding-top: 11px; z-index: 1; rotate: 0deg; font-weight: bold; box-shadow: 2px -2px 6px rgba(0, 0, 0, 0.35); }
	.segnalibro.s0 { --c: #d95763; }
	.segnalibro.s1 { --c: #5b6ee1; }
	.segnalibro.s2 { --c: #6abe30; }
	.segnalibro.s3 { --c: #df7126; }
	.segnalibro.s4 { --c: #37946e; }
	.segnalibro.s5 { --c: #76428a; }
	.segnalibro.s6 { --c: #c8102e; }
	.timbri { display: grid; gap: 4px; }
	.riepilogo { display: grid; gap: 2px; grid-column: 1 / -1; }
	.riepilogo .barra { height: 8px; background: #e8e0cc; border: 2px solid #0e0d1a; display: block; }
	.riepilogo .barra span { display: block; height: 100%; background: #6abe30; }
	.riepilogo .manca { color: #f2a7b0; }
	.timbro-riga { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; padding: 6px 0; border-bottom: 1px dashed #c9c3b0; }
	.timbro-riga p { margin: 0; }
	.timbro-riga .tre { display: flex; gap: 6px; }
	.stelle { color: #d9a520; letter-spacing: 1px; }
	.stelle .spente { color: #c9c3b0; }
	.voto { font-size: 1.1rem; }
	.voto .stelle { font-size: 1.4rem; }
	.voto-riga { margin: 4px 0; }
	.timbro-nuovo { position: fixed; inset: 0; z-index: 60; display: grid; place-content: center; justify-items: center; gap: 14px; background: rgba(14, 13, 26, 0.55); }
	.timbro-nuovo .cade { background: #fbf5e6; padding: 22px; border: 3px solid #0e0d1a; animation: cade 0.45s cubic-bezier(0.3, 1.6, 0.6, 1) both; }
	.timbro-nuovo p { background: #fbf5e6; color: #2a2620; border: 3px solid #0e0d1a; padding: 8px 14px; text-align: center; margin: 0; }
	@keyframes cade { from { transform: scale(2.4) rotate(-12deg); opacity: 0; } 60% { opacity: 1; } to { transform: scale(1) rotate(0); } }
	.pagina {
		--carta: #fbf6e9;
		--riga: #c9d6ea;
		--inchiostro: #2b2a3a;
		/* la carta è chiara anche col tema scuro: frasi spezzate e popup delle parole coi colori del tema chiaro */
		--ink: #2b2a3a;
		--muted: #5a5870;
		--line: #c9c3b0;
		--brand: #1b5fd1;
		--surface: #fffdf6;
		--success: #0f8f56;
		--warn-bg: #fffbeb;
		--warn-border: #fbbf24;
		--warn-ink: #92400e;
		position: relative; z-index: 1;
		background-color: var(--carta);
		background-image: linear-gradient(90deg, transparent 40px, #e39a9a 40px, #e39a9a 42px, transparent 42px), repeating-linear-gradient(var(--carta) 0 27px, var(--riga) 27px 28px);
		background-attachment: local;
		color: var(--inchiostro);
		border: 3px solid #2b2a3a;
		/* fascia in cima col colore del segnalibro scelto */
		border-top: 8px solid var(--attiva, #2b2a3a);
		box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35), inset -6px 0 0 #ece4cf;
		padding: 10px 14px 18px 54px;
		display: grid; gap: 4px; align-content: start;
		min-height: 60vh; max-height: calc(100vh - 90px); overflow-y: auto;
	}
	.pagina header { display: flex; justify-content: space-between; align-items: center; gap: 8px; position: sticky; top: -10px; background: var(--carta); padding: 4px 0; z-index: 3; border-bottom: 2px solid var(--inchiostro); }
	.pagina h2 { margin: 0; font-size: 1.1rem; }
	.pagina h2 small { font-size: 0.75rem; opacity: 0.6; }
	.pagina h3 { margin: 10px 0 2px; font-size: 0.95rem; color: #b23a48; }
	.pagina p { margin: 0; }
	.pagina .it { color: #6a6880; font-size: 0.85rem; }
	.pagina .small { font-size: 0.78rem; opacity: 0.7; }
	.pagina .vuoto { opacity: 0.6; font-size: 0.9rem; }
	.chiudi, .tasto, .giorno-tab { min-height: 0; line-height: 1.3; align-self: start; font-family: inherit; border: 2px solid var(--inchiostro); background: rgba(255, 255, 255, 0.6); color: var(--inchiostro); cursor: pointer; padding: 2px 7px; font-size: 0.85rem; }
	.chiudi:hover, .tasto:hover, .giorno-tab:hover { background: #fff; }
	.giorni { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
	.giorno-tab { font-size: 0.78rem; border-radius: 0; }
	.giorno-tab.attivo { background: #fbf236; }
	.quando { font-size: 0.78rem; color: #b23a48; margin-top: 8px !important; }
	.ob { font-size: 0.92rem; line-height: 1.8; }
	.ob.fatto { opacity: 0.55; text-decoration: line-through; }
	.giro { font-size: 0.85rem; line-height: 1.6; margin-bottom: 6px !important; }
	.pagina .oggetto { cursor: default; background: rgba(255, 255, 255, 0.55); color: var(--inchiostro); border: 2px dashed #8a8799; }
	.battuta { display: grid; grid-template-columns: 52px 1fr auto; gap: 8px; align-items: start; padding: 3px 0; }
	.battuta.narrata .ja { font-size: 0.9rem; font-style: italic; opacity: 0.85; }
	/* ritaglio più alto che largo: si vede tutta la faccia, dai capelli al mento */
	.faccina { width: 52px; height: 66px; overflow: hidden; background: #e8e0cc; border: 2px solid var(--inchiostro); display: grid; place-items: center; font-size: 1.2rem; }
	/* il ritratto è a mezzo busto: si mostra solo la testa */
	.faccina img { width: 150%; max-width: none; align-self: start; justify-self: center; image-rendering: pixelated; }
	.battuta .testo { display: grid; gap: 1px; min-width: 0; }
	.battuta .chi { font-size: 0.72rem; color: #3f5aa8; }
	.battuta.mia .chi { color: #3d7a24; }
	/* le tue battute: stesso inchiostro, allineate a sinistra come le altre */
	.battuta.mia { text-align: left; color: var(--inchiostro); }
	.battuta.mia .ja { color: #2f5d1c; }
	.battuta .ja { font-size: 1rem; line-height: 1.6; }
	.battuta .tasti { display: flex; gap: 4px; }
	.persona { display: grid; grid-template-columns: 84px 1fr; gap: 10px; align-items: start; padding: 6px 0; border-bottom: 1px dashed #c9c3b0; }
	.persona .ritratto { width: 84px; height: 108px; overflow: hidden; background: #e8e0cc; border: 2px solid var(--inchiostro); display: grid; }
	.persona .ritratto img { width: 140%; max-width: none; justify-self: center; image-rendering: pixelated; }
	.persona .testo { display: grid; gap: 2px; justify-items: start; min-width: 0; }
	.nome-p { font-size: 1.05rem; font-weight: bold; }
	.nome-p small { font-weight: normal; font-size: 0.8rem; color: #5a5870; margin: 0 4px; }
	/* fogli da leggere (avvisi, volantini, biglietti) come all'esame */
	.foglio { --ink: #2b2a3a; --muted: #5a5870; --line: #c9c3b0; --brand: #1b5fd1; --surface: #fffdf6; background: #fbf6e9; color: #2b2a3a; border: 2px solid #2b2a3a; box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35); padding: 10px 14px; display: grid; gap: 4px; font-size: 1rem; line-height: 1.6; }
	.foglio.biglietto { background: #fff7c2; rotate: -0.8deg; font-style: italic; }
	.foglio p { margin: 0; }
	.f-titolo { font-weight: bold; font-size: 1.1rem; text-align: center; border-bottom: 2px solid #2b2a3a; padding-bottom: 2px; }
	.foglio table { border-collapse: collapse; width: 100%; }
	.foglio th, .foglio td { border-bottom: 1px dashed #b9b3a0; padding: 3px 6px; text-align: left; vertical-align: top; }
	.foglio th { white-space: nowrap; color: #b23a48; font-weight: normal; }
	.trascritto { background: #353360; padding: 6px 8px; border-left: 4px solid #fbf236; }
	.appunto { border-left: 3px solid #df7126; padding-left: 8px; display: grid; gap: 2px; justify-items: start; margin-bottom: 4px; }
	.appunto .ja { font-size: 1rem; }
	@media (max-width: 600px) {
		.pagina { padding-left: 46px; background-image: linear-gradient(90deg, transparent 34px, #e39a9a 34px, #e39a9a 36px, transparent 36px), repeating-linear-gradient(var(--carta) 0 27px, var(--riga) 27px 28px); }
		.segnalibri { padding-left: 40px; }
		.battuta { grid-template-columns: 44px 1fr auto; gap: 6px; }
		.faccina { width: 44px; height: 56px; }
		.battuta .tasti { flex-direction: column; gap: 2px; }
		.tasto { padding: 1px 4px; font-size: 0.75rem; }
	}
</style>
