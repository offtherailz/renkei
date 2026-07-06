// Letture di numero+contatore: parsing delle letture irregolari dal catalogo
// e generazione di distrattori pedagogici (le varianti di rendaku sbagliate:
// さんぼん → さんほん/さんぽん è l'errore tipico).

import type { Counter } from '../types/models';

export interface CounterReading {
	num: number;
	reading: string;
}

const READING_ENTRY_REGEX = /([ぁ-んァ-ヶー]+)\s*[（(](\d+)/g;

export function parseIrregularReadings(counter: Counter): CounterReading[] {
	const source = counter.letture_irregolari ?? '';
	const result: CounterReading[] = [];
	for (const match of source.matchAll(READING_ENTRY_REGEX)) {
		result.push({ reading: match[1]!, num: Number(match[2]) });
	}
	return result;
}

// famiglie di voicing: base ↔ dakuten ↔ handakuten
const VOICING_FAMILIES: string[][] = [
	['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'], ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ'],
	['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'],
	['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'],
	['た', 'だ'], ['ち', 'ぢ'], ['つ', 'づ'], ['て', 'で'], ['と', 'ど']
];

const FAMILY_BY_KANA = new Map<string, string[]>();
for (const family of VOICING_FAMILIES) {
	for (const kana of family) FAMILY_BY_KANA.set(kana, family);
}

// Varianti della lettura con il voicing sbagliato. Il rendaku colpisce
// tipicamente la sillaba iniziale del contatore (ほん→ぼん→ぽん), quindi
// si cerca prima un kana della famiglia は/ば/ぱ partendo dal fondo;
// solo in mancanza si ripiega sulle altre famiglie.
const H_ROW = new Set(['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']);

export function voicingVariants(reading: string): string[] {
	const chars = [...reading];
	const passes: ((kana: string) => boolean)[] = [
		(kana) => H_ROW.has(kana),
		(kana) => FAMILY_BY_KANA.has(kana)
	];
	for (const matches of passes) {
		for (let i = chars.length - 1; i >= 0; i -= 1) {
			if (!matches(chars[i]!)) continue;
			const family = FAMILY_BY_KANA.get(chars[i]!);
			if (!family) continue;
			return family
				.filter((kana) => kana !== chars[i])
				.map((kana) => [...chars.slice(0, i), kana, ...chars.slice(i + 1)].join(''));
		}
	}
	return [];
}

export const NUMBER_READINGS: Record<number, string> = {
	1: 'いち', 2: 'に', 3: 'さん', 4: 'よん', 5: 'ご',
	6: 'ろく', 7: 'なな', 8: 'はち', 9: 'きゅう', 10: 'じゅう', 20: 'にじゅう'
};

// La concatenazione ingenua numero+contatore (さん+ほん = さんほん):
// altro errore classico, ottimo distrattore quando differisce dal corretto.
export function naiveReading(num: number, counter: Counter): string | null {
	const numReading = NUMBER_READINGS[num];
	if (!numReading) return null;
	return `${numReading}${counter.lettura}`;
}

// Lettura corretta di num+contatore: usa l'irregolare dal catalogo se c'è
// (さんびき per 3匹), altrimenti la concatenazione regolare (にひき per 2匹).
export function readCounterN(counter: Counter, num: number): string | null {
	const hit = parseIrregularReadings(counter).find((p) => p.num === num);
	if (hit) return hit.reading;
	return naiveReading(num, counter);
}
