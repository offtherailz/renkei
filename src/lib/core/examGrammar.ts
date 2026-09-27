// Rileva i punti grammaticali N4 presenti in una domanda (dal testo + opzioni)
// e propone i link per approfondire/consolidare. Serve a «citare la grammatica
// usata» in ogni domanda, senza doverla taggare a mano item per item.

import { stripFuriganaNotation } from './furigana';

export interface GrammarHit {
	label: string;
	href: string; // relativo, senza base
}

interface Rule {
	re: RegExp;
	label: string;
	href: string;
}

// Ordine: i pattern più specifici prima. href a drill/pagine esistenti.
const RULES: Rule[] = [
	{ re: /より|の?ほうが|いちばん|一番|ほど.*な(い|く)/, label: '⚖️ Comparazioni (より・ほうが)', href: 'comparazioni' },
	{ re: /させられ/, label: '🧩 Causativo-passivo (〜させられる)', href: 'forme-composte' },
	{ re: /(わ|た|ら|が|さ|な|は|ば|ま)せる|させて/, label: '🧩 Causativo (〜させる)', href: 'forme-composte' },
	{ re: /(わ|た|ら|が|さ|な|は|ば|ま)れる|られて|られました/, label: '🧩 Passivo (〜られる)', href: 'forme-composte' },
	{ re: /差し上げ|て(あげ|くれ|もら)|て(いただ|くださ)|お..りし/, label: '🎁 Dare e ricevere (授受)', href: 'esame/gioco/juju' },
	{ re: /召し上が|いらっしゃ|伺(い|う|っ)|ご覧|お.+に な(る|り)|お.+くださ|拝見|申し/, label: '🙇 Keigo', href: 'keigo' },
	{ re: /たら|なら|えば|ければ|んだら/, label: '🔀 Condizionali (と・ば・たら・なら)', href: 'esame/gioco/joken' },
	{ re: /そうだ|そうで|そうに|そうな|ようだ|ように|ような|らしい|みたい/, label: '🎲 Apparenza e supposizione', href: 'certezza' },
	{ re: /なければ|なきゃ|ないと|なくては/, label: '🧩 Dovere (〜なければならない)', href: 'forme-composte' },
	{ re: /て(お|）|く$)|ておく|てある|てしま|ちゃった|じゃった/, label: '🧩 Forme in 〜て (ておく/てある/てしまう)', href: 'forme-composte' },
	{ re: /ている|ています/, label: '🧩 〜ている (stato/azione in corso)', href: 'forme-composte' },
	{ re: /たことがある|た こと が あ/, label: '🧩 Esperienza (〜たことがある)', href: 'forme-composte' },
	{ re: /ながら/, label: '🧩 Azioni contemporanee (〜ながら)', href: 'forme-composte' },
	{ re: /つもり|(よ)?うと 思|意向/, label: '🧩 Intenzione (〜つもり・意向形)', href: 'forme-composte' }
];

export function detectGrammar(texts: string[], max = 3): GrammarHit[] {
	const hay = stripFuriganaNotation(texts.join(' ')).replace(/[\s　]/g, '');
	const out: GrammarHit[] = [];
	const seen = new Set<string>();
	for (const r of RULES) {
		if (out.length >= max) break;
		if (r.re.test(hay) && !seen.has(r.href)) {
			seen.add(r.href);
			out.push({ label: r.label, href: r.href });
		}
	}
	return out;
}
