<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { base } from '$app/paths';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import ExamPrompt from '$lib/components/ExamPrompt.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import { examStrip } from '$lib/data/kanjiN4';
	import { speakExamListening, speakExamChoices } from '$lib/core/examListening';
	import { detectGrammar } from '$lib/core/examGrammar';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { mondaiKey, EXAM_N4_SCORING, EXAM_N4_HOT_POINTS, MONDAI_GIOCHI_UTILI, CONSEGNE } from '$lib/data/esame-n4';
	import { buildMock, buildSet, buildWeakFocus, setTotalMinutes, type Mock, type ProvaQuestion } from '$lib/data/esame-n4-prova';
	import { EXAM_SETS } from '$lib/data/esame-n4';
	import { loadMondaiMastery } from '$lib/db/queries';
	import TimeClock from '$lib/components/TimeClock.svelte';
	import { generaDaCatalogo } from '$lib/data/esame-n4-genera';

	type Mode = 'renshu' | 'honban' | 'challenge' | 'campione';
	type Difficolta = 'facile' | 'esame';
	type Phase = 'setup' | 'running' | 'section-done' | 'results';

	interface Ans {
		q: ProvaQuestion;
		picked: number | null;
		correct: boolean;
		timeSec: number;
		answered: boolean;
	}

	let phase = $state<Phase>('setup');
	// Due assi INDIPENDENTI: la modalità decide gli aiuti/il blocco del tempo;
	// la difficoltà agisce SOLO sulla presentazione (furigana + spaziatura).
	let mode = $state<Mode>('honban'); // default: esame reale
	let difficolta = $state<Difficolta>('esame'); // default: presentazione autentica
	const qFurigana = $derived(difficolta === 'facile'); // Facile: furigana + spazi
	const timeFactor = $derived(mode === 'campione' ? 0.8 : 1); // 🏆 −20%
	const perQuestionLimit = $derived(mode === 'challenge' || mode === 'campione');
	let selectedSet = $state<string | null>(null); // default: prova ufficiale (casuale, conteggi/tempi reali)
	let continua = $state(false); // ♾️ flusso infinito senza timer, si ricostruisce da solo
	// Mini esami (pochi item, tutti i tipi) vs Extra (varianti curate lunghe).
	const MINI_IDS = new Set(['set-1', 'set-2']);
	const miniSets = EXAM_SETS.filter((s) => MINI_IDS.has(s.id));
	const extraSets = EXAM_SETS.filter((s) => !MINI_IDS.has(s.id));
	let mock = $state<Mock | null>(null);
	let secIndex = $state(0);
	let qIndex = $state(0);
	let picked = $state<number | null>(null);
	let showTip = $state(false);
	let answers = $state<Ans[]>([]);
	let secRemaining = $state(0);
	let qElapsed = $state(0);
	let totalElapsed = $state(0); // tempo totale della prova (scorre sempre)
	let paused = $state(false);

	let qStart = 0;
	let ticker: ReturnType<typeof setInterval> | null = null;

	// Inattività: se l'utente sparisce, non far correre il timer all'infinito.
	// Soglia ampia (3 min) perché leggere un brano è attività legittima ma silenziosa;
	// e conta come attività anche mouse/scroll/touch, non solo tap/tasti.
	const IDLE_MS = 180_000; // 3 min senza NESSUNA interazione → chiedi conferma
	const GRACE_MS = 30_000; // 30s senza risposta → sospendi e torna alla home
	const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'mousemove', 'wheel', 'touchmove', 'scroll'] as const;
	let idlePrompt = $state(false);
	let lastActivity = Date.now();
	let promptAt = 0;
	let activityHandler: (() => void) | null = null;
	function registerActivity() {
		lastActivity = Date.now();
		if (idlePrompt) {
			idlePrompt = false;
			promptAt = 0;
			qStart = Date.now() - qElapsed * 1000; // non contare il tempo di assenza
		}
	}
	let autoTimer: ReturnType<typeof setTimeout> | null = null;
	let autoCancel: (() => void) | null = null;
	function clearAuto() {
		if (autoTimer) {
			clearTimeout(autoTimer);
			autoTimer = null;
		}
		if (autoCancel) {
			document.removeEventListener('pointerdown', autoCancel, true);
			autoCancel = null;
		}
	}
	// Avanzamento automatico (solo 練習, risposta giusta): un qualsiasi tocco lo
	// annulla — così puoi aprire l'Approfondisci sulla parola senza che scappi.
	function scheduleAuto() {
		clearAuto();
		autoCancel = () => clearAuto();
		document.addEventListener('pointerdown', autoCancel, true);
		autoTimer = setTimeout(() => {
			clearAuto();
			next();
		}, 2000);
	}

	// ── Persistenza (pausa/ripresa, niente perdita progressi) ──────────────
	const KEY = 'esame:prova:v1';
	interface Snapshot {
		mode: Mode;
		difficolta: Difficolta;
		mock: Mock;
		secIndex: number;
		qIndex: number;
		answers: Ans[];
		secRemaining: number;
		totalElapsed: number;
		phase: Phase;
		picked: number | null; // risposta in corso (perché il feedback resti dopo un Approfondisci)
		showTip: boolean;
		qElapsed: number; // tempo già trascorso sulla domanda corrente
		savedAt: number;
	}
	let saved = $state<Snapshot | null>(null);
	let leaving = false; // salta la conferma quando usciamo di proposito

	function saveState() {
		if (!mock || (phase !== 'running' && phase !== 'section-done')) return;
		const snap: Snapshot = { mode, difficolta, mock, secIndex, qIndex, answers, secRemaining, totalElapsed, phase, picked, showTip, qElapsed, savedAt: Date.now() };
		try {
			localStorage.setItem(KEY, JSON.stringify(snap));
		} catch {
			/* storage pieno/negato: la prova continua comunque */
		}
	}
	function clearSaved() {
		try {
			localStorage.removeItem(KEY);
		} catch {
			/* ignora */
		}
		saved = null;
	}

	onMount(() => {
		loadStorico();
		// Preselezione dalla landing: /esame/prova?tipo=esami|casuale|mini|continua|deboli
		const tipo = new URLSearchParams(window.location.search).get('tipo');
		const preset: Record<string, string | null> = {
			esami: 'ufficiale-1',
			casuale: null,
			mini: miniSets[0]?.id ?? 'set-1',
			continua: 'continua',
			deboli: 'weak'
		};
		if (tipo && tipo in preset) selectedSet = preset[tipo]!;
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) saved = JSON.parse(raw) as Snapshot;
		} catch {
			saved = null;
		}
		// 練習: torni da un Approfondisci → riprende da solo (come lo studio).
		// 本番: la sessione va ripresa di proposito (card «Riprendi» / avviso home).
		if (saved && saved.mode === 'renshu' && (saved.phase === 'running' || saved.phase === 'section-done')) {
			resume();
		}
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (phase === 'running' || phase === 'section-done') {
				saveState();
				e.preventDefault();
				e.returnValue = '';
			}
		};
		// App in background (tab nascosta): metti in pausa l'esame.
		const onVis = () => {
			if (document.hidden && phase === 'running' && !paused) togglePause();
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		document.addEventListener('visibilitychange', onVis);
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			document.removeEventListener('visibilitychange', onVis);
		};
	});

	beforeNavigate((nav) => {
		if (leaving) return;
		if (phase === 'running' || phase === 'section-done') {
			saveState();
			// Solo l'esame vero (本番) chiede conferma e va ripreso di proposito;
			// in allenamento esci per l'Approfondisci e torni: riprende da solo.
			if (mode === 'honban') {
				const ok = confirm('Uscire dall’esame? La sessione resta salvata: potrai riprenderla dalla pagina Esame o dalla home.');
				if (!ok) nav.cancel();
			}
		}
	});

	function resume() {
		if (!saved) return;
		mode = saved.mode;
		difficolta = saved.difficolta;
		mock = saved.mock;
		secIndex = saved.secIndex;
		qIndex = saved.qIndex;
		answers = saved.answers;
		secRemaining = saved.secRemaining;
		totalElapsed = saved.totalElapsed ?? 0;
		phase = saved.phase;
		picked = saved.picked ?? null;
		showTip = saved.showTip ?? false;
		paused = false;
		idlePrompt = false;
		if (phase === 'running') {
			qElapsed = saved.qElapsed ?? 0;
			qStart = Date.now() - qElapsed * 1000;
			runTicker();
			// Non rigiocare l'audio se la domanda era già stata risposta (feedback aperto).
			if (picked === null) maybePlayListening();
		}
	}

	function abandon() {
		stopTicker();
		clearSaved();
		leaving = true;
		goto(`${base}/esame`);
	}
	function exitAndSave() {
		stopTicker();
		saveState();
		leaving = true;
		goto(`${base}/esame`);
	}
	function togglePause() {
		if (phase !== 'running') return;
		paused = !paused;
		if (paused) {
			idlePrompt = false;
			stopTicker();
			clearAuto();
			saveState();
		} else {
			qStart = Date.now() - qElapsed * 1000;
			runTicker();
		}
	}

	const sezione = $derived(mock?.sezioni[secIndex] ?? null);
	const q = $derived(sezione?.questions[qIndex] ?? null);
	const isLastSection = $derived(!!mock && secIndex >= mock.sezioni.length - 1);
	// Ascolto: il testo è la soluzione → resta nascosto finché non si risponde.
	const isListening = $derived(q?.sezione === 'choukai');
	// 発話表現/即時応答: opzioni SOLO AUDIO come all'esame (testo svelato dopo la risposta).
	const audioOnly = $derived(q?.mondaiSlug === 'hatsuwa' || q?.mondaiSlug === 'sokuji');
	const revealText = $derived(!isListening || (picked !== null && mode === 'renshu'));
	// Riproduce l'audio giusto per il tipo. UN SOLO punto: così domanda, feedback e
	// review usano SEMPRE le stesse voci (utente lamentava voci diverse nella risposta).
	function playFor(qq: ProvaQuestion, rate = 1) {
		if (qq.sezione !== 'choukai') { speak(qq.prompt, rate); return; }
		if (qq.mondaiSlug === 'hatsuwa' || qq.mondaiSlug === 'sokuji')
			speakExamChoices(qq.prompt, qq.choices, qq.mondaiSlug as 'hatsuwa' | 'sokuji', rate);
		else speakExamListening(qq.prompt, rate);
	}
	function playCurrent(rate = 1) {
		if (q) playFor(q, rate);
	}

	function fmt(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function stopTicker() {
		if (ticker) {
			clearInterval(ticker);
			ticker = null;
		}
		if (activityHandler) {
			for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, activityHandler, true);
			activityHandler = null;
		}
	}

	// Inattività prolungata senza risposta: salva, sospendi e torna alla home
	// (l'esame resta ripristinabile dal banner in home / dalla pagina Esame).
	function idleTimeout() {
		idlePrompt = false;
		stopTicker();
		saveState();
		leaving = true;
		goto(`${base}/`);
	}
	onDestroy(() => {
		stopTicker();
		clearAuto();
		stopSpeaking();
	});

	function runTicker() {
		stopTicker();
		lastActivity = Date.now();
		activityHandler = () => registerActivity();
		for (const e of ACTIVITY_EVENTS) window.addEventListener(e, activityHandler, true);
		ticker = setInterval(() => {
			// in attesa di conferma «sei ancora qui?»: tempo congelato
			if (idlePrompt) {
				if (Date.now() - promptAt > GRACE_MS) idleTimeout();
				return;
			}
			// nessuna interazione da troppo tempo: chiedi conferma (e congela)
			if (Date.now() - lastActivity > IDLE_MS) {
				idlePrompt = true;
				promptAt = Date.now();
				return;
			}
			// 練習: mentre studi la risposta (feedback aperto) il tempo si ferma.
			if (mode === 'renshu' && picked !== null) return;
			qElapsed = Math.floor((Date.now() - qStart) / 1000);
			totalElapsed += 1;
			// ⚡/🏆: timer per singola domanda; scaduto = persa, avanza.
			if ((mode === 'challenge' || mode === 'campione') && picked === null && q) {
				if (qElapsed >= Math.round(q.tempoSec * timeFactor)) {
					timeoutQuestion();
					return;
				}
			}
			if (mode === 'honban') {
				secRemaining -= 1;
				if (secRemaining <= 0) endSection();
			}
		}, 1000);
	}

	function startSection() {
		if (!sezione) return;
		qIndex = 0;
		picked = null;
		showTip = false;
		paused = false;
		idlePrompt = false;
		secRemaining = sezione.tempoMin * 60;
		qStart = Date.now();
		qElapsed = 0;
		phase = 'running';
		runTicker();
		maybePlayListening();
		saveState();
	}

	async function start() {
		clearSaved();
		const extra = await generaDaCatalogo();
		const ufficiale = selectedSet?.startsWith('ufficiale-') ? Number(selectedSet.slice('ufficiale-'.length)) : null;
		// ♾️ Continua: flusso infinito senza timer → sempre 練習 (feedback subito),
		// pesca casuale dal catalogo; a fine giro si ricostruisce da solo.
		continua = selectedSet === 'continua';
		if (continua) {
			mode = 'renshu';
			mock = buildMock({ extra, difficolta });
		} else if (selectedSet === 'weak') {
			const mastery = await loadMondaiMastery();
			mock = buildWeakFocus(mastery, { extra, difficolta }) ?? buildMock({ extra, difficolta });
		} else if (ufficiale != null) {
			// Prova ufficiale FISSA: seed deterministico, solo pool curato (niente
			// `extra` dal catalogo) → identica a ogni apertura e su ogni dispositivo.
			mock = buildMock({ seed: 1000 + ufficiale, difficolta });
		} else if (selectedSet) {
			mock = buildSet(selectedSet) ?? buildMock({ extra, difficolta });
		} else {
			mock = buildMock({ extra, difficolta });
		}
		secIndex = 0;
		answers = [];
		totalElapsed = 0;
		startSection();
	}

	function answer(i: number) {
		if (picked !== null || !q) return;
		picked = i;
		const timeSec = Math.max(0, Math.round((Date.now() - qStart) / 1000));
		answers.push({ q, picked: i, correct: i === q.correct, timeSec, answered: true });
		saveState();
		// 練習: avanzamento automatico se giusto (come il ripasso normale). Se
		// sbagli, resti sulla domanda per studiare con l'Approfondisci.
		if (mode === 'renshu' && i === q.correct) scheduleAuto();
	}

	// ⚡/🏆: tempo della domanda scaduto → contata come non risposta, si avanza.
	function timeoutQuestion() {
		if (!q || picked !== null) return;
		answers.push({ q, picked: null, correct: false, timeSec: Math.round(q.tempoSec * timeFactor), answered: false });
		saveState();
		next();
	}

	function next() {
		clearAuto();
		if (!sezione) return;
		if (qIndex + 1 >= sezione.questions.length) {
			endSection();
		} else {
			qIndex += 1;
			picked = null;
			showTip = false;
			qStart = Date.now();
			qElapsed = 0;
			maybePlayListening();
			saveState();
		}
	}

	function endSection() {
		stopTicker();
		// Domande non raggiunte (timer scaduto): contate come non risposte.
		// Dedupe per-prompt (le referenze cambiano dopo una ripresa da localStorage).
		if (sezione) {
			for (let k = qIndex; k < sezione.questions.length; k += 1) {
				const target = sezione.questions[k]!;
				const already = answers.some((a) => a.q.prompt === target.prompt && a.q.mondaiSlug === target.mondaiSlug);
				if (!already) {
					answers.push({ q: target, picked: null, correct: false, timeSec: 0, answered: false });
				}
			}
		}
		// ♾️ Continua: niente schermata di fine sezione né risultati — scorre e basta.
		if (continua) {
			if (isLastSection) {
				// ricostruisce un nuovo giro casuale e riparte (le risposte si sommano)
				generaDaCatalogo().then((extra) => {
					mock = buildMock({ extra, difficolta });
					secIndex = 0;
					startSection();
				});
			} else {
				continueNextSection();
			}
			return;
		}
		if (isLastSection) finish();
		else {
			phase = 'section-done';
			saveState();
		}
	}

	function continueNextSection() {
		secIndex += 1;
		startSection();
	}

	// ♾️ Continua: chiude il flusso e mostra il riepilogo di quanto fatto finora.
	function terminaContinua() {
		continua = false;
		finish();
	}

	async function finish() {
		stopTicker();
		clearAuto();
		clearSaved();
		phase = 'results';
		// Credito ai punti deboli d'esame per ogni domanda risposta.
		for (const a of answers) {
			if (a.answered) await recordPractice(mondaiKey(a.q.mondaiSlug), a.correct);
		}
		saveStorico({ t: Date.now(), giuste, totali, ll: stima.llPunti, as: stima.asPunti, pass: stima.passato });
	}

	function ripassoMirato() {
		selectedSet = 'weak';
		start();
	}

	function speak(text: string, rate = 1) {
		stopSpeaking();
		speakSentenceJapanese(text, { rate });
	}

	// «Non la so»: rivela la risposta e l'Approfondisci, conta come non data.
	function dontKnow() {
		answer(-1);
	}

	// Link «Approfondisci» per la domanda: trucchi che allenano quel 問題 + drill/forme.
	function truccoLinksFor(slug: string) {
		return EXAM_N4_HOT_POINTS.filter((h) => h.mondai.includes(slug)).map((h) => ({ id: h.id, label: h.label }));
	}

	// Nota del perché una scelta sbagliata è errata (le note escludono la giusta).
	function wrongNote(q: ProvaQuestion, optionIndex: number): string {
		if (!q.perche_sbagliate.length) return '';
		let k = 0;
		for (let j = 0; j < q.choices.length; j += 1) {
			if (j === q.correct) continue;
			if (j === optionIndex) return q.perche_sbagliate[k] ?? '';
			k += 1;
		}
		return '';
	}

	// Ascolto: audio automatico all'apertura della domanda (le ripetizioni
	// manuali もう一度/🐢 non ricontano — l'esame dà max 2 ascolti, qui liberi
	// in allenamento).
	function maybePlayListening() {
		const cur = sezione?.questions[qIndex];
		if (!cur || cur.sezione !== 'choukai') return;
		const audio = cur.mondaiSlug === 'hatsuwa' || cur.mondaiSlug === 'sokuji';
		setTimeout(() => {
			if (audio) speakExamChoices(cur.prompt, cur.choices, cur.mondaiSlug as 'hatsuwa' | 'sokuji');
			else speakExamListening(cur.prompt);
		}, 150);
	}

	// ── Risultati ──────────────────────────────────────────────────────────
	interface MondaiStat {
		slug: string;
		titolo: string;
		giuste: number;
		totali: number;
		tempoMedio: number;
		target: number;
	}
	const perMondai = $derived.by<MondaiStat[]>(() => {
		const map = new Map<string, MondaiStat>();
		for (const a of answers) {
			const s = a.q.mondaiSlug;
			const cur = map.get(s) ?? { slug: s, titolo: a.q.mondaiTitolo, giuste: 0, totali: 0, tempoMedio: 0, target: a.q.tempoSec };
			cur.totali += 1;
			if (a.correct) cur.giuste += 1;
			cur.tempoMedio += a.timeSec;
			map.set(s, cur);
		}
		const out = [...map.values()];
		for (const s of out) s.tempoMedio = s.totali ? Math.round(s.tempoMedio / s.totali) : 0;
		return out;
	});

	const totali = $derived(answers.length);
	const giuste = $derived(answers.filter((a) => a.correct).length);

	// Grammatica ricorrente negli errori (per «cosa ripassare»).
	function weakGrammar(list: Ans[]) {
		const counts = new Map<string, { label: string; href: string; n: number }>();
		for (const a of list) {
			if (a.correct) continue;
			for (const g of detectGrammar([a.q.prompt, ...a.q.choices])) {
				const e = counts.get(g.href) ?? { label: g.label, href: g.href, n: 0 };
				e.n += 1;
				counts.set(g.href, e);
			}
		}
		return [...counts.values()].sort((x, y) => y.n - x.n).slice(0, 5);
	}
	// Statistiche della sezione appena finita (per il summary di sezione).
	const sectionAns = $derived(sezione ? answers.filter((a) => a.q.sezione === sezione!.id) : []);

	// Storico prove (studio futuro): salvato in locale.
	interface StoricoItem { t: number; giuste: number; totali: number; ll: number; as: number; pass: boolean }
	const STORICO_KEY = 'esame:storico:v1';
	let storico = $state<StoricoItem[]>([]);
	function loadStorico() {
		try {
			const r = localStorage.getItem(STORICO_KEY);
			if (r) storico = JSON.parse(r);
		} catch {
			storico = [];
		}
	}
	function saveStorico(item: StoricoItem) {
		try {
			const arr = [...storico, item].slice(-20);
			localStorage.setItem(STORICO_KEY, JSON.stringify(arr));
			storico = arr;
		} catch {
			/* ignora */
		}
	}
	function fmtDate(t: number): string {
		const d = new Date(t);
		return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
	}

	// Stima indicativa dei punteggi di sezione (il JLPT usa scaled scoring: qui
	// solo una proporzione grezza sul massimo ufficiale).
	const stima = $derived.by(() => {
		const inSet = (sezioni: string[]) => answers.filter((a) => sezioni.includes(a.q.sezione));
		const pct = (arr: Ans[]) => (arr.length ? arr.filter((a) => a.correct).length / arr.length : 0);
		const ll = inSet(EXAM_N4_SCORING.linguaLettura.sezioni);
		const as = inSet(EXAM_N4_SCORING.ascolto.sezioni);
		const llPunti = Math.round(pct(ll) * EXAM_N4_SCORING.linguaLettura.max);
		const asPunti = Math.round(pct(as) * EXAM_N4_SCORING.ascolto.max);
		return {
			llPunti,
			asPunti,
			totale: llPunti + asPunti,
			llOk: llPunti >= EXAM_N4_SCORING.linguaLettura.minimo,
			asOk: asPunti >= EXAM_N4_SCORING.ascolto.minimo,
			passato: llPunti + asPunti >= EXAM_N4_SCORING.totaleMinimo && llPunti >= EXAM_N4_SCORING.linguaLettura.minimo && asPunti >= EXAM_N4_SCORING.ascolto.minimo
		};
	});

	function pctClass(g: number, t: number): string {
		const p = t ? g / t : 0;
		if (p < 0.4) return 'low';
		if (p < 0.7) return 'mid';
		return 'ok';
	}
</script>

<div class="prova">
	<a class="back" href="{base}/esame">← Esame N4</a>

	{#if phase === 'setup'}
		<h1 class="page-title">▶️ Prova simulata N4</h1>
		<p class="page-sub">Domande in formato esame, nell'ordine e coi tempi reali. Scegli come allenarti.</p>

		{#if saved}
			<div class="resume-card">
				<div class="rc-info">
					<strong>📝 Prova in sospeso</strong>
					<span>Sezione {saved.secIndex + 1}/{saved.mock.sezioni.length} · {saved.answers.filter((a) => a.answered).length} risposte date · {saved.mode === 'honban' ? '本番' : '練習'} · difficoltà {saved.difficolta === 'facile' ? '🟢' : '🔴'}</span>
				</div>
				<div class="rc-btns">
					<button class="cta" onclick={resume}>Riprendi</button>
					<button class="skip" onclick={clearSaved}>Scarta</button>
				</div>
			</div>
		{/if}

		<p class="group-label">Quale prova</p>
		<div class="sets">
			<p class="group-label sub">📄 Esami completi — formato esame: conteggi, tipi, tempi e punteggio reali (25+55+35 min)</p>
			{#each [1, 2, 3, 4, 5] as n (n)}
				<button class="setbtn row" class:on={selectedSet === `ufficiale-${n}`} onclick={() => (selectedSet = `ufficiale-${n}`)}>
					<span class="set-body">
						<span class="set-title">📄 Esame {n} (fisso)</span>
						<span class="set-desc">Prova completa uguale a ogni apertura: comoda per confrontarti nel tempo. Tutte le domande originali.</span>
					</span>
					<span class="set-clock">
						<TimeClock total={120} green={115} size={46} />
						<span class="set-clock-cap">~115 min</span>
					</span>
				</button>
			{/each}
			<button class="setbtn" class:on={selectedSet === null} onclick={() => (selectedSet = null)}>
				<span class="set-title">🎲 Esame casuale</span>
				<span class="set-desc">Stessi numeri/tipi/tempi/punteggio, ma domande diverse ogni volta (pescate dal catalogo). Per prove sempre nuove.</span>
			</button>

			<p class="group-label sub">🧩 Mini esami — pochi item ma di tutti i tipi, per allenarti in fretta</p>
			{#each miniSets as s (s.id)}
				<button class="setbtn row" class:on={selectedSet === s.id} onclick={() => (selectedSet = s.id)}>
					<span class="set-body">
						<span class="set-title">🧩 {s.titolo}</span>
						<span class="set-desc">{s.descrizione}</span>
					</span>
					<span class="set-clock">
						<TimeClock total={120} green={setTotalMinutes(s.id)} size={46} />
						<span class="set-clock-cap">~{setTotalMinutes(s.id)} min</span>
					</span>
				</button>
			{/each}

			<p class="group-label sub">♾️ Continua & mirato</p>
			<button class="setbtn" class:on={selectedSet === 'continua'} onclick={() => (selectedSet = 'continua')}>
				<span class="set-title">♾️ Continua (domande random, senza timer)</span>
				<span class="set-desc">Flusso infinito di domande miste col feedback subito: macini pratica senza pressione. Fermati quando vuoi.</span>
			</button>
			<button class="setbtn" class:on={selectedSet === 'weak'} onclick={() => (selectedSet = 'weak')}>
				<span class="set-title">🎯 Punti deboli</span>
				<span class="set-desc">Prova breve concentrata sulle tipologie dove vai peggio (in base alle prove/drill fatti).</span>
			</button>

			{#if extraSets.length}
				<p class="group-label sub">Extra — varianti curate (sottoinsiemi fissi, non ai numeri ufficiali)</p>
				{#each extraSets as s (s.id)}
					<button class="setbtn row" class:on={selectedSet === s.id} onclick={() => (selectedSet = s.id)}>
						<span class="set-body">
							<span class="set-title">📄 {s.titolo}</span>
							<span class="set-desc">{s.descrizione}</span>
						</span>
						<span class="set-clock">
							<TimeClock total={120} green={setTotalMinutes(s.id)} size={46} />
							<span class="set-clock-cap">~{setTotalMinutes(s.id)} min</span>
						</span>
					</button>
				{/each}
			{/if}
		</div>

		<p class="group-label">Modalità</p>
		<div class="modes">
			<button class="mode" class:on={mode === 'renshu'} onclick={() => (mode = 'renshu')}>
				<span class="mode-title">練習 · Allenamento</span>
				<span class="mode-desc">Puoi sforare il tempo (non blocca). Trucco, spiegazione e «Non la so» dopo ogni domanda.</span>
			</button>
			<button class="mode" class:on={mode === 'honban'} onclick={() => (mode = 'honban')}>
				<span class="mode-title">本番 · Esame reale</span>
				<span class="mode-desc">Cronometro di sezione che blocca a scadenza. Nessun aiuto: spiegazioni solo nei risultati.</span>
			</button>
			<button class="mode" class:on={mode === 'challenge'} onclick={() => (mode = 'challenge')}>
				<span class="mode-title">⚡ Challenge</span>
				<span class="mode-desc">Timer per singola domanda: rispondi entro il suo tempo o è persa e si avanza. Nessun aiuto.</span>
			</button>
			<button class="mode" class:on={mode === 'campione'} onclick={() => (mode = 'campione')}>
				<span class="mode-title">🏆 Campione</span>
				<span class="mode-desc">Come Challenge ma coi tempi ridotti del 20%: per i più veloci.</span>
			</button>
		</div>

		<p class="group-label">Difficoltà</p>
		<div class="modes">
			<button class="mode" class:on={difficolta === 'facile'} onclick={() => (difficolta = 'facile')}>
				<span class="mode-title">🟢 Facile</span>
				<span class="mode-desc">Furigana visibili + testo spaziato (わかち書き); letture più brevi e semplici. Per iniziare.</span>
			</button>
			<button class="mode" class:on={difficolta === 'esame'} onclick={() => (difficolta = 'esame')}>
				<span class="mode-title">🔴 Esame</span>
				<span class="mode-desc">Kanji continuo, senza spazi né furigana; letture piene, distrattori vicini: identico all'esame.</span>
			</button>
		</div>

		<button class="cta" onclick={start}>Inizia la prova</button>

		<p class="note">Nota: la prova usa le domande curate disponibili. I tipi ancora in preparazione sono esclusi (elencati sotto), non riempiti a caso.</p>
	{:else if phase === 'running' && sezione && q}
		<header class="run-head">
			<span class="sec-name">{sezione.titolo_jp}</span>
			<span class="timers">
				{#if continua}
					<span class="sec-timer soft">♾️ Continua</span>
				{:else if mode === 'honban'}
					<span class="sec-timer" class:warn={secRemaining <= 60}>sezione ⏱️ {fmt(secRemaining)}</span>
				{:else if mode === 'challenge'}
					<span class="sec-timer soft">⚡ Challenge</span>
				{:else if mode === 'campione'}
					<span class="sec-timer soft">🏆 Campione −20%</span>
				{:else}
					<span class="sec-timer soft">練習</span>
				{/if}
				<span class="tot-timer">totale ⌛ {fmt(totalElapsed)}</span>
			</span>
			{#if continua}
				<button class="pause-btn" onclick={terminaContinua} title="Termina">⏹️</button>
			{:else}
				<button class="pause-btn" onclick={togglePause} title="Pausa" aria-label="Pausa">⏸️</button>
			{/if}
		</header>

		{#if paused}
			<div class="pause-panel">
				<p class="pause-title">⏸️ In pausa</p>
				<p class="muted">Il tempo è fermo. Riprendi quando vuoi, oppure esci: i progressi restano salvati.</p>
				<button class="cta" onclick={togglePause}>▶️ Riprendi</button>
				<div class="pause-actions">
					<button class="skip" onclick={exitAndSave}>Esci e salva</button>
					<button class="skip danger" onclick={abandon}>Abbandona la prova</button>
				</div>
			</div>
		{:else if idlePrompt}
			<div class="pause-panel">
				<p class="pause-title">👋 Sei ancora qui?</p>
				<p class="muted">Nessuna attività da un po': il tempo è in pausa. Se non rispondi, l'esame verrà sospeso e tornerai alla home (potrai riprenderlo).</p>
				<button class="cta" onclick={registerActivity}>Sì, continuo</button>
			</div>
		{:else}
		<div class="progress">問題 {qIndex + 1} / {sezione.questions.length} · <span class="mondai-tag">{q.mondaiTitolo}</span></div>
		{#if CONSEGNE[q.mondaiSlug]}<p class="consegna">{CONSEGNE[q.mondaiSlug]}</p>{/if}

		{@const tSec = perQuestionLimit ? Math.round(q.tempoSec * timeFactor) : q.tempoSec}
		<div class="pace" class:over={qElapsed >= tSec}>
			{#if perQuestionLimit}
				{#if qElapsed < tSec}⏳ {tSec - qElapsed}s <span class="pace-target">(scade!)</span>{:else}⏱️ scaduto{/if}
			{:else if qElapsed < tSec}
				⏳ {tSec - qElapsed}s <span class="pace-target">(consigliati ~{tSec}s)</span>
			{:else}
				⏱️ oltre il tempo consigliato (~{tSec}s)
			{/if}
		</div>

		{#if isListening && !revealText}
			<div class="prompt listen">
				{#if q.mondaiSlug === 'hatsuwa' && q.immagine}
					<img class="hatsuwa-img" src="{base}/esame/hatsuwa/{q.immagine}" alt="situazione" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
				{/if}
				<span class="listen-hint">{q.mondaiSlug === 'sokuji' ? '👂 Ascolta la battuta: scegli la RISPOSTA adatta' : q.mondaiSlug === 'hatsuwa' ? '👂 Nella situazione, scegli COSA DIRE' : '🎧 Ascolta e rispondi alla domanda'}</span>
				{#if mode === 'renshu'}
					<div class="listen-btns">
						<button class="lbtn" onclick={() => playCurrent()}>🔊 もう一度</button>
						<button class="lbtn" onclick={() => playCurrent(0.6)}>🐢 ゆっくり</button>
					</div>
				{:else}
					<span class="listen-note">🎧 una sola volta, come all'esame</span>
				{/if}
			</div>
		{:else}
			<div class="prompt">
				<ExamPrompt text={q.prompt} furigana={qFurigana} />
			</div>
		{/if}

		{#if mode === 'renshu' && picked === null}
			<div class="pre-actions">
				<button class="tip-btn" onclick={() => (showTip = !showTip)}>💡 Trucco {showTip ? '▲' : '▼'}</button>
				<button class="tip-btn dunno" onclick={dontKnow}>🤷 Non la so</button>
			</div>
			{#if showTip}<p class="tip">{q.suggerimento}</p>{/if}
		{/if}

		<div class="opts">
			{#each q.choices as c, i (i)}
				<button
					class="opt"
					class:sel={picked === i}
					class:right={mode === 'renshu' && picked !== null && i === q.correct}
					class:wrong={mode === 'renshu' && picked === i && i !== q.correct}
					class:audio={audioOnly && picked === null}
					disabled={picked !== null}
					onclick={() => answer(i)}
				>
					{#if audioOnly && picked === null}
						<!-- solo audio come all'esame: numero + riascolto della singola opzione -->
						<span class="opt-num">{i + 1}</span>
						<span class="opt-play" role="button" tabindex="0" title="Riascolta"
							onclick={(e) => { e.stopPropagation(); speak(c); }}
							onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); speak(c); } }}>🔊</span>
					{:else if qFurigana}<FuriganaText text={c} force={true} />{:else}<FuriganaText text={examStrip(c)} force={true} />{/if}
				</button>
			{/each}
		</div>

		{#if picked !== null}
			{#if mode === 'renshu'}
				{@const gram = detectGrammar([q.prompt, ...q.choices])}
				<div class="feedback" class:ok={picked === q.correct}>
					<p class="fb"><strong>{picked === q.correct ? '✅ Giusto!' : picked === -1 ? '🤷 Vediamola insieme.' : '❌ Non proprio.'}</strong></p>
					<div class="fb-jp">
						<ExamPrompt text={q.prompt} interactive={true} mondai={q.mondaiSlug} />
						<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => playFor(q!)}>🔊</button>
					</div>
					{#if q.fraseCompleta}
						<div class="fb-completa">
							<span class="fbc-label">Frase completa (parti inserite sottolineate):</span>
							<div class="fb-jp">
								<ExamPrompt text={q.fraseCompleta} furigana={qFurigana} />
								<button class="tts" title="Ascolta intera" aria-label="Ascolta intera" onclick={() => speak(q.fraseCompleta!.replace(/[【】]/g, ''))}>🔊</button>
							</div>
						</div>
					{/if}
					{#if q.traduzione}<p class="fb-it">💬 {q.traduzione}</p>{/if}
					<div class="fb-opts">
						{#each q.choices as c, ci (ci)}
							<p class="fb-opt" class:ok={ci === q.correct} class:ko={ci === picked && ci !== q.correct}>
								<span class="fb-mark">{ci === q.correct ? '✔️' : '✖️'}</span>
								<InteractiveSentence text={c} />
								{#if ci === q.correct}
									<span class="fb-note">— {q.perche_giusta}</span>
								{:else if wrongNote(q, ci)}
									<span class="fb-note muted">— {wrongNote(q, ci)}</span>
								{/if}
							</p>
						{/each}
					</div>
					<p class="fb-hint">💬 Tocca una parola: 📖 scheda · 💪 consolida · «📚 Metti in studio»</p>
					{#if gram.length}
						<div class="fb-links">
							<span class="fbl-label">📐 Grammatica:</span>
							{#each gram as g (g.href)}
								<a class="fbl" href="{base}/{g.href}">{g.label}</a>
							{/each}
						</div>
					{/if}
					<div class="fb-links">
						<span class="fbl-label">🔎 Approfondisci:</span>
						{#each truccoLinksFor(q.mondaiSlug) as t (t.id)}
							<a class="fbl" href="{base}/esame/trucco/{t.id}">💡 {t.label}</a>
						{/each}
						{#each MONDAI_GIOCHI_UTILI[q.mondaiSlug] ?? [] as g (g.href)}
							<a class="fbl" href="{base}/{g.href}">{g.label}</a>
						{/each}
					</div>
				</div>
			{/if}
			<button class="cta" onclick={next}>{qIndex + 1 >= sezione.questions.length ? (isLastSection ? 'Vedi risultati' : 'Fine sezione') : 'Prossima →'}</button>
		{:else if mode === 'honban'}
			<button class="skip" onclick={next}>Salta →</button>
		{/if}
		{/if}
	{:else if phase === 'section-done'}
		{@const secG = sectionAns.filter((a) => a.correct).length}
		{@const secWg = weakGrammar(sectionAns)}
		<h1 class="page-title">Sezione completata ✅</h1>
		<p class="big-score">{secG} / {sectionAns.length} <small>corrette</small></p>
		<div class="mondai-list">
			{#each [...new Set(sectionAns.map((a) => a.q.mondaiSlug))] as slug (slug)}
				{@const rows = sectionAns.filter((a) => a.q.mondaiSlug === slug)}
				{@const g = rows.filter((a) => a.correct).length}
				<div class="mondai-row">
					<span class="mr-titolo">{rows[0]!.q.mondaiTitolo}</span>
					<span class="mr-pct {pctClass(g, rows.length)}">{g}/{rows.length}</span>
				</div>
			{/each}
		</div>
		{#if secWg.length}
			<div class="fb-links">
				<span class="fbl-label">📐 Da ripassare:</span>
				{#each secWg as g (g.href)}<a class="fbl" href="{base}/{g.href}">{g.label}</a>{/each}
			</div>
		{/if}
		<button class="cta" onclick={continueNextSection}>Sezione successiva →</button>
	{:else if phase === 'results'}
		<h1 class="page-title">📊 Risultati</h1>
		<p class="big-score">{giuste} / {totali} <small>corrette</small></p>

		<div class="estimate">
			<div class="est-row" class:ok={stima.llOk}>
				<span>言語知識・読解</span>
				<span>~{stima.llPunti} / {EXAM_N4_SCORING.linguaLettura.max} <small>(min {EXAM_N4_SCORING.linguaLettura.minimo})</small></span>
			</div>
			<div class="est-row" class:ok={stima.asOk}>
				<span>聴解</span>
				<span>~{stima.asPunti} / {EXAM_N4_SCORING.ascolto.max} <small>(min {EXAM_N4_SCORING.ascolto.minimo})</small></span>
			</div>
			<div class="est-total" class:pass={stima.passato}>
				{stima.passato ? '🎉 Sopra la soglia' : '📉 Sotto la soglia'}: ~{stima.totale} / {EXAM_N4_SCORING.totaleMax} <small>(serve {EXAM_N4_SCORING.totaleMinimo})</small>
			</div>
			<p class="caveat">Stima indicativa: il JLPT usa un punteggio scalato non ricostruibile qui.</p>
		</div>

		<h2 class="sec-title">Per tipo di domanda</h2>
		<div class="mondai-list">
			{#each perMondai as m (m.slug)}
				<div class="mondai-row">
					<span class="mr-titolo">{m.titolo}</span>
					<span class="mr-pct {pctClass(m.giuste, m.totali)}">{m.giuste}/{m.totali}</span>
					<span class="mr-time" class:over={m.tempoMedio > m.target}>⏱️ {m.tempoMedio}s <small>/ ~{m.target}s</small></span>
				</div>
			{/each}
		</div>

		<h2 class="sec-title">Rivedi le domande</h2>
		<div class="review">
			{#each answers as a, i (i)}
				<article class="rev" class:ko={!a.correct}>
					<div class="rev-q">
						<ExamPrompt text={a.q.prompt} interactive={true} mondai={a.q.mondaiSlug} />
						<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => playFor(a.q)}>🔊</button>
					</div>
					<p class="rev-line">✔️ <strong>{a.q.choices[a.q.correct]}</strong></p>
					{#if a.q.fraseCompleta}
						<div class="rev-completa">
							<span class="fbc-label">Frase completa (parti inserite sottolineate):</span>
							<div class="rev-q">
								<ExamPrompt text={a.q.fraseCompleta} furigana={qFurigana} />
								<button class="tts" title="Ascolta la soluzione" aria-label="Ascolta la soluzione" onclick={() => speak(a.q.fraseCompleta!.replace(/[【】]/g, ''))}>🔊</button>
							</div>
						</div>
					{/if}
					{#if a.q.traduzione}<p class="rev-line it">💬 {a.q.traduzione}</p>{/if}
					{#if a.answered && !a.correct && (a.picked ?? -1) >= 0}
						<p class="rev-line muted">La tua: {a.q.choices[a.picked ?? 0]}</p>
					{:else if a.answered && !a.correct}
						<p class="rev-line muted">Non lo sapevi</p>
					{:else if !a.answered}
						<p class="rev-line muted">Non risposta (tempo scaduto)</p>
					{/if}
					<p class="rev-why">{a.q.perche_giusta}</p>
				</article>
			{/each}
		</div>

		{@const wg = weakGrammar(answers)}
		{#if wg.length}
			<h2 class="sec-title">📐 Le tue lacune ricorrenti</h2>
			<div class="fb-links">
				<span class="fbl-label">Ripassa:</span>
				{#each wg as g (g.href)}<a class="fbl" href="{base}/{g.href}">{g.label} ({g.n})</a>{/each}
			</div>
		{/if}

		{#if storico.length > 1}
			<h2 class="sec-title">📈 Andamento</h2>
			<div class="andamento">
				{#each storico.slice(-8) as s (s.t)}
					<div class="and-row" class:pass={s.pass}>
						<span class="and-date">{fmtDate(s.t)}</span>
						<span class="and-score">{s.giuste}/{s.totali}</span>
						<span class="and-pts">~{s.ll + s.as}/180 {s.pass ? '🎉' : ''}</span>
					</div>
				{/each}
			</div>
		{/if}

		<div class="results-cta">
			<button class="cta" onclick={start}>🔁 Nuova prova</button>
			<button class="ghost" onclick={ripassoMirato}>🎯 Ripasso mirato</button>
			<a class="ghost" href="{base}/punti-deboli?kind=mondai">💪 Punti deboli d'esame</a>
		</div>
	{/if}

	{#if phase === 'setup' && mock === null}
		{@const preview = buildMock({ shuffle: false })}
		{#if preview.mondaiMancanti.length}
			<details class="missing">
				<summary>Tipi ancora in preparazione ({preview.mondaiMancanti.length})</summary>
				<ul>
					{#each preview.mondaiMancanti as mm (mm.slug)}<li>{mm.titolo}</li>{/each}
				</ul>
			</details>
		{/if}
	{/if}
</div>

<style>
	.prova { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.note { margin: 0; font-size: 0.78rem; color: var(--muted); }

	.group-label { margin: 6px 0 0; font-size: 0.8rem; font-weight: 700; color: var(--muted); }
	.group-label.sub { font-weight: 400; font-size: 0.72rem; margin-top: 4px; }
	.sets { display: grid; gap: 8px; }
	.setbtn { display: grid; gap: 4px; text-align: left; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); padding: 12px; cursor: pointer; }
	.setbtn.on { border-color: var(--brand); background: var(--info-bg); }
	.setbtn.extra { border-style: dashed; }
	.setbtn.row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
	.set-body { display: grid; gap: 4px; text-align: left; }
	.set-clock { display: grid; justify-items: center; gap: 2px; flex-shrink: 0; }
	.set-clock-cap { font-size: 0.68rem; color: var(--muted); font-weight: 700; }
	.set-title { font-weight: 700; font-size: 1rem; }
	.set-desc { font-size: 0.8rem; color: var(--muted); }
	.modes { display: grid; gap: 8px; }
	.mode { display: grid; gap: 4px; text-align: left; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--ink); padding: 12px; cursor: pointer; }
	.mode.on { border-color: var(--brand); background: var(--info-bg); }
	.mode-title { font-weight: 700; font-size: 1rem; }
	.mode-desc { font-size: 0.8rem; color: var(--muted); }

	.cta { border: none; border-radius: 12px; background: var(--brand); color: #fff; padding: 12px 16px; font-size: 1rem; font-weight: 700; cursor: pointer; justify-self: start; }
	.skip { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--muted); padding: 8px 14px; font-weight: 600; cursor: pointer; justify-self: start; }
	.ghost { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); padding: 10px 14px; font-weight: 700; text-decoration: none; }

	.run-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--line); padding-bottom: 6px; }
	.sec-name { font-weight: 800; font-size: 1.05rem; }
	.timers { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
	.tot-timer { font-size: 0.8rem; font-weight: 700; color: var(--muted); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; }
	.sec-timer { font-weight: 700; font-size: 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 3px 12px; }
	.sec-timer.warn { color: var(--danger); border-color: var(--danger); }
	.sec-timer.soft { color: var(--muted); }
	.progress { font-size: 0.8rem; color: var(--muted); }
	.consegna { margin: 0; font-size: 0.9rem; font-weight: 600; border-left: 3px solid var(--brand); padding: 4px 10px; background: var(--surface); }
	.mondai-tag { color: var(--ink); font-weight: 600; }

	.pace { font-size: 0.8rem; color: var(--muted); }
	.pace.over { color: var(--warn-ink); }
	.pace-target { opacity: 0.8; }

	.prompt { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 14px; }
	.prompt.listen { flex-direction: column; align-items: stretch; gap: 10px; }
	.listen-hint { font-size: 1rem; font-weight: 700; text-align: center; }
	.listen-btns { display: flex; gap: 8px; justify-content: center; }
	.listen-note { font-size: 0.8rem; color: var(--muted); text-align: center; }
	.lbtn { border: 1px solid var(--line); border-radius: 999px; background: var(--bg); color: var(--ink); padding: 8px 14px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
	.lbtn:hover { border-color: var(--brand); }
	.tts { border: none; background: transparent; cursor: pointer; font-size: 1.05rem; }

	.tip-btn { justify-self: start; font-size: 0.78rem; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
	.tip { margin: 0; font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 8px 10px; }

	.opts { display: grid; gap: 6px; }
	.opt { text-align: center; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); padding: 12px; font-size: 1.15rem; cursor: pointer; }
	.opt:hover:enabled { border-color: var(--brand); }
	.opt:disabled { cursor: default; }
	.opt.sel { border-color: var(--brand); }
	.opt.right { border-color: var(--success); background: var(--ok-bg); }
	.opt.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.opt.audio { display: flex; align-items: center; justify-content: center; gap: 12px; }
	.opt-num { display: inline-grid; place-items: center; width: 1.9em; height: 1.9em; border-radius: 50%; border: 2px solid var(--brand); color: var(--brand); font-weight: 800; }
	.opt-play { font-size: 1.1rem; cursor: pointer; }
	.hatsuwa-img { max-width: 100%; max-height: 220px; border-radius: 12px; align-self: center; }

	.feedback { display: grid; gap: 6px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 10px 12px; }
	.fb { margin: 0; font-size: 0.9rem; }
	.fb-jp { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.fb-opts { display: grid; gap: 4px; }
	.fb-opt { margin: 0; font-size: 0.9rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; padding: 4px 6px; border-radius: 6px; }
	.fb-opt.ok { background: var(--ok-bg); }
	.fb-opt.ko { background: var(--danger-bg); }
	.fb-mark { font-size: 0.85rem; }
	.fb-note { font-size: 0.8rem; color: var(--info-ink); }
	.fb-note.muted { color: var(--muted); }
	.fb-it { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.fb-completa, .rev-completa { display: grid; gap: 2px; border-left: 3px solid var(--ok-ink); padding-left: 8px; }
	.fbc-label { font-size: 0.72rem; color: var(--muted); font-weight: 700; }
	.fb-hint { margin: 0; font-size: 0.72rem; color: var(--muted); }
	.fb-links { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.fbl-label { font-size: 0.72rem; color: var(--muted); }
	.fbl { font-size: 0.75rem; text-decoration: none; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; background: var(--bg); }
	.fbl:hover { border-color: var(--brand); }
	.pre-actions { display: flex; gap: 6px; }
	.tip-btn.dunno { border-color: var(--warn-bg); }

	.resume-card { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; border: 2px solid var(--brand); border-radius: 12px; background: var(--info-bg); padding: 12px; }
	.rc-info { display: grid; gap: 2px; font-size: 0.85rem; }
	.rc-btns { display: flex; gap: 8px; }

	.pause-btn { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; cursor: pointer; font-size: 1rem; padding: 2px 8px; }
	.pause-btn:hover { border-color: var(--brand); }
	.pause-panel { display: grid; gap: 10px; justify-items: center; text-align: center; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 24px; }
	.pause-title { margin: 0; font-size: 1.3rem; font-weight: 800; }
	.pause-actions { display: flex; gap: 8px; }
	.skip.danger { color: var(--danger); border-color: var(--danger); }

	.big-score { margin: 0; font-size: 2rem; font-weight: 800; }
	.big-score small { font-size: 0.9rem; font-weight: 400; color: var(--muted); }

	.estimate { display: grid; gap: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; }
	.est-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
	.est-row.ok { color: var(--ok-ink); }
	.est-row small, .est-total small { color: var(--muted); font-weight: 400; }
	.est-total { margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--line); font-weight: 700; }
	.est-total.pass { color: var(--ok-ink); }
	.caveat { margin: 4px 0 0; font-size: 0.72rem; color: var(--muted); }

	.sec-title { margin: 8px 0 0; font-size: 1.05rem; }
	.mondai-list { display: grid; gap: 6px; }
	.mondai-row { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 8px 10px; }
	.mr-titolo { flex: 1; font-size: 0.9rem; font-weight: 600; }
	.mr-pct { font-size: 0.82rem; font-weight: 700; border-radius: 999px; padding: 2px 9px; }
	.mr-pct.low { color: var(--danger); background: var(--danger-bg); }
	.mr-pct.mid { color: var(--warn-ink); background: var(--warn-bg); }
	.mr-pct.ok { color: var(--ok-ink); background: var(--ok-bg); }
	.mr-time { font-size: 0.75rem; color: var(--muted); }
	.mr-time.over { color: var(--warn-ink); }

	.review { display: grid; gap: 8px; }
	.rev { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 10px 12px; display: grid; gap: 3px; }
	.rev.ko { border-color: var(--danger); }
	.rev-q { margin: 0; font-size: 1.05rem; }
	.rev-line { margin: 0; font-size: 0.85rem; }
	.rev-line.it { color: var(--ink); }
	.rev-why { margin: 2px 0 0; font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 6px 9px; }
	.muted { color: var(--muted); }

	.andamento { display: grid; gap: 4px; }
	.and-row { display: flex; gap: 10px; align-items: baseline; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; font-size: 0.82rem; background: var(--surface); }
	.and-row.pass { border-color: var(--success); }
	.and-date { color: var(--muted); min-width: 72px; }
	.and-score { font-weight: 700; }
	.and-pts { margin-left: auto; color: var(--muted); }
	.results-cta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	button.ghost { cursor: pointer; }

	.missing { font-size: 0.8rem; color: var(--muted); }
	.missing ul { margin: 6px 0 0; padding-left: 18px; }
</style>
