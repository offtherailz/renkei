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

describe('cosa cogliere', async () => {
	const { noteAltre, spiegaLettura } = await import('./letturaVolo');
	it('note delle altre: scritte se ci sono, altrimenti dal testo', () => {
		const n = noteAltre(['赤', '青', '白', '黒'], 0, ['', 'nota scritta', ''], '青は ありますが、赤は 売り切れです。');
		expect(n.map((x) => x.scelta)).toEqual(['青', '白', '黒']);
		expect(n[0]!.nelTesto).toBe(false); // un solo carattere: non si giudica
		expect(n[1]!.nota).toBe('nota scritta');
		expect(n[2]!.nota).toBe('non compare nel testo');
		const m = noteAltre(['電車', 'バス'], 0, [], 'バスは 遅れて います。電車で 行きます。');
		expect(m[0]!.nelTesto).toBe(true);
		expect(m[0]!.nota).toMatch(/trappola/);
	});
	it('spiega: tipo, frase chiave anche senza citazione, segnali', () => {
		const corpo = '会議は 月曜日の 予定でしたが、水曜日に 変わりました。場所は 二階です。';
		const s = spiegaLettura(corpo, '会議は いつですか。', ['水曜日', '月曜日', '火曜日', '金曜日'], 0, 'Spostata.', []);
		expect(s.tipo).toBe('quando');
		expect(s.chiave).toBe(0);
		expect(s.altre[0]!.nelTesto).toBe(true); // 月曜日: detto ma cambiato
		expect(s.segnali.map((x) => x.jp)).toContain('変更 / 変わり / 予定でした');
	});
	it('sul pool reale la frase chiave si trova nella maggior parte dei testi', () => {
		const pool = ['dokkai-tan', 'dokkai-chu', 'joho'].flatMap((sl) => mondaiPool(sl, { shuffle: false }));
		const trovate = pool.filter((q) => {
			const d = dividiTesto(q.prompt);
			return spiegaLettura(d.corpo, d.domanda, q.choices, q.correct, q.perche_giusta, q.perche_sbagliate).chiave >= 0;
		}).length;
		expect(trovate / pool.length).toBeGreaterThan(0.6);
	});
});
