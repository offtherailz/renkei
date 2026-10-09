import { describe, expect, it } from 'vitest';
import { lookupToken, mergeAuxTokens, mergeByDictionary, type WordHit } from './wordLookup';

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

	const map3b = mapOf([
		hit('急ぐ', '急ぐ', 'いそぐ', '動詞[どうし]'),
		hit('急', '急', 'きゅう', '形容詞[けいようし]'),
		hit('食べる', '食べる', 'たべる', '動詞[どうし]'),
		hit('帰る', '帰る', 'かえる', '動詞[どうし]')
	]);

	it('急げば trova 急ぐ (condizionale), non 急 (aggettivo-な)', () => {
		const r = lookupToken(map3b, '急げば');
		expect(r?.id).toBe('急ぐ');
		expect(r?.forma).toContain('condizionale');
	});

	it('食べれば trova 食べる (ichidan); 帰れば trova 帰る (godan る)', () => {
		expect(lookupToken(map3b, '食べれば')?.id).toBe('食べる');
		expect(lookupToken(map3b, '帰れば')?.id).toBe('帰る');
	});

	const map4 = mapOf([
		hit('飲む', '飲む', 'のむ', '動詞[どうし]'),
		hit('乾く', '乾く', 'かわく', '動詞[どうし]'),
		hit('川', '川', 'かわ'),
		hit('脱ぐ', '脱ぐ', 'ぬぐ', '動詞[どうし]'),
		hit('住む', '住む', 'すむ', '動詞[どうし]'),
		hit('元気', '元気', 'げんき'),
		hit('点く', '点く', 'つく', '動詞[どうし]')
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

	it('idioma 嘘をつく: つかないでください non trova 点く (senso sbagliato)', () => {
		// 点く è "accendersi/illuminarsi": qui つく è l'idioma "dire una bugia",
		// non a catalogo — meglio nessun match che uno fuorviante.
		expect(lookupToken(map4, 'つかないでください', 'うそを')).toBeNull();
		expect(lookupToken(map4, 'ついちゃ', 'うそを')).toBeNull();
	});

	it('senza il contesto dell\'idioma つく trova comunque 点く (elettricità)', () => {
		expect(lookupToken(map4, 'つきました', '電気が')?.id).toBe('点く');
	});

	const map5 = mapOf([
		hit('呼ぶ', '呼ぶ', 'よぶ', '動詞[どうし]'),
		hit('読む', '読む', 'よむ', '動詞[どうし]'),
		hit('時', '時', 'とき'),
		hit('食べる', '食べる', 'たべる', '動詞[どうし]')
	]);

	it('nome/nominalizzatore incollato: 呼びたいとき→呼ぶ, 読むこと→読む', () => {
		expect(lookupToken(map5, '呼びたいとき')?.id).toBe('呼ぶ');
		expect(lookupToken(map5, '読むこと')?.id).toBe('読む');
	});

	it('とき da solo (kana) trova 時 via lettura', () => {
		expect(lookupToken(map5, 'とき')?.id).toBe('時');
	});

	// BudouX stacca ます: senza merge, 働き matcha il NOME invece del verbo 働く.
	it('mergeAuxTokens riattacca gli ausiliari (働き+ます→働きます)', () => {
		expect(mergeAuxTokens(['夜', 'だけ', '働き', 'ます', '。'])).toEqual(['夜', 'だけ', '働きます', '。']);
		expect(mergeAuxTokens(['食べ', 'たい'])).toEqual(['食べたい']);
	});

	const map6 = mapOf([
		hit('働く', '働く', 'はたらく', '動詞[どうし]'),
		hit('働き', '働き', 'はたらき', '名詞[めいし]')
	]);
	it('働きます (dopo merge) risolve al verbo 働く, non al nome 働き', () => {
		expect(lookupToken(map6, '働きます')?.id).toBe('働く');
	});

	// BudouX spezza le parole composte: mergeByDictionary le riunisce se esistono.
	it('mergeByDictionary riunisce i composti spezzati (一生+懸命→一生懸命)', () => {
		const known = new Set(['一生懸命', '自動車', '勉強']);
		const has = (s: string) => known.has(s);
		expect(mergeByDictionary(['一生', '懸命', 'に', '勉強'], has)).toEqual(['一生懸命', 'に', '勉強']);
		expect(mergeByDictionary(['自動', '車', 'で'], has)).toEqual(['自動車', 'で']);
		// non unisce se il risultato non è noto
		expect(mergeByDictionary(['私', 'は'], has)).toEqual(['私', 'は']);
		// preferisce la forma più lunga nota
		expect(mergeByDictionary(['一生', '懸命'], (s) => s === '一生懸命' || s === '一生')).toEqual(['一生懸命']);
	});
});
