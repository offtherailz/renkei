import { describe, expect, it } from 'vitest';
import {
	ENTRAMBI,
	adattoAlContesto,
	classificaDomanda,
	costruisciRound,
	dividiPrompt,
	segnaliIn,
	soggettoDomanda
} from './contestoAscolto';
import { mondaiPool } from '$lib/data/esame-n4-prova';

describe('classificaDomanda', () => {
	const casi: [string, string][] = [
		['男の人は これから 何を しますか。', 'azione'],
		['子どもは まず 何を しますか。', 'prima'],
		['女の人は はじめに 何を しますか。', 'prima'],
		['客は どう しますか。', 'azione'],
		['学生は いつ 出[だ]しますか。', 'quando'],
		['映画は 何時から 始[はじ]まりますか。', 'quando'],
		['女の人は どこで 待[ま]ちますか。', 'dove'],
		['男の人は なぜ 休みましたか。', 'perche'],
		['どうして 電車は 遅[おく]れて いますか。', 'perche'],
		['男の人は だれと 出かけますか。', 'chi'],
		['客は いくら 払[はら]いますか。', 'prezzo'],
		['客は お弁当を いくつ 買いますか。', 'quanti'],
		['女の人は 駅から どうやって 帰りますか。', 'come'],
		['男の人は 何[なに]を 買[か]いますか。', 'cosa'],
		['客は 何色[なにいろ]の かばんを 買[か]いますか。', 'cosa'],
		['机[つくえ]の 上[うえ]に 置[お]いて いいのは 何[なん]ですか。', 'cosa'],
		['あした 持[も]って こなくても いい ものは どれですか。', 'cosa'],
		['急[いそ]いで いる 人[ひと]は どう すれば いいですか。', 'azione']
	];
	for (const [q, atteso] of casi) it(`${q} → ${atteso}`, () => expect(classificaDomanda(q)).toBe(atteso));
});

describe('soggetto e battute', () => {
	it('separa scena, battute e domanda', () => {
		const d = dividiPrompt('〔会話〕女[おんな]:「卵を 買って きて。」 男[おとこ]:「牛乳は あるよ。」 問: 男の人は 何を 買いますか。');
		expect(d.scena).toBe('会話');
		expect(d.battute.map((b) => b.who)).toEqual(['女', '男']);
		expect(d.domanda).toBe('男の人は 何を 買いますか。');
	});
	it('il soggetto si normalizza sul ruolo del copione', () => {
		expect(soggettoDomanda('男の人は 何を 買いますか。', ['女', '男'])).toBe('男');
		expect(soggettoDomanda('二人[ふたり]は どこで 食べますか。', ['女', '男'])).toBe(ENTRAMBI);
		expect(soggettoDomanda('映画は 何時から 始まりますか。', ['女', '男'])).toBeNull();
	});
	it('trova i segnali di svolta', () => {
		const jp = segnaliIn([{ who: '女', text: 'でも、その前に お皿を 洗う。' }, { who: '男', text: 'じゃあ 卵 だけ。' }]).map((s) => s.jp);
		expect(jp).toEqual(expect.arrayContaining(['でも', 'じゃあ', 'その前に / 先に', '〜だけ']));
	});
});

describe('pool reale (課題理解 + ポイント理解)', () => {
	const pool = [...mondaiPool('kadai', { shuffle: false }), ...mondaiPool('point', { shuffle: false })].filter((q) =>
		adattoAlContesto(q.prompt)
	);
	it('ci sono abbastanza dialoghi per una sessione', () => expect(pool.length).toBeGreaterThanOrEqual(20));
	it('ogni round ha 4 opzioni con dentro il tipo giusto, e il soggetto tra le opzioni', () => {
		for (const q of pool) {
			const r = costruisciRound(q.prompt);
			expect(new Set(r.tipoOpzioni).size, q.prompt).toBe(4);
			expect(r.tipoOpzioni, q.prompt).toContain(r.tipo);
			if (r.chi) expect(r.chiOpzioni, q.prompt).toContain(r.chiCorretta);
		}
	});
	it('la maggior parte delle domande riguarda una persona del dialogo', () => {
		const conChi = pool.filter((q) => costruisciRound(q.prompt).chi !== null).length;
		expect(conChi / pool.length).toBeGreaterThan(0.5);
	});
});
