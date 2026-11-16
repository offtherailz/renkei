// Le prove d'esame dei libri (caricate sul dispositivo in db.course_giorno, dal
// file cifrato) anche nella sezione JLPT: ogni domanda scritta va nel 問題 giusto,
// riconosciuto dalla consegna. Anche ascolto (dialogo a voci, disegno del foglio)
// e lettura (brano + domanda), come le domande d'ascolto e lettura dell'app.
import type { CourseGiornoInput } from '$lib/types/models';
import type { PoolItem } from './esame-n4-prova';

type Riga = Pick<CourseGiornoInput, 'id' | 'tipo' | 'titolo' | 'domanda' | 'opzioni' | 'risposta' | 'spiega' | 'completa'> &
	Partial<Pick<CourseGiornoInput, 'fonte' | 'righe' | 'testo' | 'immagine'>>;

// il 問題 dalla consegna (titolo) e dal tipo. `perBrano` = quante domande ha il
// brano della riga (読解: 4 domande sullo stesso tema = 中文, 1-2 = 短文).
export function mondaiDi(r: Pick<Riga, 'tipo' | 'titolo' | 'testo'>, perBrano = 1): string | null {
	const t = r.titolo ?? '';
	if (r.tipo === 'kadai' || r.tipo === 'point' || r.tipo === 'hatsuwa' || r.tipo === 'sokuji') return r.tipo;
	if (r.tipo === 'dokkai') {
		if (t === '文章の文法') return 'bunsho-bunpo';
		if (!r.testo) return null;
		if (r.testo.formato === 'volantino') return 'joho';
		return r.testo.formato === 'tema' && perBrano >= 3 ? 'dokkai-chu' : 'dokkai-tan';
	}
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

// le virgolette dentro una battuta chiuderebbero il «女:「…」» del copione
const battuta = (ja: string) => ja.trim().replace(/「/g, '『').replace(/」/g, '』');

// Copione d'ascolto nel formato delle domande dell'app (letto da examListening):
// 〔scena〕女:「…」 男:「…」 問: domanda. La prima riga del narratore è scena +
// domanda; la domanda si toglie dalla scena (la ripete già 問).
function copione(r: Riga): string {
	const righe = r.righe ?? [];
	const domanda = r.domanda.ja.trim();
	const n = righe.filter((x) => x.who === 'N');
	let scena = n[0]?.ja.trim() ?? '';
	if (scena.endsWith(domanda)) scena = scena.slice(0, -domanda.length).trim();
	const dialogo = righe
		.filter((x, i) => !(x.who === 'N' && (i === 0 || i === righe.length - 1)))
		.map((x) => `${x.who === 'M' ? '男' : x.who === 'F' ? '女' : 'アナウンス'}:「${battuta(x.ja)}」`)
		.join(' ');
	return `${scena ? `〔${scena}〕` : ''}${dialogo}　問: ${domanda}`;
}

function promptAscoltoLettura(slug: string, r: Riga): string | null {
	const righe = r.righe ?? [];
	if (slug === 'hatsuwa') return righe[0]?.ja.trim() || null; // la situazione
	if (slug === 'sokuji') return righe[0] ? battuta(righe[0].ja) : null; // la battuta
	if (slug === 'kadai' || slug === 'point') return righe.length ? copione(r) : null;
	if (!r.testo) return null;
	if (slug === 'bunsho-bunpo') {
		// lo spazio chiesto diventa ＿＿, gli altri restano numerati
		const n = r.domanda.ja.match(/[（(](\d+)[）)]/)?.[1];
		return n ? r.testo.ja.replace(new RegExp(`[（(]${n}[）)]`), '＿＿') : null;
	}
	return `〔${r.testo.titolo}〕${r.testo.ja}　問: ${r.domanda.ja.trim()}`;
}

const ASCOLTO_LETTURA = new Set(['kadai', 'point', 'hatsuwa', 'sokuji', 'bunsho-bunpo', 'joho', 'dokkai-tan', 'dokkai-chu']);

export function daProva(r: Riga, perBrano = 1): { slug: string; item: PoolItem } | null {
	const slug = mondaiDi(r, perBrano);
	if (!slug || r.opzioni.length < 2 || r.risposta < 0 || r.risposta >= r.opzioni.length) return null;
	if (ASCOLTO_LETTURA.has(slug)) {
		const prompt = promptAscoltoLettura(slug, r);
		if (!prompt) return null;
		const dialogo = (r.righe ?? []).filter((x) => x.who !== 'N').map((x) => x.it).filter(Boolean);
		const traduzione = slug === 'kadai' || slug === 'point' ? [r.domanda.it, ...dialogo].join(' / ') : r.domanda.it;
		return {
			slug,
			item: {
				mondaiSlug: slug,
				prompt,
				choices: r.opzioni.map((o) => o.ja),
				correct: r.risposta,
				perche_giusta: r.spiega ?? '',
				perche_sbagliate: [],
				...(traduzione ? { traduzione } : {}),
				...(r.immagine ? { immagine: r.immagine } : {}),
				...(r.completa ? { fraseCompleta: r.completa } : {})
			}
		};
	}
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
	const brano = (r: Riga) => (r.testo ? `${r.fonte ?? ''}|${r.testo.titolo}` : '');
	const perBrano = new Map<string, number>();
	for (const r of righe) if (r.testo) perBrano.set(brano(r), (perBrano.get(brano(r)) ?? 0) + 1);
	for (const r of righe) {
		const x = daProva(r, perBrano.get(brano(r)) ?? 1);
		if (x) (out[x.slug] ??= []).push(x.item);
	}
	return out;
}
