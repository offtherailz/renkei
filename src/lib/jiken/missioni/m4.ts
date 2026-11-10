// Missione 4 — 美術館[びじゅつかん]の じけん. Tre giornate: 4/27-4/29 (il 29 è
// 昭和の日, festa: inizio della Golden Week). Nessun colpevole: due biglietti che
// nessuno ha letto. La pittrice 青木 è venuta alle 7 a ritoccare il quadro e ha
// lasciato un biglietto sulla parete; l'addetto alle pulizie ci ha messo davanti
// il cartello del pavimento bagnato. Il curatore 小林 non ha mai aperto la lettera
// in cui lei lo avvisava. Forme: 受身形 (ぬすまれた / はこばれた / かくされた),
// 〜て しまう. Prove d'esame: fogli da leggere (情報検索) e un annuncio (聴解).
import type { Missione, Passo } from '../tipi';
import { arrivo, mattino, rientro, serata } from './comune';

const h = (ore: number, min = 0): number => ore * 60 + min;

const cena = (domande: Passo[], dopo: Passo[] = []): Passo[] => [
	...serata(),
	{ narra: 'ねる 前に、今日の ことを 思い出します。ノートも 見て ください。', it: 'Prima di dormire ripensi alla giornata. Il taccuino ti aiuta.' },
	...domande,
	...dopo,
	{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' },
	{ dormi: true }
];

// il volantino della mostra: serve il lunedì (domande) e si ritrova nel taccuino
const VOLANTINO: Passo = {
	avviso: {
		tipo: 'volantino',
		titolo: '山野美術館[やまのびじゅつかん]　リニューアル オープン',
		righe: [
			'てんらんかい｜「さくらと ねこ」　青木[あおき] みどり',
			'きかん｜4月29日（水・しゅくじつ）〜 6月7日（日）',
			'時間｜9時半 〜 5時（入るのは 4時半まで）',
			'休み｜月曜日（しゅくじつの ときは 開いて います）',
			'りょうきん｜大人 800円　学生 500円　小学生 300円',
			'29日 10時から オープニングの しきが あります。'
		],
		it: 'Museo di Yamano — riapertura. Mostra «Sakura e gatto» di Aoki Midori. Dal 29 aprile (mer, festivo) al 7 giugno (dom). Orario 9:30-17:00 (ingresso fino alle 16:30). Chiuso il lunedì (aperto se festivo). Biglietti: adulti 800, studenti 500, elementari 300 yen. Il 29 alle 10 cerimonia di apertura.'
	}
};

export const M4: Missione = {
	id: 'm4',
	titolo: '美術館[びじゅつかん]の じけん',
	it: 'Il caso del museo',
	epilogo: {
		ja: 'えは ぬすまれたのでは なく、青木[あおき]さんが はこんで いました。メモも 手紙も、だれにも 読まれて いなかったのです。美術館[びじゅつかん]は ぶじに オープンしました。',
		it: 'Il quadro non era stato rubato: l’aveva portato via Aoki. Il biglietto e la lettera non li aveva letti nessuno. Il museo ha riaperto senza problemi.'
	},
	inizio: { giorno: 21, flag: ['d0.casa', 'portafoglio.ok', 'grazie.ok', 'mike.ok', 'jinja.aperto', 'treno.ok', 'm3.riunione'], oggetti: ['portafoglio', 'carta_ic2'] },
	scene: [
		// ───────── giorno 21: lunedì 27 aprile ─────────
		{
			id: 'm4-d21-casa', luogo: 'casa', quando: { giorno: 21, nonFlag: ['m4.d21.casa'] },
			passi: [
				{ narra: '4月27日（月）、朝 7時半。', it: 'Lunedì 27 aprile, ore 7:30.' },
				{ dice: 'mamma', ja: 'あさっての 29日は 昭和[しょうわ]の日で、お休みね。ゴールデンウィークの 始まりよ。', it: 'Dopodomani, il 29, è lo Shōwa no hi: giorno di festa. Comincia la Golden Week.' },
				{ nota: 'ゴールデンウィーク: dal 29 aprile ai primi di maggio in Giappone ci sono quattro feste vicine. Molti prendono le ferie e i treni si riempiono.', it: 'Golden Week: tra fine aprile e inizio maggio cadono quattro feste.' },
				{ flag: 'm4.d21.casa' },
				...mattino(),
				{ minuti: 20 } // colazione e preparativi: si esce verso le 7:50
			]
		},
		{
			id: 'm4-d21-ufficio', luogo: 'ufficio', quando: { giorno: 21, nonFlag: ['m4.d21.ufficio'] },
			passi: [
				arrivo(),
				{ dice: 'mori', ja: 'みなさん、おしらせです。さくら会社は 山野美術館[やまのびじゅつかん]の てんらんかいの スポンサーに なりました。', it: 'Attenzione, un annuncio. La さくら会社 è diventata sponsor di una mostra al museo di Yamano.', taccuino: true },
				{ dice: 'mori', ja: '{nome}さん、会社の かかりを おねがいします。あしたの ごご、美術館[びじゅつかん]へ 行って、じゅんびを 手つだって ください。', it: '{nome}, faccia lei da referente della ditta. Domani pomeriggio vada al museo ad aiutare con i preparativi.', taccuino: true },
				{ dice: 'mori', ja: 'これが てんらんかいの ちらしです。よく 読んで おいて くださいね。', it: 'Questo è il volantino della mostra. Lo legga bene.' },
				VOLANTINO,
				{
					domanda: {
						ja: 'ゴールデンウィークに、学生の 友だちと 二人で 行きます。二人で いくら はらいますか。', it: 'Nella Golden Week ci vai con un amico studente. Quanto pagate in due?',
						opzioni: [{ ja: '1300円', it: '1300 yen' }, { ja: '1600円', it: '1600 yen' }, { ja: '1000円', it: '1000 yen' }, { ja: '800円', it: '800 yen' }],
						giusta: 0, spiega: 'Tu sei adulto: 800 yen; l’amico studente: 500. 800 + 500 = 1300. Nel 情報検索 dell’esame bisogna combinare due righe della tabella.'
					}
				},
				{ flag: 'm4.museo' },
				{ obiettivo: 'museo4', ja: 'あしたの ごご、美術館[びじゅつかん]へ じゅんびの 手つだいに 行く。', it: 'Domani pomeriggio, andare al museo ad aiutare coi preparativi.' },
				{ flag: 'm4.d21.ufficio' },
				{ ora: h(12) }
			]
		},
		{
			id: 'm4-d21-pomeriggio', luogo: 'ufficio', quando: { giorno: 21, dalle: h(12, 30), flag: ['m4.d21.ufficio'], nonFlag: ['m4.d21.pomeriggio'] },
			passi: [
				rientro(),
				{ dice: 'suzuki', ja: '{nome}さん、わたしも 5月4日に 美術館[びじゅつかん]へ 行きたいんです。でも、その日は 月曜日ですよね。', it: '{nome}, anch’io vorrei andare al museo il 4 maggio. Ma quel giorno è lunedì, vero?' },
				{ dice: 'suzuki', ja: '5月4日は みどりの日で、しゅくじつです。', it: 'Il 4 maggio è la Festa del Verde: è festivo.' },
				{
					domanda: {
						ja: '5月4日（月・しゅくじつ）、鈴木[すずき]さんは 美術館[びじゅつかん]に 入れますか。', it: 'Il 4 maggio (lunedì, festivo) Suzuki può entrare al museo?',
						opzioni: [{ ja: '入れる', it: 'sì' }, { ja: '月曜日だから 入れない', it: 'no, è lunedì' }, { ja: '午前だけ 入れる', it: 'solo la mattina' }, { ja: '学生だけ 入れる', it: 'solo gli studenti' }],
						giusta: 0, spiega: '「休み｜月曜日（しゅくじつの ときは 開いて います）」: il lunedì è chiuso, ma se è festivo apre. Le eccezioni tra parentesi sono una trappola classica del 情報検索.'
					}
				},
				{ dice: 'suzuki', ja: 'よかった！ じゃあ、4時半までに 入りますね。', it: 'Meno male! Allora entro prima delle 16:30.' },
				{ narra: 'ごごは スポンサーの しょるいを 作りました。', it: 'Il pomeriggio prepari i documenti per la sponsorizzazione.' },
				{ flag: 'm4.d21.pomeriggio' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'おつかれさまでした。あしたは 12時に 会社を 出て ください。', it: 'Buon lavoro. Domani esca dalla ditta alle 12.' }
			]
		},
		{
			id: 'm4-d21-casa-sera', luogo: 'casa', quando: { giorno: 21, dalle: h(17), flag: ['m4.d21.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。美術館[びじゅつかん]の しごと？ すてきね。', it: 'Bentornat{o}. Un lavoro al museo? Che bello.' },
				...cena([
					{
						domanda: {
							ja: '美術館[びじゅつかん]に 入れるのは 何時までですか。', it: 'Fino a che ora si può entrare al museo?',
							opzioni: [{ ja: '4時半', it: '16:30' }, { ja: '5時', it: '17:00' }, { ja: '9時半', it: '9:30' }, { ja: '10時', it: '10:00' }],
							giusta: 0, spiega: '「9時半 〜 5時（入るのは 4時半まで）」: si chiude alle 5, ma si entra solo fino alle 4 e mezza.'
						}
					},
					{
						domanda: {
							ja: '森[もり]ぶちょうは {nome}さんに 何を たのみましたか。', it: 'Che cosa ti ha chiesto Mori?',
							opzioni: [{ ja: '美術館[びじゅつかん]の じゅんびを 手つだう こと', it: 'aiutare a preparare il museo' }, { ja: 'えを かう こと', it: 'comprare un quadro' }, { ja: 'ちらしを 作る こと', it: 'fare il volantino' }, { ja: 'きっぷを 売る こと', it: 'vendere i biglietti' }],
							giusta: 0, spiega: '「美術館へ 行って、じゅんびを 手つだって ください」: 〜て ください = richiesta.'
						}
					}
				])
			]
		},

		// ───────── giorno 22: martedì 28 aprile ─────────
		{
			id: 'm4-d22-casa', luogo: 'casa', quando: { giorno: 22, nonFlag: ['m4.d22.casa'] },
			passi: [
				{ narra: '4月28日（火）、朝 7時半。', it: 'Martedì 28 aprile, ore 7:30.' },
				{ dice: 'papa', ja: 'きょうは 美術館[びじゅつかん]か。いい えを 見て おいでよ。', it: 'Oggi museo, eh? Guarda bei quadri.' },
				{ flag: 'm4.d22.casa' },
				...mattino(),
				{ minuti: 20 }
			]
		},
		{
			id: 'm4-d22-ufficio', luogo: 'ufficio', quando: { giorno: 22, nonFlag: ['m4.d22.ufficio'] },
			passi: [
				arrivo(),
				{ dice: 'mori', ja: '{nome}さん、ごごは 美術館[びじゅつかん]です。小林[こばやし]さんと いう 人が 待って います。', it: '{nome}, il pomeriggio è al museo. L’aspetta un certo Kobayashi.', taccuino: true },
				{ dice: 'tanaka', ja: 'いいなあ。ぼくも えを 見に 行きたいですよ。', it: 'Che fortuna. Anch’io vorrei andare a vedere i quadri.' },
				{ narra: '午前中は メールの へんじを 書きました。', it: 'In mattinata rispondi alle email.' },
				{ flag: 'm4.d22.ufficio' },
				{ ora: h(12) },
				{ dice: 'mori', ja: 'では、行って らっしゃい。電車で 行って ください。', it: 'Bene, vada pure. Ci vada in treno.' }
			]
		},
		{
			id: 'm4-museo-prep', luogo: 'museo', quando: { giorno: 22, dalle: h(12), flag: ['m4.museo'], nonFlag: ['m4.prep'] },
			passi: [
				{ dice: 'kobayashi', faccia: 'occupato', ja: 'さくら会社の {nome}さんですね。小林[こばやし]です。すみません、いま とても いそがしくて……。', it: 'Lei è {nome} della さくら会社, vero? Sono Kobayashi. Mi scusi, sono pieno di lavoro…' },
				{ dice: 'kobayashi', faccia: 'occupato', ja: 'この 三日間、手紙も メールも ぜんぜん 読んで いないんです。', it: 'In questi tre giorni non ho letto né lettere né email.', taccuino: true },
				{ narra: '「さくらと ねこ」の 大きな えが、特別な へやの まん中に かけて あります。', it: 'Il grande quadro «Sakura e gatto» è appeso al centro di una sala speciale.' },
				{ dice: 'aoki', faccia: 'preoccupata', ja: 'はじめまして、青木[あおき]です。……この ライトだと、ねこの 目が くらく 見えて しまうんです。', it: 'Piacere, sono Aoki. …Con questa luce gli occhi del gatto sembrano scuri.', taccuino: true },
				{ dice: 'aoki', faccia: 'preoccupata', ja: 'オープニングの 前に、すこし なおしたいです。小林さんに 手紙を 出したんですけど……。', it: 'Prima dell’apertura vorrei ritoccarlo un po’. Ho mandato una lettera a Kobayashi, ma…', taccuino: true },
				{ dice: 'kobayashi', faccia: 'occupato', ja: 'あっ、電話だ！ しつれいします！', it: 'Ah, il telefono! Mi scusi!' },
				{ narra: 'けいびの 人が 美術館[びじゅつかん]の きそくを 見せて くれました。', it: 'La guardia ti mostra il regolamento del museo.' },
				{
					avviso: {
						tipo: 'cartello',
						titolo: '美術館[びじゅつかん]の きそく',
						righe: ['しゃしんを とっては いけません。', '中で 食べたり 飲んだり しないで ください。', 'さくひんに さわらないで ください。', '大きい にもつは ロッカーへ（100円。あとで もどります）。', '小学生は 大人と いっしょに 入って ください。'],
						it: 'Regolamento del museo: vietato fotografare; non mangiare né bere all’interno; non toccare le opere; i bagagli grandi negli armadietti (100 yen, restituiti dopo); i bambini delle elementari entrano con un adulto.'
					}
				},
				{
					domanda: {
						ja: '美術館[びじゅつかん]の 中で、しても いい ことは どれですか。', it: 'Che cosa si può fare dentro il museo?',
						opzioni: [{ ja: '大きい にもつを ロッカーに 入れる', it: 'mettere i bagagli negli armadietti' }, { ja: 'えの しゃしんを とる', it: 'fotografare i quadri' }, { ja: 'ジュースを 飲む', it: 'bere un succo' }, { ja: 'えに さわる', it: 'toccare i quadri' }],
						giusta: 0, spiega: '〜ては いけません / 〜ないで ください = divieti. Gli armadietti sono l’unica cosa permessa (e i 100 yen tornano).'
					}
				},
				{ dice: 'pulizie', ja: 'あしたは オープニングだから、朝 7時から ゆかを そうじしますよ。', it: 'Domani c’è l’apertura, quindi dalle 7 lavo i pavimenti.', taccuino: true },
				{ narra: 'ポスターを はったり、いすを ならべたり して、手つだいました。', it: 'Aiuti attaccando poster e mettendo in fila le sedie.' },
				{ minuti: 150 },
				{ dice: 'kobayashi', ja: 'ありがとうございました。あさって、10時の オープニングで 会いましょう。', it: 'Grazie mille. Ci vediamo dopodomani all’apertura delle 10.' },
				{ completa: 'museo4' },
				{ pensa: '青木さん、しんぱいそうだった。喫茶[きっさ]あおいの 伊藤[いとう]さんなら、何か 知って いるかも しれない。', it: 'Aoki sembrava preoccupata. Forse Ito del caffè あおい sa qualcosa.' },
				{ obiettivo: 'aoi4', ja: '喫茶[きっさ]あおいで 伊藤[いとう]さんの 話を 聞く。', it: 'Sentire Ito al caffè あおい.' },
				{ flag: 'm4.prep' }
			]
		},
		{
			id: 'm4-kissa', luogo: 'kissa', quando: { giorno: 22, flag: ['m4.prep'], nonFlag: ['m4.kissa'] },
			passi: [
				{ dice: 'ito', ja: 'いらっしゃい。美術館[びじゅつかん]の 帰りですか。', it: 'Benvenut{o}. Di ritorno dal museo?' },
				{ dice: 'ito', ja: '青木[あおき]さんなら、きのう ここに 来ましたよ。「あさっての 朝 早く、ねこの 目を なおしに 行く」と 言って いました。', it: 'Aoki? È stata qui ieri. Ha detto: «dopodomani mattina presto vado a ritoccare gli occhi del gatto».', taccuino: true },
				{ dice: 'ito', ja: 'まじめな 人ですね。えの ことしか 考えて いないようです。', it: 'Una persona seria. Sembra che pensi solo ai suoi quadri.' },
				{ nota: '「〜と 言って いました」 riporta le parole di qualcun altro; 「〜ようです」 = sembra (da quello che si vede).', it: 'Discorso riportato e ようです.' },
				{ minuti: 30 },
				{ completa: 'aoi4' },
				{ flag: 'm4.kissa' }
			]
		},
		{
			id: 'm4-d22-casa-sera', luogo: 'casa', quando: { giorno: 22, dalle: h(17), flag: ['m4.d22.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。美術館[びじゅつかん]は どうだった？', it: 'Bentornat{o}. Com’era il museo?' },
				...cena([
					{
						domanda: {
							ja: '青木[あおき]さんは どうして しんぱいして いましたか。', it: 'Perché Aoki era preoccupata?',
							opzioni: [{ ja: 'ねこの 目が くらく 見えるから', it: 'gli occhi del gatto sembrano scuri' }, { ja: 'えが 売れないから', it: 'il quadro non si vende' }, { ja: '電車に おくれたから', it: 'ha perso il treno' }, { ja: 'ライトが こわれたから', it: 'la luce si è rotta' }],
							giusta: 0, spiega: '「ねこの 目が くらく 見えて しまう」: 〜て しまう = succede, purtroppo.'
						}
					},
					{
						domanda: {
							ja: 'あしたの 朝 7時に、だれが 美術館[びじゅつかん]で 何を しますか。', it: 'Domani alle 7, chi fa cosa al museo?',
							opzioni: [{ ja: 'そうじの 人が ゆかを そうじする', it: 'l’addetto lava i pavimenti' }, { ja: '小林さんが 手紙を 読む', it: 'Kobayashi legge le lettere' }, { ja: 'けいびの 人が ライトを かえる', it: 'la guardia cambia le luci' }, { ja: '森[もり]ぶちょうが しょるいを 持って 来る', it: 'Mori porta i documenti' }],
							giusta: 0, spiega: '「朝 7時から ゆかを そうじしますよ」 — l’ha detto l’addetto alle pulizie.'
						}
					}
				])
			]
		},

		// ───────── giorno 23: mercoledì 29 aprile (昭和の日) ─────────
		{
			id: 'm4-d23-casa', luogo: 'casa', quando: { giorno: 23, nonFlag: ['m4.d23.casa'] },
			passi: [
				{ narra: '4月29日（水・昭和[しょうわ]の日）、朝 7時半。', it: 'Mercoledì 29 aprile, Shōwa no hi (festa), ore 7:30.' },
				{ dice: 'mamma', ja: '今日は しゅくじつなのに、しごと？', it: 'Oggi è festa e lavori?' },
				{ io: 'はい。美術館[びじゅつかん]の オープニングです。', it: 'Sì. C’è l’apertura del museo.' },
				{ obiettivo: 'open4', ja: '9時半すぎに 美術館[びじゅつかん]へ 行く（10時から オープニング）。', it: 'Andare al museo dopo le 9:30 (apertura alle 10).' },
				{ flag: 'm4.d23.casa' },
				...mattino(),
				{ minuti: 20 }
			]
		},
		{
			id: 'm4-sparito', luogo: 'museo', quando: { giorno: 23, flag: ['m4.museo'], nonFlag: ['m4.sparito'] },
			passi: [
				{
					se: { alle: h(10, 30) },
					allora: [{ narra: '美術館[びじゅつかん]の 前に、人が たくさん います。でも、中が さわがしいです。', it: 'Davanti al museo c’è tanta gente. Ma dentro c’è agitazione.' }],
					altrimenti: [{ dice: 'mori', faccia: 'preoccupata', ja: '{nome}さん、おそいですよ！ たいへんな ことに なって います！', it: '{nome}, è in ritardo! È successo un guaio!' }]
				},
				{ dice: 'kobayashi', faccia: 'sorpreso', ja: 'た、たいへんです！ 「さくらと ねこ」の えが ありません！ ぬすまれました！', it: 'È… è terribile! Il quadro «Sakura e gatto» non c’è! L’hanno rubato!', taccuino: true },
				{ nota: '「ぬすまれました」 è il passivo (受身形[うけみけい]) di ぬすむ: il quadro «è stato rubato». Chi ha agito non si dice.', it: 'Passivo: è stato rubato.' },
				{
					domanda: {
						ja: 'アナウンスを 聞いて ください。おきゃくさんは 今 どこに 入れませんか。', it: 'Ascolta l’annuncio. Dove non possono entrare adesso i visitatori?',
						ascolto: { ja: 'おきゃくさまに ごあんない いたします。ただいま、二かいの てんじしつには 入れません。一かいの おみやげの 店と きっさてんは ごりよう いただけます。もうしわけ ございません。', it: 'Avviso ai visitatori. Al momento non si può entrare nella sala espositiva del primo piano. Il negozio di souvenir e il caffè al piano terra sono aperti. Ci scusiamo.', chi: 'F' },
						opzioni: [{ ja: '二かいの てんじしつ', it: 'la sala espositiva al 1° piano' }, { ja: '一かいの おみやげの 店', it: 'il negozio di souvenir' }, { ja: '一かいの きっさてん', it: 'il caffè al piano terra' }, { ja: '美術館[びじゅつかん]の 入り口', it: 'l’ingresso del museo' }],
						giusta: 0, spiega: '「二かいの てんじしつには 入れません」. Al 聴解 spesso si nominano più posti: la domanda chiede quello «dove non si può».'
					}
				},
				{ dice: 'nakamura', ja: 'おはようございます。今日は きゃくとして 来たんですが……。{nome}さん、いっしょに しらべましょう。', it: 'Buongiorno. Oggi ero venuto da invitato, ma… {nome}, indaghiamo insieme.' },
				{ obiettivo: 'guardia4', ja: 'けいびの 人の 話を 聞く。', it: 'Sentire la guardia.' },
				{ obiettivo: 'pulizie4', ja: 'そうじの 人の 話を 聞く。', it: 'Sentire l’addetto alle pulizie.' },
				{ obiettivo: 'kobayashi4', ja: '小林[こばやし]さんの 話を 聞く。', it: 'Sentire Kobayashi.' },
				{ completa: 'open4' },
				{ minuti: 10 },
				{ flag: 'm4.sparito' }
			]
		},
		{
			// dietro il cartello del pavimento bagnato: il biglietto di 青木 (prima di «indaga» nel file, apposta)
			id: 'm4-cartello', luogo: 'museo', quando: { giorno: 23, flag: ['m4.pulizie'], nonFlag: ['m4.memo'] },
			passi: [
				{ completa: 'kanban4' },
				{ narra: 'かべの 前の 「ゆかが ぬれて います」の かんばんを うごかすと……かべに 小さい メモが はって あります！', it: 'Sposti il cartello «pavimento bagnato» davanti alla parete… e sulla parete c’è un biglietto attaccato!' },
				{
					avviso: {
						tipo: 'biglietto',
						titolo: '小林[こばやし]さんへ',
						righe: ['朝 7時に 来ました。', 'ねこの 目を すこし なおします。', 'えは アトリエへ はこんで いきます。', '10時までに もどします。', '青木[あおき]'],
						it: 'Per Kobayashi. Sono venuta alle 7. Ritocco un po’ gli occhi del gatto. Porto il quadro in laboratorio. Lo riporto entro le 10. Aoki'
					}
				},
				{
					domanda: {
						ja: '青木[あおき]さんは えを どう しましたか。', it: 'Che cosa ha fatto Aoki col quadro?',
						opzioni: [{ ja: 'アトリエへ はこんだ', it: 'l’ha portato in laboratorio' }, { ja: 'だれかに ぬすまれた', it: 'gliel’hanno rubato' }, { ja: 'こわして しまった', it: 'l’ha rotto' }, { ja: '売って しまった', it: 'l’ha venduto' }],
						giusta: 0, spiega: '「えは アトリエへ はこんで いきます」: non rubato, portato via (はこぶ) da chi l’ha dipinto.'
					}
				},
				{ prendi: 'memo_aoki', it: 'il biglietto di Aoki' },
				{ dice: 'pulizie', faccia: 'imbarazzato', ja: 'あっ……すみません。かんばんで メモを かくして しまいました……。', it: 'Ah… mi scusi. Col cartello ho coperto il biglietto…', taccuino: true },
				{ nota: '「かくして しまいました」: 〜て しまう = l’ha fatto senza volerlo, e se ne dispiace. La メモ «era nascosta» (かくされて いた) dal cartello.', it: '〜て しまう e passivo.' },
				{ minuti: 10 },
				{ flag: 'm4.memo' }
			]
		},
		{
			// la lettera mai aperta, tra la posta di 小林
			id: 'm4-lettera', luogo: 'museo', quando: { giorno: 23, flag: ['m4.kobayashi'], nonFlag: ['m4.tegami'] },
			passi: [
				{ completa: 'posta4' },
				{ narra: '小林さんの つくえの 上に、手紙が たくさん あります。まだ あけて いない ふうとうの 中に……青木さんの 名前が！', it: 'Sulla scrivania di Kobayashi ci sono tante lettere. Tra le buste ancora chiuse… il nome di Aoki!' },
				{
					avviso: {
						tipo: 'lettera',
						titolo: '小林[こばやし]さま',
						righe: ['29日の 朝 7時に 美術館[びじゅつかん]へ 行きます。', 'ねこの 目を なおしたいので、えを すこし かります。', 'オープニングまでには もどします。', '4月27日　青木[あおき] みどり'],
						it: 'Gentile Kobayashi, il 29 mattina alle 7 vengo al museo. Vorrei ritoccare gli occhi del gatto, quindi prendo in prestito il quadro per un po’. Lo riporto prima dell’apertura. 27 aprile, Aoki Midori'
					}
				},
				{
					domanda: {
						ja: '小林[こばやし]さんは どうして 青木さんの ことを 知らなかったんですか。', it: 'Perché Kobayashi non sapeva niente di Aoki?',
						opzioni: [{ ja: 'いそがしくて、手紙を 読んで いなかったから', it: 'era occupato e non aveva letto la lettera' }, { ja: '手紙が とどかなかったから', it: 'la lettera non era arrivata' }, { ja: '青木さんが 手紙を 書かなかったから', it: 'Aoki non l’aveva scritta' }, { ja: 'けいびの 人が 手紙を すてたから', it: 'la guardia l’aveva buttata' }],
						giusta: 0, spiega: '「三日間、手紙も メールも ぜんぜん 読んで いない」. La lettera c’era, ancora chiusa.'
					}
				},
				{ dice: 'kobayashi', faccia: 'occupato', ja: 'ああ……わたしが ちゃんと 読んで いれば……。', it: 'Ah… se solo l’avessi letta…' },
				{ minuti: 10 },
				{ flag: 'm4.tegami' }
			]
		},
		{
			// con il biglietto trovato, 青木 torna col quadro
			id: 'm4-ritorno', luogo: 'museo', quando: { giorno: 23, flag: ['m4.memo'], nonFlag: ['m4.risolto'] },
			passi: [
				{ narra: 'その 時、入り口から 大きな えを 持った 人が 入って きました。', it: 'In quel momento entra dall’ingresso una persona con un grande quadro.' },
				{ dice: 'aoki', faccia: 'sollevata', ja: 'みなさん、おどろかせて しまって、すみません！ ねこの 目、なおしました！', it: 'Scusate se vi ho spaventato! Ho ritoccato gli occhi del gatto!' },
				{
					se: { nonFlag: ['m4.tegami'] },
					allora: [
						{ dice: 'aoki', ja: '小林さんに 手紙で 知らせたんですけど……。', it: 'L’avevo scritto a Kobayashi in una lettera…' },
						{ dice: 'kobayashi', faccia: 'occupato', ja: 'えっ……あっ、ここに ありました。まだ あけて いませんでした。もうしわけ ありません。', it: 'Eh?… Ah, eccola qui. Non l’avevo ancora aperta. Mi scusi molto.' }
					]
				},
				{ dice: 'nakamura', ja: 'なるほど。えは ぬすまれたのでは なくて、はこばれて いたんですね。', it: 'Capisco. Il quadro non era stato rubato: era stato portato via.', taccuino: true },
				{ nota: 'ぬすまれた (rubato) e はこばれた (portato) sono tutti e due passivi: dicono cosa è successo al quadro, non chi l’ha fatto. Qui chi l’ha fatto era la pittrice stessa.', it: 'Due passivi a confronto.' },
				{ dice: 'mori', ja: 'ああ、安心しました。{nome}さん、ありがとう。', it: 'Ah, che sollievo. {nome}, grazie.' },
				{ narra: '少し おくれて、オープニングが 始まりました。ねこの 目は きらきら 光って います。', it: 'Con un po’ di ritardo comincia l’apertura. Gli occhi del gatto brillano.' },
				{ minuti: 60 },
				{ completa: 'guardia4' },
				{ completa: 'pulizie4' },
				{ completa: 'kobayashi4' },
				{ flag: 'museo.aperto' },
				{ flag: 'm4.risolto' }
			]
		},
		{
			id: 'm4-indaga', luogo: 'museo', ripeti: true, quando: { giorno: 23, flag: ['m4.sparito'], nonFlag: ['m4.risolto'] },
			passi: [
				{ narra: 'だれの 話を 聞きますか。', it: 'Chi senti?' },
				{
					scelta: [
						{
							ja: 'けいびの 方、けさの ことを 聞かせて ください。', it: 'Signora guardia, mi racconti di stamattina.',
							passi: [
								{ dice: 'guardia', ja: 'わたしは 9時に 来ました。その 時、えは もう ありませんでした。', it: 'Sono arrivata alle 9. A quell’ora il quadro non c’era già più.', taccuino: true },
								{ dice: 'guardia', ja: '7時から 8時までは そうじの 時間で、わたしは いませんでした。', it: 'Dalle 7 alle 8 c’erano le pulizie, e io non c’ero.' },
								{ minuti: 15 },
								{ completa: 'guardia4' },
								{ flag: 'm4.guardia' }
							]
						},
						{
							ja: 'そうじの 方、朝 何を しましたか。', it: 'Signore delle pulizie, cosa ha fatto stamattina?',
							passi: [
								{ dice: 'pulizie', ja: '7時に ゆかを そうじしました。かべの 前に 「ゆかが ぬれて います」の かんばんを おきましたよ。', it: 'Alle 7 ho lavato il pavimento. Davanti alla parete ho messo il cartello «pavimento bagnato».', taccuino: true },
								{ dice: 'pulizie', ja: 'えですか？ ……いや、ゆかばかり 見て いて、よく 見て いませんでした。', it: 'Il quadro? …No, guardavo solo il pavimento, non ci ho fatto caso.' },
								{ minuti: 15 },
								{ completa: 'pulizie4' },
								{ obiettivo: 'kanban4', ja: 'かべの 前の かんばんを しらべる。', it: 'Controllare il cartello davanti alla parete.' },
								{ flag: 'm4.pulizie' }
							]
						},
						{
							ja: '小林さん、青木さんから 何か 聞いて いませんか。', it: 'Kobayashi, Aoki le ha detto qualcosa?',
							passi: [
								{ dice: 'kobayashi', faccia: 'occupato', ja: 'いいえ、何も……。この 三日間、いそがしくて、手紙も 読んで いないんです。', it: 'No, niente… In questi tre giorni ero così occupato che non ho letto nemmeno le lettere.' },
								{ minuti: 15 },
								{ completa: 'kobayashi4' },
								{ obiettivo: 'posta4', ja: '小林[こばやし]さんの つくえの 手紙を 見る。', it: 'Guardare le lettere sulla scrivania di Kobayashi.' },
								{ flag: 'm4.kobayashi' }
							]
						},
						{ ja: '（あとで また 聞こう。）', it: '(Ne riparlo più tardi.)' }
					]
				}
			]
		},
		{
			id: 'm4-d23-casa-sera', luogo: 'casa', quando: { giorno: 23, dalle: h(17), flag: ['m4.risolto'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。オープニングは どうだった？', it: 'Bentornat{o}. Com’è andata l’apertura?' },
				{ io: 'えが なくなって、たいへんでした。でも、ぬすまれて いなかったんです。', it: 'È sparito il quadro, un caos. Ma non era stato rubato.' },
				{ dice: 'nakamuraTel', ja: 'もしもし、中村[なかむら]です。今日の じけん、メモ 一まいで わかりましたね。また たのみます。', it: 'Pronto, sono Nakamura. Il caso di oggi l’ha risolto un biglietto. Conto ancora su di lei.', suono: 'telefono' },
				...cena(
					[
						{
							domanda: {
								ja: 'メモは どうして だれにも 見られなかったんですか。', it: 'Perché nessuno ha visto il biglietto?',
								opzioni: [{ ja: 'かんばんで かくされて いたから', it: 'era coperto dal cartello' }, { ja: '青木さんが 持って 帰ったから', it: 'Aoki se l’era portato via' }, { ja: 'かぜで とんで いったから', it: 'l’aveva portato via il vento' }, { ja: 'そうじの 人が すてたから', it: 'l’addetto l’aveva buttato' }],
								giusta: 0, spiega: '「かくされて いた」: passivo + 〜て いた = era (rimasto) nascosto. 見られなかった: passivo negativo.'
							}
						},
						{
							domanda: {
								ja: '「わたしが ちゃんと 読んで いれば……」と 言ったのは だれですか。', it: 'Chi ha detto «se solo l’avessi letta…»?',
								opzioni: [{ ja: '小林[こばやし]さん', it: 'Kobayashi' }, { ja: '青木[あおき]さん', it: 'Aoki' }, { ja: 'けいびの 人', it: 'la guardia' }, { ja: '中村[なかむら]さん', it: 'Nakamura' }],
								giusta: 0, spiega: '〜ば (condizionale) + 〜て いれば = «se avessi…». Lo dice chi non aveva aperto la lettera.'
							}
						}
					],
					[{ fine: '美術館[びじゅつかん]の じけん' }]
				)
			]
		},
		{
			// rete di sicurezza: dal giovedì la storia si chiude comunque
			id: 'm4-chiusura', luogo: 'casa', ripiego: true, quando: { giorno: [24, 25, 26, 27], nonFlag: ['m4.risolto'] },
			passi: [
				{ dice: 'mamma', ja: '{nome}さん、しんぶんに 美術館[びじゅつかん]の ことが 出て いるわよ。えは ぬすまれたのでは なくて、えを かいた 人が なおして いたんだって。', it: '{nome}, il giornale parla del museo. Il quadro non era stato rubato: la pittrice lo stava ritoccando.' },
				{ flag: 'museo.aperto' },
				{ flag: 'm4.risolto' },
				{ fine: '美術館[びじゅつかん]の じけん' }
			]
		}
	]
};
