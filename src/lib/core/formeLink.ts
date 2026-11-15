// Forme grammaticali riconosciute nelle frasi (codici di
// scripts/segmenta-frasi.mjs) → dove si studiano: una scheda di /forme o
// /forme-composte (slug) oppure un punto grammaticale del seed (id).
// Si linka solo a quello che esiste: un codice senza destinazione mostra
// l'etichetta e basta, ed è il segnale che il punto manca a catalogo
// (elenco in FORME_SENZA_SCHEDA, tenuto allineato dal test).

import { formPath } from '../data/grammarForms';
import type { FraseSegmentata } from './tokenizer';

type Destinazione = { forma: string } | { grammar: string };

export const DESTINAZIONI: Record<string, Destinazione[]> = {
	te: [{ grammar: 'grammar-api-N4-2' }],
	'te-iru': [{ forma: 'te-iru' }],
	'te-kudasai': [{ grammar: 'grammar-api-N5-68' }],
	'te-miru': [{ forma: 'te-miru' }],
	'te-oku': [{ forma: 'te-oku' }],
	'te-shimau': [{ forma: 'te-shimau' }],
	'te-aru': [{ grammar: 'grammar-api-N5-65' }],
	'te-ageru': [{ grammar: 'grammar-api-N4-6' }],
	'te-kureru': [{ grammar: 'grammar-api-N4-7' }],
	'te-morau': [{ grammar: 'grammar-api-N4-8' }],
	'te-itadaku': [{ grammar: 'g-n4-te-itadaku' }],
	'te-yaru': [{ grammar: 'g-n4-te-yaru' }],
	'te-kuru': [{ grammar: 'grammar-api-N4-76' }],
	'te-wa-ikenai': [{ forma: 'te-wa-ikenai' }],
	'te-mo-ii': [{ forma: 'te-mo-ii' }],
	'te-mo': [{ grammar: 'grammar-api-N4-50' }],
	'te-kara': [{ grammar: 'grammar-api-N5-67' }],
	'nai-de': [{ grammar: 'grammar-api-N5-38' }],
	nakereba: [{ forma: 'nakereba' }],
	'zu-ni': [{ grammar: 'g-n4-zuni' }],
	mashou: [{ grammar: 'grammar-api-N5-32' }],
	tara: [{ forma: 'tara' }],
	ba: [{ forma: 'ba' }],
	nara: [{ forma: 'nara' }],
	tai: [{ forma: 'tai' }],
	volitivo: [{ forma: 'you-volitiva' }],
	darou: [{ forma: 'deshou' }],
	passivo: [{ forma: 'ukemi' }],
	'passivo-potenziale': [{ forma: 'ukemi' }, { forma: 'kanou' }],
	potenziale: [{ forma: 'kanou' }],
	causativo: [{ forma: 'shieki' }],
	imperativo: [{ grammar: 'grammar-api-N4-11' }],
	nasai: [{ forma: 'nasai' }],
	nagara: [{ forma: 'nagara' }],
	tari: [{ grammar: 'grammar-api-N5-64' }],
	sou: [{ forma: 'sou-apparenza' }],
	you: [{ grammar: 'grammar-api-N4-52' }],
	'you-ni': [{ grammar: 'grammar-api-N4-67' }],
	'n-desu': [{ grammar: 'grammar-api-N4-3' }],
	rashii: [{ forma: 'rashii' }],
	yasui: [{ forma: 'yasui-nikui' }],
	nikui: [{ forma: 'yasui-nikui' }],
	sugiru: [{ forma: 'sugiru' }],
	kamoshirenai: [{ forma: 'kamoshirenai' }],
	tsumori: [{ forma: 'tsumori' }],
	hazu: [{ forma: 'hazu' }],
	'to-iu': [{ grammar: 'grammar-api-N4-23' }]
};

// Riconosciute ma senza scheda né punto grammaticale a catalogo.
export const FORME_SENZA_SCHEDA = [
	'te-aux', 'te-iku', 'te-wa', 'masu', 'mashita', 'masen', 'deshita', 'nai', 'zu', 'ta',
	'ni-tsuite', 'ni-yotte', 'ni-totte', 'to-shite', 'ni-taishite'
];

export interface FormaLink {
	codice: string;
	etichetta: string;
	// percorsi senza base (es. "forme-composte#te-iru", "detail/grammar%3A…"); vuoto = punto mancante
	percorsi: string[];
}

function percorso(d: Destinazione): string {
	return 'forma' in d ? formPath(d.forma) : `detail/${encodeURIComponent(`grammar:${d.grammar}`)}`;
}

export function formaLink(codice: string, etichette: Record<string, string>): FormaLink {
	return { codice, etichetta: etichette[codice] ?? codice, percorsi: (DESTINAZIONI[codice] ?? []).map(percorso) };
}

// Forme di ogni token di una frase a catalogo. I token dell'app possono non
// coincidere coi pezzi salvati (ausiliari riattaccati, code e punteggiatura
// staccate): le forme di un pezzo vanno all'ultimo token toccabile che lo
// tocca — le forme stanno in coda al pezzo (食べ|ています|。).
const GIAPPONESE = /[ぁ-んァ-ヶ一-龯々]/;
export function formePerToken(
	tokens: string[],
	frase: FraseSegmentata | null,
	etichette: Record<string, string>,
	toccabile: (token: string) => boolean = (t) => GIAPPONESE.test(t)
): FormaLink[][] {
	const out: FormaLink[][] = tokens.map(() => []);
	if (!frase) return out;
	const senzaSpazi = (s: string): string => s.replace(/[\s\u3000\u200B]+/g, '');
	const estremi: [number, number][] = [];
	let cursore = 0;
	for (const t of tokens) {
		const lung = senzaSpazi(t).length;
		estremi.push([cursore, cursore + lung]);
		cursore += lung;
	}
	let pos = 0;
	const codiciPerToken = tokens.map(() => new Set<string>());
	frase.pezzi.forEach((p, i) => {
		const da = pos;
		const a = pos + senzaSpazi(p).length;
		pos = a;
		const forme = frase.forme[i] ?? [];
		if (forme.length === 0) return;
		for (let k = tokens.length - 1; k >= 0; k -= 1) {
			const [td, ta] = estremi[k]!;
			if (ta > td && td < a && ta > da && toccabile(tokens[k]!)) {
				forme.forEach((c) => codiciPerToken[k]!.add(c));
				break;
			}
		}
	});
	// i token non ricompongono la frase salvata: niente forme piuttosto che forme sbagliate
	if (cursore !== pos) return out;
	return codiciPerToken.map((set) => [...set].map((c) => formaLink(c, etichette)));
}
