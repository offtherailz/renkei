// 🗾 «Un giorno in Giappone»: una giornata in una piccola città, con le
// situazioni del 聴解 JLPT N4 vissute come azioni (camminare seguendo le
// indicazioni, riempire il cestino, segnare la data sul calendario…).
// Qui solo dati e generatori, puri e con rng iniettabile (testabili); la
// grafica e il gioco sono in src/routes/giorno.
//
// Testi giapponesi ORIGINALI, scritti a slot. Solo kanji N5/N4 (kanjiN4.ts):
// le parole con kanji sopra livello sono in kana (しんごう, ゆうびんきょく…).

import type { CourseGiornoInput, TestoFormato } from '$lib/types/models';

export type Rng = () => number;
export type Who = 'N' | 'F' | 'M'; // narratore, donna, uomo

export interface Line {
	who: Who;
	ja: string;
	it: string;
}

export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;
export function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// rng deterministico (mulberry32): stessa giornata col «seme» del giorno
export function seeded(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// ── Mappa ───────────────────────────────────────────────────────────────────
// Griglia 15×15 di caselle. Strade: colonne 2/7/12 (fino alla riga 12) e righe
// 2/7/12. Il giocatore esce dalla stazione (in basso) all'incrocio (7,12)
// guardando a nord. Gli edifici sono 2×2 nei 4 isolati, porta su una strada.

export const MAP_W = 15;
export const MAP_H = 15;
export const ROAD_COLS = [2, 7, 12] as const;
export const ROAD_ROWS = [2, 7, 12] as const;
export const START = { x: 7, y: 12 } as const;

export interface Pos {
	x: number;
	y: number;
}

export function isRoad(x: number, y: number): boolean {
	if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
	if ((ROAD_ROWS as readonly number[]).includes(y)) return true;
	return (ROAD_COLS as readonly number[]).includes(x) && y <= 12;
}
export function isCrossing(x: number, y: number): boolean {
	return (ROAD_COLS as readonly number[]).includes(x) && (ROAD_ROWS as readonly number[]).includes(y);
}

export type PlaceId =
	| 'kaisha' | 'yuubin' | 'konbini' | 'resutoran' | 'ginkou' | 'byouin' | 'honya' | 'hanaya'
	| 'kusuri' | 'panya' | 'toshokan' | 'kafe' | 'gakkou' | 'kouen' | 'manshon' | 'eiga';

// dove si svolge un passo della giornata: un posto in città, la stazione, casa
export type Where = PlaceId | 'eki' | 'ie' | 'treno';
export const placeIt = (p: Where): string => (p === 'eki' ? 'stazione' : p === 'ie' ? 'casa' : p === 'treno' ? 'treno' : PLACES[p].it);

export interface PlaceInfo {
	id: PlaceId;
	sign: string; // insegna come si legge in città
	yomi: string; // lettura (mostrata sopra i kanji fuori livello)
	it: string;
	roof: string; // colore del tetto (pixel art)
}

export const PLACES: Record<PlaceId, PlaceInfo> = {
	kaisha: { id: 'kaisha', sign: '会社', yomi: 'かいしゃ', it: 'ufficio', roof: '#5b6ee1' },
	yuubin: { id: 'yuubin', sign: '郵便局', yomi: 'ゆうびんきょく', it: 'posta', roof: '#d95763' },
	konbini: { id: 'konbini', sign: 'コンビニ', yomi: 'こんびに', it: 'konbini', roof: '#37946e' },
	resutoran: { id: 'resutoran', sign: 'レストラン', yomi: 'れすとらん', it: 'ristorante', roof: '#df7126' },
	ginkou: { id: 'ginkou', sign: '銀行', yomi: 'ぎんこう', it: 'banca', roof: '#847e87' },
	byouin: { id: 'byouin', sign: '病院', yomi: 'びょういん', it: 'ospedale', roof: '#cbdbfc' },
	honya: { id: 'honya', sign: '本屋', yomi: 'ほんや', it: 'libreria', roof: '#8f563b' },
	hanaya: { id: 'hanaya', sign: '花屋', yomi: 'はなや', it: 'fioraio', roof: '#d77bba' },
	kusuri: { id: 'kusuri', sign: '薬屋', yomi: 'くすりや', it: 'farmacia', roof: '#99e550' },
	panya: { id: 'panya', sign: 'パン屋', yomi: 'ぱんや', it: 'panetteria', roof: '#eec39a' },
	toshokan: { id: 'toshokan', sign: '図書館', yomi: 'としょかん', it: 'biblioteca', roof: '#45283c' },
	kafe: { id: 'kafe', sign: 'カフェ', yomi: 'かふぇ', it: 'caffè', roof: '#663931' },
	gakkou: { id: 'gakkou', sign: '学校', yomi: 'がっこう', it: 'scuola', roof: '#fbf236' },
	kouen: { id: 'kouen', sign: '公園', yomi: 'こうえん', it: 'parco', roof: '#5a9e3a' },
	manshon: { id: 'manshon', sign: 'マンション', yomi: 'まんしょん', it: 'condominio', roof: '#9badb7' },
	eiga: { id: 'eiga', sign: '映画館', yomi: 'えいがかん', it: 'cinema', roof: '#ac3232' }
};

// Nome della parola come si dice nel parlato (con kanji solo se in livello)
const SPOKEN: Record<PlaceId, string> = {
	kaisha: '会社', yuubin: 'ゆうびんきょく', konbini: 'コンビニ', resutoran: 'レストラン', ginkou: '銀行',
	byouin: '病院', honya: '本屋', hanaya: '花屋', kusuri: '薬屋', panya: 'パン屋', toshokan: '図書館',
	kafe: 'カフェ', gakkou: '学校', kouen: 'こうえん', manshon: 'マンション', eiga: '映画館'
};

export interface Building {
	place: PlaceId;
	x: number; // angolo in alto a sinistra (2×2)
	y: number;
	door: Pos; // casella di strada davanti alla porta
}

// Gli isolati: righe/colonne 3-4, 5-6, 8-9, 10-11. La porta guarda la strada
// verticale o orizzontale accanto (alternate, così le indicazioni variano).
const SLOT_X = [3, 5, 8, 10];
const SLOT_Y = [3, 5, 8, 10];
const nearCol = (sx: number) => (sx === 3 ? 2 : sx === 10 ? 12 : 7);
const nearRow = (sy: number) => (sy === 3 ? 2 : sy === 10 ? 12 : 7);

export function buildTown(rng: Rng): Building[] {
	const ids = shuffled(rng, Object.keys(PLACES) as PlaceId[]);
	const out: Building[] = [];
	let i = 0;
	for (const sy of SLOT_Y) {
		for (const sx of SLOT_X) {
			const place = ids[i]!;
			const vertical = rng() < 0.5;
			const door = vertical
				? { x: nearCol(sx), y: sy + (rng() < 0.5 ? 0 : 1) }
				: { x: sx + (rng() < 0.5 ? 0 : 1), y: nearRow(sy) };
			out.push({ place, x: sx, y: sy, door });
			i += 1;
		}
	}
	return out;
}

export const buildingOf = (town: Building[], p: PlaceId): Building => town.find((b) => b.place === p)!;
export const buildingAtDoor = (town: Building[], pos: Pos): Building[] =>
	town.filter((b) => b.door.x === pos.x && b.door.y === pos.y);

// Percorso sulle strade (BFS): per il «tocca per camminare»
export function roadPath(from: Pos, to: Pos): Pos[] {
	const key = (p: Pos) => p.y * MAP_W + p.x;
	const prev = new Map<number, number>();
	const q: Pos[] = [from];
	prev.set(key(from), -1);
	while (q.length) {
		const c = q.shift()!;
		if (c.x === to.x && c.y === to.y) break;
		for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
			const n = { x: c.x + dx, y: c.y + dy };
			if (!isRoad(n.x, n.y) || prev.has(key(n))) continue;
			prev.set(key(n), key(c));
			q.push(n);
		}
	}
	if (!prev.has(key(to))) return [];
	const path: Pos[] = [];
	for (let k = key(to); k !== key(from); k = prev.get(k)!) path.unshift({ x: k % MAP_W, y: Math.floor(k / MAP_W) });
	return path;
}

// ── Indicazioni stradali (課題理解) ───────────────────────────────────────────
// Piano strutturato: poi diventa testo, e il test lo ri-percorre sulla mappa.
export interface Turn {
	signals: number; // quanti semafori incontri (0 = svolti subito, all'uscita)
	dir: 'R' | 'L';
}
export interface RoutePlan {
	turns: Turn[];
	side: 'R' | 'L'; // da che lato è l'edificio, nel verso di marcia
	target: PlaceId;
}

type Dir = { x: number; y: number };
const rightOf = (h: Dir): Dir => ({ x: -h.y, y: h.x });
const leftOf = (h: Dir): Dir => ({ x: h.y, y: -h.x });

// Percorre il piano dalla stazione: ritorna la casella e la direzione finali.
// Per l'ultimo tratto si cammina finché la porta del bersaglio è sulla strada.
export function followPlan(plan: { turns: Turn[] }, town: Building[], target: PlaceId): { pos: Pos; heading: Dir } {
	let pos: Pos = { ...START };
	let h: Dir = { x: 0, y: -1 };
	for (const t of plan.turns) {
		let seen = 0;
		while (seen < t.signals) {
			pos = { x: pos.x + h.x, y: pos.y + h.y };
			if (!isRoad(pos.x, pos.y)) throw new Error('fuori strada');
			if (isCrossing(pos.x, pos.y)) seen += 1;
		}
		h = t.dir === 'R' ? rightOf(h) : leftOf(h);
	}
	const door = buildingOf(town, target).door;
	for (let i = 0; i < MAP_W && !(pos.x === door.x && pos.y === door.y); i += 1) {
		pos = { x: pos.x + h.x, y: pos.y + h.y };
		if (!isRoad(pos.x, pos.y)) break;
	}
	return { pos, heading: h };
}

function sideOf(b: Building, pos: Pos, h: Dir): 'R' | 'L' {
	const cx = b.x + 0.5 - pos.x;
	const cy = b.y + 0.5 - pos.y;
	const r = rightOf(h);
	return cx * r.x + cy * r.y > 0 ? 'R' : 'L';
}

export function planRoute(town: Building[], target: PlaceId): RoutePlan {
	const d = buildingOf(town, target).door;
	const turns: Turn[] = [];
	const crossingsNorth = (fromY: number, toY: number) => ROAD_ROWS.filter((r) => r < fromY && r >= toY).length;
	if (d.x === START.x) {
		// dritto: nessuna svolta
	} else if ((ROAD_ROWS as readonly number[]).includes(d.y)) {
		turns.push({ signals: crossingsNorth(START.y, d.y), dir: d.x > START.x ? 'R' : 'L' });
	} else {
		// porta su un'altra strada verticale: su fino alla riga più vicina sotto la porta, poi due svolte
		const row = Math.min(...ROAD_ROWS.filter((r) => r > d.y));
		turns.push({ signals: crossingsNorth(START.y, row), dir: d.x > START.x ? 'R' : 'L' });
		// verso est (R) e poi a nord = sinistra; verso ovest (L) e poi a nord = destra
		turns.push({ signals: 1, dir: d.x > START.x ? 'L' : 'R' });
	}
	const { pos, heading } = followPlan({ turns }, town, target);
	return { turns, side: sideOf(buildingOf(town, target), pos, heading), target };
}

const NUM = ['', '一つ目', '二つ目', '三つ目'];
const LR = { R: '右', L: '左' } as const;
const LR_IT = { R: 'destra', L: 'sinistra' } as const;
const NUM_IT = ['', 'primo', 'secondo', 'terzo'];

// ── punti di riferimento sulla mappa (per indicazioni come quelle vere) ──
const at = (town: Building[], x: number, y: number) => town.find((b) => x >= b.x && x <= b.x + 1 && y >= b.y && y <= b.y + 1) ?? null;
// verso la strada della porta (dall'edificio): -1/0/+1 su x e y
function doorDir(b: Building): Dir {
	if (b.door.x < b.x) return { x: -1, y: 0 };
	if (b.door.x > b.x + 1) return { x: 1, y: 0 };
	if (b.door.y < b.y) return { x: 0, y: -1 };
	return { x: 0, y: 1 };
}
export interface Landmarks {
	corner: (Building | null)[]; // edificio all'angolo di ogni svolta
	next: Building | null; // accanto, stesso lato della strada
	front: Building | null; // di fronte, dall'altra parte della strada
	behind: Building | null; // dietro, nello stesso isolato
}
export function landmarks(plan: RoutePlan, town: Building[]): Landmarks {
	const t = buildingOf(town, plan.target);
	const dd = doorDir(t);
	// accanto: l'edificio contiguo che si affaccia sulla stessa strada
	const side = dd.x ? [{ x: t.x, y: t.y - 2 }, { x: t.x, y: t.y + 2 }] : [{ x: t.x - 2, y: t.y }, { x: t.x + 2, y: t.y }];
	const next = side.map((p) => town.find((b) => b.x === p.x && b.y === p.y) ?? null).find((b) => b && doorDir(b).x === dd.x && doorDir(b).y === dd.y) ?? null;
	// di fronte: oltre la strada della porta
	const front = at(town, t.door.x + dd.x, t.door.y + dd.y);
	// dietro: dall'altra parte dell'isolato
	const behind = town.find((b) => b.x === t.x - dd.x * 2 && b.y === t.y - dd.y * 2) ?? null;
	// angoli delle svolte: rifà il percorso e guarda gli edifici ai quattro angoli dell'incrocio
	const corner: (Building | null)[] = [];
	let pos: Pos = { ...START };
	let h: Dir = { x: 0, y: -1 };
	for (const turn of plan.turns) {
		let seen = 0;
		while (seen < turn.signals) {
			pos = { x: pos.x + h.x, y: pos.y + h.y };
			if (isCrossing(pos.x, pos.y)) seen += 1;
		}
		const nh = turn.dir === 'R' ? rightOf(h) : leftOf(h);
		// l'angolo «interno» della svolta: avanti + verso la nuova direzione
		const cands = [at(town, pos.x + h.x + nh.x, pos.y + h.y + nh.y), at(town, pos.x - h.x + nh.x, pos.y - h.y + nh.y)];
		corner.push(cands.find((b) => b && b.place !== plan.target) ?? null); // mai la destinazione stessa
		h = nh;
	}
	return { corner, next, front, behind };
}

// Testo delle indicazioni (passante gentile): a volte coi semafori contati, a
// volte coi punti di riferimento (all'angolo di…, accanto a…, davanti a…,
// dietro a…), con una trappola facoltativa: chi spiega si corregge.
export function directionsLines(plan: RoutePlan, rng: Rng, trap = rng() < 0.5, town?: Building[]): Line[] {
	const name = SPOKEN[plan.target];
	const who: Who = rng() < 0.5 ? 'F' : 'M';
	const lm = town ? landmarks(plan, town) : null;
	const sp = (b: Building) => SPOKEN[b.place];
	const lines: Line[] = [
		{ who: 'N', ja: `すみません、${name}は どこですか。`, it: `Scusi, dov'è ${PLACES[plan.target].it}?` }
	];
	const parts: string[] = [];
	const partsIt: string[] = [];
	plan.turns.forEach((t, i) => {
		const c = lm?.corner[i];
		const useCorner = c && rng() < 0.55;
		if (useCorner) {
			const pre = i === 0 ? (t.signals === 0 ? '駅を 出て、' : 'まっすぐ 行って、') : 'それから ';
			const preIt = i === 0 ? (t.signals === 0 ? 'uscito dalla stazione, ' : 'vai dritto e ') : 'poi ';
			parts.push(`${pre}${sp(c)}の かどを ${LR[t.dir]}に まがって`);
			partsIt.push(`${preIt}all’angolo di ${PLACES[c.place].it} giri a ${LR_IT[t.dir]}`);
		} else if (i === 0 && t.signals === 0) {
			parts.push(`駅を 出て、すぐ ${LR[t.dir]}に まがって`);
			partsIt.push(`uscito dalla stazione giri subito a ${LR_IT[t.dir]}`);
		} else if (i === 0) {
			parts.push(`まっすぐ 行って、${NUM[t.signals]}の しんごうを ${LR[t.dir]}に まがって`);
			partsIt.push(`vai dritto e al ${NUM_IT[t.signals]} semaforo giri a ${LR_IT[t.dir]}`);
		} else {
			parts.push(`つぎの しんごうを ${LR[t.dir]}に まがって`);
			partsIt.push(`al semaforo successivo giri a ${LR_IT[t.dir]}`);
		}
	});
	// dove sta: lato della strada e, se c'è, un riferimento vicino
	const refs: { ja: string; it: string }[] = [];
	if (lm?.next) refs.push({ ja: `${sp(lm.next)}の となりです`, it: `è accanto a ${PLACES[lm.next.place].it}` });
	if (lm?.front) refs.push({ ja: `${sp(lm.front)}の 前に あります`, it: `è davanti a ${PLACES[lm.front.place].it} (dall’altra parte della strada)` });
	if (lm?.behind && rng() < 0.4) refs.push({ ja: `${sp(lm.behind)}の うしろに ある たてものです。入口は 道の ほうです`, it: `è l’edificio dietro a ${PLACES[lm.behind.place].it}; l’ingresso dà sulla strada` });
	const ref = refs.length && rng() < 0.85 ? pick(rng, refs) : null;
	const side = `${LR[plan.side]}がわ`;
	const end = ref ? `${side}で、${ref.ja}よ。` : `${side}に ありますよ。`;
	const endIt = ref ? `È sulla ${LR_IT[plan.side]}: ${ref.it}.` : `È sulla ${LR_IT[plan.side]}.`;
	if (parts.length === 0) {
		lines.push({ who, ja: `この 道を まっすぐ 行って ください。${end}`, it: `Vada dritto per questa strada. ${endIt}` });
	} else {
		lines.push({
			who,
			ja: `${parts.join('、それから ').replace('それから それから ', 'それから ')} ください。${end}`,
			it: `${partsIt.join(', poi ').replace('poi poi ', 'poi ')}. ${endIt}`.replace(/^./, (c) => c.toUpperCase())
		});
	}
	const first = plan.turns[0];
	if (trap && first && first.signals >= 1) {
		// prima detto male, poi corretto: la risposta segue la correzione
		const wrong = first.signals === 1 ? 2 : 1;
		lines.splice(1, 0, {
			who,
			ja: `ええと、${NUM[wrong]}の しんごうを… あ、ちがいました。`,
			it: `Allora, al ${NUM_IT[wrong]} semaforo… ah no, mi sono sbagliato/a.`
		});
	} else if (trap && first) {
		lines.splice(1, 0, {
			who,
			ja: `ええと、${LR[first.dir === 'R' ? 'L' : 'R']}に… いえ、ちがいます。`,
			it: `Allora, a ${LR_IT[first.dir === 'R' ? 'L' : 'R']}… no, mi sbaglio.`
		});
	}
	// a volte chi chiede ripete per conferma (come all'esame)
	if (rng() < 0.4) {
		// solo riferimenti che si ripetono bene («Xの となりですね»), altrimenti il lato
		const conf = ref && ref.ja.endsWith('となりです') ? `${ref.ja}ね` : `${side}ですね`;
		lines.push({ who: 'N', ja: `${conf}。`, it: `Ripete per conferma: ${ref && ref.ja.endsWith('となりです') ? ref.it : `sulla ${LR_IT[plan.side]}`}.` });
	}
	lines.push({ who: 'N', ja: 'どうも ありがとう ございます。', it: 'Grazie mille.' });
	return lines;
}

// ── Missioni ────────────────────────────────────────────────────────────────

export interface Option {
	ja: string;
	it: string;
	icon?: string;
}

// scelta generica: priorità, motivo, frase da dire, avviso da eseguire, cartello
export interface ChoiceMission {
	kind: 'choice';
	sub: 'priority' | 'reason' | 'rpg' | 'read' | 'sign' | 'kadai' | 'point' | 'hatsuwa' | 'dokkai';
	sourceId?: string; // domanda della banca (file corso): conta per il ripasso
	scena?: string; // il disegno del foglio d'esame, descritto
	immagine?: string; // il disegno vero del foglio d'esame (data URI)
	audioOnly?: boolean; // 発話表現: le scelte si sentono soltanto (testo dopo)
	optionVoice?: Who;
	spiega?: string;
	title: string;
	intro: string; // contesto in italiano
	lines: Line[]; // audio (può essere vuoto: lettura)
	doc?: { title: string; ja: string; it: string; formato?: TestoFormato }; // testo da leggere (読解), com'è fatto il foglio
	question: { ja: string; it: string };
	options: Option[];
	answer: number;
	optionsFirst?: boolean; // ポイント理解: le scelte si leggono PRIMA dell'audio
	questionSpoken?: boolean; // ascolto d'esame: la domanda si sente soltanto (testo dopo)
	reaction?: Line; // risposta del personaggio dopo la scelta giusta
}

export interface ShopItem {
	id: string;
	ja: string;
	it: string;
	price: number;
	icon: string;
}
export interface ShopMission {
	kind: 'shop';
	title: string;
	intro: string;
	lines: Line[];
	shelf: ShopItemDef[];
	need: Record<string, number>; // id → quantità da comprare (né più né meno)
}

export interface CalDay {
	day: number;
	wd: number; // 0 = lunedì
	week: 0 | 1; // questa / prossima settimana
}
export interface CalendarMission {
	kind: 'calendar';
	title: string;
	intro: string;
	lines: Line[];
	days: CalDay[];
	today: number;
	answer: number;
	question: { ja: string; it: string };
}

export interface QuickRound {
	sourceId?: string;
	audioOnly?: boolean;
	line: Line;
	options: Option[];
	answer: number;
}
export interface QuickMission {
	kind: 'quick';
	title: string;
	intro: string;
	rounds: QuickRound[];
	seconds: number;
}

export interface RouteMission {
	kind: 'route';
	title: string;
	intro: string;
	lines: Line[];
	plan: RoutePlan;
}

// 📝 Ripasso in pausa: domande scritte d'esame (文字・語彙・文法), una dopo l'altra
export interface DrillRound {
	sourceId: string;
	tipo?: string; // moji / goi / bunpou: serve per spiegare le opzioni
	label: string; // istruzione del tipo di domanda
	frase: string; // con 【parola】 sottolineata o （　） da riempire
	it: string;
	options: Option[];
	answer: number;
	spiega?: string;
	completa?: string;
}
export interface DrillMission {
	kind: 'drill';
	title: string;
	intro: string;
	rounds: DrillRound[];
}

export type Mission = ChoiceMission | ShopMission | CalendarMission | QuickMission | RouteMission | DrillMission;

// Cosa allena ogni missione (per il riepilogo): i tipi del 聴解/読解 N4
export const SKILL_OF = (m: Mission): string => {
	if (m.kind === 'route' || m.kind === 'shop' || m.kind === 'calendar') return '課題理解';
	if (m.kind === 'quick') return '即時応答';
	if (m.kind === 'drill') return '文字・語彙・文法';
	return {
		priority: '課題理解', reason: 'ポイント理解', rpg: '発話表現', read: '読解', sign: '文字',
		kadai: '課題理解', point: 'ポイント理解', hatsuwa: '発話表現', dokkai: '読解'
	}[m.sub];
};

// ── 文字: cartelli ──────────────────────────────────────────────────────────
const SIGN_TASKS: { it: string; answer: string; options: string[]; yomi: Record<string, string>; itOf: Record<string, string> }[] = [
	{ it: 'La tua amica ti aspetta all’uscita EST della stazione. Quale cartello segui?', answer: '東口', options: ['東口', '西口', '南口', '北口'], yomi: { 東口: 'ひがしぐち', 西口: 'にしぐち', 南口: 'みなみぐち', 北口: 'きたぐち' }, itOf: { 東口: 'uscita est', 西口: 'uscita ovest', 南口: 'uscita sud', 北口: 'uscita nord' } },
	{ it: 'Il collega ti aspetta all’uscita OVEST. Quale cartello segui?', answer: '西口', options: ['東口', '西口', '南口', '北口'], yomi: { 東口: 'ひがしぐち', 西口: 'にしぐち', 南口: 'みなみぐち', 北口: 'きたぐち' }, itOf: { 東口: 'uscita est', 西口: 'uscita ovest', 南口: 'uscita sud', 北口: 'uscita nord' } },
	{ it: 'Devi uscire dalla stazione. Quale cartello segui?', answer: '出口', options: ['出口', '入口', '南口', '北口'], yomi: { 出口: 'でぐち', 入口: 'いりぐち', 南口: 'みなみぐち', 北口: 'きたぐち' }, itOf: { 出口: 'uscita', 入口: 'entrata', 南口: 'uscita sud', 北口: 'uscita nord' } },
	{ it: 'Cerchi il bagno degli uomini. Quale porta?', answer: '男', options: ['男', '女', '休', '水'], yomi: { 男: 'おとこ', 女: 'おんな', 休: 'やすみ', 水: 'みず' }, itOf: { 男: 'uomini', 女: 'donne', 休: 'riposo', 水: 'acqua' } },
	{ it: 'Cerchi il bagno delle donne. Quale porta?', answer: '女', options: ['男', '女', '休', '水'], yomi: { 男: 'おとこ', 女: 'おんな', 休: 'やすみ', 水: 'みず' }, itOf: { 男: 'uomini', 女: 'donne', 休: 'riposo', 水: 'acqua' } },
	{ it: 'Vuoi entrare nel grande magazzino della stazione. Quale porta?', answer: '入口', options: ['出口', '入口', '東口', '西口'], yomi: { 出口: 'でぐち', 入口: 'いりぐち', 東口: 'ひがしぐち', 西口: 'にしぐち' }, itOf: { 出口: 'uscita', 入口: 'entrata', 東口: 'uscita est', 西口: 'uscita ovest' } },
	{ it: 'Vuoi un posto dove sederti ad aspettare. Quale cartello?', answer: '待合室', options: ['待合室', '売店', '出口', '入口'], yomi: { 待合室: 'まちあいしつ', 売店: 'ばいてん', 出口: 'でぐち', 入口: 'いりぐち' }, itOf: { 待合室: 'sala d’attesa', 売店: 'chiosco', 出口: 'uscita', 入口: 'entrata' } }
];

export function signMission(rng: Rng): ChoiceMission {
	const t = pick(rng, SIGN_TASKS);
	const opts = shuffled(rng, t.options);
	return {
		kind: 'choice',
		sub: 'sign',
		title: '🚉 I cartelli della stazione',
		intro: t.it,
		lines: [],
		question: { ja: 'どれですか。', it: t.it },
		options: opts.map((o) => ({ ja: o, it: `${t.yomi[o]} = ${t.itOf[o]}` })),
		answer: opts.indexOf(t.answer)
	};
}

// ── 課題理解: priorità in ufficio («それより まず…») ──────────────────────────
// Ogni compito ha il suo motivo d'urgenza: un motivo generico («il capo lo
// vuole subito» per una telefonata) rendeva il dialogo incoerente.
interface Task extends Option {
	te: string; // richiesta (forma て)
	mas: string; // «allora faccio…»
	imp: string; // richiesta in italiano (imperativo)
	why: { ja: string; it: string };
}
const TASKS: Task[] = [
	{ ja: 'コピーを する', it: 'fare le fotocopie', icon: '🖨️', te: 'この しりょうを 五まい ずつ コピーして', mas: 'コピーを します', imp: 'fai cinque copie di questi documenti', why: { ja: 'かいぎで すぐ 使いますから。', it: 'perché ci servono subito per la riunione.' } },
	{ ja: 'メールを 書く', it: 'scrivere la mail', icon: '💻', te: '山田さんに メールを 書いて', mas: 'メールを 書きます', imp: 'scrivi una mail a Yamada', why: { ja: '山田さんが へんじを 待って いますから。', it: 'perché Yamada aspetta la risposta.' } },
	{ ja: 'かいぎしつを じゅんびする', it: 'preparare la sala riunioni', icon: '🪑', te: 'かいぎしつの いすを ならべて', mas: 'かいぎしつを じゅんびします', imp: 'sistema le sedie della sala riunioni', why: { ja: 'かいぎが 早く 始まる ことに なりましたから。', it: 'perché la riunione inizierà prima.' } },
	{ ja: 'おきゃくさんに 電話する', it: 'telefonare al cliente', icon: '☎️', te: 'おきゃくさんに 電話して', mas: '電話します', imp: 'telefona al cliente', why: { ja: 'おきゃくさんが 電話を 待って いますから。', it: 'perché il cliente aspetta la chiamata.' } },
	{ ja: 'お茶を 出す', it: 'servire il tè', icon: '🍵', te: 'おきゃくさんに お茶を 出して', mas: 'お茶を 出します', imp: 'servi il tè all’ospite', why: { ja: 'おきゃくさんが もう 来て いますから。', it: 'perché l’ospite è già arrivato.' } },
	{ ja: 'しりょうを 読む', it: 'leggere i documenti', icon: '📄', te: 'かいぎの 前に しりょうを 読んで', mas: 'しりょうを 読みます', imp: 'leggi i documenti prima della riunione', why: { ja: 'かいぎで 意見を 聞きますから。', it: 'perché alla riunione ti chiederò un parere.' } }
];

export function priorityMission(rng: Rng): ChoiceMission {
	const [a, b, c, d] = shuffled(rng, TASKS);
	const boss: Who = rng() < 0.5 ? 'M' : 'F';
	const me: Who = boss === 'M' ? 'F' : 'M'; // chi riceve i compiti: l'altra voce
	const lines: Line[] = [
		{ who: 'N', ja: `会社で ${boss === 'M' ? '男' : '女'}の 人と ${me === 'M' ? '男' : '女'}の 人が 話して います。${me === 'M' ? '男' : '女'}の 人は まず 何を しますか。`, it: `In ufficio parlano ${boss === 'M' ? 'un capo e una impiegata' : 'una capa e un impiegato'}. Cosa fa per prima cosa ${me === 'M' ? 'l’impiegato' : 'l’impiegata'}?` },
		{ who: boss, ja: `${a!.te} ください。それから、${b!.te} くれますか。`, it: `Per favore, ${a!.imp}. E poi ${b!.imp}, per favore.` },
		{ who: me, ja: `はい、わかりました。じゃあ、${a!.mas}。`, it: `Sì, va bene. Allora inizio a ${a!.it}.` },
		{ who: boss, ja: `あ、ちょっと 待って。それより まず、${c!.te} ください。${c!.why.ja}`, it: `Ah, aspetta. Prima di tutto ${c!.imp}, ${c!.why.it}` },
		{ who: me, ja: 'はい、すぐ します。', it: 'Sì, lo faccio subito.' }
	];
	const q = `${me === 'M' ? '男' : '女'}の 人は まず 何を しますか。`;
	const opts = shuffled(rng, [a!, b!, c!, d!]);
	return {
		kind: 'choice',
		sub: 'priority',
		title: '🏢 Cosa faccio prima?',
		intro: 'Un superiore dà dei compiti e poi cambia idea. Ascolta bene: alla fine cosa si fa per primo?',
		lines,
		question: { ja: q, it: 'Cosa fa per prima cosa?' },
		options: opts.map(({ ja, it, icon }) => ({ ja, it, icon })),
		answer: opts.indexOf(c!)
	};
}

// ── ポイント理解: il vero motivo ─────────────────────────────────────────────
const REASONS = [
	{ key: 'kaze', guessIt: 'È il raffreddore?', yesIt: 'In realtà mi sono preso il raffreddore.', guess: 'かぜですか。', deny: 'かぜじゃ ありません。', yes: 'じつは かぜを ひいて しまったんです。', opt: 'かぜを ひいたから', it: 'perché si è preso il raffreddore', denyIt: 'Non è il raffreddore.' },
	{ key: 'shigoto', guessIt: 'Avevi troppo lavoro?', yesIt: 'Il lavoro non finiva più.', guess: 'しごとが いそがしかったんですか。', deny: 'しごとは 早く 終わったんですが…', yes: 'しごとが 終わらなかったんです。', opt: 'しごとが いそがしかったから', it: 'perché aveva troppo lavoro', denyIt: 'Il lavoro è finito presto, però…' },
	{ key: 'densha', guessIt: 'Il treno era in ritardo?', yesIt: 'Il treno si è fermato.', guess: '電車が おくれたんですか。', deny: '電車は ちゃんと 来ましたよ。', yes: '電車が 止まって しまったんです。', opt: '電車が 止まったから', it: 'perché il treno si è fermato', denyIt: 'Il treno è arrivato regolarmente.' },
	{ key: 'kazoku', guessIt: 'È venuta la tua famiglia?', yesIt: 'È venuta mia madre dal mio paese.', guess: 'ご家族が 来たんですか。', deny: '家族は 来週 来ます。', yes: '国から 母が 来たんです。', opt: '家族が 来たから', it: 'perché è venuta la famiglia', denyIt: 'La famiglia viene la prossima settimana.' },
	{ key: 'ame', guessIt: 'Pioveva troppo?', yesIt: 'Pioveva così forte che non potevo uscire.', guess: '雨が ひどかったからですか。', deny: '雨は もう 止んで いましたよ。', yes: '雨が ひどくて 外に 出られなかったんです。', opt: '雨が ひどかったから', it: 'perché pioveva troppo', denyIt: 'Aveva già smesso di piovere.' },
	{ key: 'michi', guessIt: 'Non sapevi la strada?', yesIt: 'Mi sono perso.', guess: '道が わからなかったんですか。', deny: '道は 知って いました。', yes: '道が わからなく なって しまったんです。', opt: '道が わからなかったから', it: 'perché si è perso', denyIt: 'La strada la conosceva.' },
	{ key: 'neboo', guessIt: 'Ti sei svegliato tardi?', yesIt: 'Ho dovuto portare mio figlio dal medico.', guess: 'ねぼうしたんですか。', deny: 'ちゃんと 早く おきましたよ。', yes: '子どもを びょういんに つれて 行ったんです。', opt: '子どもを びょういんに つれて 行ったから', it: 'perché ha portato il figlio dal medico', denyIt: 'Mi sono alzato presto.' },
	{ key: 'keitai', guessIt: 'Il cellulare era rotto?', yesIt: 'Avevo lasciato il cellulare in ufficio.', guess: 'けいたいが こわれたんですか。', deny: 'けいたいは こわれて いません。', yes: 'けいたいを 会社に わすれて きて しまったんです。', opt: 'けいたいを 会社に わすれたから', it: 'perché ha lasciato il cellulare in ufficio', denyIt: 'Il cellulare non è rotto.' },
	{ key: 'saifu', guessIt: 'Avevi mal di pancia?', yesIt: 'Ho dimenticato il portafoglio a casa.', guess: 'おなかが いたかったんですか。', deny: 'おなかは だいじょうぶです。', yes: 'さいふを 家に わすれて しまったんです。', opt: 'さいふを わすれたから', it: 'perché ha dimenticato il portafoglio', denyIt: 'La pancia sta bene.' }
];
const EVENTS = [
	{ ja: 'きのうの パーティーに 来なかった', q: 'パーティーに 来ませんでしたか', it: 'non è venuto alla festa di ieri' },
	{ ja: 'けさ かいぎに おくれた', q: 'かいぎに おくれましたか', it: 'stamattina è arrivato tardi alla riunione' },
	{ ja: 'どようびの テニスを 休んだ', q: 'テニスを 休みましたか', it: 'ha saltato il tennis di sabato' },
	{ ja: 'きのう 電話に 出なかった', q: '電話に 出ませんでしたか', it: 'ieri non ha risposto al telefono' },
	{ ja: 'しゅくだいを 出さなかった', q: 'しゅくだいを 出しませんでしたか', it: 'non ha consegnato i compiti' },
	{ ja: 'ひっこしを 手つだえなかった', q: 'ひっこしを 手つだえませんでしたか', it: 'non ha potuto aiutare nel trasloco' }
];

export function reasonMission(rng: Rng): ChoiceMission {
	const [truth, g1, g2, other] = shuffled(rng, REASONS);
	const ev = pick(rng, EVENTS);
	const f: Who = 'F';
	const m: Who = 'M';
	const lines: Line[] = [
		{ who: 'N', ja: `女の人と 男の人が 話して います。男の人は どうして ${ev.q}。`, it: `Una donna e un uomo parlano. Perché l'uomo ${ev.it}?` },
		{ who: f, ja: `田中さん、どうして ${ev.ja}んですか。${g1!.guess}`, it: `Tanaka, perché ${ev.it.replace(/^(\S+) /, '$1 ')}? ${g1!.guessIt}` },
		{ who: m, ja: `いいえ、${g1!.deny}`, it: `No. ${g1!.denyIt}` },
		{ who: f, ja: `じゃあ、${g2!.guess}`, it: `Allora… ${g2!.guessIt}` },
		{ who: m, ja: `それも ちがいます。${g2!.deny} ${truth!.yes}`, it: `Nemmeno. ${g2!.denyIt} ${truth!.yesIt}` },
		{ who: f, ja: 'そうだったんですか。たいへんでしたね。', it: 'Ah, così. Che seccatura.' }
	];
	const opts = shuffled(rng, [truth!, g1!, g2!, other!]);
	return {
		kind: 'choice',
		sub: 'reason',
		title: '🤔 Il vero motivo',
		intro: 'Leggi le risposte, poi ascolta: chi parla scarta alcuni motivi prima di dire quello vero.',
		lines,
		optionsFirst: true,
		question: { ja: `男の人は どうして ${ev.q}。`, it: `Perché l'uomo ${ev.it}?` },
		options: opts.map((o) => ({ ja: o.opt, it: o.it })),
		answer: opts.indexOf(truth!)
	};
}

// ── 発話表現: cosa dici? (scelte da gioco di ruolo) ───────────────────────────
const RPG: { scene: string; icon: string; right: Option; wrong: Option[]; reaction: Line }[] = [
	{ scene: 'Un collega ha la febbre e torna a casa prima. Cosa gli dici?', icon: '🤒', right: { ja: 'お大事に。', it: 'Riguardati.' }, wrong: [{ ja: 'おかげさまで。', it: 'Grazie a voi (sto bene).' }, { ja: 'いってきます。', it: 'Esco (e torno).' }], reaction: { who: 'M', ja: 'ありがとう ございます。お先に しつれいします。', it: 'Grazie. Scusate se vado prima.' } },
	{ scene: 'Hai finito il lavoro e lasci l’ufficio prima dei colleghi.', icon: '🏃', right: { ja: 'お先に しつれいします。', it: 'Scusate, vado prima di voi.' }, wrong: [{ ja: 'いただきます。', it: 'Buon appetito (prima di mangiare).' }, { ja: 'おかえりなさい。', it: 'Bentornato.' }], reaction: { who: 'F', ja: 'おつかれさまでした。', it: 'Buon lavoro (grazie della fatica).' } },
	{ scene: 'Entri a casa di un collega che ti ha invitato.', icon: '🏠', right: { ja: 'おじゃまします。', it: 'Permesso (entro in casa tua).' }, wrong: [{ ja: 'ただいま。', it: 'Sono a casa.' }, { ja: 'ごちそうさまでした。', it: 'Grazie del pasto.' }], reaction: { who: 'F', ja: 'どうぞ、上がって ください。', it: 'Prego, accomodati.' } },
	{ scene: 'Vuoi chiedere a un collega di prestarti la penna.', icon: '🖊️', right: { ja: 'ペンを 貸して もらえませんか。', it: 'Potresti prestarmi la penna?' }, wrong: [{ ja: 'ペンを 借りて ください。', it: 'Prendi in prestito una penna (ordine).' }, { ja: 'ペンを 貸しましょうか。', it: 'Ti presto io una penna?' }], reaction: { who: 'M', ja: 'はい、どうぞ。', it: 'Sì, prego.' } },
	{ scene: 'Un cliente entra nel tuo negozio: lo saluti.', icon: '🛎️', right: { ja: 'いらっしゃいませ。', it: 'Benvenuto (al cliente).' }, wrong: [{ ja: 'いってらっしゃい。', it: 'Buona uscita (a chi esce di casa).' }, { ja: 'お元気で。', it: 'Stammi bene (al saluto finale).' }], reaction: { who: 'M', ja: 'あの、パンは どこですか。', it: 'Scusi, dov’è il pane?' } },
	{ scene: 'Telefoni in un’azienda e vuoi parlare con il signor Yamada.', icon: '☎️', right: { ja: '山田さんは いらっしゃいますか。', it: 'C’è il signor Yamada?' }, wrong: [{ ja: '山田は おりますか。', it: 'C’è Yamada? (umile: si usa per i colleghi della PROPRIA azienda)' }, { ja: '山田さんを ください。', it: 'Mi dia il signor Yamada. (assurdo)' }], reaction: { who: 'F', ja: 'はい、少々 お待ち ください。', it: 'Sì, attenda un momento.' } },
	{ scene: 'Al ristorante: il cameriere ti chiede cosa prendi. Tu vuoi il pesce.', icon: '🐟', right: { ja: '魚の ていしょくを おねがいします。', it: 'Il menù di pesce, per favore.' }, wrong: [{ ja: '魚の ていしょくに なさいますか。', it: 'Prende il menù di pesce? (lo dice il cameriere)' }, { ja: '魚は けっこうです。', it: 'Il pesce no, grazie.' }], reaction: { who: 'F', ja: 'かしこまりました。少々 お待ち ください。', it: 'Certamente. Attenda un momento.' } },
	{ scene: 'Una signora anziana porta una valigia pesante. Le offri aiuto.', icon: '🧳', right: { ja: '持ちましょうか。', it: 'Gliela porto io?' }, wrong: [{ ja: '持って ください。', it: 'La porti, per favore.' }, { ja: '持って もらいましょうか。', it: 'Ce la facciamo portare da qualcuno?' }], reaction: { who: 'F', ja: 'まあ、ありがとう。たすかります。', it: 'Oh, grazie. Mi è di grande aiuto.' } },
	{ scene: 'Il collega ti chiede come sta tua madre, che stava male. Ora sta bene.', icon: '😊', right: { ja: 'おかげさまで、元気に なりました。', it: 'Grazie a voi, si è ripresa.' }, wrong: [{ ja: 'お大事に。', it: 'Riguardati.' }, { ja: 'どういたしまして。', it: 'Prego (dopo un grazie).' }], reaction: { who: 'M', ja: 'それは よかったですね。', it: 'Che bella notizia.' } },
	{ scene: 'Hai rotto per sbaglio la tazza di un collega.', icon: '☕', right: { ja: 'ほんとうに すみませんでした。', it: 'Mi scusi davvero.' }, wrong: [{ ja: 'よろしく おねがいします。', it: 'Piacere / conto su di te.' }, { ja: 'おめでとう ございます。', it: 'Congratulazioni.' }], reaction: { who: 'F', ja: 'いいえ、だいじょうぶですよ。', it: 'Ma no, non fa niente.' } }
];

export function rpgMission(rng: Rng, idx?: number): ChoiceMission {
	const s = idx === undefined ? pick(rng, RPG) : RPG[idx % RPG.length]!;
	const opts = shuffled(rng, [s.right, ...s.wrong]);
	return {
		kind: 'choice',
		sub: 'rpg',
		title: `${s.icon} Cosa dici?`,
		intro: s.scene,
		lines: [],
		question: { ja: '何と 言いますか。', it: s.scene },
		options: opts,
		answer: opts.indexOf(s.right),
		reaction: s.reaction
	};
}

// ── A casa: saluti di famiglia e piccole cose prima di uscire / dopo il ritorno ──
// Una domanda sola, breve: la giornata comincia e finisce a casa, senza pesare.
interface HomeScene {
	intro: string;
	lines: Line[];
	q: { ja: string; it: string };
	options: Option[]; // la prima è la giusta
	reaction?: Line;
	spiega: string;
}
const HOME: Record<'mattina' | 'sera', HomeScene[]> = {
	mattina: [
		{
			intro: 'Esci di casa per andare al lavoro. Cosa dici alla famiglia?',
			lines: [{ who: 'N', ja: 'うちを 出る ときに、かぞくに 何と 言いますか。', it: 'Uscendo di casa, cosa dici alla famiglia?' }],
			q: { ja: '何と 言いますか。', it: 'Cosa dici?' },
			options: [
				{ ja: 'いってきます。', it: 'Vado (e torno).' },
				{ ja: 'いってらっしゃい。', it: 'Vai (e torna): lo dice chi resta.' },
				{ ja: 'ただいま。', it: 'Sono tornato.' },
				{ ja: 'おかえりなさい。', it: 'Bentornato.' }
			],
			reaction: { who: 'F', ja: 'いってらっしゃい。気を つけてね。', it: 'Vai, stai attento.' },
			spiega: 'Chi esce dice いってきます; chi resta risponde いってらっしゃい.'
		},
		{
			intro: 'Stai uscendo e saluti. Cosa ti risponde tua madre?',
			lines: [{ who: 'M', ja: 'じゃあ、いってきます。', it: 'Allora, vado.' }],
			q: { ja: 'お母さんは 何と 言いますか。', it: 'Cosa dice la mamma?' },
			options: [
				{ ja: 'いってらっしゃい。', it: 'Vai e torna.' },
				{ ja: 'いってきます。', it: 'Vado e torno.' },
				{ ja: 'いただきます。', it: 'Buon appetito (prima di mangiare).' },
				{ ja: 'おやすみなさい。', it: 'Buona notte.' }
			],
			spiega: 'A いってきます si risponde いってらっしゃい.'
		},
		{
			intro: 'La colazione è in tavola. Prima di cominciare a mangiare cosa si dice?',
			lines: [{ who: 'F', ja: 'あさごはん、できたよ。どうぞ。', it: 'La colazione è pronta. Prego.' }],
			q: { ja: '食べる 前に 何と 言いますか。', it: 'Cosa si dice prima di mangiare?' },
			options: [
				{ ja: 'いただきます。', it: 'Buon appetito (grazie per il cibo).' },
				{ ja: 'ごちそうさまでした。', it: 'Grazie del pasto (alla fine).' },
				{ ja: 'おかえりなさい。', it: 'Bentornato.' },
				{ ja: 'いってきます。', it: 'Vado e torno.' }
			],
			reaction: { who: 'F', ja: 'はい、どうぞ。', it: 'Prego.' },
			spiega: 'いただきます prima di mangiare, ごちそうさまでした dopo.'
		},
		{
			intro: 'Prima di uscire, tua madre guarda nel frigo. Cosa devi comprare al ritorno?',
			lines: [
				{ who: 'F', ja: 'ちょっと れいぞうこを 見て。ぎゅうにゅうは もう ないね。', it: 'Guarda un po’ in frigo. Il latte è finito.' },
				{ who: 'F', ja: 'たまごは まだ 三つ あるから いいわ。あ、パンも ない。', it: 'Le uova: ce ne sono ancora tre, vanno bene. Ah, manca anche il pane.' },
				{ who: 'F', ja: '帰りに 買って きて くれる？', it: 'Me li compri tornando?' }
			],
			q: { ja: '帰りに 何を 買いますか。', it: 'Cosa compri tornando?' },
			options: [
				{ ja: 'ぎゅうにゅうと パン', it: 'latte e pane' },
				{ ja: 'ぎゅうにゅうと たまご', it: 'latte e uova' },
				{ ja: 'たまごと パン', it: 'uova e pane' },
				{ ja: 'たまごだけ', it: 'solo uova' }
			],
			spiega: 'Le uova ci sono ancora (まだ 三つ ある): servono latte e pane.'
		},
		{
			intro: 'Stai uscendo. Ascolta la mamma: cosa devi portare?',
			lines: [
				{ who: 'F', ja: 'きょうは 午後から 雨が ふるそうよ。', it: 'Oggi dicono che pioverà dal pomeriggio.' },
				{ who: 'F', ja: 'かさを 持って 行ってね。おべんとうは もう かばんに 入れたから。', it: 'Porta l’ombrello. Il pranzo te l’ho già messo in borsa.' }
			],
			q: { ja: '何を 持って 行かなければ なりませんか。', it: 'Cosa devi prendere?' },
			options: [
				{ ja: 'かさ', it: 'l’ombrello' },
				{ ja: 'おべんとう', it: 'il pranzo' },
				{ ja: 'かさと おべんとう', it: 'ombrello e pranzo' },
				{ ja: '何も いらない', it: 'niente' }
			],
			spiega: 'Il pranzo è già in borsa (もう 入れた): devi prendere solo l’ombrello.'
		}
	],
	sera: [
		{
			intro: 'Rientri a casa la sera. Cosa dici entrando?',
			lines: [{ who: 'N', ja: 'うちに 帰りました。何と 言いますか。', it: 'Sei tornato a casa. Cosa dici?' }],
			q: { ja: '何と 言いますか。', it: 'Cosa dici?' },
			options: [
				{ ja: 'ただいま。', it: 'Sono tornato.' },
				{ ja: 'おかえりなさい。', it: 'Bentornato: lo dice chi è in casa.' },
				{ ja: 'いってきます。', it: 'Vado e torno.' },
				{ ja: 'おじゃまします。', it: 'Permesso (a casa d’altri).' }
			],
			reaction: { who: 'F', ja: 'おかえりなさい。つかれたでしょう。', it: 'Bentornato. Sarai stanco.' },
			spiega: 'Chi rientra dice ただいま; chi è in casa risponde おかえりなさい. おじゃまします è per casa d’altri.'
		},
		{
			intro: 'Sei appena rientrato e hai salutato. Cosa ti risponde la famiglia?',
			lines: [{ who: 'M', ja: 'ただいま。', it: 'Sono tornato.' }],
			q: { ja: 'かぞくは 何と 言いますか。', it: 'Cosa risponde la famiglia?' },
			options: [
				{ ja: 'おかえりなさい。', it: 'Bentornato.' },
				{ ja: 'いってらっしゃい。', it: 'Vai e torna.' },
				{ ja: 'ただいま。', it: 'Sono tornato.' },
				{ ja: 'ごちそうさまでした。', it: 'Grazie del pasto.' }
			],
			spiega: 'A ただいま si risponde おかえりなさい.'
		},
		{
			intro: 'Hai finito la cena. Cosa si dice alla fine del pasto?',
			lines: [{ who: 'F', ja: 'もう 少し 食べる？', it: 'Ne vuoi ancora un po’?' }],
			q: { ja: '食べた あとで 何と 言いますか。', it: 'Cosa si dice dopo aver mangiato?' },
			options: [
				{ ja: 'いいえ、もう けっこうです。ごちそうさまでした。', it: 'No, basta così. Grazie del pasto.' },
				{ ja: 'はい、いただきました。', it: 'Sì, ho ricevuto.' },
				{ ja: 'いいえ、いただきます。', it: 'No, buon appetito.' },
				{ ja: 'はい、おかえりなさい。', it: 'Sì, bentornato.' }
			],
			reaction: { who: 'F', ja: 'はい、おそまつさまでした。', it: 'Prego, è stato poca cosa.' },
			spiega: 'もう けっこうです = basta così (gentile); ごちそうさまでした alla fine del pasto.'
		},
		{
			intro: 'È tardi e vai a dormire. Cosa dici alla famiglia?',
			lines: [{ who: 'F', ja: 'あしたも 早いでしょう。もう ねたら？', it: 'Anche domani ti alzi presto, no? Perché non vai a dormire?' }],
			q: { ja: 'ねる 前に 何と 言いますか。', it: 'Cosa dici prima di dormire?' },
			options: [
				{ ja: 'うん、おやすみなさい。', it: 'Sì, buona notte.' },
				{ ja: 'うん、おはよう。', it: 'Sì, buongiorno.' },
				{ ja: 'うん、いってきます。', it: 'Sì, vado.' },
				{ ja: 'うん、こんばんは。', it: 'Sì, buonasera.' }
			],
			spiega: 'おやすみなさい prima di dormire; こんばんは è un saluto d’incontro, non di congedo.'
		},
		{
			intro: 'La mamma ti chiede del latte che ti aveva chiesto stamattina.',
			lines: [
				{ who: 'F', ja: 'ぎゅうにゅう、買って きて くれた？', it: 'Hai comprato il latte?' },
				{ who: 'M', ja: 'あ、わすれちゃった。ごめん。あした 買って くるね。', it: 'Ah, l’ho dimenticato. Scusa, lo compro domani.' },
				{ who: 'F', ja: 'いいわよ。あしたの あさは おちゃに するから。', it: 'Va bene. Domattina allora prendo il tè.' }
			],
			q: { ja: 'お母さんは あしたの あさ 何を 飲みますか。', it: 'Cosa berrà la mamma domattina?' },
			options: [
				{ ja: 'おちゃ', it: 'tè' },
				{ ja: 'ぎゅうにゅう', it: 'latte' },
				{ ja: 'コーヒー', it: 'caffè' },
				{ ja: 'ジュース', it: 'succo' }
			],
			spiega: 'Il latte è stato dimenticato, quindi おちゃに する = prenderò il tè.'
		}
	]
};

export function homeMission(rng: Rng, when: 'mattina' | 'sera'): ChoiceMission {
	const s = pick(rng, HOME[when]);
	const order = shuffled(rng, s.options.map((_, i) => i));
	return {
		kind: 'choice',
		sub: 'kadai',
		title: when === 'mattina' ? '🏠 A casa, prima di uscire' : '🏠 Di nuovo a casa',
		intro: s.intro,
		lines: s.lines,
		question: s.q,
		options: order.map((i) => s.options[i]!),
		answer: order.indexOf(0),
		reaction: s.reaction,
		spiega: s.spiega
	};
}

// ── 読解: un messaggio da eseguire ───────────────────────────────────────────
const NUM_KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
export function readMission(rng: Rng): ChoiceMission {
	const oldH = pick(rng, [9, 10, 2, 3]);
	const newH = oldH === 9 ? 10 : oldH === 10 ? 11 : oldH + 1;
	const pm = oldH < 6;
	const oldF = pick(rng, [2, 3, 4]);
	const newF = oldF + 2;
	const changeTime = rng() < 0.75;
	const changeFloor = rng() < 0.75 || !changeTime;
	const t = changeTime ? newH : oldH;
	const fl = changeFloor ? newF : oldF;
	const tLabel = (h: number) => `${pm ? '午後' : '午前'}${NUM_KANJI[h]}時`;
	const tIt = (h: number) => `ore ${pm ? h + 12 : h}:00`;
	const body = [
		'みなさんへ',
		`あしたの かいぎは ${tLabel(oldH)}からの よていでしたが、${changeTime ? `${tLabel(newH)}からに なりました。` : 'その ままです。'}`,
		`場所は ${oldF}かいの かいぎしつ${changeFloor ? `では なくて、${newF}かいの 大きい かいぎしつです。` : 'です。'}`,
		'しりょうは わたしが 作って おきますから、何も 持って 来なくても いいです。',
		'中村'
	].join('\n');
	const bodyIt = [
		'A tutti,',
		`la riunione di domani era prevista dalle ${tIt(oldH)}, ${changeTime ? `ma è stata spostata alle ${tIt(newH)}.` : 'e resta così.'}`,
		`Il luogo ${changeFloor ? `non è la sala al ${oldF}° piano, ma quella grande al ${newF}° piano.` : `è la sala al ${oldF}° piano.`}`,
		'I documenti li preparo io: non serve portare niente.',
		'Nakamura'
	].join('\n');
	const combos = [
		{ h: t, f: fl },
		{ h: changeTime ? oldH : newH, f: fl },
		{ h: t, f: changeFloor ? oldF : newF },
		{ h: changeTime ? oldH : newH, f: changeFloor ? oldF : newF }
	];
	const opts = shuffled(rng, combos);
	return {
		kind: 'choice',
		sub: 'read',
		title: '📧 Una mail del collega',
		intro: 'Leggi la mail sul telefono: dove e a che ora devi andare domani?',
		lines: [],
		doc: { title: 'かいぎの 時間と 場所', ja: body, it: bodyIt },
		question: { ja: 'あした、何時に どこへ 行きますか。', it: 'Domani a che ora e dove vai?' },
		options: opts.map((o) => ({ ja: `${tLabel(o.h)}・${o.f}かい`, it: `${tIt(o.h)}, ${o.f}° piano` })),
		answer: opts.indexOf(combos[0]!)
	};
}

// ── 課題理解: cosa portare (annuncio dell'insegnante / del capo) ──────────────
const BRING = [
	{ ja: '写真', it: 'le foto' }, { ja: 'スリッパ', it: 'le pantofole' }, { ja: 'おべんとう', it: 'il pranzo al sacco' },
	{ ja: 'じしょ', it: 'il dizionario' }, { ja: 'かさ', it: 'l’ombrello' }, { ja: 'ペン', it: 'la penna' },
	{ ja: '水', it: 'l’acqua' }, { ja: 'お金', it: 'i soldi' }, { ja: 'ノート', it: 'il quaderno' }, { ja: 'くつ', it: 'le scarpe' }
];
const OUTINGS = [
	{ ja: 'こうじょうの 見学', it: 'la visita alla fabbrica' }, { ja: '山の ハイキング', it: 'l’escursione in montagna' },
	{ ja: 'びじゅつかんの 見学', it: 'la visita al museo' }, { ja: 'しょうがっこうの こうりゅうかい', it: 'l’incontro con la scuola elementare' }
];
export function bringMission(rng: Rng): ChoiceMission {
	const [a, b, c, d] = shuffled(rng, BRING);
	const out = pick(rng, OUTINGS);
	const sp: Who = rng() < 0.5 ? 'M' : 'F';
	const lines: Line[] = [
		{ who: 'N', ja: `先生が 話して います。学生は 何を 持って 行かなければ なりませんか。`, it: 'L’insegnante parla. Cosa devono portare gli studenti?' },
		{ who: sp, ja: `来週の ${out.ja}ですが、${a!.ja}を わすれないで ください。${b!.ja}は むこうに あるので、いりません。それから、${c!.ja}も 持って 来て ください。${d!.ja}は 持って 来ても いいですが、なくても だいじょうぶです。`, it: `Per ${out.it} della prossima settimana: non dimenticate ${a!.it}. ${b!.it} c’è già là, non serve. Portate anche ${c!.it}. ${d!.it} potete portarlo, ma non è necessario.` }
	];
	const right = { ja: `${a!.ja}と ${c!.ja}`, it: `${a!.it} e ${c!.it}` };
	const opts = shuffled(rng, [right, { ja: `${a!.ja}と ${b!.ja}`, it: `${a!.it} e ${b!.it}` }, { ja: `${a!.ja}と ${c!.ja}と ${d!.ja}`, it: `${a!.it}, ${c!.it} e ${d!.it}` }, { ja: `${b!.ja}と ${c!.ja}`, it: `${b!.it} e ${c!.it}` }]);
	return {
		kind: 'choice', sub: 'kadai', title: '🎒 Cosa portare?', intro: 'Ascolta l’annuncio: cosa bisogna portare per forza?', lines,
		question: { ja: '学生は 何を 持って 行かなければ なりませんか。', it: 'Cosa devono portare per forza?' },
		options: opts, answer: opts.indexOf(right), spiega: 'いりません = non serve; 持って 来ても いいですが、なくても だいじょうぶ = facoltativo.'
	};
}

// ── 課題理解: l'ordine delle cose (まず / それから / さいごに) ────────────────
const STEPS = [
	{ ja: '名前を 書く', it: 'scrivere il nome', te: '名前を 書いて' }, { ja: 'お金を はらう', it: 'pagare', te: 'お金を はらって' },
	{ ja: 'しゃしんを とる', it: 'fare la foto', te: 'しゃしんを とって' }, { ja: 'かみを 出す', it: 'consegnare il modulo', te: 'かみを 出して' },
	{ ja: 'せつめいを 聞く', it: 'ascoltare la spiegazione', te: 'せつめいを 聞いて' }, { ja: 'カードを もらう', it: 'ritirare la tessera', te: 'カードを もらって' }
];
export function orderMission(rng: Rng): ChoiceMission {
	const [a, b, c, d] = shuffled(rng, STEPS);
	const askFirst = rng() < 0.5;
	const place = pick(rng, [{ ja: '図書館の うけつけ', it: 'alla reception della biblioteca' }, { ja: 'スポーツクラブの うけつけ', it: 'alla reception della palestra' }, { ja: 'しやくしょ', it: 'in comune' }]);
	const lines: Line[] = [
		{ who: 'N', ja: `${place.ja}で 女の人と 男の人が 話して います。男の人は ${askFirst ? 'まず' : 'さいごに'} 何を しますか。`, it: `${place.it} una donna e un uomo parlano. Cosa fa l’uomo ${askFirst ? 'per prima cosa' : 'per ultima'}?` },
		{ who: 'F', ja: `では、${a!.te} ください。そのあと ${b!.te}、さいごに ${c!.te} ください。`, it: `Allora: ${a!.it}, poi ${b!.it}, e per ultimo ${c!.it}.` },
		{ who: 'M', ja: `はい。あの、${d!.ja}のは いつですか。`, it: `Sì. E ${d!.it}, quando?` },
		{ who: 'F', ja: `それは きょうは いりません。あ、それから、${b!.ja}のは いちばん はじめに おねがいします。`, it: `Quello oggi non serve. Ah, e ${b!.it} lo faccia per primo.` },
		{ who: 'M', ja: 'わかりました。', it: 'Va bene.' }
	];
	// ordine finale: b, a, c
	const right = askFirst ? b! : c!;
	const opts = shuffled(rng, [a!, b!, c!, d!]);
	return {
		kind: 'choice', sub: 'kadai', title: askFirst ? '🔢 Cosa fa per primo?' : '🔢 Cosa fa per ultimo?', intro: 'La sequenza cambia a metà dialogo: segui l’ordine finale.', lines,
		question: { ja: `男の人は ${askFirst ? 'まず' : 'さいごに'} 何を しますか。`, it: askFirst ? 'Cosa fa per prima cosa?' : 'Cosa fa per ultima?' },
		options: opts.map((o) => ({ ja: o.ja, it: o.it })), answer: opts.indexOf(right),
		spiega: `Ordine finale: ${b!.it} → ${a!.it} → ${c!.it}.`
	};
}

// ── 読解: avviso con tabella da consultare (情報検索) ───────────────────────────
const CENTER_EVENTS = [
	{ ja: '料理教室', it: 'corso di cucina' }, { ja: '音楽会', it: 'concerto' }, { ja: 'えいがの 会', it: 'proiezione' },
	{ ja: 'テニス教室', it: 'corso di tennis' }, { ja: 'ハイキング', it: 'escursione' }, { ja: '花見の 会', it: 'hanami' }
];
export function tableMission(rng: Rng): ChoiceMission {
	const days = shuffled(rng, ['月', '火', '水', '木', '金', '土', '日']);
	const evs = shuffled(rng, CENTER_EVENTS).slice(0, 5).map((e, i) => ({
		...e, n: i + 1, wd: days[i]!, start: pick(rng, [9, 10, 11, 13, 14, 17, 18]), price: pick(rng, [0, 300, 500, 800, 1000, 1200, 1500])
	}));
	const weekend = (wd: string) => wd === '土' || wd === '日';
	const CIRC = ['', '①', '②', '③', '④', '⑤'];
	const maxPrice = pick(rng, [500, 800, 1000]);
	const wantWeekend = rng() < 0.5;
	const afterNoon = rng() < 0.5;
	const ok = (e: (typeof evs)[number]) => weekend(e.wd) === wantWeekend && (afterNoon ? e.start >= 12 : e.start < 12) && e.price <= maxPrice;
	// garantisce almeno una risposta giusta: aggiusta il primo evento
	if (!evs.some(ok)) Object.assign(evs[0]!, { wd: wantWeekend ? '土' : '水', start: afterNoon ? 14 : 10, price: Math.min(maxPrice, 500) });
	const good = evs.filter(ok).map((e) => e.n);
	const body = ['さくら市 市民センター 今月の お知らせ', ...evs.map((e) => `${CIRC[e.n]} ${e.ja}（${e.price ? e.price + '円' : 'むりょう'}）${e.wd}曜日 ${e.start}時から`), 'もうしこみ：電話で どうぞ。'].join('\n');
	const bodyIt = evs.map((e) => `${CIRC[e.n]} ${e.it}, ${e.price ? e.price + '¥' : 'gratis'}, ${e.wd}, dalle ${e.start}`).join('; ');
	const label = (ns: number[]) => ns.map((n) => CIRC[n]).join('と');
	const right = label(good);
	const others = new Set<string>();
	for (let i = 0; others.size < 3 && i < 40; i += 1) {
		const k = 1 + Math.floor(rng() * 2);
		const cand = shuffled(rng, [1, 2, 3, 4, 5]).slice(0, k).sort();
		const l = label(cand);
		if (l !== right) others.add(l);
	}
	const opts = shuffled(rng, [right, ...others]);
	const cond = `${wantWeekend ? '土曜日か 日曜日' : 'へいじつ'}で、${afterNoon ? '午後から' : '午前中に'} 始まって、${maxPrice}円 いかの もの`;
	return {
		kind: 'choice', sub: 'dokkai', title: '📋 L’avviso del centro civico', intro: 'Leggi l’avviso e trova gli eventi che vanno bene per la condizione.', lines: [],
		doc: { title: '市民センターの お知らせ', ja: body, it: bodyIt },
		question: { ja: `${cond}に 行きたいです。えらべるのは どれですか。`, it: `Vuoi andare a qualcosa ${wantWeekend ? 'nel fine settimana' : 'in un giorno feriale'}, che inizi ${afterNoon ? 'di pomeriggio' : 'di mattina'}, che costi al massimo ${maxPrice} yen.` },
		options: opts.map((o) => ({ ja: o, it: '' })), answer: opts.indexOf(right)
	};
}

// ── 課題理解: l'appuntamento (ora e posto che cambiano) ──────────────────────
const MEET_PLACES = [
	{ ja: '駅の 東口', it: 'all’uscita est della stazione' }, { ja: '駅の 西口', it: 'all’uscita ovest della stazione' },
	{ ja: '映画館の 前', it: 'davanti al cinema' }, { ja: '本屋の 前', it: 'davanti alla libreria' },
	{ ja: 'カフェの 中', it: 'dentro il caffè' }, { ja: 'こうえんの 入口', it: 'all’ingresso del parco' }
];
const TIMES = [[5, 0], [5, 30], [6, 0], [6, 30], [7, 0], [7, 30]] as const;
const tJa = ([h, m]: readonly [number, number]) => `${NUM_KANJI[h]}時${m ? '半' : ''}`;
const tIt = ([h, m]: readonly [number, number]) => `${h + 12}:${m ? '30' : '00'}`;
export function appointmentMission(rng: Rng): ChoiceMission {
	const [p1, p2] = shuffled(rng, MEET_PLACES);
	const [i1, i2] = shuffled(rng, [0, 1, 2, 3, 4, 5]);
	const t1 = TIMES[i1!]!, t2 = TIMES[i2!]!;
	const changeT = rng() < 0.7, changeP = rng() < 0.6 || !changeT;
	const T = changeT ? t2 : t1, P = changeP ? p2! : p1!;
	const what = pick(rng, [{ ja: '映画', it: 'il film' }, { ja: 'コンサート', it: 'il concerto' }, { ja: 'しょくじ', it: 'la cena' }]);
	const voicemail = rng() < 0.5;
	const lines: Line[] = [];
	if (voicemail) {
		lines.push({ who: 'N', ja: 'るすばん電話を 聞いて います。二人は 何時に どこで 会いますか。', it: 'Ascolti la segreteria. A che ora e dove si incontrano?' });
		lines.push({ who: 'M', ja: `もしもし、山田です。あしたの ${what.ja}ですが、${tJa(t1)}に ${p1!.ja}で 会いませんか。`, it: `Pronto, sono Yamada. Per ${what.it} di domani: ci vediamo alle ${tIt(t1)} ${p1!.it}?` });
		const fix: string[] = [];
		const fixIt: string[] = [];
		if (changeT) { fix.push(`時間は ${tJa(t2)}の ほうが いいかもしれません`); fixIt.push(`forse è meglio alle ${tIt(t2)}`); }
		if (changeP) { fix.push(`${p1!.ja}は 人が 多いので、${p2!.ja}に しましょう`); fixIt.push(`${p1!.it} c’è troppa gente, facciamo ${p2!.it}`); }
		lines.push({ who: 'M', ja: `あ、でも、${fix.join('。それから、')}。じゃあ、あした。`, it: `Ah, però ${fixIt.join('; e poi ')}. A domani.` });
	} else {
		lines.push({ who: 'N', ja: '女の人と 男の人が 電話で 話して います。二人は 何時に どこで 会いますか。', it: 'Al telefono: a che ora e dove si incontrano?' });
		lines.push({ who: 'F', ja: `あしたの ${what.ja}、${tJa(t1)}に ${p1!.ja}で どう？`, it: `Per ${what.it} di domani: alle ${tIt(t1)} ${p1!.it}?` });
		if (changeT) {
			lines.push({ who: 'M', ja: `${tJa(t1)}は ちょっと…。しごとが おそく 終わるから、${tJa(t2)}は どう？`, it: `Alle ${tIt(t1)} è un po’… finisco tardi: alle ${tIt(t2)}?` });
			lines.push({ who: 'F', ja: 'いいよ。', it: 'Va bene.' });
		} else lines.push({ who: 'M', ja: '時間は いいよ。', it: 'L’orario va bene.' });
		if (changeP) {
			lines.push({ who: 'M', ja: `でも ${p1!.ja}は わかりにくいから、${p2!.ja}に しない？`, it: `Ma ${p1!.it} è difficile da trovare: facciamo ${p2!.it}?` });
			lines.push({ who: 'F', ja: 'そうだね。そう しよう。', it: 'Giusto, facciamo così.' });
		}
	}
	const combos = [[T, P], [t1, P], [T, p1!], [t1, p1!]].filter((c, i, a) => a.findIndex((d) => d[0] === c[0] && d[1] === c[1]) === i) as [readonly [number, number], { ja: string; it: string }][];
	const extra = shuffled(rng, MEET_PLACES.filter((m) => m !== P && m !== p1));
	while (combos.length < 4) combos.push([pick(rng, [t1, t2]), extra.shift()!]);
	const right = combos[0]!;
	const opts = shuffled(rng, combos);
	return {
		kind: 'choice', sub: 'kadai', title: '⏰ L’appuntamento', intro: 'Ascolta: ora e luogo possono cambiare a metà. Quali sono quelli finali?', lines,
		question: { ja: '二人は 何時に どこで 会いますか。', it: 'A che ora e dove si incontrano?' },
		options: opts.map(([t, p]) => ({ ja: `${tJa(t)}・${p.ja}`, it: `${tIt(t)}, ${p.it}` })), answer: opts.indexOf(right)
	};
}

// ── 課題理解: il pagamento (prezzi, sconti, sacchetto, resto) ─────────────────
export function paymentMission(rng: Rng): ChoiceMission {
	const [a, b] = shuffled(rng, ITEMS);
	const qb = rng() < 0.5 ? 2 : 1;
	const discount = qb === 2 && rng() < 0.7 ? pick(rng, [50, 100]) : 0;
	const bag = rng() < 0.5;
	const askChange = rng() < 0.5;
	const total = a!.price + b!.price * qb - discount + (bag ? 5 : 0);
	const paid = total <= 1000 ? 1000 : 2000;
	const lines: Line[] = [
		{ who: 'N', ja: `店で 店員と 男の人が 話して います。男の人は ${askChange ? `${paid}円 はらいました。おつりは いくらですか` : 'ぜんぶで いくら はらいますか'}。`, it: askChange ? `Al negozio. L’uomo paga con ${paid} yen: quanto resto riceve?` : 'Al negozio: quanto paga in tutto l’uomo?' },
		{ who: 'M', ja: `すみません、この ${a!.ja}と ${b!.ja}を ください。`, it: `Scusi, vorrei ${a!.it} e ${b!.it}.` },
		{ who: 'F', ja: `はい。${a!.ja}は ${a!.price}円、${b!.ja}は 一つ ${b!.price}円です。${discount ? `今日は ${b!.ja}を 二つ 買うと、${discount}円 安く なりますよ。` : ''}`, it: `${a!.it} ${a!.price} yen, ${b!.it} ${b!.price} yen l’uno.${discount ? ` Oggi prendendone due, ${discount} yen di sconto.` : ''}` },
		{ who: 'M', ja: qb === 2 ? `じゃあ、${b!.ja}は 二つ ください。` : `${b!.ja}は 一つで いいです。`, it: qb === 2 ? `Allora due ${b!.it}.` : `Di ${b!.it} ne basta uno.` },
		{ who: 'F', ja: 'ふくろは いりますか。一まい 5円です。', it: 'Le serve un sacchetto? Costa 5 yen.' },
		{ who: 'M', ja: bag ? 'はい、おねがいします。' : 'いいえ、けっこうです。', it: bag ? 'Sì, grazie.' : 'No, grazie.' }
	];
	const value = askChange ? paid - total : total;
	const wrongs = [askChange ? paid - (total + discount) : total + discount, askChange ? paid - (total - (bag ? 5 : 0) + (bag ? 0 : 5)) : total - (bag ? 5 : 0) + (bag ? 0 : 5), askChange ? paid - (total - b!.price * (qb - 1) + (qb === 1 ? b!.price : 0)) : total - b!.price * (qb - 1) + (qb === 1 ? b!.price : 0), value + 100, value - 50];
	const opts = [value];
	for (const w of wrongs) if (w > 0 && !opts.includes(w) && opts.length < 4) opts.push(w);
	const shuffledOpts = shuffled(rng, opts);
	return {
		kind: 'choice', sub: 'kadai', title: '💴 Alla cassa', intro: 'Ascolta prezzi, sconti e sacchetto, e fai il conto.', lines,
		question: { ja: askChange ? 'おつりは いくらですか。' : 'ぜんぶで いくら はらいますか。', it: askChange ? 'Quanto resto riceve?' : 'Quanto paga in tutto?' },
		options: shuffledOpts.map((v) => ({ ja: `${v}円`, it: `${v} yen` })), answer: shuffledOpts.indexOf(value),
		spiega: `${a!.price} + ${b!.price}×${qb}${discount ? ` − ${discount}` : ''}${bag ? ' + 5' : ''} = ${total} yen${askChange ? `; resto ${paid} − ${total} = ${paid - total}` : ''}.`
	};
}

// ── 課題理解: la spesa, con quantità e trappole ─────────────────────────────
// Ogni telefonata combina 3 mosse a caso tra: «non serve, ce n'è ancora»,
// «anzi, X invece di Y» sulla quantità, «aggiungi anche…», «lascia stare»,
// «quello che costa meno», «se non c'è A prendi B». Si compra con le quantità.
type Counter = 'tsu' | 'hon' | 'pakku' | 'satsu';
export interface ShopItemDef extends ShopItem {
	counter: Counter;
}
export const ITEMS: ShopItemDef[] = [
	{ id: 'pan', ja: 'パン', it: 'pane', price: 200, icon: '🍞', counter: 'tsu' },
	{ id: 'gyuunyuu', ja: 'ぎゅうにゅう', it: 'latte', price: 180, icon: '🥛', counter: 'hon' },
	{ id: 'tamago', ja: 'たまご', it: 'uova', price: 250, icon: '🥚', counter: 'pakku' },
	{ id: 'ringo', ja: 'りんご', it: 'mele', price: 120, icon: '🍎', counter: 'tsu' },
	{ id: 'banana', ja: 'バナナ', it: 'banane', price: 150, icon: '🍌', counter: 'tsu' },
	{ id: 'ocha', ja: 'お茶', it: 'tè', price: 130, icon: '🍵', counter: 'hon' },
	{ id: 'onigiri', ja: 'おにぎり', it: 'onigiri', price: 160, icon: '🍙', counter: 'tsu' },
	{ id: 'denchi', ja: '電池', it: 'pile', price: 400, icon: '🔋', counter: 'hon' },
	{ id: 'nooto', ja: 'ノート', it: 'quaderno', price: 110, icon: '📓', counter: 'satsu' },
	{ id: 'juusu', ja: 'ジュース', it: 'succo', price: 140, icon: '🧃', counter: 'hon' },
	{ id: 'sakana', ja: '魚', it: 'pesce', price: 450, icon: '🐟', counter: 'pakku' },
	{ id: 'niku', ja: '肉', it: 'carne', price: 600, icon: '🥩', counter: 'pakku' },
	{ id: 'keeki', ja: 'ケーキ', it: 'torta', price: 350, icon: '🍰', counter: 'tsu' },
	{ id: 'kami', ja: 'ティッシュ', it: 'fazzoletti', price: 230, icon: '🧻', counter: 'tsu' }
];
const NUMK = ['', '一', '二', '三', '四'];
export function countJa(it: ShopItemDef, n: number): string {
	if (it.counter === 'tsu') return `${NUMK[n]}つ`;
	if (it.counter === 'hon') return `${NUMK[n]}本`;
	if (it.counter === 'pakku') return `${NUMK[n]}パック`;
	return `${NUMK[n]}さつ`;
}
const countIt = (it: ShopItemDef, n: number) => `${n} ${it.it}`;

type ShopMove = 'notneed' | 'qty' | 'add' | 'cancel' | 'cheaper' | 'instead' | 'askqty';
export function shopMission(rng: Rng): ShopMission {
	const pool = shuffled(rng, ITEMS);
	const take = () => pool.shift()!;
	const need: Record<string, number> = {};
	const onShelf = new Set<ShopItemDef>();
	const a = take();
	const b = take();
	const qa = 1 + Math.floor(rng() * 3);
	const qb = 1 + Math.floor(rng() * 2);
	need[a.id] = qa;
	need[b.id] = qb;
	onShelf.add(a).add(b);
	const who: Who = rng() < 0.5 ? 'F' : 'M';
	const other: Who = who === 'F' ? 'M' : 'F';
	const lines: Line[] = [
		{ who: 'N', ja: `${who === 'F' ? '女' : '男'}の人と ${other === 'F' ? '女' : '男'}の人が 電話で 話して います。${other === 'F' ? '女' : '男'}の人は 何を いくつ 買いますか。`, it: 'Due persone parlano al telefono. Cosa compra, e quanto?' },
		{ who, ja: `帰りに ${a.ja}を ${countJa(a, qa)}と、${b.ja}を ${countJa(b, qb)} 買って きて くれる？`, it: `Al ritorno mi prendi ${countIt(a, qa)} e ${countIt(b, qb)}?` }
	];
	const moves = shuffled(rng, ['notneed', 'qty', 'add', 'cancel', 'cheaper', 'instead', 'askqty'] as ShopMove[]).slice(0, 3);
	for (const mv of moves) {
		if (mv === 'notneed') {
			const c = take();
			onShelf.add(c);
			lines.push({ who: other, ja: `${c.ja}は？ もう ないでしょう。`, it: `E ${c.it}? Sono finiti, no?` });
			lines.push({ who, ja: `${c.ja}は まだ ある から、いらない。`, it: `${c.it} ce ne sono ancora, non servono.` });
		} else if (mv === 'qty') {
			const n = need[a.id]! === 4 ? 2 : need[a.id]! + 1;
			lines.push({ who, ja: `あ、${a.ja}は やっぱり ${countJa(a, n)}に して。`, it: `Ah, ${a.it}: anzi, prendine ${n}.` });
			need[a.id] = n;
		} else if (mv === 'add') {
			const d = take();
			const n = 1 + Math.floor(rng() * 2);
			onShelf.add(d);
			need[d.id] = n;
			lines.push({ who, ja: `それから、${d.ja}も ${countJa(d, n)} おねがい。`, it: `E poi anche ${countIt(d, n)}, per favore.` });
		} else if (mv === 'cancel') {
			if (!need[b.id]) continue;
			lines.push({ who, ja: `ごめん、${b.ja}は いいや。きのう 買って いたの、わすれて いた。`, it: `Scusa, ${b.it} lascia stare: li avevo comprati ieri e me n’ero dimenticato/a.` });
			delete need[b.id];
		} else if (mv === 'cheaper') {
			const [x, y] = [take(), take()];
			if (x.price === y.price) y.price += 30;
			const cheap = x.price < y.price ? x : y;
			onShelf.add(x).add(y);
			need[cheap.id] = 1;
			lines.push({ who, ja: `それと、${x.ja}か ${y.ja}、どちらか 一つ。安い ほうで いいよ。`, it: `E uno tra ${x.it} e ${y.it}: quello che costa meno.` });
		} else if (mv === 'instead') {
			const [g, h] = [take(), take()];
			onShelf.add(h); // g esaurito: non è sullo scaffale
			need[h.id] = 1;
			lines.push({ who, ja: `あと、${g.ja}を 一つ。もし なかったら、${h.ja}で いいから。`, it: `E un ${g.it}. Se non c’è, va bene ${h.it}.` });
		} else if (mv === 'askqty') {
			if (!need[b.id]) continue;
			const n = need[b.id]! + 1;
			lines.push({ who: other, ja: `${b.ja}は ${countJa(b, need[b.id]!)}で たりる？ みんな 来るでしょう。`, it: `${b.it}: ne bastano ${need[b.id]}? Vengono tutti, no?` });
			lines.push({ who, ja: `そうだね。じゃ、${countJa(b, n)}に しよう。`, it: `Giusto. Allora ${n}.` });
			need[b.id] = n;
		}
	}
	lines.push({ who: other, ja: 'わかった。じゃあ、買って 帰るね。', it: 'Ok, li compro e torno.' });
	const fill = shuffled(rng, pool).slice(0, Math.max(0, 9 - onShelf.size));
	return {
		kind: 'shop',
		title: '🧺 La spesa al konbini',
		intro: 'Ti telefonano da casa. Ascolta bene cosa e QUANTO comprare (tocca più volte un prodotto per aumentare), poi paga.',
		lines,
		shelf: shuffled(rng, [...onShelf, ...fill]),
		need
	};
}

// ── 課題理解: la data sul calendario ─────────────────────────────────────────
const WD = ['月', '火', '水', '木', '金', '土', '日'];
const WD_IT = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const NOPE = [
	{ ja: 'かいぎが あります', it: 'c’è una riunione' },
	{ ja: 'ぶちょうが しゅっちょうです', it: 'il capo è in trasferta' },
	{ ja: '山田さんが 休みです', it: 'Yamada è in ferie' },
	{ ja: 'わたしは 用事が あります', it: 'ho un impegno' }
];

export function dayLabel(d: CalDay, rng?: Rng): { ja: string; it: string } {
	const byWeekday = rng ? rng() < 0.5 : false;
	if (byWeekday) {
		return {
			ja: `${d.week ? '来週' : '今週'}の ${WD[d.wd]}曜日`,
			it: `${WD_IT[d.wd]} ${d.week ? 'della prossima settimana' : 'di questa settimana'}`
		};
	}
	return { ja: `${d.day}日`, it: `il ${d.day}` };
}

export function calendarMission(rng: Rng): CalendarMission {
	const firstDay = 3 + Math.floor(rng() * 12); // lunedì di questa settimana
	const days: CalDay[] = [];
	for (let i = 0; i < 14; i += 1) days.push({ day: firstDay + i, wd: i % 7, week: i < 7 ? 0 : 1 });
	const today = firstDay; // oggi è lunedì
	const workdays = days.filter((d) => d.wd < 5 && d.day !== today);
	const [d1, d2, fin] = shuffled(rng, workdays);
	const [n1, n2] = shuffled(rng, NOPE);
	const l1 = dayLabel(d1!, rng);
	const l2 = dayLabel(d2!, rng);
	const lf = dayLabel(fin!, rng);
	const lines: Line[] = [
		{ who: 'N', ja: '会社で 男の人と 女の人が 話して います。かんげいかいは いつですか。', it: 'In ufficio un uomo e una donna parlano. Quando si fa la festa di benvenuto?' },
		{ who: 'M', ja: `新しい 人の かんげいかいですが、${l1.ja}は どうですか。`, it: `Per la festa di benvenuto della nuova collega: che ne dici di ${l1.it}?` },
		{ who: 'F', ja: `${l1.ja}は ${n1!.ja}から、ちょっと…。`, it: `${l1.it} ${n1!.it}, quindi…` },
		{ who: 'M', ja: `そうですか。じゃあ、${l2.ja}は？`, it: `Capisco. Allora ${l2.it}?` },
		{ who: 'F', ja: `いいですね。あ、でも ${l2.ja}は ${n2!.ja}よ。`, it: `Buona idea. Ah, però ${l2.it} ${n2!.it}.` },
		{ who: 'M', ja: `それなら、${lf.ja}に しましょう。`, it: `Allora facciamola ${lf.it}.` },
		{ who: 'F', ja: 'はい、そう しましょう。', it: 'Sì, facciamo così.' }
	];
	return {
		kind: 'calendar',
		title: '📅 La data della festa',
		intro: 'Due colleghi scelgono il giorno della festa. Oggi è lunedì (segnato). Tocca la data giusta.',
		lines,
		days,
		today,
		answer: fin!.day,
		question: { ja: 'かんげいかいは いつですか。', it: 'Quando si fa la festa di benvenuto?' }
	};
}

// ── 即時応答: botta e risposta a tempo ──────────────────────────────────────
const QUICK: { who: Who; ja: string; it: string; right: Option; wrong: Option[] }[] = [
	{ who: 'M', ja: 'お先に どうぞ。', it: 'Prego, prima lei.', right: { ja: 'あ、すみません。', it: 'Ah, grazie (scusi).' }, wrong: [{ ja: 'はい、お先に どうぞ。', it: 'Sì, prima lei.' }, { ja: 'いいえ、まだです。', it: 'No, non ancora.' }] },
	{ who: 'F', ja: 'ちょっと てつだって もらえますか。', it: 'Mi puoi dare una mano?', right: { ja: 'ええ、いいですよ。', it: 'Sì, certo.' }, wrong: [{ ja: 'はい、てつだって ください。', it: 'Sì, aiutami.' }, { ja: 'どういたしまして。', it: 'Prego.' }] },
	{ who: 'M', ja: 'この いす、使っても いいですか。', it: 'Posso usare questa sedia?', right: { ja: 'あ、どうぞ。', it: 'Prego.' }, wrong: [{ ja: 'はい、使いましょう。', it: 'Sì, usiamola.' }, { ja: 'いいえ、いすです。', it: 'No, è una sedia.' }] },
	{ who: 'F', ja: 'きのうは ごちそうさまでした。', it: 'Grazie per la cena di ieri.', right: { ja: 'いいえ、また 行きましょう。', it: 'Figurati, torniamoci.' }, wrong: [{ ja: 'いただきます。', it: 'Buon appetito.' }, { ja: 'はい、ごちそうさまでした。', it: 'Sì, grazie del pasto.' }] },
	{ who: 'M', ja: 'あしたの かいぎ、何時からでしたっけ。', it: 'La riunione di domani, a che ora era?', right: { ja: '十時からですよ。', it: 'Dalle dieci.' }, wrong: [{ ja: 'かいぎしつですよ。', it: 'È in sala riunioni.' }, { ja: '二時間ぐらいです。', it: 'Circa due ore.' }] },
	{ who: 'F', ja: 'もう 少し ゆっくり 話して いただけますか。', it: 'Può parlare un po’ più lentamente?', right: { ja: 'あ、すみません。', it: 'Ah, mi scusi.' }, wrong: [{ ja: 'はい、早く 話します。', it: 'Sì, parlo veloce.' }, { ja: 'ゆっくり 休んで ください。', it: 'Riposati bene.' }] },
	{ who: 'M', ja: 'じゃ、がんばりましょう。', it: 'Allora, mettiamocela tutta.', right: { ja: 'はい、がんばりましょう。', it: 'Sì, forza!' }, wrong: [{ ja: 'はい、がんばりました。', it: 'Sì, ce l’ho messa tutta.' }, { ja: 'おつかれさまでした。', it: 'Buon lavoro (a fine lavoro).' }] },
	{ who: 'F', ja: 'すみません、駅は どちらですか。', it: 'Scusi, la stazione da che parte è?', right: { ja: 'あちらですよ。', it: 'Di là.' }, wrong: [{ ja: '駅に 行きます。', it: 'Vado in stazione.' }, { ja: 'はい、駅です。', it: 'Sì, è la stazione.' }] },
	{ who: 'M', ja: 'この ケーキ、どうぞ 食べて ください。', it: 'Questa torta, prego, mangiala.', right: { ja: 'わあ、いただきます。', it: 'Wow, grazie, la mangio.' }, wrong: [{ ja: 'どうぞ 食べて ください。', it: 'Prego, mangiala.' }, { ja: 'ごちそうさまでした。', it: 'Grazie del pasto (alla fine).' }] },
	{ who: 'F', ja: '顔色が 悪いですよ。だいじょうぶですか。', it: 'Hai una brutta cera. Tutto bene?', right: { ja: 'ちょっと 頭が いたいんです。', it: 'Ho un po’ di mal di testa.' }, wrong: [{ ja: 'はい、いい 色ですね。', it: 'Sì, bel colore.' }, { ja: 'お大事に。', it: 'Riguardati.' }] },
	{ who: 'M', ja: '日本の せいかつには もう なれましたか。', it: 'Ti sei abituato alla vita in Giappone?', right: { ja: 'ええ、だいぶ なれました。', it: 'Sì, abbastanza.' }, wrong: [{ ja: 'はい、日本人です。', it: 'Sì, sono giapponese.' }, { ja: 'いいえ、生まれました。', it: 'No, sono nato.' }] },
	{ who: 'F', ja: 'しつれいですが、お名前は？', it: 'Mi scusi, il suo nome?', right: { ja: 'マリオと もうします。', it: 'Mi chiamo Mario.' }, wrong: [{ ja: 'しつれいしました。', it: 'Scusate il disturbo.' }, { ja: 'お名前は マリオさんです。', it: 'Il suo nome è Mario.' }] }
];

export function quickMission(rng: Rng, n = 6): QuickMission {
	const rounds = shuffled(rng, QUICK)
		.slice(0, n)
		.map((r) => {
			const options = shuffled(rng, [r.right, ...r.wrong]);
			return { line: { who: r.who, ja: r.ja, it: r.it }, options, answer: options.indexOf(r.right) };
		});
	return {
		kind: 'quick',
		title: '⚡ Botta e risposta',
		intro: 'Sulla via del ritorno incontri un collega. Rispondi in fretta: le risposte giuste di fila fanno combo.',
		rounds,
		seconds: 9
	};
}

export function routeMission(rng: Rng, town: Building[], target: PlaceId): RouteMission {
	const plan = planRoute(town, target);
	return {
		kind: 'route',
		title: `🧭 Verso ${PLACES[target].it}`,
		intro:
			'Non sai la strada: chiedi a un passante. Ti dirà da che parte girare (ai semafori o all’angolo di un negozio) e su che lato della strada è il posto. Ascolta, poi cammina sulla mappa dall’uscita della stazione ed entra dalla porta giusta. Il testo lo vedi all’arrivo.',
		lines: directionsLines(plan, rng, rng() < 0.5, town),
		plan
	};
}

// ── Banca di domande d'esame (file corso) e ripasso progressivo ─────────────
// Le domande vere tornano finché non sono consolidate (2 risposte giuste di
// fila, in giornate diverse); le nuove entrano poche per giornata; quando un
// tipo è tutto consolidato si gioca con le varianti generate.
export type BankItem = CourseGiornoInput;
export type BankTipo = BankItem['tipo'];
export interface ItemProgress {
	streak: number; // risposte giuste di fila
	seen: number;
	last: number; // numero della giornata in cui è uscita l'ultima volta
}
export type Progress = Record<string, ItemProgress>;
export const CONSOLIDATED = 2;
// domande nuove al giorno (prima volta che escono), di default; l'utente lo cambia nel gioco
export const NEW_PER_DAY = 30;

export function recordResult(prog: Progress, id: string, ok: boolean, dayNo: number): Progress {
	const p = prog[id] ?? { streak: 0, seen: 0, last: -1 };
	return { ...prog, [id]: { streak: ok ? p.streak + 1 : 0, seen: p.seen + 1, last: dayNo } };
}

export function pickBank(
	bank: BankItem[], tipo: BankTipo, n: number, prog: Progress, dayNo: number, used: Set<string>, newBudget: { left: number }, rng?: Rng
): BankItem[] {
	const pool = bank.filter((b) => b.tipo === tipo && !used.has(b.id));
	const st = (b: BankItem) => prog[b.id];
	// intervalli crescenti: sbagliata → domani, giusta una volta → fra 3 giorni.
	// Prima tornavano tutte già il giorno dopo e occupavano ogni posto: si
	// giocavano sempre le stesse e le nuove non entravano.
	const wait = (streak: number) => (streak === 0 ? 1 : 3);
	const due = pool
		.filter((b) => st(b) && st(b)!.streak < CONSOLIDATED && st(b)!.last + wait(st(b)!.streak) <= dayNo)
		.sort((a, b) => st(a)!.streak - st(b)!.streak || st(a)!.last - st(b)!.last);
	// le nuove in ordine casuale: in ordine di file uscivano sempre le stesse
	const fresh = rng ? shuffled(rng, pool.filter((b) => !st(b))) : pool.filter((b) => !st(b));
	const review = pool
		.filter((b) => st(b) && st(b)!.streak >= CONSOLIDATED && st(b)!.last <= dayNo - 10)
		.sort((a, b) => st(a)!.last - st(b)!.last);
	// metà dei posti alle nuove finché ce ne sono (con un posto solo: a sorte)
	const canNew = fresh.length > 0 && newBudget.left > 0;
	const dueQuota = !canNew ? n : n > 1 ? Math.ceil(n / 2) : (rng ? rng() : 0.5) < 0.5 ? 1 : 0;
	const out: BankItem[] = [...due.slice(0, dueQuota)];
	while (out.length < n && fresh.length && newBudget.left > 0) {
		out.push(fresh.shift()!);
		newBudget.left -= 1;
	}
	for (const b of due.slice(dueQuota)) if (out.length < n) out.push(b);
	for (const r of review) if (out.length < n) out.push(r);
	for (const b of out) used.add(b.id);
	return out;
}

const NUM_READ = ['いち', 'に', 'さん', 'よん'];
export const numbered = (i: number, ja: string): string => `${NUM_READ[i]}、${ja}`;

export function bankMission(b: BankItem, rng?: Rng): ChoiceMission {
	// opzioni rimescolate: le domande tornano, la posizione della giusta non si impara
	const order = rng ? shuffled(rng, b.opzioni.map((_, i) => i)) : b.opzioni.map((_, i) => i);
	// le scritte (moji/goi/bunpou) vanno nei ripassi (bankDrill); qui per sicurezza come lettura
	const sub = b.tipo === 'sokuji' ? 'hatsuwa' : b.tipo === 'moji' || b.tipo === 'goi' || b.tipo === 'bunpou' ? 'dokkai' : b.tipo;
	const voice = b.voce ?? b.righe.find((r) => r.who !== 'N')?.who ?? 'F';
	const titles: Record<BankTipo, string> = {
		kadai: '📝 Cosa si fa?', point: '🤔 Il punto', hatsuwa: '💬 Cosa dici?', sokuji: '⚡ Rispondi', dokkai: '📖 Da leggere',
		moji: '🈁 Kanji', goi: '📚 Parole', bunpou: '🧩 Grammatica'
	};
	return {
		kind: 'choice',
		sub,
		sourceId: b.id,
		title: b.titolo ?? titles[b.tipo],
		intro: b.intro ?? '',
		scena: b.scena,
		immagine: b.immagine,
		lines: b.righe,
		doc: b.testo && { title: b.testo.titolo, ja: b.testo.ja, it: b.testo.it, formato: b.testo.formato },
		question: b.domanda,
		options: order.map((i) => b.opzioni[i]!),
		answer: order.indexOf(b.risposta),
		optionsFirst: b.tipo === 'point' || b.tipo === 'dokkai',
		audioOnly: b.tipo === 'hatsuwa',
		questionSpoken: b.tipo === 'kadai' || b.tipo === 'point' || b.tipo === 'hatsuwa',
		optionVoice: voice,
		spiega: b.spiega
	};
}

export function bankDrill(items: BankItem[], title: string, intro: string): DrillMission {
	return {
		kind: 'drill',
		title,
		intro,
		rounds: items.map((b) => ({
			sourceId: b.id, tipo: b.tipo, label: b.titolo ?? '', frase: b.domanda.ja, it: b.domanda.it,
			options: b.opzioni, answer: b.risposta, spiega: b.spiega, completa: b.completa
		}))
	};
}

// Frase da leggere a voce dopo la risposta: sottolineatura tolta, vuoto riempito
export function drillSpoken(r: DrillRound): string {
	if (r.completa) return r.completa;
	const right = r.options[r.answer]!.ja;
	return r.frase.replace(/[【】]/g, '').replace(/[（(]\s*[　 ]*\s*[)）]/, right).replace(/★/g, '');
}

export function bankQuick(items: BankItem[], rng: Rng): QuickMission {
	return {
		kind: 'quick',
		title: '⚡ Botta e risposta (esame)',
		intro: 'Come all’esame: senti una frase e tre risposte, solo a voce. Scegli il numero.',
		seconds: 8,
		rounds: items.map((b) => {
			const line = b.righe[0]!;
			const order = shuffled(rng, b.opzioni.map((_, i) => i));
			return { sourceId: b.id, audioOnly: true, line, options: order.map((i) => b.opzioni[i]!), answer: order.indexOf(b.risposta) };
		}).sort(() => rng() - 0.5)
	};
}

// ── La giornata ─────────────────────────────────────────────────────────────
export interface Step {
	place: Where;
	time: number; // ora d'inizio prevista (minuti dalla mezzanotte)
	deadline?: number; // arrivare entro (minuti): dopo, reputazione −
	mission: Mission;
	cost: number; // minuti che la missione «consuma»
	lunch?: boolean;
}

export interface Day {
	seed: number;
	town: Building[];
	steps: Step[];
	fromBank: number;
	newToday: number;
}

export interface DayContext {
	bank: BankItem[];
	prog: Progress;
	dayNo: number;
	newPerDay?: number;
	tipi?: BankTipo[]; // tipi di domande d'esame scelti (assente = tutti)
}

const isPlace = (p: string | undefined): p is Where => !!p && (p === 'eki' || p === 'ie' || p === 'treno' || p in PLACES);

export function buildDay(seed: number, ctx: DayContext = { bank: [], prog: {}, dayNo: 0 }): Day {
	const rng = seeded(seed);
	const town = buildTown(rng);
	const errand = pick(rng, ['yuubin', 'ginkou', 'kusuri', 'honya', 'toshokan'] as PlaceId[]);
	const used = new Set<string>();
	// tipi esclusi: le loro domande non escono (le situazioni restano, con le varianti generate)
	const on = (t: BankTipo) => !ctx.tipi || ctx.tipi.includes(t);
	// le nuove si dividono: 4 su 10 nelle situazioni (ascolto, lettura), il resto nei ripassi scritti
	const perDay = Math.max(0, ctx.newPerDay ?? NEW_PER_DAY);
	const slotNew = Math.round(perDay * 0.4);
	const budget = { left: slotNew };
	let fromBank = 0;
	// una domanda della banca se c'è (con il suo luogo), altrimenti la variante generata
	const slot = (tipo: BankTipo, place: Where, make: () => Mission): { place: Where; mission: Mission } => {
		const [b] = on(tipo) ? pickBank(ctx.bank, tipo, 1, ctx.prog, ctx.dayNo, used, budget, rng) : [];
		if (!b) return { place, mission: make() };
		fromBank += 1;
		return { place: isPlace(b.luogo) ? b.luogo : place, mission: bankMission(b, rng) };
	};
	// pause di ripasso: domande scritte, con un budget di nuove a parte. Ogni
	// pausa ha almeno 8 domande, di più se le nuove del giorno non ci stanno
	// (le sbagliate restano in testa)
	const drillBudget = { left: perDay - slotNew };
	const perDrill = Math.max(8, Math.ceil(drillBudget.left / 3) + 2);
	const drill = (tipi: BankTipo[], title: string, intro: string): DrillMission | null => {
		const items: BankItem[] = [];
		for (const t of tipi.filter(on)) items.push(...pickBank(ctx.bank, t, perDrill - items.length, ctx.prog, ctx.dayNo, used, drillBudget, rng));
		fromBank += items.length;
		return items.length ? bankDrill(items, title, intro) : null;
	};
	const morning = drill(['moji', 'goi'], '🚃 In treno: kanji e parole', 'Sul treno verso il centro ripassi un po’ di vocabolario, come nel 文字・語彙 dell’esame.');
	const lunch = drill(['bunpou'], '🍵 Pausa pranzo: grammatica', 'Aspettando il pranzo: qualche domanda di grammatica, come all’esame.');
	const evening = drill(['goi', 'bunpou', 'moji'], '🚃 Sul treno del ritorno', 'Ultimo ripasso della giornata.');
	const quickItems = !on('sokuji') ? [] : pickBank(ctx.bank, 'sokuji', 6, ctx.prog, ctx.dayNo, used, budget, rng);
	fromBank += quickItems.length;
	const quick = quickItems.length >= 3 ? bankQuick(quickItems, rng) : quickMission(rng);
	// più ascolti e letture al giorno; se la banca non ha domande di quel tipo,
	// una variante generata scelta a caso (non sempre la stessa)
	const gen = (...makers: (() => Mission)[]) => () => pick(rng, makers)();
	const kadaiGen = gen(() => priorityMission(rng), () => calendarMission(rng), () => bringMission(rng), () => orderMission(rng), () => appointmentMission(rng), () => paymentMission(rng));
	const readGen = gen(() => readMission(rng), () => tableMission(rng));
	const steps: Step[] = [
		{ place: 'eki', time: 8 * 60, mission: signMission(rng), cost: 3 },
		{ ...slot('dokkai', 'eki', readGen), time: 8 * 60 + 3, cost: 7 },
		{ place: 'kaisha', time: 8 * 60 + 10, deadline: 9 * 60, mission: routeMission(rng, town, 'kaisha'), cost: 0 },
		{ ...slot('kadai', 'kaisha', kadaiGen), time: 9 * 60, cost: 35 },
		{ place: 'kaisha', mission: gen(() => calendarMission(rng), () => priorityMission(rng), () => bringMission(rng), () => orderMission(rng))(), time: 9 * 60 + 40, cost: 35 },
		{ ...slot('point', 'kaisha', () => reasonMission(rng)), time: 10 * 60 + 20, cost: 30 },
		{ ...slot('dokkai', 'kaisha', readGen), time: 11 * 60, cost: 40 },
		{ ...slot('hatsuwa', 'resutoran', () => rpgMission(rng, 6)), time: 12 * 60, cost: 50, lunch: true },
		{ place: errand, time: 13 * 60 + 30, mission: routeMission(rng, town, errand), cost: 0 },
		{ ...slot('point', errand, () => reasonMission(rng)), time: 14 * 60, cost: 20 },
		{ ...slot('kadai', errand, kadaiGen), time: 14 * 60 + 25, cost: 25 },
		{ ...slot('kadai', errand, () => paymentMission(rng)), time: 14 * 60 + 45, cost: 10 },
		{ ...slot('point', 'kaisha', () => reasonMission(rng)), time: 15 * 60, cost: 30 },
		{ ...slot('hatsuwa', 'kaisha', () => rpgMission(rng)), time: 15 * 60 + 40, cost: 30 },
		{ ...slot('dokkai', 'kaisha', readGen), time: 16 * 60 + 20, cost: 40 },
		{ place: 'konbini', time: 18 * 60, mission: shopMission(rng), cost: 15 },
		{ place: 'kafe', time: 18 * 60 + 20, mission: appointmentMission(rng), cost: 10 },
		{ place: 'eki', time: 18 * 60 + 30, mission: quick, cost: 20 }
	];
	if (morning) steps.unshift({ place: 'treno', time: 7 * 60 + 40, mission: morning, cost: 15 });
	steps.unshift({ place: 'ie', time: 7 * 60, mission: homeMission(rng, 'mattina'), cost: 20 });
	if (lunch) steps.splice(steps.findIndex((s) => s.lunch), 0, { place: 'resutoran', time: 12 * 60, mission: lunch, cost: 10 });
	if (evening) steps.push({ place: 'treno', time: 19 * 60, mission: evening, cost: 20 });
	steps.push({ place: 'ie', time: 19 * 60 + 30, mission: homeMission(rng, 'sera'), cost: 10 });
	return { seed, town, steps, fromBank, newToday: slotNew - budget.left + (perDay - slotNew) - drillBudget.left };
}

// Tutti i testi giapponesi di una missione (per i test sul livello dei kanji)
export function japaneseOf(m: Mission): string[] {
	const out: string[] = [];
	if ('lines' in m) out.push(...m.lines.map((l) => l.ja));
	if (m.kind === 'choice') {
		out.push(m.question.ja, ...m.options.map((o) => o.ja));
		if (m.doc) out.push(m.doc.ja, m.doc.title);
		if (m.reaction) out.push(m.reaction.ja);
	}
	if (m.kind === 'shop') out.push(...m.shelf.map((s) => s.ja));
	if (m.kind === 'calendar') out.push(m.question.ja);
	if (m.kind === 'quick') for (const r of m.rounds) out.push(r.line.ja, ...r.options.map((o) => o.ja));
	if (m.kind === 'drill') for (const r of m.rounds) out.push(r.frase, ...r.options.map((o) => o.ja));
	return out;
}

export const hhmm = (min: number): string => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

// ── Modalità esame: una sezione alla volta, a tempo, senza città ─────────────
export type ExamSection = 'moji' | 'bunpou' | 'dokkai' | 'choukai';
export const EXAM_SECTIONS: Record<ExamSection, { label: string; tipi: BankTipo[] }> = {
	moji: { label: '文字・語彙 Kanji e parole', tipi: ['moji', 'goi'] },
	bunpou: { label: '文法 Grammatica', tipi: ['bunpou'] },
	dokkai: { label: '読解 Lettura', tipi: ['dokkai'] },
	choukai: { label: '聴解 Ascolto', tipi: ['kadai', 'point', 'hatsuwa', 'sokuji'] }
};
// secondi a domanda, circa come all'esame vero (N4: 25 + 55 + 35 minuti)
export const EXAM_SECONDS: Record<BankTipo, number> = { moji: 35, goi: 45, bunpou: 60, dokkai: 150, kadai: 60, point: 75, hatsuwa: 30, sokuji: 20 };

// Domande per una prova: prima quelle da ripassare (scadute), poi le mai viste,
// poi le altre dalla più vecchia; in ordine d'esame (per tipo, come sul foglio).
// Le letture con lo stesso brano restano vicine.
export function examSet(bank: BankItem[], prog: Progress, dayNo: number, section: ExamSection, n: number, rng: Rng): BankItem[] {
	const tipi = EXAM_SECTIONS[section].tipi;
	const pool = bank.filter((b) => tipi.includes(b.tipo));
	const st = (b: BankItem) => prog[b.id];
	const wait = (s: number) => (s === 0 ? 1 : s === 1 ? 3 : 10);
	const due = pool.filter((b) => st(b) && st(b)!.last + wait(st(b)!.streak) <= dayNo).sort((a, b) => st(a)!.streak - st(b)!.streak);
	const fresh = shuffled(rng, pool.filter((b) => !st(b)));
	const rest = pool.filter((b) => st(b) && !due.includes(b)).sort((a, b) => st(a)!.last - st(b)!.last);
	const picked: BankItem[] = [];
	const seen = new Set<string>();
	const add = (b: BankItem) => {
		if (picked.length >= n || seen.has(b.id)) return;
		// un brano porta con sé le sue altre domande
		const group = b.testo ? pool.filter((x) => x.testo?.ja === b.testo!.ja) : [b];
		for (const g of group) if (!seen.has(g.id) && picked.length < n + 3) { seen.add(g.id); picked.push(g); }
	};
	for (const b of [...due, ...fresh, ...rest]) add(b);
	const order = (b: BankItem) => tipi.indexOf(b.tipo);
	return picked.sort((a, b) => order(a) - order(b) || (a.testo?.ja ?? '').localeCompare(b.testo?.ja ?? '') || a.id.localeCompare(b.id));
}
export const examTime = (items: BankItem[]) => items.reduce((t, b) => t + EXAM_SECONDS[b.tipo], 0);
