// Testi per il gioco "Lettura veloce" (RSVP). Ogni testo è un template con
// slot che variano a ogni partita: le domande chiedono proprio i valori
// pescati, così bisogna leggere davvero (i distrattori sono le altre opzioni
// dello stesso slot, volutamente simili = trabocchetti).

export type JlptLevel = 'N5' | 'N4';

export interface Slot {
	id: string;
	options: string[];
}

export interface FixedQuestion {
	q: string;
	choices: string[];
	correct: number; // indice in choices
}

export interface SlotQuestion {
	q: string;
	slot: string; // risposta giusta = opzione pescata per questo slot
}

export type Question = FixedQuestion | SlotQuestion;

export interface VocabEntry {
	w: string;
	yomi: string;
	it: string;
}

export interface ReadingText {
	id: string;
	livello: JlptLevel;
	tipo: string; // お知らせ, 手紙, メール, 記事…
	titolo: string; // titolo italiano mostrato nella scelta
	parts: (string | { slot: string })[];
	slots: Slot[];
	questions: Question[];
	vocab: VocabEntry[];
}

export interface ReadingRun {
	text: ReadingText;
	rendered: string;
	picked: Record<string, string>;
	questions: { q: string; choices: string[]; correct: number }[];
}

const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Pesca un valore per ogni slot, compone il testo e prepara le domande
// (con le scelte già mischiate).
export function instantiate(text: ReadingText): ReadingRun {
	const picked: Record<string, string> = {};
	for (const s of text.slots) picked[s.id] = rnd(s.options);
	const rendered = text.parts.map((p) => (typeof p === 'string' ? p : picked[p.slot]!)).join('');
	const questions = text.questions.map((q) => {
		if ('slot' in q) {
			const slot = text.slots.find((s) => s.id === q.slot)!;
			const correct = picked[q.slot]!;
			const others = shuffle(slot.options.filter((o) => o !== correct)).slice(0, 3);
			const choices = shuffle([correct, ...others]);
			return { q: q.q, choices, correct: choices.indexOf(correct) };
		}
		const order = shuffle(q.choices.map((_, i) => i));
		return {
			q: q.q,
			choices: order.map((i) => q.choices[i]!),
			correct: order.indexOf(q.correct)
		};
	});
	return { text, rendered, picked, questions };
}

export const READING_TEXTS: ReadingText[] = [
	// ───────────────────────────── N5 ─────────────────────────────
	{
		id: 'n5-scuola',
		livello: 'N5',
		tipo: 'お知らせ',
		titolo: 'Avviso della scuola',
		parts: [
			'がくせいの　みなさんへ。あしたは　',
			{ slot: 'day' },
			'です。じゅぎょうは　',
			{ slot: 'time' },
			'に　はじまります。',
			{ slot: 'place' },
			'に　きて　ください。えんぴつと　ノートを　もって　きて　ください。おくれないで　ください。'
		],
		slots: [
			{ id: 'day', options: ['げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび'] },
			{ id: 'time', options: ['九じ', '九じはん', '十じ', '十じはん'] },
			{ id: 'place', options: ['としょかん', 'たいいくかん', 'きょうしつ', 'ホール'] }
		],
		questions: [
			{ q: 'じゅぎょうは　なんじに　はじまりますか。', slot: 'time' },
			{ q: 'どこに　いきますか。', slot: 'place' },
			{
				q: 'なにを　もって　いきますか。',
				choices: ['えんぴつと　ノート', 'ほんと　じしょ', 'おべんとうと　おちゃ', 'かさと　ぼうし'],
				correct: 0
			}
		],
		vocab: [
			{ w: 'じゅぎょう', yomi: 'じゅぎょう', it: 'lezione' },
			{ w: 'はじまります', yomi: 'はじまります', it: 'inizia' },
			{ w: 'もって　きて', yomi: 'もってきて', it: 'porta (con te)' },
			{ w: 'おくれないで', yomi: 'おくれないで', it: 'non fare tardi' }
		]
	},
	{
		id: 'n5-hagaki',
		livello: 'N5',
		tipo: 'はがき',
		titolo: 'Cartolina di un amico',
		parts: [
			'たなかさん、こんにちは。わたしは　いま　',
			{ slot: 'city' },
			'に　います。きのうは　',
			{ slot: 'weather' },
			'でした。きょうは　かぞくと　',
			{ slot: 'activity' },
			'。とても　たのしいです。',
			{ slot: 'month' },
			'に　かえります。また　あいましょう。'
		],
		slots: [
			{ id: 'city', options: ['きょうと', 'おおさか', 'さっぽろ', 'ながさき'] },
			{ id: 'weather', options: ['あめ', 'ゆき', 'くもり', 'いい てんき'] },
			{
				id: 'activity',
				options: ['おてらを　みます', 'うみへ　いきます', 'かいものを　します', 'しゃしんを　とります']
			},
			{ id: 'month', options: ['三がつ', '四がつ', '五がつ', '六がつ'] }
		],
		questions: [
			{ q: 'この　ひとは　いま　どこに　いますか。', slot: 'city' },
			{ q: 'きのうの　てんきは　どうでしたか。', slot: 'weather' },
			{ q: 'いつ　かえりますか。', slot: 'month' }
		],
		vocab: [
			{ w: 'かぞく', yomi: 'かぞく', it: 'famiglia' },
			{ w: 'てんき', yomi: 'てんき', it: 'tempo (meteo)' },
			{ w: 'かえります', yomi: 'かえります', it: 'torna (a casa)' }
		]
	},
	{
		id: 'n5-mail',
		livello: 'N5',
		tipo: 'メール',
		titolo: 'Email per un appuntamento',
		parts: [
			'やまださん、こんばんは。あした　いっしょに　',
			{ slot: 'activity' },
			'ませんか。',
			{ slot: 'time' },
			'に　',
			{ slot: 'station' },
			'えきの　まえで　あいましょう。あめの　ときは　えきの　なかで　まって　いて　ください。へんじを　ください。'
		],
		slots: [
			{ id: 'activity', options: ['えいがを　み', 'テニスを　し', 'ひるごはんを　たべ', 'こうえんを　さんぽし'] },
			{ id: 'time', options: ['一じ', '一じはん', '二じ', '二じはん'] },
			{ id: 'station', options: ['しんじゅく', 'しぶや', 'うえの', 'いけぶくろ'] }
		],
		questions: [
			{ q: 'なんじに　あいますか。', slot: 'time' },
			{ q: 'どこで　あいますか。', slot: 'station' },
			{
				q: 'あめの　ときは　どう　しますか。',
				choices: [
					'えきの　なかで　まちます',
					'うちに　かえります',
					'でんわを　します',
					'あいません'
				],
				correct: 0
			}
		],
		vocab: [
			{ w: 'いっしょに', yomi: 'いっしょに', it: 'insieme' },
			{ w: '〜ませんか', yomi: 'ませんか', it: 'che ne dici di…?' },
			{ w: 'へんじ', yomi: 'へんじ', it: 'risposta' }
		]
	},
	{
		id: 'n5-mise',
		livello: 'N5',
		tipo: 'お知らせ',
		titolo: 'Avviso del negozio',
		parts: [
			'いらっしゃいませ。この　みせは　まいしゅう　',
			{ slot: 'day' },
			'が　やすみです。あさ　',
			{ slot: 'open' },
			'から　よる　',
			{ slot: 'close' },
			'まで　あいて　います。いま　',
			{ slot: 'item' },
			'が　やすいです。ひとつ　',
			{ slot: 'price' },
			'えんです。どうぞ　みて　ください。'
		],
		slots: [
			{ id: 'day', options: ['げつようび', 'すいようび', 'もくようび', 'にちようび'] },
			{ id: 'open', options: ['九じ', '十じ', '十一じ'] },
			{ id: 'close', options: ['八じ', '九じ', '十じ'] },
			{ id: 'item', options: ['りんご', 'たまご', 'パン', 'おちゃ'] },
			{ id: 'price', options: ['百', '百五十', '二百', '二百五十'] }
		],
		questions: [
			{ q: 'みせの　やすみは　いつですか。', slot: 'day' },
			{ q: 'なにが　やすいですか。', slot: 'item' },
			{ q: 'ひとつ　いくらですか。（〜えん）', slot: 'price' }
		],
		vocab: [
			{ w: 'まいしゅう', yomi: 'まいしゅう', it: 'ogni settimana' },
			{ w: 'やすみ', yomi: 'やすみ', it: 'giorno di chiusura / riposo' },
			{ w: 'あいて　います', yomi: 'あいています', it: 'è aperto' }
		]
	},
	{
		id: 'n5-tomodachi',
		livello: 'N5',
		tipo: 'さくぶん',
		titolo: 'Presentazione di un compagno',
		parts: [
			'わたしの　ともだちの　リンさんは　',
			{ slot: 'country' },
			'から　きました。だいがくで　',
			{ slot: 'subject' },
			'を　べんきょうして　います。しゅみは　',
			{ slot: 'hobby' },
			'です。まいあさ　',
			{ slot: 'transport' },
			'で　だいがくへ　いきます。にほんごが　じょうずです。'
		],
		slots: [
			{ id: 'country', options: ['ちゅうごく', 'かんこく', 'ベトナム', 'タイ'] },
			{ id: 'subject', options: ['れきし', 'けいざい', 'おんがく', 'コンピューター'] },
			{ id: 'hobby', options: ['りょうり', 'サッカー', 'えを　かくこと', 'うたを　うたうこと'] },
			{ id: 'transport', options: ['じてんしゃ', 'バス', 'でんしゃ', 'ちかてつ'] }
		],
		questions: [
			{ q: 'リンさんは　どこから　きましたか。', slot: 'country' },
			{ q: 'なにを　べんきょうして　いますか。', slot: 'subject' },
			{ q: 'なんで　だいがくへ　いきますか。', slot: 'transport' }
		],
		vocab: [
			{ w: 'しゅみ', yomi: 'しゅみ', it: 'hobby' },
			{ w: 'べんきょうして　います', yomi: 'べんきょうしています', it: 'sta studiando' },
			{ w: 'じょうず', yomi: 'じょうず', it: 'bravo, abile' }
		]
	},
	// ───────────────────────────── N4 ─────────────────────────────
	{
		id: 'n4-kaigi',
		livello: 'N4',
		tipo: 'メール',
		titolo: 'Email di lavoro (riunione)',
		parts: [
			'みなさま、お疲れさまです。来週の',
			{ slot: 'day' },
			'に会議がありますので、お知らせします。会議は',
			{ slot: 'time' },
			'に始まって、',
			{ slot: 'duration' },
			'ぐらいかかる予定です。場所は',
			{ slot: 'place' },
			'です。資料は今日中に送りますから、会議の前に読んでおいてください。都合が悪い人は、早めに連絡してください。'
		],
		slots: [
			{ id: 'day', options: ['月曜日', '火曜日', '水曜日', '木曜日'] },
			{ id: 'time', options: ['十時', '十時半', '二時', '三時半'] },
			{ id: 'duration', options: ['一時間', '一時間半', '二時間'] },
			{ id: 'place', options: ['第一会議室', '第二会議室', '三階の会議室', '五階のホール'] }
		],
		questions: [
			{ q: '会議はいつありますか。', slot: 'day' },
			{ q: '会議はどのぐらいかかりますか。', slot: 'duration' },
			{
				q: '会議の前に何をしておかなければなりませんか。',
				choices: ['資料を読んでおく', '資料を送っておく', '部屋を予約しておく', '連絡しておく'],
				correct: 0
			}
		],
		vocab: [
			{ w: '会議', yomi: 'かいぎ', it: 'riunione' },
			{ w: '資料', yomi: 'しりょう', it: 'documenti, materiale' },
			{ w: '〜ておく', yomi: 'ておく', it: 'fare in anticipo (in preparazione)' },
			{ w: '都合が悪い', yomi: 'つごうがわるい', it: 'essere impossibilitato, non avere disponibilità' }
		]
	},
	{
		id: 'n4-tegami',
		livello: 'N4',
		tipo: '手紙',
		titolo: 'Lettera di ringraziamento',
		parts: [
			'田中さん、お元気ですか。先日はほんとうにありがとうございました。田中さんのおかげで、',
			{ slot: 'event' },
			'がとても楽しかったです。いい思い出になりました。今度、',
			{ slot: 'month' },
			'にそちらへ行くつもりです。そのとき、',
			{ slot: 'gift' },
			'を持って行きますね。楽しみにしていてください。それでは、また。'
		],
		slots: [
			{ id: 'event', options: ['お祭り', '旅行', 'パーティー', '花見'] },
			{ id: 'month', options: ['二月', '四月', '七月', '九月'] },
			{ id: 'gift', options: ['ワイン', 'おかし', 'チーズ', 'コーヒー'] }
		],
		questions: [
			{ q: '何が楽しかったと言っていますか。', slot: 'event' },
			{ q: 'いつそちらへ行くつもりですか。', slot: 'month' },
			{ q: '何を持って行くつもりですか。', slot: 'gift' }
		],
		vocab: [
			{ w: '先日', yomi: 'せんじつ', it: "l'altro giorno" },
			{ w: '〜のおかげで', yomi: 'のおかげで', it: 'grazie a…' },
			{ w: '思い出', yomi: 'おもいで', it: 'ricordo' },
			{ w: '〜つもり', yomi: 'つもり', it: 'avere intenzione di…' }
		]
	},
	{
		id: 'n4-danshui',
		livello: 'N4',
		tipo: 'お知らせ',
		titolo: 'Avviso del condominio',
		parts: [
			'マンションにお住まいのみなさまへ。',
			{ slot: 'reason' },
			'のため、',
			{ slot: 'day' },
			'の',
			{ slot: 'from' },
			'から',
			{ slot: 'to' },
			'まで、水が止まります。エレベーターも使えませんので、階段をご利用ください。ご迷惑をおかけしますが、よろしくお願いいたします。'
		],
		slots: [
			{ id: 'reason', options: ['工事', '点検', 'そうじ'] },
			{ id: 'day', options: ['十日', '十四日', '二十日', '二十四日'] },
			{ id: 'from', options: ['朝九時', '朝十時', '午後一時'] },
			{ id: 'to', options: ['午後三時', '午後四時', '午後五時'] }
		],
		questions: [
			{ q: 'どうして水が止まりますか。（〜のため）', slot: 'reason' },
			{ q: '何日に水が止まりますか。', slot: 'day' },
			{
				q: 'エレベーターが使えないとき、どうしますか。',
				choices: ['階段を使う', '外で待つ', '管理人に電話する', '別のマンションへ行く'],
				correct: 0
			}
		],
		vocab: [
			{ w: '工事', yomi: 'こうじ', it: 'lavori (edili)' },
			{ w: '点検', yomi: 'てんけん', it: 'ispezione, controllo' },
			{ w: '止まります', yomi: 'とまります', it: 'si ferma / viene sospesa' },
			{ w: 'ご迷惑をおかけします', yomi: 'ごめいわくをおかけします', it: 'ci scusiamo per il disagio' }
		]
	},
	{
		id: 'n4-kiji',
		livello: 'N4',
		tipo: '記事',
		titolo: 'Articolo: nuovo negozio',
		parts: [
			'駅の前に新しい',
			{ slot: 'shop' },
			'ができて、',
			{ slot: 'day' },
			'にオープンした。値段が安くて、店の中も広いので、若い人に人気がある。店の人によると、いちばん売れているのは',
			{ slot: 'item' },
			'だそうだ。店は夜',
			{ slot: 'close' },
			'まで開いているので、仕事の帰りに寄ることもできる。'
		],
		slots: [
			{ id: 'shop', options: ['パン屋', 'カフェ', '本屋', 'ラーメン屋'] },
			{ id: 'day', options: ['三日', '八日', '十三日', '十八日'] },
			{ id: 'item', options: ['チョコレートのケーキ', 'メロンパン', '抹茶のクッキー', 'いちごのジュース'] },
			{ id: 'close', options: ['八時', '九時', '十時', '十一時'] }
		],
		questions: [
			{ q: '駅の前に何ができましたか。', slot: 'shop' },
			{ q: 'いちばん売れているのは何ですか。', slot: 'item' },
			{ q: '店は夜何時まで開いていますか。', slot: 'close' }
		],
		vocab: [
			{ w: '人気がある', yomi: 'にんきがある', it: 'essere popolare' },
			{ w: '〜によると', yomi: 'によると', it: 'secondo…' },
			{ w: '〜そうだ', yomi: 'そうだ', it: 'si dice che… (riportato)' },
			{ w: '寄る', yomi: 'よる', it: 'fare un salto, passare da' }
		]
	},
	{
		id: 'n4-repoto',
		livello: 'N4',
		tipo: 'レポート',
		titolo: 'Report: sondaggio in classe',
		parts: [
			'クラスのみんなに「いちばん好きな日本の食べ物」について聞きました。いちばん人気があったのは',
			{ slot: 'first' },
			'で、クラスの半分の人がそう答えました。二番目は',
			{ slot: 'second' },
			'でした。「きらいなものはない」と答えた人も',
			{ slot: 'count' },
			'いました。国によって答えがちがうので、おもしろかったです。'
		],
		slots: [
			{ id: 'first', options: ['すし', 'ラーメン', 'てんぷら', 'カレー'] },
			{ id: 'second', options: ['うどん', 'おにぎり', 'やきそば', 'みそしる'] },
			{ id: 'count', options: ['二人', '三人', '四人', '五人'] }
		],
		questions: [
			{ q: 'いちばん人気があったのは何ですか。', slot: 'first' },
			{ q: '二番目は何でしたか。', slot: 'second' },
			{ q: '「きらいなものはない」と答えた人は何人いましたか。', slot: 'count' }
		],
		vocab: [
			{ w: '〜について', yomi: 'について', it: 'riguardo a…' },
			{ w: '半分', yomi: 'はんぶん', it: 'metà' },
			{ w: '答える', yomi: 'こたえる', it: 'rispondere' },
			{ w: '〜によって', yomi: 'によって', it: 'a seconda di…' }
		]
	},
	// ─────────────────────── N5 (secondo lotto) ───────────────────────
	{
		id: 'n5-tenki',
		livello: 'N5',
		tipo: 'てんきよほう',
		titolo: 'Previsioni del tempo',
		parts: [
			'きょうの　てんきです。ごぜんは　',
			{ slot: 'am' },
			'です。ごごから　',
			{ slot: 'pm' },
			'に　なります。あしたは　',
			{ slot: 'tomorrow' },
			'でしょう。きょうの　きおんは　',
			{ slot: 'temp' },
			'どです。でかける　ときは　きを　つけて　ください。'
		],
		slots: [
			{ id: 'am', options: ['はれ', 'くもり'] },
			{ id: 'pm', options: ['あめ', 'ゆき', 'つよい　かぜ'] },
			{ id: 'tomorrow', options: ['はれ', 'あめ', 'ゆき', 'くもり'] },
			{ id: 'temp', options: ['八', '十二', '十八', '二十五'] }
		],
		questions: [
			{ q: 'ごごの　てんきは　どう　なりますか。', slot: 'pm' },
			{ q: 'あしたの　てんきは　どうでしょうか。', slot: 'tomorrow' },
			{ q: 'きょうの　きおんは　なんどですか。', slot: 'temp' }
		],
		vocab: [
			{ w: 'てんきよほう', yomi: 'てんきよほう', it: 'previsioni del tempo' },
			{ w: 'きおん', yomi: 'きおん', it: 'temperatura' },
			{ w: '〜でしょう', yomi: 'でしょう', it: 'probabilmente sarà…' }
		]
	},
	{
		id: 'n5-party',
		livello: 'N5',
		tipo: 'おしらせ',
		titolo: 'Invito a una festa',
		parts: [
			'みなさん、',
			{ slot: 'day' },
			'に　わたしの　うちで　パーティーを　します。',
			{ slot: 'time' },
			'に　きて　ください。',
			{ slot: 'bring' },
			'を　もって　きて　ください。たべものは　たくさん　ありますから、だいじょうぶです。うちは　えきから　あるいて　',
			{ slot: 'min' },
			'ふんです。'
		],
		slots: [
			{ id: 'day', options: ['どようび', 'にちようび', 'きんようび'] },
			{ id: 'time', options: ['六じ', '六じはん', '七じ', '七じはん'] },
			{ id: 'bring', options: ['のみもの', 'おかし', 'カメラ', 'ゲーム'] },
			{ id: 'min', options: ['五', '十', '十五'] }
		],
		questions: [
			{ q: 'パーティーは　いつですか。', slot: 'day' },
			{ q: 'なにを　もって　いきますか。', slot: 'bring' },
			{ q: 'えきから　うちまで　なんぷんですか。（あるいて）', slot: 'min' }
		],
		vocab: [
			{ w: 'もって　きて', yomi: 'もってきて', it: 'porta (con te)' },
			{ w: 'たくさん', yomi: 'たくさん', it: 'tanto, in abbondanza' },
			{ w: 'あるいて', yomi: 'あるいて', it: 'a piedi' }
		]
	},
	{
		id: 'n5-toshokan',
		livello: 'N5',
		tipo: 'おしらせ',
		titolo: 'Regole della biblioteca',
		parts: [
			'としょかんの　おしらせです。ほんは　',
			{ slot: 'weeks' },
			'しゅうかん　かりる　ことが　できます。いちどに　',
			{ slot: 'count' },
			'さつまでです。まいしゅう　',
			{ slot: 'day' },
			'は　やすみです。としょかんの　なかで　',
			{ slot: 'rule' },
			'ないで　ください。'
		],
		slots: [
			{ id: 'weeks', options: ['一', '二', '三'] },
			{ id: 'count', options: ['三', '五', '八', '十'] },
			{ id: 'day', options: ['げつようび', 'かようび', 'きんようび', 'にちようび'] },
			{ id: 'rule', options: ['たべ', 'のみものを　のま', 'でんわを　し'] }
		],
		questions: [
			{ q: 'ほんは　なんしゅうかん　かりる　ことが　できますか。', slot: 'weeks' },
			{ q: 'いちどに　なんさつまで　かりられますか。', slot: 'count' },
			{ q: 'としょかんの　やすみは　いつですか。', slot: 'day' }
		],
		vocab: [
			{ w: 'かりる', yomi: 'かりる', it: 'prendere in prestito' },
			{ w: '〜ことが　できます', yomi: 'ことができます', it: 'si può…' },
			{ w: '〜ないで　ください', yomi: 'ないでください', it: 'per favore non…' }
		]
	},
	{
		id: 'n5-michi',
		livello: 'N5',
		tipo: 'メール',
		titolo: 'Indicazioni per arrivare',
		parts: [
			'あした、うちに　きて　ください。みちを　おしえます。えきを　でて、',
			{ slot: 'dir' },
			'に　まがって　ください。まっすぐ　いくと、',
			{ slot: 'landmark' },
			'が　あります。わたしの　うちは　その　となりです。えきから　あるいて　',
			{ slot: 'min' },
			'ふんぐらいです。わからない　ときは　でんわして　ください。'
		],
		slots: [
			{ id: 'dir', options: ['みぎ', 'ひだり'] },
			{ id: 'landmark', options: ['ゆうびんきょく', 'ぎんこう', 'こうえん', 'スーパー'] },
			{ id: 'min', options: ['三', '五', '八', '十'] }
		],
		questions: [
			{ q: 'えきを　でて、どちらに　まがりますか。', slot: 'dir' },
			{ q: 'うちは　なんの　となりに　ありますか。', slot: 'landmark' },
			{
				q: 'わからない　とき、どう　しますか。',
				choices: ['でんわします', 'えきで　まちます', 'ちずを　かいます', 'タクシーに　のります'],
				correct: 0
			}
		],
		vocab: [
			{ w: 'まがって', yomi: 'まがって', it: 'gira (svolta)' },
			{ w: 'まっすぐ', yomi: 'まっすぐ', it: 'dritto' },
			{ w: 'となり', yomi: 'となり', it: 'accanto, vicino' }
		]
	},
	{
		id: 'n5-nikki',
		livello: 'N5',
		tipo: 'にっき',
		titolo: 'Diario di una giornata',
		parts: [
			'きょうは　',
			{ slot: 'wake' },
			'に　おきました。ごぜんは　へやの　そうじを　しました。ごごは　ともだちと　',
			{ slot: 'activity' },
			'。とても　たのしかったです。よるは　',
			{ slot: 'dinner' },
			'を　たべました。',
			{ slot: 'sleep' },
			'に　ねます。'
		],
		slots: [
			{ id: 'wake', options: ['六じ', '七じ', '八じ', '九じ'] },
			{
				id: 'activity',
				options: ['えいがを　みました', 'プールで　およぎました', 'テニスを　しました', 'かいものを　しました']
			},
			{ id: 'dinner', options: ['カレー', 'すし', 'ラーメン', 'スパゲッティ'] },
			{ id: 'sleep', options: ['十じ', '十じはん', '十一じ'] }
		],
		questions: [
			{ q: 'なんじに　おきましたか。', slot: 'wake' },
			{ q: 'ごごは　ともだちと　なにを　しましたか。', slot: 'activity' },
			{ q: 'よるは　なにを　たべましたか。', slot: 'dinner' }
		],
		vocab: [
			{ w: 'おきました', yomi: 'おきました', it: 'mi sono alzato' },
			{ w: 'そうじ', yomi: 'そうじ', it: 'pulizie' },
			{ w: 'たのしかった', yomi: 'たのしかった', it: 'è stato divertente' }
		]
	},
	// ─────────────────────── N4 (secondo lotto) ───────────────────────
	{
		id: 'n4-kaisha-yasumi',
		livello: 'N4',
		tipo: 'お知らせ',
		titolo: "Chiusura dell'ufficio",
		parts: [
			'社員のみなさまへ。',
			{ slot: 'reason' },
			'のため、',
			{ slot: 'from' },
			'から',
			{ slot: 'to' },
			'まで、会社は休みになります。休みの間、急ぎの用事がある方は、',
			{ slot: 'contact' },
			'にメールで連絡してください。休みの前に、机の上を片づけておいてください。'
		],
		slots: [
			{ id: 'reason', options: ['ビルの工事', '夏休み', '年末年始'] },
			{ id: 'from', options: ['三日', '十日', '十三日'] },
			{ id: 'to', options: ['十六日', '十八日', '二十日'] },
			{ id: 'contact', options: ['田中さん', '山田さん', '佐藤さん', '鈴木さん'] }
		],
		questions: [
			{ q: 'どうして会社が休みになりますか。（〜のため）', slot: 'reason' },
			{ q: '何日から休みになりますか。', slot: 'from' },
			{ q: '急ぎの用事があるとき、だれに連絡しますか。', slot: 'contact' }
		],
		vocab: [
			{ w: '急ぎ', yomi: 'いそぎ', it: 'urgente' },
			{ w: '用事', yomi: 'ようじ', it: 'impegno, faccenda' },
			{ w: '片づける', yomi: 'かたづける', it: 'mettere in ordine' },
			{ w: '〜の間', yomi: 'のあいだ', it: 'durante…' }
		]
	},
	{
		id: 'n4-eiga',
		livello: 'N4',
		tipo: '記事',
		titolo: 'Presentazione di un film',
		parts: [
			'今週の映画館のおすすめは「',
			{ slot: 'title' },
			'」です。',
			{ slot: 'genre' },
			'の映画で、時間は',
			{ slot: 'duration' },
			'ぐらいです。',
			{ slot: 'until' },
			'までやっていますから、見たい人は早く行ったほうがいいですよ。学生は',
			{ slot: 'price' },
			'円で見ることができます。'
		],
		slots: [
			{ id: 'title', options: ['海の音', '星の夜', '雨の街', '風の歌'] },
			{ id: 'genre', options: ['アニメ', 'ラブストーリー', 'ホラー', 'コメディー'] },
			{ id: 'duration', options: ['一時間半', '二時間', '二時間半'] },
			{ id: 'until', options: ['今週の日曜日', '来週の金曜日', '月末'] },
			{ id: 'price', options: ['千', '千二百', '千五百'] }
		],
		questions: [
			{ q: 'どんな映画ですか。', slot: 'genre' },
			{ q: '映画はどのぐらいかかりますか。', slot: 'duration' },
			{ q: '学生はいくらで見られますか。（〜円）', slot: 'price' }
		],
		vocab: [
			{ w: 'おすすめ', yomi: 'おすすめ', it: 'consigliato' },
			{ w: '〜たほうがいい', yomi: 'たほうがいい', it: 'è meglio…' },
			{ w: '〜ことができる', yomi: 'ことができる', it: 'potere…' }
		]
	},
	{
		id: 'n4-wasuremono',
		livello: 'N4',
		tipo: 'お知らせ',
		titolo: 'Oggetto smarrito',
		parts: [
			'お客様にお知らせします。',
			{ slot: 'day' },
			'の夕方、',
			{ slot: 'place' },
			'で',
			{ slot: 'item' },
			'の忘れ物がありました。心当たりのある方は、',
			{ slot: 'counter' },
			'の窓口までお越しください。お名前と電話番号をうかがいます。'
		],
		slots: [
			{ id: 'day', options: ['きのう', 'おととい', '先週の土曜日'] },
			{ id: 'place', options: ['二階のトイレの前', '三階のレストラン', '一階の入口', 'エレベーターの中'] },
			{ id: 'item', options: ['黒いかさ', '赤い手袋', '青いかばん', '白いぼうし'] },
			{ id: 'counter', options: ['一階', '二階', '五階'] }
		],
		questions: [
			{ q: 'どこで忘れ物がありましたか。', slot: 'place' },
			{ q: '忘れ物は何ですか。', slot: 'item' },
			{ q: '何階の窓口へ行きますか。', slot: 'counter' }
		],
		vocab: [
			{ w: '忘れ物', yomi: 'わすれもの', it: 'oggetto dimenticato' },
			{ w: '心当たり', yomi: 'こころあたり', it: 'riconoscerlo come proprio (averne idea)' },
			{ w: 'お越しください', yomi: 'おこしください', it: 'venga (formale)' },
			{ w: '窓口', yomi: 'まどぐち', it: 'sportello' }
		]
	},
	{
		id: 'n4-ryoko-blog',
		livello: 'N4',
		tipo: 'ブログ',
		titolo: 'Blog di viaggio',
		parts: [
			'先週、',
			{ slot: 'city' },
			'へ行ってきた。',
			{ slot: 'transport' },
			'で',
			{ slot: 'duration' },
			'かかったが、景色がきれいだったので、ぜんぜん疲れなかった。いちばんよかったのは',
			{ slot: 'spot' },
			'だ。写真をたくさん撮った。今度は',
			{ slot: 'season' },
			'に行こうと思っている。'
		],
		slots: [
			{ id: 'city', options: ['京都', '奈良', '広島', '日光'] },
			{ id: 'transport', options: ['新幹線', 'バス', '車'] },
			{ id: 'duration', options: ['二時間', '三時間', '四時間半'] },
			{ id: 'spot', options: ['古いお寺', '大きい公園', '山の上からの景色', '川の近くの町'] },
			{ id: 'season', options: ['春', '夏', '秋', '冬'] }
		],
		questions: [
			{ q: 'どうやって行きましたか。', slot: 'transport' },
			{ q: 'いちばんよかったのは何ですか。', slot: 'spot' },
			{ q: '今度はいつ行こうと思っていますか。', slot: 'season' }
		],
		vocab: [
			{ w: '〜てきた', yomi: 'てきた', it: 'sono andato e tornato (esperienza)' },
			{ w: '景色', yomi: 'けしき', it: 'panorama' },
			{ w: '疲れる', yomi: 'つかれる', it: 'stancarsi' },
			{ w: '〜ようと思っている', yomi: 'ようとおもっている', it: 'sto pensando di…' }
		]
	},
	{
		id: 'n4-byoin',
		livello: 'N4',
		tipo: 'お知らせ',
		titolo: 'Nuovi orari della clinica',
		parts: [
			'患者のみなさまへ。',
			{ slot: 'from' },
			'から、診察の時間が変わります。午前は',
			{ slot: 'am' },
			'までで、午後は',
			{ slot: 'pm' },
			'からになります。',
			{ slot: 'closed' },
			'はお休みです。予約は電話でもインターネットでもできます。保険証を忘れずにお持ちください。'
		],
		slots: [
			{ id: 'from', options: ['来週', '来月', '四月'] },
			{ id: 'am', options: ['十一時半', '十二時', '十二時半'] },
			{ id: 'pm', options: ['二時', '二時半', '三時'] },
			{ id: 'closed', options: ['水曜日', '木曜日', '土曜日の午後', '日曜日と祝日'] }
		],
		questions: [
			{ q: 'いつから時間が変わりますか。', slot: 'from' },
			{ q: '午後は何時からですか。', slot: 'pm' },
			{ q: 'お休みはいつですか。', slot: 'closed' }
		],
		vocab: [
			{ w: '診察', yomi: 'しんさつ', it: 'visita medica' },
			{ w: '変わる', yomi: 'かわる', it: 'cambiare' },
			{ w: '予約', yomi: 'よやく', it: 'prenotazione' },
			{ w: '忘れずに', yomi: 'わすれずに', it: 'senza dimenticare' }
		]
	}
];
