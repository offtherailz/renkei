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
	}
];
