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

const GODAN_E: Record<string, string> = {
	う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ'
};

const GODAN_O: Record<string, string> = {
	う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ'
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

// Tabella completa delle coniugazioni per la scheda del verbo.
export function buildVerbTable(dictionary: string, verbClass: VerbClass): ConjugationForm[] | null {
	const basic = conjugateVerb(dictionary, verbClass);
	if (!basic) return null;
	const byKey = Object.fromEntries(basic.map((f) => [f.key, f.value]));
	const naiStem = byKey.nai!.slice(0, -2); // senza ない
	const masuStem = byKey.masu!.slice(0, -2); // senza ます
	const te = byKey.te!;
	const ta = byKey.ta!;

	let potential = '';
	let volitional = '';
	let ba = '';
	let imperative = '';
	let passive = '';
	let causative = '';

	if (verbClass === 'irregular') {
		if (dictionary.endsWith('する')) {
			const stem = dictionary.slice(0, -2);
			potential = `${stem}できる`;
			volitional = `${stem}しよう`;
			ba = `${stem}すれば`;
			imperative = `${stem}しろ`;
			passive = `${stem}される`;
			causative = `${stem}させる`;
		} else {
			// 来る / くる
			const kanji = dictionary.endsWith('来る');
			const stem = dictionary.slice(0, -2);
			const k = (kana: string) => (kanji ? `${stem}来${kana}` : `${stem}こ${kana}`);
			potential = k('られる');
			volitional = k('よう');
			ba = kanji ? `${stem}来れば` : `${stem}くれば`;
			imperative = kanji ? `${stem}来い` : `${stem}こい`;
			passive = k('られる');
			causative = k('させる');
		}
	} else if (verbClass === 'ichidan') {
		const stem = dictionary.slice(0, -1);
		potential = `${stem}られる`;
		volitional = `${stem}よう`;
		ba = `${stem}れば`;
		imperative = `${stem}ろ`;
		passive = `${stem}られる`;
		causative = `${stem}させる`;
	} else {
		const last = dictionary.slice(-1);
		const stem = dictionary.slice(0, -1);
		potential = `${stem}${GODAN_E[last]}る`;
		volitional = `${stem}${GODAN_O[last]}う`;
		ba = `${stem}${GODAN_E[last]}ば`;
		imperative = `${stem}${GODAN_E[last]}`;
		passive = `${naiStem}れる`;
		causative = `${naiStem}せる`;
	}

	return [
		{ key: 'dict', label: 'Forma dizionario (辞書形)', value: dictionary },
		{ key: 'masu', label: 'Cortese (ます形)', value: byKey.masu! },
		{ key: 'nai', label: 'Negativa (ない形)', value: byKey.nai! },
		{ key: 'ta', label: 'Passato (た形)', value: ta },
		{ key: 'nakatta', label: 'Passato negativo (なかった形)', value: `${naiStem}なかった` },
		{ key: 'te', label: 'Forma て (て形)', value: te },
		{ key: 'tai', label: 'Desiderativa (たい形)', value: `${masuStem}たい` },
		{ key: 'potential', label: 'Potenziale (可能形)', value: potential },
		{ key: 'volitional', label: 'Volitiva (意向形)', value: volitional },
		{ key: 'ba', label: 'Condizionale (ば形)', value: ba },
		{ key: 'tara', label: 'Condizionale (たら形)', value: `${ta}ら` },
		{ key: 'imperative', label: 'Imperativa (命令形)', value: imperative },
		{ key: 'passive', label: 'Passiva (受身形)', value: passive },
		{ key: 'causative', label: 'Causativa (使役形)', value: causative },
		{ key: 'teiru', label: 'Progressiva (ている形)', value: `${te}いる` }
	];
}

export function buildAdjectiveTable(dictionary: string, type: AdjectiveType): ConjugationForm[] | null {
	const basic = conjugateAdjective(dictionary, type);
	if (!basic) return null;
	const byKey = Object.fromEntries(basic.map((f) => [f.key, f.value]));

	if (type === 'i') {
		const isIi = dictionary === 'いい' || dictionary === '良い';
		const stem = isIi ? 'よ' : dictionary.slice(0, -1);
		return [
			{ key: 'dict', label: 'Forma base', value: dictionary },
			{ key: 'neg', label: 'Negativa (〜くない)', value: byKey.neg! },
			{ key: 'past', label: 'Passato (〜かった)', value: byKey.past! },
			{ key: 'pastneg', label: 'Passato negativo (〜くなかった)', value: byKey.pastneg! },
			{ key: 'te', label: 'Forma て (〜くて)', value: `${stem}くて` },
			{ key: 'adv', label: 'Avverbiale (〜く)', value: byKey.adv! },
			{ key: 'ba', label: 'Condizionale (〜ければ)', value: `${stem}ければ` },
			{ key: 'naru', label: 'Diventare (〜くなる)', value: `${stem}くなる` }
		];
	}
	return [
		{ key: 'dict', label: 'Forma base', value: dictionary },
		{ key: 'attr', label: 'Davanti a un nome (〜な)', value: byKey.attr! },
		{ key: 'neg', label: 'Negativa (〜じゃない)', value: byKey.neg! },
		{ key: 'past', label: 'Passato (〜だった)', value: byKey.past! },
		{ key: 'pastneg', label: 'Passato negativo (〜じゃなかった)', value: byKey.pastneg! },
		{ key: 'te', label: 'Forma て (〜で)', value: `${dictionary}で` },
		{ key: 'adv', label: 'Avverbiale (〜に)', value: `${dictionary}に` },
		{ key: 'nara', label: 'Condizionale (〜なら)', value: `${dictionary}なら` },
		{ key: 'naru', label: 'Diventare (〜になる)', value: `${dictionary}になる` }
	];
}

export function buildConjugationTable(word: Word): ConjugationForm[] {
	if (word.tipo_jp.startsWith('動詞')) {
		const verbClass = detectVerbClass(word);
		return (verbClass && buildVerbTable(word.scrittura, verbClass)) || [];
	}
	if (word.tipo_jp.startsWith('形容詞')) {
		const type = detectAdjectiveType(word);
		return (type && buildAdjectiveTable(word.scrittura, type)) || [];
	}
	return [];
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

// Catalogo forme per la checklist "forme che conosco" nelle impostazioni.
export interface DrillFormMeta {
	key: string;
	label: string;
	category: 'verb' | 'adjective';
}

export const DRILL_FORMS: DrillFormMeta[] = [
	{ key: 'masu', label: 'Cortese (ます形)', category: 'verb' },
	{ key: 'nai', label: 'Negativa (ない形)', category: 'verb' },
	{ key: 'ta', label: 'Passato (た形)', category: 'verb' },
	{ key: 'nakatta', label: 'Passato negativo (なかった形)', category: 'verb' },
	{ key: 'te', label: 'Forma て (て形)', category: 'verb' },
	{ key: 'tai', label: 'Desiderativa (たい形)', category: 'verb' },
	{ key: 'potential', label: 'Potenziale (可能形)', category: 'verb' },
	{ key: 'volitional', label: 'Volitiva (意向形)', category: 'verb' },
	{ key: 'ba', label: 'Condizionale (ば形)', category: 'verb' },
	{ key: 'tara', label: 'Condizionale (たら形)', category: 'verb' },
	{ key: 'imperative', label: 'Imperativa (命令形)', category: 'verb' },
	{ key: 'passive', label: 'Passiva (受身形)', category: 'verb' },
	{ key: 'causative', label: 'Causativa (使役形)', category: 'verb' },
	{ key: 'teiru', label: 'Progressiva (ている形)', category: 'verb' },
	{ key: 'neg', label: 'Agg. negativo (〜くない/じゃない)', category: 'adjective' },
	{ key: 'past', label: 'Agg. passato (〜かった/だった)', category: 'adjective' },
	{ key: 'pastneg', label: 'Agg. passato negativo', category: 'adjective' },
	{ key: 'adv', label: 'Avverbiale (〜く/に)', category: 'adjective' },
	{ key: 'attr', label: 'Attributiva (〜な)', category: 'adjective' },
	{ key: 'adj-te', label: 'Agg. forma て (〜くて/で)', category: 'adjective' },
	{ key: 'adj-ba', label: 'Agg. condizionale (〜ければ/なら)', category: 'adjective' },
	{ key: 'naru', label: 'Diventare (〜くなる/になる)', category: 'adjective' }
];

// Default: le forme base N5.
export const DEFAULT_KNOWN_FORMS = ['masu', 'nai', 'ta', 'te', 'neg', 'past', 'pastneg', 'adv', 'attr'];

// Le chiavi degli aggettivi te/ba/nara nella tabella si chiamano te/ba/nara:
// nella checklist sono raggruppate come adj-te / adj-ba.
function adjectiveKeyAllowed(key: string, allowed: Set<string>): boolean {
	if (key === 'te') return allowed.has('adj-te');
	if (key === 'ba' || key === 'nara') return allowed.has('adj-ba');
	return allowed.has(key);
}

// Distrattori pedagogici: la stessa forma generata con le regole
// delle altre classi (l'errore tipico di chi studia).
export function buildVerbQuestions(word: Word, allowed?: Set<string>): ConjugationQuestion[] {
	const verbClass = detectVerbClass(word);
	if (!verbClass) return [];
	const table = buildVerbTable(word.scrittura, verbClass);
	if (!table) return [];

	const otherClasses: VerbClass[] = (['godan', 'ichidan', 'irregular'] as VerbClass[]).filter(
		(c) => c !== verbClass
	);
	const otherTables = otherClasses
		.map((c) => buildVerbTable(word.scrittura, c))
		.filter((t): t is ConjugationForm[] => t !== null);

	return table
		.filter((form) => form.key !== 'dict')
		.filter((form) => !allowed || allowed.has(form.key))
		.map((form) => {
			const wrong: (string | undefined)[] = [
				...otherTables.map((t) => t.find((f) => f.key === form.key)?.value),
				// errore comune: attaccare la desinenza alla forma dizionario
				form.key === 'masu' ? `${word.scrittura}ます` : undefined,
				form.key === 'nai' ? `${word.scrittura}ない` : undefined,
				// riempitivi: altre forme dello stesso verbo
				...table.filter((f) => f.key !== form.key && f.key !== 'dict').map((f) => f.value)
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

export function buildAdjectiveQuestions(word: Word, allowed?: Set<string>): ConjugationQuestion[] {
	const type = detectAdjectiveType(word);
	if (!type) return [];
	const table = buildAdjectiveTable(word.scrittura, type);
	if (!table) return [];

	const other: AdjectiveType = type === 'i' ? 'na' : 'i';
	const otherTable = buildAdjectiveTable(word.scrittura, other) ?? [];

	return table
		.filter((form) => form.key !== 'dict')
		.filter((form) => !allowed || adjectiveKeyAllowed(form.key, allowed))
		.map((form) => {
			// errori tipici incrociati い/な: per gli aggettivi-な che finiscono
			// per davvero in い (きれい, 嫌い...) il classico errore da
			// studente è trattarli come aggettivi-い e togliere quella い
			// (きれくない). Per tutti gli altri (必要, 静か, 元気...) non c'è
			// nessuna い da togliere: troncare comunque l'ultimo carattere
			// produceva robaccia (必要→必くない). Lì il vero errore tipico è
			// attaccare くない senza togliere nulla (必要くない).
			const naMistakeNegative = word.scrittura.endsWith('い')
				? `${word.scrittura.slice(0, -1)}くない`
				: `${word.scrittura}くない`;
			const wrong: (string | undefined)[] = [
				otherTable.find((f) => f.key === form.key)?.value,
				type === 'i' ? `${word.scrittura}じゃない` : naMistakeNegative,
				type === 'i' ? `${word.scrittura}だった` : `${word.scrittura}かった`,
				...table.filter((f) => f.key !== form.key && f.key !== 'dict').map((f) => f.value)
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

export function buildConjugationQuestions(word: Word, allowed?: Set<string>): ConjugationQuestion[] {
	const build = (filter?: Set<string>) =>
		word.tipo_jp.startsWith('動詞')
			? buildVerbQuestions(word, filter)
			: word.tipo_jp.startsWith('形容詞')
				? buildAdjectiveQuestions(word, filter)
				: [];

	const questions = build(allowed);
	// se il filtro svuota tutto (checklist troppo stretta), ricadi sulle forme base
	if (questions.length === 0 && allowed) {
		return build(new Set(DEFAULT_KNOWN_FORMS));
	}
	return questions;
}

// Le 7 forme composte più utili collegate alla scheda del verbo (stesse
// mostrate come link a /forme): calcolate DAL VERBO stesso — l'esercizio
// chiede davvero "食べる → 食べてみる", non un altro verbo a caso preso dal
// catalogo grammaticale generico.
export interface ComposedForm {
	slug: string;
	label: string;
	value: string;
	// errore tipico da usare come distrattore pedagogico (suffisso attaccato
	// alla forma dizionario invece che alla forma て/volitiva)
	commonMistake?: string;
}

export function buildComposedForms(dictionary: string, verbClass: VerbClass): ComposedForm[] | null {
	const table = buildVerbTable(dictionary, verbClass);
	if (!table) return null;
	const byKey = Object.fromEntries(table.map((f) => [f.key, f.value]));
	const te = byKey.te;
	const volitional = byKey.volitional;
	const teiru = byKey.teiru;
	const masu = byKey.masu;
	if (!te || !volitional || !teiru || !masu) return null;
	const masuStem = masu.slice(0, -2);

	const teForms: [string, string, string][] = [
		['te-miru', '〜てみる (provare a)', 'みる'],
		['te-oku', '〜ておく (fare in anticipo)', 'おく'],
		['te-shimau', '〜てしまう (finire di / per sbaglio)', 'しまう']
	];

	return [
		...teForms.map(([slug, label, suffix]) => ({
			slug: slug!,
			label: label!,
			value: `${te}${suffix}`,
			commonMistake: `${dictionary}${suffix}`
		})),
		{ slug: 'te-iru', label: '〜ている (azione in corso)', value: teiru, commonMistake: `${dictionary}いる` },
		{ slug: 'to-omou', label: '〜(よ)うと思う (penso di)', value: `${volitional}と思う` },
		{ slug: 'you-volitiva', label: '意向形 〜よう (facciamo/proviamo)', value: volitional },
		{ slug: 'sou-apparenza', label: '〜そう (sembra che)', value: `${masuStem}そう`, commonMistake: `${dictionary}そう` }
	];
}

export function buildComposedFormQuestions(word: Word): ConjugationQuestion[] {
	const verbClass = detectVerbClass(word);
	if (!verbClass) return [];
	const forms = buildComposedForms(word.scrittura, verbClass);
	if (!forms) return [];
	return forms.map((form) => {
		const wrong: (string | undefined)[] = [
			form.commonMistake,
			...forms.filter((f) => f.slug !== form.slug).map((f) => f.value)
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
