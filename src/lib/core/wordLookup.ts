// Indice condiviso scrittura/lettura → info parola, per il lookup rapido nelle
// frasi interattive. Caricato una volta da Dexie, cache in memoria.

import { db } from '../db/schema';

export interface WordHit {
	id: string;
	scrittura: string;
	lettura: string;
	tipo_jp: string;
	livello_jlpt: string;
	significato: string; // primo significato nella lingua utente
	forma?: string; // se il token era coniugato: etichetta della forma trovata
}

let index: Map<string, WordHit> | null = null;
let building: Promise<Map<string, WordHit>> | null = null;

export async function ensureWordIndex(locale: 'it' | 'en' = 'it'): Promise<Map<string, WordHit>> {
	if (index) return index;
	if (building) return building;
	building = (async () => {
		const rows = await db.words.toArray();
		const map = new Map<string, WordHit>();
		for (const w of rows) {
			const gloss = (locale === 'it' ? w.significato.it : w.significato.en) ?? w.significato.it ?? [];
			const hit: WordHit = {
				id: w.id,
				scrittura: w.scrittura,
				lettura: w.lettura,
				tipo_jp: w.tipo_jp,
				livello_jlpt: w.livello_jlpt,
				significato: gloss[0] ?? ''
			};
			// la scrittura vince sulla lettura in caso di collisione
			if (!map.has(w.scrittura)) map.set(w.scrittura, hit);
			if (!map.has(w.lettura)) map.set(w.lettura, hit);
		}
		index = map;
		return map;
	})();
	return building;
}

const HAS_KANJI = /[一-龯々]/;

// Riporta l'ultimo kana dello stem alla riga う (godan): 書き→書く, 飲み→飲む.
const GODAN_BACK: Record<string, string> = {
	い: 'う', き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', ひ: 'ふ', び: 'ぶ', み: 'む', り: 'る'
};

// Riga あ → う per lo stem negativo (godan): 踊ら→踊る, 飲ま→飲む, 買わ→買う.
const GODAN_NEG_BACK: Record<string, string> = {
	わ: 'う', か: 'く', が: 'ぐ', さ: 'す', た: 'つ', な: 'ぬ', ば: 'ぶ', ま: 'む', ら: 'る'
};

// Candidati al dizionario da uno stem in ます (連用形): 食べ→食べる, 飲み→飲む.
function fromMasuStem(stem: string): string[] {
	const out: string[] = [];
	if (stem === 'し') out.push('する');
	if (stem === 'き' || stem === '来') out.push('くる', '来る');
	if (stem.endsWith('し')) out.push(stem.slice(0, -1) + 'する');
	out.push(stem + 'る');
	const last = stem[stem.length - 1]!;
	if (GODAN_BACK[last]) out.push(stem.slice(0, -1) + GODAN_BACK[last]);
	return out;
}

// Candidati da uno stem negativo (未然形): 踊ら→踊る, 食べ→食べる, し→する.
function fromNaiStem(stem: string): string[] {
	const out: string[] = [];
	if (stem === 'し') out.push('する');
	if (stem === 'こ' || stem === '来') out.push('くる', '来る');
	if (stem.endsWith('し')) out.push(stem.slice(0, -1) + 'する');
	out.push(stem + 'る'); // ichidan: 食べ→食べる
	const last = stem[stem.length - 1]!;
	if (GODAN_NEG_BACK[last]) out.push(stem.slice(0, -1) + GODAN_NEG_BACK[last]);
	return out;
}

// Desinenze cortesi/te/ta → candidati alla forma del dizionario, con
// l'etichetta della forma (così il popup può spiegarla).
function deconjugate(t: string): { candidates: string[]; forma: string }[] {
	const out: { candidates: string[]; forma: string }[] = [];
	const masuForms: [string, string][] = [
		['ましょうか', 'proposta cortese (〜ましょうか)'],
		['ましょう', 'volitiva cortese (〜ましょう)'],
		['ませんでした', 'negativa passata cortese (〜ませんでした)'],
		['ました', 'passato cortese (〜ました)'],
		['ません', 'negativa cortese (〜ません)'],
		['ます', 'cortese (〜ます)']
	];
	for (const [suffix, forma] of masuForms) {
		if (!t.endsWith(suffix)) continue;
		const stem = t.slice(0, -suffix.length);
		if (!stem) continue;
		out.push({ candidates: fromMasuStem(stem), forma });
	}
	// forme piane: negativa (踊らない/踊らなかった) e desiderativa (飲みたい)
	const naiForms: [string, string][] = [
		['なかったら', 'condizionale negativa (〜なかったら)'],
		['なかった', 'negativa passata (〜なかった)'],
		['なくて', 'negativa in て (〜なくて)'],
		['ないで', 'negativa in で (〜ないで)'],
		['ない', 'negativa (〜ない)']
	];
	for (const [suffix, forma] of naiForms) {
		if (!t.endsWith(suffix)) continue;
		const stem = t.slice(0, -suffix.length);
		if (!stem) continue;
		out.push({ candidates: fromNaiStem(stem), forma });
	}
	const taiForms: [string, string][] = [
		['たかった', 'desiderativa passata (〜たかった)'],
		['たくない', 'desiderativa negativa (〜たくない)'],
		['たい', 'desiderativa (〜たい)']
	];
	for (const [suffix, forma] of taiForms) {
		if (!t.endsWith(suffix)) continue;
		const stem = t.slice(0, -suffix.length);
		if (!stem) continue;
		out.push({ candidates: fromMasuStem(stem), forma });
	}
	const FORMA_TETA = 'forma in て/た';
	const end2 = t.slice(-2);
	const base2 = t.slice(0, -2);
	if (end2 === 'して' || end2 === 'した') {
		out.push({ candidates: [base2 + 'する', base2 + 'す', 'する'], forma: FORMA_TETA });
	} else if (end2 === 'きて' || end2 === 'きた') {
		out.push({ candidates: ['くる', '来る', base2 + 'く'], forma: FORMA_TETA });
	} else if (end2 === 'って' || end2 === 'った') {
		const cands = [base2 + 'う', base2 + 'つ', base2 + 'る'];
		if (base2 === '行' || base2 === 'い') cands.unshift('行く', 'いく');
		out.push({ candidates: cands, forma: FORMA_TETA });
	} else if (end2 === 'んで' || end2 === 'んだ') {
		out.push({ candidates: [base2 + 'ぬ', base2 + 'ぶ', base2 + 'む'], forma: FORMA_TETA });
	} else if (end2 === 'いて' || end2 === 'いた') {
		out.push({ candidates: [base2 + 'く'], forma: FORMA_TETA });
	} else if (end2 === 'いで' || end2 === 'いだ') {
		out.push({ candidates: [base2 + 'ぐ'], forma: FORMA_TETA });
	} else if ((t.endsWith('て') || t.endsWith('た')) && t.length >= 2) {
		out.push({ candidates: [t.slice(0, -1) + 'る'], forma: FORMA_TETA }); // ichidan
	}
	return out;
}

// Cerca il token: match esatto → de-coniugazione (しましょう→する) →
// prefisso più lungo → qualunque sottostringa con kanji (また別の→別).
export function lookupToken(map: Map<string, WordHit>, token: string): WordHit | null {
	const t = token.trim();
	if (!t) return null;
	// varianti da provare: il token e il token senza particelle finali
	// (踊らなかったの → 踊らなかった)
	const bare = t.replace(/(かな|よね|[のねよかわ])$/, '');
	const forms = bare.length >= 2 && bare !== t ? [t, bare] : [t];
	for (const f of forms) {
		if (map.has(f)) return map.get(f)!;
	}
	// forme coniugate: prova i candidati al dizionario prima dei prefissi,
	// così しましょう trova する (non 島) e 踊らなかったの trova 踊る (non 中).
	for (const f of forms) {
		for (const { candidates, forma } of deconjugate(f)) {
			for (const c of candidates) {
				const hit = map.get(c);
				if (hit && hit.tipo_jp.startsWith('動詞')) return { ...hit, forma };
				if (hit && c.endsWith('する')) return { ...hit, forma };
			}
		}
	}
	for (let end = t.length - 1; end >= 2; end -= 1) {
		const sub = t.slice(0, end);
		if (map.has(sub)) return map.get(sub)!;
	}
	// parole interne SOLO con kanji (また別の → 別): le sottostringhe di soli
	// kana pescano parole a caso (なか di 踊らなかった ≠ 中).
	for (let len = t.length - 1; len >= 1; len -= 1) {
		for (let start = 0; start + len <= t.length; start += 1) {
			const sub = t.slice(start, start + len);
			if (!HAS_KANJI.test(sub)) continue;
			if (map.has(sub)) return map.get(sub)!;
		}
	}
	return null;
}

export function jishoUrl(q: string): string {
	return `https://jisho.org/search/${encodeURIComponent(q)}`;
}
