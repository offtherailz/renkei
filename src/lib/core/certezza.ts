// Gioco «Quanto sei sicuro?» (beta): le sfumature d'incertezza/certezza
// giapponesi — でしょう, かもしれない, かな, はず, そう(様態), らしい, みたい,
// っぽい, に違いない — spesso tradotte tutte con «forse/sembra» in italiano,
// ma la differenza sta nella FONTE della certezza (previsione propria,
// possibilità debole, pensiero interiore, deduzione logica, sentito dire,
// impressione sensoriale, tratto caratteriale, certezza forte).
//
// Ogni situazione fissa una base condivisa e presenta 4 costruzioni diverse
// sulla stessa frase: solo una si adatta al contesto dato, le altre sono
// grammaticalmente valide ma sbagliate per QUELLA fonte di certezza — il
// punto didattico è il contrasto, non l'errore grammaticale.

export type CertaintySlug =
	| 'deshou'
	| 'kamoshirenai'
	| 'kana'
	| 'hazu'
	| 'sou-apparenza'
	| 'rashii'
	| 'mitai'
	| 'ppoi'
	| 'nichigainai';

export interface CertaintyOption {
	jp: string;
	read: string;
	correct: boolean;
	reason?: string; // perché è sbagliata qui (mostrato solo se scelta)
}

export interface CertaintySituation {
	slug: CertaintySlug;
	contextIt: string; // la situazione, in italiano — fissa la fonte di certezza
	options: CertaintyOption[]; // 1 corretta + 3 distrattori, stesso significato di base
	revealIt: string; // traduzione della frase corretta
}

function ok(jp: string, read: string): CertaintyOption {
	return { jp, read, correct: true };
}
function bad(jp: string, read: string, reason: string): CertaintyOption {
	return { jp, read, correct: false, reason };
}

export const SITUATIONS: CertaintySituation[] = [
	{
		slug: 'deshou',
		contextIt: 'Sei un meteorologo in TV: dai la tua previsione ufficiale per domani.',
		options: [
			ok('明日は晴れるでしょう。', 'あしたははれるでしょう。'),
			bad('明日は晴れるかもしれない。', 'あしたははれるかもしれない。', 'troppo debole per un bollettino ufficiale: un meteorologo dà una previsione con fiducia, non un semplice forse'),
			bad('明日は晴れっぽい。', 'あしたははれっぽい。', 'troppo colloquiale per un bollettino ufficiale: っぽい è da conversazione informale'),
			bad('明日は晴れに違いない。', 'あしたははれにちがいない。', 'troppo assertivo: un meteorologo non garantisce con certezza assoluta, solo una previsione')
		],
		revealIt: 'Domani probabilmente sarà sereno.'
	},
	{
		slug: 'kamoshirenai',
		contextIt: 'Non sei sicuro se il tuo amico verrà alla festa: potrebbe avere altri impegni.',
		options: [
			ok('彼は来ないかもしれない。', 'かれはこないかもしれない。'),
			bad('彼は来ないはずだ。', 'かれはこないはずだ。', 'はず implica una deduzione da fatti concreti che conosci, non un semplice dubbio'),
			bad('彼は来ないに違いない。', 'かれはこないにちがいない。', 'troppo sicuro per un semplice dubbio: に違いない è una certezza forte'),
			bad('彼は来ないらしい。', 'かれはこないらしい。', 'らしい implica che qualcuno te l\'abbia detto, non un tuo dubbio personale')
		],
		revealIt: 'Forse non verrà.'
	},
	{
		slug: 'kana',
		contextIt: 'Stai pensando fra te e te, senza parlare con nessuno, se hai chiuso la porta di casa.',
		options: [
			ok('鍵をかけたかな。', 'かぎをかけたかな。'),
			bad('鍵をかけたでしょう。', 'かぎをかけたでしょう。', 'でしょう è una previsione rivolta a un ascoltatore, non un pensiero rivolto a se stessi'),
			bad('鍵をかけたに違いない。', 'かぎをかけたにちがいない。', 'troppo assertivo per un dubbio che ti poni tu stesso'),
			bad('鍵をかけたらしい。', 'かぎをかけたらしい。', 'らしい riporta un\'informazione da fuori, non un dubbio interiore')
		],
		revealIt: 'Chissà se ho chiuso a chiave.'
	},
	{
		slug: 'hazu',
		contextIt: 'Sai che il tuo collega esce sempre dall\'ufficio alle 18: ora sono le 18:10, quindi...',
		options: [
			ok('もう帰ったはずだ。', 'もうかえったはずだ。'),
			bad('もう帰ったかもしれない。', 'もうかえったかもしれない。', 'troppo debole: hai un\'informazione precisa (l\'orario), non un semplice dubbio'),
			bad('もう帰ったらしい。', 'もうかえったらしい。', 'らしい implica che qualcuno te l\'abbia detto, non una tua deduzione logica'),
			bad('もう帰ったみたい。', 'もうかえったみたい。', 'みたい implica un indizio sensoriale diretto (es. luci spente), non un ragionamento sull\'orario')
		],
		revealIt: 'Dovrebbe essere già tornato a casa.'
	},
	{
		slug: 'rashii',
		contextIt: 'Hai letto sul giornale che quel negozio chiuderà il mese prossimo.',
		options: [
			ok('あの店は来月閉店するらしい。', 'あのみせはらいげつへいてんするらしい。'),
			bad('あの店は来月閉店するはずだ。', 'あのみせはらいげつへいてんするはずだ。', 'はず implica una tua deduzione personale, non un\'informazione letta da una fonte esterna'),
			bad('あの店は来月閉店するに違いない。', 'あのみせはらいげつへいてんするにちがいない。', 'troppo assertivo per una semplice notizia letta: non è una deduzione tua'),
			bad('あの店は来月閉店するかな。', 'あのみせはらいげつへいてんするかな。', 'かな è un pensiero interiore, non un\'informazione riportata da una fonte')
		],
		revealIt: 'A quanto pare quel negozio chiuderà il mese prossimo.'
	},
	{
		slug: 'mitai',
		contextIt: 'Senti il rumore della pioggia fuori dalla finestra proprio adesso.',
		options: [
			ok('雨が降っているみたい。', 'あめがふっているみたい。'),
			bad('雨が降っているらしい。', 'あめがふっているらしい。', 'らしい implica un\'informazione riportata da fuori, non un\'impressione diretta tua in questo momento'),
			bad('雨が降っているでしょう。', 'あめがふっているでしょう。', 'でしょう è una previsione, non un\'osservazione sensoriale immediata'),
			bad('雨が降っているに違いない。', 'あめがふっているにちがいない。', 'troppo assertivo per una semplice impressione da un suono')
		],
		revealIt: 'Sembra che stia piovendo.'
	},
	{
		slug: 'sou-apparenza',
		contextIt: 'Vedi una torta appena sfornata, prima ancora di assaggiarla.',
		options: [
			ok('おいしそう。', 'おいしそう。'),
			bad('おいしいらしい。', 'おいしいらしい。', 'らしい implica che qualcuno te l\'abbia detto che è buona, non un tuo giudizio a prima vista'),
			bad('おいしいかもしれない。', 'おいしいかもしれない。', 'troppo debole/dubbioso per un\'impressione visiva forte e immediata'),
			bad('おいしいに違いない。', 'おいしいにちがいない。', 'troppo assertivo per una semplice impressione visiva, non ancora assaggiata')
		],
		revealIt: 'Sembra buona (a prima vista).'
	},
	{
		slug: 'ppoi',
		contextIt: 'Un adulto si comporta in modo infantile: fai un commento un po\' critico sul suo tratto.',
		options: [
			ok('彼は子供っぽい。', 'かれはこどもっぽい。'),
			bad('彼は子供らしい。', 'かれはこどもらしい。', '子供らしい significa «come ci si aspetta da un bambino» (adatto SE fosse un bambino vero): qui è un adulto, serve っぽい'),
			bad('彼は子供みたい。', 'かれはこどもみたい。', 'みたい è un paragone più neutro («sembra un bambino»): perde la sfumatura di tratto caratteriale un po\' critico di っぽい'),
			bad('彼は子供でしょう。', 'かれはこどもでしょう。', 'でしょう è una previsione: non ha senso per descrivere un tratto caratteriale osservato')
		],
		revealIt: 'È infantile (ha un\'aria da bambino).'
	},
	{
		slug: 'nichigainai',
		contextIt: 'Trovi impronte del tuo gatto sul divano appena pulito: è l\'unico animale in casa.',
		options: [
			ok('これは猫の足跡に違いない。', 'これはねこのあしあとにちがいない。'),
			bad('これは猫の足跡かもしれない。', 'これはねこのあしあとかもしれない。', 'troppo debole per una deduzione con prove schiaccianti (nessun altro animale in casa)'),
			bad('これは猫の足跡でしょう。', 'これはねこのあしあとでしょう。', 'でしょう è più debole: non trasmette la certezza assoluta di una deduzione logica stringente'),
			bad('これは猫の足跡らしい。', 'これはねこのあしあとらしい。', 'らしい implica un\'informazione riportata da altri, non una tua deduzione diretta dalle prove')
		],
		revealIt: 'Queste sono di sicuro le impronte del gatto.'
	}
];

export interface Round {
	situation: CertaintySituation;
	options: CertaintyOption[]; // mescolate
	correctIndex: number;
}

function shuffleArr<T>(xs: readonly T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

export function buildRounds(): Round[] {
	return shuffleArr(SITUATIONS).map((situation) => {
		const options = shuffleArr(situation.options);
		return { situation, options, correctIndex: options.findIndex((o) => o.correct) };
	});
}

export function computeScore(total: number, correct: number, hintsUsed: number): number {
	const base = correct * 20;
	const accuracyBonus = total > 0 && correct === total ? 30 : 0;
	const hintPenalty = hintsUsed * 8;
	return Math.max(0, base + accuracyBonus - hintPenalty);
}
