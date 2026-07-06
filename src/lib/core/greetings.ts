// Quiz "Saluti e convenevoli" (挨拶): dato uno stimolo — una frase a cui
// rispondere o una situazione — scegli la formula idiomatica giusta.
// Separato dall'avventura konbini (che ci si appoggerà per il saluto).

export interface Greeting {
	ja?: string; // frase dell'interlocutore (se assente è una "situazione")
	it: string; // glossa/contesto in italiano
	correct: string;
}

export const GREETINGS: Greeting[] = [
	// risposte a una frase
	{ ja: 'いってきます', it: '«Esco!» (chi esce di casa)', correct: 'いってらっしゃい' },
	{ ja: 'いってらっしゃい', it: '«Vai pure!» (chi resta a casa)', correct: 'いってきます' },
	{ ja: 'ただいま', it: '«Sono a casa!»', correct: 'おかえりなさい' },
	{ ja: 'おかえりなさい', it: '«Bentornato!»', correct: 'ただいま' },
	{ ja: 'ありがとうございます', it: '«Grazie»', correct: 'どういたしまして' },
	{ ja: 'すみません', it: '«Scusa»', correct: 'だいじょうぶです' },
	{ ja: 'はじめまして', it: '«Piacere di conoscerti»', correct: 'よろしくおねがいします' },
	{ ja: 'よろしくおねがいします', it: '«Conto su di te»', correct: 'こちらこそ' },
	{ ja: 'おつかれさまです', it: '«Buon lavoro» (fine giornata)', correct: 'おつかれさまでした' },
	{ ja: 'おめでとうございます', it: '«Congratulazioni!»', correct: 'ありがとうございます' },
	{ ja: 'おやすみなさい', it: '«Buonanotte»', correct: 'おやすみなさい' },
	// situazioni (nessuna frase: devi tu iniziare)
	{ it: 'Stai per iniziare a mangiare', correct: 'いただきます' },
	{ it: 'Hai finito di mangiare', correct: 'ごちそうさまでした' },
	{ it: 'Esci di casa', correct: 'いってきます' },
	{ it: 'Torni a casa', correct: 'ただいま' },
	{ it: 'Vai a dormire', correct: 'おやすみなさい' },
	{ it: 'Saluti qualcuno la mattina', correct: 'おはようございます' },
	{ it: 'Saluti qualcuno di sera', correct: 'こんばんは' },
	{ it: 'Te ne vai prima dei colleghi', correct: 'おさきにしつれいします' }
];

// Pool di risposte plausibili per i distrattori.
const ANSWER_POOL = [
	...new Set(GREETINGS.map((g) => g.correct)),
	'こんにちは',
	'さようなら',
	'おはよう',
	'すみません'
];

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

export interface GreetingQuestion {
	ja?: string;
	it: string;
	correct: string;
	choices: string[];
}

export function generateGreeting(): GreetingQuestion {
	const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!;
	const distractors = shuffle(ANSWER_POOL.filter((a) => a !== g.correct)).slice(0, 3);
	return { ja: g.ja, it: g.it, correct: g.correct, choices: shuffle([g.correct, ...distractors]) };
}
