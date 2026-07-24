import { describe, it, expect } from 'vitest';
import {
	WEEKDAYS,
	SCENARIOS,
	findScenario,
	generateWeek,
	generateWeekCalendar,
	isFree,
	slotAt,
	HOURS,
	hourLabel,
	hourSpokenReading,
	buildProposeLine,
	buildNpcProposeLine,
	pickRandomProposal,
	buildUserAcceptLine,
	buildUserCounterLine,
	buildNpcAcceptLine,
	buildNpcRejectLine,
	buildConfirmLine,
	pickNpcCounterProposal,
	randomMotivo,
	randomLuogo,
	computeScore
} from './appuntamento';

describe('WEEKDAYS', () => {
	it('ha 7 voci lun→dom con jp/read/it', () => {
		expect(WEEKDAYS).toHaveLength(7);
		expect(WEEKDAYS[0]).toEqual({ jp: '月曜日', read: 'げつようび', it: 'lunedì' });
		expect(WEEKDAYS[6]).toEqual({ jp: '日曜日', read: 'にちようび', it: 'domenica' });
		for (const w of WEEKDAYS) {
			expect(w.jp).toMatch(/曜日$/);
			expect(w.read).toMatch(/ようび$/);
		}
	});
});

describe('SCENARIOS', () => {
	it('copre i 4 scenari con il registro giusto', () => {
		expect(SCENARIOS).toHaveLength(4);
		expect(findScenario('nomi').register).toBe('plain');
		expect(findScenario('eiga').register).toBe('teinei');
		expect(findScenario('cafe').register).toBe('teinei');
		expect(findScenario('shigoto').register).toBe('keigo');
	});
	it('lancia per uno scenario inesistente', () => {
		// @ts-expect-error test volutamente con id non valido
		expect(() => findScenario('nope')).toThrow();
	});
});

describe('generateWeekCalendar', () => {
	it('genera 7 giorni x HOURS.length slot', () => {
		const cal = generateWeekCalendar();
		expect(cal).toHaveLength(7 * HOURS.length);
	});
	it('ogni giorno ha 1-2 slot occupati con motivo, il resto liberi senza motivo', () => {
		const cal = generateWeekCalendar();
		for (let d = 0; d < 7; d += 1) {
			const dayied = cal.filter((s) => s.weekdayIndex === d);
			const busy = dayied.filter((s) => s.busy);
			expect(busy.length).toBeGreaterThanOrEqual(1);
			expect(busy.length).toBeLessThanOrEqual(2);
			for (const s of busy) expect(s.reason).not.toBeNull();
			for (const s of dayied.filter((s) => !s.busy)) expect(s.reason).toBeNull();
		}
	});
	it('isFree/slotAt riflettono lo stato busy', () => {
		const cal = generateWeekCalendar();
		const slot = cal[0]!;
		expect(isFree(cal, slot.weekdayIndex, slot.hour)).toBe(!slot.busy);
		expect(slotAt(cal, slot.weekdayIndex, slot.hour)).toEqual(slot);
	});
	it('isFree è true per uno slot fuori orario (non tracciato)', () => {
		const cal = generateWeekCalendar();
		expect(isFree(cal, 0, 9999)).toBe(true);
	});
});

describe('hourLabel / hourSpokenReading', () => {
	it('formatta l’etichetta e normalizza le ore pomeridiane per la lettura', () => {
		expect(hourLabel(7)).toBe('7時');
		expect(hourSpokenReading(7)).toBe('しちじ');
		expect(hourSpokenReading(19)).toBe('しちじ'); // 19 → 7 in formato 12h
		expect(hourSpokenReading(4)).toBe('よじ');
		expect(hourSpokenReading(9)).toBe('くじ');
	});
});

const P1 = { weekdayIndex: 5, hour: 19 }; // 土曜日 19時
const P2 = { weekdayIndex: 0, hour: 10 }; // 月曜日 10時
// Settimana di test fissa: marzo, giorni 10-16 → week[5].day=15, week[0].day=10.
const WEEK = Array.from({ length: 7 }, (_, i) => ({ weekdayIndex: i, month: 3, day: 10 + i }));

describe('generateWeek', () => {
	it('7 giorni consecutivi nello stesso mese, lun→dom', () => {
		const w = generateWeek();
		expect(w).toHaveLength(7);
		expect(w.every((d) => d.month === w[0]!.month)).toBe(true);
		for (let i = 1; i < 7; i += 1) expect(w[i]!.day).toBe(w[i - 1]!.day + 1);
		expect(w[6]!.day).toBeLessThanOrEqual(28);
	});
});

describe('builder battute — 普通体 (nomi), phrasing weekday', () => {
	const s = findScenario('nomi');
	it('propone, accetta, contropropone, npc accetta/rifiuta, conferma', () => {
		expect(buildProposeLine(s, P1, WEEK, 'weekday').display).toBe('土曜日の19時、飲みに行かない？');
		expect(buildUserAcceptLine(s).display).toBe('うん、いいよ。');
		expect(buildUserCounterLine(s, P1, P2, WEEK, 'weekday').display).toBe('土曜日はちょっと…月曜日の10時はどう？');
		expect(buildNpcAcceptLine(s, P1, WEEK, 'weekday').display).toBe('いいね、行こう！');
		expect(buildNpcRejectLine(s, P1, P2, 'バイト', WEEK, 'weekday').display).toBe('ごめん、土曜日はバイトなんだ。月曜日の10時はどう？');
		expect(buildConfirmLine(s, P1, '駅前', WEEK, 'weekday').display).toBe('じゃあ、土曜日の19時に駅前で。');
	});
});

describe('builder battute — 丁寧 (eiga/cafe), phrasing weekday', () => {
	it('eiga usa 映画に行きませんか, cafe usa お茶でもしませんか, resto identico', () => {
		const eiga = findScenario('eiga');
		const cafe = findScenario('cafe');
		expect(buildProposeLine(eiga, P1, WEEK, 'weekday').display).toBe('土曜日の19時、映画に行きませんか？');
		expect(buildProposeLine(cafe, P1, WEEK, 'weekday').display).toBe('土曜日の19時、お茶でもしませんか？');
		for (const s of [eiga, cafe]) {
			expect(buildUserAcceptLine(s).display).toBe('はい、大丈夫です。');
			expect(buildUserCounterLine(s, P1, P2, WEEK, 'weekday').display).toBe('土曜日はちょっと都合が悪くて…月曜日の10時はどうですか？');
			expect(buildNpcAcceptLine(s, P1, WEEK, 'weekday').display).toBe('いいですね、行きましょう。');
			expect(buildNpcRejectLine(s, P1, P2, '用事', WEEK, 'weekday').display).toBe('すみません、土曜日は用事があって…月曜日の10時はどうですか？');
			expect(buildConfirmLine(s, P1, '駅の前', WEEK, 'weekday').display).toBe('じゃあ、土曜日の19時に駅の前で会いましょう。');
		}
	});
});

describe('builder battute — 敬語 (shigoto), phrasing weekday', () => {
	const s = findScenario('shigoto');
	it('usa le forme sonkeigo/kenjougo curate', () => {
		expect(buildProposeLine(s, P1, WEEK, 'weekday').display).toBe('土曜日の19時に、お打ち合わせのお時間をいただけますでしょうか。');
		expect(buildUserAcceptLine(s).display).toBe('はい、承知いたしました。');
		expect(buildUserCounterLine(s, P1, P2, WEEK, 'weekday').display).toBe('申し訳ございません、土曜日は都合がつかず…月曜日の10時はいかがでしょうか。');
		expect(buildNpcAcceptLine(s, P1, WEEK, 'weekday').display).toBe('かしこまりました。土曜日の19時で結構です。');
		expect(buildNpcRejectLine(s, P1, P2, '先約', WEEK, 'weekday').display).toBe('申し訳ございません、土曜日は先約がございまして…月曜日の10時はいかがでしょうか。');
		expect(buildConfirmLine(s, P1, '御社', WEEK, 'weekday').display).toBe('では、土曜日の19時に御社に伺います。');
	});
});

describe('phrasing monthday', () => {
	const s = findScenario('nomi');
	it('display usa la data del mese, spoken la mette in kana (niente cifre 日)', () => {
		const line = buildProposeLine(s, P1, WEEK, 'monthday');
		expect(line.display).toBe('3月15日の19時、飲みに行かない？'); // week[5] = 3/15
		expect(line.spoken).not.toContain('15日');
		expect(line.spoken).toContain('の19時');
		expect(line.spoken).not.toBe(line.display);
	});
});

describe('iniziativa NPC', () => {
	it('buildNpcProposeLine usa npcProposeTpl per registro', () => {
		expect(buildNpcProposeLine(findScenario('nomi'), P1, WEEK, 'weekday').display).toBe('土曜日の19時、飲みに行かない？');
		expect(buildNpcProposeLine(findScenario('shigoto'), P1, WEEK, 'weekday').display).toBe('土曜日の19時に、打ち合わせをお願いできますか。');
	});
	it('pickRandomProposal resta nel range settimana/HOURS', () => {
		for (let i = 0; i < 30; i += 1) {
			const p = pickRandomProposal();
			expect(p.weekdayIndex).toBeGreaterThanOrEqual(0);
			expect(p.weekdayIndex).toBeLessThan(7);
			expect(HOURS).toContain(p.hour);
		}
	});
});

describe('pickNpcCounterProposal', () => {
	it('non ripropone mai lo stesso slot rifiutato né uno già tentato', () => {
		const cal = generateWeekCalendar();
		for (let i = 0; i < 50; i += 1) {
			const tried = [P1];
			const next = pickNpcCounterProposal(cal, P1, tried);
			expect(next.weekdayIndex === P1.weekdayIndex && next.hour === P1.hour).toBe(false);
		}
	});
	it('preferisce uno slot libero per l’utente quando disponibile', () => {
		// Calendario tutto libero tranne un unico slot occupato = P1 stesso:
		// qualunque contro-proposta diversa da P1 sarà libera.
		const cal = HOURS.flatMap((hour) =>
			Array.from({ length: 7 }, (_, weekdayIndex) => ({
				weekdayIndex,
				hour,
				busy: weekdayIndex === P1.weekdayIndex && hour === P1.hour,
				reason: weekdayIndex === P1.weekdayIndex && hour === P1.hour ? '仕事' : null
			}))
		);
		const next = pickNpcCounterProposal(cal, P1, [P1]);
		expect(isFree(cal, next.weekdayIndex, next.hour)).toBe(true);
	});
});

describe('randomMotivo / randomLuogo', () => {
	it('pescano sempre dalla lista dello scenario', () => {
		for (const s of SCENARIOS) {
			for (let i = 0; i < 20; i += 1) {
				expect(s.motivi).toContain(randomMotivo(s));
				expect(s.luoghi).toContain(randomLuogo(s));
			}
		}
	});
});

describe('computeScore', () => {
	it('dà punteggio massimo con pochi turni e zero hint', () => {
		expect(computeScore(1, 0)).toBeGreaterThan(computeScore(5, 0));
	});
	it('penalizza gli hint usati', () => {
		expect(computeScore(2, 0)).toBeGreaterThan(computeScore(2, 3));
	});
	it('non va mai sotto zero', () => {
		expect(computeScore(20, 20)).toBeGreaterThanOrEqual(0);
	});
});
