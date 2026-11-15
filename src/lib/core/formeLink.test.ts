import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESTINAZIONI, FORME_SENZA_SCHEDA, formaLink, formePerToken } from './formeLink';
import { GRAMMAR_FORMS } from '../data/grammarForms';
import { parseSegmenti } from './tokenizer';

const file = JSON.parse(readFileSync('static/segmenti-n5n4.json', 'utf8'));
const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as { grammar: { id: string }[] };

describe('formeLink', () => {
	it('ogni destinazione esiste davvero (scheda /forme o punto grammaticale del seed)', () => {
		const slug = new Set(GRAMMAR_FORMS.map((f) => f.slug));
		const grammar = new Set(seed.grammar.map((g) => g.id));
		for (const [codice, dest] of Object.entries(DESTINAZIONI)) {
			for (const d of dest) {
				if ('forma' in d) expect(slug.has(d.forma), `${codice} → forma ${d.forma}`).toBe(true);
				else expect(grammar.has(d.grammar), `${codice} → grammar ${d.grammar}`).toBe(true);
			}
		}
	});

	it('ogni codice del file ha una destinazione oppure è dichiarato senza scheda', () => {
		const codici = Object.keys(file.etichette as Record<string, string>);
		const scoperti = codici.filter((c) => !DESTINAZIONI[c] && !FORME_SENZA_SCHEDA.includes(c));
		expect(scoperti).toEqual([]);
		expect(FORME_SENZA_SCHEDA.filter((c) => DESTINAZIONI[c])).toEqual([]);
	});

	it('costruisce i percorsi: scheda composta come àncora, punto grammaticale come dettaglio', () => {
		expect(formaLink('te-iru', { 'te-iru': 'ている' })).toEqual({ codice: 'te-iru', etichetta: 'ている', percorsi: ['forme-composte#te-iru'] });
		expect(formaLink('te-kudasai', {}).percorsi).toEqual(['detail/grammar%3Agrammar-api-N5-68']);
		expect(formaLink('ni-tsuite', { 'ni-tsuite': 'について' }).percorsi).toEqual([]);
	});

	const seg = parseSegmenti({
		frasi: {
			'薬を飲むのをわすれないでください。': ['薬·を|飲む·の·を|わすれ·ない·で|ください·。', { 2: ['nai-de'] }],
			'天気について 話しました。': ['天気·について|話し·まし·た·。', { 0: ['ni-tsuite'], 1: ['mashita'] }]
		}
	});
	const frase = (f: string) => seg.frasi.get(f.replace(/\s+/g, ''))!;
	const codici = (r: ReturnType<typeof formePerToken>) => r.map((fs) => fs.map((f) => f.codice));

	it('token uguali ai pezzi: ogni token prende le forme del suo pezzo', () => {
		const r = formePerToken(['薬を', '飲むのを', 'わすれないで', 'ください。'], frase('薬を飲むのをわすれないでください。'), {});
		expect(codici(r)).toEqual([[], [], ['nai-de'], []]);
	});

	it('pezzi riattaccati in un token solo: il token prende le forme di tutti', () => {
		const r = formePerToken(['薬を', '飲むのを', 'わすれないでください。'], frase('薬を飲むのをわすれないでください。'), {});
		expect(codici(r)[2]).toEqual(['nai-de']);
	});

	it('punteggiatura e code staccate: la forma va all’ultimo token toccabile del pezzo', () => {
		const r = formePerToken(['天気', 'について', ' ', '話しました', '。'], frase('天気について 話しました。'), {}, (t) => /[ぁ-ん一-龯]/.test(t) && t !== 'について');
		expect(codici(r)).toEqual([['ni-tsuite'], [], [], ['mashita'], []]);
	});

	it('token che non ricompongono la frase, o frase fuori catalogo: nessuna forma', () => {
		expect(codici(formePerToken(['天気', '話しました。'], frase('天気について 話しました。'), {}))).toEqual([[], []]);
		expect(codici(formePerToken(['あ', 'い'], null, {}))).toEqual([[], []]);
	});
});
