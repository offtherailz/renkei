// Missione 3 — 消えた 資料[しりょう] (il documento sparito). Tre giornate: 4/20-4/22.
// Il primo vero giallo, in ufficio. Forme: 自動詞/他動詞 (こわれる/こわす,
// なくなる/なくす), 〜て いる / 〜て ある / 〜て おく (chi ha messo cosa, e se
// c'era davvero). Finale: la riunione si sposta alla ホテル みどり → carta IC,
// treno, secondo quartiere (山野駅前).
import type { Missione, Passo } from '../tipi';
import { arrivo, rientro } from './comune';

const h = (ore: number, min = 0): number => ore * 60 + min;

const cena = (domande: Passo[], dopo: Passo[] = []): Passo[] => [
	{ narra: 'ねる 前に、今日の ことを 思い出します。ノートも 見て ください。', it: 'Prima di dormire ripensi alla giornata. Il taccuino ti aiuta.' },
	...domande,
	...dopo,
	{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' },
	{ dormi: true }
];

export const M3: Missione = {
	id: 'm3',
	titolo: '消[き]えた 資料[しりょう]',
	it: 'Il documento sparito',
	epilogo: {
		ja: '資料[しりょう]が 見つかって、ホテルでの かいぎも うまく いきました。電車で 山野駅[やまのえき]の 町へも 行けるように なりました。',
		it: 'Il documento è stato ritrovato e la riunione in hotel è andata bene. Ora puoi andare in treno anche in centro, a 山野駅前.'
	},
	inizio: { giorno: 14, flag: ['d0.casa', 'portafoglio.ok', 'grazie.ok', 'mike.ok', 'jinja.aperto'] },
	scene: [
		// ───────── giorno 14: lunedì 20 aprile ─────────
		{
			id: 'm3-d14-casa', luogo: 'casa', quando: { giorno: 14, nonFlag: ['m3.d14.casa'] },
			passi: [
				{ narra: '4月20日（月）、朝 7時半。', it: 'Lunedì 20 aprile, ore 7:30.' },
				{ dice: 'papa', ja: '今週は 会社で 大切な かいぎが あるんだって？ がんばってね。', it: 'Ho sentito che questa settimana in ditta c’è una riunione importante. Forza!' },
				{ flag: 'm3.d14.casa' },
				{ minuti: 20 }, // colazione e preparativi: si esce verso le 7:50
			]
		},
		{
			id: 'm3-d14-ufficio', luogo: 'ufficio', quando: { giorno: 14, nonFlag: ['m3.d14.ufficio'] },
			passi: [
				arrivo(),
				{ dice: 'mori', ja: 'おはようございます。水曜日の 10時に、ABCの 山田[やまだ]さんと 大切な かいぎが あります。', it: 'Buongiorno. Mercoledì alle 10 c’è una riunione importante con Yamada della ABC.' },
				{ dice: 'mori', ja: 'この 資料[しりょう]は とても 大切です。水曜日まで、わたしの つくえの 上に おいて おきますね。', it: 'Questo documento è molto importante. Fino a mercoledì lo lascio sulla mia scrivania.', taccuino: true },
				{ dice: 'suzuki', ja: 'あ、ぶちょう。コピーきが けさから こわれて いるんです。なおるのは 水曜日の 午後だ そうです。', it: 'Ah, responsabile: la fotocopiatrice è rotta da stamattina. Dicono che la aggiustano mercoledì pomeriggio.', taccuino: true },
				{
					domanda: {
						ja: 'コピーきは どう なって いますか。', it: 'Com’è la fotocopiatrice?',
						opzioni: [{ ja: 'けさから こわれて いる', it: 'è rotta da stamattina' }, { ja: 'だれかが けさ こわした', it: 'qualcuno l’ha rotta stamattina' }, { ja: '水曜日に こわれる', it: 'si romperà mercoledì' }, { ja: 'もう なおった', it: 'è già aggiustata' }],
						giusta: 0, spiega: '「こわれて いる」: こわれる (intransitivo) + ている = è rotta (stato). 「こわした」 (transitivo こわす) vorrebbe dire che qualcuno l’ha rotta.'
					}
				},
				{ dice: 'mori', ja: 'こまりましたね。田中さん、あしたの 朝までに 資料[しりょう]を 10まい コピーして おいて ください。', it: 'Che guaio. Tanaka, entro domattina faccia 10 copie del documento.' },
				{ dice: 'tanaka', ja: 'はい、わかりました。……でも、コピーきが……。', it: 'Sì, va bene. …Però la fotocopiatrice…' },
				{ ora: h(12) },
				{ flag: 'm3.d14.ufficio' }
			]
		},
		{
			id: 'm3-d14-pomeriggio', luogo: 'ufficio', quando: { giorno: 14, dalle: h(12, 30), flag: ['m3.d14.ufficio'] },
			passi: [
				rientro(),
				{ dice: 'hayashi', ja: '{nome}さん、うけつけの 林[はやし]です。山田さんから ファックスが とどいて いますよ。', it: '{nome}, sono Hayashi della reception. È arrivato un fax da Yamada.' },
				{ narra: 'ファックス：「水曜日の かいぎは 10時から 11時半まで。しりょうは 10まい おねがいします。」', it: 'Il fax: «La riunione di mercoledì è dalle 10 alle 11:30. Servono 10 copie del materiale.»' },
				{
					domanda: {
						ja: 'かいぎは 何時に 終わりますか。', it: 'A che ora finisce la riunione?',
						opzioni: [{ ja: '10時', it: 'alle 10' }, { ja: '11時', it: 'alle 11' }, { ja: '11時半', it: 'alle 11:30' }, { ja: '12時', it: 'alle 12' }],
						giusta: 2, spiega: '「10時から 11時半まで」: 〜から〜まで; 半 = e mezza.'
					}
				},
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'おつかれさまでした。わたしは 今日は 6時に 帰ります。', it: 'Buon lavoro. Oggi vado via alle 18.' },
				{ flag: 'm3.d14.lavoro' }
			]
		},
		{
			id: 'm3-d14-casa-sera', luogo: 'casa', quando: { giorno: 14, dalle: h(17), flag: ['m3.d14.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				...cena([
					{
						domanda: {
							ja: '森[もり]ぶちょうは 資料[しりょう]を どこに おいて おきますか。', it: 'Dove lascia il documento Mori?',
							opzioni: [{ ja: 'じぶんの つくえの 上', it: 'sulla sua scrivania' }, { ja: 'コピーきの 中', it: 'nella fotocopiatrice' }, { ja: 'うけつけ', it: 'alla reception' }, { ja: 'かいぎしつ', it: 'in sala riunioni' }],
							giusta: 0, spiega: '「わたしの つくえの 上に おいて おきますね」: 〜て おく = lasciare (apposta, per dopo).'
						}
					}
				])
			]
		},

		// ───────── giorno 15: martedì 21 aprile ─────────
		{
			id: 'm3-d15-casa', luogo: 'casa', quando: { giorno: 15, nonFlag: ['m3.d15.casa'] },
			passi: [
				{ narra: '4月21日（火）、朝 7時半。', it: 'Martedì 21 aprile, ore 7:30.' },
				{ flag: 'm3.d15.casa' },
				{ minuti: 20 }, // colazione e preparativi: si esce verso le 7:50
			]
		},
		{
			id: 'm3-d15-ufficio', luogo: 'ufficio', quando: { giorno: 15, nonFlag: ['m3.sparito'] },
			passi: [
				arrivo(),
				{ dice: 'mori', faccia: 'preoccupata', ja: 'たいへん！ つくえの 上に おいて あった 資料[しりょう]が ありません！', it: 'Che disastro! Il documento che era sulla mia scrivania non c’è più!', taccuino: true },
				{ dice: 'nakamura', faccia: 'pensieroso', ja: 'おはようございます。ちょうど 近くに いたので、よって みました。……なるほど、資料[しりょう]が なくなったんですね。', it: 'Buongiorno. Ero qui vicino e sono passato. …Capisco, è sparito un documento.' },
				{ dice: 'nakamura', ja: '{nome}さん、みんなの 話を 聞いて みて ください。わたしは 外で 待って います。', it: '{nome}, provi a sentire tutti. Io aspetto fuori.' },
				{ nota: '「なくなった」(じどうし) は ものが 見えなく なった こと。だれかが 「なくした」(たどうし) かどうかは まだ わかりません。', it: '「なくなった」 (intransitivo) = è sparito; se qualcuno l’abbia perso, 「なくした」 (transitivo), ancora non si sa.' },
				{ obiettivo: 'tanaka', ja: '田中さんの 話を 聞く。', it: 'Sentire Tanaka.' },
				{ obiettivo: 'suzuki', ja: '鈴木[すずき]さんの 話を 聞く。', it: 'Sentire Suzuki.' },
				{ obiettivo: 'hayashi', ja: 'うけつけの 林[はやし]さんの 話を 聞く。', it: 'Sentire Hayashi alla reception.' },
				{ flag: 'm3.sparito' },
				{ minuti: 10 }, // 森 e 中村: il documento sparito
			]
		},
		{
			id: 'm3-magazzino', luogo: 'ufficio', quando: { giorno: [15, 16], flag: ['m3.magazzino.hint'], nonOggetti: ['scontrino_copie'], nonFlag: ['m3.confessa'] },
			passi: [
				{ narra: '会社の おくの そうこを しらべます……。ごみばこの 中に、くしゃくしゃの レシートが 入って います。', it: 'Esamini il magazzino in fondo all’ufficio… Nel cestino c’è uno scontrino accartocciato.' },
				{ narra: 'レシート：「ハッピーマート　コピー（白黒）10まい　100円　4月20日　19:30」', it: 'Scontrino: «Happy Mart — fotocopie (b/n) ×10 — 100 yen — 20 aprile, 19:30».' },
				{ minuti: 20 },
				{ prendi: 'scontrino_copie', it: 'scontrino delle fotocopie' },
				{ pensa: 'コンビニで コピーした？ 田中さんの 話と ちがう。', it: 'Le copie alla konbini? Non torna con quello che dice Tanaka.' },
				{ dice: 'nakamura', faccia: 'pensieroso', ja: 'いい しょうこですね。もう 一度 田中さんと 話して みたら どうですか。', it: 'Ottima prova. Perché non riparla con Tanaka?' }
			]
		},
		{
			id: 'm3-interroga', luogo: 'ufficio', ripeti: true, quando: { giorno: [15, 16], flag: ['m3.sparito'], nonFlag: ['m3.confessa'], dalle: h(7), alle: h(18) },
			passi: [
				{ narra: 'だれと 話しますか。', it: 'Con chi parli?' },
				{
					scelta: [
						{
							ja: '田中さん、きのうの 夜の ことを 聞いても いいですか。', it: 'Tanaka, posso chiederle di ieri sera?',
							passi: [
								{ dice: 'tanaka', faccia: 'nervoso', ja: 'え、ぼくですか？ きのうは 7時ごろ コピーを して、ぶちょうの つくえの 上に おいて おきましたよ。', it: 'Eh, io? Ieri verso le 7 ho fatto le copie e le ho lasciate sulla scrivania della responsabile.', taccuino: true },
								{ io: 'コピーは どこで しましたか。', it: 'Dove ha fatto le copie?' },
								{ dice: 'tanaka', faccia: 'nervoso', ja: 'え……会社で ですよ。もちろん。', it: 'Eh… In ufficio, ovvio.', taccuino: true },
								{ minuti: 20 },
								{ completa: 'tanaka' },
								{ flag: 'm3.tanaka' }
							]
						},
						{
							ja: '鈴木[すずき]さん、きのうは 何時まで 会社に いましたか。', it: 'Suzuki, fino a che ora è rimasta in ufficio ieri?',
							passi: [
								{ dice: 'suzuki', faccia: 'arrabbiata', ja: '8時までです。わたしが さいごでした。', it: 'Fino alle 8. Sono stata l’ultima.' },
								{ dice: 'suzuki', ja: '帰る とき、ぶちょうの つくえを 見ましたが、上には 何も おいて ありませんでしたよ。', it: 'Andando via ho guardato la scrivania della responsabile: sopra non c’era niente.', taccuino: true },
								{ minuti: 20 },
								{ completa: 'suzuki' },
								{ flag: 'm3.suzuki' }
							]
						},
						{
							ja: '林さん、きのうの 夜、何か 見ましたか。', it: 'Hayashi, ieri sera ha visto qualcosa?',
							passi: [
								{ dice: 'hayashi', faccia: 'sorpresa', ja: 'え？ そう いえば、7時ごろ 田中さんが 大きい ふうとうを 持って 出て 行きました。', it: 'Eh? A pensarci, verso le 7 Tanaka è uscito con una grande busta.', taccuino: true },
								{ dice: 'hayashi', ja: '「すぐ もどります」と 言って いましたが、もどって こなかった ようです。', it: 'Ha detto «torno subito», ma sembra che non sia tornato.', taccuino: true },
								{ minuti: 20 },
								{ completa: 'hayashi' },
								{ flag: 'm3.hayashi' }
							]
						},
						{ ja: '（あとで また 話を 聞こう。）', it: '(Ne riparlo più tardi.)' }
					]
				},
				{
					se: { flag: ['m3.tanaka', 'm3.suzuki', 'm3.hayashi'], nonFlag: ['m3.magazzino.hint'] },
					allora: [
						{ pensa: '田中さんは 会社で コピーしたと 言った。でも、コピーきは こわれて いる……。', it: 'Tanaka dice di aver fatto le copie in ufficio. Ma la fotocopiatrice è rotta…' },
						{ obiettivo: 'magazzino', ja: '会社の 中を しらべる（ごみばこ など）。', it: 'Esaminare l’ufficio (cestini ecc.).' },
						{ flag: 'm3.magazzino.hint' }
					]
				},
				{
					se: { flag: ['m3.tanaka'], oggetti: ['scontrino_copie'] },
					allora: [
						{ dice: 'tanaka', faccia: 'nervoso', ja: 'ですから、コピーは 会社で しましたよ。', it: 'Le ripeto: le copie le ho fatte in ufficio.' },
						{
							prova: {
								ja: '田中さんの 話と あわない ものを 見せて ください。', it: 'Mostra qualcosa che contraddice Tanaka.',
								giuste: ['scontrino_copie'],
								ok: [
									{ io: 'この レシートを 見て ください。「ハッピーマート、コピー 10まい、19:30」と 書いて あります。', it: 'Guardi questo scontrino: «Happy Mart, 10 copie, 19:30».' },
									{ dice: 'tanaka', faccia: 'imbarazzato', ja: '……すみません。コピーきが こわれて いたので、コンビニで コピーしたんです。', it: '…Mi scusi. Siccome la fotocopiatrice era rotta, le ho fatte alla konbini.' },
									{ dice: 'tanaka', faccia: 'imbarazzato', ja: 'それで、もとの 資料[しりょう]を コピーきの 中に わすれて しまって……。言えなかったんです。', it: 'E ho dimenticato l’originale nella fotocopiatrice… Non riuscivo a dirlo.', taccuino: true },
									{ nota: '「わすれて しまった」: 〜て しまう = fare qualcosa senza volerlo (e dispiacersene).', it: '「わすれて しまった」: 〜て しまう = è successo, purtroppo.' },
									{ minuti: 15 },
									{ completa: 'magazzino' },
									{ obiettivo: 'konbini3', ja: 'ハッピーマートへ 行って、資料[しりょう]が ないか 聞く。', it: 'Andare all’Happy Mart a chiedere del documento.' },
									{ flag: 'm3.confessa' }
								],
								no: [{ dice: 'tanaka', faccia: 'nervoso', ja: 'それが どう したんですか？', it: 'E allora?' }, { pensa: 'これでは ない。ほかの しょうこを さがそう。', it: 'Non è questo. Cerco un’altra prova.' }]
							}
						}
					]
				}
			]
		},
		{
			id: 'm3-konbini', luogo: 'konbini', quando: { flag: ['m3.confessa'], nonOggetti: ['cartellina'], nonFlag: ['m3.ritrovato'] },
			passi: [
				{ dice: 'commessa', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ io: 'すみません、きのうの 夜、コピーきの 中に 資料[しりょう]の わすれものは ありませんでしたか。', it: 'Mi scusi, ieri sera nella fotocopiatrice è stato dimenticato un documento?' },
				{ dice: 'commessa', ja: 'ああ、ありました！ だいじな 書るいの ようでしたので、レジの うしろに しまって おきました。', it: 'Ah, sì! Sembrava importante, quindi l’ho messo da parte dietro la cassa.', taccuino: true },
				{ prendi: 'cartellina', it: 'il documento per il cliente' },
				{ completa: 'konbini3' },
				{ obiettivo: 'mori3', ja: '会社へ もどって、森[もり]ぶちょうに 資料[しりょう]を わたす。', it: 'Tornare in ufficio e consegnare il documento a Mori.' },
				{ flag: 'm3.ritrovato' },
				{ minuti: 10 },
			]
		},
		{
			id: 'm3-consegna', luogo: 'ufficio', quando: { giorno: [15, 16], oggetti: ['cartellina'], nonFlag: ['m3.consegnato'], alle: h(20) },
			passi: [
				{ io: 'ぶちょう、資料[しりょう]が 見つかりました！', it: 'Responsabile, ho trovato il documento!' },
				{ togli: 'cartellina' },
				{ dice: 'mori', ja: 'まあ、よかった！ ありがとう、{nome}さん。', it: 'Oh, che sollievo! Grazie, {nome}.' },
				{ dice: 'tanaka', faccia: 'imbarazzato', ja: 'ぶちょう、ほんとうに もうしわけ ありませんでした。', it: 'Responsabile, mi dispiace davvero molto.' },
				{ dice: 'mori', ja: 'つぎからは、こまった ときは すぐ 言って くださいね。', it: 'La prossima volta, quando è in difficoltà, lo dica subito.' },
				{ dice: 'hayashi', ja: 'ぶちょう、山田さんから 電話です。', it: 'Responsabile, c’è Yamada al telefono.' },
				{ dice: 'mori', ja: '……はい、わかりました。{nome}さん、あしたの かいぎは 会社では なく、山野駅[やまのえき]の 前の ホテル みどりで する ことに なりました。山田さんが そこに とまって いるそうです。', it: '…Sì, capito. {nome}, la riunione di domani non sarà in ditta ma all’Hotel Midori davanti alla stazione di Yamano. Pare che Yamada alloggi lì.', taccuino: true },
				{ dice: 'mori', ja: '10時に ホテルの ロビーで 会いましょう。電車で 行くので、ICカードが いりますよ。', it: 'Ci vediamo alle 10 nella hall dell’hotel. Si va in treno, quindi serve la carta IC.' },
				{ completa: 'mori3' },
				{ obiettivo: 'ic', ja: 'さくら町駅で ICカードを 買う。', it: 'Comprare la carta IC alla stazione di Sakura-chō.' },
				{ obiettivo: 'hotel', ja: 'あしたの 10時までに ホテル みどり（山野駅[やまのえき]の 前）へ 行く。', it: 'Domani entro le 10, andare all’Hotel Midori (davanti alla stazione di Yamano).' },
				{ flag: 'm3.consegnato' },
				// la giornata di lavoro continua: niente pomeriggio libero alle 9 del mattino
				{ dice: 'mori', ja: 'さあ、しごとに もどりましょう。ICカードは 昼休みか、しごとの あとで 買って ください。', it: 'Su, torniamo al lavoro. La carta IC la compri in pausa pranzo o dopo il lavoro.' },
				{
					se: { alle: h(12) },
					allora: [{ narra: '昼まで、たまって いた しごとを しました。', it: 'Fino a mezzogiorno sbrighi il lavoro arretrato.' }, { ora: h(12) }]
				}
			]
		},
		{
			id: 'm3-d15-pomeriggio', luogo: 'ufficio', quando: { giorno: 15, dalle: h(12, 30), flag: ['m3.consegnato'], nonFlag: ['m3.d15.pomeriggio'] },
			passi: [
				rientro(),
				{ flag: 'm3.d15.pomeriggio' },
				{ dice: 'mori', ja: '{nome}さん、あしたの よていを もう一度 かくにんしましょう。', it: '{nome}, ricontrolliamo il programma di domani.' },
				{
					domanda: {
						ja: 'あした、何時に どこで 山田さんに 会いますか。', it: 'Domani, a che ora e dove incontrate Yamada?',
						opzioni: [
							{ ja: '10時に ホテルの ロビーで', it: 'alle 10 nella hall dell’hotel' },
							{ ja: '10時に 会社の 一かいで', it: 'alle 10 al piano terra della ditta' },
							{ ja: '9時50分に 山野駅[やまのえき]で', it: 'alle 9:50 alla stazione di Yamano' },
							{ ja: '11時半に ホテルの 前で', it: 'alle 11:30 davanti all’hotel' }
						],
						giusta: 0, spiega: 'Mori: 「10時に ホテルの ロビーで 会いましょう」. Le 11:30 sono la fine della riunione; il piano terra della ditta era il posto della settimana scorsa.'
					}
				},
				{ dice: 'tanaka', faccia: 'imbarazzato', ja: '{nome}さん、けさは ありがとう。コピーきが なおるまで、コピーは ぼくが コンビニで して おきます。', it: '{nome}, grazie per stamattina. Finché non riparano la fotocopiatrice, le copie le faccio io alla konbini.' },
				{ nota: '「して おきます」: 〜て おく は、あとの ために 前に して おく こと。', it: '「して おきます」: 〜て おく = fare qualcosa in anticipo, per prepararsi.' },
				{ narra: 'ごごは コピーを ファイルに 入れて、かいぎの じゅんびを しました。', it: 'Il pomeriggio metti le copie nelle cartelline e prepari la riunione.' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'おつかれさまでした。あしたは 10時に ホテルで。おくれないでね。', it: 'Buon lavoro. Domani alle 10 all’hotel. Non fare tardi.' },
				{ se: { nonFlag: ['treno.ok'] }, allora: [{ pensa: '帰りに さくら町駅で ICカードを 買おう。', it: 'Tornando passo alla stazione di Sakura-chō a comprare la carta IC.' }] }
			]
		},
		{
			id: 'm3-eki-ic', luogo: 'eki', quando: { flag: ['m3.consegnato'], nonFlag: ['treno.ok'] },
			passi: [
				{ narra: 'きっぷうりばの となりに、ICカードの きかいが あります。', it: 'Accanto alle biglietterie c’è la macchinetta delle carte IC.' },
				{ narra: '「ICカード 2000円（デポジット 500円・チャージ 1500円）」と 書いて あります。', it: 'C’è scritto: «Carta IC 2000 yen (cauzione 500, credito 1500)».' },
				{
					se: { soldiMin: 2000 },
					allora: [
						{ soldi: -2000 },
						{ prendi: 'carta_ic2', it: 'carta IC' },
						{ minuti: 5 },
						{ soldi: 1500 },
						{ narra: 'ICカードを 買いました。これで 電車に 乗れます。かいさつで タッチするだけです。', it: 'Hai comprato la carta IC. Ora puoi prendere il treno: basta appoggiarla ai tornelli.' },
						{ nota: 'Nel gioco il credito della carta e i soldi sono la stessa cosa (¥ in alto): ogni corsa costa 160 yen.', it: 'Nel gioco il credito della carta e i soldi sono la stessa cosa (¥ in alto): ogni corsa costa 160 yen.' },
						{ completa: 'ic' },
						{ flag: 'treno.ok' }
					],
					altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }]
				}
			]
		},
		{
			id: 'm3-d15-casa-sera', luogo: 'casa', quando: { giorno: 15, dalle: h(17), flag: ['m3.d15.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				...cena([
					{
						domanda: {
							ja: '鈴木[すずき]さんが 8時に 帰る とき、つくえの 上は どう でしたか。', it: 'Quando Suzuki è andata via alle 8, com’era la scrivania?',
							opzioni: [{ ja: '資料[しりょう]が おいて あった', it: 'c’era il documento' }, { ja: '何も おいて なかった', it: 'non c’era niente' }, { ja: 'コピーが おいて あった', it: 'c’erano le copie' }, { ja: '田中さんが いた', it: 'c’era Tanaka' }],
							giusta: 1, spiega: '「上には 何も おいて ありませんでした」: 〜て ある al negativo = non c’era niente messo lì. Contraddice Tanaka 「おいて おきました」.'
						}
					},
					{
						domanda: {
							ja: '田中さんは どこで コピーを しましたか。', it: 'Dove ha fatto davvero le copie Tanaka?',
							opzioni: [{ ja: '会社', it: 'in ufficio' }, { ja: 'コンビニ', it: 'alla konbini' }, { ja: '郵便局[ゆうびんきょく]', it: 'alla posta' }, { ja: '家', it: 'a casa' }],
							giusta: 1, spiega: 'Lo scontrino delle 19:30 e la fotocopiatrice rotta (「こわれて いた」): le copie le ha fatte alla コンビニ.'
						}
					}
				])
			]
		},

		// ───────── giorno 16: mercoledì 22 aprile ─────────
		{
			id: 'm3-d16-casa', luogo: 'casa', quando: { giorno: 16, nonFlag: ['m3.d16.casa'] },
			passi: [
				{ narra: '4月22日（水）、朝 7時半。今日は ホテルで かいぎです。', it: 'Mercoledì 22 aprile, ore 7:30. Oggi c’è la riunione in hotel.' },
				{
					se: { flag: ['treno.ok'] },
					allora: [{ pensa: 'ICカードは ある。さくら町駅から 電車で 山野駅[やまのえき]へ 行こう。', it: 'La carta IC ce l’ho. Dalla stazione di Sakura-chō prendo il treno per Yamano.' }],
					altrimenti: [{ pensa: 'まず、えきで ICカードを 買わなければ。', it: 'Prima devo comprare la carta IC in stazione.' }]
				},
				{ flag: 'm3.d16.casa' },
				{ minuti: 20 }, // colazione e preparativi: si esce verso le 7:50
			]
		},
		{
			// la riunione è dalle 10 alle 11:30: dopo, è già finita
			id: 'm3-hotel-tardi', luogo: 'hotel', quando: { giorno: [16, 17], dalle: h(11, 30), flag: ['m3.consegnato'], nonFlag: ['m3.riunione'] },
			passi: [
				{ dice: 'hotelstaff', ja: 'いらっしゃいませ。山田さまの かいぎは 11時半に 終わりました。', it: 'Benvenut{o}. La riunione del signor Yamada è finita alle 11:30.' },
				{ pensa: 'しまった！ まにあわなかった……。', it: 'Accidenti! Non ho fatto in tempo…' },
				{ dice: 'mori', faccia: 'preoccupata', ja: '{nome}さん、どうしたんですか。かいぎは わたし 一人で しましたよ。', it: '{nome}, cos’è successo? La riunione l’ho fatta da sola.' },
				{ io: 'もうしわけ ありません。', it: 'Mi dispiace molto.' },
				{ minuti: 10 },
				{ dice: 'mori', ja: 'でも、山田さんは 資料[しりょう]を よろこんで いました。つぎは 時間を まもって くださいね。', it: 'Però Yamada era contento del documento. La prossima volta sia puntuale.' },
				{ completa: 'hotel' },
				{ flag: 'm3.riunione' }
			]
		},
		{
			id: 'm3-hotel', luogo: 'hotel', quando: { giorno: [16, 17], alle: h(11, 30), flag: ['m3.consegnato'], nonFlag: ['m3.riunione'] },
			passi: [
				{
					se: { alle: h(10, 1) },
					allora: [{ dice: 'mori', ja: 'おはよう、{nome}さん。時間どおりですね。', it: 'Buongiorno, {nome}. Puntuale.' }],
					altrimenti: [{ dice: 'mori', faccia: 'preoccupata', ja: '{nome}さん、10時を すぎて いますよ……。山田さんが 待って います。', it: '{nome}, sono passate le 10… Yamada sta aspettando.' }, { io: 'おそく なって、もうしわけ ありません。', it: 'Mi scusi per il ritardo.' }]
				},
				{ dice: 'hotelstaff', ja: 'いらっしゃいませ。山田さまは ロビーで お待ちです。', it: 'Benvenuti. Il signor Yamada vi attende nella hall.' },
				{ dice: 'yamada', ja: 'やあ、森[もり]さん、{nome}さん。わざわざ ありがとうございます。', it: 'Oh, Mori, {nome}. Grazie di essere venuti fin qui.' },
				{
					scelta: [
						{ ja: 'こちらこそ、よろしく おねがいいたします。', it: 'Grazie a lei. Conto su di lei (molto cortese).', passi: [{ dice: 'yamada', ja: 'はい、よろしく。', it: 'Sì, piacere mio.' }] },
						{ ja: 'どういたしまして。', it: 'Prego (di niente).', passi: [{ nota: '「どういたしまして」 risponde a un grazie per un favore. Qui, a un cliente che ringrazia della visita: 「こちらこそ、よろしく おねがいいたします」.', it: '「どういたしまして」 risponde a un grazie per un favore. Qui, a un cliente che ringrazia della visita: 「こちらこそ、よろしく おねがいいたします」.' }] }
					]
				},
				{ narra: '森ぶちょうが 資料[しりょう]を 見せながら せつめいしました。かいぎは 11時半に 終わりました。', it: 'Mori spiega mostrando il documento. La riunione finisce alle 11:30.' },
				{ ora: h(11, 30) },
				{ dice: 'yamada', ja: 'いい 資料[しりょう]ですね。来月から いっしょに 仕事を しましょう。', it: 'Ottimo documento. Dal mese prossimo lavoriamo insieme.' },
				{ dice: 'mori', ja: '{nome}さん、今日は もう 会社に もどらなくて いいですよ。この 町を 見て 帰ったら どうですか。', it: '{nome}, oggi non serve che torni in ufficio. Perché non fai un giro in centro prima di tornare?' },
				{ completa: 'hotel' },
				{ flag: 'm3.riunione' }
			]
		},
		{
			id: 'm3-d16-casa-sera', luogo: 'casa', quando: { giorno: [16, 17], dalle: h(17), flag: ['m3.riunione'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。かいぎは どうだった？', it: 'Bentornat{o}. Com’è andata la riunione?' },
				{ io: 'うまく いきました！', it: 'È andata bene!' },
				{ dice: 'nakamuraTel', ja: 'もしもし、中村[なかむら]です。資料[しりょう]の じけん、おつかれさまでした。また 電話します。', it: 'Pronto, sono Nakamura. Ottimo lavoro col caso del documento. La richiamo.', suono: 'telefono' },
				...cena(
					[
						{
							domanda: {
								ja: 'かいぎは どこで ありましたか。', it: 'Dove si è tenuta la riunione?',
								opzioni: [{ ja: '会社の かいぎしつ', it: 'nella sala riunioni della ditta' }, { ja: 'ホテル みどりの ロビー', it: 'nella hall dell’Hotel Midori' }, { ja: '山野駅[やまのえき]の 中', it: 'dentro la stazione di Yamano' }, { ja: 'ABCの 会社', it: 'alla ABC' }],
								giusta: 1, spiega: '「会社では なく、… ホテル みどりで する ことに なりました」: 〜ことに なる = è stato deciso (non da me).'
							}
						},
						{
							domanda: {
								ja: '電車に 乗るのに 何が いりますか。', it: 'Cosa serve per prendere il treno?',
								opzioni: [{ ja: 'ICカード', it: 'la carta IC' }, { ja: 'パスポート', it: 'il passaporto' }, { ja: 'ホテルの かぎ', it: 'la chiave dell’hotel' }, { ja: 'ファックス', it: 'un fax' }],
								giusta: 0, spiega: '「電車で 行くので、ICカードが いりますよ」: 〜ので = poiché; いる (要る) = servire.'
							}
						}
					],
					[{ fine: '消[き]えた 資料[しりょう]' }]
				)
			]
		},
		{
			// rete di sicurezza: dal giovedì (giorno 17) la riunione è comunque passata
			id: 'm3-chiusura', luogo: 'casa', quando: { giorno: [18, 19, 20], nonFlag: ['m3.riunione'] },
			passi: [
				{ dice: 'mamma', ja: '{nome}さん、森[もり]さんから 電話が あったわよ。かいぎは 森さん 一人で 行ったけど、うまく いったって。', it: '{nome}, ha chiamato Mori. È andata da sola alla riunione, ma è andata bene.' },
				{ flag: 'treno.ok' },
				{ flag: 'm3.riunione' },
				{ fine: '消[き]えた 資料[しりょう]' }
			]
		}
	]
};
