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
	it('spesa: quantità coerenti, «non serve» escluso, tutto ciò che serve è sullo scaffale', () => {
		for (let s = 1; s <= 60; s += 1) {
			const m = shopMission(seeded(s));
			const ids = Object.keys(m.need);
			expect(ids.length).toBeGreaterThan(0);
			for (const id of ids) {
				expect(m.shelf.map((x) => x.id)).toContain(id);
				expect(m.need[id]).toBeGreaterThanOrEqual(1);
				expect(m.need[id]).toBeLessThanOrEqual(4);
			}
			const refused = m.lines.find((l) => l.ja.includes('いらない'));
			if (refused) {
				const item = m.shelf.find((x) => refused.ja.startsWith(x.ja))!;
				expect(m.need[item.id]).toBeUndefined();
			}
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
		for (let s = 1; s <= 30; s += 1) {
			const mm = priorityMission(seeded(s));
			const u = mm.lines.find((l) => l.ja.includes('それより まず'))!;
			const ans = mm.options[mm.answer]!.ja.slice(0, 2);
			expect(u.ja.split('それより まず')[1]).toContain(ans);
		}
		expect(urgent).toBeDefined();
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
	it('disegna città, giocatore e freccia senza errori e dentro il canvas', async () => {
		const { drawTown, TILE } = await import('./pixel');
		const calls: number[][] = [];
		const ctx = {
			fillStyle: '',
			imageSmoothingEnabled: true,
			fillRect: (x: number, y: number, w: number, h: number) => calls.push([x, y, w, h]),
			clearRect: () => {}
		} as unknown as CanvasRenderingContext2D;
		const day = buildDay(11);
		drawTown(ctx, { town: day.town, player: START, facing: 'n', frame: 1, phase: 3, marker: { x: 7, y: 13 }, tick: 5 });
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

describe('priorità: dialogo coerente', () => {
	it('chi riceve i compiti ha la voce opposta al capo, e il motivo è del compito urgente', () => {
		for (let s = 1; s <= 30; s += 1) {
			const m = priorityMission(seeded(s));
			const boss = m.lines[1]!.who;
			expect(m.lines[2]!.who).not.toBe(boss);
			expect(m.lines[2]!.who).not.toBe('N');
			const urgent = m.lines.find((l) => l.ja.includes('それより まず'))!;
			expect(urgent.it).toContain('Prima di tutto');
			expect(m.question.ja).toMatch(/^(男|女)の 人は まず/);
		}
	});
});

describe('banca e ripasso progressivo', () => {
	const item = (id: string, tipo: 'kadai' | 'sokuji' = 'kadai') => ({
		id, tipo, righe: [{ who: 'F' as const, ja: 'はい。', it: 'Sì.' }], domanda: { ja: '何ですか。', it: '?' },
		opzioni: [{ ja: 'A', it: 'a' }, { ja: 'B', it: 'b' }, { ja: 'C', it: 'c' }], risposta: 1
	});
	const bank = ['a', 'b', 'c', 'd', 'e'].map((x) => item(x));

	it('prima le sbagliate, poi poche nuove; le consolidate tornano solo dopo giorni', async () => {
		const { pickBank, recordResult } = await import('./giorno');
		let prog = recordResult({}, 'c', false, 0);
		prog = recordResult(prog, 'a', true, 0);
		prog = recordResult(prog, 'a', true, 1); // consolidata
		const picked = pickBank(bank, 'kadai', 4, prog, 2, new Set(), { left: 2 }).map((b) => b.id);
		expect(picked[0]).toBe('c');
		expect(picked).toEqual(['c', 'b', 'd']);
		const later = pickBank(bank, 'kadai', 4, prog, 6, new Set(), { left: 0 }).map((b) => b.id);
		expect(later).toEqual(['c']);
		const muchLater = pickBank(bank, 'kadai', 4, prog, 11, new Set(), { left: 0 }).map((b) => b.id);
		expect(muchLater).toEqual(['c', 'a']);
	});

	it('una giusta torna dopo 3 giorni, e metà posti restano alle nuove', async () => {
		const { pickBank, recordResult } = await import('./giorno');
		const prog = recordResult({}, 'a', true, 5);
		expect(pickBank(bank, 'kadai', 4, prog, 6, new Set(), { left: 0 }).map((b) => b.id)).not.toContain('a');
		expect(pickBank(bank, 'kadai', 4, prog, 8, new Set(), { left: 0 }).map((b) => b.id)).toContain('a');
		// tante da ripassare: comunque metà nuove
		let p = {};
		for (const id of ['a', 'b', 'c']) p = recordResult(p, id, false, 0);
		const mix = pickBank(bank, 'kadai', 2, p, 1, new Set(), { left: 5 }).map((b) => b.id);
		expect(mix).toContain('d');
	});

	it('la giornata usa la banca quando c’è, e conta le nuove', () => {
		const big = [...bank, ...['s1', 's2', 's3', 's4'].map((x) => item(x, 'sokuji'))];
		const d = buildDay(3, { bank: big, prog: {}, dayNo: 0 });
		expect(d.fromBank).toBeGreaterThan(0);
		expect(d.newToday).toBeLessThanOrEqual(8);
		const ids = d.steps.flatMap((s) => (s.mission.kind === 'choice' && s.mission.sourceId ? [s.mission.sourceId] : []));
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('ripasso delle domande scritte', () => {
	it('le domande moji/goi/bunpou diventano pause di ripasso; la frase letta ha il vuoto riempito', async () => {
		const { drillSpoken } = await import('./giorno');
		const w = (id: string, tipo: 'moji' | 'bunpou', ja: string) => ({
			id, tipo, righe: [], domanda: { ja, it: '' }, opzioni: [{ ja: 'を', it: '' }, { ja: 'が', it: '' }, { ja: 'へ', it: '' }, { ja: 'に', it: '' }], risposta: 0
		});
		const bank = [w('m1', 'moji', '【料理】が すきです。'), w('b1', 'bunpou', '会社（　）休みました。')];
		const d = buildDay(9, { bank, prog: {}, dayNo: 0 });
		const drills = d.steps.filter((s) => s.mission.kind === 'drill');
		expect(drills.length).toBeGreaterThan(0);
		// la giornata comincia a casa, poi il ripasso in treno
		expect(d.steps[0]!.place).toBe('ie');
		expect(d.steps[1]!.mission.kind).toBe('drill');
		const lunch = drills.find((s) => s.mission.kind === 'drill' && s.mission.rounds.some((r) => r.sourceId === 'b1'))!;
		expect(lunch.mission.kind === 'drill' && drillSpoken(lunch.mission.rounds[0]!)).toBe('会社を休みました。');
	});
});

describe('nuove varianti', () => {
	it('portare, ordine e tabella: una sola risposta giusta e coerente', async () => {
		const { bringMission, orderMission, tableMission } = await import('./giorno');
		for (let s = 1; s <= 40; s += 1) {
			for (const m of [bringMission(seeded(s)), orderMission(seeded(s)), tableMission(seeded(s))]) {
				expect(m.answer).toBeGreaterThanOrEqual(0);
				expect(new Set(m.options.map((o) => o.ja)).size).toBe(m.options.length);
			}
		}
	});
	it('domande della banca: opzioni rimescolate ma la giusta resta giusta', async () => {
		const { bankMission } = await import('./giorno');
		const b = { id: 'x', tipo: 'kadai' as const, righe: [], domanda: { ja: '?', it: '?' }, opzioni: ['A', 'B', 'C', 'D'].map((ja) => ({ ja, it: '' })), risposta: 2 };
		const pos = new Set<number>();
		for (let s = 1; s <= 20; s += 1) {
			const m = bankMission(b, seeded(s));
			expect(m.options[m.answer]!.ja).toBe('C');
			pos.add(m.answer);
		}
		expect(pos.size).toBeGreaterThan(1);
	});
});

describe('indicazioni con punti di riferimento', () => {
	it('accanto, davanti e angoli sono veri sulla mappa', async () => {
		const { landmarks, directionsLines } = await import('./giorno');
		let withRef = 0;
		for (let s = 1; s <= 40; s += 1) {
			const town = buildTown(seeded(s));
			for (const id of Object.keys(PLACES) as PlaceId[]) {
				const plan = planRoute(town, id);
				const t = buildingOf(town, id);
				const lm = landmarks(plan, town);
				if (lm.next) expect(Math.abs(lm.next.x - t.x) + Math.abs(lm.next.y - t.y)).toBe(2);
				if (lm.front) {
					// la porta del bersaglio è tra i due edifici
					const d = t.door;
					const touches = (b: typeof t) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => d.x + dx! >= b.x && d.x + dx! <= b.x + 1 && d.y + dy! >= b.y && d.y + dy! <= b.y + 1);
					expect(touches(lm.front)).toBe(true);
					expect(touches(t)).toBe(true);
				}
				for (const c of lm.corner) if (c) expect(c.place).not.toBe(id);
				const txt = directionsLines(plan, seeded(s * 31), false, town).map((l) => l.ja).join('');
				if (/となり|前に|かど/.test(txt)) withRef += 1;
			}
		}
		expect(withRef).toBeGreaterThan(200);
	});
});

describe('appuntamenti e pagamenti', () => {
	it('opzioni distinte, una sola giusta; il conto torna con la spiegazione', async () => {
		const { appointmentMission, paymentMission } = await import('./giorno');
		for (let s = 1; s <= 60; s += 1) {
			const a = appointmentMission(seeded(s));
			expect(new Set(a.options.map((o) => o.ja)).size).toBe(a.options.length);
			expect(a.options).toHaveLength(4);
			const p = paymentMission(seeded(s));
			expect(new Set(p.options.map((o) => o.ja)).size).toBe(p.options.length);
			const right = Number(p.options[p.answer]!.ja.replace('円', ''));
			expect(right).toBeGreaterThan(0);
			expect(p.spiega).toContain(String(right));
		}
	});
});

describe('giornata: casa, compito generato, domande nuove', () => {
	it('comincia e finisce a casa, e ogni giorno ha un compito generato in ufficio', () => {
		for (const seed of [1, 2, 3, 4, 5]) {
			const d = buildDay(seed);
			expect(d.steps[0]!.place).toBe('ie');
			expect(d.steps.at(-1)!.place).toBe('ie');
			const office = d.steps.filter((s) => s.place === 'kaisha' && s.mission.kind !== 'route');
			expect(office.some((s) => s.mission.kind === 'calendar' || (s.mission.kind === 'choice' && !s.mission.sourceId))).toBe(true);
		}
	});
	it('le domande nuove al giorno seguono l’impostazione', () => {
		const w = (i: number, tipo: 'moji' | 'kadai') => ({ id: `${tipo}${i}`, tipo, righe: [], domanda: { ja: 'x', it: '' }, opzioni: [{ ja: 'a', it: '' }, { ja: 'b', it: '' }], risposta: 0 });
		const bank = [...Array.from({ length: 80 }, (_, i) => w(i, 'moji')), ...Array.from({ length: 30 }, (_, i) => w(i, 'kadai'))];
		const few = buildDay(7, { bank, prog: {}, dayNo: 1, newPerDay: 10 });
		const many = buildDay(7, { bank, prog: {}, dayNo: 1, newPerDay: 30 });
		expect(few.newToday).toBeLessThanOrEqual(10);
		expect(many.newToday).toBeGreaterThan(few.newToday);
		expect(many.newToday).toBeLessThanOrEqual(30);
	});
});

describe('tipi di domande scelti', () => {
	it('i tipi esclusi non escono', () => {
		const w = (i: number, tipo: 'moji' | 'kadai') => ({ id: `${tipo}${i}`, tipo, righe: [], domanda: { ja: 'x', it: '' }, opzioni: [{ ja: 'a', it: '' }, { ja: 'b', it: '' }], risposta: 0 });
		const bank = [...Array.from({ length: 20 }, (_, i) => w(i, 'moji')), ...Array.from({ length: 10 }, (_, i) => w(i, 'kadai'))];
		const d = buildDay(5, { bank, prog: {}, dayNo: 1, tipi: ['kadai'] });
		const ids = d.steps.flatMap((s) => (s.mission.kind === 'drill' ? s.mission.rounds.map((r) => r.sourceId) : s.mission.kind === 'choice' && s.mission.sourceId ? [s.mission.sourceId] : []));
		expect(ids.some((id) => id?.startsWith('kadai'))).toBe(true);
		expect(ids.some((id) => id?.startsWith('moji'))).toBe(false);
	});
});

