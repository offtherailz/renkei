import { describe, expect, it } from 'vitest';
import { daProva, mondaiDi, proveLibri } from './esame-n4-libri';
import { findMondai } from './esame-n4';
import { examListeningSegments } from '$lib/core/examListening';

const r = (tipo: 'moji' | 'goi' | 'bunpou', titolo: string, ja: string, extra = {}) => ({
	id: 'x', tipo, titolo, domanda: { ja, it: 'traduzione' }, opzioni: [{ ja: 'a', it: '' }, { ja: 'b', it: '' }, { ja: 'c', it: '' }, { ja: 'd', it: '' }], risposta: 2, ...extra
});

describe('prove dei libri nella sezione JLPT', () => {
	it('ogni consegna va nel suo 問題 (e il 問題 esiste)', () => {
		const casi: [ReturnType<typeof r>, string][] = [
			[r('moji', '＿＿の ことばは ひらがなで どう かきますか。', '今日は【楽しかった】ですね。'), 'kanji-yomi'],
			[r('moji', '＿＿の ことばは どう かきますか。', '【あつい】です。'), 'hyoki'],
			[r('goi', '（　）に なにを いれますか。', 'にもつは もう（　）できましたか。'), 'bunmyaku'],
			[r('goi', '＿＿の ぶんと だいたい おなじ いみの ぶんは どれですか。', '【バスが しゅっぱつしました】。'), 'iikae'],
			[r('goi', 'つぎの ことばの つかいかたで いちばん いい ものは どれですか。', 'るす'), 'yoho'],
			[r('bunpou', '（　）に 何を 入れますか。', '5分（　）かかりません。'), 'bunpo1'],
			[r('bunpou', '★に 入る ものは どれですか。', '私が ＿＿ ＿＿ ★ ＿＿ 大きな マンションが たって います。'), 'kumitate']
		];
		for (const [riga, slug] of casi) {
			expect(mondaiDi(riga)).toBe(slug);
			expect(findMondai(slug)).not.toBeNull();
		}
	});
	it('il formato delle domande come quelle dell’app', () => {
		expect(daProva(r('goi', 'つかいかた', 'るす'))!.item.prompt).toBe('「るす」の 正しい 使い方は?');
		expect(daProva(r('goi', 'おなじ いみ', '【バスが しゅっぱつしました】。'))!.item.prompt).toBe('バスが しゅっぱつしました。 ≒ ?');
		expect(daProva(r('bunpou', '★に 入る', '私が ＿＿ ＿＿ ★ ＿＿ たって います。'))!.item.prompt).toBe('★に 入るのは? 「私が ＿① ＿② ★③ ＿④ たって います。」');
		const q = daProva(r('moji', 'ひらがなで', '【楽しかった】', { spiega: 'perché' }))!.item;
		expect(q.correct).toBe(2);
		expect(q.perche_giusta).toBe('perché');
		expect(q.traduzione).toBe('traduzione');
	});
	it('ascolto: copione a voci per examListening, col disegno', () => {
		const kadai = {
			id: 'k', tipo: 'kadai' as const, titolo: '', immagine: 'data:image/png;base64,xx',
			righe: [
				{ who: 'N' as const, ja: '店で話しています。何を買いますか。', it: '' },
				{ who: 'F' as const, ja: '「りんご」をください。', it: 'Mele, per favore.' },
				{ who: 'M' as const, ja: 'はい。', it: 'Sì.' },
				{ who: 'N' as const, ja: '何を買いますか。', it: '' }
			],
			domanda: { ja: '何を買いますか。', it: 'Cosa compra?' },
			opzioni: [{ ja: 'a', it: '' }, { ja: 'b', it: '' }], risposta: 1
		};
		const q = daProva(kadai)!;
		expect(q.slug).toBe('kadai');
		expect(q.item.prompt).toBe('〔店で話しています。〕女:「『りんご』をください。」 男:「はい。」　問: 何を買いますか。');
		expect(q.item.immagine).toBe('data:image/png;base64,xx');
		const segs = examListeningSegments(q.item.prompt).filter((x) => x.text).map((x) => `${x.who}:${x.text}`);
		expect(segs).toEqual(['N:店で話しています。', 'N:何を買いますか。', 'F:『りんご』をください。', 'M:はい。', 'N:何を買いますか。']);
		const soku = daProva({ ...kadai, tipo: 'sokuji', righe: [{ who: 'M', ja: 'もう出ましたか。', it: '' }] })!;
		expect([soku.slug, soku.item.prompt]).toEqual(['sokuji', 'もう出ましたか。']);
	});
	it('lettura: 文章の文法 col buco, brani lunghi a 中文, volantini a 情報検索', () => {
		const brano = (formato: 'tema' | 'volantino', titolo = '', domanda = '（21）に 何を 入れますか。') => ({
			id: 'd', fonte: 'libro', tipo: 'dokkai' as const, titolo, righe: [],
			testo: { titolo: 'T', ja: 'A（21）B（22）C', it: '', formato },
			domanda: { ja: domanda, it: '' }, opzioni: [{ ja: 'a', it: '' }, { ja: 'b', it: '' }], risposta: 0
		});
		expect(daProva(brano('tema', '文章の文法'))!.item.prompt).toBe('A＿＿B（22）C');
		expect(daProva(brano('tema'), 1)!.slug).toBe('dokkai-tan');
		expect(daProva(brano('tema'), 4)!.slug).toBe('dokkai-chu');
		expect(daProva(brano('volantino'))!.slug).toBe('joho');
		const out = proveLibri([brano('tema', '', 'q1'), brano('tema', '', 'q2'), brano('tema', '', 'q3')]);
		expect(out['dokkai-chu']).toHaveLength(3);
	});
});
