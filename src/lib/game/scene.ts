// Sfondi «da avventura PC-98» per i luoghi senza un disegno pronto: forme e
// sfumature in codice, poi ridotte a 16 colori con retinatura ordinata (Bayer
// 4×4), come la grafica dei giochi giapponesi anni '90. I personaggi veri sono
// disegni (src/lib/game/sceneArt.ts): quelli in codice venivano brutti.

import type { PlaceId } from './giorno';

export const SCENE_W = 320;
export const SCENE_H = 200;

// tavolozza a 16 colori (stile PC-98)
const PAL: [number, number, number][] = [
	[0, 0, 0], [24, 28, 60], [40, 64, 136], [88, 128, 216], [160, 200, 248], [255, 255, 255],
	[192, 192, 204], [112, 112, 128], [56, 56, 72], [248, 208, 176], [216, 148, 112], [144, 72, 40],
	[248, 216, 72], [232, 128, 40], [200, 40, 56], [48, 128, 80]
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function quantize(ctx: CanvasRenderingContext2D, w = SCENE_W, h = SCENE_H): void {
	const img = ctx.getImageData(0, 0, w, h);
	const d = img.data;
	for (let y = 0; y < h; y += 1) {
		for (let x = 0; x < w; x += 1) {
			const i = (y * w + x) * 4;
			const t = (BAYER[(y & 3) * 4 + (x & 3)]! / 16 - 0.47) * 56;
			const r = d[i]! + t, g = d[i + 1]! + t, b = d[i + 2]! + t;
			let best = 0, bd = Infinity;
			for (let k = 0; k < PAL.length; k += 1) {
				const p = PAL[k]!;
				const dr = r - p[0], dg = g - p[1], db = b - p[2];
				const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
				if (dist < bd) { bd = dist; best = k; }
			}
			const p = PAL[best]!;
			d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
}

// ── sfondi ─────────────────────────────────────────────────────────────────
type Bg = 'office' | 'shop' | 'station' | 'resto' | 'street' | 'school' | 'clinic' | 'library';
const BG_OF: Partial<Record<PlaceId | 'eki', Bg>> = {
	kaisha: 'office', ginkou: 'office', yuubin: 'office', hoteru: 'office', konbini: 'shop', panya: 'shop', hanaya: 'shop',
	honya: 'library', toshokan: 'library', eki: 'station', resutoran: 'resto', kafe: 'resto', gakkou: 'school',
	byouin: 'clinic', kusuri: 'clinic', manshon: 'street', eiga: 'street'
};

function skyGrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, hour: number) {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	if (hour < 16) { g.addColorStop(0, '#3868d0'); g.addColorStop(1, '#a8d0f8'); }
	else if (hour < 18.5) { g.addColorStop(0, '#5048a0'); g.addColorStop(0.6, '#e88040'); g.addColorStop(1, '#f8c870'); }
	else { g.addColorStop(0, '#101838'); g.addColorStop(1, '#384880'); }
	return g;
}

function cityline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hour: number) {
	ctx.fillStyle = skyGrad(ctx, y, y + h, hour);
	ctx.fillRect(x, y, w, h);
	ctx.fillStyle = hour >= 18.5 ? '#181830' : '#6878a0';
	for (let i = 0; i < 9; i += 1) {
		const bw = 8 + ((i * 37) % 14), bh = 10 + ((i * 53) % 30);
		ctx.fillRect(x + (i * w) / 9, y + h - bh, bw, bh);
		if (hour >= 18.5) {
			ctx.fillStyle = '#f8d848';
			for (let k = 0; k < 4; k += 1) ctx.fillRect(x + (i * w) / 9 + 2 + (k % 2) * 4, y + h - bh + 3 + (k >> 1) * 6, 2, 2);
			ctx.fillStyle = '#181830';
		}
	}
}

function wallFloor(ctx: CanvasRenderingContext2D, wall: [string, string], floor: [string, string], horizon = 130) {
	let g = ctx.createLinearGradient(0, 0, 0, horizon);
	g.addColorStop(0, wall[0]); g.addColorStop(1, wall[1]);
	ctx.fillStyle = g; ctx.fillRect(0, 0, SCENE_W, horizon);
	g = ctx.createLinearGradient(0, horizon, 0, SCENE_H);
	g.addColorStop(0, floor[0]); g.addColorStop(1, floor[1]);
	ctx.fillStyle = g; ctx.fillRect(0, horizon, SCENE_W, SCENE_H - horizon);
}

function drawBg(ctx: CanvasRenderingContext2D, bg: Bg, hour: number) {
	ctx.save();
	if (bg === 'office') {
		wallFloor(ctx, ['#c8d0e0', '#8890a8'], ['#5a6078', '#30344a']);
		cityline(ctx, 20, 18, 120, 70, hour); cityline(ctx, 180, 18, 120, 70, hour);
		ctx.fillStyle = '#e8ecf4';
		for (let y = 22; y < 88; y += 6) { ctx.fillRect(20, y, 120, 1); ctx.fillRect(180, y, 120, 1); } // tende alla veneziana
		ctx.fillStyle = '#404458'; ctx.fillRect(18, 16, 124, 3); ctx.fillRect(178, 16, 124, 3);
		ctx.fillStyle = '#f8f8ff'; ctx.fillRect(60, 2, 200, 4); // neon
		ctx.fillStyle = '#7a5838'; ctx.fillRect(0, 140, SCENE_W, 14); ctx.fillStyle = '#58402a'; ctx.fillRect(0, 154, SCENE_W, 6);
		for (const x of [30, 250]) { ctx.fillStyle = '#303040'; ctx.fillRect(x, 112, 40, 28); ctx.fillStyle = '#6088c8'; ctx.fillRect(x + 3, 115, 34, 21); }
	} else if (bg === 'shop') {
		wallFloor(ctx, ['#f8f8f0', '#d8dce0'], ['#c0c4c8', '#808490']);
		const cols = ['#e04040', '#f0c040', '#40a060', '#4070d0', '#f08030', '#ffffff'];
		for (const sx of [6, 214]) {
			ctx.fillStyle = '#a0a8b0'; ctx.fillRect(sx, 30, 100, 110);
			for (let r = 0; r < 4; r += 1) {
				ctx.fillStyle = '#e8ecf0'; ctx.fillRect(sx, 52 + r * 24, 100, 3);
				for (let c = 0; c < 9; c += 1) { ctx.fillStyle = cols[(r * 3 + c) % cols.length]!; ctx.fillRect(sx + 3 + c * 11, 36 + r * 24, 8, 15); }
			}
		}
		ctx.fillStyle = '#30a050'; ctx.fillRect(0, 0, SCENE_W, 12); ctx.fillStyle = '#f08030'; ctx.fillRect(0, 12, SCENE_W, 4);
		ctx.fillStyle = '#ffffff'; for (let x = 20; x < 320; x += 70) ctx.fillRect(x, 20, 40, 3);
	} else if (bg === 'station') {
		cityline(ctx, 0, 0, SCENE_W, 110, hour);
		ctx.fillStyle = '#7880a0'; ctx.fillRect(0, 0, SCENE_W, 14);
		for (const x of [40, 280]) { ctx.fillStyle = '#9098b0'; ctx.fillRect(x - 6, 14, 12, 140); }
		ctx.fillStyle = '#20408a'; ctx.fillRect(110, 22, 100, 22); ctx.fillStyle = '#ffffff'; ctx.fillRect(116, 30, 30, 2); ctx.fillRect(150, 30, 54, 2); ctx.fillRect(116, 36, 88, 2);
		wallFloor(ctx, ['#00000000', '#00000000'], ['#b0b0b8', '#686878'], 140);
		ctx.fillStyle = '#f0d040'; ctx.fillRect(0, 140, SCENE_W, 4);
		ctx.fillStyle = '#d0d0d8'; for (let x = 0; x < 320; x += 12) ctx.fillRect(x, 146, 6, 2);
	} else if (bg === 'resto') {
		wallFloor(ctx, ['#a86838', '#704020'], ['#583018', '#301808']);
		for (const x of [60, 160, 260]) {
			const g = ctx.createRadialGradient(x, 30, 2, x, 30, 40); g.addColorStop(0, '#f8e080'); g.addColorStop(1, '#a8683800');
			ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 80, 80); ctx.fillStyle = '#f8d060'; ctx.fillRect(x - 6, 20, 12, 8);
		}
		ctx.fillStyle = '#e8d8b8'; ctx.fillRect(110, 40, 100, 60); ctx.fillStyle = '#704020'; ctx.fillRect(114, 44, 92, 52);
		ctx.fillStyle = '#e8d8b8'; for (let y = 50; y < 92; y += 8) ctx.fillRect(122, y, 60 + ((y * 7) % 16), 2);
		ctx.fillStyle = '#f8f0e0'; ctx.fillRect(0, 150, SCENE_W, 8);
	} else if (bg === 'school') {
		wallFloor(ctx, ['#e8e0c8', '#c8b898'], ['#a07848', '#684828']);
		ctx.fillStyle = '#705030'; ctx.fillRect(56, 26, 208, 86); ctx.fillStyle = '#28583a'; ctx.fillRect(60, 30, 200, 78);
		ctx.fillStyle = '#e8f0e8'; ctx.fillRect(72, 44, 50, 2); ctx.fillRect(72, 54, 80, 2); ctx.fillRect(72, 64, 36, 2); ctx.fillRect(170, 50, 70, 2);
		cityline(ctx, 278, 24, 38, 80, hour); cityline(ctx, 4, 24, 38, 80, hour);
	} else if (bg === 'clinic') {
		wallFloor(ctx, ['#f8fcff', '#d8e4ec'], ['#c8d8e0', '#90a0b0']);
		ctx.fillStyle = '#a8d0e8'; ctx.fillRect(220, 10, 90, 130);
		ctx.fillStyle = '#e8f4fc'; for (let x = 222; x < 310; x += 8) ctx.fillRect(x, 10, 4, 130);
		ctx.fillStyle = '#e04050'; ctx.fillRect(40, 30, 24, 8); ctx.fillRect(48, 22, 8, 24);
	} else if (bg === 'library') {
		wallFloor(ctx, ['#806040', '#583c24'], ['#483020', '#281810']);
		const cols = ['#c04040', '#3060b0', '#d0a040', '#408050', '#a0a0a0', '#703080'];
		for (let r = 0; r < 5; r += 1) {
			ctx.fillStyle = '#3a2614'; ctx.fillRect(0, 12 + r * 26, SCENE_W, 4);
			for (let x = 2; x < 318; x += 6) { ctx.fillStyle = cols[(x * 7 + r * 3) % cols.length]!; ctx.fillRect(x, 16 + r * 26 + ((x * 13) % 5), 5, 22 - ((x * 13) % 5)); }
		}
	} else {
		// vicolo di città (come l'avventura in PC-98)
		cityline(ctx, 100, 0, 120, 80, hour);
		const g = ctx.createLinearGradient(0, 0, 100, 0); g.addColorStop(0, '#202838'); g.addColorStop(1, '#58607a');
		ctx.fillStyle = g; ctx.fillRect(0, 0, 110, 160);
		const g2 = ctx.createLinearGradient(320, 0, 210, 0); g2.addColorStop(0, '#202838'); g2.addColorStop(1, '#58607a');
		ctx.fillStyle = g2; ctx.fillRect(210, 0, 110, 160);
		ctx.fillStyle = '#9098a8'; ctx.fillRect(70, 0, 5, 160); ctx.fillRect(240, 0, 5, 160);
		for (let y = 10; y < 150; y += 22) { ctx.fillStyle = hour >= 18.5 ? '#f8d050' : '#8898c0'; ctx.fillRect(14, y, 14, 10); ctx.fillRect(286, y, 14, 10); }
		ctx.fillStyle = '#b0a080'; ctx.fillRect(240, 120, 40, 30); ctx.fillStyle = '#8a7858'; ctx.fillRect(240, 120, 40, 4);
		wallFloor(ctx, ['#00000000', '#00000000'], ['#505868', '#202430'], 150);
	}
	ctx.restore();
}

export interface SceneState {
	place: PlaceId | 'eki';
	hour: number;
}

export function drawScene(ctx: CanvasRenderingContext2D, s: SceneState): void {
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, SCENE_W, SCENE_H);
	drawBg(ctx, BG_OF[s.place] ?? 'street', s.hour);
	// vignetta ai bordi, come la cornice delle schermate
	const g = ctx.createRadialGradient(160, 100, 80, 160, 100, 210);
	g.addColorStop(0, '#00000000'); g.addColorStop(1, '#00000088');
	ctx.fillStyle = g; ctx.fillRect(0, 0, SCENE_W, SCENE_H);
	quantize(ctx);
}
