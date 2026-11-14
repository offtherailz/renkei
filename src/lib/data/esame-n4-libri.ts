// Le prove d'esame dei libri (caricate sul dispositivo in db.course_giorno, dal
// file cifrato) anche nella sezione JLPT: ogni domanda scritta va nel 問題 giusto,
// riconosciuto dalla consegna. Ascolto e lettura restano a «Un giorno» (servono
// audio, figure e brani).
import type { CourseGiornoInput } from '$lib/types/models';
import type { PoolItem } from './esame-n4-prova';

type Riga = Pick<CourseGiornoInput, 'id' | 'tipo' | 'titolo' | 'domanda' | 'opzioni' | 'risposta' | 'spiega' | 'completa'>;

// il 問題 dalla consegna (titolo) e dal tipo
export function mondaiDi(r: Pick<Riga, 'tipo' | 'titolo'>): string | null {
	const t = r.titolo ?? '';
	if (r.tipo === 'moji') return t.includes('ひらがな') ? 'kanji-yomi' : t.includes('かきますか') ? 'hyoki' : null;
	if (r.tipo === 'goi') return t.includes('おなじ') ? 'iikae' : t.includes('つかいかた') ? 'yoho' : t.includes('（') ? 'bunmyaku' : null;
	if (r.tipo === 'bunpou') return t.includes('★') ? 'kumitate' : t.includes('（') ? 'bunpo1' : null;
	return null;
}

// 「私が ＿＿ ＿＿ ★ ＿＿ …」 → 「私が ＿① ＿② ★③ ＿④ …」 (il formato dell'app per i 組み立て)
function numeraSpazi(frase: string): string {
	let n = 0;
	const cifre = '①②③④⑤⑥';
	return frase.replace(/＿＿|★/g, (m) => (m === '★' ? '★' : '＿') + cifre[n++]!);
}

export function daProva(r: Riga): { slug: string; item: PoolItem } | null {
	const slug = mondaiDi(r);
	if (!slug || r.opzioni.length < 2 || r.risposta < 0 || r.risposta >= r.opzioni.length) return null;
	const ja = r.domanda.ja.trim();
	const prompt =
		slug === 'yoho' ? `「${ja}」の 正しい 使い方は?` :
		slug === 'iikae' ? `${ja.replace(/[【】]/g, '')} ≒ ?` :
		slug === 'kumitate' ? `★に 入るのは? 「${numeraSpazi(ja)}」` :
		ja;
	return {
		slug,
		item: {
			mondaiSlug: slug,
			prompt,
			choices: r.opzioni.map((o) => o.ja),
			correct: r.risposta,
			perche_giusta: r.spiega ?? '',
			perche_sbagliate: [],
			...(r.domanda.it && slug !== 'yoho' ? { traduzione: r.domanda.it } : {}),
			...(r.completa ? { fraseCompleta: r.completa } : {})
		}
	};
}

// tutte le righe, divise per 問題
export function proveLibri(righe: Riga[]): Record<string, PoolItem[]> {
	const out: Record<string, PoolItem[]> = {};
	for (const r of righe) {
		const x = daProva(r);
		if (x) (out[x.slug] ??= []).push(x.item);
	}
	return out;
}
