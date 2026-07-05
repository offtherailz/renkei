// Letture irregolari di ore, date e durate: le trappole classiche N5.
// Ogni voce ha distrattori pedagogici (le letture "regolari" sbagliate).

export interface TimeReading {
	jp: string;
	hint: string; // disambiguazione mostrata sotto il prompt
	correct: string;
	wrong: string[];
}

export const TIME_READINGS: TimeReading[] = [
	{ jp: '4時', hint: 'le 4 (ora)', correct: 'よじ', wrong: ['よんじ', 'しじ'] },
	{ jp: '7時', hint: 'le 7 (ora)', correct: 'しちじ', wrong: ['なんじ', 'ななじ'] },
	{ jp: '9時', hint: 'le 9 (ora)', correct: 'くじ', wrong: ['きゅうじ', 'くうじ'] },
	{ jp: '1日', hint: 'il primo del mese', correct: 'ついたち', wrong: ['いちにち', 'いちひ'] },
	{ jp: '2日', hint: 'il giorno 2', correct: 'ふつか', wrong: ['ににち', 'にか'] },
	{ jp: '3日', hint: 'il giorno 3', correct: 'みっか', wrong: ['さんにち', 'さんか'] },
	{ jp: '4日', hint: 'il giorno 4', correct: 'よっか', wrong: ['よんにち', 'よんか'] },
	{ jp: '5日', hint: 'il giorno 5', correct: 'いつか', wrong: ['ごにち', 'ごか'] },
	{ jp: '6日', hint: 'il giorno 6', correct: 'むいか', wrong: ['ろくにち', 'ろっか'] },
	{ jp: '7日', hint: 'il giorno 7', correct: 'なのか', wrong: ['しちにち', 'ななか'] },
	{ jp: '8日', hint: 'il giorno 8', correct: 'ようか', wrong: ['はちにち', 'よっか'] },
	{ jp: '9日', hint: 'il giorno 9', correct: 'ここのか', wrong: ['きゅうにち', 'くか'] },
	{ jp: '10日', hint: 'il giorno 10', correct: 'とおか', wrong: ['じゅうにち', 'じゅっか'] },
	{ jp: '14日', hint: 'il giorno 14', correct: 'じゅうよっか', wrong: ['じゅうよんにち', 'じゅうしにち'] },
	{ jp: '20日', hint: 'il giorno 20', correct: 'はつか', wrong: ['にじゅうにち', 'にじゅっか'] },
	{ jp: '1人', hint: 'una persona', correct: 'ひとり', wrong: ['いちにん', 'いちじん'] },
	{ jp: '2人', hint: 'due persone', correct: 'ふたり', wrong: ['ににん', 'ふたにん'] },
	{ jp: '一昨日', hint: "l'altro ieri", correct: 'おととい', wrong: ['いちさくじつ', 'ひとつきのう'] },
	{ jp: '今日', hint: 'oggi', correct: 'きょう', wrong: ['いまひ', 'こんにち'] },
	{ jp: '昨日', hint: 'ieri', correct: 'きのう', wrong: ['さくひ', 'さくにち'] },
	{ jp: '明日', hint: 'domani', correct: 'あした', wrong: ['めいにち', 'あけひ'] },
	{ jp: '今朝', hint: 'stamattina', correct: 'けさ', wrong: ['いまあさ', 'こんちょう'] },
	{ jp: '大人', hint: 'adulto', correct: 'おとな', wrong: ['だいにん', 'おおひと'] }
];

// Le parole del catalogo che fanno da "gancio" per una domanda ora/data.
export function isTimeTriggerWord(scrittura: string): boolean {
	return /[時日月年人朝]/.test(scrittura);
}
