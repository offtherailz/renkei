// Mazzi tematici di flashcard (studio rapido del lessico per tema), con pronuncia
// TTS e furigana nascondibile. Indipendenti dal catalogo/SRS: contenuto curato qui.
// `jp`: forma scritta (kanji o kana) mostrata sul fronte SENZA furigana, così si
// allena la lettura; `yomi`: lettura in kana (svelata dietro + usata dal TTS);
// `it`: significato; `es`/`es_it`: frase d'esempio (furigana 漢字[かな]) + traduzione.

export interface MazzoCard {
	jp: string;
	yomi: string;
	it: string;
	es?: string;
	es_it?: string;
}

// Esercizio curato del mazzo (cloze/scelta): grammatica/funzioni del tema.
export interface MazzoEsercizio {
	prompt: string; // frase col buco ＿＿ (furigana 漢字[かな])
	choices: string[]; // la prima è la corretta (si mescola a runtime)
	spiega: string;
	traduzione: string;
}

// Esercizio di PRODUZIONE: consegna in italiano + pattern da usare → l'utente
// prova a produrre la frase, poi rivela la soluzione modello con spiegazione.
export interface MazzoProduzione {
	consegna: string; // cosa dire (IT)
	pattern: string; // forma da usare (es. 〜なくなる, 〜ちゃう)
	risposta: string; // frase modello (furigana 漢字[かな])
	spiega: string; // come si forma / nota
}

export interface Mazzo {
	id: string;
	titolo: string;
	emoji: string;
	descrizione: string;
	carte: MazzoCard[];
	esercizi?: MazzoEsercizio[];
	produzione?: MazzoProduzione[];
	// nota didattica mostrata all'inizio della modalità produzione
	produzioneNota?: string;
}

export const MAZZI: Record<string, Mazzo> = {
	kaden: {
		id: 'kaden',
		titolo: '家電を買う',
		emoji: '🔌',
		descrizione: 'Elettrodomestici e comprare online: cercare, confrontare, ordinare, ricevere.',
		carte: [
			{ jp: '電気製品', yomi: 'でんきせいひん', it: 'elettrodomestici, prodotti elettrici', es: 'いろいろな 電気製品[でんきせいひん]を くらべました。', es_it: 'Ho confrontato vari elettrodomestici.' },
			{ jp: '商品', yomi: 'しょうひん', it: 'prodotto, articolo, merce', es: 'ちょうどいい 商品[しょうひん]を 探[さが]しました。', es_it: 'Ho cercato un prodotto giusto.' },
			{ jp: '探す', yomi: 'さがす', it: 'cercare', es: '安[やす]い 店[みせ]を 探[さが]して います。', es_it: 'Sto cercando un negozio economico.' },
			{ jp: '決める', yomi: 'きめる', it: 'decidere, scegliere', es: 'やっと 決[き]めました。', es_it: 'Alla fine ho deciso.' },
			{ jp: '注文する', yomi: 'ちゅうもんする', it: 'ordinare, fare un ordine', es: 'インターネットで 注文[ちゅうもん]しました。', es_it: 'Ho ordinato su internet.' },
			{ jp: '届く', yomi: 'とどく', it: 'arrivare, essere consegnato', es: '三日[みっか]で 届[とど]きました。', es_it: 'È arrivato in tre giorni.' },
			{ jp: '比べる', yomi: 'くらべる', it: 'confrontare, paragonare', es: 'ねだんを 比[くら]べて みましょう。', es_it: 'Confrontiamo i prezzi.' },
			{ jp: '調子がいい', yomi: 'ちょうしがいい', it: 'funzionare/stare bene', es: 'この 冷蔵庫[れいぞうこ]は 調子[ちょうし]が いいです。', es_it: 'Questo frigo funziona bene.' },
			{ jp: '調子が悪い', yomi: 'ちょうしがわるい', it: 'funzionare/stare male', es: '前[まえ]のは 調子[ちょうし]が 悪[わる]かったです。', es_it: 'Quello di prima funzionava male.' },
			{ jp: 'ちょうどいい', yomi: 'ちょうどいい', it: 'giusto, perfetto, ideale', es: '大[おお]きさが ちょうどいいです。', es_it: 'La dimensione è perfetta.' },
			{ jp: '検索する', yomi: 'けんさくする', it: 'cercare (online), fare una ricerca', es: 'ネットで 検索[けんさく]しました。', es_it: 'Ho fatto una ricerca su internet.' },
			{ jp: '動く', yomi: 'うごく', it: 'muoversi, funzionare', es: 'よく 動[うご]きます。', es_it: 'Funziona bene.' },
			{ jp: '快適な', yomi: 'かいてきな', it: 'confortevole, comodo, piacevole', es: '今[いま]は とても 快適[かいてき]です。', es_it: 'Ora è molto comodo.' },
			{ jp: '気にする', yomi: 'きにする', it: 'preoccuparsi di, farci caso', es: '音[おと]を 気[き]に して いました。', es_it: 'Facevo caso al rumore.' },
			{ jp: '冷蔵庫', yomi: 'れいぞうこ', it: 'frigorifero', es: '新[あたら]しい 冷蔵庫[れいぞうこ]が ほしいです。', es_it: 'Voglio un frigo nuovo.' },
			{ jp: '炊飯器', yomi: 'すいはんき', it: 'cuociriso', es: '炊飯器[すいはんき]で ごはんを たきます。', es_it: 'Cuocio il riso col cuociriso.' },
			{ jp: '扇風機', yomi: 'せんぷうき', it: 'ventilatore', es: '暑[あつ]いので 扇風機[せんぷうき]を つけました。', es_it: 'Fa caldo, ho acceso il ventilatore.' },
			{ jp: '洗濯機', yomi: 'せんたくき', it: 'lavatrice', es: '洗濯機[せんたくき]で 服[ふく]を 洗[あら]います。', es_it: 'Lavo i vestiti in lavatrice.' },
			{ jp: '掃除機', yomi: 'そうじき', it: 'aspirapolvere', es: '掃除機[そうじき]を かけました。', es_it: 'Ho passato l’aspirapolvere.' },
			{ jp: '電子レンジ', yomi: 'でんしレンジ', it: 'forno a microonde', es: '電子[でんし]レンジで あたためます。', es_it: 'Lo scaldo al microonde.' }
		],
		// Grammatica/funzioni del capitolo: «qualcosa si è rotto / non funziona» +
		// 〜てしまう (rammarico, «purtroppo»), 調子が悪い, 動かない, つかない, 気になる.
		esercizi: [
			{ prompt: 'パソコン[ぱそこん]が 急[きゅう]に ＿＿ なりました。', choices: ['動[うご]かなく', '動[うご]く', '使[つか]わなく', '買[か]わなく'],
				spiega: '動かなくなる = «smettere di funzionare». 動かない + なる.', traduzione: 'Il computer all’improvviso ha smesso di funzionare.' },
			{ prompt: '新[あたら]しい スマホ[すまほ]を 落[お]として ＿＿。', choices: ['しまいました', 'おきました', 'みました', 'いました'],
				spiega: '〜てしまう = rammarico/completamento («purtroppo»): 落として しまいました.', traduzione: 'Purtroppo ho fatto cadere lo smartphone nuovo.' },
			{ prompt: 'この エアコン[えあこん]は ＿＿ が 悪[わる]いです。', choices: ['調子[ちょうし]', '気分[きぶん]', '元気[げんき]', '天気[てんき]'],
				spiega: '調子が悪い = (una macchina) «funziona male».', traduzione: 'Questo condizionatore funziona male.' },
			{ prompt: '時計[とけい]が 止[と]まって ＿＿。', choices: ['しまいました', 'きました', 'おきました', 'みました'],
				spiega: '止まってしまう: si è fermato (e purtroppo è così).', traduzione: 'L’orologio si è fermato (purtroppo).' },
			{ prompt: 'スイッチ[すいっち]を 押[お]しても、電気[でんき]が ＿＿。', choices: ['つきません', 'あきません', 'でません', 'なりません'],
				spiega: '（電気が）つく = «accendersi»; negativo cortese つきません.', traduzione: 'Anche premendo l’interruttore, la luce non si accende.' },
			{ prompt: 'せっかく 買[か]ったのに、もう ＿＿。', choices: ['壊[こわ]れて しまいました', '使[つか]って います', '届[とど]きました', '安[やす]いです'],
				spiega: 'せっかく〜のに + 〜てしまう: rammarico (si è già rotto).', traduzione: 'L’avevo appena comprato, eppure si è già rotto.' },
			{ prompt: '冷蔵庫[れいぞうこ]の 音[おと]が 大[おお]きくて、＿＿。', choices: ['気[き]に なります', '気[き]を つけます', '気[き]が します', '元気[げんき]です'],
				spiega: '気になる = «dà fastidio / ci faccio caso».', traduzione: 'Il rumore del frigo mi dà fastidio.' },
			{ prompt: 'パソコン[ぱそこん]が 動[うご]かなくて、＿＿。', choices: ['困[こま]って います', 'うれしいです', '便利[べんり]です', '楽[たの]しいです'],
				spiega: '〜て、困っている: esprimere il problema («sono in difficoltà»).', traduzione: 'Il computer non funziona e sono in difficoltà.' }
		],
		produzioneNota:
			'Formule chiave: 〜なくなる = «smettere di (fare/funzionare)» (dizionario→ない→なくなる). 〜てしまう = azione completata o con rammarico («purtroppo»); in parlato diventa 〜ちゃう (da 〜て) e 〜じゃう (da 〜で: 読んで→読んじゃう). 〜ないで = «senza fare» (ない + で). Puoi combinarle: 動かなくなってしまう.',
		produzione: [
			{ consegna: 'Di’ che la lavatrice non funziona più.', pattern: '〜なくなる',
				risposta: '洗濯機[せんたくき]が 動[うご]かなく なりました。',
				spiega: '動く → 動かない → 動かなく+なる: «ha smesso di funzionare / non funziona più».' },
			{ consegna: 'Di’ che la TV non si accende più.', pattern: '〜なくなる',
				risposta: 'テレビ[てれび]が つかなく なりました。',
				spiega: 'つく (accendersi) → つかない → つかなくなる.' },
			{ consegna: 'Di’ che, purtroppo, hai dimenticato i compiti.', pattern: '〜ちゃう',
				risposta: '宿題[しゅくだい]を 忘[わす]れちゃった。',
				spiega: '忘れてしまった → (parlato) 忘れちゃった. Rammarico: «me ne sono purtroppo dimenticato».' },
			{ consegna: 'Di’ che hai fatto cadere un bicchiere per errore (purtroppo).', pattern: '〜てしまう',
				risposta: 'コップ[こっぷ]を 落[お]として しまいました。',
				spiega: '落とす → 落として + しまう: azione non voluta / con rammarico.' },
			{ consegna: 'Di’ che hai mangiato tutta la torta.', pattern: '〜ちゃう',
				risposta: 'ケーキ[けーき]を 全部[ぜんぶ] 食[た]べちゃった。',
				spiega: '食べてしまった → 食べちゃった. Qui 〜ちゃう = «completamento» (fino in fondo).' },
			{ consegna: 'Di’ che hai finito di leggere tutto il manga.', pattern: '〜じゃう',
				risposta: '漫画[まんが]を 全部[ぜんぶ] 読[よ]んじゃった。',
				spiega: '読んでしまった → 読んじゃった. Con la て sonora (〜で) la contrazione è 〜じゃう.' },
			{ consegna: 'Di’ che, purtroppo, la lavatrice non funziona più.', pattern: '〜なくなってしまう',
				risposta: '洗濯機[せんたくき]が 動[うご]かなく なって しまいました。',
				spiega: 'Combina 〜なくなる (smettere) + 〜てしまう (rammarico): 動かなくなってしまった.' },
			{ consegna: 'Di’ che la lavatrice ha smesso di funzionare (purtroppo).', pattern: '調子 + ちゃう',
				risposta: '洗濯機[せんたくき]の 調子[ちょうし]が 悪[わる]く なっちゃった。',
				spiega: '調子が悪くなる (iniziare a funzionare male) + 〜ちゃう: 悪くなっちゃった.' },
			{ consegna: 'Di’ che sei venuto/a senza fare colazione.', pattern: '〜ないで',
				risposta: '朝[あさ]ごはんを 食[た]べないで 来[き]ました。',
				spiega: '食べる → 食べ+ないで: «senza mangiare». 〜ないで + verbo principale.' },
			{ consegna: 'Di’ che puoi fare acquisti senza andare in negozio.', pattern: '〜ないで',
				risposta: '店[みせ]に 行[い]かないで 買[か]い物[もの]が できます。',
				spiega: '行く → 行かないで: «senza andare». 〜ないで esprime il modo (senza fare X).' },
			{ consegna: 'Di’ che il condizionatore non si raffredda più.', pattern: '〜なくなる',
				risposta: 'エアコン[えあこん]が 冷[ひ]えなく なりました。',
				spiega: '冷える → 冷えない → 冷えなくなる.' },
			{ consegna: 'Di’ che l’orologio non va più.', pattern: '〜なくなる',
				risposta: '時計[とけい]が 動[うご]かなく なりました。',
				spiega: '動く → 動かない → 動かなくなる.' },
			{ consegna: 'Di’ che, purtroppo, hai perso il portafoglio.', pattern: '〜てしまう',
				risposta: '財布[さいふ]を なくして しまいました。',
				spiega: 'なくす → なくして + しまう (rammarico).' },
			{ consegna: 'Di’ che purtroppo hai perso il treno.', pattern: '〜ちゃう',
				risposta: '電車[でんしゃ]に 乗[の]り遅[おく]れちゃった。',
				spiega: '乗り遅れてしまった → 乗り遅れちゃった.' },
			{ consegna: 'Di’ che hai bevuto tutto il caffè.', pattern: '〜ちゃう',
				risposta: 'コーヒー[こーひー]を 全部[ぜんぶ] 飲[の]んじゃった。',
				spiega: '飲んでしまった → 飲んじゃった (て sonora 〜で → 〜じゃう).' },
			{ consegna: 'Di’ che hai finito di scrivere la lettera.', pattern: '〜ちゃう',
				risposta: '手紙[てがみ]を 書[か]いちゃった。',
				spiega: '書いてしまった → 書いちゃった.' },
			{ consegna: 'Di’ che purtroppo ti sei perso per strada.', pattern: '〜てしまう',
				risposta: '道[みち]に 迷[まよ]って しまいました。',
				spiega: '迷う → 迷って + しまう.' },
			{ consegna: 'Di’ che purtroppo ti sei preso il raffreddore.', pattern: '〜ちゃう',
				risposta: '風邪[かぜ]を ひいちゃった。',
				spiega: 'ひいてしまった → ひいちゃった.' },
			{ consegna: 'Di’ che il computer ha smesso di funzionare (purtroppo).', pattern: '調子 + ちゃう',
				risposta: 'パソコン[ぱそこん]の 調子[ちょうし]が 悪[わる]く なっちゃった。',
				spiega: '調子が悪くなる + 〜ちゃう: 悪くなっちゃった.' },
			{ consegna: 'Di’ che sei uscito senza portare l’ombrello.', pattern: '〜ないで',
				risposta: 'かさを 持[も]たないで 出[で]かけました。',
				spiega: '持つ → 持たないで: «senza portare».' },
			{ consegna: 'Di’ che ti sei addormentato senza spegnere la luce (purtroppo).', pattern: '〜ないで + 〜ちゃう',
				risposta: '電気[でんき]を 消[け]さないで 寝[ね]ちゃった。',
				spiega: 'Combina 〜ないで (senza spegnere) + 寝てしまった→寝ちゃった.' }
		]
	},
	shogatsu: {
		id: 'shogatsu',
		titolo: 'とくべつな日：お正月',
		emoji: '🎍',
		descrizione: 'Capodanno giapponese: date, usanze, cibi, saluti ed emozioni, e come scrivere un 年賀状.',
		carte: [
			{ jp: '正月, お正月', yomi: 'しょうがつ', it: 'Capodanno', es: 'お正月[しょうがつ]は 家族[かぞく]と すごします。', es_it: 'Il Capodanno lo passo con la famiglia.' },
			{ jp: '年中行事', yomi: 'ねんちゅうぎょうじ', it: 'evento annuale, festa ricorrente', es: 'お正月[しょうがつ]は 大切[たいせつ]な 年中行事[ねんちゅうぎょうじ]です。', es_it: 'Il Capodanno è un’importante festa dell’anno.' },
			{ jp: '祝う', yomi: 'いわう', it: 'festeggiare', es: '友[とも]だちの 誕生日[たんじょうび]を 祝[いわ]いました。', es_it: 'Ho festeggiato il compleanno di un amico.' },
			{ jp: '健康', yomi: 'けんこう', it: 'salute', es: '健康[けんこう]の ために 毎日[まいにち] 歩[ある]きます。', es_it: 'Cammino ogni giorno per la salute.' },
			{ jp: '幸せ', yomi: 'しあわせ', it: 'felicità; felice', es: '家族[かぞく]と いる 時[とき]が 一番[いちばん] 幸[しあわ]せです。', es_it: 'Sono più felice quando sto con la famiglia.' },
			{ jp: '願う', yomi: 'ねがう', it: 'desiderare, augurarsi', es: '家族[かぞく]の 健康[けんこう]を 願[ねが]います。', es_it: 'Mi auguro la salute della mia famiglia.' },
			{ jp: '大みそか', yomi: 'おおみそか', it: 'ultimo giorno dell’anno, 31 dicembre', es: '大[おお]みそかは 家[いえ]に います。', es_it: 'L’ultimo dell’anno sto a casa.' },
			{ jp: '元日', yomi: 'がんじつ', it: 'primo giorno dell’anno, 1° gennaio', es: '元日[がんじつ]は 店[みせ]が 休[やす]みです。', es_it: 'Il 1° gennaio i negozi sono chiusi.' },
			{ jp: '元旦', yomi: 'がんたん', it: 'mattina del 1° gennaio, Capodanno', es: '年賀状[ねんがじょう]に 「元旦[がんたん]」と 書[か]きます。', es_it: 'Sul biglietto d’auguri si scrive «元旦».' },
			{ jp: '三が日', yomi: 'さんがにち', it: 'i primi tre giorni dell’anno', es: '三[さん]が日[にち]は どこにも 行[い]きません。', es_it: 'Nei primi tre giorni dell’anno non vado da nessuna parte.' },
			{ jp: '大そうじ', yomi: 'おおそうじ', it: 'grandi pulizie', es: '年末[ねんまつ]に 大[おお]そうじを します。', es_it: 'A fine anno faccio le grandi pulizie.' },
			{ jp: '神社', yomi: 'じんじゃ', it: 'santuario shintoista', es: '近[ちか]くの 神社[じんじゃ]へ 行[い]きました。', es_it: 'Sono andato al santuario qui vicino.' },
			{ jp: '寺, お寺', yomi: 'てら', it: 'tempio buddhista', es: '京都[きょうと]で お寺[てら]を 見[み]ました。', es_it: 'A Kyoto ho visto un tempio.' },
			{ jp: '初詣', yomi: 'はつもうで', it: 'prima visita dell’anno al santuario o al tempio', es: '友[とも]だちと 初詣[はつもうで]に 行[い]きました。', es_it: 'Sono andato con gli amici alla prima visita dell’anno.' },
			{ jp: 'おせち料理', yomi: 'おせちりょうり', it: 'piatti tradizionali di Capodanno', es: '母[はは]が おせち料理[りょうり]を 作[つく]りました。', es_it: 'Mia madre ha preparato i piatti di Capodanno.' },
			{ jp: 'お雑煮', yomi: 'おぞうに', it: 'zuppa di Capodanno con mochi', es: '朝[あさ]ごはんに お雑煮[ぞうに]を 食[た]べます。', es_it: 'A colazione mangio la zuppa di Capodanno.' },
			{ jp: 'もち', yomi: 'もち', it: 'mochi, tortina di riso', es: 'スープに もちを 入[い]れます。', es_it: 'Metto il mochi nella zuppa.' },
			{ jp: '年越しそば', yomi: 'としこしそば', it: 'soba dell’ultimo dell’anno', es: '大[おお]みそかに 年越[としこ]しそばを 食[た]べました。', es_it: 'L’ultimo dell’anno ho mangiato la soba tradizionale.' },
			{ jp: '年賀状', yomi: 'ねんがじょう', it: 'biglietto d’auguri di Capodanno', es: '友[とも]だちに 年賀状[ねんがじょう]を 書[か]きます。', es_it: 'Scrivo un biglietto d’auguri a un amico.' },
			{ jp: 'かるた', yomi: 'かるた', it: 'karuta, gioco di carte tradizionale', es: '子[こ]どもたちは かるたで 遊[あそ]びます。', es_it: 'I bambini giocano a karuta.' },
			{ jp: 'お年玉', yomi: 'おとしだま', it: 'denaro regalato ai bambini a Capodanno', es: 'おじさんに お年玉[としだま]を もらいました。', es_it: 'Lo zio mi ha dato i soldi di Capodanno.' },
			{ jp: '門松', yomi: 'かどまつ', it: 'kadomatsu, decorazione di pino e bambù', es: '店[みせ]の 前[まえ]に 門松[かどまつ]が あります。', es_it: 'Davanti al negozio c’è un kadomatsu.' },
			{ jp: 'しめ飾り', yomi: 'しめかざり', it: 'shimekazari, ghirlanda di paglia', es: 'ドアに しめ飾[かざ]りを 飾[かざ]ります。', es_it: 'Appendo la ghirlanda di paglia alla porta.' },
			{ jp: '鏡もち', yomi: 'かがみもち', it: 'kagamimochi, mochi sovrapposti', es: '部屋[へや]に 鏡[かがみ]もちを 飾[かざ]りました。', es_it: 'Ho messo i mochi decorativi in camera.' },
			{ jp: 'あいさつ', yomi: 'あいさつ', it: 'saluto; salutare', es: '毎朝[まいあさ] 近所[きんじょ]の 人[ひと]に あいさつします。', es_it: 'Ogni mattina saluto i vicini.' },
			{ jp: 'ごちそう', yomi: 'ごちそう', it: 'pasto speciale; ごちそうする: offrire da mangiare', es: '今日[きょう]は 私[わたし]が ごちそうします。', es_it: 'Oggi offro io.' },
			{ jp: '特別な', yomi: 'とくべつな', it: 'speciale, particolare', es: '今日[きょう]は 特別[とくべつ]な 日[ひ]です。', es_it: 'Oggi è un giorno speciale.' },
			{ jp: '始め', yomi: 'はじめ', it: 'inizio', es: '来月[らいげつ]の 始[はじ]めに 帰[かえ]ります。', es_it: 'Torno all’inizio del mese prossimo.' },
			{ jp: '終わり', yomi: 'おわり', it: 'fine, conclusione', es: '今月[こんげつ]の 終[お]わりに 引[ひ]っ越[こ]します。', es_it: 'Mi trasferisco alla fine di questo mese.' },
			{ jp: '飾る', yomi: 'かざる', it: 'decorare, esporre', es: 'テーブルに 花[はな]を 飾[かざ]ります。', es_it: 'Decoro il tavolo con dei fiori.' },
			{ jp: '飾り', yomi: 'かざり', it: 'decorazione, ornamento', es: 'お正月[しょうがつ]の 飾[かざ]りを 買[か]いました。', es_it: 'Ho comprato le decorazioni di Capodanno.' },
			{ jp: '週末', yomi: 'しゅうまつ', it: 'fine settimana', es: '週末[しゅうまつ]は 家[いえ]で ゆっくり します。', es_it: 'Il fine settimana me la prendo comoda a casa.' },
			{ jp: '月末', yomi: 'げつまつ', it: 'fine del mese', es: '月末[げつまつ]は 仕事[しごと]が 忙[いそが]しいです。', es_it: 'A fine mese ho molto lavoro.' },
			{ jp: '年末', yomi: 'ねんまつ', it: 'fine dell’anno', es: '年末[ねんまつ]は 国[くに]へ 帰[かえ]ります。', es_it: 'A fine anno torno nel mio Paese.' },
			{ jp: '年始', yomi: 'ねんし', it: 'inizio dell’anno', es: '年末年始[ねんまつねんし]は 休[やす]みです。', es_it: 'Tra fine e inizio anno siamo chiusi.' },
			{ jp: '親', yomi: 'おや', it: 'genitore, genitori', es: 'お正月[しょうがつ]に 親[おや]の 家[いえ]へ 行[い]きます。', es_it: 'A Capodanno vado dai miei genitori.' },
			{ jp: '忙しい', yomi: 'いそがしい', it: 'impegnato, occupato', es: '年末[ねんまつ]は とても 忙[いそが]しいです。', es_it: 'A fine anno sono molto impegnato.' },
			{ jp: '帰国', yomi: 'きこく', it: 'ritorno nel proprio Paese', es: '来月[らいげつ] 帰国[きこく]します。', es_it: 'Il mese prossimo torno nel mio Paese.' },
			{ jp: '喜ぶ', yomi: 'よろこぶ', it: 'rallegrarsi, essere felice', es: '子[こ]どもは プレゼントを 喜[よろこ]びました。', es_it: 'Il bambino è stato felice del regalo.' },
			{ jp: '準備', yomi: 'じゅんび', it: 'preparazione', es: 'お正月[しょうがつ]の 準備[じゅんび]を します。', es_it: 'Faccio i preparativi per il Capodanno.' },
			{ jp: '令和', yomi: 'れいわ', it: 'era Reiwa, iniziata nel 2019', es: '来年[らいねん]は 令和[れいわ]九年[くねん]です。', es_it: 'L’anno prossimo è il nono dell’era Reiwa.' },
			{ jp: '旧年', yomi: 'きゅうねん', it: 'l’anno passato (formale)', es: '旧年中[きゅうねんちゅう]は お世話[せわ]に なりました。', es_it: 'Grazie di tutto per l’anno passato.' },
			{ jp: '明けましておめでとうございます', yomi: 'あけましておめでとうございます', it: 'Buon anno! (da gennaio)', es: '先生[せんせい]、明[あ]けまして おめでとうございます。', es_it: 'Professore, buon anno!' },
			{ jp: '今年もよろしくお願いします', yomi: 'ことしもよろしくおねがいします', it: 'Conto su di te anche quest’anno', es: '今年[ことし]も よろしく お願[ねが]いします。', es_it: 'Conto su di te anche quest’anno.' },
			{ jp: 'よいお年を', yomi: 'よいおとしを', it: 'Buona fine d’anno! (a dicembre)', es: 'では、よいお年[とし]を。', es_it: 'Allora, buona fine d’anno!' },
			{ jp: '安心, 安心する', yomi: 'あんしん', it: 'sollievo; sentirsi tranquillo', es: '電話[でんわ]が 来[き]て 安心[あんしん]しました。', es_it: 'È arrivata la telefonata e mi sono tranquillizzato.' },
			{ jp: '寂しい', yomi: 'さみしい', it: 'sentirsi solo, triste per la solitudine (anche さびしい)', es: '友[とも]だちが 帰[かえ]って 寂[さみ]しいです。', es_it: 'I miei amici sono tornati a casa e mi sento solo.' },
			{ jp: 'うれしい', yomi: 'うれしい', it: 'felice, contento', es: '手紙[てがみ]を もらって うれしかったです。', es_it: 'Ero contento di aver ricevuto la lettera.' },
			{ jp: '悲しい', yomi: 'かなしい', it: 'triste', es: 'この 映画[えいが]は 悲[かな]しいです。', es_it: 'Questo film è triste.' },
			{ jp: '楽しい', yomi: 'たのしい', it: 'divertente, piacevole', es: 'パーティーは 楽[たの]しかったです。', es_it: 'La festa è stata divertente.' },
			{ jp: '困る', yomi: 'こまる', it: 'essere in difficoltà', es: 'お金[かね]が なくて 困[こま]りました。', es_it: 'Non avevo soldi ed ero in difficoltà.' },
			{ jp: '怖い', yomi: 'こわい', it: 'che fa paura; avere paura', es: '夜[よる]の 道[みち]は 怖[こわ]いです。', es_it: 'La strada di notte fa paura.' },
			{ jp: '心配, 心配する', yomi: 'しんぱい', it: 'preoccupazione; preoccuparsi', es: '母[はは]は いつも 心配[しんぱい]します。', es_it: 'Mia madre si preoccupa sempre.' },
			{ jp: '恥ずかしい', yomi: 'はずかしい', it: 'imbarazzato, che fa vergogna', es: 'みんなの 前[まえ]で 話[はな]すのは 恥[は]ずかしいです。', es_it: 'Parlare davanti a tutti mi imbarazza.' },
			{ jp: 'びっくりする', yomi: 'びっくりする', it: 'sorprendersi, spaventarsi', es: '大[おお]きい 音[おと]に びっくりしました。', es_it: 'Mi sono spaventato per il rumore forte.' },
			{ jp: '退屈な', yomi: 'たいくつな', it: 'noioso, monotono (mancano stimoli)', es: '毎日[まいにち] 同[おな]じで 退屈[たいくつ]です。', es_it: 'Ogni giorno è uguale, che noia.' },
			{ jp: '面倒な', yomi: 'めんどうな', it: 'seccante, che dà fastidio fare', es: '料理[りょうり]は 少[すこ]し 面倒[めんどう]です。', es_it: 'Cucinare è un po’ una seccatura.' },
			{ jp: 'つまらない', yomi: 'つまらない', it: 'noioso, poco interessante', es: 'この 本[ほん]は つまらないです。', es_it: 'Questo libro è noioso.' },
			{ jp: 'あせる', yomi: 'あせる', it: 'agitarsi, avere fretta per l’ansia', es: '時間[じかん]が なくて あせりました。', es_it: 'Non avevo tempo e mi sono agitato.' },
			{ jp: '不安, 不安になる', yomi: 'ふあん', it: 'ansia; sentirsi ansioso', es: '試験[しけん]の 前[まえ]は 不安[ふあん]に なります。', es_it: 'Prima degli esami divento ansioso.' },
			{ jp: '悩む', yomi: 'なやむ', it: 'essere indeciso, rimuginare', es: 'どちらに するか 悩[なや]んで います。', es_it: 'Sono indeciso su quale scegliere.' },
			{ jp: 'イライラする', yomi: 'いらいらする', it: 'irritarsi', es: '電車[でんしゃ]が 来[こ]なくて イライラしました。', es_it: 'Il treno non arrivava e mi sono irritato.' },
			{ jp: 'ほっとする', yomi: 'ほっとする', it: 'sentirsi sollevato', es: '試験[しけん]が 終[お]わって ほっとしました。', es_it: 'Finito l’esame, mi sono sentito sollevato.' },
			{ jp: '元気になる', yomi: 'げんきになる', it: 'tornare in forma, riprendersi', es: '薬[くすり]を 飲[の]んで 元気[げんき]に なりました。', es_it: 'Ho preso la medicina e mi sono ripreso.' }
		],
		esercizi: [
			{ prompt: '12月[じゅうにがつ]の 終[お]わりに 友[とも]だちと 別[わか]れる 時[とき]、「＿＿」と 言[い]います。', choices: ['よいお年[とし]を', '明[あ]けまして おめでとうございます', 'ごちそうさまでした', 'おかえりなさい'],
				spiega: 'よいお年を si dice PRIMA di Capodanno; 明けましておめでとうございます solo dopo.', traduzione: 'A fine dicembre, salutando un amico, si dice «Buona fine d’anno!».' },
			{ prompt: '1月[いちがつ]1日[ついたち]に 友[とも]だちに 会[あ]ったら、「＿＿」と 言[い]います。', choices: ['明[あ]けまして おめでとうございます', 'よいお年[とし]を', 'お誕生日[たんじょうび] おめでとう', 'お大事[だいじ]に'],
				spiega: 'Dal 1° gennaio: 明けましておめでとうございます, poi 今年もよろしくお願いします.', traduzione: 'Il 1° gennaio, incontrando un amico, si dice «Buon anno!».' },
			{ prompt: '12月[じゅうにがつ]31日[さんじゅういちにち]は ＿＿です。', choices: ['大[おお]みそか', '元日[がんじつ]', '三[さん]が日[にち]', '年始[ねんし]'],
				spiega: '大みそか = 31 dicembre; 元日 = 1° gennaio; 三が日 = dal 1° al 3 gennaio.', traduzione: 'Il 31 dicembre è l’ultimo giorno dell’anno.' },
			{ prompt: '1月[いちがつ]1日[ついたち]から 3日[みっか]までを ＿＿と 言[い]います。', choices: ['三[さん]が日[にち]', '大[おお]みそか', '元旦[がんたん]', '年末[ねんまつ]'],
				spiega: '三が日 = i primi tre giorni dell’anno.', traduzione: 'I giorni dal 1° al 3 gennaio si chiamano sanganichi.' },
			{ prompt: 'お正月[しょうがつ]に 神社[じんじゃ]へ ＿＿に 行[い]きます。', choices: ['初詣[はつもうで]', '年賀状[ねんがじょう]', 'お年玉[としだま]', '大[おお]そうじ'],
				spiega: '初詣 = prima visita dell’anno a un santuario o a un tempio.', traduzione: 'A Capodanno si va al santuario per la prima visita dell’anno.' },
			{ prompt: '子[こ]どもは 親[おや]や おじいさんから ＿＿を もらいます。', choices: ['お年玉[としだま]', '年賀状[ねんがじょう]', 'お雑煮[ぞうに]', '門松[かどまつ]'],
				spiega: 'お年玉 = i soldi regalati ai bambini a Capodanno.', traduzione: 'I bambini ricevono i soldi di Capodanno dai genitori e dal nonno.' },
			{ prompt: '来年[らいねん]（2027年[ねん]）は 令和[れいわ]＿＿年[ねん]です。', choices: ['九', '八', '七', '十'],
				spiega: 'Il 2019 è 令和元年, cioè l’anno 1: il 2026 è 令和8年, il 2027 è 令和9年.', traduzione: 'L’anno prossimo (2027) è il nono dell’era Reiwa.' },
			{ prompt: '今日[きょう]は 私[わたし]が ＿＿します。お金[かね]は いりませんよ。', choices: ['ごちそう', 'あいさつ', '準備[じゅんび]', '心配[しんぱい]'],
				spiega: 'ごちそうする = offrire da mangiare o da bere.', traduzione: 'Oggi offro io. Non servono soldi.' },
			{ prompt: '宿題[しゅくだい]が やっと 終[お]わって、＿＿しました。', choices: ['ほっと', 'イライラ', '心配[しんぱい]', 'がっかり'],
				spiega: 'ほっとする = sentirsi sollevato quando una cosa pesante è finita.', traduzione: 'Finalmente ho finito i compiti e mi sono sentito sollevato.' },
			{ prompt: '毎日[まいにち] 同[おな]じ ことを して、＿＿です。', choices: ['退屈[たいくつ]', 'うれしい', '恥[は]ずかしい', '不安[ふあん]'],
				spiega: '退屈 = noia per mancanza di varietà. つまらない dice piuttosto che una cosa è poco interessante.', traduzione: 'Faccio la stessa cosa ogni giorno, che noia.' },
			{ prompt: '年末[ねんまつ]は 忙[いそが]しいです。大[おお]そうじ＿＿ 買[か]い物[もの]とか、色々[いろいろ] ありますから。', choices: ['とか', 'から', 'まで', 'より'],
				spiega: 'AとかBとか = «A, B e cose così»: esempi non esaustivi.', traduzione: 'A fine anno sono impegnato. Ci sono tante cose, come le grandi pulizie e la spesa.' }
		],
		produzioneNota: 'Il 年賀状 segue uno schema: augurio, ringraziamento per l’anno passato, richiesta di continuare il rapporto, un pensiero personale, data. Le frasi modello sono esempi: nel compito scrivi le tue.',
		produzione: [
			{ consegna: 'Apri il biglietto con l’augurio di Capodanno.', pattern: '明けまして〜', risposta: '明[あ]けまして おめでとうございます。', spiega: 'Si usa solo da gennaio. Nei biglietti formali spesso si omettono 、 e 。.' },
			{ consegna: 'Ringrazia un conoscente per l’aiuto dell’anno passato (formale).', pattern: '旧年中は〜', risposta: '旧年中[きゅうねんちゅう]は 大変[たいへん] お世話[せわ]に なりました。', spiega: 'Nei biglietti si preferisce 旧年 a 去年, perché 去 evoca l’andarsene.' },
			{ consegna: 'Chiedi di continuare il rapporto anche quest’anno.', pattern: '今年も〜', risposta: '今年[ことし]も よろしく お願[ねが]いします。', spiega: 'Formula fissa. Con un amico: 今年も よろしくね。' },
			{ consegna: 'Scrivi a un amico: «Quest’anno usciamo insieme un sacco!».', pattern: '〜ましょう', risposta: '今年[ことし]は いっしょに たくさん 遊[あそ]びましょう。', spiega: 'È la parte personale: una frase tua che parli di voi due.' },
			{ consegna: 'Scrivi un augurio di salute per la famiglia di un amico.', pattern: '〜を願っています', risposta: 'ご家族[かぞく]の 健康[けんこう]と 幸[しあわ]せを 願[ねが]って います。', spiega: '願う = augurarsi. ご家族 è la famiglia dell’altro.' },
			{ consegna: 'Scrivi la data del biglietto per il Capodanno 2027.', pattern: '令和〜年 元旦', risposta: '令和[れいわ]九年[くねん] 元旦[がんたん]', spiega: '元旦 indica già il 1° gennaio: non si aggiunge 一月一日.' },
			{ consegna: 'Rispondi: «Com’è la preparazione del Capodanno?» Di’ che sei impegnato per pulizie e cucina.', pattern: '〜とか〜とか、色々ありますから', risposta: '忙[いそが]しいですよ。大[おお]そうじとか 料理[りょうり]とか、色々[いろいろ] ありますから。', spiega: 'Aggettivo + ですよ, poi la ragione con 〜とか〜とか e から.' },
			{ consegna: 'Di’ che a Capodanno mangi tanto e ti sembra divertente.', pattern: '〜は楽しいです', risposta: 'お正月[しょうがつ]は たくさん 食[た]べます。とても 楽[たの]しいです。', spiega: 'Prima cosa fai, poi cosa ne pensi: è l’obiettivo della lezione.' },
			{ consegna: 'Scrivi un 年賀状 completo a un amico.', pattern: '明けまして〜／今年も〜／令和〜年 元旦', risposta: '明[あ]けまして おめでとうございます。\n去年[きょねん]は たくさん 遊[あそ]んで、楽[たの]しかったです。\n今年[ことし]も よろしく お願[ねが]いします。\n令和[れいわ]九年[くねん] 元旦[がんたん]', spiega: 'Tra amici va bene una frase personale. In un biglietto formale al posto di 去年 si scrive 旧年中.' }
		]
	},
	netshop: {
		id: 'netshop',
		titolo: 'ネットで買い物',
		emoji: '🛒',
		descrizione: 'Comprare online: prezzi, spedizione, recensioni, funzioni e costi (〜代・〜料・〜費).',
		carte: [
			{ jp: '複雑な', yomi: 'ふくざつな', it: 'complicato, complesso', es: 'この 機能[きのう]は 少[すこ]し 複雑[ふくざつ]です。', es_it: 'Questa funzione è un po’ complicata.' },
			{ jp: '値段', yomi: 'ねだん', it: 'prezzo', es: '値段[ねだん]を 比[くら]べてから 買[か]います。', es_it: 'Compro dopo aver confrontato i prezzi.' },
			{ jp: '省エネ, 省エネルギー', yomi: 'しょうエネ', it: 'risparmio energetico, efficienza energetica', es: 'この エアコンは 省[しょう]エネです。', es_it: 'Questo condizionatore è a risparmio energetico.' },
			{ jp: 'モデル', yomi: 'モデル', it: 'modello', es: '新[あたら]しい モデルは 前[まえ]のより 軽[かる]いです。', es_it: 'Il nuovo modello è più leggero di quello di prima.' },
			{ jp: 'レビュー', yomi: 'レビュー', it: 'recensione', es: '買[か]う 前[まえ]に レビューを 読[よ]みます。', es_it: 'Prima di comprare leggo le recensioni.' },
			{ jp: '重さ', yomi: 'おもさ', it: 'peso', es: '重[おも]さは 2キロです。', es_it: 'Pesa due chili.' },
			{ jp: '送料', yomi: 'そうりょう', it: 'spese di spedizione, costo della spedizione', es: '送料[そうりょう]は 500円[えん]です。', es_it: 'La spedizione costa 500 yen.' },
			{ jp: '無料', yomi: 'むりょう', it: 'gratuito', es: '今日[きょう]は 送料[そうりょう]が 無料[むりょう]です。', es_it: 'Oggi la spedizione è gratuita.' },
			{ jp: '気に入る', yomi: 'きにいる', it: 'piacere, essere di proprio gradimento', es: 'この デザインが とても 気[き]に 入[い]りました。', es_it: 'Questo design mi è piaciuto molto.' },
			{ jp: '翌日', yomi: 'よくじつ', it: 'il giorno seguente, il giorno dopo', es: '注文[ちゅうもん]した 翌日[よくじつ]に 届[とど]きました。', es_it: 'È arrivato il giorno dopo l’ordine.' },
			{ jp: '有料', yomi: 'ゆうりょう', it: 'a pagamento', es: 'この サービスは 有料[ゆうりょう]です。', es_it: 'Questo servizio è a pagamento.' },
			{ jp: '楽な', yomi: 'らくな', it: 'comodo, facile, agevole', es: 'ネットで 買[か]うのは 楽[らく]です。', es_it: 'Comprare online è comodo.' },
			{ jp: '捨てる', yomi: 'すてる', it: 'buttare, gettare via', es: '古[ふる]い 冷蔵庫[れいぞうこ]を 捨[す]てました。', es_it: 'Ho buttato il vecchio frigorifero.' },
			{ jp: '多分', yomi: 'たぶん', it: 'forse, probabilmente', es: '多分[たぶん] 明日[あした] 届[とど]きます。', es_it: 'Probabilmente arriva domani.' },
			{ jp: 'ユーザーコメント', yomi: 'ユーザーコメント', it: 'commento dell’utente', es: 'ユーザーコメントを 読[よ]んでから 決[き]めました。', es_it: 'Ho deciso dopo aver letto i commenti degli utenti.' },
			{ jp: 'エネルギー', yomi: 'エネルギー', it: 'energia', es: 'エネルギーを むだに しないように しましょう。', es_it: 'Cerchiamo di non sprecare energia.' },
			{ jp: 'サイズ', yomi: 'サイズ', it: 'dimensione, misura, taglia', es: 'サイズが ちょうど いいです。', es_it: 'La misura è giusta.' },
			{ jp: 'おしゃれな', yomi: 'おしゃれな', it: 'elegante, alla moda, di design', es: 'おしゃれな ランプを 買[か]いました。', es_it: 'Ho comprato una lampada di design.' },
			{ jp: '税込み', yomi: 'ぜいこみ', it: 'IVA inclusa', es: '税込[ぜいこ]みで 3300円[えん]です。', es_it: 'Sono 3300 yen, IVA inclusa.' },
			{ jp: '満足する', yomi: 'まんぞくする', it: 'essere soddisfatto', es: 'この 商品[しょうひん]に とても 満足[まんぞく]して います。', es_it: 'Sono molto soddisfatto di questo prodotto.' },
			{ jp: '機能', yomi: 'きのう', it: 'funzione, funzionalità', es: 'この 炊飯器[すいはんき]は 機能[きのう]が 多[おお]いです。', es_it: 'Questo cuociriso ha molte funzioni.' },
			{ jp: '〜代', yomi: 'だい', it: 'costo di…, soldi per…', es: '今月[こんげつ]は 電気代[でんきだい]が 高[たか]かったです。', es_it: 'Questo mese la bolletta della luce è stata cara.' },
			{ jp: '〜料', yomi: 'りょう', it: 'tariffa, quota per un servizio', es: '入場料[にゅうじょうりょう]は 千円[せんえん]です。', es_it: 'L’ingresso costa mille yen.' },
			{ jp: '料金', yomi: 'りょうきん', it: 'tariffa, costo di un servizio', es: '電話[でんわ]の 料金[りょうきん]を 払[はら]いました。', es_it: 'Ho pagato la bolletta del telefono.' },
			{ jp: '〜費', yomi: 'ひ', it: 'spesa, costo per…', es: '交通費[こうつうひ]は 会社[かいしゃ]が 払[はら]います。', es_it: 'Le spese di trasporto le paga l’azienda.' },
			{ jp: '費用', yomi: 'ひよう', it: 'costo, spese necessarie', es: '修理[しゅうり]の 費用[ひよう]は いくらですか。', es_it: 'Quanto costa la riparazione?' }
		],
		// Funzioni del capitolo: gratis/a pagamento, i tre suffissi di costo
		// (〜代 consumi e cose, 〜料 tariffe di servizi, 〜費 categorie di spesa),
		// 気に入る vs 満足する (particella), 税込み.
		esercizi: [
			{ prompt: '駐車場[ちゅうしゃじょう]は ＿＿ ですから、お金[かね]は いりません。', choices: ['無料[むりょう]', '有料[ゆうりょう]', '送料[そうりょう]', '税込[ぜいこ]み'],
				spiega: '無料 = gratuito; 有料 = a pagamento.', traduzione: 'Il parcheggio è gratuito, quindi non servono soldi.' },
			{ prompt: '今月[こんげつ]は 電気[でんき]＿＿が 高[たか]かったです。', choices: ['代[だい]', '料[りょう]', '費[ひ]', '値段[ねだん]'],
				spiega: '電気代: 〜代 per consumi e bollette (電気代・ガス代) e per il costo di una cosa (タクシー代・本代).', traduzione: 'Questo mese la bolletta della luce è stata cara.' },
			{ prompt: '美術館[びじゅつかん]の 入場[にゅうじょう]＿＿は 千円[せんえん]です。', choices: ['料[りょう]', '代[だい]', '費[ひ]', '金[きん]'],
				spiega: '入場料: 〜料 = tariffa per usare un servizio (入場料・授業料・送料).', traduzione: 'L’ingresso al museo costa mille yen.' },
			{ prompt: '会社[かいしゃ]が 交通[こうつう]＿＿を 払[はら]って くれます。', choices: ['費[ひ]', '料[りょう]', '代[だい]', '値段[ねだん]'],
				spiega: '交通費: 〜費 = una categoria di spesa (交通費・食費・生活費).', traduzione: 'L’azienda mi paga le spese di trasporto.' },
			{ prompt: 'この ソファ＿＿ とても 満足[まんぞく]して います。', choices: ['に', 'が', 'を', 'で'],
				spiega: 'Xに 満足する = essere soddisfatto di X. Invece: Xが 気に入る = X mi piace.', traduzione: 'Sono molto soddisfatto di questo divano.' },
			{ prompt: '値段[ねだん]は ＿＿で 3300円[えん]です。', choices: ['税込[ぜいこ]み', '無料[むりょう]', '送料[そうりょう]', '有料[ゆうりょう]'],
				spiega: '税込み = tasse incluse (contrario: 税抜き, tasse escluse).', traduzione: 'Il prezzo è di 3300 yen, IVA inclusa.' }
		]
	}
};

// Carta del mazzo → chiavi per la parola di catalogo: scrittura (prima
// variante di «省エネ, 省エネルギー», 〜 dei suffissi, anche senza な finale:
// 快適な → 快適), poi lettura (おしゃれな → お洒落).
export function cardCatalogKeys(c: MazzoCard): { writings: string[]; readings: string[] } {
	const jp = c.jp.split(/[,、]/)[0]!.trim().replace(/^～/, '〜');
	const yomi = c.yomi.replace(/^～/, '〜');
	return { writings: [jp, jp.replace(/な$/, '')], readings: [yomi, yomi.replace(/な$/, '')] };
}

export function findMazzo(id: string): Mazzo | null {
	return MAZZI[id] ?? null;
}
export const allMazzi = (): Mazzo[] => Object.values(MAZZI);

// Mazzi AUTO: definiti da un filtro sul catalogo (non liste fisse). Solo mini-test
// (il quiz genera i tipi di domanda). `tipo` = prefisso di tipo_jp; `livello` e
// `tag` (in study_tags) opzionali. kind 'grammar' pesca dai punti grammaticali.
export interface AutoMazzo {
	id: string;
	titolo: string;
	emoji: string;
	descrizione: string;
	kind: 'word' | 'grammar';
	tipo?: string;
	livello?: string;
	tag?: string;
	gruppo?: string; // grammatica per funzione (chiave in grammar-gruppi.json)
	tutto?: boolean; // parole + kanji + grammatica del livello, prima ciò che manca
}

export const AUTO_MAZZI: AutoMazzo[] = [
	{ id: 'tutto-n4', titolo: 'N4 (tutto)', emoji: '🎯', descrizione: 'Parole, kanji e grammatica N4: prima ciò che non hai ancora padroneggiato.', kind: 'word', livello: 'N4', tutto: true },
	{ id: 'tutto-n5', titolo: 'N5 (tutto)', emoji: '🌱', descrizione: 'Parole, kanji e grammatica N5: prima ciò che non hai ancora padroneggiato.', kind: 'word', livello: 'N5', tutto: true },
	{ id: 'nomi-n5', titolo: '名詞 N5 (nomi)', emoji: '📦', descrizione: 'Nomi di livello N5.', kind: 'word', tipo: '名詞', livello: 'N5' },
	{ id: 'nomi-n4', titolo: '名詞 N4 (nomi)', emoji: '📦', descrizione: 'Nomi di livello N4.', kind: 'word', tipo: '名詞', livello: 'N4' },
	{ id: 'verbi-n5', titolo: '動詞 N5 (verbi)', emoji: '🏃', descrizione: 'Verbi di livello N5.', kind: 'word', tipo: '動詞', livello: 'N5' },
	{ id: 'verbi-n4', titolo: '動詞 N4 (verbi)', emoji: '🏃', descrizione: 'Verbi di livello N4.', kind: 'word', tipo: '動詞', livello: 'N4' },
	{ id: 'agg-n5', titolo: '形容詞 N5 (aggettivi)', emoji: '🎨', descrizione: 'Aggettivi い/な di livello N5.', kind: 'word', tipo: '形容詞', livello: 'N5' },
	{ id: 'agg-n4', titolo: '形容詞 N4 (aggettivi)', emoji: '🎨', descrizione: 'Aggettivi い/な di livello N4.', kind: 'word', tipo: '形容詞', livello: 'N4' },
	{ id: 'avverbi-n5', titolo: '副詞 N5 (avverbi)', emoji: '⚡', descrizione: 'Avverbi di livello N5.', kind: 'word', tipo: '副詞', livello: 'N5' },
	{ id: 'avverbi-n4', titolo: '副詞 N4 (avverbi)', emoji: '⚡', descrizione: 'Avverbi di livello N4.', kind: 'word', tipo: '副詞', livello: 'N4' },
	{ id: 'avverbi', titolo: '副詞 (avverbi)', emoji: '⚡', descrizione: 'Avverbi (tutti i livelli).', kind: 'word', tipo: '副詞' },
	{ id: 'connettori', titolo: '接続詞 (connettori)', emoji: '🔗', descrizione: 'Connettivi: でも, だから, それから…', kind: 'word', tipo: '接続詞' },
	{ id: 'modidire', titolo: '慣用表現 (modi di dire)', emoji: '💬', descrizione: 'Espressioni idiomatiche.', kind: 'word', tipo: '慣用表現' },
	{ id: 'contatori', titolo: '助数詞 (contatori)', emoji: '🔢', descrizione: 'Classificatori numerali.', kind: 'word', tipo: '助数詞' },
	{ id: 'suru-n4', titolo: 'する動詞 N4', emoji: '⚙️', descrizione: 'Verbi in する di livello N4.', kind: 'word', livello: 'N4', tag: 'suru-verb' },
	{ id: 'gram-n5', titolo: '文法 N5 (tutta)', emoji: '📖', descrizione: 'Tutti i punti grammaticali N5.', kind: 'grammar', livello: 'N5' },
	{ id: 'gram-n4', titolo: '文法 N4 (tutta)', emoji: '📖', descrizione: 'Tutti i punti grammaticali N4.', kind: 'grammar', livello: 'N4' },
	// Grammatica per FUNZIONE (gruppo in grammar-gruppi.json)
	{ id: 'g-forme-verbo', titolo: '動詞の形', emoji: '🔧', descrizione: 'Possibile, volitiva, imperativo, proibitivo, causativo, passivo.', kind: 'grammar', gruppo: 'forme-verbo' },
	{ id: 'g-condizionali', titolo: '条件 (と・ば・たら・なら)', emoji: '🔀', descrizione: 'Condizionali e ipotesi.', kind: 'grammar', gruppo: 'condizionali' },
	{ id: 'g-juju', titolo: '授受 (あげる・くれる・もらう)', emoji: '🎁', descrizione: 'Dare e ricevere, anche 〜て.', kind: 'grammar', gruppo: 'juju' },
	{ id: 'g-passivo-causativo', titolo: '受身・使役', emoji: '🔄', descrizione: 'Passivo, causativo, causativo-passivo.', kind: 'grammar', gruppo: 'passivo-causativo' },
	{ id: 'g-keigo', titolo: '敬語 (尊敬・謙譲)', emoji: '🙇', descrizione: 'Linguaggio cortese.', kind: 'grammar', gruppo: 'keigo' },
	{ id: 'g-supposizione', titolo: '推量・様態・伝聞', emoji: '🔮', descrizione: 'そう/よう/みたい/らしい/はず/でしょう…', kind: 'grammar', gruppo: 'supposizione' },
	{ id: 'g-ausiliari-te', titolo: '〜て + 補助動詞', emoji: '🧩', descrizione: 'ている/ておく/てしまう/てみる/てくる…', kind: 'grammar', gruppo: 'ausiliari-te' },
	{ id: 'g-dovere-permesso', titolo: '義務・許可・禁止', emoji: '✅', descrizione: 'なければ/てもいい/てはいけない…', kind: 'grammar', gruppo: 'dovere-permesso' },
	{ id: 'g-comparazione', titolo: '比較・程度', emoji: '⚖️', descrizione: 'より/ほうがいい/すぎる/たい…', kind: 'grammar', gruppo: 'comparazione-grado' },
	{ id: 'g-tempo', titolo: '時・順序', emoji: '⏱️', descrizione: 'てから/まえに/ながら/とき/予定…', kind: 'grammar', gruppo: 'tempo-ordine' },
	{ id: 'g-nominalizzazione', titolo: '名詞化・修飾', emoji: '🔖', descrizione: 'こと/の/ために/ように/ところ…', kind: 'grammar', gruppo: 'nominalizzazione' },
	{ id: 'g-connessione', titolo: '接続・理由・逆接', emoji: '🔗', descrizione: 'から/ので/のに/ても/し…', kind: 'grammar', gruppo: 'connessione' },
	{ id: 'g-citazione', titolo: '引用・疑問', emoji: '💭', descrizione: 'と思う/と言う/か/かどうか…', kind: 'grammar', gruppo: 'citazione' },
	{ id: 'g-inviti', titolo: '誘い・依頼', emoji: '🙋', descrizione: 'ましょう/ませんか/てください…', kind: 'grammar', gruppo: 'inviti' },
	{ id: 'g-particelle', titolo: '助詞 (particelle)', emoji: '🔸', descrizione: 'は・が・を・に・へ・で・も…', kind: 'grammar', gruppo: 'particelle' },
	{ id: 'g-base', titolo: '基礎 (です・形容詞…)', emoji: '🧱', descrizione: 'Copula, aggettivi, 〜になる…', kind: 'grammar', gruppo: 'base' }
];

// Dose di un mazzo «tutto»: le voci meno padroneggiate di ogni area, a pari merito
// a caso, in proporzione 3 parole : 1 kanji : 1 grammatica. Se un'area è esaurita
// (già tutta ≥ 60), il posto passa alle altre.
export function pickTuttoLivello(
	areas: { kind: 'word' | 'kanji' | 'grammar'; ids: string[] }[],
	mastery: (key: string) => number,
	limit: number
): { kind: string; raw: string }[] {
	const QUOTA: Record<string, number> = { word: 3, kanji: 1, grammar: 1 };
	const code = areas.map((a) => ({
		kind: a.kind,
		todo: a.ids
			.map((id) => ({ id, m: mastery(`${a.kind}:${id}`), r: Math.random() }))
			.filter((x) => x.m < 60)
			.sort((x, y) => x.m - y.m || x.r - y.r)
	}));
	const out: { kind: string; raw: string }[] = [];
	while (out.length < limit && code.some((c) => c.todo.length > 0)) {
		for (const c of code) {
			for (let i = 0; i < QUOTA[c.kind]! && c.todo.length > 0 && out.length < limit; i += 1) {
				out.push({ kind: c.kind, raw: c.todo.shift()!.id });
			}
		}
	}
	// mescola: niente blocchi di sole parole
	for (let i = out.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}

export function findAutoMazzo(id: string): AutoMazzo | null {
	return AUTO_MAZZI.find((m) => m.id === id) ?? null;
}
