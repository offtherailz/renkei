import { describe, expect, it } from 'vitest';
import { lookupToken, type WordHit } from './wordLookup';

const hit = (id: string, scrittura: string, lettura: string, tipo = '名詞[めいし]'): WordHit => ({
	id, scrittura, lettura, tipo_jp: tipo, livello_jlpt: 'N5', significato: id
});

function mapOf(hits: WordHit[]): Map<string, WordHit> {
	const m = new Map<string, WordHit>();
	for (const h of hits) {
		if (!m.has(h.scrittura)) m.set(h.scrittura, h);
		if (!m.has(h.lettura)) m.set(h.lettura, h);
	}
	return m;
}

describe('lookupToken', () => {
	const map = mapOf([
		hit('する', 'する', 'する', '動詞[どうし]'),
		hit('島', '島', 'しま'),
		hit('別', '別', 'べつ'),
		hit('食べる', '食べる', 'たべる', '動詞[どうし]'),
		hit('行く', '行く', 'いく', '動詞[どうし]'),
		hit('勉強する', '勉強する', 'べんきょうする', '動詞[どうし]')
	]);

	it('しましょう trova する (non 島)', () => {
		const r = lookupToken(map, 'しましょう');
		expect(r?.id).toBe('する');
		expect(r?.forma).toContain('ましょう');
	});

	it('食べました trova 食べる', () => {
		expect(lookupToken(map, '食べました')?.id).toBe('食べる');
	});

	it('行って trova 行く', () => {
		expect(lookupToken(map, '行って')?.id).toBe('行く');
	});

	it('勉強しました trova 勉強する', () => {
		expect(lookupToken(map, '勉強しました')?.id).toBe('勉強する');
	});

	it('また別の trova 別 (kanji singolo interno)', () => {
		expect(lookupToken(map, 'また別の')?.id).toBe('別');
	});

	const map2 = mapOf([
		hit('踊る', '踊る', 'おどる', '動詞[どうし]'),
		hit('中', '中', 'なか'),
		hit('飲む', '飲む', 'のむ', '動詞[どうし]'),
		hit('食べる', '食べる', 'たべる', '動詞[どうし]')
	]);

	it('踊らなかったの trova 踊る (non 中)', () => {
		const r = lookupToken(map2, '踊らなかったの');
		expect(r?.id).toBe('踊る');
		expect(r?.forma).toContain('なかった');
	});

	it('飲みたい trova 飲む; 食べない trova 食べる', () => {
		expect(lookupToken(map2, '飲みたい')?.id).toBe('飲む');
		expect(lookupToken(map2, '食べない')?.id).toBe('食べる');
	});

	it('le sottostringhe kana interne non pescano parole a caso', () => {
		// なんとなく contiene なか? no — usa ぶんなかろ: contiene なか ma non è 中
		expect(lookupToken(map2, 'そのなかで')?.id).not.toBe('中');
	});
});
