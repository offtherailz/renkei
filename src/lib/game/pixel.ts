// Pixel art della città, disegnata in codice su canvas (niente asset esterni).
// Risoluzione nativa: 16 px per casella; il canvas si scala con
// image-rendering: pixelated.

import { MAP_H, MAP_W, PLACES, ROAD_COLS, ROAD_ROWS, START, isCrossing, isRoad, type Building, type Pos } from './giorno';

export const TILE = 16;

const C = {
	grass: '#6abe30', grass2: '#5ba82a', road: '#595652', walk: '#847e87', line: '#e8e8e8',
	wall: '#eec39a', wall2: '#d9a066', win: '#5fcde4', winDark: '#306082', door: '#45283c',
	trunk: '#663931', leaf: '#37946e', leaf2: '#4b692f', red: '#ac3232', green: '#99e550', dark: '#222034',
	skin: '#eec39a', hair: '#222034', shirt: '#5b6ee1', pants: '#3f3f74', white: '#ffffff', yellow: '#fbf236'
};

const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
	ctx.fillStyle = c;
	ctx.fillRect(x, y, w, h);
};

// semaforo: rosso o verde, a turno per incrocio (fase = passi del giocatore)
export function lightOf(x: number, y: number, phase: number): 'red' | 'green' {
	return (Math.floor(phase / 4) + x + y) % 2 === 0 ? 'green' : 'red';
}

function hash(x: number, y: number): number {
	let h = x * 374761393 + y * 668265263;
	h = (h ^ (h >> 13)) * 1274126177;
	return (h ^ (h >> 16)) >>> 0;
}

function drawGrass(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const px = tx * TILE;
	const py = ty * TILE;
	rect(ctx, px, py, TILE, TILE, C.grass);
	const h = hash(tx, ty);
	for (let i = 0; i < 5; i += 1) rect(ctx, px + ((h >> (i * 4)) & 15), py + ((h >> (i * 4 + 2)) & 15), 1, 1, C.grass2);
}

function drawRoad(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const px = tx * TILE;
	const py = ty * TILE;
	rect(ctx, px, py, TILE, TILE, C.road);
	const v = (ROAD_COLS as readonly number[]).includes(tx) && ty <= 12;
	const hz = (ROAD_ROWS as readonly number[]).includes(ty);
	// marciapiedi sui bordi che non continuano in strada
	if (!isRoad(tx - 1, ty)) rect(ctx, px, py, 2, TILE, C.walk);
	if (!isRoad(tx + 1, ty)) rect(ctx, px + TILE - 2, py, 2, TILE, C.walk);
	if (!isRoad(tx, ty - 1)) rect(ctx, px, py, TILE, 2, C.walk);
	if (!isRoad(tx, ty + 1) && ty < 13) rect(ctx, px, py + TILE - 2, TILE, 2, C.walk);
	if (isCrossing(tx, ty)) {
		// strisce pedonali sui quattro lati
		for (let i = 0; i < 4; i += 1) {
			rect(ctx, px + 2 + i * 3, py, 2, 3, C.line);
			rect(ctx, px + 2 + i * 3, py + TILE - 3, 2, 3, C.line);
			rect(ctx, px, py + 2 + i * 3, 3, 2, C.line);
			rect(ctx, px + TILE - 3, py + 2 + i * 3, 3, 2, C.line);
		}
	} else if (v && !hz) {
		rect(ctx, px + 7, py + 3, 2, 5, C.line);
	} else if (hz && !v) {
		rect(ctx, px + 3, py + 7, 5, 2, C.line);
	}
}

function drawSignal(ctx: CanvasRenderingContext2D, tx: number, ty: number, phase: number) {
	const px = tx * TILE + TILE - 3;
	const py = ty * TILE - 9;
	rect(ctx, px + 1, py + 8, 2, 7, C.dark);
	rect(ctx, px - 1, py, 6, 10, C.dark);
	const l = lightOf(tx, ty, phase);
	rect(ctx, px, py + 1, 4, 4, l === 'red' ? '#ff3b3b' : '#4a1010');
	rect(ctx, px, py + 5, 4, 4, l === 'green' ? '#7dff6a' : '#0f3a10');
}

function shade(hex: string, k: number): string {
	const n = parseInt(hex.slice(1), 16);
	const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
	return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building) {
	const px = b.x * TILE;
	const py = b.y * TILE;
	const roof = PLACES[b.place].roof;
	rect(ctx, px + 1, py + 2, 30, 29, C.wall);
	rect(ctx, px + 1, py + 27, 30, 4, C.wall2);
	rect(ctx, px, py, 32, 9, roof);
	rect(ctx, px, py + 9, 32, 2, shade(roof, 0.6));
	for (let i = 0; i < 8; i += 1) rect(ctx, px + i * 4, py + 2, 2, 1, shade(roof, 1.25));
	// finestre
	for (const [wx, wy] of [[4, 14], [13, 14], [22, 14], [4, 21], [22, 21]] as const) {
		rect(ctx, px + wx, py + wy, 6, 5, C.winDark);
		rect(ctx, px + wx + 1, py + wy + 1, 4, 3, C.win);
		rect(ctx, px + wx + 1, py + wy + 1, 1, 1, C.white);
	}
	// porta sul lato della strada
	const d = b.door;
	const along = (d.y < b.y || d.y > b.y + 1 ? d.x - b.x : d.y - b.y) * 16;
	if (d.y > b.y + 1) rect(ctx, px + along + 5, py + 22, 6, 9, C.door);
	else if (d.y < b.y) rect(ctx, px + along + 5, py + 11, 6, 5, C.door);
	else if (d.x < b.x) rect(ctx, px + 1, py + (along ? 21 : 12), 3, 9, C.door);
	else rect(ctx, px + 28, py + (along ? 21 : 12), 3, 9, C.door);
}

function drawStation(ctx: CanvasRenderingContext2D) {
	const px = 4 * TILE;
	const py = 13 * TILE;
	const w = 7 * TILE;
	rect(ctx, px, py + 4, w, 28, '#cbdbfc');
	rect(ctx, px - 2, py, w + 4, 8, C.red);
	rect(ctx, px - 2, py + 8, w + 4, 2, shade('#ac3232', 0.6));
	for (let i = 0; i < 6; i += 1) {
		rect(ctx, px + 6 + i * 17, py + 14, 10, 8, C.winDark);
		rect(ctx, px + 7 + i * 17, py + 15, 8, 6, C.win);
	}
	rect(ctx, px + 3 * TILE + 2, py + 12, 12, 20, C.door); // ingresso sotto l'incrocio di partenza
	rect(ctx, px + 3 * TILE + 7, py + 12, 2, 20, C.walk);
}

function drawTree(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
	const px = tx * TILE;
	const py = ty * TILE;
	rect(ctx, px + 7, py + 10, 2, 5, C.trunk);
	rect(ctx, px + 3, py + 3, 10, 8, C.leaf);
	rect(ctx, px + 4, py + 1, 8, 2, C.leaf);
	rect(ctx, px + 5, py + 4, 2, 2, C.leaf2);
	rect(ctx, px + 9, py + 7, 2, 2, C.leaf2);
}

export interface DrawState {
	town: Building[];
	player: Pos;
	facing: 'n' | 's' | 'e' | 'w';
	frame: number;
	phase: number;
	marker: Pos | null; // casella sopra cui rimbalza la freccia
	tick: number;
}

export function drawTown(ctx: CanvasRenderingContext2D, s: DrawState): void {
	ctx.imageSmoothingEnabled = false;
	const occupied = new Set<string>();
	for (const b of s.town) for (let i = 0; i < 4; i += 1) occupied.add(`${b.x + (i % 2)},${b.y + (i >> 1)}`);
	for (let y = 0; y < MAP_H; y += 1) {
		for (let x = 0; x < MAP_W; x += 1) {
			if (isRoad(x, y)) drawRoad(ctx, x, y);
			else drawGrass(ctx, x, y);
		}
	}
	drawStation(ctx);
	for (let y = 0; y < MAP_H; y += 1) {
		for (let x = 0; x < MAP_W; x += 1) {
			if (isRoad(x, y) || occupied.has(`${x},${y}`) || y >= 13) continue;
			if (hash(x, y) % 3 === 0) drawTree(ctx, x, y);
		}
	}
	for (const b of s.town) drawBuilding(ctx, b);
	for (const r of ROAD_ROWS) for (const c of ROAD_COLS) if (!(c === START.x && r === START.y)) drawSignal(ctx, c, r, s.phase);
	drawPlayer(ctx, s.player, s.facing, s.frame);
	if (s.marker) {
		const bob = Math.round(Math.sin(s.tick / 4) * 2);
		const mx = s.marker.x * TILE + 4;
		const my = s.marker.y * TILE - 10 + bob;
		rect(ctx, mx + 2, my, 4, 5, C.yellow);
		rect(ctx, mx, my + 5, 8, 2, C.yellow);
		rect(ctx, mx + 2, my + 7, 4, 1, C.yellow);
		rect(ctx, mx + 3, my + 8, 2, 1, C.yellow);
	}
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Pos, facing: DrawState['facing'], frame: number) {
	const px = p.x * TILE + 3;
	const py = p.y * TILE + 1 - (frame % 2);
	rect(ctx, px + 1, py + 13, 8, 2, 'rgba(0,0,0,0.25)'); // ombra
	rect(ctx, px + 2, py, 6, 3, C.hair);
	rect(ctx, px + 2, py + 3, 6, 4, C.skin);
	if (facing !== 'n') {
		const eyes = facing === 'e' ? [5, 7] : facing === 'w' ? [2, 4] : [3, 6];
		for (const e of eyes) rect(ctx, px + e, py + 4, 1, 1, C.dark);
	} else rect(ctx, px + 2, py + 3, 6, 2, C.hair);
	rect(ctx, px + 1, py + 7, 8, 4, C.shirt);
	rect(ctx, px + 1, py + 7, 1, 3, C.skin);
	rect(ctx, px + 8, py + 7, 1, 3, C.skin);
	const step = frame % 2;
	rect(ctx, px + 2, py + 11, 2, 2 + step, C.pants);
	rect(ctx, px + 6, py + 11, 2, 3 - step, C.pants);
}

// Ritratto 16×16 di chi parla (N = voce narrante: altoparlante)
const FACES: Record<'F' | 'M' | 'N', string[]> = {
	F: [
		'....hhhhhhhh....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhssssssssshh.', '.hhsssssssssshh.',
		'.hhsseessseesshh', '.hhsssssssssshh.', '.hhssssnssssshh.', '.hhsssmmmmssshh.', '.hhhsssssssshhh.',
		'.hhhhssssssshhh.', '..hh.cccccc.hh..', '....cccccccc....', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccc..'
	],
	M: [
		'................', '....hhhhhhhh....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hsssssssssssh.',
		'..sseessssseess.', '..ssssssssssss..', '..sssssnssssss..', '..ssssmmmmssss..', '...ssssssssss...',
		'....ssssssss....', '.....wwwwww.....', '...kkkwttwkkk...', '..kkkkkttkkkkk..', '..kkkkkttkkkkk..', '..kkkkkkkkkkkk..'
	],
	N: [
		'................', '................', '.........yy.....', '........yyy..y..', '...kk..yyyy...y.',
		'..kkkkyyyyy.y..y', '..kkkkyyyyy..y.y', '..kkkkyyyyy..y.y', '..kkkkyyyyy.y..y', '...kk..yyyy...y.',
		'........yyy..y..', '.........yy.....', '................', '................', '................', '................'
	]
};
const FACE_PAL: Record<string, string> = {
	h: '#45283c', s: '#eec39a', e: '#222034', n: '#d9a066', m: '#ac3232', c: '#d77bba', w: '#ffffff',
	t: '#ac3232', k: '#3f3f74', y: '#fbf236'
};

export function drawFace(ctx: CanvasRenderingContext2D, who: 'F' | 'M' | 'N', hair?: string): void {
	ctx.clearRect(0, 0, 16, 16);
	FACES[who].forEach((row, y) => {
		[...row].forEach((ch, x) => {
			if (ch === '.') return;
			ctx.fillStyle = ch === 'h' && hair ? hair : FACE_PAL[ch]!;
			ctx.fillRect(x, y, 1, 1);
		});
	});
}
