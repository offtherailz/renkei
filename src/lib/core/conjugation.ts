// Coniugatore per il drill: forme base di verbi (ます/ない/た/て) e
// aggettivi (negativo/passato/passato negativo). Lavora sulla scrittura,
// che nei verbi in forma dizionario termina sempre con un kana della riga -u.

import type { Word } from '../types/models';

export interface ConjugationForm {
	key: string;
	label: string; // etichetta mostrata nel prompt, es. "forma ます"
	value: string;
}

const GODAN_MASU: Record<string, string> = {
	う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り'
};

const GODAN_NAI: Record<string, string> = {
	う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら'
};

function godanTe(stem: string, last: string, dictionary: string): string {
	if (dictionary.endsWith('行く') || dictionary === '行く' || dictionary === 'いく') {
		return `${stem}って`;
	}
	if (last === 'う' || last === 'つ' || last === 'る') return `${stem}って`;
	if (last === 'む' || last === 'ぶ' || last === 'ぬ') return `${stem}んで`;
	if (last === 'く') return `${stem}いて`;
	if (last === 'ぐ') return `${stem}いで`;
	return `${stem}して`; // す
}

function teToTa(te: string): string {
	if (te.endsWith('で')) return `${te.slice(0, -1)}だ`;
	return `${te.slice(0, -1)}た`;
}

export type VerbClass = 'godan' | 'ichidan' | 'irregular';

export function detectVerbClass(word: Word): VerbClass | null {
	const classe = word.classe_verbo_jp ?? '';
	if (classe.startsWith('五段')) return 'godan';
	if (classe.startsWith('一段')) return 'ichidan';
	if (classe.startsWith('不規則')) return 'irregular';
	return null;
}

export function conjugateVerb(dictionary: string, verbClass: VerbClass): ConjugationForm[] | null {
	// Irregolari: する, 来る e composti in する.
	if (verbClass === 'irregular') {
		if (dictionary.endsWith('する')) {
			const stem = dictionary.slice(0, -2);
			return [
				{ key: 'masu', label: 'forma ます', value: `${stem}します` },
				{ key: 'nai', label: 'forma ない', value: `${stem}しない` },
				{ key: 'ta', label: 'forma た (passato)', value: `${stem}した` },
				{ key: 'te', label: 'forma て', value: `${stem}して` }
			];
		}
		if (dictionary.endsWith('来る') || dictionary === 'くる') {
			const stem = dictionary.slice(0, -2);
			const kanji = dictionary.endsWith('来る');
			return [
				{ key: 'masu', label: 'forma ます', value: kanji ? `${stem}来ます` : `${stem}きます` },
				{ key: 'nai', label: 'forma ない', value: kanji ? `${stem}来ない` : `${stem}こない` },
				{ key: 'ta', label: 'forma た (passato)', value: kanji ? `${stem}来た` : `${stem}きた` },
				{ key: 'te', label: 'forma て', value: kanji ? `${stem}来て` : `${stem}きて` }
			];
		}
		return null;
	}

	const last = dictionary.slice(-1);
	const stem = dictionary.slice(0, -1);

	if (verbClass === 'ichidan') {
		if (last !== 'る') return null;
		return [
			{ key: 'masu', label: 'forma ます', value: `${stem}ます` },
			{ key: 'nai', label: 'forma ない', value: `${stem}ない` },
			{ key: 'ta', label: 'forma た (passato)', value: `${stem}た` },
			{ key: 'te', label: 'forma て', value: `${stem}て` }
		];
	}

	if (!(last in GODAN_MASU)) return null;
	const te = godanTe(stem, last, dictionary);
	return [
		{ key: 'masu', label: 'forma ます', value: `${stem}${GODAN_MASU[last]}ます` },
		{ key: 'nai', label: 'forma ない', value: last === 'う' ? `${stem}わない` : `${stem}${GODAN_NAI[last]}ない` },
		{ key: 'ta', label: 'forma た (passato)', value: teToTa(te) },
		{ key: 'te', label: 'forma て', value: te }
	];
}

export type AdjectiveType = 'i' | 'na';

export function detectAdjectiveType(word: Word): AdjectiveType | null {
	const tipo = word.tipo_aggettivo_jp ?? '';
	if (tipo.startsWith('い形容詞')) return 'i';
	if (tipo.startsWith('な形容詞')) return 'na';
	return null;
}

export function conjugateAdjective(dictionary: string, type: AdjectiveType): ConjugationForm[] | null {
	if (type === 'i') {
		if (!dictionary.endsWith('い')) return null;
		// いい è irregolare: usa la radice よ.
		const isIi = dictionary === 'いい' || dictionary === '良い';
		const stem = isIi ? 'よ' : dictionary.slice(0, -1);
		return [
			{ key: 'neg', label: 'negativo (〜くない)', value: `${stem}くない` },
			{ key: 'past', label: 'passato (〜かった)', value: `${stem}かった` },
			{ key: 'pastneg', label: 'passato negativo (〜くなかった)', value: `${stem}くなかった` },
			{ key: 'adv', label: 'forma avverbiale (〜く)', value: `${stem}く` }
		];
	}
	return [
		{ key: 'neg', label: 'negativo (〜じゃない)', value: `${dictionary}じゃない` },
		{ key: 'past', label: 'passato (〜だった)', value: `${dictionary}だった` },
		{ key: 'pastneg', label: 'passato negativo (〜じゃなかった)', value: `${dictionary}じゃなかった` },
		{ key: 'attr', label: 'davanti a un nome (〜な)', value: `${dictionary}な` }
	];
}

export interface ConjugationQuestion {
	prompt: string; // es. "forma て"
	dictionary: string;
	correct: string;
	choices: string[]; // 4, mescolate a cura del chiamante
}

function uniqueNonEmpty(values: (string | null | undefined)[], correct: string): string[] {
	return [...new Set(values)].filter((v): v is string => Boolean(v) && v !== correct);
}

// Distrattori pedagogici: la stessa forma generata con le regole
// delle altre classi (l'errore tipico di chi studia).
export function buildVerbQuestions(word: Word): ConjugationQuestion[] {
	const verbClass = detectVerbClass(word);
	if (!verbClass) return [];
	const correctForms = conjugateVerb(word.scrittura, verbClass);
	if (!correctForms) return [];

	const otherClasses: VerbClass[] = (['godan', 'ichidan', 'irregular'] as VerbClass[]).filter(
		(c) => c !== verbClass
	);

	return correctForms.map((form) => {
		const wrong: (string | undefined)[] = [
			...otherClasses.map((c) => conjugateVerb(word.scrittura, c)?.find((f) => f.key === form.key)?.value),
			// errore comune: attaccare la desinenza alla forma dizionario
			form.key === 'masu' ? `${word.scrittura}ます` : undefined,
			form.key === 'nai' ? `${word.scrittura}ない` : undefined,
			form.key === 'te' ? `${word.scrittura.slice(0, -1)}て` : undefined,
			form.key === 'ta' ? `${word.scrittura.slice(0, -1)}た` : undefined
		];
		const distractors = uniqueNonEmpty(wrong, form.value).slice(0, 3);
		return {
			prompt: form.label,
			dictionary: word.scrittura,
			correct: form.value,
			choices: [form.value, ...distractors]
		};
	});
}

export function buildAdjectiveQuestions(word: Word): ConjugationQuestion[] {
	const type = detectAdjectiveType(word);
	if (!type) return [];
	const correctForms = conjugateAdjective(word.scrittura, type);
	if (!correctForms) return [];

	const other: AdjectiveType = type === 'i' ? 'na' : 'i';

	return correctForms.map((form) => {
		const wrong = [
			conjugateAdjective(word.scrittura, other)?.find((f) => f.key === form.key)?.value,
			// errori tipici incrociati い/な
			type === 'i' ? `${word.scrittura}じゃない` : `${word.scrittura.slice(0, -1)}くない`,
			type === 'i' ? `${word.scrittura}だった` : `${word.scrittura}かった`
		];
		const distractors = uniqueNonEmpty(wrong, form.value).slice(0, 3);
		return {
			prompt: form.label,
			dictionary: word.scrittura,
			correct: form.value,
			choices: [form.value, ...distractors]
		};
	});
}

export function buildConjugationQuestions(word: Word): ConjugationQuestion[] {
	if (word.tipo_jp.startsWith('動詞')) return buildVerbQuestions(word);
	if (word.tipo_jp.startsWith('形容詞')) return buildAdjectiveQuestions(word);
	return [];
}
