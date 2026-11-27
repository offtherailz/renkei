import { describe, expect, it } from 'vitest';
import { budgetTesto, caratteri, citazioni, cpm, dividiTesto, frasePerProva, frasi } from './letturaVolo';
import { mondaiPool } from '$lib/data/esame-n4-prova';

describe('letturaVolo', () => {
	it('divide scena, corpo e domanda', () => {
		const d = dividiTesto('〔メール〕会議[かいぎ]は十時です。 問: 会議は何時ですか。');
		expect(d).toEqual({ scena: 'メール', corpo: '会議[かいぎ]は十時です。', domanda: '会議は何時ですか。' });
		expect(dividiTesto('私は本が好きだ。 問: なぜ?').scena).toBe('');
	});
	it('conta i caratteri senza furigana e calcola i cpm', () => {
		expect(caratteri('会議[かいぎ]は 十時')).toBe(5);
		expect(cpm(120, 60)).toBe(120);
		expect(cpm(10, 0)).toBe(0);
	});
	it('frasi e citazioni', () => {
		expect(frasi('Aです。Bです。／C')).toEqual(['Aです。', 'Bです。', 'C']);
		expect(citazioni('«車より お金が かからないし» e 「運動」')).toEqual(['車より お金が かからないし', '運動']);
	});
	it('citazioni tra parentesi solo se in giapponese', () => {
		expect(citazioni('La fila è lunga (それだけが残念).')).toEqual(['それだけが残念']);
		expect(citazioni('non detto (anzi)')).toEqual([]);
	});
	it('budget: 15 s + testo a 150 car/min, tra 25 s e il ritmo d’esame', () => {
		expect(budgetTesto(150, 200)).toBe(75);
		expect(budgetTesto(10, 200)).toBe(25);
		expect(budgetTesto(1000, 200)).toBe(200);
		expect(budgetTesto(150, 200, 0.75)).toBe(56);
	});
	it('trova la frase con la prova', () => {
		const corpo = '最近、自転車で 通勤する 人が 増えて います。車より お金が かからないし、運動にも なります。私も 二年前から 自転車です。';
		expect(frasePerProva(corpo, '«車より お金が かからないし、運動にも なります».')).toBe(1);
		expect(frasePerProva(corpo, 'nessuna citazione')).toBe(-1);
	});
	it('sul pool reale: ogni testo ha corpo e domanda, e la prova si trova spesso', () => {
		const pool = ['dokkai-tan', 'dokkai-chu', 'joho'].flatMap((s) => mondaiPool(s, { shuffle: false }));
		expect(pool.length).toBeGreaterThanOrEqual(50);
		let trovate = 0;
		for (const q of pool) {
			const d = dividiTesto(q.prompt);
			expect(d.corpo.length, q.prompt).toBeGreaterThan(10);
			expect(d.domanda.length, q.prompt).toBeGreaterThan(1);
			if (frasePerProva(d.corpo, q.perche_giusta) >= 0) trovate++;
		}
		expect(trovate / pool.length).toBeGreaterThan(0.3);
	});
});
