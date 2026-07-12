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
		expect(lookupToken(map2, 'そのなかで')?.id).not.toBe('中');
	});

	const map3 = mapOf([
		hit('速い', '速い', 'はやい', '形容詞[けいようし]'),
		hit('高い', '高い', 'たかい', '形容詞[けいようし]'),
		hit('走る', '走る', 'はしる', '動詞[どうし]'),
		hit('食べる', '食べる', 'たべる', '動詞[どうし]')
	]);

	it('速く trova 速い (avverbiale); 高かった trova 高い', () => {
		const r = lookupToken(map3, '速く');
		expect(r?.id).toBe('速い');
		expect(r?.forma).toContain('avverbiale');
		expect(lookupToken(map3, '高かった')?.id).toBe('高い');
		expect(lookupToken(map3, '高くない')?.id).toBe('高い');
	});

	it('走れる trova 走る (potenziale); 食べられる trova 食べる', () => {
		const r = lookupToken(map3, '走れる');
		expect(r?.id).toBe('走る');
		expect(r?.forma).toContain('potenziale');
		expect(lookupToken(map3, '食べられる')?.id).toBe('食べる');
	});

	const map4 = mapOf([
		hit('飲む', '飲む', 'のむ', '動詞[どうし]'),
		hit('乾く', '乾く', 'かわく', '動詞[どうし]'),
		hit('川', '川', 'かわ'),
		hit('脱ぐ', '脱ぐ', 'ぬぐ', '動詞[どうし]'),
		hit('住む', '住む', 'すむ', '動詞[どうし]'),
		hit('元気', '元気', 'げんき')
	]);

	it('la punteggiatura attaccata non rompe il match (飲みませんか。)', () => {
		const r = lookupToken(map4, '飲みませんか。');
		expect(r?.id).toBe('飲む');
		expect(r?.forma).toContain('invito');
	});

	it('かわきました。 trova 乾く, non 川', () => {
		expect(lookupToken(map4, 'かわきました。')?.id).toBe('乾く');
	});

	it('composti て+ausiliare: 脱いでください→脱ぐ, 飲んでいます→飲む', () => {
		expect(lookupToken(map4, '脱いでください')?.id).toBe('脱ぐ');
		expect(lookupToken(map4, '飲んでいます')?.id).toBe('飲む');
	});

	it('BudouX incolla です al token precedente: 住みたいです。 trova 住む', () => {
		const r = lookupToken(map4, '住みたいです。');
		expect(r?.id).toBe('住む');
		expect(r?.forma).toContain('desiderativa');
	});

	it('です su nome/aggettivo-な: 元気です。 e 元気でしょうか trovano 元気', () => {
		expect(lookupToken(map4, '元気です。')?.id).toBe('元気');
		expect(lookupToken(map4, '元気でしょうか')?.id).toBe('元気');
	});
});
