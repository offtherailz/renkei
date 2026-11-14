// Missione 5 — ゴールデンウィークの すり. Tre giornate di festa: 5/4 (みどりの日),
// 5/5 (こどもの日), 5/6 (ふりかえ休日). Niente ufficio. A 山野駅 durante la Golden
// Week ci sono stati tre borseggi, tutti sul 急行 delle 10:12, nella terza carrozza:
// un signore anziano con una grande スーツケース la mette davanti alle porte e, nella
// calca, prende i portafogli. Una delle vittime è il marito di 佐藤. Il giocatore
// raccoglie tre testimonianze (佐藤, あや alla konbini, la commessa della デパート),
// confronta gli orari e con 中村 lo prende sul binario.
// Pratica d'esame: telefonata e annunci (聴解), cartello e orario (情報検索),
// keigo, 〜はず, 〜ように, 〜そうだ, passivo (とられた).
import type { Missione, Passo } from '../tipi';
import { mattino, serata } from './comune';

const h = (ore: number, min = 0): number => ore * 60 + min;

const cena = (domande: Passo[], dopo: Passo[] = []): Passo[] => [
	...serata(),
	{ narra: 'ねる 前に、今日の ことを 思い出します。ノートも 見て ください。', it: 'Prima di dormire ripensi alla giornata. Il taccuino ti aiuta.' },
	...domande,
	...dopo,
	{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' },
	{ dormi: true }
];

// il cartello della polizia alla stazione: le tre volte che è successo
const CARTELLO: Passo = {
	avviso: {
		tipo: 'cartello',
		titolo: '⚠ すりに 注意！',
		righe: [
			'5月2日（土）｜10時12分の 急行｜3ごう車',
			'5月3日（日）｜10時12分の 急行｜3ごう車',
			'5月4日（月）｜10時12分の 急行｜3ごう車',
			'こんで いる 電車では、さいふを かばんの 中に 入れましょう。',
			'あやしい 人を 見たら、駅員[えきいん]か けいさつに れんらくして ください。'
		],
		it: 'Attenzione ai borseggiatori! 2 maggio (sab), 3 maggio (dom), 4 maggio (lun): espresso delle 10:12, carrozza 3. Sui treni affollati tenete il portafoglio nella borsa. Se vedete persone sospette, avvisate il personale o la polizia.'
	}
};

// l'orario dei treni da 山野駅 (lo prendi alla stazione: è la prova)
const ORARIO: Passo = {
	avviso: {
		tipo: 'volantino',
		titolo: '山野駅　時こくひょう（休日）',
		righe: [
			'9時50分｜ふつう｜さくら町まで 10分',
			'10時12分｜急行｜東京まで 40分（さくら町には 止まりません）',
			'10時30分｜ふつう｜さくら町まで 10分',
			'10時45分｜とっきゅう｜東京まで 30分（していせきだけ）'
		],
		it: 'Stazione di Yamano, orario festivo. 9:50 locale per Sakura-chō (10 min). 10:12 espresso per Tokyo (40 min, non ferma a Sakura-chō). 10:30 locale per Sakura-chō. 10:45 rapido per Tokyo (30 min, solo posti riservati).'
	}
};

export const M5: Missione = {
	id: 'm5',
	titolo: 'ゴールデンウィークの すり',
	it: 'Il borseggiatore della Golden Week',
	epilogo: {
		ja: 'すりは スーツケースで 電車の ドアの 前を ふさいで、こんで いる ときに さいふを とって いました。中村[なかむら]さんと いっしょに つかまえて、佐藤[さとう]さんの ご主人の さいふも もどりました。',
		it: 'Il borseggiatore bloccava le porte del treno con la valigia e, nella calca, rubava i portafogli. L’avete preso con Nakamura, e il portafoglio del marito di Sato è tornato al suo posto.'
	},
	inizio: { giorno: 28, flag: ['d0.casa', 'portafoglio.ok', 'grazie.ok', 'mike.ok', 'jinja.aperto', 'treno.ok', 'm3.riunione', 'm4.risolto', 'museo.aperto'], oggetti: ['portafoglio', 'carta_ic2'] },
	scene: [
		// ───────── giorno 28: lunedì 4 maggio (みどりの日) ─────────
		{
			id: 'm5-d28-casa', luogo: 'casa', quando: { giorno: 28, nonFlag: ['m5.d28.casa'] },
			passi: [
				{ narra: '5月4日（月・みどりの日）、朝 7時半。外は 雨です。', it: 'Lunedì 4 maggio, Festa del Verde, ore 7:30. Fuori piove.' },
				{ dice: 'mamma', ja: '今日も 休みね。雨だから、家で ゆっくり したら？', it: 'Anche oggi vacanza. Piove: perché non te la prendi comoda a casa?' },
				{ narra: '電話が なって います。', it: 'Squilla il telefono.', suono: 'telefono' },
				{
					domanda: {
						ja: '中村[なかむら]さんの 電話を 聞いて ください。中村さんと どこで 何時に 会いますか。',
						it: 'Ascolta la telefonata di Nakamura. Dove e a che ora vi vedete?',
						ascolto: {
							ja: 'もしもし、中村です。休みの 日に すみません。ゴールデンウィークに 山野駅で すりが 三回 ありました。手つだって くれませんか。10時に 駅の 中の こうばんで 待って います。あ、9時半では ありません。10時です。',
							it: 'Pronto, sono Nakamura. Scusi se la disturbo in un giorno di festa. Durante la Golden Week alla stazione di Yamano ci sono stati tre borseggi. Mi darebbe una mano? L’aspetto alle 10 al posto di polizia dentro la stazione. Ah, non alle 9:30: alle 10.',
							chi: 'M'
						},
						opzioni: [{ ja: '10時に 山野駅の こうばん', it: 'alle 10, al posto di polizia della stazione di Yamano' }, { ja: '9時半に 山野駅の こうばん', it: 'alle 9:30, al posto di polizia' }, { ja: '10時に さくら町の こうばん', it: 'alle 10, al kōban di Sakura-chō' }, { ja: '9時半に 山野駅の 前', it: 'alle 9:30, davanti alla stazione' }],
						giusta: 0,
						spiega: 'Al 聴解 l’informazione spesso si corregge alla fine: 「9時半では ありません。10時です」. すり = borseggiatore; こうばん (交番) = posto di polizia.'
					}
				},
				{ obiettivo: 'eki5', ja: '10時に 山野駅の こうばんで 中村[なかむら]さんに 会う。', it: 'Alle 10, vedere Nakamura al posto di polizia della stazione di Yamano.', quando: { dalle: h(10) } },
				{ flag: 'm5.chiamata' },
				{ flag: 'm5.d28.casa' },
				...mattino(),
				{ minuti: 20 }
			]
		},
		{
			id: 'm5-koban', luogo: 'eki2', quando: { giorno: [28, 29], dalle: h(9, 50), flag: ['m5.chiamata'], nonFlag: ['m5.indagine'] },
			passi: [
				{
					se: { alle: h(10, 31) },
					allora: [{ dice: 'nakamura', ja: '{nome}さん、来て くれて ありがとう。', it: '{nome}, grazie di essere venut{o}.' }],
					altrimenti: [{ dice: 'nakamura', ja: '{nome}さん、まって いましたよ。じかんが ないので、すぐ 始めましょう。', it: '{nome}, la stavo aspettando. Non c’è tempo, cominciamo subito.' }]
				},
				{ dice: 'nakamura', ja: 'これを 見て ください。駅の かべに はった けいさつの かみです。', it: 'Guardi questo. È l’avviso della polizia attaccato in stazione.' },
				CARTELLO,
				{
					domanda: {
						ja: 'すりが あったのは、どの 電車ですか。', it: 'Su quale treno ci sono stati i borseggi?',
						opzioni: [{ ja: '10時12分の 急行の 3ごう車', it: 'l’espresso delle 10:12, carrozza 3' }, { ja: '10時12分の とっきゅう', it: 'il rapido delle 10:12' }, { ja: 'いつも ちがう 電車', it: 'ogni volta un treno diverso' }, { ja: '10時45分の 急行の 3ごう車', it: 'l’espresso delle 10:45, carrozza 3' }],
						giusta: 0, spiega: 'Nel 情報検索 si cerca ciò che le righe hanno in comune: tre volte su tre «10時12分の 急行｜3ごう車».'
					}
				},
				{ dice: 'nakamura', ja: '三人目の ひがいしゃは、佐藤[さとう]さんの ご主人です。りょかんから 帰る とちゅうで、さいふを とられたそうです。', it: 'La terza vittima è il marito di Sato. Gli hanno rubato il portafoglio mentre tornava dal ryokan.', taccuino: true },
				{ nota: 'とられた = passivo di とる (rubare): «gli è stato preso». ひがいしゃ (被害者[ひがいしゃ]) = vittima. 〜そうです = dicono che.', it: 'Passivo e «si dice».' },
				{ dice: 'nakamura', ja: '駅員[えきいん]さんから 時こくひょうも もらいました。どうぞ。', it: 'Il personale mi ha dato anche l’orario dei treni. Tenga.' },
				ORARIO,
				{ prendi: 'jikokuhyo', it: 'l’orario dei treni di Yamano' },
				{
					domanda: {
						ja: '10時12分の 急行に ついて、正しい ものは どれですか。', it: 'Sull’espresso delle 10:12, cosa è vero?',
						opzioni: [{ ja: 'さくら町には 止まらない', it: 'non ferma a Sakura-chō' }, { ja: 'していせきだけ', it: 'solo posti riservati' }, { ja: '東京まで 30分', it: '30 minuti fino a Tokyo' }, { ja: 'さくら町まで 10分', it: '10 minuti fino a Sakura-chō' }],
						giusta: 0, spiega: 'Riga «10時12分｜急行｜東京まで 40分（さくら町には 止まりません）». «Solo posti riservati» e «30 minuti» sono del rapido delle 10:45: occhio a non confondere le righe.'
					}
				},
				{ dice: 'nakamura', ja: 'ひがいしゃや 町の 人の 話を 聞いて ください。何か 見た 人が いる はずです。', it: 'Senta le vittime e la gente del quartiere. Qualcuno avrà visto qualcosa.' },
				{ nota: '〜はずです = «dovrebbe essere così» (ne sono convinto, per un motivo). 見た 人が いる はず = ci sarà di sicuro qualcuno che ha visto.', it: '〜はず.' },
				{ obiettivo: 'sato5', ja: '佐藤[さとう]さんに ご主人の ことを 聞く（夕方、家に 来る）。', it: 'Chiedere a Sato del marito (passa da casa la sera).' },
				{ obiettivo: 'aya5', ja: 'ハッピーマートで あやさんに 聞く（夕方から）。', it: 'Chiedere ad Aya all’Happy Mart (dal pomeriggio).' },
				{ obiettivo: 'depa5', ja: 'デパートの 店員さんに 聞く。', it: 'Chiedere alla commessa del grande magazzino.' },
				{ obiettivo: 'piano5', ja: '三人の 話を 聞いたら、山野駅で 中村[なかむら]さんに 話す。', it: 'Sentite le tre persone, parlarne con Nakamura alla stazione di Yamano.' },
				{ completa: 'eki5' },
				{ minuti: 30 },
				{ flag: 'm5.indagine' }
			]
		},
		{
			// troppo presto all'appuntamento del 4 maggio
			id: 'm5-presto', luogo: 'eki2', ripeti: true, quando: { giorno: 28, alle: h(9, 50), flag: ['m5.chiamata'], nonFlag: ['m5.indagine'] },
			passi: [
				{ narra: '駅の こうばんに 来ました。中村[なかむら]さんは まだ 来て いません。10時に 来る はずです。', it: 'Sei al posto di polizia della stazione. Nakamura non è ancora arrivato: dovrebbe venire alle 10.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'm5-depa', luogo: 'depa', quando: { giorno: [28, 29, 30], flag: ['m5.indagine'], nonFlag: ['m5.depa'] },
			passi: [
				{ dice: 'depa', ja: 'いらっしゃいませ。……けいさつの 方から、お話は うかがって おります。', it: 'Benvenut{o}. …La polizia mi ha già informata.' },
				{ dice: 'depa', ja: 'きのうの 朝、大きな スーツケースを お持ちの おきゃくさまが いらっしゃいました。でも、何も お買い上げに ならずに、エスカレーターの 前に ずっと 立って いらっしゃいました。', it: 'Ieri mattina è venuto un cliente con una grande valigia. Non ha comprato niente: è rimasto tutto il tempo in piedi davanti alle scale mobili.', taccuino: true },
				{ dice: 'depa', ja: '10時ごろ、駅の ほうへ いそいで 行かれました。', it: 'Verso le 10 è andato di fretta verso la stazione.' },
				{
					domanda: {
						ja: '店員さんの ことばで、「来ました」の いみは どれですか。', it: 'Nelle parole della commessa, quale vuol dire «è venuto»?',
						opzioni: [{ ja: 'いらっしゃいました', it: 'è venuto (rispetto)' }, { ja: 'うかがって おります', it: '(umile: ho sentito)' }, { ja: 'お持ちの', it: '(che aveva con sé)' }, { ja: 'お買い上げに ならずに', it: '(senza comprare)' }],
						giusta: 0, spiega: 'いらっしゃる = 来る / いる di rispetto (per il cliente). うかがう = 聞く umile (per sé). お買い上げに なる = 買う di rispetto; 〜ずに = senza.'
					}
				},
				{ minuti: 20 },
				{ completa: 'depa5' },
				{ flag: 'm5.depa' }
			]
		},
		{
			id: 'm5-aya', luogo: 'konbini', quando: { giorno: [28, 29, 30], dalle: h(16), flag: ['m5.indagine'], nonFlag: ['m5.aya'] },
			passi: [
				{ dice: 'aya', ja: 'いらっしゃいませ！ あ、{nome}さん。すりの こと？ わたしも 聞いたよ。', it: 'Benvenut{o}! Ah, {nome}. Per il borseggiatore? L’ho sentito anch’io.' },
				{ dice: 'aya', ja: 'そう いえば、きのうの 朝 山野駅で、おじいさんが 大きい スーツケースを 運んで いたの。とても 重そうに 見えたから、手つだおうと したら……', it: 'A proposito: ieri mattina alla stazione di Yamano un signore anziano trascinava una grande valigia. Sembrava pesantissima, così ho provato ad aiutarlo e…' },
				{ dice: 'aya', ja: 'すごく かるかったの！ 中に 何も 入って いないみたいだった。へんでしょう？', it: 'Era leggerissima! Sembrava che dentro non ci fosse niente. Strano, no?', taccuino: true },
				{
					domanda: {
						ja: 'あやさんは スーツケースが どう だったと 言って いますか。', it: 'Com’era la valigia, secondo Aya?',
						opzioni: [{ ja: '重そうだったが、かるかった', it: 'sembrava pesante, ma era leggera' }, { ja: '重くて 運べなかった', it: 'era pesante, non si spostava' }, { ja: 'お金が 入って いた', it: 'dentro c’erano soldi' }, { ja: '小さくて かるかった', it: 'era piccola e leggera' }],
						giusta: 0, spiega: '重そう = «sembra pesante» (〜そう: da come appare) ≠ 重いそうです = «dicono che sia pesante». 何も 入って いない みたい = sembra che non ci sia niente.'
					}
				},
				{ minuti: 15 },
				{ completa: 'aya5' },
				{ flag: 'm5.aya' }
			]
		},
		{
			id: 'm5-sato', luogo: 'casa', quando: { giorno: [28, 29, 30], dalle: h(17), flag: ['m5.indagine'], nonFlag: ['m5.sato'] },
			passi: [
				{ narra: 'ばんごはんの 前に、となりの 佐藤[さとう]さんが 来ました。', it: 'Prima di cena passa la vicina, Sato.' },
				{ dice: 'sato', ja: '{nome}さん、主人の さいふの こと、聞いた？ ほんとうに くやしいわ。', it: '{nome}, hai saputo del portafoglio di mio marito? Che rabbia.' },
				{
					domanda: {
						ja: '佐藤[さとう]さんの 話を 聞いて ください。すりは どんな 人でしたか。', it: 'Ascolta Sato. Com’era il borseggiatore?',
						ascolto: {
							ja: '主人の 話では、ドアの 前に 大きい スーツケースを 持った おじいさんが 立って いて、なかなか 入れなかったんですって。その 人は ぼうしを かぶって、サンダルを はいて いたそうよ。めがねは かけて いなかったって。',
							it: 'Secondo mio marito, davanti alla porta c’era un signore anziano con una grande valigia, e non si riusciva a entrare. Portava un cappello e dei sandali. Gli occhiali no.',
							chi: 'F'
						},
						opzioni: [{ ja: 'ぼうしと サンダルの おじいさん', it: 'un anziano con cappello e sandali' }, { ja: 'めがねを かけた おじいさん', it: 'un anziano con gli occhiali' }, { ja: 'ぼうしを かぶった わかい 男', it: 'un giovane col cappello' }, { ja: 'スーツケースを 持った 女の 人', it: 'una donna con la valigia' }],
						giusta: 0, spiega: 'かぶる (cappello), はく (scarpe, sandali), かける (occhiali): ogni capo ha il suo verbo. 〜て いなかった = non li portava.'
					}
				},
				{ dice: 'sato', ja: 'それに、すりの 前の 日は 雨で、ぼうしが ぬれて いたって。主人、よく 見て いるでしょう？', it: 'E poi il giorno prima pioveva, e il cappello era bagnato. Mio marito è un buon osservatore, eh?' },
				{ minuti: 20 },
				{ completa: 'sato5' },
				{ flag: 'm5.sato' }
			]
		},
		{
			id: 'm5-d28-casa-sera', luogo: 'casa', quando: { giorno: 28, dalle: h(17), flag: ['m5.d28.casa'], nonFlag: ['m5.d28.sera'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。休みの 日まで けいさつの 手つだい？ たいへんね。', it: 'Bentornat{o}. Aiuti la polizia anche in vacanza? Che impegno.' },
				{ flag: 'm5.d28.sera' },
				...cena([
					{
						domanda: {
							ja: 'けいさつの かみに 「さいふを かばんの 中に 入れましょう」と ありました。どうして ですか。', it: 'L’avviso diceva di tenere il portafoglio nella borsa. Perché?',
							opzioni: [{ ja: 'すりに とられないように', it: 'perché non lo rubino' }, { ja: 'わすれないように', it: 'per non dimenticarlo' }, { ja: '雨に ぬれないように', it: 'perché non si bagni' }, { ja: 'お金を ためるように', it: 'per risparmiare' }],
							giusta: 0, spiega: '〜ないように = «in modo da non…»: とられないように = per non farselo rubare (とられる, passivo).'
						}
					},
					{
						domanda: {
							ja: '「さくら町まで 帰る」なら、10時12分の 急行に 乗っても いいですか。', it: 'Se devi tornare a Sakura-chō, va bene prendere l’espresso delle 10:12?',
							opzioni: [{ ja: 'いいえ。さくら町には 止まらないから', it: 'no, non ferma a Sakura-chō' }, { ja: 'はい。10分で つくから', it: 'sì, arriva in 10 minuti' }, { ja: 'はい。いちばん はやいから', it: 'sì, è il più veloce' }, { ja: 'いいえ。していせきだけだから', it: 'no, solo posti riservati' }],
							giusta: 0, spiega: 'Nel taccuino c’è l’orario: «さくら町には 止まりません». Al 情報検索 le note tra parentesi decidono la risposta.'
						}
					}
				])
			]
		},

		// ───────── giorno 29: martedì 5 maggio (こどもの日) ─────────
		{
			id: 'm5-d29-casa', luogo: 'casa', quando: { giorno: 29, nonFlag: ['m5.d29.casa'] },
			passi: [
				{ narra: '5月5日（火・こどもの日）、朝 7時半。まどの 外で こいのぼりが およいで います。', it: 'Martedì 5 maggio, Festa dei bambini, ore 7:30. Fuori dalla finestra nuotano le carpe di stoffa.' },
				{ dice: 'papa', ja: 'こどもの日には、男の子の 元気な せいちょうを ねがって、こいのぼりを かざるんだよ。', it: 'Per la Festa dei bambini si appendono le carpe, augurando ai bambini di crescere forti.' },
				{ nota: 'こいのぼり (鯉[こい]のぼり) = carpe di stoffa; かざる (飾[かざ]る) = decorare, esporre; ねがう (願[ねが]う) = augurare.', it: 'こどもの日.' },
				{
					se: { flag: ['m5.indagine'] },
					allora: [{ pensa: 'すりは 毎日 同じ 電車を ねらって いる。今日も 10時12分に 来るかも しれない……。', it: 'Il borseggiatore punta ogni giorno lo stesso treno. Forse anche oggi alle 10:12…' }],
					altrimenti: [{ dice: 'nakamuraTel', ja: 'もしもし、中村[なかむら]です。きのうは 会えませんでしたね。今日、山野駅の こうばんに 来て ください。', it: 'Pronto, sono Nakamura. Ieri non ci siamo visti. Oggi venga al posto di polizia della stazione di Yamano.' }]
				},
				{ flag: 'm5.d29.casa' },
				...mattino(),
				{ minuti: 20 }
			]
		},
		{
			// le tre testimonianze insieme: il piano con 中村
			id: 'm5-piano', luogo: 'eki2', quando: { giorno: [29, 30], flag: ['m5.sato', 'm5.aya', 'm5.depa'], nonFlag: ['m5.piano'] },
			passi: [
				{ dice: 'nakamura', ja: '{nome}さん、何か わかりましたか。', it: '{nome}, ha scoperto qualcosa?' },
				{ io: 'はい。三人の 話が 同じなんです。スーツケースの おじいさんです。', it: 'Sì. Le tre testimonianze coincidono: il signore anziano con la valigia.' },
				{
					prova: {
						ja: '中村[なかむら]さんに、すりが いつ 来るか わかる ものを 見せて ください。', it: 'Mostra a Nakamura qualcosa da cui si capisce quando arriverà il borseggiatore.',
						giuste: ['jikokuhyo'],
						ok: [
							{ io: 'この 時こくひょうを 見て ください。すりは いつも 10時12分の 急行です。この 急行は 東京まで 40分 止まらないので、にげやすいんです。', it: 'Guardi quest’orario. Il borseggiatore prende sempre l’espresso delle 10:12. Fino a Tokyo non si ferma per 40 minuti: è facile scappare.' },
							{ dice: 'nakamura', ja: 'なるほど。からの スーツケースで ドアの 前を ふさいで、こんだ ところで さいふを とるんですね。', it: 'Capisco. Con la valigia vuota blocca le porte e nella calca ruba i portafogli.' }
						],
						no: [
							{ dice: 'nakamura', ja: 'それでは わかりませんね。……あ、駅の 時こくひょうを 見て みましょう。10時12分の 急行は 東京まで 止まりません。', it: 'Così non si capisce. …Ah, guardiamo l’orario: l’espresso delle 10:12 non si ferma fino a Tokyo.' }
						]
					}
				},
				{
					domanda: {
						ja: '中村[なかむら]さんの 計画を 聞いて ください。{nome}さんは どこで 待ちますか。',
						it: 'Ascolta il piano di Nakamura. Dove aspetti tu?',
						ascolto: {
							ja: 'つぎの 10時12分の 急行で つかまえましょう。わたしは かいさつの 近くに います。{nome}さんは ホームの 3ごう車の ドアの 前で 待って ください。スーツケースの 人が 来たら、すぐ 電話して ください。',
							it: 'Prendiamolo sul prossimo espresso delle 10:12. Io sto vicino ai tornelli. Lei aspetti sul binario davanti alla porta della carrozza 3. Quando arriva quello con la valigia, mi chiami subito.',
							chi: 'M'
						},
						opzioni: [{ ja: 'ホームの 3ごう車の ドアの 前', it: 'sul binario, alla porta della carrozza 3' }, { ja: 'かいさつの 近く', it: 'vicino ai tornelli' }, { ja: 'こうばんの 中', it: 'nel posto di polizia' }, { ja: '電車の 中', it: 'dentro il treno' }],
						giusta: 0, spiega: 'Due posti nello stesso annuncio: 「わたしは かいさつ」「{nome}さんは ホーム」. La domanda chiede il tuo. 〜たら = quando / appena.'
					}
				},
				{
					se: { alle: h(10) },
					allora: [{ obiettivo: 'cattura5', ja: '今日の 10時12分の 急行の 前に、山野駅の ホーム（3ごう車）で 待つ。', it: 'Prima dell’espresso delle 10:12 di oggi, aspettare sul binario di Yamano (carrozza 3).', quando: { dalle: h(9, 50), alle: h(10, 12) } }],
					altrimenti: [{ obiettivo: 'cattura5', ja: 'あしたの 10時12分の 急行の 前に、山野駅の ホーム（3ごう車）で 待つ。', it: 'Domani, prima dell’espresso delle 10:12, aspettare sul binario di Yamano (carrozza 3).', quando: { dopo: 1, dalle: h(9, 50), alle: h(10, 12) } }]
				},
				{ completa: 'piano5' },
				{ minuti: 20 },
				{ flag: 'm5.piano' }
			]
		},
		{
			id: 'm5-cattura', luogo: 'eki2', quando: { giorno: [29, 30], flag: ['m5.piano'], nonFlag: ['m5.preso'], dalle: h(9, 30), alle: h(10, 20) },
			passi: [
				{ narra: '山野駅の ホーム。人が おおぜい 電車を 待って います。', it: 'Binario della stazione di Yamano. Tanta gente aspetta il treno.', suono: 'stazione' },
				{
					domanda: {
						ja: 'アナウンスを 聞いて ください。急行は 何ばんせんに 来ますか。', it: 'Ascolta l’annuncio. Su che binario arriva l’espresso?',
						ascolto: {
							ja: 'まもなく、2ばんせんに 10時12分発、急行 東京行きが まいります。きいろい せんの うちがわで お待ち ください。なお、3ばんせんの ふつう電車は 5分 おくれて おります。',
							it: 'Tra poco al binario 2 arriva l’espresso delle 10:12 per Tokyo. Attendete dietro la linea gialla. Inoltre, il locale del binario 3 è in ritardo di 5 minuti.',
							chi: 'F'
						},
						opzioni: [{ ja: '2ばんせん', it: 'binario 2' }, { ja: '3ばんせん', it: 'binario 3' }, { ja: '5ばんせん', it: 'binario 5' }, { ja: '1ばんせん', it: 'binario 1' }],
						giusta: 0, spiega: 'L’annuncio nomina due binari: il 2 per l’espresso, il 3 per il locale in ritardo. 〜行き = diretto a; まいります = 来ます (cortese).'
					}
				},
				{ narra: 'ぼうしを かぶって、サンダルを はいた おじいさんが、大きい スーツケースを おして 来ました！', it: 'Arriva un signore anziano con cappello e sandali, che spinge una grande valigia!' },
				{
					scelta: [
						{
							ja: '（中村さんに 電話して、3ごう車の ドアの 前で 待つ）', it: '(Chiamo Nakamura e aspetto davanti alla porta della carrozza 3)',
							passi: [
								{ narra: '電車が 来ました。おじいさんが スーツケースで ドアの 前を ふさぎます。その 時……', it: 'Arriva il treno. Il vecchio blocca la porta con la valigia. In quel momento…' },
								{ dice: 'suri', ja: 'うわっ！ な、何を するんだ！', it: 'Ehi! Che… che cosa fate!' },
								{ dice: 'nakamura', ja: 'けいさつです。スーツケースの 中を 見せて ください。', it: 'Polizia. Ci mostri cosa c’è nella valigia.' }
							]
						},
						{
							ja: '（一人で おじいさんに 話しかける）', it: '(Vado a parlargli da solo)',
							passi: [
								{ io: 'すみません、その スーツケース……', it: 'Scusi, quella valigia…' },
								{ dice: 'suri', ja: 'な、何でも ない！', it: 'N-niente!' },
								{ narra: 'おじいさんが にげようと しましたが、中村[なかむら]さんが 走って 来ました！', it: 'Il vecchio prova a scappare, ma arriva di corsa Nakamura!' },
								{ dice: 'nakamura', ja: '{nome}さん、一人で あぶないですよ！ ……けいさつです。止まって ください。', it: '{nome}, da solo è pericoloso! …Polizia. Si fermi.' },
								{ nota: 'Era meglio chiamare prima Nakamura, come diceva il piano.', it: 'Il piano diceva di telefonare subito.' }
							]
						}
					]
				},
				{ narra: 'スーツケースの 中は からでした。でも、ポケットから さいふが 三つ 出て きました。', it: 'La valigia era vuota. Ma dalle tasche escono tre portafogli.' },
				{ dice: 'suri', ja: '……すみませんでした。こんで いる 電車なら、だれも 気が つかないと 思って……。', it: '…Chiedo scusa. Pensavo che su un treno affollato nessuno se ne sarebbe accorto…' },
				{ dice: 'nakamura', ja: 'この さいふ、佐藤[さとう]さんの ご主人の です。{nome}さん、ありがとう。', it: 'Questo è il portafoglio del marito di Sato. {nome}, grazie.', taccuino: true },
				{
					domanda: {
						ja: 'すりは どうして スーツケースを 持って いましたか。', it: 'Perché il borseggiatore aveva la valigia?',
						opzioni: [{ ja: 'ドアの 前を ふさいで、こませる ため', it: 'per bloccare la porta e creare calca' }, { ja: 'さいふを 入れる ため', it: 'per metterci i portafogli' }, { ja: '東京へ りょこうする ため', it: 'per andare in viaggio a Tokyo' }, { ja: '重い ものを 運ぶ ため', it: 'per portare cose pesanti' }],
						giusta: 0, spiega: 'La valigia era vuota (あや) e lui stava davanti alla porta (佐藤). 〜ため = allo scopo di. こませる = causativo di こむ: «far affollare».'
					}
				},
				{ completa: 'cattura5' },
				{ minuti: 40 },
				{ flag: 'm5.preso' }
			]
		},
		{
			id: 'm5-d29-casa-sera', luogo: 'casa', quando: { giorno: 29, dalle: h(17), flag: ['m5.d29.casa'], nonFlag: ['m5.d29.sera'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえり。今日は かしわもちを 作ったのよ。こどもの日の おかしなの。', it: 'Bentornat{o}. Oggi ho fatto i kashiwa-mochi: il dolce della Festa dei bambini.' },
				{ flag: 'm5.d29.sera' },
				...cena(
					[
						{
							domanda: {
								ja: 'すりは どんな 人ですか。', it: 'Com’è il borseggiatore?',
								opzioni: [{ ja: 'ぼうしを かぶった おじいさん', it: 'un anziano col cappello' }, { ja: 'めがねを かけた 若[わか]い 人', it: 'un giovane con gli occhiali' }, { ja: 'スーツを 着た 女の 人', it: 'una donna in tailleur' }, { ja: 'まだ わからない', it: 'non si sa ancora' }],
								giusta: 0, spiega: 'Lo dicono 佐藤 (cappello, sandali, niente occhiali) e あや (signore anziano con la valigia).'
							}
						}
					],
					[{ se: { flag: ['m5.preso'] }, allora: [{ fine: 'ゴールデンウィークの すり' }] }]
				)
			]
		},

		// ───────── giorno 30: mercoledì 6 maggio (ふりかえ休日) ─────────
		{
			id: 'm5-d30-casa', luogo: 'casa', quando: { giorno: 30, nonFlag: ['m5.d30.casa'] },
			passi: [
				{ narra: '5月6日（水・ふりかえ休日）、朝 7時半。ゴールデンウィークの さいごの 日です。', it: 'Mercoledì 6 maggio, festivo di recupero, ore 7:30. Ultimo giorno della Golden Week.' },
				{ dice: 'mamma', ja: '日曜日が しゅくじつだった ときは、つぎの 日が 休みに なるの。ふりかえ休日って いうのよ。', it: 'Quando una festa cade di domenica, il giorno dopo è vacanza. Si chiama «furikae kyūjitsu».' },
				{
					se: { flag: ['m5.piano'], nonFlag: ['m5.preso'] },
					allora: [{ pensa: '今日こそ 10時12分の 急行で つかまえる！', it: 'Oggi lo prendo, sull’espresso delle 10:12!' }]
				},
				{ flag: 'm5.d30.casa' },
				...mattino(),
				{ minuti: 20 }
			]
		},
		{
			id: 'm5-d30-casa-sera', luogo: 'casa', quando: { giorno: 30, dalle: h(17), flag: ['m5.preso'] },
			passi: [
				{ dice: 'sato', ja: '{nome}さん！ 主人の さいふ、もどって きたのよ。ほんとうに ありがとう。', it: '{nome}! Il portafoglio di mio marito è tornato. Grazie davvero.' },
				{ dice: 'sato', ja: 'これ、りょかんの おみやげ。みずうみの 近くの おかしよ。', it: 'Questo è un souvenir del ryokan: dolci della zona del lago.' },
				{ dice: 'nakamuraTel', ja: 'もしもし、中村[なかむら]です。休みの 間、おつかれさまでした。ゴールデンウィークの さいごに いい 仕事が できましたね。', it: 'Pronto, sono Nakamura. Grazie per l’aiuto durante le vacanze. Abbiamo chiuso bene la Golden Week.' },
				...cena(
					[
						{
							domanda: {
								ja: '佐藤[さとう]さんは {nome}さんに 何を くれましたか。', it: 'Cosa ti ha dato Sato?',
								opzioni: [{ ja: 'りょかんの おみやげ', it: 'un souvenir del ryokan' }, { ja: 'さいふ', it: 'un portafoglio' }, { ja: 'かしわもち', it: 'i kashiwa-mochi' }, { ja: '時こくひょう', it: 'l’orario dei treni' }],
								giusta: 0, spiega: '〜て くれる / くれる = dare a me. I kashiwa-mochi li ha fatti la mamma; l’orario te l’ha dato Nakamura.'
							}
						},
						{
							domanda: {
								ja: '「こんで いる 電車なら、だれも 気が つかないと 思った」の 「なら」と 同じ つかい方は どれですか。', it: 'Quale «なら» è usato come in «se il treno è affollato, nessuno se ne accorge»?',
								opzioni: [{ ja: '雨なら、行きません。', it: 'Se piove, non vado.' }, { ja: '行くなら、たのみます。', it: '(なら + verbo)' }, { ja: 'なら、いいよ。', it: '(なら da solo)' }, { ja: 'すしなら 好きです。', it: '(tema: quanto al sushi)' }],
								giusta: 0, spiega: 'Nome + なら = «se si tratta di…»: こんで いる 電車なら / 雨なら. すしなら 好き è «quanto al sushi» (tema), un altro uso.'
							}
						}
					],
					[{ fine: 'ゴールデンウィークの すり' }]
				)
			]
		},
		{
			// la sera del 6 senza averlo preso: si va a dormire (il giorno dopo lo prende la polizia)
			id: 'm5-d30-casa-sera2', luogo: 'casa', quando: { giorno: 30, dalle: h(17), nonFlag: ['m5.preso', 'm5.d30.sera'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえり。あしたから また 会社ね。', it: 'Bentornat{o}. Da domani di nuovo in ufficio.' },
				{ flag: 'm5.d30.sera' },
				...cena([])
			]
		},
		{
			// rete di sicurezza: dopo la Golden Week lo prende la polizia
			id: 'm5-chiusura', luogo: 'casa', ripiego: true, quando: { giorno: [31, 32, 33, 34], nonFlag: ['m5.preso'] },
			passi: [
				{ dice: 'tv', ja: 'つぎの ニュースです。ゴールデンウィークに 山野駅で すりを して いた 男が、けいさつに つかまりました。', it: 'Prossima notizia. L’uomo che durante la Golden Week borseggiava alla stazione di Yamano è stato arrestato dalla polizia.' },
				{ dice: 'mamma', ja: '{nome}さんが しらべて いた じけんね。よかったわ。', it: 'È il caso su cui indagavi. Meno male.' },
				{ flag: 'm5.preso' },
				{ fine: 'ゴールデンウィークの すり' }
			]
		}
	]
};
