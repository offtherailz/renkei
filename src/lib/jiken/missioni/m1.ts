// Missione 1 — はじめての 一週間 (rodaggio): mappa, orologio, orari, oggetti,
// taccuino e un piccolo giallo (il portafoglio). Tre giornate: 4/6-4/8.
// Forme: 〜て おく, 〜までに, 〜て から / 〜あとで, 〜て くれる / あげる / もらう,
// 〜かもしれない, 〜たら どう.
import type { Missione, Passo } from '../tipi';

const h = (ore: number, min = 0): number => ore * 60 + min;

// la sera a casa: domande d'esame sulla giornata, poi a letto
const cena = (domande: Passo[], dopo: Passo[] = []): Passo[] => [
	{ narra: 'ねる 前に、今日の ことを 思い出します。ノートも 見て ください。', it: 'Prima di dormire ripensi alla giornata. Il taccuino ti aiuta.' },
	...domande,
	...dopo,
	{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' },
	{ dormi: true }
];

export const M1: Missione = {
	id: 'm1',
	titolo: 'はじめての 一週間',
	it: 'La prima settimana',
	epilogo: {
		ja: 'さいふが 見つかって、高橋[たかはし]くんに おれいを 言って、中村[なかむら]さんと 知り合いに なりました。',
		it: 'Hai ritrovato il portafoglio, ringraziato 高橋くん e conosciuto l’ispettore 中村.'
	},
	scene: [
		// ───────── giorno 0: lunedì 6 aprile ─────────
		{
			id: 'd0-casa-mattina', luogo: 'casa', quando: { giorno: 0, nonFlag: ['d0.casa'] },
			passi: [
				{ narra: '4月6日（月）、朝 7時半。さくら町での 一日目です。あなたは 吉田[よしだ]さんの 家に 住んで いて、今日から さくら会社で はたらきます。', it: 'Lunedì 6 aprile, ore 7:30. È il tuo primo giorno a さくら町: vivi presso la famiglia Yoshida e oggi cominci a lavorare alla さくら会社.' },
				{ dice: 'mamma', ja: 'おはよう、{nome}さん。よく ねられましたか。', it: 'Buongiorno, {nome}. Hai dormito bene?' },
				{
					scelta: [
						{ ja: 'はい、よく ねられました。', it: 'Sì, ho dormito bene.', passi: [{ dice: 'mamma', ja: 'よかった！', it: 'Meno male!' }] },
						{ ja: 'いいえ、あまり ねられませんでした。', it: 'No, non ho dormito molto.', passi: [{ dice: 'mamma', ja: 'そう。こんばんは 早く ねてね。', it: 'Capisco. Stasera vai a letto presto.' }] }
					]
				},
				{ dice: 'papa', ja: 'これ、町の 地図だよ。会社は 川の 近くに あるよ。', it: 'Questa è la piantina del quartiere. La ditta è vicino al fiume.' },
				{ nota: '地図を もらいました。地図の たてものを タッチすると、そこへ 行きます。一回 15分 かかります。', it: 'Ricevi la piantina: tocca un edificio sulla mappa per andarci. Ogni spostamento costa 15 minuti.' },
				{ dice: 'mamma', ja: '会社は 9時からでしょう？ おくれないでね。', it: 'Il lavoro comincia alle 9, vero? Non fare tardi.', taccuino: true },
				{ obiettivo: 'ufficio', ja: '9時までに 会社（さくら会社）に 行く。', it: 'Andare in ufficio (さくら会社) entro le 9:00.' },
				{ dice: 'mamma', ja: 'それから、帰りに ぎゅうにゅうを 買って きて くれない？ コンビニで いいから。', it: 'E poi, al ritorno, mi compreresti il latte? Va bene alla konbini.', taccuino: true },
				{ obiettivo: 'latte', ja: 'コンビニ（ハッピーマート）で ぎゅうにゅうを 買って、家に 持って 帰る。', it: 'Comprare il latte alla コンビニ (ハッピーマート) e portarlo a casa.' },
				{ dice: 'mamma', ja: 'いってらっしゃい！', it: 'Buona giornata! (vai e torna)' },
				{ io: 'いって きます。', it: 'Vado (e torno).' },
				{ flag: 'd0.casa' }
			]
		},
		{
			id: 'd0-ufficio', luogo: 'ufficio', quando: { giorno: 0, nonFlag: ['d0.ufficio'] },
			passi: [
				{
					se: { alle: h(9, 1) },
					allora: [{ narra: '9時前に 会社に つきました。', it: 'Arrivi in ufficio in orario.' }],
					altrimenti: [
						{ dice: 'mori', ja: '{nome}さん、9時を すぎて いますよ。明日からは 9時までに 来て くださいね。', it: '{nome}, sono passate le 9. Da domani venga entro le 9, per favore.', taccuino: true },
						{ flag: 'd0.tardi' }
					]
				},
				{ completa: 'ufficio' },
				{ dice: 'mori', ja: 'はじめまして。ぶちょうの 森[もり]です。今日から よろしく おねがいします。', it: 'Piacere. Sono Mori, la responsabile. Da oggi conto su di lei.' },
				{
					scelta: [
						{ ja: '{nome}です。よろしく おねがいします。', it: 'Sono {nome}. Piacere, conto su di voi.', passi: [{ dice: 'mori', ja: 'はい、がんばって ください。', it: 'Bene, si impegni.' }] },
						{ ja: 'どうも。', it: 'Salve.', passi: [{ dice: 'mori', ja: '……はい。', it: '…Sì.' }, { nota: '会社の 一日目は 「よろしく おねがいします」と ちゃんと あいさつしましょう。', it: 'In ufficio, il primo giorno, ci si presenta per bene: 「よろしく おねがいします」.' }] }
					]
				},
				{ dice: 'mori', ja: 'わからない ことが あったら、鈴木[すずき]さんに 聞いて くださいね。', it: 'Se c’è qualcosa che non sa, chieda a Suzuki.' },
				{ dice: 'suzuki', ja: '鈴木[すずき]です。よろしく。さっそくですが、この しょるいを 郵便局[ゆうびんきょく]から 送って おいて ください。', it: 'Sono Suzuki, piacere. Subito un compito: spedisca questi documenti dalla posta, per favore.' },
				{ prendi: 'busta', it: 'busta coi documenti' },
				{ dice: 'suzuki', ja: '今日の 5時までに おねがいします。郵便局[ゆうびんきょく]は 5時に しまりますから。', it: 'Entro le 5 di oggi, per favore. La posta chiude alle 5.', taccuino: true },
				{ obiettivo: 'posta', ja: '今日の 5時までに 郵便局[ゆうびんきょく]から しょるいを 送る。', it: 'Spedire la busta dal 郵便局 entro le 17:00 (oggi).' },
				{ pensa: '5時までに 郵便局[ゆうびんきょく]か……。わすれないように しよう。', it: 'Entro le 5 alla posta… Non devo dimenticarlo.' },
				{ dice: 'suzuki', ja: '昼休みは 12時から 1時までです。', it: 'La pausa pranzo è dalle 12 alle 13.', taccuino: true },
				{ dice: 'tanaka', ja: '田中です！ {nome}さん、昼ご飯、いっしょに 行きませんか。ふじ食堂は 安くて おいしいですよ。', it: 'Sono Tanaka! {nome}, andiamo a pranzo insieme? La trattoria Fuji è economica e buona.' },
				{
					scelta: [
						{ ja: 'はい、ぜひ。', it: 'Sì, volentieri.', passi: [{ dice: 'tanaka', ja: 'じゃ、12時に 食堂で 会いましょう。', it: 'Allora ci vediamo alle 12 alla trattoria.', taccuino: true }, { flag: 'd0.pranzo_tanaka' }] },
						{ ja: 'すみません、今日は ちょっと……。', it: 'Mi scusi, oggi non posso…', passi: [{ dice: 'tanaka', ja: 'そうですか。じゃ、また 今度。', it: 'Ah, va bene. Allora la prossima volta.' }] }
					]
				},
				{ ora: h(10) },
				{ dice: 'suzuki', ja: '{nome}さん、会社の 中を あんないしますね。ここは 2かいです。コピーきは この へやの 入り口の 右に あります。', it: '{nome}, le faccio vedere l’ufficio. Qui siamo al 2° piano. La fotocopiatrice è a destra dell’ingresso di questa stanza.' },
				{ dice: 'suzuki', ja: 'かいぎしつは 3かいです。トイレは 1かいと 3かいに あります。2かいには ありません。', it: 'La sala riunioni è al 3° piano. I bagni sono al 1° e al 3° piano; al 2° non ci sono.', taccuino: true },
				{
					domanda: {
						ja: 'かいぎしつは 何かいですか。トイレは どこですか。', it: 'A che piano è la sala riunioni? E i bagni?',
						opzioni: [{ ja: 'かいぎしつは 2かい、トイレは 1かい', it: 'sala al 2°, bagni al 1°' }, { ja: 'かいぎしつは 3かい、トイレは 2かい', it: 'sala al 3°, bagni al 2°' }, { ja: 'かいぎしつは 3かい、トイレは 1かいと 3かい', it: 'sala al 3°, bagni al 1° e al 3°' }, { ja: 'かいぎしつは 1かい、トイレは 3かい', it: 'sala al 1°, bagni al 3°' }],
						giusta: 2, spiega: '「2かいには ありません」: la frase negativa toglie un’opzione. 〜かい = piano (2かい = secondo piano).'
					}
				},
				{ ora: h(11) },
				{ dice: 'mori', ja: '{nome}さん、この 書き方で 名前と じゅうしょを パソコンに 入れて おいて ください。お昼までで いいです。', it: '{nome}, inserisca nel computer nome e indirizzo in questo formato. Basta entro pranzo.' },
				{ io: 'はい。お昼までに やって おきます。', it: 'Sì. Lo faccio entro pranzo.' },
				{ narra: '午前中 ずっと パソコンで 仕事を しました。12時です。昼休みです（12時〜1時）。', it: 'Lavori al computer tutta la mattina. È mezzogiorno: pausa pranzo (12-13).' },
				{ ora: h(12) },
				{ flag: 'd0.ufficio' }
			]
		},
		{
			id: 'd0-pranzo', luogo: 'shokudo', quando: { giorno: 0, dalle: h(11, 30), alle: h(14), nonFlag: ['d0.pranzo'] },
			passi: [
				{ se: { flag: ['d0.pranzo_tanaka'] }, allora: [{ dice: 'tanaka', ja: 'あ、{nome}さん！ こっち、こっち。', it: 'Ah, {nome}! Di qua, di qua.' }] },
				{ dice: 'oste', ja: 'いらっしゃいませ。何に しますか。', it: 'Benvenuti. Cosa prendete?' },
				{ narra: 'かべの メニュー：カレーライス 650円・ラーメン 700円・すし 900円。', it: 'Sul muro, il menù: カレーライス 650円 · ラーメン 700円 · すし 900円.' },
				{
					scelta: [
						{ ja: 'カレーライスを おねがいします。', it: 'Il riso al curry, per favore.', passi: [{ soldi: -650 }] },
						{ ja: 'ラーメンを おねがいします。', it: 'Il ramen, per favore.', passi: [{ soldi: -700 }] },
						{ ja: 'すしを おねがいします。', it: 'Il sushi, per favore.', passi: [{ soldi: -900 }] }
					]
				},
				{ se: { flag: ['d0.pranzo_tanaka'] }, allora: [{ dice: 'tanaka', ja: 'ぼくは カレーに します。ここの カレーは ほんとうに おいしいですよ。', it: 'Io prendo il curry. Qui il curry è davvero buono.' }] },
				{ minuti: 40 },
				{ dice: 'oste', ja: 'ありがとうございました。おかいけいは べつべつですか。', it: 'Grazie. Pagate separatamente?' },
				{ se: { flag: ['d0.pranzo_tanaka'] }, allora: [{ dice: 'tanaka', ja: 'はい。ぼくは カードで はらいます。', it: 'Sì. Io pago con la carta.' }] },
				{ narra: 'あなたは さいふから お金を 出して はらいました。それから さいふを かばんに 入れました。', it: 'Tu paghi in contanti: tiri fuori i soldi dal portafoglio e lo rimetti nella borsa.' },
				{ flag: 'd0.pranzo' },
				{ narra: '昼休みが 終わります。会社に もどりましょう。', it: 'La pausa è finita: torna in ufficio.' }
			]
		},
		{
			id: 'posta-senza-soldi', luogo: 'posta', ripeti: true, quando: { oggetti: ['busta'], nonOggetti: ['portafoglio'] },
			passi: [
				{ dice: 'postino', ja: 'いらっしゃいませ。140円です。', it: 'Benvenut{o}. Sono 140 yen.' },
				{ pensa: 'あっ、さいふが ない……。お金が はらえない。', it: 'Ah, il portafoglio non c’è… Non posso pagare.' },
				{ io: 'すみません、また 来ます。', it: 'Mi scusi, ripasso.' }
			]
		},
		{
			id: 'd0-posta', luogo: 'posta', quando: { oggetti: ['busta', 'portafoglio'] },
			passi: [
				{ dice: 'postino', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{
					scelta: [
						{ ja: 'これを 送りたいんですが。', it: 'Vorrei spedire questo.' },
						{ ja: 'これを 買いたいんですが。', it: 'Vorrei comprare questo.', passi: [{ dice: 'postino', ja: 'え？ それは しょるいですね。送るんですか。', it: 'Eh? Sono documenti. Li vuole spedire?' }, { io: 'あ、はい。送りたいです。', it: 'Ah, sì. Vorrei spedirli.' }] }
					]
				},
				{ dice: 'postino', ja: 'はい。140円です。明日の 午前中に つきますよ。', it: 'Bene. Sono 140 yen. Arriva domani in mattinata.' },
				{ soldi: -140 },
				{ togli: 'busta' },
				{ dice: 'postino', ja: 'こちらは レシートです。', it: 'Ecco la ricevuta.' },
				{ prendi: 'ricevuta_posta', it: 'ricevuta della posta' },
				{ se: { oggetti: ['portafoglio'] }, allora: [{ narra: 'レシートを さいふに 入れました。', it: 'Metti la ricevuta nel portafoglio.' }] },
				{ completa: 'posta' },
				{ flag: 'posta.ok' }
			]
		},
		{
			id: 'd0-ufficio-pomeriggio', luogo: 'ufficio', quando: { giorno: 0, dalle: h(12, 30), flag: ['d0.ufficio'] },
			passi: [
				{
					se: { flag: ['posta.ok'] },
					allora: [
						{ dice: 'suzuki', ja: '{nome}さん、しょるいは もう 送りましたか。', it: '{nome}, ha già spedito i documenti?' },
						{ io: 'はい、もう 送りました。', it: 'Sì, li ho già spediti.' },
						{ dice: 'suzuki', ja: 'ありがとう。たすかりました。', it: 'Grazie. Mi è stat{o} d’aiuto.' }
					],
					altrimenti: [
						{ dice: 'suzuki', ja: '{nome}さん、しょるいは もう 送りましたか。', it: '{nome}, ha già spedito i documenti?' },
						{ io: 'あっ、まだです！', it: 'Ah, non ancora!' },
						{ dice: 'suzuki', ja: '郵便局[ゆうびんきょく]は 5時までですよ。いそいで ください。', it: 'La posta è aperta fino alle 5. Si sbrighi.' }
					]
				},
				{ ora: h(14) },
				{ narra: '2時です。電話が なって います。まわりに だれも いません。', it: 'Sono le 14. Squilla il telefono e intorno non c’è nessuno.', suono: 'telefono' },
				{
					scelta: [
						{ ja: 'はい、さくら会社です。', it: 'Sì, ditta Sakura.' },
						{ ja: 'もしもし、{nome}です。', it: 'Pronto, sono {nome}.', passi: [{ nota: '会社の 電話は 自分の 名前では なく、「はい、〇〇会社です」と 出ます。', it: 'Al telefono dell’ufficio non si risponde col proprio nome ma con quello della ditta: 「はい、〇〇会社です」.' }] }
					]
				},
				{ dice: 'telefono', ja: 'ABCの 山田[やまだ]と もうします。森[もり]ぶちょうは いらっしゃいますか。', it: 'Sono Yamada della ABC. C’è la responsabile Mori?' },
				{ io: 'すみません、森[もり]は 今 かいぎ中です。', it: 'Mi scusi, Mori adesso è in riunione.' },
				{ dice: 'telefono', ja: 'そうですか。では、3時半ごろ もう一度 お電話します。そう つたえて ください。', it: 'Capisco. Allora richiamo verso le 15:30. Glielo riferisca, per favore.', taccuino: true },
				{ io: 'はい、わかりました。つたえます。', it: 'Sì, d’accordo. Riferirò.' },
				{ narra: '森ぶちょうに メモを 書きます。', it: 'Scrivi un biglietto per Mori.' },
				{
					domanda: {
						ja: 'メモには 何と 書きますか。', it: 'Cosa scrivi sul biglietto?',
						opzioni: [
							{ ja: '山田さんから 電話。3時半に 電話を ください。', it: 'Ha chiamato Yamada. Lo richiami alle 15:30.' },
							{ ja: '山田さんから 電話。3時半ごろ また 電話します。', it: 'Ha chiamato Yamada. Richiama lui verso le 15:30.' },
							{ ja: '山田さんから 電話。3時に 来ます。', it: 'Ha chiamato Yamada. Viene alle 15.' },
							{ ja: '山田さんから 電話。森ぶちょうに 会いたいです。', it: 'Ha chiamato Yamada. Vuole vedere Mori.' }
						],
						giusta: 1, spiega: '「もう一度 お電話します」: richiama LUI (お〜します = umile, chi parla fa l’azione). 〜ごろ = verso, circa.'
					}
				},
				{ ora: h(15) },
				{ dice: 'suzuki', ja: '{nome}さん、この 資料[しりょう]を 10まい コピーして ください。あしたの 朝 9時半までに 3かいの かいぎしつに おいて おいて ください。', it: '{nome}, faccia 10 copie di questo materiale. Le lasci nella sala riunioni al 3° piano entro domattina alle 9:30.', taccuino: true },
				{
					domanda: {
						ja: '{nome}さんは いつまでに 何を しますか。', it: 'Entro quando e cosa devi fare?',
						opzioni: [
							{ ja: '今日の 9時半までに コピーを 3まい', it: '3 copie entro le 9:30 di oggi' },
							{ ja: 'あしたの 9時半までに コピーを 10まい', it: '10 copie entro domani alle 9:30' },
							{ ja: 'あしたの 3時までに コピーを 10まい', it: '10 copie entro domani alle 15' },
							{ ja: 'あしたの 9時半から かいぎしつで コピー', it: 'fotocopie in sala riunioni da domani alle 9:30' }
						],
						giusta: 1, spiega: '「あしたの 朝 9時半までに … おいて おいて ください」: 〜までに = entro; 〜て おく = fare in anticipo, preparare.'
					}
				},
				{ narra: 'コピーを して、かいぎしつに おいて おきました。', it: 'Fai le copie e le lasci in sala riunioni.' },
				{ dice: 'mori', ja: '{nome}さん、メモ ありがとう。山田さんから 電話が ありました。', it: '{nome}, grazie del biglietto. Yamada ha chiamato.' },
				{ ora: h(16, 30) },
				{ se: { nonFlag: ['posta.ok'] }, allora: [{ narra: '今 4時半です。今 出れば、郵便局[ゆうびんきょく]が しまる 前に つきます。', it: 'Sono le 16:30: se esci adesso arrivi alla posta prima che chiuda.' }] },
				{ dice: 'mori', ja: '今日は もう 帰っても いいですよ。おつかれさまでした。', it: 'Per oggi può andare a casa. Buon lavoro.' },
				{ io: 'おさきに しつれいします。', it: 'Mi congedo prima di voi.' },
				{ flag: 'd0.lavoro' }
			]
		},
		{
			id: 'd0-konbini', luogo: 'konbini', quando: { giorno: 0, dalle: h(16), nonOggetti: ['latte'], nonFlag: ['d0.konbini'] },
			passi: [
				{ dice: 'commessa', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ narra: 'れいぞうこから ぎゅうにゅうを とって、レジへ 行きます。', it: 'Prendi il latte dal frigorifero e vai alla cassa.' },
				{ dice: 'commessa', ja: '200円です。レシートは いりますか。', it: 'Sono 200 yen. Le serve lo scontrino?' },
				{ soldi: -200 },
				{
					scelta: [
						{ ja: 'はい、おねがいします。', it: 'Sì, grazie.', passi: [{ prendi: 'scontrino', it: 'scontrino della konbini' }, { narra: 'レシートを さいふに 入れました。', it: 'Infili lo scontrino nel portafoglio.' }] },
						{ ja: 'いいえ、けっこうです。', it: 'No, grazie.' }
					]
				},
				{ prendi: 'latte', it: 'latte' },
				{ dice: 'commessa', ja: 'ありがとうございました。', it: 'Grazie.' },
				{ narra: 'ぎゅうにゅうを 持って 店を 出ました。店の 前で 学生たちが 話して います。', it: 'Esci con il latte in mano. Fuori ci sono degli studenti che chiacchierano davanti al negozio.' },
				{ togli: 'portafoglio' },
				{ flag: 'd0.konbini' }
			]
		},
		{
			id: 'd0-casa-sera', luogo: 'casa', quando: { giorno: 0, dalle: h(16, 30), flag: ['d0.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				{ io: 'ただいま。', it: 'Sono a casa.' },
				{
					se: { oggetti: ['latte'] },
					allora: [{ dice: 'mamma', ja: 'ぎゅうにゅう、ありがとう！ たすかったわ。', it: 'Grazie per il latte! Mi hai aiutata.' }, { togli: 'latte' }, { completa: 'latte' }],
					altrimenti: [{ dice: 'mamma', ja: 'あれ、ぎゅうにゅうは？ ……まあ、いいわ。明日 わたしが 買うから。', it: 'Ehi, e il latte? …Va be’, lo compro io domani.' }]
				},
				{ dice: 'papa', ja: '会社は どうだった？', it: 'Com’è andata in ditta?' },
				{ io: 'みんな しんせつでした。', it: 'Erano tutti gentili.' },
				...cena([
					{
						domanda: {
							ja: '鈴木[すずき]さんは しょるいを 何時までに 送って くださいと 言いましたか。', it: 'Entro che ora Suzuki ha chiesto di spedire i documenti?',
							opzioni: [{ ja: '9時', it: 'le 9' }, { ja: '12時', it: 'le 12' }, { ja: '1時', it: 'le 13' }, { ja: '5時', it: 'le 17' }],
							giusta: 3, spiega: '「今日の 5時までに おねがいします」: 〜までに = entro (scadenza). La posta chiude alle 5.'
						}
					},
					{
						domanda: {
							ja: '昼休みは 何時から 何時までですか。', it: 'La pausa pranzo da che ora a che ora è?',
							opzioni: [{ ja: '11時から 12時まで', it: '11-12' }, { ja: '12時から 1時まで', it: '12-13' }, { ja: '12時から 2時まで', it: '12-14' }, { ja: '1時から 2時まで', it: '13-14' }],
							giusta: 1, spiega: '「昼休みは 12時から 1時までです」: 〜から〜まで = da… a….'
						}
					},
					{
						domanda: {
							ja: 'お母さんは {nome}さんに 何を たのみましたか。', it: 'Cosa ti ha chiesto la mamma?',
							opzioni: [{ ja: 'パンを 買う こと', it: 'comprare il pane' }, { ja: 'ぎゅうにゅうを 買う こと', it: 'comprare il latte' }, { ja: '早く 帰る こと', it: 'tornare presto' }, { ja: '地図を 買う こと', it: 'comprare una piantina' }],
							giusta: 1, spiega: '「帰りに ぎゅうにゅうを 買って きて くれない？」: 〜て くれない？ = mi faresti…? (richiesta gentile tra persone vicine).'
						}
					}
				])
			]
		},

		// ───────── giorno 1: martedì 7 aprile ─────────
		{
			id: 'd1-casa-mattina', luogo: 'casa', quando: { giorno: 1, nonFlag: ['d1.casa'] },
			passi: [
				{ narra: '4月7日（火）、朝 7時半。出かける 前に、かばんの 中の さいふを さがします……。', it: 'Martedì 7 aprile, ore 7:30. Ti prepari per uscire e cerchi il portafoglio nella borsa…' },
				{ io: 'あれ？ さいふが ない！', it: 'Eh? Il portafoglio non c’è!' },
				{ dice: 'mamma', ja: 'えっ、さいふが ないの？ きのう、さいごに どこで つかったの？', it: 'Cosa? Non hai il portafoglio? Ieri dove l’hai usato l’ultima volta?' },
				{ pensa: 'きのう……。昼ご飯の あと、どこに 行ったかな。', it: 'Ieri… Dopo pranzo dove sono andat{o}?' },
				{ narra: 'ノートを 見て ください。きのう 何時に どこへ 行ったか、書いて あります。', it: 'Apri il taccuino: nella linea del tempo c’è dove sei stat{o} ieri e a che ora.' },
				{ dice: 'mamma', ja: 'きのう 行った 店に 聞いて みたら どう？', it: 'Perché non provi a chiedere nei negozi dove sei stat{o} ieri?', taccuino: true },
				{ obiettivo: 'portafoglio', ja: 'さいふを さがす。きのう 行った 店で 聞いて みる（ノートの 「行った 所」を 見る）。', it: 'Ritrovare il portafoglio: chiedi nei posti dove sei stat{o} ieri (vedi la linea del tempo).' },
				{ dice: 'mamma', ja: 'でも、会社には おくれないでね。', it: 'Ma non fare tardi al lavoro.' },
				{ flag: 'd1.casa' }
			]
		},
		{
			id: 'd1-ufficio', luogo: 'ufficio', quando: { giorno: 1, nonFlag: ['d1.ufficio'] },
			passi: [
				{
					se: { alle: h(9, 1) },
					allora: [{ dice: 'mori', ja: 'おはようございます。', it: 'Buongiorno.' }],
					altrimenti: [{ dice: 'mori', ja: '{nome}さん、また おくれましたね。', it: '{nome}, di nuovo in ritardo.' }]
				},
				{
					se: { nonFlag: ['posta.ok'] },
					allora: [
						{ dice: 'suzuki', ja: 'きのうの しょるい、まだ 送って いませんね。今日 かならず 送って ください。', it: 'I documenti di ieri non li ha ancora spediti. Oggi li spedisca senza fallo.', taccuino: true },
						{ obiettivo: 'posta', ja: '郵便局[ゆうびんきょく]から しょるいを 送る（9時〜5時）。', it: 'Spedire la busta dal 郵便局 (9-17).' }
					]
				},
				{ dice: 'tanaka', ja: 'えっ、さいふを なくしたんですか。それは たいへんですね。', it: 'Cosa, ha perso il portafoglio? Che guaio.' },
				{ dice: 'tanaka', ja: 'きのう、昼ご飯の ときは ありましたか。', it: 'Ieri, a pranzo, ce l’aveva?' },
				{
					se: { flag: ['d0.pranzo'] },
					allora: [{ io: 'はい、食堂で お金を はらいました。', it: 'Sì, alla trattoria ho pagato in contanti.' }, { dice: 'tanaka', ja: 'じゃ、なくしたのは 昼ご飯の あとですね。', it: 'Allora l’ha perso dopo pranzo.', taccuino: true }],
					altrimenti: [{ io: 'きのうは 昼ご飯を 食べませんでした。', it: 'Ieri non ho pranzato.' }]
				},
				{ ora: h(10) },
				{ dice: 'tanaka', ja: '{nome}さん、来週の 金曜日に おきゃくさんと 会います。カレンダーに 書いて くれませんか。', it: '{nome}, venerdì della settimana prossima vediamo un cliente. Me lo segneresti sul calendario?' },
				{ narra: '今日は 4月7日（火）です。カレンダーを 見ます。', it: 'Oggi è martedì 7 aprile. Guardi il calendario.' },
				{
					domanda: {
						ja: '来週の 金曜日は 何日ですか。', it: 'Che giorno del mese è venerdì della settimana prossima?',
						opzioni: [{ ja: '4月10日', it: '10 aprile' }, { ja: '4月14日', it: '14 aprile' }, { ja: '4月17日', it: '17 aprile' }, { ja: '4月24日', it: '24 aprile' }],
						giusta: 2, spiega: 'Oggi martedì 7: questo venerdì è il 10, il venerdì della settimana prossima (来週) è il 17. とおか = 10, じゅうしちにち = 17.'
					}
				},
				{ dice: 'tanaka', ja: 'ありがとう。じゅうしちにちですね。', it: 'Grazie. Il 17, quindi.' },
				{ narra: '午前中 仕事を しました。12時から 昼休みです。昼休みに さいふを さがしに 行けます。', it: 'Lavori tutta la mattina. Alle 12 c’è la pausa pranzo: puoi usarla per cercare.' },
				{ ora: h(12) },
				{ flag: 'd1.ufficio' }
			]
		},
		{
			id: 'd1-shokudo', luogo: 'shokudo', quando: { giorno: 1, nonFlag: ['d1.shokudo', 'portafoglio.ok'] },
			passi: [
				{ dice: 'oste', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ io: 'すみません、きのう ここで さいふを わすれませんでしたか。', it: 'Mi scusi, ieri ho dimenticato qui un portafoglio?' },
				{ dice: 'oste', ja: 'さいふですか。いいえ、わすれものは ありませんでしたよ。', it: 'Un portafoglio? No, non c’erano oggetti dimenticati.', taccuino: true },
				{
					se: { flag: ['d0.pranzo'] },
					allora: [{ dice: 'oste', ja: 'きのうは お金で はらって、さいふを かばんに 入れて いましたね。', it: 'Ieri ha pagato in contanti e ha messo il portafoglio nella borsa.', taccuino: true }]
				},
				{ minuti: 10 },
				{ flag: 'd1.shokudo' }
			]
		},
		{
			id: 'd1-konbini', luogo: 'konbini', quando: { giorno: 1, nonFlag: ['d1.konbini'] },
			passi: [
				{ dice: 'commessa', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ io: 'すみません、きのうの 夜、この 店で さいふを なくしたかも しれません。', it: 'Mi scusi, ieri sera forse ho perso il portafoglio in questo negozio.' },
				{ dice: 'commessa', ja: 'さいふですか……。店の 中には ありませんでした。', it: 'Un portafoglio… Dentro il negozio non c’era.' },
				{ dice: 'commessa', ja: 'でも、きのうの 夜、店の 前で 学生が 何か ひろって いましたよ。', it: 'Però ieri sera, davanti al negozio, uno studente ha raccolto qualcosa.', taccuino: true },
				{ pensa: '学生が ひろった……？ もしかして、わたしの さいふ？', it: 'Uno studente ha raccolto qualcosa…? Che sia il mio portafoglio?' },
				{ dice: 'commessa', ja: '交番[こうばん]に 持って 行ったかも しれませんね。', it: 'Forse l’ha portato al posto di polizia.', taccuino: true },
				{ obiettivo: 'koban', ja: '交番[こうばん]へ 行って、さいふの ことを 聞く。', it: 'Andare al 交番 a chiedere del portafoglio.' },
				{ minuti: 10 },
				{ flag: 'd1.konbini' }
			]
		},
		{
			id: 'd1-koban', luogo: 'koban', quando: { giorno: [1, 2], nonFlag: ['portafoglio.ok'] },
			passi: [
				{ dice: 'nakamura', ja: 'どう しましたか。', it: 'Cosa succede?' },
				{
					scelta: [
						{ ja: 'さいふを なくしました。', it: 'Ho perso il portafoglio.' },
						{ ja: 'さいふを ひろいました。', it: 'Ho trovato un portafoglio.', passi: [{ dice: 'nakamura', ja: 'え？ どこに ありますか。', it: 'Eh? E dov’è?' }, { io: 'あ、ちがいます。なくしました。', it: 'Ah, no, scusi. L’ho perso.' }, { nota: '「ひろう」は おちて いる ものを 手に とる こと、「なくす」は ものが どこかへ 行って しまう ことです。', it: 'ひろう = raccogliere, trovare per terra; なくす = perdere.' }] }
					]
				},
				{ dice: 'nakamura', ja: '中村[なかむら]です。ちょうど 交番[こうばん]に 来て いました。', it: 'Sono Nakamura (ispettore). Ero giusto passato dal posto di polizia.' },
				{ dice: 'nakamura', ja: 'さいふですか。きのうの 夜、学生が 一つ とどけて くれましたよ。茶色の さいふです。', it: 'Un portafoglio? Ieri sera uno studente ce ne ha portato uno. Un portafoglio marrone.', taccuino: true },
				{ dice: 'nakamura', faccia: 'pensieroso', ja: 'でも、あなたのですか。中に お金は いくら 入って いますか。', it: 'Ma è suo? Quanti soldi ci sono dentro?' },
				{
					domanda: {
						ja: 'さいふの 中に お金は いくら 入って いますか。', it: 'Quanti soldi ci sono nel portafoglio? (guarda quanto hai speso ieri)',
						opzioni: [], // generate dai soldi che hai (opzioniSoldi)
						giusta: 'soldi', spiega: 'Avevi 5000 yen; ieri hai pagato il pranzo, la posta (140) e il latte (200). Il resto è ancora nel portafoglio: quanto ti resta lo vedi in alto (¥).'
					}
				},
				{ dice: 'nakamura', ja: 'ほかに 何か 入って いますか。', it: 'C’è dentro qualcos’altro?' },
				{
					prova: {
						ja: 'さいふの 中に 何が 入って いますか。', it: 'Mostra qualcosa che sai essere nel portafoglio.',
						giuste: ['ricevuta_posta', 'scontrino'],
						ok: [{ dice: 'nakamura', ja: 'はい、ありますね。じゃ、これは あなたの さいふです。', it: 'Sì, c’è. Allora questo portafoglio è suo.' }],
						no: [{ dice: 'nakamura', ja: 'うーん、それは 入って いませんね。……でも、お金も 名前の カードも あって いますから、だいじょうぶでしょう。', it: 'Mmm, questo non c’è. …Però i soldi e la tessera col nome corrispondono, quindi va bene.' }]
					}
				},
				{ prendi: 'portafoglio', it: 'portafoglio' },
				{ completa: 'portafoglio' },
				{ completa: 'koban' },
				{ dice: 'nakamura', ja: 'とどけて くれたのは 高橋[たかはし]くんと いう 高校生です。夜、日本語学校で 手つだいを して いるそうですよ。', it: 'Chi l’ha portato è un liceale che si chiama Takahashi. Dice che la sera fa da aiutante alla scuola di giapponese.', taccuino: true },
				{ dice: 'nakamura', ja: '学校は 月曜日と 水曜日と 金曜日の 夜 6時からです。', it: 'La scuola è il lunedì, il mercoledì e il venerdì dalle 6 di sera.', taccuino: true },
				{ obiettivo: 'grazie', ja: '日本語学校（月・水・金 6時から）で 高橋[たかはし]くんに おれいを 言う。プレゼントも あると いい。', it: 'Ringraziare 高橋くん al 日本語学校 (lun, mer, ven dalle 18). Magari con un regalo.' },
				{ dice: 'nakamura', faccia: 'pensieroso', ja: 'あなたは よく 見て いますね。じゃ、気を つけて。', it: 'Lei osserva bene le cose. Allora, stia attent{o}.' },
				{ minuti: 15 },
				{ flag: 'portafoglio.ok' }
			]
		},
		{
			id: 'd1-ufficio-pomeriggio', luogo: 'ufficio', quando: { giorno: 1, dalle: h(12, 30), flag: ['d1.ufficio'] },
			passi: [
				{ se: { flag: ['portafoglio.ok'] }, allora: [{ dice: 'tanaka', ja: 'さいふ、見つかったんですか。よかったですね！', it: 'Il portafoglio l’ha ritrovato? Meno male!' }], altrimenti: [{ dice: 'tanaka', ja: 'さいふ、まだ 見つかりませんか。仕事の あとで さがして みたら？', it: 'Il portafoglio non l’ha ancora trovato? Perché non lo cerca dopo il lavoro?' }] },
				{ ora: h(14) },
				{ dice: 'mori', ja: '{nome}さん、まず この メールを 読んで ください。それから 田中さんと いっしょに 来週の 予定[よてい]を きめて ください。コピーは あとで いいです。', it: '{nome}, prima legga questa email. Poi decida con Tanaka il programma della settimana prossima. Le fotocopie possono aspettare.', taccuino: true },
				{
					domanda: {
						ja: '{nome}さんは さいしょに 何を しますか。', it: 'Cosa fai per prima cosa?',
						opzioni: [{ ja: 'コピーを する', it: 'le fotocopie' }, { ja: 'メールを 読む', it: 'leggere l’email' }, { ja: '田中さんと 話す', it: 'parlare con Tanaka' }, { ja: '電話を かける', it: 'telefonare' }],
						giusta: 1, spiega: '「まず … それから … コピーは あとで いい」: まず = prima di tutto; あとで いい = può aspettare.'
					}
				},
				{ narra: 'メールです：「来週の 水曜日、10時に おきゃくさんが 来ます。{nome}さんは 9時50分に 1かいで 待って いて ください。」', it: 'L’email: «Mercoledì prossimo alle 10 viene un cliente. {nome}, lo aspetti al piano terra alle 9:50.»' },
				{
					domanda: {
						ja: '{nome}さんは 来週 何曜日の 何時に、どこで 待ちますか。', it: 'Mercoledì prossimo: a che ora e dove aspetti?',
						opzioni: [{ ja: '水曜日の 10時に 1かいで', it: 'mercoledì alle 10, piano terra' }, { ja: '水曜日の 9時50分に 1かいで', it: 'mercoledì alle 9:50, piano terra' }, { ja: '木曜日の 9時50分に 1かいで', it: 'giovedì alle 9:50, piano terra' }, { ja: '水曜日の 9時50分に 3かいで', it: 'mercoledì alle 9:50, terzo piano' }],
						giusta: 1, spiega: 'Il cliente arriva alle 10, ma tu devi essere lì alle 9:50: occhio a chi fa cosa e a che ora.'
					}
				},
				{ dice: 'tanaka', ja: '{nome}さん、来週の 予定[よてい]ですが、ぼくは 月曜日と 火曜日は 出張[しゅっちょう]で いません。', it: '{nome}, per il programma della settimana prossima: lunedì e martedì sono in trasferta.', taccuino: true },
				{ dice: 'tanaka', ja: 'じゃ、うちあわせは 木曜日の 午後に しましょうか。', it: 'Allora facciamo la riunione giovedì pomeriggio?' },
				{
					scelta: [
						{ ja: 'はい、木曜日の 午後で いいです。', it: 'Sì, giovedì pomeriggio va bene.' },
						{ ja: 'すみません、木曜日は ちょっと……。金曜日は どうですか。', it: 'Mi scusi, giovedì non posso… Venerdì?', passi: [{ dice: 'tanaka', ja: 'いいですよ。じゃ、金曜日の 午後に しましょう。', it: 'Va bene. Allora venerdì pomeriggio.' }] }
					]
				},
				{ narra: '5時半まで 仕事を しました。', it: 'Lavori fino alle 17:30.' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'おつかれさまでした。', it: 'Buon lavoro (a domani).' },
				{ flag: 'd1.lavoro' }
			]
		},
		{
			id: 'd1-casa-sera', luogo: 'casa', quando: { giorno: 1, dalle: h(17), flag: ['d1.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。さいふは？', it: 'Bentornat{o}. E il portafoglio?' },
				{
					se: { flag: ['portafoglio.ok'] },
					allora: [{ io: '交番[こうばん]に ありました！ 学生が とどけて くれました。', it: 'Era al posto di polizia! Uno studente l’ha portato lì.' }, { dice: 'mamma', ja: 'よかったわね！', it: 'Che bello!' }],
					altrimenti: [{ io: 'まだ 見つかりません……。', it: 'Non l’ho ancora trovato…' }, { dice: 'mamma', ja: '明日、交番[こうばん]に 行って みたら？', it: 'Domani perché non provi al posto di polizia?' }, { obiettivo: 'koban', ja: '交番[こうばん]へ 行って、さいふの ことを 聞く。', it: 'Andare al 交番 a chiedere del portafoglio.' }]
				},
				...cena([
					{
						domanda: {
							ja: '{nome}さんは さいふを いつ なくしましたか。', it: 'Quando hai perso il portafoglio?',
							opzioni: [{ ja: '昼ご飯の 前', it: 'prima di pranzo' }, { ja: '昼ご飯の あと', it: 'dopo pranzo' }, { ja: '今朝', it: 'stamattina' }, { ja: '会社で', it: 'in ufficio' }],
							giusta: 1, spiega: 'Al ristorante l’avevi ancora (hai pagato in contanti): l’hai perso dopo pranzo, davanti alla konbini. 〜の あと(で) = dopo….'
						}
					},
					{
						domanda: {
							ja: '日本語学校は 何曜日に ありますか。', it: 'In che giorni c’è la scuola di giapponese?',
							opzioni: [{ ja: '月・水・金', it: 'lun, mer, ven' }, { ja: '火・木', it: 'mar, gio' }, { ja: '月・火・水', it: 'lun, mar, mer' }, { ja: '毎日', it: 'tutti i giorni' }],
							giusta: 0, spiega: '「月曜日と 水曜日と 金曜日の 夜 6時からです」.'
						}
					}
				])
			]
		},

		// ───────── giorno 2: mercoledì 8 aprile ─────────
		{
			id: 'd2-casa-mattina', luogo: 'casa', quando: { giorno: 2, nonFlag: ['d2.casa'] },
			passi: [
				{ narra: '4月8日（水）、朝 7時半。', it: 'Mercoledì 8 aprile, ore 7:30.' },
				{
					se: { flag: ['portafoglio.ok'] },
					allora: [
						{ dice: 'mamma', ja: '高橋[たかはし]くんに おれいを したら どう？ パン屋の パンは おいしいわよ。花も いいわね。', it: 'Perché non fai un regalo a Takahashi per ringraziarlo? Il pane della panetteria è buono. Anche i fiori vanno bene.', taccuino: true },
						{ obiettivo: 'regalo', ja: '高橋[たかはし]くんへの プレゼントを 買う（パン屋 朝7時〜夜7時、花屋 朝10時〜夜7時）。', it: 'Comprare un regalo per 高橋くん (パン屋 7-19 o 花屋 10-19).' }
					],
					altrimenti: [{ dice: 'mamma', ja: '今日は 交番[こうばん]に 行ってね。', it: 'Oggi vai al posto di polizia, eh.' }]
				},
				{ dice: 'papa', ja: '今日は 水曜日だから、喫茶[きっさ]あおいは 休みだよ。', it: 'Oggi è mercoledì, quindi il caffè Aoi è chiuso.' },
				{ flag: 'd2.casa' }
			]
		},
		{
			id: 'd2-ufficio', luogo: 'ufficio', quando: { giorno: 2, nonFlag: ['d2.ufficio'] },
			passi: [
				{ dice: 'mori', ja: 'おはようございます。今日は 5時半から かいぎが ありますから、それまでに この 資料[しりょう]を 読んで おいて ください。', it: 'Buongiorno. Oggi alle 17:30 c’è una riunione: entro allora legga questo materiale.', taccuino: true },
				{ ora: h(11) },
				{ dice: 'suzuki', ja: '今日は いそがしいので、昼ご飯は おべんとうを たのみます。田中さんは さかな、わたしは にくです。{nome}さんは どっちに しますか。', it: 'Oggi siamo di corsa, quindi a pranzo ordiniamo il bento. Tanaka prende pesce, io carne. {nome}, lei quale prende?' },
				{
					scelta: [
						{ ja: 'さかなに します。', it: 'Prendo il pesce.', passi: [{ flag: 'd2.bento_pesce' }] },
						{ ja: 'にくに します。', it: 'Prendo la carne.' }
					]
				},
				{
					se: { oggetti: ['portafoglio'] },
					allora: [{ dice: 'suzuki', ja: '一つ 500円です。', it: 'Sono 500 yen l’uno.' }, { soldi: -500 }],
					altrimenti: [{ dice: 'suzuki', ja: 'さいふが ないんですか。今日は わたしが はらいますね。', it: 'Non ha il portafoglio? Oggi pago io.' }]
				},
				{
					se: { flag: ['d2.bento_pesce'] },
					allora: [{
						domanda: {
							ja: '鈴木[すずき]さんは さかなの おべんとうを いくつ たのみますか。', it: 'Quanti bento di pesce ordina Suzuki?',
							opzioni: [{ ja: '一つ', it: 'uno' }, { ja: '二つ', it: 'due' }, { ja: '三つ', it: 'tre' }, { ja: 'ゼロ', it: 'nessuno' }],
							giusta: 1, spiega: 'Pesce per Tanaka e per te: ふたつ. Suzuki prende carne.'
						}
					}],
					altrimenti: [{
						domanda: {
							ja: '鈴木[すずき]さんは さかなの おべんとうを いくつ たのみますか。', it: 'Quanti bento di pesce ordina Suzuki?',
							opzioni: [{ ja: '一つ', it: 'uno' }, { ja: '二つ', it: 'due' }, { ja: '三つ', it: 'tre' }, { ja: 'ゼロ', it: 'nessuno' }],
							giusta: 0, spiega: 'Pesce solo per Tanaka: ひとつ. Suzuki e tu prendete carne.'
						}
					}]
				},
				{ narra: '午前中、仕事を して、資料[しりょう]を 読みました。', it: 'Lavori e leggi il materiale tutta la mattina.' },
				{ ora: h(12) },
				{ flag: 'd2.ufficio' }
			]
		},
		{
			id: 'd2-ufficio-pomeriggio', luogo: 'ufficio', quando: { giorno: 2, dalle: h(12, 30), flag: ['d2.ufficio'] },
			passi: [
				{ ora: h(14) },
				{ dice: 'suzuki', ja: '{nome}さん、5時半の かいぎの じゅんびを 手つだって ください。いすを 8つ ならべて おいて ください。お茶は わたしが します。', it: '{nome}, mi aiuti a preparare la riunione delle 17:30. Metta in fila 8 sedie. Il tè lo preparo io.', taccuino: true },
				{
					domanda: {
						ja: '{nome}さんは 何を しますか。', it: 'Cosa devi fare tu?',
						opzioni: [{ ja: 'いすを 8つ ならべる', it: 'mettere 8 sedie' }, { ja: 'お茶を じゅんびする', it: 'preparare il tè' }, { ja: 'いすを 8つと お茶', it: '8 sedie e il tè' }, { ja: 'しりょうを 8まい コピーする', it: 'fare 8 copie' }],
						giusta: 0, spiega: '「お茶は わたしが します」: il tè lo fa Suzuki. A te restano le sedie (〜て おく = preparare prima).'
					}
				},
				{ narra: 'かいぎしつに いすを ならべました。そのあと、夕方まで 自分の 仕事を しました。', it: 'Metti le sedie in sala riunioni. Poi lavori alle tue cose fino a sera.' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'では、かいぎを はじめます。', it: 'Allora, cominciamo la riunione.' },
				{ dice: 'mori', ja: '来月から、会社は 毎週 水曜日、6時までに しまります。ざんぎょうは しないで ください。', it: 'Dal mese prossimo, ogni mercoledì l’ufficio chiude entro le 18. Niente straordinari, per favore.', taccuino: true },
				{
					domanda: {
						ja: '来月から 水曜日は どう なりますか。', it: 'Dal mese prossimo, cosa cambia il mercoledì?',
						opzioni: [{ ja: '会社が 休みに なる', it: 'l’ufficio è chiuso' }, { ja: '6時までに 帰る', it: 'si va a casa entro le 18' }, { ja: '6時から かいぎが ある', it: 'c’è una riunione alle 18' }, { ja: 'ざんぎょうを する', it: 'si fanno gli straordinari' }],
						giusta: 1, spiega: '「6時までに しまります」「ざんぎょうは しないで ください」: 〜ないで ください = non fate…'
					}
				},
				{ minuti: 30 },
				{ dice: 'mori', ja: '今日は ここまで。おつかれさまでした。', it: 'Per oggi è tutto. Buon lavoro.' },
				{ narra: '6時です。パン屋と 花屋は 7時に しまります。学校は 6時からです。', it: 'Sono le 18:00. La panetteria e il fioraio chiudono alle 19, la scuola apre alle 18.' },
				{ flag: 'd2.lavoro' }
			]
		},
		{
			id: 'd2-panya', luogo: 'panya', quando: { giorno: 2, flag: ['portafoglio.ok'], nonOggetti: ['sacchetto_pane', 'mazzo_fiori'], nonFlag: ['grazie.ok'] },
			passi: [
				{ dice: 'fornaia', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ io: 'プレゼントに したいんですが、どれが いいですか。', it: 'Vorrei farne un regalo: quale mi consiglia?' },
				{ dice: 'fornaia', ja: 'この クリームパンが いちばん 人気が ありますよ。三つで 450円です。', it: 'Questo pane alla crema è il più richiesto. Tre a 450 yen.' },
				{
					scelta: [
						{ ja: 'じゃ、それを 三つ ください。', it: 'Allora me ne dia tre.', passi: [{ soldi: -450 }, { prendi: 'sacchetto_pane', it: 'pane alla crema (regalo)' }, { completa: 'regalo' }, { dice: 'fornaia', ja: 'ありがとうございました。', it: 'Grazie.' }] },
						{ ja: 'すみません、また 来ます。', it: 'Scusi, ripasso.' }
					]
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'd2-hanaya', luogo: 'hanaya', quando: { giorno: 2, flag: ['portafoglio.ok'], nonOggetti: ['sacchetto_pane', 'mazzo_fiori'], nonFlag: ['grazie.ok'] },
			passi: [
				{ dice: 'fioraia', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ io: 'おれいに 花を あげたいんですが。', it: 'Vorrei regalare dei fiori per ringraziare.' },
				{ dice: 'fioraia', ja: 'それなら、この 小さい 花たばは どうですか。1000円です。', it: 'Allora, che ne dice di questo mazzolino? 1000 yen.' },
				{
					scelta: [
						{ ja: 'じゃ、それに します。', it: 'Allora prendo quello.', passi: [{ soldi: -1000 }, { prendi: 'mazzo_fiori', it: 'mazzo di fiori (regalo)' }, { completa: 'regalo' }, { dice: 'fioraia', ja: 'ありがとうございました。', it: 'Grazie.' }] },
						{ ja: 'ちょっと 高いですね。また 来ます。', it: 'È un po’ caro. Ripasso.' }
					]
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'd2-gakkou', luogo: 'gakkou', quando: { giorno: 2, flag: ['portafoglio.ok'], nonFlag: ['grazie.ok'] },
			passi: [
				{ dice: 'sensei', ja: 'こんばんは。何か ご用ですか。', it: 'Buonasera. Desidera?' },
				{ io: '高橋[たかはし]くんに 会いたいんですが。', it: 'Vorrei vedere Takahashi.' },
				{ dice: 'sensei', ja: 'ああ、高橋[たかはし]くんですね。ちょっと まって ください。', it: 'Ah, Takahashi. Aspetti un momento.' },
				{ dice: 'takahashi', faccia: 'sorpreso', ja: 'あ、さいふの 人ですか。交番[こうばん]の 人から 聞きました。', it: 'Ah, lei è quello del portafoglio? Me l’hanno detto alla polizia.' },
				{
					scelta: [
						{ ja: 'さいふを とどけて くれて、ありがとうございました。', it: 'Grazie per avermi riportato il portafoglio.', passi: [{ dice: 'takahashi', faccia: 'imbarazzato', ja: 'いいえ、どういたしまして。', it: 'Di niente.' }] },
						{
							ja: 'さいふを とどけて あげて、ありがとう。', it: '(?) Grazie per… averlo riportato a qualcun altro.',
							passi: [
								{ dice: 'takahashi', faccia: 'sorpreso', ja: 'え？ ……あ、「とどけて くれて」ですね。', it: 'Eh? …Ah, vuole dire 「とどけて くれて」.' },
								{ nota: '高橋[たかはし]くんが あなたに して くれました：「〜て くれる」。「〜て あげる」は あなたが だれかに する ときです。', it: 'Il favore lo ha fatto lui a te: 〜て くれる. 〜て あげる è quando sei tu a fare un favore agli altri.' },
								{ io: 'あ、すみません。とどけて くれて、ありがとうございました。', it: 'Ah, scusi. Grazie per avermelo riportato.' }
							]
						}
					]
				},
				{
					se: { oggetti: ['sacchetto_pane'] },
					allora: [{ io: 'これ、少しですが、どうぞ。', it: 'Ecco, è poca cosa, ma prego.' }, { togli: 'sacchetto_pane' }, { dice: 'takahashi', ja: 'えっ、クリームパン！ ぼく、大好きなんです。ありがとうございます！', it: 'Oh, pane alla crema! Lo adoro. Grazie!' }, { flag: 'regalo.dato' }]
				},
				{
					se: { oggetti: ['mazzo_fiori'] },
					allora: [{ io: 'これ、少しですが、どうぞ。', it: 'Ecco, è poca cosa, ma prego.' }, { togli: 'mazzo_fiori' }, { dice: 'takahashi', ja: 'えっ、花ですか。母が よろこびます。ありがとうございます！', it: 'Oh, dei fiori? Mia madre ne sarà contenta. Grazie!' }, { flag: 'regalo.dato' }]
				},
				{ dice: 'takahashi', ja: 'ぼくは 高校生ですが、夜は ここで 手つだいを して います。{nome}さんも 日本語を べんきょうしに 来ませんか。', it: 'Sono un liceale, ma la sera do una mano qui. Perché non viene anche lei a studiare giapponese?' },
				{ io: 'はい、ぜひ。', it: 'Sì, volentieri.' },
				{ completa: 'grazie' },
				{ minuti: 30 },
				{ flag: 'grazie.ok' }
			]
		},
		{
			id: 'd2-casa-sera', luogo: 'casa', quando: { giorno: 2, dalle: h(17), flag: ['d2.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				{ narra: '夕ご飯の あとで、電話が なりました。中村[なかむら]さんからです。', it: 'Dopo cena squilla il telefono. È l’ispettore Nakamura.', suono: 'telefono' },
				{ dice: 'nakamuraTel', ja: 'もしもし、{nome}さんですか。交番[こうばん]の 中村[なかむら]です。', it: 'Pronto, parlo con {nome}? Sono Nakamura, del posto di polizia.' },
				{ dice: 'nakamuraTel', ja: 'じつは、わたしは けいじです。あなたは よく 見て、よく 聞いて いますね。', it: 'In realtà sono un ispettore. Lei osserva e ascolta con attenzione.' },
				{ dice: 'nakamuraTel', ja: 'この 町では ときどき ふしぎな ことが あります。今度、少し 手つだって くれませんか。', it: 'In questo quartiere ogni tanto succedono cose strane. Mi darebbe una mano, la prossima volta?' },
				{
					scelta: [
						{ ja: 'はい、よろこんで。', it: 'Sì, con piacere.' },
						{ ja: 'わたしで よければ……。', it: 'Se vado bene io…' }
					]
				},
				{ dice: 'nakamuraTel', ja: 'ありがとう。また 電話します。', it: 'Grazie. La richiamo.' },
				...cena(
					[
						{
							domanda: {
								ja: 'だれが {nome}さんの さいふを 交番[こうばん]に とどけましたか。', it: 'Chi ha portato il tuo portafoglio al posto di polizia?',
								opzioni: [{ ja: 'コンビニの 店員', it: 'la commessa della konbini' }, { ja: '高校生の 高橋[たかはし]くん', it: 'il liceale Takahashi' }, { ja: '田中さん', it: 'Tanaka' }, { ja: '中村[なかむら]さん', it: 'Nakamura' }],
								giusta: 1, spiega: '「学生が 一つ とどけて くれました」「高橋くんと いう 高校生です」.'
							}
						},
						{
							domanda: {
								ja: '今日の かいぎは 何時からでしたか。', it: 'A che ora era la riunione di oggi?',
								opzioni: [{ ja: '5時', it: 'alle 17' }, { ja: '5時半', it: 'alle 17:30' }, { ja: '6時', it: 'alle 18' }, { ja: '6時半', it: 'alle 18:30' }],
								giusta: 1, spiega: '「今日は 5時半から かいぎが あります」: 半 = e mezza.'
							}
						},
						{
							domanda: {
								ja: '中村[なかむら]さんは {nome}さんに 何を たのみましたか。', it: 'Cosa ti ha chiesto Nakamura?',
								opzioni: [{ ja: '学校で べんきょうする こと', it: 'studiare a scuola' }, { ja: '時々 しごとを 手つだう こと', it: 'aiutarlo ogni tanto' }, { ja: 'さいふを さがす こと', it: 'cercare un portafoglio' }, { ja: '電話を かける こと', it: 'telefonargli' }],
								giusta: 1, spiega: '「今度、少し 手つだって くれませんか」: 〜て くれませんか = mi farebbe il favore di…?'
							}
						}
					],
					[{ fine: 'はじめての 一週間' }]
				)
			]
		}
	]
};
