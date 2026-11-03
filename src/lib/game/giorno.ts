// 🗾 «Un giorno in Giappone»: una giornata in una piccola città, con le
// situazioni del 聴解 JLPT N4 vissute come azioni (camminare seguendo le
// indicazioni, riempire il cestino, segnare la data sul calendario…).
// Qui solo dati e generatori, puri e con rng iniettabile (testabili); la
// grafica e il gioco sono in src/routes/giorno.
//
// Testi giapponesi ORIGINALI, scritti a slot. Solo kanji N5/N4 (kanjiN4.ts):
// le parole con kanji sopra livello sono in kana (しんごう, ゆうびんきょく…).

import type { CourseGiornoInput } from '$lib/types/models';

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
	| 'kusuri' | 'panya' | 'toshokan' | 'kafe' | 'gakkou' | 'hoteru' | 'manshon' | 'eiga';

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
	hoteru: { id: 'hoteru', sign: 'ホテル', yomi: 'ほてる', it: 'hotel', roof: '#306082' },
	manshon: { id: 'manshon', sign: 'マンション', yomi: 'まんしょん', it: 'condominio', roof: '#9badb7' },
	eiga: { id: 'eiga', sign: '映画館', yomi: 'えいがかん', it: 'cinema', roof: '#ac3232' }
};

// Nome della parola come si dice nel parlato (con kanji solo se in livello)
const SPOKEN: Record<PlaceId, string> = {
	kaisha: '会社', yuubin: 'ゆうびんきょく', konbini: 'コンビニ', resutoran: 'レストラン', ginkou: '銀行',
	byouin: '病院', honya: '本屋', hanaya: '花屋', kusuri: '薬屋', panya: 'パン屋', toshokan: '図書館',
	kafe: 'カフェ', gakkou: '学校', hoteru: 'ホテル', manshon: 'マンション', eiga: '映画館'
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

// Testo delle indicazioni (passante gentile), con una trappola facoltativa:
// la persona si corregge («…二つ目、あ、ちがいました、一つ目です»).
export function directionsLines(plan: RoutePlan, rng: Rng, trap = rng() < 0.5): Line[] {
	const name = SPOKEN[plan.target];
	const who: Who = rng() < 0.5 ? 'F' : 'M';
	const lines: Line[] = [
		{ who: 'N', ja: `すみません、${name}は どこですか。`, it: `Scusi, dov'è ${PLACES[plan.target].it}?` }
	];
	const parts: string[] = [];
	const partsIt: string[] = [];
	plan.turns.forEach((t, i) => {
		if (i === 0 && t.signals === 0) {
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
	const side = `${LR[plan.side]}がわ`;
	if (parts.length === 0) {
		lines.push({ who, ja: `この 道を まっすぐ 行って ください。${side}に ありますよ。`, it: `Vada dritto per questa strada. È sulla ${LR_IT[plan.side]}.` });
	} else {
		lines.push({
			who,
			ja: `${parts.join('、それから ')} ください。${side}に ありますよ。`,
			it: `${partsIt.join(', poi ')}. È sulla ${LR_IT[plan.side]}.`.replace(/^./, (c) => c.toUpperCase())
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
			ja: `${LR[first.dir === 'R' ? 'L' : 'R']}… じゃ なくて、`,
			it: `A ${LR_IT[first.dir === 'R' ? 'L' : 'R']}… anzi no,`
		});
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
	audioOnly?: boolean; // 発話表現: le scelte si sentono soltanto (testo dopo)
	optionVoice?: Who;
	spiega?: string;
	title: string;
	intro: string; // contesto in italiano
	lines: Line[]; // audio (può essere vuoto: lettura)
	doc?: { title: string; ja: string; it: string }; // testo da leggere (読解)
	question: { ja: string; it: string };
	options: Option[];
	answer: number;
	optionsFirst?: boolean; // ポイント理解: le scelte si leggono PRIMA dell'audio
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
	shelf: ShopItem[];
	need: string[]; // id da comprare (né più né meno)
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

export type Mission = ChoiceMission | ShopMission | CalendarMission | QuickMission | RouteMission;

// Cosa allena ogni missione (per il riepilogo): i tipi del 聴解/読解 N4
export const SKILL_OF = (m: Mission): string => {
	if (m.kind === 'route' || m.kind === 'shop' || m.kind === 'calendar') return '課題理解';
	if (m.kind === 'quick') return '即時応答';
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
	{ key: 'saifu', guessIt: 'Avevi mal di pancia?', yesIt: 'Ho dimenticato il portafoglio a casa.', guess: 'おなかが いたかったんですか。', deny: 'おなかは だいじょうぶです。', yes: 'さいふを 家に わすれて しまったんです。', opt: 'さいふを わすれたから', it: 'perché ha dimenticato il portafoglio', denyIt: 'La pancia sta bene.' }
];
const EVENTS = [
	{ ja: 'きのうの パーティーに 来なかった', q: 'パーティーに 来ませんでしたか', it: 'non è venuto alla festa di ieri' },
	{ ja: 'けさ かいぎに おくれた', q: 'かいぎに おくれましたか', it: 'stamattina è arrivato tardi alla riunione' },
	{ ja: 'どようびの テニスを 休んだ', q: 'テニスを 休みましたか', it: 'ha saltato il tennis di sabato' }
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

// ── 課題理解: la spesa (trappola いらない / やっぱり) ──────────────────────────
export const ITEMS: ShopItem[] = [
	{ id: 'pan', ja: 'パン', it: 'pane', price: 200, icon: '🍞' },
	{ id: 'gyuunyuu', ja: 'ぎゅうにゅう', it: 'latte', price: 180, icon: '🥛' },
	{ id: 'tamago', ja: 'たまご', it: 'uova', price: 250, icon: '🥚' },
	{ id: 'ringo', ja: 'りんご', it: 'mele', price: 300, icon: '🍎' },
	{ id: 'banana', ja: 'バナナ', it: 'banane', price: 150, icon: '🍌' },
	{ id: 'ocha', ja: 'お茶', it: 'tè', price: 130, icon: '🍵' },
	{ id: 'onigiri', ja: 'おにぎり', it: 'onigiri', price: 160, icon: '🍙' },
	{ id: 'denchi', ja: '電池', it: 'pile', price: 400, icon: '🔋' },
	{ id: 'nooto', ja: 'ノート', it: 'quaderno', price: 120, icon: '📓' },
	{ id: 'kasa', ja: 'かさ', it: 'ombrello', price: 500, icon: '☂️' },
	{ id: 'sakana', ja: '魚', it: 'pesce', price: 450, icon: '🐟' },
	{ id: 'niku', ja: '肉', it: 'carne', price: 600, icon: '🥩' }
];

export function shopMission(rng: Rng): ShopMission {
	const [a, b, c, d, e] = shuffled(rng, ITEMS);
	const variant = Math.floor(rng() * 3);
	const lines: Line[] = [
		{ who: 'N', ja: '男の人と 女の人が 電話で 話して います。男の人は 何を 買いますか。', it: 'Un uomo e una donna parlano al telefono. Cosa compra l’uomo?' },
		{ who: 'F', ja: `帰りに コンビニで ${a!.ja}と ${b!.ja}を 買って きて くれない？`, it: `Al ritorno mi compri ${a!.it} e ${b!.it} al konbini?` },
		{ who: 'M', ja: `いいよ。${c!.ja}は？ もう ないでしょう。`, it: `Va bene. E ${c!.it}? Sono finiti, no?` },
		{ who: 'F', ja: `${c!.ja}は きのう 買ったから、いらない。`, it: `${c!.it} li ho comprati ieri, non servono.` }
	];
	let need = [a!.id, b!.id];
	if (variant === 0) {
		lines.push({ who: 'F', ja: `あ、それから ${d!.ja}も おねがい。`, it: `Ah, e anche ${d!.it}, per favore.` });
		need = [a!.id, b!.id, d!.id];
	} else if (variant === 1) {
		lines.push({ who: 'F', ja: `あ、やっぱり ${b!.ja}は いいや。まだ 少し あった。`, it: `Ah, anzi ${b!.it} lascia stare: ce n'era ancora un po'.` });
		need = [a!.id];
	} else {
		lines.push({ who: 'M', ja: `${d!.ja}も 買おうか。`, it: `Compro anche ${d!.it}?` });
		lines.push({ who: 'F', ja: `${d!.ja}は 高いから、今日は いいよ。`, it: `${d!.it} costa troppo, oggi no.` });
	}
	lines.push({ who: 'M', ja: 'わかった。じゃあ、買って 帰るね。', it: 'Ok. Allora li compro e torno.' });
	const shelf = shuffled(rng, [a!, b!, c!, d!, e!, ...shuffled(rng, ITEMS.filter((x) => ![a, b, c, d, e].includes(x))).slice(0, 3)]);
	return {
		kind: 'shop',
		title: '🧺 La spesa al konbini',
		intro: 'Ti telefonano da casa. Metti nel cestino SOLO quello che serve, poi paga.',
		lines,
		shelf,
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
		intro: 'Non sai la strada: chiedi a un passante. Ascolta le indicazioni e cammina fino alla porta giusta, poi entra.',
		lines: directionsLines(plan, rng),
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
export const NEW_PER_DAY = 2;

export function recordResult(prog: Progress, id: string, ok: boolean, dayNo: number): Progress {
	const p = prog[id] ?? { streak: 0, seen: 0, last: -1 };
	return { ...prog, [id]: { streak: ok ? p.streak + 1 : 0, seen: p.seen + 1, last: dayNo } };
}

export function pickBank(
	bank: BankItem[], tipo: BankTipo, n: number, prog: Progress, dayNo: number, used: Set<string>, newBudget: { left: number }
): BankItem[] {
	const pool = bank.filter((b) => b.tipo === tipo && !used.has(b.id));
	const st = (b: BankItem) => prog[b.id];
	const due = pool
		.filter((b) => st(b) && st(b)!.streak < CONSOLIDATED && st(b)!.last < dayNo)
		.sort((a, b) => st(a)!.streak - st(b)!.streak || st(a)!.last - st(b)!.last);
	const fresh = pool.filter((b) => !st(b));
	const review = pool
		.filter((b) => st(b) && st(b)!.streak >= CONSOLIDATED && st(b)!.last <= dayNo - 4)
		.sort((a, b) => st(a)!.last - st(b)!.last);
	const out: BankItem[] = [...due.slice(0, n)];
	while (out.length < n && fresh.length && newBudget.left > 0) {
		out.push(fresh.shift()!);
		newBudget.left -= 1;
	}
	for (const r of review) if (out.length < n) out.push(r);
	for (const b of out) used.add(b.id);
	return out;
}

const NUM_READ = ['いち', 'に', 'さん', 'よん'];
export const numbered = (i: number, ja: string): string => `${NUM_READ[i]}、${ja}`;

export function bankMission(b: BankItem): ChoiceMission {
	const sub = b.tipo === 'sokuji' ? 'hatsuwa' : b.tipo;
	const voice = b.voce ?? b.righe.find((r) => r.who !== 'N')?.who ?? 'F';
	const titles: Record<BankTipo, string> = {
		kadai: '📝 Cosa si fa?', point: '🤔 Il punto', hatsuwa: '💬 Cosa dici?', sokuji: '⚡ Rispondi', dokkai: '📖 Da leggere'
	};
	return {
		kind: 'choice',
		sub,
		sourceId: b.id,
		title: b.titolo ?? titles[b.tipo],
		intro: b.intro ?? '',
		scena: b.scena,
		lines: b.righe,
		doc: b.testo && { title: b.testo.titolo, ja: b.testo.ja, it: b.testo.it },
		question: b.domanda,
		options: b.opzioni,
		answer: b.risposta,
		optionsFirst: b.tipo === 'point' || b.tipo === 'dokkai',
		audioOnly: b.tipo === 'hatsuwa',
		optionVoice: voice,
		spiega: b.spiega
	};
}

export function bankQuick(items: BankItem[], rng: Rng): QuickMission {
	return {
		kind: 'quick',
		title: '⚡ Botta e risposta (esame)',
		intro: 'Come all’esame: senti una frase e tre risposte, solo a voce. Scegli il numero.',
		seconds: 8,
		rounds: items.map((b) => {
			const line = b.righe[0]!;
			return { sourceId: b.id, audioOnly: true, line, options: b.opzioni, answer: b.risposta };
		}).sort(() => rng() - 0.5)
	};
}

// ── La giornata ─────────────────────────────────────────────────────────────
export interface Step {
	place: PlaceId | 'eki';
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
}

const isPlace = (p: string | undefined): p is PlaceId | 'eki' => !!p && (p === 'eki' || p in PLACES);

export function buildDay(seed: number, ctx: DayContext = { bank: [], prog: {}, dayNo: 0 }): Day {
	const rng = seeded(seed);
	const town = buildTown(rng);
	const errand = pick(rng, ['yuubin', 'ginkou', 'kusuri', 'honya', 'toshokan'] as PlaceId[]);
	const used = new Set<string>();
	const budget = { left: NEW_PER_DAY * 3 };
	let fromBank = 0;
	// una domanda della banca se c'è (con il suo luogo), altrimenti la variante generata
	const slot = (tipo: BankTipo, place: PlaceId | 'eki', make: () => Mission): { place: PlaceId | 'eki'; mission: Mission } => {
		const [b] = pickBank(ctx.bank, tipo, 1, ctx.prog, ctx.dayNo, used, budget);
		if (!b) return { place, mission: make() };
		fromBank += 1;
		return { place: isPlace(b.luogo) ? b.luogo : place, mission: bankMission(b) };
	};
	const quickItems = pickBank(ctx.bank, 'sokuji', 6, ctx.prog, ctx.dayNo, used, budget);
	fromBank += quickItems.length;
	const quick = quickItems.length >= 3 ? bankQuick(quickItems, rng) : quickMission(rng);
	const steps: Step[] = [
		{ place: 'eki', time: 8 * 60, mission: signMission(rng), cost: 5 },
		{ place: 'kaisha', time: 8 * 60 + 10, deadline: 9 * 60, mission: routeMission(rng, town, 'kaisha'), cost: 0 },
		{ ...slot('kadai', 'kaisha', () => priorityMission(rng)), time: 9 * 60, cost: 50 },
		{ ...slot('kadai', 'kaisha', () => calendarMission(rng)), time: 10 * 60, cost: 40 },
		{ ...slot('dokkai', 'kaisha', () => readMission(rng)), time: 11 * 60, cost: 40 },
		{ ...slot('hatsuwa', 'resutoran', () => rpgMission(rng, 6)), time: 12 * 60, cost: 50, lunch: true },
		{ place: errand, time: 13 * 60 + 30, mission: routeMission(rng, town, errand), cost: 0 },
		{ ...slot('point', errand, () => reasonMission(rng)), time: 14 * 60, cost: 30 },
		{ ...slot('point', 'kaisha', () => reasonMission(rng)), time: 15 * 60, cost: 40 },
		{ ...slot('hatsuwa', 'kaisha', () => rpgMission(rng)), time: 16 * 60, cost: 60 },
		{ ...slot('kadai', 'konbini', () => shopMission(rng)), time: 18 * 60, cost: 15 },
		{ place: 'eki', time: 18 * 60 + 30, mission: quick, cost: 20 }
	];
	return { seed, town, steps, fromBank, newToday: NEW_PER_DAY * 3 - budget.left };
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
	return out;
}

export const hhmm = (min: number): string => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
