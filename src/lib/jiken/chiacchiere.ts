// 事件 — chiacchiere dei luoghi: brevi scene fuori dalla trama, scritte per far
// entrare le parole N4 che le missioni non usano (vedi docs/giallo-copertura.md).
// Una alla volta, nell'ordine; quelle sentite non tornano (stato.sentite).
// Ogni chiacchiera fa passare un po' di tempo (test «tempi»).
import type { Chiacchiera, LuogoId } from './tipi';

export const CHIACCHIERE: Partial<Record<LuogoId, Chiacchiera[]>> = {
	konbini: [
		{
			id: 'k-otsuri',
			passi: [
				{ dice: 'commessa', ja: 'おべんとうと お茶で、680円です。あたためますか。', it: 'Bentō e tè, 680 yen. Glielo scaldo?' },
				{ io: 'はい、おねがいします。1000円で。', it: 'Sì, grazie. Pago con 1000 yen.' },
				{ dice: 'commessa', ja: '320円の おつりです。ふくろは ひつようですか。', it: 'Ecco 320 yen di resto. Le serve la busta?' },
				{
					domanda: {
						ja: 'おつりは いくらでしたか。', it: 'Quanto era il resto?',
						opzioni: [{ ja: '320円', it: '320 yen' }, { ja: '680円', it: '680 yen' }, { ja: '380円', it: '380 yen' }, { ja: '1000円', it: '1000 yen' }],
						giusta: 0, spiega: 'おつり = il resto: 1000 − 680 = 320. ひつよう (必要) = necessario.'
					}
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'k-denchi',
			passi: [
				{ io: 'すみません、でんちは どこに ありますか。', it: 'Scusi, dove sono le pile?' },
				{ dice: 'commessa', ja: 'でんちは あちらの たなの 下の だんです。いちばん すみの ほうです。', it: 'Le pile sono sul ripiano basso di quello scaffale. Proprio nell’angolo.' },
				{ dice: 'commessa', ja: 'それから、今週は ぜいこみで 100円 安く なって います。', it: 'E questa settimana costano 100 yen in meno, tasse incluse.' },
				{ nota: 'ぜいこみ (税込[ぜいこ]み) = tasse incluse; すみ (隅[すみ]) = angolo; たな (棚[たな]) = scaffale.', it: 'Parole del negozio.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'k-arubaito',
			passi: [
				{ dice: 'commessa', ja: 'じつは わたし、アルバイトなんです。昼間は 大学で けいざいを べんきょうして います。', it: 'In realtà faccio un lavoretto qui. Di giorno all’università studio economia.' },
				{ io: 'たいへんですね。', it: 'Che fatica.' },
				{ dice: 'commessa', ja: 'しょうらいは ぼうえきの 会社で はたらきたいんです。ゆしゅつや ゆにゅうの しごとです。', it: 'In futuro vorrei lavorare in una ditta di commercio estero: export e import.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'k-dorobo',
			passi: [
				{ dice: 'commessa', ja: 'きのうの 夜、えきの 近くで どろぼうが つかまったそうですよ。', it: 'Pare che ieri sera abbiano preso un ladro vicino alla stazione.' },
				{ dice: 'commessa', ja: 'じてんしゃを ぬすんで、にげる とちゅうで ころんだんですって。', it: 'Aveva rubato una bici e cadendo mentre scappava l’hanno preso.' },
				{ pensa: '中村[なかむら]さんの しごとかな。', it: 'Sarà opera di Nakamura?' },
				{
					domanda: {
						ja: 'どろぼうは どうして つかまりましたか。', it: 'Perché il ladro è stato preso?',
						opzioni: [{ ja: 'にげる とちゅうで ころんだから', it: 'è caduto scappando' }, { ja: 'じてんしゃを かえしたから', it: 'ha restituito la bici' }, { ja: 'けいさつに 電話したから', it: 'ha chiamato la polizia' }, { ja: 'えきで ねて いたから', it: 'dormiva in stazione' }],
						giusta: 0, spiega: 'つかまる (intransitivo) = essere preso; にげる = scappare; とちゅう (途中) = a metà strada.'
					}
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'k-denshi',
			passi: [
				{ dice: 'commessa', ja: 'おきゃくさん、この おにぎりは でんしレンジで 30びょう あたためると おいしいですよ。', it: 'Questo onigiri, se lo scalda 30 secondi nel microonde, è buonissimo.' },
				{ io: 'うちの でんしレンジは こしょうして いるんです。', it: 'Il mio microonde è guasto.' },
				{ dice: 'commessa', ja: 'それは ふべんですね。あたらしいのを かうなら、えきの 前の 大きい 店が 安いですよ。', it: 'Che scomodità. Se ne compra uno nuovo, il negozio grande davanti alla stazione è economico.' },
				{ minuti: 10 }
			]
		}
	],
	parco: [
		{
			id: 'p-hanami',
			passi: [
				{ narra: '公園[こうえん]の さくらの 下で、人が たくさん お花見を して います。', it: 'Sotto i ciliegi del parco tanta gente fa hanami.' },
				{ dice: 'sato', ja: 'あら、{nome}さん！ いっしょに 花見しませんか。おべんとうを たくさん 作って きたんです。', it: 'Oh, {nome}! Facciamo hanami insieme? Ho preparato tanti bentō.' },
				{ io: 'いいんですか。じゃあ、えんりょなく。', it: 'Davvero? Allora non mi faccio pregare.' },
				{ dice: 'sato', ja: 'どうぞ どうぞ。ことしの さくらは ほんとうに うつくしいですね。', it: 'Prego, prego. Quest’anno i ciliegi sono davvero bellissimi.' },
				{ nota: 'えんりょなく (遠慮[えんりょ]なく) = senza fare complimenti. えんりょする = trattenersi per cortesia.', it: 'Espressione di cortesia.' },
				{ minuti: 30 }
			]
		},
		{
			id: 'p-undou',
			passi: [
				{ dice: 'kimura', ja: 'やあ、{nome}さん。わたしは まいあさ ここで うんどうして いるんです。', it: 'Ehi, {nome}. Io ogni mattina faccio movimento qui.' },
				{ dice: 'kimura', ja: 'いしゃに 「すこし やせなさい」と 言われましてね。ははは。', it: 'Il medico mi ha detto «dimagrisca un po’». Ah ah.' },
				{ io: 'まいにち がんばって いますね。', it: 'Si impegna ogni giorno.' },
				{ nota: '「やせなさい と 言われた」: passivo (受身[うけみ]) — «mi è stato detto». やせる ↔ ふとる.', it: 'Passivo e contrari.' },
				{ minuti: 15 }
			]
		},
		{
			id: 'p-kodomo',
			passi: [
				{ narra: '小さい 男の子が ないて います。', it: 'Un bambino piccolo sta piangendo.' },
				{ dice: 'aya', ja: 'どう したの？ ……ころんで、ひざから ちが 出たのね。', it: 'Che succede? …Sei caduto e ti sanguina il ginocchio.' },
				{ dice: 'aya', ja: '{nome}さん、すみません、水を もって きて くれませんか。', it: '{nome}, mi scusi, mi porterebbe dell’acqua?' },
				{ io: 'はい！ すぐ もって きます。', it: 'Sì! La porto subito.' },
				{ dice: 'aya', ja: 'ありがとうございます。きずが よごれて いたので、あらいました。もう だいじょうぶよ。', it: 'Grazie. La ferita era sporca, l’ho lavata. Ora va tutto bene.' },
				{ minuti: 15 }
			]
		},
		{
			id: 'p-tori',
			passi: [
				{ dice: 'nonna', ja: 'ほら、あの 木の えだに 小鳥が いるでしょう。', it: 'Guarda, su quel ramo c’è un uccellino.' },
				{ dice: 'nonna', ja: 'むかしは この あたりは いなかで、田んぼと 森ばかりだったのよ。', it: 'Una volta qui era campagna: solo risaie e boschi.' },
				{ dice: 'nonna', ja: '今は ビルが ふえて、じんこうも ずいぶん ふえたわね。', it: 'Ora sono aumentati i palazzi, e anche la popolazione, parecchio.' },
				{
					domanda: {
						ja: 'むかし、この あたりは どんな ところでしたか。', it: 'Com’era una volta questa zona?',
						opzioni: [{ ja: 'いなか', it: 'campagna' }, { ja: 'ビルが 多い 町', it: 'città con tanti palazzi' }, { ja: 'みなと', it: 'un porto' }, { ja: 'こうじょう', it: 'una fabbrica' }],
						giusta: 0, spiega: 'むかし (昔) = una volta; いなか (田舎) = campagna; ふえる (増える) = aumentare.'
					}
				},
				{ minuti: 15 }
			]
		},
		{
			id: 'p-tenisu',
			passi: [
				{ dice: 'takahashi', ja: '{nome}さん！ ぼく、土曜日に テニスの しあいが あるんです。', it: '{nome}! Sabato ho una partita di tennis.' },
				{ dice: 'takahashi', ja: 'あいては とても 強いので、かてるか どうか わかりません。でも、いっしょうけんめい やります。', it: 'L’avversario è fortissimo, non so se vinco. Ma ce la metterò tutta.' },
				{ io: 'きっと だいじょうぶ。がんばって ください。', it: 'Andrà sicuramente bene. In bocca al lupo.' },
				{ nota: 'かつ (勝[か]つ) ↔ まける (負[ま]ける). 〜か どうか = se… o no. いっしょうけんめい = con tutto l’impegno.', it: 'Forme utili.' },
				{ minuti: 15 }
			]
		}
	],
	eki: [
		{
			id: 'e-annuncio',
			passi: [
				{ narra: 'ホームに アナウンスが ながれます。', it: 'Sul binario si sente un annuncio.' },
				{
					domanda: {
						ja: 'つぎの 電車は どこで のりかえますか。', it: 'Il prossimo treno: dove si cambia?',
						ascolto: { ja: 'まもなく、2ばんせんに きゅうこう 東京[とうきょう]行きが まいります。あぶないですから、きいろい せんの うちがわへ さがって ください。山野駅[やまのえき]で とっきゅうに のりかえる ことが できます。', it: 'Tra poco al binario 2 arriva l’espresso per Tokyo. Per sicurezza, arretrate dietro la linea gialla. A Yamano si può cambiare con il rapido.', chi: 'F' },
						opzioni: [{ ja: '山野駅[やまのえき]', it: 'a Yamano' }, { ja: '東京[とうきょう]', it: 'a Tokyo' }, { ja: '2ばんせん', it: 'al binario 2' }, { ja: 'さくら町駅', it: 'a Sakura-chō' }],
						giusta: 0, spiega: '「山野駅で とっきゅうに のりかえる ことが できます」. きゅうこう (急行) e とっきゅう (特急) sono due tipi di treno veloce; のりかえる = cambiare treno.'
					}
				},
				{ minuti: 5 }
			]
		},
		{
			id: 'e-wasuremono',
			passi: [
				{ dice: 'postino', ja: 'すみません、わすれものの かかりは どこですか。', it: 'Scusi, dov’è l’ufficio oggetti smarriti?' },
				{ io: 'あ、ゆうびんきょくの 方ですね。かいさつの そばの まどぐちですよ。', it: 'Ah, lei è quello della posta. È lo sportello vicino ai tornelli.' },
				{ dice: 'postino', ja: 'けさ 電車に てぶくろを おとして しまったんです。見つかると いいんですが……。', it: 'Stamattina ho perso i guanti in treno. Spero li trovino…' },
				{ minuti: 10 }
			]
		},
		{
			id: 'e-ryokou',
			passi: [
				{ dice: 'sato', ja: 'あら、{nome}さん。わたし、こんど の しゅうまつに 主人と りょかんへ とまりに 行くんです。', it: 'Oh, {nome}. Il prossimo weekend vado con mio marito a dormire in un ryokan.' },
				{ dice: 'sato', ja: 'みずうみの 近くで、けしきが すばらしいそうです。しゅっぱつは 土曜日の 朝 8時です。', it: 'È vicino a un lago, dicono che il panorama sia splendido. Partiamo sabato alle 8.' },
				{ io: 'いいですね。たのしんで きて ください。', it: 'Che bello. Divertitevi.' },
				{
					domanda: {
						ja: '佐藤[さとう]さんは いつ しゅっぱつしますか。', it: 'Quando parte Sato?',
						opzioni: [{ ja: '土曜日の 朝 8時', it: 'sabato alle 8' }, { ja: '日曜日の 朝 8時', it: 'domenica alle 8' }, { ja: '金曜日の 夜', it: 'venerdì sera' }, { ja: '今日', it: 'oggi' }],
						giusta: 0, spiega: 'しゅっぱつ (出発) = partenza. しゅうまつ (しゅうまつ) = fine settimana.'
					}
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'e-kippu',
			passi: [
				{ narra: 'きっぷうりばの 前に、こまって いる がいこくの 人が います。', it: 'Davanti alla biglietteria c’è uno straniero in difficoltà.' },
				{ io: 'May I help you? ……あ、日本語で だいじょうぶですか。どこへ 行きますか。', it: 'Posso aiutarla? …Ah, va bene in giapponese? Dove deve andare?' },
				{ narra: 'くうこうへ 行きたいそうです。地図を 見ながら、のりかえを せつめいしました。', it: 'Deve andare all’aeroporto. Gli spieghi il cambio guardando la mappa.' },
				{ pensa: 'わたしの 日本語、すこし やくに 立ったかな。', it: 'Il mio giapponese è servito a qualcosa?' },
				{ nota: '役[やく]に 立つ (やくに たつ) = essere utile. くうこう (空港[くうこう]) = aeroporto.', it: 'Espressione N4.' },
				{ minuti: 15 }
			]
		}
	],
	kissa: [
		{
			id: 'c-shumi',
			passi: [
				{ dice: 'ito', ja: '{nome}さん、しゅみは 何ですか。', it: '{nome}, che hobby ha?' },
				{ io: 'しゃしんを とる ことです。伊藤[いとう]さんは？', it: 'Fare foto. E lei, Ito?' },
				{ dice: 'ito', ja: 'わたしは つりです。休みの 日は 朝 早く うみへ 行って、さかなを つります。', it: 'La pesca. Nei giorni liberi vado al mare la mattina presto a pescare.' },
				{ dice: 'ito', ja: 'つった さかなを やいて、店で 出す ことも あるんですよ。', it: 'A volte il pesce che prendo lo cucino alla griglia e lo servo qui.' },
				{ minuti: 20 }
			]
		},
		{
			id: 'c-hikkoshi',
			passi: [
				{ dice: 'ito', ja: 'となりの 本屋さん、来月 ひっこすそうですよ。', it: 'Pare che la libreria accanto traslochi il mese prossimo.' },
				{ io: 'え、どうしてですか。', it: 'Eh, come mai?' },
				{ dice: 'ito', ja: 'ここの やちんが 高く なったのが りゆうらしいです。ざんねんですね。', it: 'Sembra che il motivo sia l’affitto aumentato. Peccato.' },
				{ nota: '〜そうです (sentito dire) e 〜らしいです (a quanto pare): tutte e due riferiscono, らしい un po’ più come deduzione.', it: 'Riferire notizie.' },
				{ minuti: 20 }
			]
		},
		{
			id: 'c-kekkon',
			passi: [
				{ dice: 'ito', ja: 'じつは わたしの むすめが らいげつ けっこんするんです。', it: 'In realtà mia figlia si sposa il mese prossimo.' },
				{ io: 'おめでとうございます！ けっこんしきは どこで？', it: 'Congratulazioni! Dove sarà il matrimonio?' },
				{ dice: 'ito', ja: 'きょうかいで します。おいわいに 何を おくったら いいか、まだ きめて いないんですよ。', it: 'In chiesa. Non ho ancora deciso che regalo farle.' },
				{ minuti: 20 }
			]
		},
		{
			id: 'c-kibun',
			passi: [
				{ dice: 'ito', ja: '{nome}さん、今日は かおいろが よく ないですね。きぶんが わるいんですか。', it: '{nome}, oggi ha una brutta cera. Non si sente bene?' },
				{ io: 'ちょっと ねむいだけです。きのう ねぼうして、朝ご飯を 食べなかったんです。', it: 'Ho solo sonno. Ieri mi sono svegliato tardi e ho saltato la colazione.' },
				{ dice: 'ito', ja: 'じゃあ、サンドイッチを どうぞ。きょうは サービスです。', it: 'Allora ecco un sandwich. Oggi offre la casa.' },
				{ nota: 'ねぼう (寝坊[ねぼう]) = alzarsi tardi; ねむい (眠[ねむ]い) = avere sonno; きぶん (気分) = come ci si sente.', it: 'Parole N4.' },
				{ minuti: 20 }
			]
		}
	],
	posta: [
		{
			id: 'y-kozutsumi',
			passi: [
				{ io: 'この にもつを イタリアへ おくりたいんですが。', it: 'Vorrei spedire questo pacco in Italia.' },
				{ dice: 'postino', ja: 'ふなびんと こうくうびんが あります。ふなびんは 安いですが、2か月ぐらい かかります。', it: 'C’è la via mare e la via aerea. Via mare costa meno ma ci vogliono circa due mesi.' },
				{ dice: 'postino', ja: 'こうくうびんなら 1週間です。そうりょうは 3000円です。', it: 'Via aerea, una settimana. La spedizione costa 3000 yen.' },
				{
					domanda: {
						ja: 'はやく とどけたい ときは、どちらが いいですか。', it: 'Se vuoi che arrivi presto, quale scegli?',
						opzioni: [{ ja: 'こうくうびん', it: 'via aerea' }, { ja: 'ふなびん', it: 'via mare' }, { ja: 'どちらも おなじ', it: 'sono uguali' }, { ja: 'てがみ', it: 'una lettera' }],
						giusta: 0, spiega: 'Via aerea: 1 settimana; via mare: 2 mesi. そうりょう (送料) = spese di spedizione.'
					}
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'y-nengajou',
			passi: [
				{ dice: 'postino', ja: '日本では お正月に ねんがじょうを 出す しゅうかんが あります。', it: 'In Giappone a Capodanno c’è l’usanza di spedire i biglietti di auguri.' },
				{ dice: 'postino', ja: 'でも 最近[さいきん]は メールで あいさつする 人が ふえて、はがきは へって いるんですよ。', it: 'Ma ultimamente sempre più gente fa gli auguri via email e le cartoline diminuiscono.' },
				{ nota: 'しゅうかん (習慣[しゅうかん]) = usanza; ふえる ↔ へる (増[ふ]える ↔ 減[へ]る).', it: 'Contrari.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'y-kakitome',
			passi: [
				{ io: 'この 手紙は 大切なので、かきとめで おねがいします。', it: 'Questa lettera è importante, la mando raccomandata.' },
				{ dice: 'postino', ja: 'かしこまりました。ここに じゅうしょと 名前を 書いて ください。', it: 'Certamente. Scriva qui indirizzo e nome.' },
				{ dice: 'postino', ja: 'あした の ごご、あいての 人に わたされます。', it: 'Domani pomeriggio verrà consegnata al destinatario.' },
				{ nota: 'かしこまりました = «ho capito» molto cortese, di chi serve un cliente. わたされます: passivo.', it: 'Keigo e passivo.' },
				{ minuti: 10 }
			]
		}
	],
	shokudo: [
		{
			id: 's-shatei',
			passi: [
				{ dice: 'oste', ja: 'いらっしゃい！ きょうの ていしょくは ハンバーグと サラダです。', it: 'Benvenuto! Il menù del giorno è hamburger e insalata.' },
				{ io: 'じゃあ、それを おねがいします。', it: 'Allora quello, grazie.' },
				{ dice: 'oste', ja: 'ごはんは ふつうですか、大もりですか。大もりでも ねだんは おなじですよ。', it: 'Riso normale o abbondante? Il prezzo è lo stesso.' },
				{ minuti: 10 }
			]
		},
		{
			id: 's-tanaka',
			quando: { dalle: 11 * 60 + 30, alle: 14 * 60 },
			passi: [
				{ dice: 'tanaka', ja: 'あ、{nome}さん、ここ あいて いますよ。どうぞ。', it: 'Ah, {nome}, qui è libero. Prego.' },
				{ dice: 'tanaka', ja: 'じつは ぼく、こんど ちゅうしゃじょうの 近くに ひっこすんです。会社まで あるいて 5分です。', it: 'Sai, presto trasloco vicino al parcheggio. Cinque minuti a piedi dalla ditta.' },
				{ io: 'べんりですね。もう ねぼうしても だいじょうぶですね。', it: 'Comodo. Così anche se dorme troppo non fa tardi.' },
				{ dice: 'tanaka', ja: 'ははは、きびしいなあ。', it: 'Ah ah, che cattiveria.' },
				{ minuti: 20 }
			]
		},
		{
			id: 's-aji',
			passi: [
				{ dice: 'oste', ja: 'みそしるの あじは どうですか。けさ 新しい みそを ためして みたんです。', it: 'Com’è il sapore della zuppa di miso? Stamattina ho provato un miso nuovo.' },
				{ io: 'すこし にがいですが、おいしいです。', it: 'Un po’ amarognola, ma buona.' },
				{ dice: 'oste', ja: 'そうですか。もっと やわらかい あじに しましょう。いけんを ありがとう。', it: 'Capisco. Lo farò più delicato. Grazie del parere.' },
				{ minuti: 15 }
			]
		}
	],
	hanaya: [
		{
			id: 'h-sodateru',
			passi: [
				{ dice: 'fioraia', ja: 'この 花は そだてるのが かんたんですよ。水は 三日に 一回で 十分です。', it: 'Questi fiori sono facili da coltivare. Basta annaffiarli una volta ogni tre giorni.' },
				{ dice: 'fioraia', ja: 'でも、日の あたる ところに おいて くださいね。くらい ところだと かれて しまいます。', it: 'Però li metta in un posto al sole. Al buio appassiscono.' },
				{
					domanda: {
						ja: '水は どのぐらい やりますか。', it: 'Ogni quanto si annaffiano?',
						opzioni: [{ ja: '三日に 一回', it: 'una volta ogni tre giorni' }, { ja: '毎日', it: 'ogni giorno' }, { ja: '一日に 三回', it: 'tre volte al giorno' }, { ja: '一週間に 一回', it: 'una volta alla settimana' }],
						giusta: 0, spiega: '「三日に 一回で 十分です」: 〜に 一回 = una volta ogni…; 十分 (じゅうぶん) = abbastanza.'
					}
				},
				{ minuti: 10 }
			]
		},
		{
			id: 'h-okurimono',
			passi: [
				{ io: 'そぼの たんじょうびの おくりものを さがして います。', it: 'Cerco un regalo per il compleanno di mia nonna.' },
				{ dice: 'fioraia', ja: 'それなら、この 小さい はちうえは どうですか。にわに うえる ことも できますよ。', it: 'Allora che ne dice di questo vasetto? Si può anche piantare in giardino.' },
				{ dice: 'fioraia', ja: 'きれいに つつみますね。リボンは 赤と 白、どちらが いいですか。', it: 'Glielo incarto bene. Il nastro rosso o bianco?' },
				{ minuti: 10 }
			]
		}
	],
	panya: [
		{
			id: 'b-yaku',
			passi: [
				{ dice: 'fornaia', ja: 'いらっしゃいませ。この パンは 今 やけた ところです。', it: 'Benvenut{o}. Questo pane è appena sfornato.' },
				{ dice: 'fornaia', ja: 'まいあさ 4時に おきて、パンを やいて いるんです。たいへんですが、すきな しごとですから。', it: 'Ogni mattina mi alzo alle 4 a fare il pane. È faticoso, ma è un lavoro che amo.' },
				{ nota: 'やく (焼[や]く, transitivo) / やける (焼[や]ける, intransitivo): «cuocere» / «essere cotto». 〜た ところ = appena fatto.', it: 'Coppia di verbi.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'b-jam',
			passi: [
				{ dice: 'fornaia', ja: 'この ジャムは ぶどうで 作りました。いなかの そふの はたけの ぶどうです。', it: 'Questa marmellata è d’uva, dell’orto di mio nonno in campagna.' },
				{ io: 'あまくて おいしそうですね。', it: 'Sembra dolce e buona.' },
				{ dice: 'fornaia', ja: 'あじみを どうぞ。きっと 気に いりますよ。', it: 'La assaggi. Le piacerà di sicuro.' },
				{ minuti: 10 }
			]
		}
	],
	eki2: [
		{
			id: 'e2-kaisatsu',
			passi: [
				{ narra: 'かいさつの 前に、たくさんの 人が あつまって います。', it: 'Davanti ai tornelli si è radunata tanta gente.' },
				{
					domanda: {
						ja: '電車は どうして おくれて いますか。', it: 'Perché i treni sono in ritardo?',
						ascolto: { ja: 'おきゃくさまに おしらせ いたします。ただいま、じしんの ため、電車が とまって おります。あんぜんを たしかめてから、うんてんを はじめます。もうしばらく おまち ください。', it: 'Avviso ai viaggiatori. A causa di un terremoto i treni sono fermi. Ripartiranno dopo i controlli di sicurezza. Attendete ancora un po’.', chi: 'M' },
						opzioni: [{ ja: 'じしんが あったから', it: 'c’è stato un terremoto' }, { ja: 'たいふうが 来たから', it: 'è arrivato un tifone' }, { ja: 'じこが あったから', it: 'c’è stato un incidente' }, { ja: 'ゆきが ふったから', it: 'ha nevicato' }],
						giusta: 0, spiega: '「じしんの ため」: 〜の ため = a causa di. あんぜん (安全) = sicurezza; うんてん (運転) = servizio, guida.'
					}
				},
				{ narra: '10分ぐらいで、電車が また うごき はじめました。', it: 'Dopo una decina di minuti i treni ripartono.' },
				{ minuti: 10 }
			]
		},
		{
			id: 'e2-depa',
			passi: [
				{ dice: 'aya', ja: 'あ、{nome}さん！ 今から デパートで アルバイトなんです。', it: 'Ah, {nome}! Ora vado a lavorare al grande magazzino.' },
				{ dice: 'aya', ja: 'おきゃくさまには けいごを つかうので、まだ きんちょうします。「いらっしゃいませ」「かしこまりました」……。', it: 'Con i clienti si usa il keigo, sono ancora tesa. «Benvenuti», «Certamente»…' },
				{ io: 'あやさんなら、きっと 上手に できますよ。', it: 'Lei ci riuscirà di sicuro.' },
				{ minuti: 10 }
			]
		}
	],
	depa: [
		{
			id: 'd-goran',
			passi: [
				{ dice: 'aya', ja: 'いらっしゃいませ。どうぞ ごらんください。', it: 'Benvenut{o}. Prego, guardi pure.' },
				{ io: 'あ、あやさん！ アルバイト中ですね。', it: 'Ah, Aya! Sei al lavoro.' },
				{ dice: 'aya', ja: 'はい。（小さい 声で）おきゃくさまが 何か なさる ときは、「なさる」を つかうんです。むずかしいですね。', it: 'Sì. (a bassa voce) Quando un cliente fa qualcosa si usa «nasaru». Difficile.' },
				{ nota: 'ごらんください (ご覧[らん]ください) = guardi pure; なさる = する in 尊敬語[そんけいご] (rispetto per l’altro).', it: 'Keigo di rispetto.' },
				{ minuti: 15 }
			]
		},
		{
			id: 'd-size',
			passi: [
				{ io: 'この スーツの もう すこし 大きい サイズは ありますか。', it: 'Di questo completo c’è una taglia un po’ più grande?' },
				{ dice: 'aya', ja: 'しょうしょう おまち ください。……もうしわけ ございません。この いろは うりきれて しまいました。', it: 'Attenda un attimo. …Mi dispiace molto, questo colore è esaurito.' },
				{ dice: 'aya', ja: 'こちらの こい 青なら ございます。いかがですか。', it: 'In blu scuro invece c’è. Che ne dice?' },
				{
					domanda: {
						ja: 'あやさんは 何と 言いましたか。', it: 'Cosa ha detto Aya?',
						opzioni: [{ ja: 'その いろは もう ない', it: 'quel colore non c’è più' }, { ja: 'サイズが ない', it: 'non c’è la taglia in nessun colore' }, { ja: 'あした 来る', it: 'arriva domani' }, { ja: 'ねだんが 高い', it: 'costa caro' }],
						giusta: 0, spiega: '「うりきれて しまいました」 = è esaurito (purtroppo). ございます = あります molto cortese.'
					}
				},
				{ minuti: 15 }
			]
		}
	],
	banca: [
		{
			id: 'g-atm',
			passi: [
				{ dice: 'bancario', ja: 'いらっしゃいませ。本日は どのような ご用件[ようけん]でしょうか。', it: 'Benvenut{o}. Oggi per che cosa?' },
				{ io: 'お金を おろしたいんですが、ATMの つかいかたが よく わかりません。', it: 'Vorrei prelevare, ma non capisco bene come si usa il bancomat.' },
				{ dice: 'bancario', ja: 'ごあんない いたします。こちらの ボタンを おして、カードを お入れ ください。', it: 'La accompagno. Prema questo tasto e inserisca la carta.' },
				{ nota: 'ごあんない いたします (ご案内[あんない]いたします) = 謙譲語[けんじょうご]: «la accompagno» abbassando sé stessi. お入れ ください = inserisca (rispettoso).', it: 'Keigo umile e rispettoso.' },
				{ minuti: 15 }
			]
		}
	],
	ospedale: [
		{
			id: 'o-omimai',
			passi: [
				{ narra: 'びょういんの 前で、佐藤[さとう]さんに 会いました。', it: 'Davanti all’ospedale incontri Sato.' },
				{ dice: 'sato', ja: '主人の おみまいなんです。先週 じこで けがを して、にゅういんして いるんです。', it: 'Sono venuta a trovare mio marito. La settimana scorsa si è fatto male in un incidente ed è ricoverato.' },
				{ dice: 'sato', ja: 'でも、ぐあいは よく なって、来週 たいいんできるそうです。', it: 'Ma sta meglio, e pare che la settimana prossima lo dimettano.' },
				{
					domanda: {
						ja: '佐藤[さとう]さんの ご主人は いつ たいいんしますか。', it: 'Quando esce dall’ospedale il marito di Sato?',
						opzioni: [{ ja: '来週', it: 'la settimana prossima' }, { ja: '先週', it: 'la settimana scorsa' }, { ja: '今日', it: 'oggi' }, { ja: 'まだ わからない', it: 'non si sa ancora' }],
						giusta: 0, spiega: 'にゅういん (入院) = ricovero ↔ たいいん (退院) = dimissione. おみまい = visita a un malato.'
					}
				},
				{ minuti: 15 }
			]
		},
		{
			id: 'o-chuusha',
			passi: [
				{ dice: 'dottoressa', ja: 'かぜが はやって いますから、気を つけて くださいね。', it: 'Gira l’influenza, faccia attenzione.' },
				{ dice: 'dottoressa', ja: 'ねつが 38どより 高く なったら、ちゅうしゃを しますから、すぐ 来て ください。', it: 'Se la febbre supera i 38 gradi facciamo un’iniezione: venga subito.' },
				{ nota: 'ねつ (熱[ねつ]) = febbre; ちゅうしゃ (注射[ちゅうしゃ]) = iniezione; 〜たら = se/quando.', it: 'All’ospedale.' },
				{ minuti: 10 }
			]
		}
	],
	ramen: [
		{
			id: 'r-kaeru',
			passi: [
				{ dice: 'oste', ja: 'うちの ラーメンは スープが じまんです。ぶたの ほねを 一日 にて 作るんですよ。', it: 'Il nostro vanto è il brodo: ossa di maiale bollite un giorno intero.' },
				{ dice: 'oste', ja: 'めんは かためと やわらかめ、どちらに しますか。', it: 'Spaghetti al dente o morbidi?' },
				{ io: 'かためで おねがいします。', it: 'Al dente, grazie.' },
				{ minuti: 20 }
			]
		}
	]
};
