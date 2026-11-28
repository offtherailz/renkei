import { describe, expect, it } from 'vitest';
import { buildAlVolo, buildAlVoloQueue, soloItaliano, voceAscolto, vociForme } from './listenAlVolo';
import { mondaiPool } from '$lib/data/esame-n4-prova';
import type { VerboFV } from './formeVeloci';

const verbi: VerboFV[] = [
	{ scrittura: '食べる', lettura: 'たべる', cls: 'ichidan', it: 'mangiare' },
	{ scrittura: '飲む', lettura: 'のむ', cls: 'godan', it: 'bere' },
	{ scrittura: '行く', lettura: 'いく', cls: 'godan', it: 'andare' },
	{ scrittura: '書く', lettura: 'かく', cls: 'godan', it: 'scrivere' },
	{ scrittura: '来る', lettura: 'くる', cls: 'irregular', it: 'venire' }
];

describe('soloItaliano', () => {
	it('toglie le citazioni giapponesi e tiene il resto', () => {
		expect(soloItaliano('«やっぱりラーメンにする».')).toBe('');
		expect(soloItaliano('Orario cambiato dopo «でも»: 11時半.')).toBe('');
		expect(soloItaliano('Il latte c’è già → solo le uova.')).toBe('Il latte c’è già, solo le uova.');
		expect(soloItaliano('In mezzo al calcio: «資料はメールで送っといて».')).toBe('In mezzo al calcio.');
		expect(soloItaliano(undefined)).toBe('');
	});
});

describe('voci d’ascolto', () => {
	const pool = [...mondaiPool('kadai', { shuffle: false }), ...mondaiPool('point', { shuffle: false })];
	const voci = pool.map((q) => voceAscolto(q, 'media')).filter((x) => x !== null);
	it('quasi tutti i dialoghi diventano voci', () => {
		expect(voci.length / pool.length).toBeGreaterThan(0.85);
	});
	it('ordine: apertura, «ti chiedono», opzioni, dialogo, pausa, risposta', () => {
		for (const v of voci) {
			const s = v!.steps!;
			const iA = s.findIndex((x) => x.t === 'esame' && x.part === 'apertura');
			const iC = s.findIndex((x) => x.t === 'it' && x.text.startsWith('Ti chiedono'));
			const iO = s.findIndex((x) => x.t === 'ja' && x.text === '1ばん');
			const iD = s.findIndex((x) => x.t === 'esame' && x.part === 'dialogo');
			const iR = s.findIndex((x) => x.t === 'recall');
			expect(iA).toBe(0);
			expect(iA < iC && iC < iO && iO < iD && iD < iR, v!.key).toBe(true);
			// nessun passo italiano con caratteri giapponesi
			for (const x of s) if (x.t === 'it') expect(/[ぁ-んァ-ヶ一-龯]/.test(x.text), x.text).toBe(false);
		}
	});
	it('scarta le opzioni non leggibili (ア/イ, numeri)', () => {
		expect(voceAscolto({ prompt: '〔会話〕女:「A」 男:「B」　問: どれですか。', choices: ['ア', 'イ', 'ウ', 'エ'], correct: 0, perche_giusta: '' }, 'media')).toBeNull();
	});
});

describe('forme e coda', () => {
	it('forma: audio, pausa, verbo, italiano, scomposizione', () => {
		const [v] = vociForme(verbi, 1, 'media');
		const s = v!.steps!;
		expect(s[0]!.t).toBe('ja');
		expect(s[1]!.t).toBe('recall');
		expect(s.filter((x) => x.t === 'ja').length).toBe(5);
	});
	it('blocchi: 2 dialoghi, poi 6 forme, con annuncio', () => {
		const pool = mondaiPool('kadai', { shuffle: false });
		const items = buildAlVolo(pool, verbi, 'media');
		const q = buildAlVoloQueue(items, new Set());
		expect(q[0]!.cat).toBe('volo-ascolto');
		expect(q[0]!.intro).toMatch(/Ascolto/);
		expect(q[2]!.cat).toBe('volo-forme');
		expect(q[2]!.intro).toMatch(/Forme/);
		expect(q[8]!.cat).toBe('volo-ascolto');
	});
});
