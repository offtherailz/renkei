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
		situazione: 'Hai appena detto il tuo nome: chiudi la presentazione con la formula classica.',
		opzioni: [
			'どうぞよろしくお願いします。',
			'さようなら。',
			'ありがとうございました。',
			'また明日。'
		]
	},
	{
		situazione: 'Ti chiedono da dove vieni (sei italiano): rispondi.',
		opzioni: [
			'イタリアから来ました。',
			'イタリアに住んでいました。',
			'日本に行きます。',
			'イタリア人が好きです。'
		]
	},
	{
		situazione: 'Ti chiedono che lavoro fai: sei uno studente.',
		opzioni: [
			'学生です。',
			'学生でした。',
			'先生です。',
			'学校です。'
		]
	},
	{
		situazione: 'Ti chiedono i tuoi hobby: di\' che ti piace ascoltare musica.',
		opzioni: [
			'趣味は音楽を聞くことです。',
			'音楽が好きな人です。',
			'趣味がありません。',
			'音楽を聞いています。'
		]
	},
	{
		situazione: 'Vuoi dire che stai studiando giapponese, prima di avvisare che non lo parli ancora bene.',
		opzioni: [
			'日本語を勉強しています。',
			'日本語が好きです。',
			'日本語を教えています。',
			'日本語を話します。'
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
		situazione: 'Ti fanno una domanda ma non l\'hai capita al primo colpo: la cosa più naturale è chiedere che la ripetano.',
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
		situazione: 'Hai sentito bene ogni parola, ma il senso della frase proprio non ti torna: meglio ammetterlo subito.',
		opzioni: [
			'すみません、わかりません。',
			'すみません、書いていただけますか。',
			'はい、そうです。',
			'いいえ、違います。'
		]
	}
];
