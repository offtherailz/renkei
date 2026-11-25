import { describe, expect, it } from 'vitest';
import { examListeningSegments } from './examListening';

const parlato = (prompt: string) => examListeningSegments(prompt).filter((s) => s.text);

describe('ascolto d’esame: voci dei personaggi', () => {
	it('部長 e 女 parlano con voci diverse e l’etichetta non viene letta', () => {
		const segs = parlato('部長[ぶちょう]:「会議[かいぎ]の 資料[しりょう]、コピーは？」女:「これから します。」部長[ぶちょう]:「コピーは 田中[たなか]さんに 頼[たの]んで。」');
		const battute = segs.filter((s) => s.who !== 'N');
		expect(battute.map((s) => s.who)).toEqual(['M', 'F', 'M']);
		expect(battute.every((s) => !/部長|女:/.test(s.text!))).toBe(true);
	});
	it('etichetta col furigana (女[おんな]:「…」) riconosciuta', () => {
		const battute = parlato('女[おんな]:「おはよう。」男:「おはよう ございます。」').filter((s) => s.who !== 'N');
		expect(battute.map((s) => s.who)).toEqual(['F', 'M']);
	});
	it('due personaggi sconosciuti hanno voci diverse', () => {
		const battute = parlato('田中:「もしもし。」受付:「はい、さくら病院です。」').filter((s) => s.who !== 'N');
		expect(new Set(battute.map((s) => s.who)).size).toBe(2);
	});
	it('il narratore presenta i personaggi col loro nome', () => {
		const n = parlato('部長[ぶちょう]:「コピーは？」女:「します。」').filter((s) => s.who === 'N');
		expect(n[0]?.text).toContain('部長');
	});
});
