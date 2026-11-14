import { describe, expect, it } from 'vitest';
import { daProva, mondaiDi, proveLibri } from './esame-n4-libri';
import { findMondai } from './esame-n4';

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
	it('ascolto e lettura restano fuori', () => {
		const out = proveLibri([{ ...r('moji', 'ひらがなで', '【a】'), tipo: 'kadai' as never }, r('goi', 'つかいかた', 'るす')]);
		expect(Object.keys(out)).toEqual(['yoho']);
	});
});
