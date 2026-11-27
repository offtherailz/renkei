import { describe, expect, it } from 'vitest';
import {
	ENTRAMBI,
	adattoAlContesto,
	classificaDomanda,
	costruisciRound,
	dividiPrompt,
	personeDaScena,
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
		['二人は何で旅行に行きますか。', 'come'],
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

describe('prove reali: persone dalla scena', () => {
	it('XとYが / XがYに', () => {
		expect(personeDaScena('本屋で店の人と女の人が話しています。')).toEqual(['店の人', '女の人']);
		expect(personeDaScena('会社で女の人と男の人が新入社員の歓迎会のことを話しています。')).toEqual(['女の人', '男の人']);
		expect(personeDaScena('男の人が女の人に電話をしています。')).toEqual(['男の人', '女の人']);
		expect(personeDaScena('電話で息子と母親が話しています。')).toEqual(['息子', '母親']);
		expect(personeDaScena('会話')).toEqual([]);
	});
	it('il soggetto della domanda è una delle persone della scena', () => {
		const r = costruisciRound('〔本屋で店の人と女の人が話しています。〕女:「これ、プレゼントです。」 男:「では 紙で 包みます。」　問: 店の人は何を使って絵本を包みますか。');
		expect(r.chi).toBe('店の人');
		expect(r.chiOpzioni).toEqual(['店の人', '女の人', ENTRAMBI]);
	});
	it('monologo: adatto, senza domanda sulla persona', () => {
		const p = '〔先生が来週の試験のことを話しています。〕男:「80ページまでにします。」　問: 試験の問題はどこから出ますか。';
		expect(adattoAlContesto(p)).toBe(true);
		expect(costruisciRound(p).chi).toBeNull();
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

describe('聴解 extra (40 dialoghi con scena)', async () => {
	const { ASCOLTO_EXTRA } = await import('$lib/data/esame-n4-ascolto-extra');
	it('sono 40, id unici, tutti adatti, 4 opzioni', () => {
		expect(ASCOLTO_EXTRA).toHaveLength(40);
		expect(new Set(ASCOLTO_EXTRA.map((i) => i.id)).size).toBe(40);
		for (const i of ASCOLTO_EXTRA) {
			expect(adattoAlContesto(i.prompt), i.id).toBe(true);
			expect(i.choices, i.id).toHaveLength(4);
			expect(new Set(i.choices).size, i.id).toBe(4);
		}
	});
	it('ogni battuta è letta (nessun 「」 perso)', () => {
		for (const i of ASCOLTO_EXTRA) {
			const n = (i.prompt.match(/「/g) ?? []).length;
			expect(dividiPrompt(i.prompt).battute.length, i.id).toBe(n);
		}
	});
	it('se la domanda parla di una persona della scena, «di chi?» la trova', () => {
		let conChi = 0;
		for (const i of ASCOLTO_EXTRA) {
			const r = costruisciRound(i.prompt);
			const persone = personeDaScena(dividiPrompt(i.prompt).scena);
			const sogg = r.domanda.replace(/\[[^\]]*\]/g, '').match(/^([^\sはが、]{1,8})は/)?.[1];
			if (sogg && (persone.includes(sogg) || sogg === '二人')) {
				expect(r.chi, i.id).not.toBeNull();
				conChi++;
			}
		}
		expect(conChi).toBeGreaterThanOrEqual(25);
	});
});
