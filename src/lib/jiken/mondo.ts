// 事件 — il mondo: さくら町 (luoghi sulla mappa disegnata, orari), personaggi
// e oggetti. Kanji solo N5/N4: gli altri in kana o con furigana base[lettura]
// (nomi di persona e di luogo).
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
						{ ja: 'おにぎりと お茶を ください。', it: 'Un onigiri e un tè, per favore.', passi: [{ dice: 'commessa', ja: '280円です。あたためますか。', it: 'Sono 280 yen. Lo scaldo?' }, { io: 'いいえ、けっこうです。', it: 'No, grazie.' }, { soldi: -280 }, { minuti: 10 }] },
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
						{ ja: 'カレーライスを おねがいします。', it: 'Il riso al curry, per favore.', passi: [{ soldi: -650 }, { minuti: 40 }, { narra: 'カレーを 食べました。おいしかった！', it: 'Hai mangiato il curry. Buonissimo!' }] },
						{ ja: 'ラーメンを おねがいします。', it: 'Il ramen, per favore.', passi: [{ soldi: -700 }, { minuti: 40 }, { narra: 'ラーメンを 食べました。おなかが いっぱいです。', it: 'Hai mangiato il ramen. Sei sazi{o}.' }] },
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
		id: 'posta', nome: '郵便局[ゆうびんきょく]', it: 'ufficio postale', icona: '🏣', sfondo: 'posta', x: 29.1, y: 73,
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
		ambiente: [{ se: { oggetti: ['portafoglio'] }, allora: [{ dice: 'ito', ja: 'いらっしゃいませ。コーヒーで いいですか。', it: 'Benvenut{o}. Un caffè va bene?' }, { minuti: 30 }, { soldi: -400 }, { narra: 'コーヒーを 飲みました（400円）。30分 休みました。', it: 'Bevi un caffè (400 yen). Mezz’ora di pausa.' }], altrimenti: [{ narra: 'あっ、さいふが ない！ これでは 何も 買えません。', it: 'Ah, il portafoglio non c’è! Così non puoi comprare niente.' }] }]
	},
	{
		id: 'apartment', nome: '木村[きむら]アパート', it: 'condominio Kimura', icona: '🏢', sfondo: 'condominio', x: 87.2, y: 47,
		ambiente: [{ narra: 'アパートの 入り口です。けいじばんに ごみの 出し方の お知らせが あります。', it: 'L’ingresso del condominio. Sulla bacheca, un avviso sulla raccolta dei rifiuti.' }]
	},
	{
		id: 'eki', nome: 'さくら町駅', it: 'stazione di Sakura-chō', icona: '🚉', sfondo: 'stazione', x: 76.3, y: 87.2,
		ambiente: [{ narra: '電車は 山野の 町の 中と 東京へ 行きます。今は 行く 用事が ありません。ほかの 町には ミッションで 行けるように なります。', it: 'I treni vanno verso il centro di Yamano e verso Tokyo. Per ora non hai motivo di partire: altri quartieri si apriranno con le missioni.' }]
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
export const LUOGO = Object.fromEntries(LUOGHI.map((l) => [l.id, l])) as Record<LuogoId, Luogo>;

export const PERSONAGGI: Record<string, Personaggio> = {
	mamma: { nome: 'お母さん', sprite: 'mamma', voce: 'F' },
	papa: { nome: 'お父さん', sprite: 'papa', voce: 'M' },
	mori: { nome: '森[もり]ぶちょう', sprite: 'capo_donna', voce: 'F' },
	suzuki: { nome: '鈴木[すずき]さん', sprite: 'collega_donna', voce: 'F' },
	tanaka: { nome: '田中さん', sprite: 'collega_uomo', voce: 'M' },
	commessa: { nome: '店員', sprite: 'commessa_konbini', voce: 'F' },
	oste: { nome: '店の 人', sprite: 'cameriere', voce: 'M' },
	postino: { nome: '郵便局[ゆうびんきょく]の 人', sprite: 'commesso', voce: 'M' },
	fornaia: { nome: 'パン屋の 人', sprite: 'panettiera', voce: 'F' },
	fioraia: { nome: '花屋の 人', sprite: 'fioraia', voce: 'F' },
	nakamura: { nome: '中村[なかむら]さん', sprite: 'ispettore', voce: 'M' },
	nakamuraTel: { nome: '中村[なかむら]さん（電話）', sprite: null, voce: 'M' },
	telefono: { nome: '電話の 人', sprite: null, voce: 'M' },
	kimura: { nome: '木村[きむら]さん', sprite: 'padrone', voce: 'M' },
	nonna: { nome: '木村[きむら]さんの お母さん', sprite: 'signora_anziana', voce: 'F' },
	yamada: { nome: '山田[やまだ]さん（ABC）', sprite: 'passante', voce: 'M' },
	mike: { nome: 'ミケ', sprite: 'mike', voce: 'F' },
	takahashi: { nome: '高橋[たかはし]くん', sprite: 'studente_uomo', voce: 'M' },
	sensei: { nome: '山田先生', sprite: 'insegnante_donna', voce: 'F' },
	ito: { nome: '伊藤[いとう]さん', sprite: 'cameriere', voce: 'M' }
};

export const OGGETTI: Record<string, { it: string; ja: string }> = {
	portafoglio: { it: 'portafoglio', ja: 'さいふ' },
	busta: { it: 'busta coi documenti da spedire', ja: 'しょるい' },
	ricevuta_posta: { it: 'ricevuta della posta', ja: '郵便局[ゆうびんきょく]の レシート' },
	scontrino: { it: 'scontrino della konbini', ja: 'コンビニの レシート' },
	latte: { it: 'latte', ja: 'ぎゅうにゅう' },
	sacchetto_pane: { it: 'pane per regalo', ja: 'パン' },
	mazzo_fiori: { it: 'mazzo di fiori', ja: '花' },
	foto_gatto: { it: 'foto di Miké', ja: 'ミケの 写真' },
	volantino_gatto: { it: 'volantini di Miké', ja: 'ミケの ポスター' },
	collare: { it: 'collare rosso col campanellino', ja: '赤い くびわ' }
};
// icone degli oggetti (static/giorno/oggetti); quelli senza disegno usano un'emoji
const ICONA_FILE: Record<string, string> = { busta: 'lettera' };
export const iconaOggetto = (id: string): string => ICONA_FILE[id] ?? id;
