import { describe, expect, it } from 'vitest';
import {
	buildDay, buildTown, buildingOf, calendarMission, followPlan, isRoad, japaneseOf, planRoute, PLACES,
	priorityMission, quickMission, readMission, reasonMission, roadPath, seeded, shopMission, START, type PlaceId
} from './giorno';
import { isInLevel } from '$lib/data/kanjiN4';

const KANJI = /[\u4e00-\u9faf]/g;

describe('mappa e indicazioni', () => {
	it('ogni porta è su una strada ed è raggiungibile dalla stazione', () => {
		for (let s = 1; s <= 30; s += 1) {
			const town = buildTown(seeded(s));
			expect(town).toHaveLength(16);
			for (const b of town) {
				expect(isRoad(b.door.x, b.door.y)).toBe(true);
				expect(roadPath(START, b.door).length).toBeGreaterThan(0);
			}
		}
	});

	it('seguendo le indicazioni si arriva alla porta giusta, dal lato detto', () => {
		for (let s = 1; s <= 40; s += 1) {
			const town = buildTown(seeded(s));
			for (const id of Object.keys(PLACES) as PlaceId[]) {
				const plan = planRoute(town, id);
				const { pos } = followPlan(plan, town, id);
				expect(pos).toEqual(buildingOf(town, id).door);
				expect(plan.turns.length).toBeLessThanOrEqual(2);
			}
		}
	});
});

describe('missioni', () => {
	it('spesa: si compra ciò che serve, mai ciò che «non serve»', () => {
		for (let s = 1; s <= 30; s += 1) {
			const m = shopMission(seeded(s));
			expect(m.need.length).toBeGreaterThan(0);
			for (const id of m.need) expect(m.shelf.map((x) => x.id)).toContain(id);
			const refused = m.lines.find((l) => l.ja.includes('いらない'))!;
			const refusedItem = m.shelf.find((x) => refused.ja.startsWith(x.ja))!;
			expect(m.need).not.toContain(refusedItem.id);
		}
	});

	it('calendario: la data giusta è un giorno feriale, non oggi, ed è nominata per ultima', () => {
		for (let s = 1; s <= 30; s += 1) {
			const m = calendarMission(seeded(s));
			const d = m.days.find((x) => x.day === m.answer)!;
			expect(d.wd).toBeLessThan(5);
			expect(m.answer).not.toBe(m.today);
		}
	});

	it('priorità, motivo, mail: 4 opzioni distinte, una giusta', () => {
		for (let s = 1; s <= 30; s += 1) {
			for (const m of [priorityMission(seeded(s)), reasonMission(seeded(s)), readMission(seeded(s))]) {
				expect(m.options).toHaveLength(4);
				expect(new Set(m.options.map((o) => o.ja)).size).toBe(4);
				expect(m.answer).toBeGreaterThanOrEqual(0);
			}
		}
	});

	it('priorità: la risposta è il compito detto dopo «それより まず»', () => {
		const m = priorityMission(seeded(7));
		const urgent = m.lines.find((l) => l.ja.includes('それより まず'))!;
		expect(m.options[m.answer]!.it.length).toBeGreaterThan(0);
		expect(urgent.it).toContain(m.options[m.answer]!.it);
	});

	it('botta e risposta: round distinti con la risposta giusta', () => {
		const m = quickMission(seeded(3));
		expect(m.rounds).toHaveLength(6);
		for (const r of m.rounds) expect(r.options[r.answer]).toBeDefined();
	});
});

describe('la giornata', () => {
	it('stessa giornata con lo stesso seme, diversa con un altro', () => {
		expect(JSON.stringify(buildDay(5))).toBe(JSON.stringify(buildDay(5)));
		expect(JSON.stringify(buildDay(5))).not.toBe(JSON.stringify(buildDay(6)));
	});

	it('solo kanji N5/N4 nei testi (fuori livello → kana); i cartelli esclusi', () => {
		const bad = new Set<string>();
		for (let s = 1; s <= 60; s += 1) {
			for (const step of buildDay(s).steps) {
				if (step.mission.kind === 'choice' && step.mission.sub === 'sign') continue;
				for (const t of japaneseOf(step.mission)) for (const k of t.match(KANJI) ?? []) if (!isInLevel(k)) bad.add(`${k} (${t})`);
			}
		}
		expect([...bad]).toEqual([]);
	});

	it('cartelli: solo kanji di livello', () => {
		const bad = new Set<string>();
		for (let s = 1; s <= 60; s += 1) {
			const m = buildDay(s).steps[0]!.mission;
			for (const t of japaneseOf(m)) for (const k of t.match(KANJI) ?? []) if (!isInLevel(k)) bad.add(k);
		}
		expect([...bad]).toEqual([]);
	});
});

describe('pixel art', () => {
	it('disegna città, giocatore, freccia e ritratti senza errori e dentro il canvas', async () => {
		const { drawTown, drawFace, TILE } = await import('./pixel');
		const calls: number[][] = [];
		const ctx = {
			fillStyle: '',
			imageSmoothingEnabled: true,
			fillRect: (x: number, y: number, w: number, h: number) => calls.push([x, y, w, h]),
			clearRect: () => {}
		} as unknown as CanvasRenderingContext2D;
		const day = buildDay(11);
		drawTown(ctx, { town: day.town, player: START, facing: 'n', frame: 1, phase: 3, marker: { x: 7, y: 13 }, tick: 5 });
		for (const w of ['F', 'M', 'N'] as const) drawFace(ctx, w);
		expect(calls.length).toBeGreaterThan(1000);
		const size = 15 * TILE;
		for (const [x, y] of calls) {
			expect(x).toBeGreaterThanOrEqual(-2);
			expect(y).toBeGreaterThanOrEqual(-6);
			expect(x).toBeLessThan(size);
			expect(y).toBeLessThan(size);
		}
	});
});
