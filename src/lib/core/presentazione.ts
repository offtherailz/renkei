// Minigioco "Presentati": lo script sociale di un primo incontro — presentarsi,
// sminuire il complimento sul tuo giapponese, e sapere come reagire se non
// capisci una domanda (ripetere / rallentare / scrivere). Le frasi corrette
// sono le stesse del catalogo Frasi utili (situazioni 'presentarsi' e
// 'non-capisco'): gli errori finiscono negli stessi punti deboli.
// La prima opzione di ogni voce è sempre la corretta (mescolata a runtime).

export interface IntroItem {
	situazione: string;
	opzioni: string[];
}

export const INTRO_ITEMS: IntroItem[] = [
	{
		situazione: 'Incontri per la prima volta un collega giapponese: presentati.',
		opzioni: [
			'はじめまして、田中です。',
			'田中だよ、よろしく！',
			'私の名前を知っていますか。',
			'こんにちは、田中と言いましたか。'
		]
	},
	{
		situazione: 'Vuoi avvisare che il tuo giapponese non è ancora un granché, appena dopo esserti presentato.',
		opzioni: [
			'日本語があまり話せません。',
			'日本語は完璧です。',
			'日本語を教えてください。',
			'日本語が大好きです。'
		]
	},
	{
		situazione: 'Un collega ti dice «日本語、お上手ですね！» (parli bene il giapponese!). Come rispondi, con educazione giapponese?',
		opzioni: [
			'いえいえ、まだまだです。',
			'はい、とても上手です。',
			'どうもありがとうございます、天才です。',
			'そうですね、上手です。'
		]
	},
	{
		situazione: 'Ti fanno una domanda ma hanno parlato troppo velocemente: non hai capito nulla.',
		opzioni: [
			'もう少しゆっくり話してください。',
			'書いてもらえますか。',
			'すみません、もう一度お願いします。',
			'分かりません、さようなら。'
		]
	},
	{
		situazione: 'Hanno parlato alla velocità giusta, ma non hai fatto in tempo a capire la domanda.',
		opzioni: [
			'すみません、もう一度お願いします。',
			'もう少しゆっくり話してください。',
			'書いてもらえますか。',
			'もういいです。'
		]
	},
	{
		situazione: 'A voce proprio non ti torna: vorresti vedere la domanda scritta, per leggerla con calma.',
		opzioni: [
			'書いてもらえますか。',
			'すみません、もう一度お願いします。',
			'もう少しゆっくり話してください。',
			'絵を描いてもらえますか。'
		]
	},
	{
		situazione: 'Ti hanno detto una parola che non conosci per niente: vuoi cercarla dopo, quindi ti serve vederla scritta.',
		opzioni: [
			'書いてもらえますか。',
			'もう少しゆっくり話してください。',
			'それはどういう意味ですか。',
			'もう一度話してください、早く。'
		]
	},
	{
		situazione: 'Non hai capito una singola parola della domanda, ma ti va bene ammetterlo semplicemente.',
		opzioni: [
			'すみません、わかりません。',
			'すみません、書いていただけますか。',
			'はい、そうです。',
			'いいえ、違います。'
		]
	}
];
