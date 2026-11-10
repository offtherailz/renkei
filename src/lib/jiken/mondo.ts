// 事件 — il mondo: さくら町 (luoghi sulla mappa disegnata, orari), personaggi
// e oggetti. Kanji solo N5/N4: gli altri in kana o con furigana base[lettura]
// (nomi di persona e di luogo).
import { CHIACCHIERE } from './chiacchiere';
import type { Luogo, LuogoId, Personaggio } from './tipi';

const h = (ore: number, min = 0): number => ore * 60 + min;
const FERIALI = [0, 1, 2, 3, 4];

export const LUOGHI: Luogo[] = [
	{
		id: 'casa', nome: '吉田[よしだ]さんの 家', it: 'casa della famiglia Yoshida', icona: '🏠', sfondo: 'casa', x: 68.3, y: 36.5,
		ambiente: [
			{ dice: 'mamma', ja: 'あら、{nome}さん。どう したの？', it: 'Oh, {nome}. Che succede?' },
			{
				scelta: [
					{ ja: 'ちょっと 休みます。', it: 'Mi riposo un po’ (fino a sera).', passi: [{ ora: 18 * 60 }, { narra: '夕方まで 家で 休みました。', it: 'Ti riposi a casa fino a sera.' }] },
					{
						ja: 'もう ねます。', it: 'Vado a dormire.',
						passi: [{ se: { dalle: 20 * 60 }, allora: [{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' }, { dormi: true }], altrimenti: [{ dice: 'mamma', ja: 'え？ まだ 早いでしょう。', it: 'Eh? È ancora presto, no?' }] }]
					},
					{ ja: 'ちょっと 出かけます。', it: 'Esco un attimo.', passi: [{ dice: 'mamma', ja: 'いって らっしゃい。', it: 'Vai pure.' }] }
				]
			}
		]
	},
	{
		id: 'ufficio', nome: 'さくら会社', it: 'la ditta Sakura (ufficio)', icona: '🏢', sfondo: 'ufficio', x: 27.3, y: 56.6,
		orario: { giorni: FERIALI, fasce: [[h(7), h(20)]] },
		ambiente: [{ dice: 'suzuki', ja: '{nome}さん、おつかれさまです。', it: 'Buon lavoro, {nome}.' }, { narra: 'みんな 自分の 仕事を して います。', it: 'In ufficio ognuno è al suo lavoro.' }]
	},
	{
		id: 'konbini', nome: 'ハッピーマート', it: 'konbini Happy Mart', icona: '🏪', sfondo: 'konbini', x: 94.1, y: 64.5,
		ambiente: [
			{
				se: { oggetti: ['portafoglio'] },
				allora: [
				{ dice: 'commessa', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{
					scelta: [
						{ ja: 'おにぎりと お茶を ください。', it: 'Un onigiri e un tè, per favore.', passi: [{ se: { soldiMin: 280 }, allora: [{ dice: 'commessa', ja: '280円です。あたためますか。', it: 'Sono 280 yen. Lo scaldo?' }, { io: 'いいえ、けっこうです。', it: 'No, grazie.' }, { soldi: -280 }, { minuti: 10 }], altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }] }] },
						{ ja: 'すみません、見て いる だけです。', it: 'Scusi, sto solo guardando.', passi: [{ minuti: 5 }] }
					]
				}
				],
				altrimenti: [{ narra: 'あっ、さいふが ない！ これでは 何も 買えません。', it: 'Ah, il portafoglio non c’è! Così non puoi comprare niente.' }]
			}
		]
	},
	{
		id: 'shokudo', nome: 'ふじ食堂', it: 'trattoria Fuji', icona: '🍱', sfondo: 'ristorante', x: 69.4, y: 65.5,
		orario: { fasce: [[h(11), h(15)], [h(17), h(21)]] },
		ambiente: [
			{
				se: { oggetti: ['portafoglio'] },
				allora: [
				{ dice: 'oste', ja: 'いらっしゃいませ。何に しますか。', it: 'Benvenut{o}. Cosa prende?' },
				{
					scelta: [
						{ ja: 'カレーライスを おねがいします。', it: 'Il riso al curry, per favore.', passi: [{ se: { soldiMin: 650 }, allora: [{ soldi: -650 }, { minuti: 40 }, { narra: 'カレーを 食べました。おいしかった！', it: 'Hai mangiato il curry. Buonissimo!' }], altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }] }] },
						{ ja: 'ラーメンを おねがいします。', it: 'Il ramen, per favore.', passi: [{ se: { soldiMin: 700 }, allora: [{ soldi: -700 }, { minuti: 40 }, { narra: 'ラーメンを 食べました。おなかが いっぱいです。', it: 'Hai mangiato il ramen. Sei sazi{o}.' }], altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }] }] },
						{ ja: 'すみません、また 来ます。', it: 'Scusi, ripasso.' }
					]
				},
				{ dice: 'oste', ja: 'ありがとうございました。', it: 'Grazie.' }
				],
				altrimenti: [{ narra: 'あっ、さいふが ない！ これでは 何も 買えません。', it: 'Ah, il portafoglio non c’è! Così non puoi comprare niente.' }]
			}
		]
	},
	{
		id: 'posta', nome: 'ゆうびんきょく', it: 'ufficio postale', icona: '🏣', sfondo: 'posta', x: 29.1, y: 73,
		orario: { giorni: FERIALI, fasce: [[h(9), h(17)]] },
		ambiente: [{ dice: 'postino', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' }, { narra: '送る ものは ありません。', it: 'Non hai niente da spedire.' }]
	},
	{
		id: 'panya', nome: 'パン屋', it: 'panetteria', icona: '🥐', sfondo: 'panetteria', x: 77.4, y: 65,
		orario: { fasce: [[h(7), h(19)]] },
		ambiente: [{ dice: 'fornaia', ja: 'いらっしゃいませ。やきたての パンが ありますよ。', it: 'Benvenut{o}. Abbiamo pane appena sfornato.' }]
	},
	{
		id: 'hanaya', nome: '花屋', it: 'fioraio', icona: '💐', sfondo: 'fioraio', x: 85.4, y: 65,
		orario: { fasce: [[h(10), h(19)]] },
		ambiente: [{ dice: 'fioraia', ja: 'いらっしゃいませ。きれいな 花が ありますよ。', it: 'Benvenut{o}. Abbiamo bei fiori.' }]
	},
	{
		id: 'koban', nome: '交番[こうばん]', it: 'posto di polizia', icona: '👮', sfondo: 'koban', x: 42.5, y: 80.7,
		ambiente: [{ narra: 'おまわりさんは 自転車で 出かけて います。けいじばんに おとしものの お知らせが はって あります。', it: 'Il poliziotto di turno è fuori in bicicletta. Sulla bacheca ci sono avvisi di oggetti smarriti.' }]
	},
	{
		id: 'parco', nome: 'さくら公園[こうえん]', it: 'parco Sakura', icona: '🌸', sfondo: 'parco', x: 53.8, y: 53.4,
		ambiente: [{ narra: 'さくらが さいて います。木の 下で お花見を して いる 人が います。', it: 'I ciliegi sono in fiore. Qualcuno fa un picnic sotto gli alberi (お花見).' }]
	},
	{
		id: 'gakkou', nome: '日本語学校', it: 'scuola di giapponese (sera)', icona: '🏫', sfondo: 'scuola', x: 39.2, y: 32.5,
		orario: { giorni: [0, 2, 4], fasce: [[h(18), h(21)]] },
		ambiente: [{ narra: '夜の クラスの 学生が います。じゅぎょうが もうすぐ 始まります。', it: 'In classe ci sono gli studenti della sera. La lezione sta per cominciare.' }]
	},
	{
		id: 'kissa', nome: '喫茶[きっさ]あおい', it: 'caffè Aoi', icona: '☕', sfondo: 'cafe', x: 96.8, y: 46.5,
		orario: { giorni: [0, 1, 3, 4, 5, 6], fasce: [[h(7), h(20)]] },
		ambiente: [{ se: { oggetti: ['portafoglio'], soldiMin: 400 }, allora: [{ dice: 'ito', ja: 'いらっしゃいませ。コーヒーで いいですか。', it: 'Benvenut{o}. Un caffè va bene?' }, { minuti: 30 }, { soldi: -400 }, { narra: 'コーヒーを 飲みました（400円）。30分 休みました。', it: 'Bevi un caffè (400 yen). Mezz’ora di pausa.' }], altrimenti: [{ narra: 'あっ、さいふが ない！ これでは 何も 買えません。', it: 'Ah, il portafoglio non c’è! Così non puoi comprare niente.' }] }]
	},
	{
		id: 'apartment', nome: '木村[きむら]アパート', it: 'condominio Kimura', icona: '🏢', sfondo: 'condominio', x: 87.2, y: 47,
		ambiente: [{ narra: 'アパートの 入り口です。けいじばんに ごみの 出し方の お知らせが あります。', it: 'L’ingresso del condominio. Sulla bacheca, un avviso sulla raccolta dei rifiuti.' }]
	},
	{
		id: 'eki', nome: 'さくら町駅', it: 'stazione di Sakura-chō', icona: '🚉', sfondo: 'tornelli', x: 76.3, y: 87.2,
		ambiente: [{ narra: '電車は 山野駅（町の 中）と 東京へ 行きます。電車に 乗るには ICカードが いります。', it: 'I treni vanno a Yamano (il centro) e verso Tokyo. Per salire serve la carta IC.' }]
	},
	// ───── 山野駅前 (centro): si arriva in treno
	{
		id: 'eki2', nome: '山野駅', it: 'stazione di Yamano', icona: '🚉', quartiere: 'ekimae', sfondo: 'stazione', x: 50.1, y: 86,
		ambiente: [{ narra: '山野駅です。人が たくさん います。ここから さくら町へ 帰れます。', it: 'Stazione di Yamano. C’è tanta gente. Da qui puoi tornare a Sakura-chō.' }]
	},
	{
		id: 'hotel', nome: 'ホテル みどり', it: 'Hotel Midori', icona: '🏨', quartiere: 'ekimae', sfondo: 'hotel', x: 17.1, y: 24.7,
		ambiente: [{ dice: 'hotelstaff', ja: 'いらっしゃいませ。ごよやくの おきゃくさまですか。', it: 'Benvenut{o}. Ha una prenotazione?' }, { io: 'いいえ、ちょっと 見て いる だけです。', it: 'No, sto solo guardando.' }]
	},
	{
		id: 'gamecenter', nome: 'ゲームセンター', it: 'sala giochi', icona: '🕹️', quartiere: 'ekimae', sfondo: 'sala_giochi', x: 21.8, y: 56,
		orario: { fasce: [[h(10), h(23)]] },
		// niente ambiente: senza scene della storia si apre il menù dei giochi (SalaGiochi.svelte)
	},
	{
		id: 'depa', nome: 'デパート', it: 'grande magazzino', icona: '🏬', quartiere: 'ekimae', sfondo: 'grande_magazzino', x: 58.9, y: 33.9,
		orario: { fasce: [[h(10), h(20)]] },
		ambiente: [{ narra: 'デパートの 一かいです。けしょうひんと おみやげの 店が あります。', it: 'Piano terra del grande magazzino: cosmetici e souvenir.' }]
	},
	{
		id: 'banca', nome: '銀行', it: 'banca', icona: '🏦', quartiere: 'ekimae', sfondo: 'banca', x: 33.4, y: 43,
		orario: { giorni: FERIALI, fasce: [[h(9), h(15)]] },
		ambiente: [{ narra: '銀行です。今は 用事が ありません。', it: 'La banca. Per ora non hai niente da fare qui.' }]
	},
	{
		id: 'ospedale', nome: '病院', it: 'ospedale', icona: '🏥', quartiere: 'ekimae', sfondo: 'ospedale', x: 30.5, y: 16.9,
		ambiente: [{ narra: '大きい 病院です。病気では ないので、入りません。', it: 'Un grande ospedale. Non sei malat{o}, quindi non entri.' }]
	},
	{
		id: 'museo', nome: '山野びじゅつかん[やまのびじゅつかん]', it: 'museo di Yamano', icona: '🏛️', quartiere: 'ekimae', sfondo: 'museo', x: 69.8, y: 43,
		// si apre con la missione 4 (m4.museo), poi resta aperto (museo.aperto); chiuso il lunedì
		orario: { giorni: [1, 2, 3, 4, 5, 6], fasce: [[h(9, 30), h(17)]] },
		bloccato: { nonFlag: ['museo.aperto', 'm4.museo'] }, perche: { ja: '今は しまって います（工事中）', it: 'per ora è chiuso (lavori)' },
		ambiente: [{ narra: 'びじゅつかんです。青木[あおき]さんの てんらんかい「さくらと ねこ」を やって います。', it: 'Il museo. C’è la mostra «Sakura e gatto» di Aoki.' }]
	},
	{
		id: 'ramen', nome: 'ラーメン屋', it: 'ramen-ya', icona: '🍜', quartiere: 'ekimae', sfondo: 'ristorante', x: 80, y: 49.5,
		orario: { fasce: [[h(11), h(23)]] },
		ambiente: [
			{
				se: { oggetti: ['portafoglio'], soldiMin: 800 },
				allora: [{ dice: 'oste', ja: 'いらっしゃい！ しょうゆラーメン、800円です。', it: 'Benvenut{o}! Ramen allo shoyu, 800 yen.' }, { soldi: -800 }, { minuti: 30 }, { narra: 'あつい ラーメンを 食べました。', it: 'Hai mangiato un ramen bollente.' }],
				altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }]
			}
		]
	},
	{
		id: 'jinja', nome: '山の神社[じんじゃ]', it: 'santuario della collina', icona: '⛩', sfondo: 'jinja', x: 64, y: 14.3,
		bloccato: { nonFlag: ['jinja.aperto'] }, perche: { ja: 'ミッションで 行けるように なります', it: 'si apre con una missione' }
	},
	{
		id: 'tera', nome: 'お寺[てら]', it: 'tempio buddista', icona: '🛕', sfondo: 'tera', x: 13.8, y: 19.5,
		bloccato: { nonFlag: ['tera.aperto'] }, perche: { ja: 'あとで 行けるように なります', it: 'si apre più avanti' }
	}
];
// chiacchiere dei luoghi (src/lib/jiken/chiacchiere.ts)
for (const l of LUOGHI) l.chiacchiere = CHIACCHIERE[l.id];
export const LUOGO = Object.fromEntries(LUOGHI.map((l) => [l.id, l])) as Record<LuogoId, Luogo>;

export const PERSONAGGI: Record<string, Personaggio> = {
	mamma: { nome: 'お母さん', sprite: 'mamma', voce: 'F', yomi: 'おかあさん', chi: { ja: '吉田[よしだ]さんの 家の お母さん。やさしくて、りょうりが 上手です。', it: 'La mamma della famiglia Yoshida, che ti ospita. Gentile, e cucina benissimo.' } },
	papa: { nome: 'お父さん', sprite: 'papa', voce: 'M', yomi: 'おとうさん', chi: { ja: '吉田[よしだ]さんの 家の お父さん。町の 地図を くれました。', it: 'Il papà Yoshida. Ti ha dato la piantina del quartiere.' } },
	mori: { nome: '森[もり]ぶちょう', sprite: 'capo_donna', voce: 'F', yomi: 'もりぶちょう', chi: { ja: 'さくら会社の ぶちょう。きびしいですが、仕事を よく 見て います。', it: 'La tua responsabile alla さくら会社. Esigente, ma attenta a come lavori.' } },
	suzuki: { nome: '鈴木[すずき]さん', sprite: 'collega_donna', voce: 'F', yomi: 'すずきさん', chi: { ja: '会社の せんぱい。仕事が 早くて、ちょっと きびしいです。', it: 'Collega più esperta: veloce sul lavoro, un po’ severa.' } },
	tanaka: { nome: '田中さん', sprite: 'collega_uomo', voce: 'M', yomi: 'たなかさん', chi: { ja: '会社の どうりょう。明るい 人ですが、ときどき わすれものを します。', it: 'Collega allegro, ma ogni tanto dimentica le cose.' } },
	commessa: { nome: '店員', sprite: 'commessa_konbini', voce: 'F', yomi: 'てんいん', chi: { ja: 'コンビニ「ハッピーマート」の 店員さん。何でも よく 見て います。', it: 'La commessa della konbini Happy Mart. Nota tutto.' } },
	oste: { nome: '店の 人', sprite: 'cameriere', voce: 'M', yomi: 'みせの ひと', chi: { ja: 'ふじ食堂と ラーメン屋の 店の 人。', it: 'Il gestore di ふじ食堂 e del ramen-ya.' } },
	postino: { nome: 'ゆうびんきょくの 人', sprite: 'commesso', voce: 'M', yomi: 'ゆうびんきょくの ひと', chi: { ja: 'ゆうびんきょくの まどぐちの 人。', it: 'L’impiegato allo sportello della posta.' } },
	fornaia: { nome: 'パン屋の 人', sprite: 'panettiera', voce: 'F', yomi: 'パンやの ひと', chi: { ja: 'パン屋の 店員さん。', it: 'La ragazza della panetteria.' } },
	fioraia: { nome: '花屋の 人', sprite: 'fioraia', voce: 'F', yomi: 'はなやの ひと', chi: { ja: '花屋の 店員さん。', it: 'La fioraia.' } },
	nakamura: { nome: '中村[なかむら]さん', sprite: 'ispettore', voce: 'M', yomi: 'なかむらさん', chi: { ja: 'けいさつの 人。町の ふしぎな じけんを しらべて いて、{nome}さんに 手つだいを たのみます。', it: 'Ispettore di polizia. Indaga sui piccoli misteri del quartiere e chiede il tuo aiuto.' } },
	nakamuraTel: { nome: '中村[なかむら]さん（電話）', sprite: null, voce: 'M', stesso: 'nakamura' },
	telefono: { nome: '電話の 人', sprite: null, voce: 'M' },
	// la TV: in scena il salotto inquadrato sul televisore (sfondi/tv_salotto.png, schermo
	// trasparente) con l'annunciatrice dietro lo schermo (ritratti/annunciatrice-*.png)
	tv: { nome: 'テレビ', sprite: 'annunciatrice', voce: 'F', schermo: true },
	hayashi: { nome: '林[はやし]さん（うけつけ）', sprite: 'receptionist', voce: 'F', yomi: 'はやしさん', chi: { ja: '会社の うけつけの 人。だれが 来て、だれが 出たか よく おぼえて います。', it: 'La receptionist della ditta. Ricorda bene chi entra e chi esce.' } },
	hotelstaff: { nome: 'ホテルの 人', sprite: 'commesso', voce: 'M', yomi: 'ホテルの ひと', chi: { ja: 'ホテル みどりの 人。', it: 'L’addetto dell’Hotel Midori.' } },
	commessa_sg: { nome: 'ゲームセンターの 人', sprite: 'commessa_sg', voce: 'F', yomi: 'ゲームセンターの ひと', chi: { ja: '山野駅[やまのえき]の 前の ゲームセンターの 店員さん。', it: 'La commessa della sala giochi davanti alla stazione di Yamano.' } },
	kimura: { nome: '木村[きむら]さん', sprite: 'capo_uomo', voce: 'M', yomi: 'きむらさん', chi: { ja: 'アパートの 大家さん。お母さんと いっしょに 住んで います。', it: 'Il padrone del condominio. Vive con sua madre.' } },
	nonna: { nome: '木村[きむら]さんの お母さん', sprite: 'signora_anziana', voce: 'F', yomi: 'きむらさんの おかあさん', chi: { ja: 'ねこの ミケを とても かわいがって います。', it: 'Adora la sua gatta Miké.' } },
	yamada: { nome: '山田[やまだ]さん（ABC）', sprite: 'passante', voce: 'M', yomi: 'やまださん', chi: { ja: 'ABCの 人。さくら会社の 大切な おきゃくさんです。', it: 'Della ditta ABC: un cliente importante per la さくら会社.' } },
	mike: { nome: 'ミケ', sprite: 'mike', voce: 'F', yomi: 'ミケ', chi: { ja: '木村さんの ねこ。白と 茶色と 黒の 小さい ねこです。', it: 'La gatta dei Kimura: piccola, bianca, marrone e nera.' } },
	takahashi: { nome: '高橋[たかはし]くん', sprite: 'studente_uomo', voce: 'M', yomi: 'たかはしくん', chi: { ja: '高校生。日本語学校で 手つだいを して います。{nome}さんの さいふを ひろって くれました。', it: 'Liceale, aiuta alla scuola di giapponese. Ha trovato il tuo portafoglio.' } },
	sensei: { nome: '山田先生', sprite: 'insegnante_donna', voce: 'F', yomi: 'やまだせんせい', chi: { ja: '日本語学校の 先生。', it: 'L’insegnante della scuola di giapponese.' } },
	ito: { nome: '伊藤[いとう]さん', sprite: 'cameriere', voce: 'M', yomi: 'いとうさん', chi: { ja: '喫茶[きっさ]あおいの 店の 人。町の うわさを よく 知って います。', it: 'Il gestore del caffè あおい. Conosce tutte le voci del quartiere.' } },
	// abitanti del quartiere (chiacchiere dei luoghi)
	bancario: { nome: '銀行の 人', sprite: 'commesso', voce: 'M', yomi: 'ぎんこうの ひと', chi: { ja: '山野[やまの]の 銀行の まどぐちの 人。', it: 'L’impiegato allo sportello della banca di Yamano.' } },
	sato: { nome: '佐藤[さとう]さん', sprite: 'amica', voce: 'F', yomi: 'さとうさん', chi: { ja: '吉田[よしだ]さんの 家の 近所に 住んで いる 人。よく 話しかけて きます。', it: 'Vicina di casa degli Yoshida. Attacca sempre bottone.' } },
	aya: { nome: 'あやさん', sprite: 'studentessa', voce: 'F', yomi: 'あやさん', chi: { ja: '大学生。日本語学校で 高橋[たかはし]くんと いっしょに 手つだいを して います。', it: 'Studentessa universitaria. Aiuta alla scuola di giapponese con Takahashi.' } },
	dottoressa: { nome: 'お医者さん', sprite: 'medico', voce: 'F', yomi: 'おいしゃさん', chi: { ja: '山野[やまの]の 病院の お医者さん。', it: 'La dottoressa dell’ospedale di Yamano.' } },
	// missione 4 (美術館の 事件)
	aoki: { nome: '青木[あおき]さん', sprite: 'pittrice', voce: 'F', yomi: 'あおきさん', chi: { ja: 'えを かく 人。「さくらと ねこ」の えを かきました。', it: 'Pittrice: ha dipinto il quadro «Sakura e gatto».' } },
	kobayashi: { nome: '小林[こばやし]さん', sprite: 'curatore', voce: 'M', yomi: 'こばやしさん', chi: { ja: 'びじゅつかんの かかりの 人。いつも いそがしいです。', it: 'Il curatore del museo. Sempre indaffarato.' } },
	guardia: { nome: 'けいびの 人', sprite: 'custode', voce: 'F', yomi: 'けいびの ひと', chi: { ja: 'びじゅつかんの けいびの 人。', it: 'La guardia del museo.' } },
	pulizie: { nome: 'そうじの 人', sprite: 'addetta_pulizie', voce: 'F', yomi: 'そうじの ひと', chi: { ja: 'びじゅつかんを そうじする わかい 女の 人。いつも 元気です。', it: 'La giovane addetta alle pulizie del museo. Sempre allegra.' } }
};

export const OGGETTI: Record<string, { it: string; ja: string }> = {
	portafoglio: { it: 'portafoglio', ja: 'さいふ' },
	busta: { it: 'busta coi documenti da spedire', ja: 'しょるい' },
	ricevuta_posta: { it: 'ricevuta della posta', ja: 'ゆうびんきょくの レシート' },
	scontrino: { it: 'scontrino della konbini', ja: 'コンビニの レシート' },
	latte: { it: 'latte', ja: 'ぎゅうにゅう' },
	sacchetto_pane: { it: 'pane per regalo', ja: 'パン' },
	mazzo_fiori: { it: 'mazzo di fiori', ja: '花' },
	foto_gatto: { it: 'foto di Miké', ja: 'ミケの 写真' },
	volantino_gatto: { it: 'volantini di Miké', ja: 'ミケの ポスター' },
	collare: { it: 'collare rosso col campanellino', ja: '赤い くびわ' },
	scontrino_copie: { it: 'scontrino delle fotocopie (konbini, 19:30)', ja: 'コピーの レシート' },
	cartellina: { it: 'il documento per il cliente', ja: '資料[しりょう]' },
	carta_ic2: { it: 'carta IC', ja: 'ICカード' },
	memo_aoki: { it: 'il biglietto di Aoki (dietro il cartello)', ja: '青木[あおき]さんの メモ' }
};
// icone degli oggetti (static/giorno/oggetti); quelli senza disegno usano un'emoji
const ICONA_FILE: Record<string, string> = { busta: 'lettera', scontrino_copie: 'scontrino', memo_aoki: 'lettera' };
export const iconaOggetto = (id: string): string => ICONA_FILE[id] ?? id;
