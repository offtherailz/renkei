// Missione 2 — いなくなった ミケ (il gattino sparito). Tre giornate: 4/13-4/15.
// Piccolo giallo senza colpevoli. Forme: 〜そうだ (sentito dire) / 〜ようだ /
// 〜らしい (chi ha visto e chi ha solo sentito), 〜て ある / 〜て いる
// (il collare «messo lì», non «caduto»), 〜て あげる / くれる / もらう,
// 〜そう (aspetto), saluti cortesi a un cliente.
import type { Missione, Passo } from '../tipi';

const h = (ore: number, min = 0): number => ore * 60 + min;

const cena = (domande: Passo[], dopo: Passo[] = []): Passo[] => [
	{ narra: 'ねる 前に、今日の ことを 思い出します。ノートも 見て ください。', it: 'Prima di dormire ripensi alla giornata. Il taccuino ti aiuta.' },
	...domande,
	...dopo,
	{ dice: 'mamma', ja: 'おやすみなさい。', it: 'Buonanotte.' },
	{ dormi: true }
];

export const M2: Missione = {
	id: 'm2',
	titolo: 'いなくなった ミケ',
	it: 'Il gattino sparito',
	epilogo: {
		ja: 'ミケが 見つかって、木村[きむら]さんの お母さんが とても よろこびました。高橋[たかはし]くんは ときどき ミケに 会いに 行くそうです。',
		it: 'Miké è tornata a casa e la madre dei Kimura è felicissima. Takahashi andrà a trovarla ogni tanto.'
	},
	inizio: { giorno: 7, flag: ['d0.casa', 'portafoglio.ok', 'grazie.ok'] },
	scene: [
		// ───────── giorno 7: lunedì 13 aprile ─────────
		{
			id: 'm2-d7-casa', luogo: 'casa', quando: { giorno: 7, nonFlag: ['m2.d7.casa'] },
			passi: [
				{ narra: '4月13日（月）、朝 7時半。さくら町に 来て、一週間が たちました。', it: 'Lunedì 13 aprile, ore 7:30. È passata una settimana da quando sei arrivat{o} a さくら町.' },
				{ dice: 'mamma', ja: 'おはよう、{nome}さん。ねえ、聞いた？ 木村[きむら]さんの お母さんの ねこが いなくなったそうよ。', it: 'Buongiorno, {nome}. Hai sentito? Dicono che sia sparito il gatto della madre del signor Kimura.', taccuino: true },
				{ dice: 'mamma', ja: 'とても しんぱいして いるらしいの。仕事の あとで 木村アパートに 行って みたら？', it: 'Pare che sia molto preoccupata. Perché non passi al condominio Kimura dopo il lavoro?' },
				{ nota: '「〜そうよ」「〜らしい」: お母さんは 自分で 見て いません。ほかの 人から 聞いた ことです。', it: '「〜そうだ」 (si dice che) e 「〜らしい」 (pare che): la mamma non l’ha visto, l’ha sentito da altri.' },
				{ obiettivo: 'kimura', ja: '仕事の あとで 木村[きむら]アパートへ 行って、おばあさんの 話を 聞く。', it: 'Dopo il lavoro, andare al condominio Kimura e sentire la signora.' },
				{ flag: 'm2.d7.casa' }
			]
		},
		{
			id: 'm2-d7-ufficio', luogo: 'ufficio', quando: { giorno: 7, nonFlag: ['m2.d7.ufficio'] },
			passi: [
				{ dice: 'mori', ja: '{nome}さん、これ、はじめての きゅうりょうです。おつかれさま。', it: '{nome}, questo è il suo primo stipendio. Buon lavoro.' },
				{ soldi: 50000 },
				{ narra: 'きゅうりょうを もらいました（5万円）。', it: 'Hai ricevuto lo stipendio (50.000 yen).' },
				{ nota: 'もらう = ricevere. 「きゅうりょうを もらいました」: lo stipendio l’hai ricevuto tu (da qualcuno).', it: 'もらう = ricevere: 「きゅうりょうを もらいました」.' },
				{ dice: 'mori', ja: 'おはようございます。今週の 予定[よてい]です。水曜日の 10時に ABCの 山田[やまだ]さんが 来ます。', it: 'Buongiorno. Il programma della settimana: mercoledì alle 10 viene Yamada della ABC.', taccuino: true },
				{ dice: 'mori', ja: '{nome}さんは 9時50分に 1かいで 待って いて ください。先週の メールに 書いて ありましたね。', it: '{nome}, lei lo aspetti al piano terra alle 9:50. Era scritto nell’email della settimana scorsa.' },
				{
					domanda: {
						ja: '{nome}さんは 水曜日、何時に どこに いますか。', it: 'Mercoledì, a che ora e dove devi essere?',
						opzioni: [{ ja: '10時に 1かい', it: 'alle 10 al piano terra' }, { ja: '9時50分に 1かい', it: 'alle 9:50 al piano terra' }, { ja: '9時50分に 3かい', it: 'alle 9:50 al terzo piano' }, { ja: '10時に かいぎしつ', it: 'alle 10 in sala riunioni' }],
						giusta: 1, spiega: 'Il cliente arriva alle 10, ma tu devi aspettarlo dieci minuti prima: 「9時50分に 1かいで 待って いて ください」.'
					}
				},
				{ ora: h(11) },
				{ dice: 'suzuki', ja: '{nome}さん、水曜日の 10時から 11時まで、かいぎしつを よやくして おいて ください。', it: '{nome}, prenoti la sala riunioni per mercoledì dalle 10 alle 11, per favore.' },
				{
					scelta: [
						{ ja: 'はい。水曜日の 10時から 11時まで ですね。', it: 'Sì. Mercoledì dalle 10 alle 11, giusto?', passi: [{ dice: 'suzuki', ja: 'はい、そうです。おねがいします。', it: 'Sì, esatto. Grazie.' }] },
						{ ja: 'はい。木曜日の 10時ですね。', it: 'Sì. Giovedì alle 10, giusto?', passi: [{ dice: 'suzuki', faccia: 'arrabbiata', ja: 'ちがいますよ。水曜日です。ちゃんと 聞いて くださいね。', it: 'No! Mercoledì. Ascolti bene, per favore.' }] }
					]
				},
				{ narra: '午前中、かいぎしつの よやくと メールの 仕事を しました。12時です。', it: 'In mattinata prenoti la sala e sbrighi le email. È mezzogiorno.' },
				{ ora: h(12) },
				{ flag: 'm2.d7.ufficio' }
			]
		},
		{
			id: 'm2-d7-pomeriggio', luogo: 'ufficio', quando: { giorno: 7, dalle: h(12, 30), flag: ['m2.d7.ufficio'] },
			passi: [
				{ dice: 'tanaka', ja: '{nome}さん、木村さんの ねこの 話、聞きましたか。神社[じんじゃ]の 方へ 行った らしいですよ。', it: '{nome}, ha sentito del gatto dei Kimura? Pare che sia andato verso il santuario.', taccuino: true },
				{ io: 'だれが 見たんですか。', it: 'Chi l’ha visto?' },
				{ dice: 'tanaka', faccia: 'imbarazzato', ja: 'さあ……。ぼくも だれかから 聞いただけです。', it: 'Mah… L’ho solo sentito da qualcuno anch’io.' },
				{ nota: '「〜らしい」は 聞いた 話です。ほんとうか どうか わかりません。', it: '「〜らしい」 = pare, si dice: è una voce, non si sa se è vera.' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: '今日は ここまで。おつかれさまでした。', it: 'Per oggi basta. Buon lavoro.' },
				{ flag: 'm2.d7.lavoro' }
			]
		},
		{
			id: 'm2-d7-kimura', luogo: 'apartment', quando: { giorno: 7, dalle: h(17), nonFlag: ['m2.kimura'] },
			passi: [
				{ dice: 'kimura', ja: 'ああ、吉田[よしだ]さんの 家の 人ですね。母が 中で 待って います。', it: 'Ah, lei è quell{o} che sta dai Yoshida. Mia madre aspetta dentro.' },
				{ dice: 'nonna', faccia: 'preoccupata', ja: 'まあ、来て くれて ありがとう。うちの ミケが、おとといの 夜から 帰って こないんです。', it: 'Oh, grazie di essere venut{o}. La nostra Miké non torna da l’altroieri sera.', taccuino: true },
				{ dice: 'nonna', faccia: 'preoccupata', ja: '白と 茶色と 黒の 小さい ねこです。赤い くびわを して いて、すずが ついて います。', it: 'È una gattina piccola, bianca, marrone e nera. Ha un collare rosso con un campanellino.', taccuino: true },
				{ dice: 'nonna', ja: 'これが ミケの 写真です。どうぞ。', it: 'Questa è una foto di Miké. Tenga.' },
				{ prendi: 'foto_gatto', it: 'foto di Miké' },
				{ dice: 'kimura', ja: 'ねこなんか、そのうち 帰って くるよ。', it: 'Ma figurati, un gatto prima o poi torna.' },
				{ dice: 'nonna', faccia: 'preoccupata', ja: 'でも、まだ 子ねこなのよ……。', it: 'Ma è ancora una cucciola…' },
				{
					domanda: {
						ja: 'ミケは いつから いませんか。', it: 'Da quando manca Miké?',
						opzioni: [{ ja: 'きのうの 朝から', it: 'da ieri mattina' }, { ja: 'きのうの 夜から', it: 'da ieri sera' }, { ja: 'おとといの 夜から', it: 'dall’altroieri sera' }, { ja: '先週から', it: 'dalla settimana scorsa' }],
						giusta: 2, spiega: '「おとといの 夜から」: おととい = l’altroieri (oggi è lunedì, quindi sabato sera).'
					}
				},
				{ dice: 'nonna', ja: 'ミケの ポスターを 作って、コンビニで コピーして くれませんか。', it: 'Mi farebbe un volantino di Miké e lo fotocopierebbe alla konbini?' },
				{ obiettivo: 'poster', ja: 'コンビニで ミケの ポスターを コピーする。', it: 'Fotocopiare il volantino di Miké alla konbini.' },
				{ completa: 'kimura' },
				{ minuti: 30 },
				{ flag: 'm2.kimura' }
			]
		},
		{
			id: 'm2-d7-konbini', luogo: 'konbini', quando: { flag: ['m2.kimura'], nonFlag: ['m2.poster'] },
			passi: [
				{ dice: 'commessa', ja: 'いらっしゃいませ。', it: 'Benvenut{o}.' },
				{ narra: 'コピーきの 前に 「白黒 1まい 10円」と 書いて あります。', it: 'Davanti alla fotocopiatrice c’è scritto «bianco e nero, 10 yen a copia».' },
				{
					scelta: [
						{ ja: '20まい コピーします。', it: 'Ne faccio 20 copie.', passi: [{ soldi: -200 }] },
						{ ja: '50まい コピーします。', it: 'Ne faccio 50 copie.', passi: [{ se: { soldiMin: 500 }, allora: [{ soldi: -500 }, { flag: 'm2.poster50' }], altrimenti: [{ narra: 'お金が たりません……。', it: 'Non hai abbastanza soldi…' }] }] }
					]
				},
				{ prendi: 'volantino_gatto', it: 'volantini di Miké' },
				{ completa: 'poster' },
				{ dice: 'commessa', ja: 'あ、その ねこ……。', it: 'Ah, quel gatto…' },
				{ dice: 'commessa', ja: 'ねこかどうか わかりませんが、きのうの 夜、わかい 男の 人が ねこの えさを 買って いきましたよ。', it: 'Non so se c’entra, ma ieri sera un ragazzo giovane ha comprato del cibo per gatti.', taccuino: true },
				{ io: 'ほんとうですか。何時ごろですか。', it: 'Davvero? Verso che ora?' },
				{ dice: 'commessa', ja: '7時ごろでした。この 町の ねこを かって いる 人では ない ようでした。', it: 'Verso le 7. Non sembrava uno che ha un gatto in questo quartiere.', taccuino: true },
				{ pensa: 'えさを 買った 人……。ミケに あげて いるのかな。', it: 'Uno che compra cibo per gatti… Che lo stia dando a Miké?' },
				{ obiettivo: 'poster2', ja: 'ポスターを 町の 店に はって もらう（喫茶[きっさ]あおいなど）。', it: 'Far appendere i volantini nei negozi del quartiere (per esempio il caffè Aoi).' },
				{ minuti: 20 },
				{ flag: 'm2.poster' }
			]
		},
		{
			id: 'm2-d7-casa-sera', luogo: 'casa', quando: { giorno: 7, dalle: h(17), flag: ['m2.d7.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。ねこは どうだった？', it: 'Bentornat{o}. Allora, il gatto?' },
				{
					se: { flag: ['m2.kimura'] },
					allora: [{ io: 'まだ 見つかりません。でも、少し わかった ことが あります。', it: 'Non l’hanno ancora trovato. Però ho scoperto qualcosa.' }],
					altrimenti: [{ io: '今日は 行けませんでした。あした 行きます。', it: 'Oggi non ci sono riuscit{o}. Ci vado domani.' }, { obiettivo: 'kimura', ja: '木村[きむら]アパートへ 行って、おばあさんの 話を 聞く。', it: 'Andare al condominio Kimura e sentire la signora.' }]
				},
				...cena([
					{
						domanda: {
							ja: '田中さんは ミケを 見ましたか。', it: 'Tanaka ha visto Miké?',
							opzioni: [{ ja: 'はい、神社[じんじゃ]で 見ました', it: 'sì, al santuario' }, { ja: 'いいえ、ほかの 人から 聞いただけです', it: 'no, l’ha solo sentito da altri' }, { ja: 'はい、公園[こうえん]で 見ました', it: 'sì, al parco' }, { ja: 'いいえ、ミケを 知りません', it: 'no, non sa chi sia' }],
							giusta: 1, spiega: '「神社の 方へ 行った らしい」「だれかから 聞いただけ」: 〜らしい = voce sentita, non visto con i propri occhi.'
						}
					},
					{
						domanda: {
							ja: 'コンビニの 人は 何を 見ましたか。', it: 'Cosa ha visto la commessa della konbini?',
							opzioni: [{ ja: 'ミケが 店の 前に いた', it: 'Miké davanti al negozio' }, { ja: 'わかい 男の 人が ねこの えさを 買った', it: 'un ragazzo che comprava cibo per gatti' }, { ja: 'おばあさんが コピーを した', it: 'la signora che fotocopiava' }, { ja: '何も 見なかった', it: 'niente' }],
							giusta: 1, spiega: 'La commessa l’ha visto davvero: 「わかい 男の 人が ねこの えさを 買って いきました」. 〜て いく = l’ha comprato ed è andato via.'
						}
					}
				])
			]
		},

		// ───────── giorno 8: martedì 14 aprile ─────────
		{
			id: 'm2-d8-casa', luogo: 'casa', quando: { giorno: 8, nonFlag: ['m2.d8.casa'] },
			passi: [
				{ narra: '4月14日（火）、朝 7時半。', it: 'Martedì 14 aprile, ore 7:30.' },
				{ dice: 'papa', ja: 'ポスター、店に はって もらったら どう？ 喫茶[きっさ]あおいの 伊藤[いとう]さんは しんせつだよ。', it: 'Perché non chiedi ai negozi di appendere i volantini? Itō del caffè Aoi è gentile.' },
				{ flag: 'm2.d8.casa' }
			]
		},
		{
			id: 'm2-d8-ufficio', luogo: 'ufficio', quando: { giorno: 8, nonFlag: ['m2.d8.ufficio'] },
			passi: [
				{ dice: 'mori', faccia: 'preoccupata', ja: '{nome}さん、あしたの 山田[やまだ]さんの こと、ちょっと しんぱいです。山田さんは とても 時間に きびしい 人なんです。', it: '{nome}, per domani con Yamada sono un po’ in pensiero. È una persona molto puntuale.' },
				{ dice: 'mori', ja: 'おくれないように、早めに 1かいで 待って いて くださいね。', it: 'Per non fare tardi, lo aspetti al piano terra con un po’ di anticipo.', taccuino: true },
				{ io: 'はい、わかりました。', it: 'Sì, ho capito.' },
				{ narra: '午前中、あしたの しりょうを じゅんびしました。', it: 'In mattinata prepari il materiale per domani.' },
				{ ora: h(12) },
				{ flag: 'm2.d8.ufficio' }
			]
		},
		{
			id: 'm2-d8-kissa', luogo: 'kissa', quando: { giorno: [8, 9, 10], flag: ['m2.poster'], nonFlag: ['m2.kissa'] },
			passi: [
				{ dice: 'ito', ja: 'いらっしゃいませ。あ、それは ねこの ポスターですか。', it: 'Benvenut{o}. Ah, è un volantino di un gatto?' },
				{ io: 'はい。この ポスターを はって もらえませんか。', it: 'Sì. Potrebbe appendere questo volantino?' },
				{ dice: 'ito', ja: 'いいですよ。入り口に はって おきます。', it: 'Certo. Lo appendo all’ingresso.' },
				{ completa: 'poster2' },
				{ dice: 'ito', ja: 'そう いえば、きのう おきゃくさんが 「公園[こうえん]で 子ねこが ないて いた」と 言って いました。', it: 'A proposito, ieri un cliente diceva che al parco miagolava un gattino.' },
				{ dice: 'ito', ja: 'ぼくは 見て いませんが、ベンチの 近くだった そうです。', it: 'Io non l’ho visto, ma dice che era vicino alle panchine.', taccuino: true },
				{
					domanda: {
						ja: '伊藤[いとう]さんは 子ねこを 見ましたか。', it: 'Itō ha visto il gattino?',
						opzioni: [{ ja: 'はい、公園[こうえん]で 見ました', it: 'sì, al parco' }, { ja: 'いいえ、おきゃくさんから 聞きました', it: 'no, l’ha sentito da un cliente' }, { ja: 'はい、店の 前で 見ました', it: 'sì, davanti al locale' }, { ja: 'いいえ、ポスターで 見ました', it: 'no, l’ha visto sul volantino' }],
						giusta: 1, spiega: '「ぼくは 見て いませんが、… だった そうです」: 〜そうです (dopo la forma piana) = riferisce quello che ha sentito.'
					}
				},
				{ obiettivo: 'parco', ja: '公園[こうえん]の ベンチの 近くを 見に 行く。', it: 'Andare a guardare vicino alle panchine del parco.' },
				{ minuti: 20 },
				{ flag: 'm2.kissa' }
			]
		},
		{
			id: 'm2-parco', luogo: 'parco', quando: { flag: ['m2.kimura'], nonFlag: ['m2.collare'] },
			passi: [
				{ narra: 'ベンチの 近くを さがします……。', it: 'Cerchi vicino alle panchine…' },
				{ narra: 'ベンチの 上に、赤い くびわが おいて あります。すずも ついて います。', it: 'Sopra una panchina c’è un collare rosso, messo lì. Ha anche il campanellino.' },
				{ prendi: 'collare', it: 'collare rosso di Miké' },
				{ pensa: 'おちて いるんじゃ ない。きれいに おいて ある……。だれかが くびわを とって、ここに おいたんだ。', it: 'Non è caduto. È appoggiato con cura… Qualcuno ha tolto il collare e l’ha messo qui.' },
				{ nota: '「おいて ある」= だれかが おいた。「おちて いる」= 自分で おちた。', it: '「おいて ある」 = qualcuno l’ha messo lì apposta. 「おちて いる」 = è caduto da solo. 〜て ある indica che c’è stata un’azione voluta.' },
				{ narra: 'ベンチの 下から 神社[じんじゃ]の 方へ、小さい 足あとが つづいて います。', it: 'Da sotto la panchina, piccole impronte vanno verso il santuario.' },
				{ completa: 'parco' },
				{ obiettivo: 'jinja', ja: '山の 神社[じんじゃ]へ 行って みる。', it: 'Andare a vedere al santuario sulla collina.' },
				{ flag: 'jinja.aperto' },
				{ flag: 'm2.collare' }
			]
		},
		{
			id: 'm2-jinja', luogo: 'jinja', quando: { flag: ['m2.collare'], nonFlag: ['m2.ciotola'] },
			passi: [
				{ narra: '神社[じんじゃ]は しずかです。うらに まわって みます。', it: 'Al santuario c’è silenzio. Fai il giro sul retro.' },
				{ narra: '木の 下に 小さい おさらが 二つ おいて あります。水と ねこの えさが 入れて あります。', it: 'Sotto un albero ci sono due ciotoline, messe lì. Dentro c’è acqua e cibo per gatti.' },
				{ pensa: 'だれかが ここで ミケに えさを あげて いるんだ。コンビニで えさを 買った 人かな。', it: 'Qualcuno qui dà da mangiare a Miké. Quello che ha comprato il cibo alla konbini?' },
				{
					domanda: {
						ja: 'コンビニの 人の 話では、男の 人は 何時ごろ えさを 買いましたか。', it: 'Secondo la commessa, verso che ora il ragazzo ha comprato il cibo?',
						opzioni: [{ ja: '朝 7時ごろ', it: 'verso le 7 di mattina' }, { ja: '昼 12時ごろ', it: 'verso mezzogiorno' }, { ja: '夜 7時ごろ', it: 'verso le 7 di sera' }, { ja: '夜 11時ごろ', it: 'verso le 11 di sera' }],
						giusta: 2, spiega: '「きのうの 夜、… 7時ごろでした」: se viene a portare da mangiare, conviene tornare qui la sera verso le 7.'
					}
				},
				{ completa: 'jinja' },
				{ obiettivo: 'sera', ja: 'あしたの 夜 7時ごろ、神社[じんじゃ]で 待って みる。', it: 'Domani sera verso le 7, aspettare al santuario.' },
				{ minuti: 20 },
				{ flag: 'm2.ciotola' }
			]
		},
		{
			id: 'm2-d8-pomeriggio', luogo: 'ufficio', quando: { giorno: 8, dalle: h(12, 30), flag: ['m2.d8.ufficio'] },
			passi: [
				{ ora: h(15) },
				{ dice: 'suzuki', ja: '{nome}さん、あしたの しりょう、5まい コピーして、かいぎしつの つくえの 上に ならべて おいて ください。', it: '{nome}, faccia 5 copie del materiale di domani e le disponga sul tavolo della sala riunioni.' },
				{
					domanda: {
						ja: 'しりょうは どこに おきますか。', it: 'Dove metti il materiale?',
						opzioni: [{ ja: '1かいの 入り口', it: 'all’ingresso al piano terra' }, { ja: 'かいぎしつの つくえの 上', it: 'sul tavolo della sala riunioni' }, { ja: '鈴木[すずき]さんの つくえ', it: 'sulla scrivania di Suzuki' }, { ja: '森[もり]ぶちょうの へや', it: 'nell’ufficio di Mori' }],
						giusta: 1, spiega: '「かいぎしつの つくえの 上に ならべて おいて ください」: ならべる = mettere in fila; 〜て おく = preparare prima.'
					}
				},
				{ narra: 'コピーを して、かいぎしつに ならべて おきました。', it: 'Fai le copie e le disponi in sala riunioni.' },
				{ ora: h(17, 30) },
				{ dice: 'mori', ja: 'おつかれさまでした。あしたは たのみますね。', it: 'Buon lavoro. Per domani conto su di lei.' },
				{ flag: 'm2.d8.lavoro' }
			]
		},
		{
			id: 'm2-d8-casa-sera', luogo: 'casa', quando: { giorno: 8, dalle: h(17), flag: ['m2.d8.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				...cena([
					{
						domanda: {
							ja: '公園[こうえん]の くびわは どう なって いましたか。', it: 'Com’era il collare al parco?',
							opzioni: [{ ja: 'ベンチの 下に おちて いた', it: 'caduto sotto la panchina' }, { ja: 'ベンチの 上に おいて あった', it: 'appoggiato sulla panchina' }, { ja: 'ミケが して いた', it: 'ce l’aveva Miké' }, { ja: '木に かけて あった', it: 'appeso a un albero' }],
							giusta: 1, spiega: '「ベンチの 上に … おいて あります」: 〜て ある = qualcuno l’ha messo lì, non è caduto per caso.'
						}
					},
					{
						domanda: {
							ja: '神社[じんじゃ]の うらに 何が ありましたか。', it: 'Cosa c’era dietro il santuario?',
							opzioni: [{ ja: 'ミケの 写真', it: 'una foto di Miké' }, { ja: '水と えさの おさら', it: 'ciotole con acqua e cibo' }, { ja: 'コンビニの レシート', it: 'uno scontrino della konbini' }, { ja: '赤い くびわ', it: 'il collare rosso' }],
							giusta: 1, spiega: '「おさらが 二つ おいて あります。水と えさが 入れて あります」.'
						}
					}
				])
			]
		},

		// ───────── giorno 9: mercoledì 15 aprile ─────────
		{
			id: 'm2-d9-casa', luogo: 'casa', quando: { giorno: 9, nonFlag: ['m2.d9.casa'] },
			passi: [
				{ narra: '4月15日（水）、朝 7時半。今日は 山田[やまだ]さんが 会社に 来ます。', it: 'Mercoledì 15 aprile, ore 7:30. Oggi in ditta viene Yamada.' },
				{ pensa: '9時50分に 1かい。わすれないように しよう。', it: 'Alle 9:50 al piano terra. Non devo dimenticarlo.' },
				{ flag: 'm2.d9.casa' }
			]
		},
		{
			id: 'm2-d9-cliente', luogo: 'ufficio', quando: { giorno: 9, alle: h(9, 51), nonFlag: ['m2.d9.ufficio'] },
			passi: [
				{ ora: h(9, 50) },
				{ narra: '9時50分。1かいで 待って います。10時に 男の 人が 入って きました。', it: 'Ore 9:50. Aspetti al piano terra. Alle 10 entra un signore.' },
				{ ora: h(10) },
				{ dice: 'yamada', ja: 'ABCの 山田[やまだ]です。森[もり]ぶちょうと 10時の やくそくを して いるんですが。', it: 'Sono Yamada della ABC. Ho appuntamento alle 10 con la responsabile Mori.' },
				{
					scelta: [
						{ ja: 'いらっしゃいませ。お待ちして おりました。どうぞ こちらへ。', it: 'Benvenuto. La stavamo aspettando. Prego, da questa parte.', passi: [{ dice: 'yamada', ja: 'ありがとうございます。', it: 'Grazie.' }] },
						{ ja: 'あ、山田さん。森さんは 上に いるよ。', it: 'Ah, Yamada. Mori è di sopra.', passi: [{ dice: 'yamada', ja: '……はあ。', it: '…Ah.' }, { nota: 'おきゃくさんには ていねいに：「お待ちして おりました」（けんじょうご）。自分の 会社の 人は 「さん」なしで 「森は」と 言います。', it: 'Con un cliente si usa il registro umile: 「お待ちして おりました」. E i colleghi della propria ditta si nominano senza さん: 「森は…」.' }] }
					]
				},
				{ dice: 'mori', ja: '山田さん、おはようございます。{nome}さん、ありがとう。たすかりました。', it: 'Buongiorno, signor Yamada. {nome}, grazie, mi è stato d’aiuto.' },
				{ narra: 'かいぎは 11時に 終わりました。そのあと、昼まで 仕事を しました。', it: 'La riunione finisce alle 11. Poi lavori fino a pranzo.' },
				{ ora: h(12) },
				{ flag: 'm2.d9.ufficio' }
			]
		},
		{
			id: 'm2-d9-tardi', luogo: 'ufficio', quando: { giorno: 9, dalle: h(9, 51), nonFlag: ['m2.d9.ufficio'] },
			passi: [
				{ dice: 'suzuki', faccia: 'arrabbiata', ja: '{nome}さん！ 9時50分に 1かいで 待って いて くださいと 言いましたよね。', it: '{nome}! Le avevo detto di aspettare al piano terra alle 9:50!' },
				{ dice: 'mori', faccia: 'preoccupata', ja: '山田さんは 1かいで 5分 待って いたそうです。わたしが あやまって おきました。', it: 'Pare che Yamada abbia aspettato 5 minuti al piano terra. Mi sono scusata io.' },
				{ io: 'ほんとうに もうしわけ ありませんでした。', it: 'Mi dispiace davvero molto.' },
				{ nota: 'しっぱいしても だいじょうぶ。あやまる ときは 「もうしわけ ありません」が いちばん ていねいです。', it: 'Capita. Per scusarsi in modo formale: 「もうしわけ ありません（でした）」.' },
				{ ora: h(12) },
				{ flag: 'm2.d9.ufficio' }
			]
		},
		{
			id: 'm2-d9-pomeriggio', luogo: 'ufficio', quando: { giorno: 9, dalle: h(12, 30), flag: ['m2.d9.ufficio'] },
			passi: [
				{ dice: 'tanaka', ja: 'ねこ、見つかりましたか。', it: 'Il gatto, l’ha trovato?' },
				{
					se: { flag: ['m2.ciotola'] },
					allora: [{ io: 'まだですが、こんばん 神社[じんじゃ]で 待って みます。', it: 'Non ancora, ma stasera provo ad aspettare al santuario.' }, { dice: 'tanaka', ja: 'へえ、たんていみたいですね！', it: 'Wow, sembra un detective!' }],
					altrimenti: [{ io: 'まだです。公園[こうえん]の 方を さがして みます。', it: 'Non ancora. Provo a cercare dalle parti del parco.' }]
				},
				{ narra: 'かいぎしつの かたづけと、山田さんへの メールの 仕事を しました。', it: 'Riordini la sala riunioni e scrivi l’email per Yamada.' },
				{ ora: h(18) },
				{ dice: 'mori', ja: '今日は 水曜日だから、6時までに 帰りましょう。', it: 'Oggi è mercoledì, quindi a casa entro le 18.' },
				{ flag: 'm2.d9.lavoro' }
			]
		},
		{
			id: 'm2-sera-jinja', luogo: 'jinja', quando: { giorno: [9, 10, 11], dalle: h(18, 30), alle: h(21), flag: ['m2.ciotola'], nonFlag: ['mike.ok'] },
			passi: [
				{ narra: '夜の 神社[じんじゃ]。木の かげで しずかに 待ちます……。', it: 'Il santuario di sera. Aspetti in silenzio all’ombra di un albero…', suono: 'grilli' },
				{ narra: '7時すぎ。だれかが コンビニの ふくろを 持って 階[かい]だんを 上がって きました。', it: 'Poco dopo le 7, qualcuno sale le scale con una busta della konbini.' },
				{ dice: 'takahashi', faccia: 'sorpreso', ja: 'わっ！ ……あ、{nome}さん？ どうして ここに？', it: 'Uh! …Ah, {nome}? Che ci fa qui?' },
				{ io: '高橋[たかはし]くん！ ミケに えさを あげて いたのは、高橋[たかはし]くんだったんですね。', it: 'Takahashi! Eri tu a dare da mangiare a Miké!' },
				{ dice: 'mike', ja: 'ニャー。', it: 'Miao.' },
				{ dice: 'takahashi', faccia: 'imbarazzato', ja: 'はい……。土曜日の 夜、公園[こうえん]で 見つけたんです。足に けがを して いて、いたそうでした。', it: 'Sì… L’ho trovata sabato sera al parco. Aveva una zampa ferita, sembrava le facesse male.', taccuino: true },
				{ dice: 'takahashi', ja: 'くびわも きつそうだったので、とって あげました。ベンチの 上に おいて おいたんですが……。', it: 'Anche il collare sembrava stretto, così gliel’ho tolto. L’avevo lasciato sulla panchina…' },
				{
					domanda: {
						ja: '高橋[たかはし]くんは どうして くびわを とりましたか。', it: 'Perché Takahashi ha tolto il collare?',
						opzioni: [{ ja: 'くびわが ほしかったから', it: 'perché voleva il collare' }, { ja: 'くびわが きつそうだったから', it: 'perché sembrava stretto' }, { ja: 'すずの 音が うるさかったから', it: 'perché il campanello faceva rumore' }, { ja: 'くびわが おちて いたから', it: 'perché era caduto' }],
						giusta: 1, spiega: '「きつそうだった」: 〜そう (radice + そう) = sembrava, dall’aspetto. Diverso da 〜そうだ dopo la forma piana (sentito dire).'
					}
				},
				{ dice: 'takahashi', faccia: 'imbarazzato', ja: 'ぼくの アパートは ペットが だめなので、ここで えさを あげて いました。学校に ポスターも はったんですが……。', it: 'Nel mio appartamento gli animali non sono ammessi, quindi le davo da mangiare qui. Ho anche appeso un volantino a scuola…' },
				{ pensa: 'おばあさんは 学校には 行かない。だから だれも 知らなかったんだ。', it: 'La signora non va a scuola. Per questo nessuno ne sapeva niente.' },
				{
					scelta: [
						{ ja: 'いっしょに 木村[きむら]さんの 家へ つれて 行きましょう。', it: 'Portiamola insieme a casa dei Kimura.' },
						{ ja: 'おばあさんが とても しんぱいして いますよ。いっしょに 行きましょう。', it: 'La signora è molto in pensiero. Andiamo insieme.' }
					]
				},
				{ dice: 'takahashi', ja: 'はい！', it: 'Sì!' },
				{ vai: 'apartment' },
				{ dice: 'nonna', faccia: 'sorpresa', ja: 'まあ！ ミケ！', it: 'Oh! Miké!' },
				{ dice: 'mike', ja: 'ニャー！', it: 'Miao!' },
				{ dice: 'nonna', faccia: 'felice', ja: 'よかった……。ほんとうに ありがとう。{nome}さんが 見つけて くれたのね。', it: 'Che sollievo… Grazie davvero. L’ha trovata lei, {nome}.' },
				{ io: 'いいえ。高橋[たかはし]くんが ずっと えさを あげて くれて いたんです。', it: 'No. È stato Takahashi a darle da mangiare tutto questo tempo.' },
				{ dice: 'nonna', faccia: 'felice', ja: 'まあ、そうだったの。高橋[たかはし]くん、ありがとう。これからも ときどき ミケに 会いに 来て ね。', it: 'Oh, davvero? Grazie, Takahashi. Vieni ogni tanto a trovare Miké, d’ora in poi.' },
				{ dice: 'takahashi', faccia: 'imbarazzato', ja: 'はい！ よろこんで。', it: 'Sì! Con piacere.' },
				{ dice: 'kimura', ja: '……ありがとう。母が こんなに よろこぶのは ひさしぶりだ。', it: '…Grazie. Era da tanto che mia madre non era così contenta.' },
				{ dice: 'nonna', ja: 'これ、少しですが、おかしです。どうぞ。', it: 'Ecco, è poca cosa: dei dolcetti. Prego.' },
				{ narra: 'おばあさんが おかしを くれました。', it: 'La signora ti ha dato dei dolcetti (くれる: dato a te).' },
				{ completa: 'sera' },
				{ togli: 'collare' },
				{ minuti: 60 },
				{ flag: 'mike.ok' }
			]
		},
		{
			id: 'm2-d9-casa-sera', luogo: 'casa', quando: { giorno: 9, dalle: h(17), flag: ['m2.d9.casa'] },
			passi: [
				{ dice: 'mamma', ja: 'おかえりなさい。', it: 'Bentornat{o}.' },
				{
					se: { flag: ['mike.ok'] },
					allora: [
						{ io: 'ミケが 見つかりました！', it: 'Abbiamo trovato Miké!' },
						{ dice: 'mamma', ja: 'まあ、よかった！ 木村さんの お母さん、よろこんで いたでしょう。', it: 'Oh, che bello! La madre dei Kimura sarà stata contenta.' },
						{ dice: 'nakamuraTel', ja: 'もしもし、中村[なかむら]です。ねこの じけん、かいけつした そうですね。', it: 'Pronto, sono Nakamura. Ho sentito che il caso del gatto è risolto.', suono: 'telefono' },
						{ dice: 'nakamuraTel', ja: 'さすがですね。じつは、来週 また 手つだって ほしい ことが あるんです。こんどは あなたの 会社の ことです……。', it: 'Complimenti. In realtà la settimana prossima avrei di nuovo bisogno di una mano. Stavolta riguarda la sua ditta…' }
					],
					altrimenti: [
						{ io: 'ミケは まだ 見つかりません……。', it: 'Miké non è ancora stata trovata…' },
						{ dice: 'mamma', ja: 'あした また さがして みたら？', it: 'Perché non riprovi domani?' }
					]
				},
				...cena(
					[
						{
							domanda: {
								ja: '山田さんが 来た とき、何と 言いますか。', it: 'Quando arriva Yamada, cosa gli dici?',
								opzioni: [{ ja: 'いらっしゃいませ。お待ちして おりました。', it: 'Benvenuto. La stavamo aspettando.' }, { ja: 'あ、山田さん。おそいね。', it: 'Ah, Yamada. Sei in ritardo.' }, { ja: 'いって らっしゃい。', it: 'Vai pure (e torna).' }, { ja: 'おじゃまします。', it: 'Permesso (entrando a casa d’altri).' }],
								giusta: 0, spiega: 'Con un cliente: 「お待ちして おりました」 (お〜する / おる: registro umile, parli di quello che fai tu).'
							}
						},
						{
							domanda: {
								ja: 'おばあさんは {nome}さんに 何を くれましたか。', it: 'Cosa ti ha dato la signora?',
								opzioni: [{ ja: 'ミケの 写真', it: 'una foto di Miké' }, { ja: 'おかし', it: 'dei dolcetti' }, { ja: 'くびわ', it: 'il collare' }, { ja: 'お金', it: 'dei soldi' }],
								giusta: 1, spiega: '「これ、少しですが、おかしです」. くれる = qualcuno dà a me (o ai miei).'
							}
						}
					],
					[{ se: { flag: ['mike.ok'] }, allora: [{ fine: 'いなくなった ミケ' }] }]
				)
			]
		},
		{
			// ミケ trovata dopo mercoledì: si chiude la sera stessa
			id: 'm2-sera-dopo', luogo: 'casa', quando: { giorno: [10, 11], dalle: h(17), flag: ['mike.ok'] },
			passi: [
				{ dice: 'mamma', ja: 'ミケ、見つかって よかったね。', it: 'Meno male che Miké si è trovata.' },
				...cena([], [{ fine: 'いなくなった ミケ' }])
			]
		},
		{
			// rete di sicurezza: se ミケ non si è trovata entro venerdì, torna da sola grazie ai volantini
			id: 'm2-chiusura', luogo: 'casa', quando: { giorno: [12, 13], nonFlag: ['mike.ok'] },
			passi: [
				{ dice: 'mamma', ja: '{nome}さん、聞いた？ ミケ、ポスターを 見た 人が つれて きて くれたそうよ。', it: '{nome}, hai sentito? Pare che Miké l’abbia riportata qualcuno che ha visto il volantino.' },
				{ dice: 'mamma', ja: '木村[きむら]さんの お母さん、とても よろこんで いたって。', it: 'Dicono che la madre dei Kimura fosse felicissima.' },
				{ flag: 'mike.ok' },
				{ fine: 'いなくなった ミケ' }
			]
		}
	]
};
