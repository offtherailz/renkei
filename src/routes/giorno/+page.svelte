<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import { speakSentenceJapaneseAsync, stopSpeaking, type SpeakOptions } from '$lib/core/tts';
	import { voiceParams } from '$lib/core/voices';
	import { isInLevel } from '$lib/data/kanjiN4';
	import {
		buildDay, buildingAtDoor, buildingOf, countJa, drillSpoken, hhmm, isCrossing, isRoad, numbered, PLACES, recordResult, roadPath, SKILL_OF, START,
		type BankItem, type Building, type Day, type Line, type Mission, type Option, type PlaceId, type Pos, type Progress, type Who
	} from '$lib/game/giorno';
	import { db } from '$lib/db/schema';
	import { decryptCourse } from '$lib/core/courseCrypto';
	import { importCourseDataset } from '$lib/db/course-import';
	import { drawFace, drawTown, lightOf, TILE } from '$lib/game/pixel';
	import { drawScene, SCENE_H, SCENE_W } from '$lib/game/scene';
	import { bgSrc, composedSrc, sceneLook, spriteSrc, type Role } from '$lib/game/sceneArt';
	import { optionHint } from '$lib/game/optionHint';
	import { ensureWordIndex, type WordHit } from '$lib/core/wordLookup';

	// dizionario dell'app: spiega le opzioni senza traduzione (domande dei libri)
	let wordIndex = $state<Map<string, WordHit> | null>(null);

	// ── banca di domande d'esame (file corso) e progressi del ripasso ──
	let bank = $state<BankItem[]>([]);
	let prog: Progress = {};
	let dayNo = 0;
	function loadProgress(): void {
		try {
			const raw = JSON.parse(localStorage.getItem('renkei_giorno_prog') ?? 'null') as { prog: Progress; dayNo: number } | null;
			if (raw) ({ prog, dayNo } = raw);
		} catch {
			/* niente storage */
		}
	}
	function saveProgress(): void {
		try {
			localStorage.setItem('renkei_giorno_prog', JSON.stringify({ prog, dayNo }));
		} catch {
			/* niente storage */
		}
	}
	function noteResult(id: string | undefined, ok: boolean): void {
		if (!id) return;
		prog = recordResult(prog, id, ok, dayNo);
		saveProgress();
	}
	// Le prove d'esame (materiale dei libri) stanno cifrate tra i file statici:
	// si scaricano e si importano qui con la password, come un file corso.
	let loadingExams = $state(false);
	let examMsg = $state('');
	async function loadBank(): Promise<void> {
		const rows = await db.course_giorno.toArray().catch(() => []);
		bank = rows.map(({ corso_id: _c, updated_at: _u, ...b }) => b);
	}
	async function importExams(): Promise<void> {
		const password = window.prompt('Password delle prove d’esame:');
		if (!password) return;
		loadingExams = true;
		examMsg = '';
		try {
			const resp = await fetch(`${base}/prove-esame-n4.cifrato.json`, { cache: 'no-store' });
			if (!resp.ok) throw new Error(`file non trovato (${resp.status})`);
			const r = await importCourseDataset(await decryptCourse(await resp.text(), password));
			await loadBank();
			examMsg = `✅ ${r.situazioniAggiunte} domande d'esame caricate.`;
		} catch (e) {
			examMsg = `❌ ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			loadingExams = false;
		}
	}
	const consolidated = $derived(bank.filter((b) => (prog[b.id]?.streak ?? 0) >= 2).length);

	// ── stato della giornata ──
	let day = $state<Day | null>(null);
	let phase = $state<'intro' | 'walk' | 'mission' | 'summary'>('intro');
	let stepIdx = $state(0);
	let clock = $state(8 * 60);
	let energy = $state(100);
	let money = $state(3000);
	let rep = $state(50);
	let log = $state<{ title: string; skill: string; ok: boolean; note: string }[]>([]);
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	// ── mappa ──
	let player = $state<Pos>({ ...START });
	let facing = $state<'n' | 's' | 'e' | 'w'>('n');
	let frame = $state(0);
	let lightPhase = $state(0);
	let tick = $state(0);
	let walkQueue: Pos[] = [];
	let waitTicks = 0;
	let visited = $state<Set<string>>(new Set());
	let routeActive = $state(false); // si cammina seguendo le indicazioni (niente freccia)
	let wrongDoors = $state(0);
	let canvas = $state<HTMLCanvasElement | null>(null);

	// ── missione in corso ──
	let answered = $state(false);
	let chosen = $state<number | null>(null);
	let lastOk = $state(false);
	let replays = $state(0);
	let speaking = $state<Who | null>(null);
	let basket = $state<Record<string, number>>({});
	let calPick = $state<number | null>(null);
	let qRound = $state(0);
	let qCombo = $state(0);
	let qBest = $state(0);
	let qScore = $state(0);
	let qLeft = $state(0);
	let qPicked = $state<number | null>(null);
	let qReady = $state(false);
	let qTimer: ReturnType<typeof setInterval> | null = null;
	let lateNote = $state('');

	const step = $derived(day ? day.steps[stepIdx] ?? null : null);
	const mission = $derived<Mission | null>(step?.mission ?? null);
	const doorOf = (p: PlaceId | 'eki'): Pos => (p === 'eki' || !day ? { ...START } : buildingOf(day.town, p).door);
	const targetDoor = $derived(step ? doorOf(step.place) : null);
	const markerOn = $derived(phase === 'walk' && !!targetDoor && (!routeActive || wrongDoors >= 3));
	const doorsHere = $derived(day && phase === 'walk' ? buildingAtDoor(day.town, player) : []);
	const atStation = $derived(player.x === START.x && player.y === START.y);

	function say(msg: string, ms = 2600): void {
		toast = msg;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), ms);
	}

	// ── voce: narratore / donna / uomo ──
	let speakToken = 0;
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
	function voiceFor(who: Who): SpeakOptions {
		if (who === 'M') return voiceParams('maschile');
		const f = voiceParams('femminile');
		// annunci: stessa voce femminile, appena più lenta. Alzare il pitch la rendeva
		// «soffocata» sulle voci di sistema
		return who === 'N' ? { ...f, pitch: 1, rate: 0.95 } : f;
	}
	async function playLines(lines: Line[]): Promise<void> {
		const tok = ++speakToken;
		stopSpeaking();
		for (const l of lines) {
			if (tok !== speakToken) return;
			speaking = l.who;
			await speakSentenceJapaneseAsync(l.ja, { ...voiceFor(l.who), waitMs: 20000 });
			await sleep(300);
		}
		if (tok === speakToken) speaking = null;
	}
	function hush(): void {
		speakToken += 1;
		stopSpeaking();
		speaking = null;
	}
	// audio della missione: per il 発話表現 anche le scelte, numerate (solo voce)
	function audioOf(m: Mission): Line[] {
		if (!('lines' in m)) return [];
		if (m.kind !== 'choice' || !m.audioOnly) return m.lines;
		const who = m.optionVoice ?? 'F';
		return [...m.lines, ...m.options.map((o, i) => ({ who, ja: numbered(i, o.ja), it: o.it }))];
	}
	function replay(lines: Line[]): void {
		if (replays > 0) {
			clock += 2;
			say('🔁 Riascolto: −2 minuti');
		}
		replays += 1;
		void playLines(lines);
	}

	// ── inizio / fine giornata ──
	function startDay(seed = Math.floor(Math.random() * 1e9)): void {
		// il giorno conta da quando lo inizi: chi interrompe a metà non rivede le stesse
		dayNo += 1;
		saveProgress();
		day = buildDay(seed, { bank, prog, dayNo });
		stepIdx = 0;
		clock = 8 * 60;
		energy = 100;
		money = 3000;
		rep = 50;
		log = [];
		player = { ...START };
		facing = 'n';
		visited = new Set();
		openMission();
	}

	function finishStep(ok: boolean, note: string): void {
		if (!step || !mission) return;
		hush();
		if (mission.kind === 'choice') noteResult(mission.sourceId, ok);
		log = [...log, { title: mission.title, skill: SKILL_OF(mission), ok, note }];
		if (mission.kind !== 'quick' && mission.kind !== 'drill') {
			rep = Math.max(0, Math.min(100, rep + (ok ? 6 : -6)));
			if (!ok) energy = Math.max(0, energy - 6);
		}
		clock += step.cost;
		if (step.lunch) {
			energy = Math.min(100, energy + 35);
			money -= 900;
			say('🍱 Pranzo: +35 energia, −¥900');
		}
		stepIdx += 1;
		if (!day || stepIdx >= day.steps.length) {
			phase = 'summary';
			saveRecord();
			return;
		}
		const next = day.steps[stepIdx]!;
		routeActive = false;
		wrongDoors = 0;
		if (next.mission.kind === 'route') {
			// le indicazioni partono sempre dall'uscita della stazione
			if (!samePos(player, START)) say('🚉 Torni alla stazione e chiedi la strada a un passante.');
			player = { ...START };
			facing = 'n';
			openMission();
		} else if (next.place === step.place || samePos(doorOf(next.place), player)) {
			openMission();
		} else {
			phase = 'walk';
			say(`🎯 Vai a: ${next.place === 'eki' ? 'stazione' : PLACES[next.place].it}`);
		}
	}

	function openMission(): void {
		if (!step || !mission) return;
		answered = false;
		chosen = null;
		replays = 0;
		basket = {};
		calPick = null;
		lateNote = '';
		clock = Math.max(clock, step.time);
		if (step.deadline && clock > step.deadline) {
			lateNote = `⏰ Sei in ritardo (${hhmm(clock)}): reputazione −10`;
			rep = Math.max(0, rep - 10);
		}
		phase = 'mission';
		if (mission.kind === 'quick') {
			qRound = 0; qCombo = 0; qBest = 0; qScore = 0; qPicked = null;
			void runQuickRound();
		} else if (mission.kind === 'drill') {
			dRound = 0; dScore = 0; dPicked = null;
		} else if (mission.kind !== 'choice' || !mission.optionsFirst) {
			if ('lines' in mission && mission.lines.length) {
				replays = 1;
				void playLines(audioOf(mission));
			}
		}
	}

	// ── camminare ──
	const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
	function stepTo(n: Pos): void {
		if (!isRoad(n.x, n.y)) return;
		if (n.x > player.x) facing = 'e';
		else if (n.x < player.x) facing = 'w';
		else if (n.y > player.y) facing = 's';
		else facing = 'n';
		player = n;
		frame += 1;
		lightPhase += 1;
		clock += 1;
		energy = Math.max(0, energy - 0.4);
		const key = `${n.x},${n.y}`;
		if (!visited.has(key)) visited = new Set([...visited, key]);
	}
	function move(dx: number, dy: number): void {
		if (phase !== 'walk') return;
		walkQueue = [{ x: player.x + dx, y: player.y + dy }];
	}
	function onMapTap(e: MouseEvent): void {
		if (phase !== 'walk' || !canvas) return;
		const r = canvas.getBoundingClientRect();
		const x = Math.floor(((e.clientX - r.left) / r.width) * 15);
		const y = Math.floor(((e.clientY - r.top) / r.height) * 15);
		// tocco su un edificio: si va alla sua porta
		const b = day?.town.find((t) => x >= t.x && x <= t.x + 1 && y >= t.y && y <= t.y + 1);
		const dest = b ? b.door : y >= 13 ? { ...START } : { x, y };
		if (!isRoad(dest.x, dest.y)) return;
		walkQueue = roadPath(player, dest);
	}
	function onKey(e: KeyboardEvent): void {
		const k: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
		if (k[e.key] && phase === 'walk') {
			e.preventDefault();
			move(...k[e.key]!);
		}
	}

	function enter(b: Building | 'eki'): void {
		if (!step || !mission) return;
		walkQueue = [];
		const place = b === 'eki' ? 'eki' : b.place;
		if (b !== 'eki') visited = new Set([...visited, `b:${b.place}`]);
		if (place !== step.place) {
			const name = place === 'eki' ? '駅' : PLACES[place].sign;
			if (routeActive) {
				wrongDoors += 1;
				rep = Math.max(0, rep - 2);
				clock += 3;
				say(`🚪 ここは ${name}です。Non è qui! (−2 reputazione)${wrongDoors >= 3 ? ' — ora ti indico la strada.' : ''}`);
			} else say(`🚪 ここは ${name}です. Non è qui.`);
			return;
		}
		if (mission.kind === 'route') {
			finishStep(wrongDoors === 0, wrongDoors === 0 ? 'Arrivato al primo colpo' : `${wrongDoors} porte sbagliate`);
			return;
		}
		openMission();
	}

	function startRouteWalk(): void {
		hush();
		routeActive = true;
		phase = 'walk';
	}

	// ── risposte ──
	function choose(i: number): void {
		if (!mission || mission.kind !== 'choice' || answered) return;
		chosen = i;
		answered = true;
		lastOk = i === mission.answer;
		// si sente la risposta data (con la voce di chi risponde), poi la reazione
		const said: Line = { who: mission.reaction ? other(mission.reaction.who) : 'N', ja: mission.options[i]!.ja, it: '' };
		void playLines(lastOk && mission.reaction ? [said, mission.reaction] : [said]);
	}
	const other = (w: Who): Who => (w === 'M' ? 'F' : 'M');
	function toggleItem(id: string): void {
		if (answered) return;
		// ogni tocco aggiunge uno, dopo 4 si torna a zero
		const n = ((basket[id] ?? 0) + 1) % 5;
		const next = { ...basket };
		if (n) next[id] = n;
		else delete next[id];
		basket = next;
	}
	const basketTotal = $derived(mission?.kind === 'shop' ? mission.shelf.reduce((t, s) => t + s.price * (basket[s.id] ?? 0), 0) : 0);
	const basketCount = $derived(Object.values(basket).reduce((t, n) => t + n, 0));
	function pay(): void {
		if (!mission || mission.kind !== 'shop' || answered) return;
		hush();
		answered = true;
		money -= basketTotal;
		const names = mission.shelf.filter((x) => basket[x.id]).map((x) => `${x.ja}を ${countJa(x, basket[x.id]!)}`);
		void playLines([{ who: 'N', ja: `${names.join('と ')}を ください。`, it: '' }]);
		const ids = new Set([...Object.keys(basket), ...Object.keys(mission.need)]);
		lastOk = [...ids].every((id) => (basket[id] ?? 0) === (mission.need[id] ?? 0));
	}
	function pickDay(d: number): void {
		if (!mission || mission.kind !== 'calendar' || answered) return;
		calPick = d;
		answered = true;
		lastOk = d === mission.answer;
		void playLines([{ who: 'N', ja: `${d}日`, it: '' }]);
	}

	// 即時応答: battuta → timer → scelta (o tempo scaduto)
	async function runQuickRound(): Promise<void> {
		if (!mission || mission.kind !== 'quick') return;
		qPicked = null;
		qReady = false;
		const r = mission.rounds[qRound]!;
		await playLines(quickAudio(r));
		if (phase !== 'mission' || mission.kind !== 'quick' || qPicked !== null) return;
		qReady = true;
		qLeft = mission.seconds * 10;
		if (qTimer) clearInterval(qTimer);
		qTimer = setInterval(() => {
			qLeft -= 1;
			if (qLeft <= 0) quickAnswer(-1);
		}, 100);
	}
	function quickAudio(r: { line: Line; options: Option[]; audioOnly?: boolean }): Line[] {
		if (!r.audioOnly) return [r.line];
		const who: Who = r.line.who === 'M' ? 'F' : 'M';
		return [r.line, ...r.options.map((o, i) => ({ who, ja: numbered(i, o.ja), it: o.it }))];
	}
	function quickAnswer(i: number): void {
		if (!mission || mission.kind !== 'quick' || qPicked !== null) return;
		if (qTimer) clearInterval(qTimer);
		qReady = true;
		qPicked = i;
		const r = mission.rounds[qRound]!;
		noteResult(r.sourceId, i === r.answer);
		if (i >= 0) void playLines([{ who: other(r.line.who), ja: r.options[i]!.ja, it: '' }]);
		else hush();
		if (i === r.answer) {
			qCombo += 1;
			qBest = Math.max(qBest, qCombo);
			const gain = 1 + Math.min(qCombo, 4);
			qScore += 1;
			rep = Math.min(100, rep + gain);
		} else {
			qCombo = 0;
			rep = Math.max(0, rep - 3);
			energy = Math.max(0, energy - 3);
		}
	}
	function quickNext(): void {
		if (!mission || mission.kind !== 'quick') return;
		if (qRound + 1 >= mission.rounds.length) {
			finishStep(qScore >= mission.rounds.length - 1, `${qScore}/${mission.rounds.length}, combo massima ${qBest}`);
			return;
		}
		qRound += 1;
		void runQuickRound();
	}

	// ── 📝 ripasso: domande scritte una dopo l'altra ──
	let dRound = $state(0);
	let dScore = $state(0);
	let dPicked = $state<number | null>(null);
	function drillAnswer(i: number): void {
		if (!mission || mission.kind !== 'drill' || dPicked !== null) return;
		const r = mission.rounds[dRound]!;
		dPicked = i;
		const ok = i === r.answer;
		if (ok) dScore += 1;
		rep = Math.max(0, Math.min(100, rep + (ok ? 1 : -1)));
		noteResult(r.sourceId, ok);
		void playLines([{ who: 'N', ja: drillSpoken(r), it: '' }]);
	}
	function drillNext(): void {
		if (!mission || mission.kind !== 'drill') return;
		if (dRound + 1 >= mission.rounds.length) {
			hush();
			const n = mission.rounds.length;
			energy = Math.max(0, energy - (n - dScore) * 2);
			finishStep(dScore >= n - 1, `${dScore}/${n}`);
			return;
		}
		dRound += 1;
		dPicked = null;
	}
	// 【parola】 sottolineata
	const drillParts = (f: string) => f.split(/(【[^】]*】)/).map((p) => ({ u: p.startsWith('【'), t: p.replace(/[【】]/g, '') }));

	// ── record ──
	let best = $state<{ rep: number; days: number } | null>(null);
	function saveRecord(): void {
		try {
			const prev = JSON.parse(localStorage.getItem('renkei_giorno') ?? 'null') as { rep: number; days: number } | null;
			best = { rep: Math.max(prev?.rep ?? 0, rep), days: (prev?.days ?? 0) + 1 };
			localStorage.setItem('renkei_giorno', JSON.stringify(best));
		} catch {
			/* niente storage: pazienza */
		}
	}
	const grade = $derived(rep >= 85 ? 'S' : rep >= 70 ? 'A' : rep >= 55 ? 'B' : rep >= 40 ? 'C' : 'D');
	const bySkill = $derived(
		Object.entries(
			log.reduce<Record<string, { ok: number; tot: number }>>((acc, l) => {
				const s = (acc[l.skill] ??= { ok: 0, tot: 0 });
				s.tot += 1;
				if (l.ok) s.ok += 1;
				return acc;
			}, {})
		)
	);

	// ── insegne: kanji fuori livello con la lettura sopra ──
	const needsRuby = (sign: string) => [...sign].some((c) => /[一-龯]/.test(c) && !isInLevel(c));
	const nearOrSeen = (b: Building) =>
		visited.has(`b:${b.place}`) || Math.abs(b.door.x - player.x) + Math.abs(b.door.y - player.y) <= 3 || (markerOn && step?.place === b.place);

	// ── loop di disegno e camminata ──
	let loop: ReturnType<typeof setInterval> | null = null;
	function frameLoop(): void {
		tick += 1;
		if (phase === 'walk' && walkQueue.length && tick % 2 === 0) {
			const n = walkQueue[0]!;
			if (isCrossing(n.x, n.y) && lightOf(n.x, n.y, lightPhase) === 'red' && !isCrossing(player.x, player.y)) {
				waitTicks += 1;
				if (waitTicks === 1) say('🚦 Rosso: aspetti il verde');
				if (waitTicks % 3 === 0) {
					lightPhase += 1;
					clock += 1;
				}
			} else {
				waitTicks = 0;
				walkQueue.shift();
				stepTo(n);
			}
		}
		const ctx = canvas?.getContext('2d');
		if (ctx && day) {
			drawTown(ctx, { town: day.town, player, facing, frame, phase: lightPhase, marker: markerOn && targetDoor ? markerFor(targetDoor) : null, tick });
		}
	}
	function markerFor(door: Pos): Pos {
		if (!day || !step || step.place === 'eki') return { x: START.x, y: 13 };
		const b = buildingOf(day.town, step.place);
		return { x: b.x + (door.x > b.x ? 1 : 0), y: b.y };
	}

	// ── scena PC-98: disegno del luogo (bocca animata) o sfondo in codice ──
	const sceneTalker = $derived<'F' | 'M'>(
		speaking === 'F' || speaking === 'M'
			? speaking
			: ((mission && 'lines' in mission ? mission.lines.find((l) => l.who !== 'N')?.who : null) as 'F' | 'M' | null) ?? 'F'
	);
	const sceneRole = $derived.by<Role>(() => {
		if (!mission) return 'luogo';
		if (mission.kind === 'route') return 'passante';
		if (mission.kind === 'shop') return 'amico';
		if (mission.kind === 'quick' || mission.kind === 'calendar') return 'collega';
		if (mission.kind === 'choice' && !mission.sourceId) {
			if (mission.sub === 'priority') return 'capo';
			if (mission.sub === 'reason' || mission.sub === 'read') return 'collega';
			if (mission.title.startsWith('🎒')) return 'insegnante';
		}
		return 'luogo';
	});
	const look = $derived(step ? sceneLook(step.place, sceneTalker, sceneRole) : null);
	const mouthOpen = $derived((speaking === 'F' || speaking === 'M') && speaking === sceneTalker && tick % 4 < 2);
	// precarica le due versioni: senza, al primo cambio di bocca l'immagine sparisce un attimo
	$effect(() => {
		if (!look) return;
		for (const t of [false, true]) {
			if (look.composed) new Image().src = composedSrc(base, look.composed, t);
			if (look.sprite) new Image().src = spriteSrc(base, look.sprite, t);
		}
	});
	function sceneBg(node: HTMLCanvasElement, p: { place: PlaceId | 'eki'; hour: number }) {
		const draw = (q: typeof p) => {
			const c = node.getContext('2d');
			if (c) drawScene(c, q);
		};
		draw(p);
		return { update: draw };
	}

	function faceAction(node: HTMLCanvasElement, who: Who) {
		const draw = (w: Who) => {
			const c = node.getContext('2d');
			if (c) drawFace(c, w);
		};
		draw(who);
		return { update: draw };
	}

	onMount(() => {
		loop = setInterval(frameLoop, 90);
		window.addEventListener('keydown', onKey);
		loadProgress();
		void loadBank();
		ensureWordIndex('it').then((m) => (wordIndex = m)).catch(() => {});
	});
	onDestroy(() => {
		if (loop) clearInterval(loop);
		if (qTimer) clearInterval(qTimer);
		if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
		hush();
	});

	const WD = ['月', '火', '水', '木', '金', '土', '日'];
</script>

<svelte:head>
	<title>Un giorno in Giappone</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
</svelte:head>

<div class="game">
	<a class="back" href="{base}/">← Home</a>

	{#if phase === 'intro'}
		<section class="panel intro">
			<h1>🗾 一日 <small>Un giorno in Giappone</small></h1>
			<p>Arrivi in stazione alle 8:00. In città ti aspettano l'ufficio, il pranzo, una commissione, la spesa e il ritorno a casa: <strong>ogni situazione è una domanda del JLPT N4</strong>, ma qui la risposta la dai agendo.</p>
			<ul>
				<li>🧭 Segui le indicazioni a voce e trova la porta giusta (le insegne si leggono da vicino).</li>
				<li>🧺 Compra solo ciò che serve, 📅 segna la data, 🏢 scegli cosa fare prima.</li>
				<li>💬 Rispondi come un giapponese; ⚡ botta e risposta a tempo con combo.</li>
				<li>Il testo e la traduzione si vedono <em>dopo</em> la risposta. Riascoltare costa 2 minuti.</li>
			</ul>
			<p class="stats-line">⏰ tempo · ⚡ energia · ¥ soldi · ⭐ reputazione — a fine giornata il voto.</p>
			{#if bank.length}
				<p class="stats-line">📚 Domande d'esame: {bank.length} · consolidate {consolidated}. Le sbagliate tornano finché non le sai due volte di fila; le nuove entrano poche per giornata.</p>
				<button class="btn ghost small" onclick={importExams} disabled={loadingExams}>🔄 Aggiorna le prove d'esame</button>
			{:else}
				<p class="muted small">Senza le prove d'esame giochi con le varianti generate.</p>
				<button class="btn ghost" onclick={importExams} disabled={loadingExams}>📥 Carica le prove d'esame (password)</button>
			{/if}
			{#if loadingExams}<p class="muted small">Caricamento…</p>{/if}
			{#if examMsg}<p class="small">{examMsg}</p>{/if}
			<button class="btn big" onclick={() => startDay()}>▶ Inizia la giornata</button>
			{#if best}<p class="muted">Record: ⭐ {best.rep} · giornate giocate {best.days}</p>{/if}
		</section>
	{:else}
		<div class="hud">
			<span>⏰ {hhmm(clock)}</span>
			<span class="bar" title="energia">⚡<i style="width:{energy}%"></i></span>
			<span>¥{money}</span>
			<span>⭐ {rep}</span>
		</div>

		<!-- la mappa solo quando serve (camminare, ascoltare le indicazioni): sul telefono ruba troppo spazio -->
		{#if phase === 'walk' || (phase === 'mission' && mission?.kind === 'route')}
			<div class="map-wrap">
				<canvas bind:this={canvas} width={15 * TILE} height={15 * TILE} onclick={onMapTap}></canvas>
				{#if day}
					{#each day.town as b (b.place)}
						{#if nearOrSeen(b)}
							<span class="sign" style="left:{((b.x + 1) / 15) * 100}%; top:{((b.y + 0.62) / 15) * 100}%">
								{#if needsRuby(PLACES[b.place].sign)}<ruby>{PLACES[b.place].sign}<rt>{PLACES[b.place].yomi}</rt></ruby>{:else}{PLACES[b.place].sign}{/if}
							</span>
						{/if}
					{/each}
					<span class="sign station" style="left:{(7.5 / 15) * 100}%; top:{(13.75 / 15) * 100}%">駅</span>
				{/if}
			</div>
		{/if}

		{#if toast}<p class="toast">{toast}</p>{/if}

		{#if phase === 'walk'}
			<div class="panel walk">
				<p class="goal">
					{#if routeActive}🧭 Segui le indicazioni fino a {step && step.place !== 'eki' ? PLACES[step.place].it : ''}.{wrongDoors >= 3 ? ' (freccia gialla)' : ''}
					{:else}🎯 Vai a: <strong>{step?.place === 'eki' ? 'stazione (駅)' : step ? PLACES[step.place].it : ''}</strong> — segui la freccia gialla.{/if}
				</p>
				<div class="controls">
					<div class="pad">
						<button class="k kup" onclick={() => move(0, -1)} aria-label="su">▲</button>
						<button class="k kleft" onclick={() => move(-1, 0)} aria-label="sinistra">◀</button>
						<button class="k kright" onclick={() => move(1, 0)} aria-label="destra">▶</button>
						<button class="k kdown" onclick={() => move(0, 1)} aria-label="giù">▼</button>
					</div>
					<div class="doors">
						{#each doorsHere as b (b.place)}
							<button class="btn" onclick={() => enter(b)}>🚪 Entra:
								{#if needsRuby(PLACES[b.place].sign)}<ruby>{PLACES[b.place].sign}<rt>{PLACES[b.place].yomi}</rt></ruby>{:else}{PLACES[b.place].sign}{/if}
							</button>
						{/each}
						{#if atStation && step?.place === 'eki'}<button class="btn" onclick={() => enter('eki')}>🚉 Entra: 駅</button>{/if}
						{#if routeActive && mission?.kind === 'route'}<button class="btn ghost" onclick={() => replay(mission.lines)}>🔊 Riascolta (−2 min)</button>{/if}
						{#if doorsHere.length === 0 && !(atStation && step?.place === 'eki')}<p class="muted small">Tocca la mappa o usa le frecce. Davanti a una porta puoi entrare.</p>{/if}
					</div>
				</div>
			</div>
		{:else if phase === 'mission' && mission}
			<section class="panel mission">
				<header>
					<h2>{mission.title}</h2>
					<span class="skill">{SKILL_OF(mission)}</span>
				</header>
				{#if lateNote}<p class="late">{lateNote}</p>{/if}
				<div class="scene-wrap">
					{#if look?.composed}
						<img class="scene" src={composedSrc(base, look.composed, mouthOpen)} alt="" />
					{:else}
						{#if look?.bg}
							<img class="scene" src={bgSrc(base, look.bg)} alt="" />
						{:else}
							<canvas class="scene" use:sceneBg={{ place: step?.place ?? 'eki', hour: Math.floor(clock / 60) }} width={SCENE_W} height={SCENE_H}></canvas>
						{/if}
						{#if look?.sprite}<img class="sprite" src={spriteSrc(base, look.sprite, mouthOpen)} alt="" />{/if}
					{/if}
				</div>
				<div class="dialog">
					{#if speaking}
						<p><span class="dname">{speaking === 'N' ? 'アナウンス' : speaking === 'F' ? '女の人' : '男の人'}</span>「……」</p>
					{:else}
						<p>{mission.intro}</p>
					{/if}
				</div>

				{#if mission.kind === 'route'}
					<div class="row">
						<button class="btn ghost" onclick={() => replay(mission.lines)}>🔊 {replays === 0 ? 'Ascolta' : 'Riascolta (−2 min)'}</button>
						<button class="btn" onclick={startRouteWalk}>🚶 Ho capito, cammino</button>
					</div>
				{:else if mission.kind === 'choice'}
					{#if mission.doc}
						<div class="phone">
							<p class="phone-title">✉️ {mission.doc.title}</p>
							<pre class="ja">{mission.doc.ja}</pre>
						</div>
					{/if}
					{#if mission.scena}<p class="scena">🖼️ {mission.scena}</p>{/if}
					{#if mission.lines.length}
						<button class="btn ghost" onclick={() => replay(audioOf(mission))}>🔊 {replays === 0 ? 'Ascolta' : 'Riascolta (−2 min)'}</button>
					{/if}
					<p class="question ja">{mission.question.ja}</p>
					{#if answered && mission.question.it}<p class="tr">💬 {mission.question.it}</p>{/if}
					<div class="options">
						{#each mission.options as o, i (o.ja)}
							<button class="opt" class:right={answered && i === mission.answer} class:wrong={answered && i === chosen && i !== mission.answer} disabled={answered} onclick={() => choose(i)}>
								{#if o.icon}<span class="ico">{o.icon}</span>{/if}
								{#if mission.audioOnly && !answered}<span class="ja">{i + 1}</span>{:else}<span class="ja">{mission.audioOnly ? `${i + 1}. ` : ''}{o.ja}</span>{/if}
								{#if answered}
									{@const h = o.it || optionHint(wordIndex, mission.sub, '', o.ja, i === mission.answer)}
									{#if h}<span class="tr">{h}</span>{/if}
								{/if}
							</button>
						{/each}
					</div>
				{:else if mission.kind === 'shop'}
					<button class="btn ghost" onclick={() => replay(mission.lines)}>🔊 {replays === 0 ? 'Ascolta la telefonata' : 'Riascolta (−2 min)'}</button>
					<div class="shelf">
						{#each mission.shelf as it (it.id)}
							<button class="item" class:inbasket={!!basket[it.id]} class:right={answered && !!mission.need[it.id] && basket[it.id] === mission.need[it.id]} class:wrong={answered && (basket[it.id] ?? 0) !== (mission.need[it.id] ?? 0)} disabled={answered} onclick={() => toggleItem(it.id)}>
								<span class="ico">{it.icon}</span><span class="ja">{it.ja}</span><span class="price">¥{it.price}</span>
								{#if basket[it.id]}<span class="qty">×{basket[it.id]}</span>{/if}
								{#if answered}<span class="tr">{it.it}{mission.need[it.id] ? ` · serviva ×${mission.need[it.id]}` : ''}</span>{/if}
							</button>
						{/each}
					</div>
					{#if !answered}<button class="btn" onclick={pay} disabled={basketCount === 0}>🧺 Paga ¥{basketTotal}</button>{/if}
				{:else if mission.kind === 'calendar'}
					<button class="btn ghost" onclick={() => replay(mission.lines)}>🔊 {replays === 0 ? 'Ascolta' : 'Riascolta (−2 min)'}</button>
					<p class="question ja">{mission.question.ja}</p>
					{#if answered && mission.question.it}<p class="tr">💬 {mission.question.it}</p>{/if}
					<div class="cal">
						{#each WD as w, i (w)}<span class="wd" class:we={i >= 5}>{w}</span>{/each}
						{#each mission.days as d (d.day)}
							<button class="day" class:today={d.day === mission.today} class:we={d.wd >= 5} class:right={answered && d.day === mission.answer} class:wrong={answered && d.day === calPick && d.day !== mission.answer} disabled={answered} onclick={() => pickDay(d.day)}>{d.day}{#if d.day === mission.today}<small>今日</small>{/if}</button>
						{/each}
					</div>
				{:else if mission.kind === 'quick'}
					{@const r = mission.rounds[qRound]}
					<div class="quick-head">
						<span>Round {qRound + 1}/{mission.rounds.length}</span>
						<span class="combo" class:hot={qCombo >= 2}>🔥 combo {qCombo}</span>
					</div>
					{#if r}
						{#if qReady && qPicked === null}<div class="timer"><i style="width:{(qLeft / (mission.seconds * 10)) * 100}%"></i></div>{/if}
						<button class="btn ghost small" onclick={() => playLines(quickAudio(r))} disabled={qPicked !== null}>🔊 Ripeti</button>
						<div class="options">
							{#each r.options as o, i (o.ja)}
								<button class="opt" class:right={qPicked !== null && i === r.answer} class:wrong={qPicked === i && i !== r.answer} disabled={qPicked !== null || !qReady} onclick={() => quickAnswer(i)}>
									{#if r.audioOnly && qPicked === null}<span class="ja">{i + 1}</span>{:else}<span class="ja">{o.ja}</span>{/if}
									{#if qPicked !== null}<span class="tr">{o.it}</span>{/if}
								</button>
							{/each}
						</div>
						{#if qPicked !== null}
							<p class="result {qPicked === r.answer ? 'ok' : 'ko'}">{qPicked === r.answer ? '✓ Giusto!' : qPicked === -1 ? '⌛ Tempo scaduto' : '✗ No'}</p>
							<p class="ja">「{r.line.ja}」</p>
							<p class="tr">{r.line.it}</p>
							<button class="btn" onclick={quickNext}>{qRound + 1 >= mission.rounds.length ? 'Fine' : 'Avanti →'}</button>
						{/if}
					{/if}
				{/if}

				{#if mission.kind === 'drill'}
					{@const r = mission.rounds[dRound]}
					{#if r}
						<div class="quick-head"><span>{dRound + 1}/{mission.rounds.length}</span><span>✓ {dScore}</span></div>
						{#if r.label}<p class="intro-it ja">{r.label}</p>{/if}
						<p class="question ja drill">{#each drillParts(r.frase) as p, k (k)}{#if p.u}<u>{p.t}</u>{:else}{p.t}{/if}{/each}</p>
						<div class="options">
							{#each r.options as o, i (i)}
								<button class="opt" class:right={dPicked !== null && i === r.answer} class:wrong={dPicked === i && i !== r.answer} disabled={dPicked !== null} onclick={() => drillAnswer(i)}>
									<span class="ja">{i + 1}. {o.ja}</span>
									{#if dPicked !== null}
										{@const h = o.it || optionHint(wordIndex, r.tipo ?? '', r.label, o.ja, i === r.answer)}
										{#if h}<span class="tr">{i === r.answer ? '✓ ' : '✗ '}{h}</span>{/if}
									{/if}
								</button>
							{/each}
						</div>
						{#if dPicked !== null}
							<p class="result {dPicked === r.answer ? 'ok' : 'ko'}">{dPicked === r.answer ? '✓ Giusto!' : `✗ Era la ${r.answer + 1}: ${r.options[r.answer]!.ja}`}</p>
							{#if r.it}<p class="tr">💬 {r.it}</p>{/if}
							{#if r.spiega}<p class="tr">💡 {r.spiega}</p>{/if}
							<button class="btn" onclick={drillNext}>{dRound + 1 >= mission.rounds.length ? 'Fine' : 'Avanti →'}</button>
						{/if}
					{/if}
				{/if}

				{#if answered && mission.kind !== 'route' && mission.kind !== 'quick' && mission.kind !== 'drill'}
					<p class="result {lastOk ? 'ok' : 'ko'}">{lastOk ? '✓ Giusto!' : '✗ Non era questo.'}{mission.kind === 'shop' && !lastOk ? ' Dovevi comprare: ' + mission.shelf.filter((s) => mission.need[s.id]).map((s) => `${mission.need[s.id]} ${s.it}`).join(', ') : ''}{mission.kind === 'calendar' && !lastOk ? ` Era il ${mission.answer}.` : ''}</p>
					{#if mission.kind === 'choice' && !lastOk}
						<p class="ja">✅ {mission.options[mission.answer]!.ja} <span class="tr">{mission.options[mission.answer]!.it}</span></p>
					{/if}
					{#if mission.kind === 'choice' && mission.spiega}<p class="tr">💡 {mission.spiega}</p>{/if}
					{#if mission.kind === 'choice' && mission.doc}
						<pre class="tr">{mission.doc.it}</pre>
					{/if}
					{#if 'lines' in mission && mission.lines.length}
						<details class="script" open={!lastOk}>
							<summary>📝 Testo e traduzione</summary>
							{#each mission.lines as l, i (i)}
								<p><span class="who">{l.who === 'M' ? '男' : l.who === 'F' ? '女' : '🔈'}</span> <span class="ja">{l.ja}</span><br /><span class="tr">{l.it}</span></p>
							{/each}
						</details>
					{/if}
					{#if mission.kind === 'choice' && mission.reaction && lastOk}
						<p><span class="ja">「{mission.reaction.ja}」</span> <span class="tr">{mission.reaction.it}</span></p>
					{/if}
					<button class="btn" onclick={() => finishStep(lastOk, lastOk ? 'ok' : 'sbagliato')}>Avanti →</button>
				{/if}
			</section>
		{:else if phase === 'summary'}
			<section class="panel summary">
				<h2>🌙 Fine della giornata — voto <span class="grade g{grade}">{grade}</span></h2>
				<p>Tornato a casa alle {hhmm(clock)}. ⭐ {rep} · ⚡ {Math.round(energy)} · ¥{money}</p>
				{#if day && day.fromBank}<p class="muted">📚 Domande d'esame oggi: {day.fromBank} ({day.newToday} nuove) · consolidate in tutto {consolidated}/{bank.length}</p>{/if}
				<div class="skills">
					{#each bySkill as [k, v] (k)}<span class="chip">{k} {v.ok}/{v.tot}</span>{/each}
				</div>
				<ol class="log">
					{#each log as l, i (i)}<li class:ko={!l.ok}>{l.ok ? '✓' : '✗'} {l.title} <small>{l.skill} · {l.note}</small></li>{/each}
				</ol>
				<div class="row">
					<button class="btn big" onclick={() => startDay()}>🔁 Nuova giornata (città nuova)</button>
					{#if day}<button class="btn ghost" onclick={() => startDay(day!.seed)}>↺ Rigioca la stessa</button>{/if}
				</div>
			</section>
		{/if}
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
		display: grid;
		gap: 10px;
		max-width: 520px;
		margin: 0 auto;
		font-family: 'DotGothic16', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', monospace;
	}
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; font-family: inherit; }
	.panel {
		background: var(--px-bg);
		color: var(--px-ink);
		border: 3px solid var(--px-line);
		box-shadow: inset 0 0 0 2px var(--px-panel);
		padding: 14px;
		display: grid;
		gap: 10px;
	}
	.intro h1 { margin: 0; font-size: 1.6rem; }
	.intro h1 small { display: block; font-size: 0.9rem; color: #fbf236; }
	.intro ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.9rem; }
	.intro p { margin: 0; font-size: 0.92rem; }
	.stats-line { color: #cbdbfc; }
	.muted { color: #9badb7; margin: 0; }
	.small { font-size: 0.78rem; }
	.btn {
		font-family: inherit;
		background: #5b6ee1;
		color: #fff;
		border: 3px solid var(--px-line);
		box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8a9bff;
		padding: 9px 14px;
		font-size: 0.95rem;
		cursor: pointer;
	}
	.btn:active { transform: translateY(2px); }
	.btn:disabled { opacity: 0.5; }
	.btn.big { font-size: 1.05rem; padding: 12px 16px; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; justify-self: start; }
	.hud {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		background: var(--px-bg);
		color: var(--px-ink);
		border: 3px solid var(--px-line);
		padding: 6px 10px;
		font-size: 0.95rem;
	}
	.bar { display: inline-flex; align-items: center; gap: 4px; }
	.bar::after { content: ''; display: none; }
	.bar i { display: inline-block; height: 9px; width: 60px; max-width: 60px; background: #99e550; border: 2px solid var(--px-line); }
	.map-wrap { position: relative; border: 3px solid var(--px-line); line-height: 0; }
	canvas { width: 100%; height: auto; image-rendering: pixelated; image-rendering: crisp-edges; touch-action: manipulation; cursor: pointer; }
	.sign {
		position: absolute;
		transform: translate(-50%, -50%);
		background: #fff;
		color: #222034;
		border: 2px solid #222034;
		font-size: clamp(0.5rem, 2.4vw, 0.72rem);
		line-height: 1.15;
		padding: 0 3px;
		white-space: nowrap;
		pointer-events: none;
	}
	.sign rt { font-size: 0.55em; }
	.sign.station { background: #fbf236; font-size: clamp(0.6rem, 3vw, 0.85rem); }
	.toast { margin: 0; background: #fbf236; color: #222034; border: 3px solid var(--px-line); padding: 6px 10px; font-size: 0.85rem; }
	.goal { margin: 0; font-size: 0.9rem; }
	.controls { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; }
	.pad { display: grid; grid-template-columns: repeat(3, 42px); grid-template-rows: repeat(3, 42px); }
	.k { font-family: inherit; background: #595652; color: #fff; border: 3px solid var(--px-line); font-size: 1rem; cursor: pointer; }
	.k:active { background: #847e87; }
	.kup { grid-column: 2; grid-row: 1; }
	.kleft { grid-column: 1; grid-row: 2; }
	.kright { grid-column: 3; grid-row: 2; }
	.kdown { grid-column: 2; grid-row: 3; }
	.doors { display: grid; gap: 6px; }
	.doors rt { font-size: 0.55em; }
	.mission header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
	.mission h2 { margin: 0; font-size: 1.1rem; }
	.skill { background: #fbf236; color: #222034; padding: 1px 6px; font-size: 0.8rem; border: 2px solid var(--px-line); }
	.intro-it { margin: 0; font-size: 0.88rem; color: #cbdbfc; }
	.late { margin: 0; color: #fbf236; }
	.scene-wrap { position: relative; border: 3px solid #f4f4f4; outline: 3px solid #0e0d1a; line-height: 0; margin: 3px; background: #000; aspect-ratio: 2 / 1; overflow: hidden; }
	.scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; display: block; }
	/* personaggio fuso con lo sfondo: più piccolo, ombra, colori un filo smorzati */
	.sprite { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 88%; width: auto; image-rendering: pixelated; filter: drop-shadow(0 0 1.5px rgba(10, 8, 20, 0.85)) drop-shadow(-4px 2px 6px rgba(10, 8, 20, 0.35)) saturate(0.92) contrast(0.97); }
	/* vignetta e luce comuni sopra sfondo e personaggio */
	.scene-wrap::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 38%, rgba(255, 240, 220, 0.06), rgba(10, 8, 30, 0.38) 95%); }
	.dialog {
		background: #05050a;
		border: 3px solid #f4f4f4;
		outline: 3px solid #0e0d1a;
		box-shadow: inset 0 0 0 2px #05050a, inset 0 0 0 3px #9badb7;
		margin: 3px;
		padding: 10px 14px;
		color: #f4f4f4;
		min-height: 3.2em;
	}
	.dialog p { margin: 0; font-size: 0.95rem; line-height: 1.5; }
	.dname { color: #fbf236; margin-right: 4px; }
	.scena { margin: 0; font-size: 0.85rem; background: #f4f4f4; color: #222034; border: 3px solid var(--px-line); padding: 6px 8px; }
	.speaker { display: flex; align-items: center; gap: 8px; }
	.face { width: 48px; height: 48px; image-rendering: pixelated; border: 2px solid var(--px-line); background: #cbdbfc; }
	.dots { font-size: 1.4rem; animation: blink 0.8s steps(2) infinite; }
	@keyframes blink { 50% { opacity: 0.2; } }
	.row { display: flex; flex-wrap: wrap; gap: 8px; }
	.question { margin: 0; font-size: 1.05rem; }
	.ja { font-size: 1.02rem; }
	.tr { color: #9badb7; font-size: 0.8rem; display: block; }
	.options { display: grid; gap: 7px; }
	.opt, .item, .day {
		font-family: inherit;
		background: #f4f4f4;
		color: #222034;
		border: 3px solid var(--px-line);
		box-shadow: inset -3px -3px 0 #c7c7c7;
		padding: 8px 10px;
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.opt .tr, .item .tr { color: #45283c; width: 100%; }
	.right { background: var(--px-ok) !important; }
	.wrong { background: var(--px-ko) !important; color: #fff !important; }
	.ico { font-size: 1.25rem; }
	.phone { background: #f4f4f4; color: #222034; border: 3px solid var(--px-line); padding: 8px 10px; }
	.phone-title { margin: 0 0 4px; font-weight: 700; }
	pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
	.shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
	.item { flex-direction: column; align-items: center; text-align: center; gap: 2px; padding: 6px 4px; }
	.item.inbasket { background: #fbf236; }
	.qty { font-weight: 700; font-size: 0.9rem; }
	.price { font-size: 0.75rem; }
	.cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
	.wd { text-align: center; font-size: 0.85rem; }
	.wd.we, .day.we { color: #d95763; }
	.day { justify-content: center; padding: 8px 0; flex-direction: column; gap: 0; font-size: 0.95rem; }
	.day small { font-size: 0.6rem; }
	.day.today { outline: 3px solid #fbf236; }
	.quick-head { display: flex; justify-content: space-between; }
	.combo.hot { color: #fbf236; animation: blink 0.5s steps(2) infinite; }
	.timer { height: 10px; border: 2px solid var(--px-line); background: #45283c; }
	.timer i { display: block; height: 100%; background: #fbf236; }
	.result { margin: 0; font-weight: 700; }
	.drill { line-height: 1.7; }
	.drill u { text-decoration-thickness: 2px; text-underline-offset: 4px; }
	.result.ok { color: var(--px-ok); }
	.result.ko { color: var(--px-ko); }
	.script summary { cursor: pointer; }
	.script p { margin: 6px 0; }
	.who { display: inline-block; min-width: 1.4em; color: #fbf236; }
	.summary h2 { margin: 0; font-size: 1.15rem; }
	.summary p { margin: 0; }
	.grade { display: inline-block; padding: 0 8px; border: 3px solid var(--px-line); background: #fbf236; color: #222034; }
	.skills { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip { border: 2px solid #9badb7; padding: 1px 6px; font-size: 0.85rem; }
	.log { margin: 0; padding-left: 20px; display: grid; gap: 4px; font-size: 0.88rem; }
	.log li.ko { color: #f3a0a8; }
	.log small { color: #9badb7; }
</style>
