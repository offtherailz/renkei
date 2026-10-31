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
