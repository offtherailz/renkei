// Ricerca in romaji: «setsumei» → せつめい, così si cerca il vocabolario senza
// tastiera giapponese. Hepburn + Kunrei (shi/si, tsu/tu, chi/ti, ja/zya…),
// doppie (kitte → きって), n/nn/n' (ほんや, ほんにゃ…), macron (ō → おう).

const BASE: Record<string, string> = {
	a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
	ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
	ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
	sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
	za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
	ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
	da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
	na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
	ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
	ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
	pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
	ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
	ya: 'や', yu: 'ゆ', yo: 'よ',
	ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
	wa: 'わ', wo: 'を',
	fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
	sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ',
	ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ',
	cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ'
};

// sillabe con yōon: ky/gy/ny/hy/by/py/my/ry + sy/zy/jy/ty/cy (Kunrei/varianti)
const YOUON_STEM: Record<string, string> = {
	ky: 'き', gy: 'ぎ', ny: 'に', hy: 'ひ', by: 'び', py: 'ぴ', my: 'み', ry: 'り',
	sy: 'し', zy: 'じ', jy: 'じ', ty: 'ち', cy: 'ち', dy: 'ぢ'
};
const SMALL_Y: Record<string, string> = { a: 'ゃ', u: 'ゅ', o: 'ょ' };

const MACRON: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ei', ō: 'ou', â: 'aa', î: 'ii', û: 'uu', ê: 'ei', ô: 'ou' };

export function looksLikeRomaji(s: string): boolean {
	return /^[a-zāīūēōâîûêô' -]+$/i.test(s.trim()) && /[a-zāīūēōâîûêô]/i.test(s);
}

// null se il testo non è convertibile per intero (es. parola italiana «casa»
// lo è: かさ — va bene, la ricerca cerca ANCHE nel significato).
export function romajiToHiragana(input: string): string | null {
	const s = input
		.toLowerCase()
		.replace(/[āīūēōâîûêô]/g, (c) => MACRON[c] ?? c)
		.replace(/[\s-]/g, '');
	let out = '';
	let i = 0;
	while (i < s.length) {
		const c = s[i]!;
		if (c === "'") {
			i++;
			continue;
		}
		// n: ん se seguita da consonante (non y), da ' o a fine parola; nn → ん
		if (c === 'n') {
			const next = s[i + 1];
			// konnichiwa: la seconda n apre «ni»; honn' / hon'ya: nn = ん
			if (next === 'n') {
				out += 'ん';
				i += /[aiueoy]/.test(s[i + 2] ?? '') ? 1 : 2;
				continue;
			}
			if (next === undefined || next === "'" || !/[aiueoy]/.test(next)) {
				out += 'ん';
				i += 1;
				continue;
			}
		}
		// doppia consonante → っ (kitte, zasshi, matcha)
		const next = s[i + 1];
		if (/[bcdfghjkmpqrstvwxyz]/.test(c) && (next === c || (c === 't' && next === 'c'))) {
			out += 'っ';
			i += 1;
			continue;
		}
		let matched = false;
		for (const len of [3, 2, 1]) {
			const chunk = s.slice(i, i + len);
			if (chunk.length < len) continue;
			const kana = BASE[chunk];
			if (kana) {
				out += kana;
				i += len;
				matched = true;
				break;
			}
			if (len === 3) {
				const stem = YOUON_STEM[chunk.slice(0, 2)];
				const small = SMALL_Y[chunk[2]!];
				if (stem && small) {
					out += stem + small;
					i += 3;
					matched = true;
					break;
				}
			}
		}
		if (!matched) return null;
	}
	return out;
}

const O_ROW = new Set('おこごそぞとどのほぼぽもよろょを'.split(''));
const U_ROW = new Set('うくぐすずつづぬふぶぷむゆるゅ'.split(''));
const E_ROW = new Set('えけげせぜてでねへべぺめれ'.split(''));
const I_ROW = new Set('いきぎしじちぢにひびぴみり'.split(''));
const A_ROW = new Set('あかがさざただなはばぱまやらわゃ'.split(''));

// Chiave di ricerca tollerante: katakana → hiragana, via ー e le vocali
// lunghe (おう/おお/うう/えい/いい/ああ → vocale breve), così benkyou, benkyoo e
// benkyo trovano tutte べんきょう.
export function kanaSearchKey(kana: string): string {
	const hira = kana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/ー/g, '');
	let out = '';
	for (const ch of hira) {
		const prev = out[out.length - 1];
		if (prev && ch === 'う' && (O_ROW.has(prev) || U_ROW.has(prev))) continue;
		if (prev && ch === 'お' && O_ROW.has(prev)) continue;
		if (prev && ch === 'い' && (E_ROW.has(prev) || I_ROW.has(prev))) continue;
		if (prev && ch === 'あ' && A_ROW.has(prev)) continue;
		out += ch;
	}
	return out;
}

// Chiave della query: se è romaji convertibile, la sua versione in kana.
export function romajiQueryKey(query: string): string | null {
	if (!looksLikeRomaji(query)) return null;
	const kana = romajiToHiragana(query);
	return kana ? kanaSearchKey(kana) : null;
}
