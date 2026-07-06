// Schede delle forme grammaticali collegate ai badge (JpBadge).
// Ogni scheda spiega la forma, le regole d'uso (es. な/の) e mostra esempi.

export interface GrammarFormExample {
	jp: string; // notazione furigana base[lettura]
	it: string;
}

// Coppia contrazione ↔ forma intera, mostrata con badge "contrazione di…".
export interface GrammarContraction {
	short: string; // forma contratta (colloquiale)
	full: string; // forma intera (scritto/esame)
	note?: string;
}

export interface GrammarForm {
	slug: string;
	label: string; // con furigana, come appare nei badge
	icon: string;
	title: string;
	summary: string;
	explanation: string[];
	examples: GrammarFormExample[];
	related: string[];
	// Solo per la scheda delle contrazioni: mappa contratta → forma intera.
	contractions?: GrammarContraction[];
	// id di una voce grammar del seed per lanciare un drill Consolida mirato.
	consolidaId?: string;
}

export const GRAMMAR_FORMS: GrammarForm[] = [
	{
		slug: 'meishi',
		label: '名詞[めいし]',
		icon: '📦',
		title: 'Sostantivo',
		summary: 'Indica persone, cose, luoghi o concetti. Non si coniuga mai.',
		explanation: [
			'Il sostantivo è un blocco fisso: non cambia forma per tempo o negazione. Per farne un predicato si usa です (cortese) o だ (piano): 学生です = "sono uno studente".',
			'Regola del の: per collegare due nomi si mette の tra di loro. Il primo nome descrive il secondo: 犬の名前 = "il nome del cane", 日本語の先生 = "insegnante di giapponese".',
			'La negazione del predicato nominale è じゃありません / じゃない: 学生じゃありません = "non sono uno studente".'
		],
		examples: [
			{ jp: '犬[いぬ]の名前[なまえ]はポチです。', it: 'Il nome del cane è Pochi.' },
			{ jp: '私[わたし]は学生[がくせい]です。', it: 'Io sono uno studente.' }
		],
		related: ['joshi', 'na-keiyoushi']
	},
	{
		slug: 'doushi',
		label: '動詞[どうし]',
		icon: '🏃',
		title: 'Verbo',
		summary: 'Esprime azione, stato o esistenza. Va in fondo alla frase.',
		explanation: [
			'In giapponese il verbo chiude la frase: 水を飲む = "bevo acqua" (lett. "acqua-OGG bere").',
			'Si coniuga per tempo (passato/non passato), cortesia (piano/ます) e polarità (affermativo/negativo), ma non per persona: 飲む vale per io/tu/lui…',
			'I verbi si dividono in tre classi di coniugazione (godan 5️⃣, ichidan 1️⃣, irregolari *️⃣) e in transitivi 👉 / intransitivi 🤖.'
		],
		examples: [
			{ jp: '水[みず]を飲[の]みます。', it: 'Bevo acqua.' },
			{ jp: '毎日[まいにち]勉強[べんきょう]する。', it: 'Studio ogni giorno.' }
		],
		related: ['godan', 'ichidan', 'fukisoku', 'tadoushi', 'jidoushi']
	},
	{
		slug: 'keiyoushi',
		label: '形容詞[けいようし]',
		icon: '🎨',
		title: 'Aggettivo',
		summary: 'Descrive qualità e caratteristiche. Due famiglie: in -い e in -な.',
		explanation: [
			'Gli aggettivi giapponesi sono di due tipi, con regole diverse: quelli in -い (🔴) si coniugano da soli come piccoli verbi; quelli in -な (🧩) si comportano come nomi e hanno bisogno di な per legarsi a un sostantivo.',
			'Entrambi possono stare prima del nome (funzione attributiva) o a fine frase come predicato.'
		],
		examples: [
			{ jp: '高[たか]い山[やま]', it: 'Una montagna alta (aggettivo in -い).' },
			{ jp: '静[しず]かな部屋[へや]', it: 'Una stanza silenziosa (aggettivo in -な).' }
		],
		related: ['i-keiyoushi', 'na-keiyoushi']
	},
	{
		slug: 'fukushi',
		label: '副詞[ふくし]',
		icon: '🔀',
		title: 'Avverbio',
		summary: 'Modifica un verbo o un aggettivo: come, quanto, quando.',
		explanation: [
			'L\'avverbio precede di solito la parola che modifica: とても高い = "molto alto", よく食べる = "mangiare spesso/molto".',
			'Non si coniuga. Molti avverbi derivano da aggettivi: 早い → 早く (presto/velocemente), 静か → 静かに (silenziosamente).'
		],
		examples: [
			{ jp: 'とても高[たか]いです。', it: 'È molto alto.' },
			{ jp: 'ときどき映画[えいが]を見[み]ます。', it: 'Ogni tanto guardo un film.' }
		],
		related: ['keiyoushi', 'doushi']
	},
	{
		slug: 'joshi',
		label: '助詞[じょし]',
		icon: '🪝',
		title: 'Particella',
		summary: 'Piccole parole che agganciano i blocchi della frase e ne definiscono il ruolo.',
		explanation: [
			'Le particelle seguono la parola a cui si riferiscono e ne dichiarano la funzione: は tema della frase, が soggetto, を complemento oggetto, に destinazione/tempo/luogo di esistenza, で luogo dell\'azione o mezzo, へ direzione, と "e/con", の possesso/collegamento, か domanda.',
			'Regola pratica: cambiare particella cambia il significato della frase, non l\'ordine delle parole. 学校に行く = "vado a scuola" vs 学校で勉強する = "studio a scuola".'
		],
		examples: [
			{ jp: '私[わたし]は日本[にほん]に行[い]きます。', it: 'Io vado in Giappone.' },
			{ jp: '図書館[としょかん]で本[ほん]を読[よ]みます。', it: 'Leggo un libro in biblioteca.' }
		],
		related: ['meishi']
	},
	{
		slug: 'josuushi',
		label: '助数詞[じょすうし]',
		icon: '🔢',
		title: 'Contatore',
		summary: 'Suffisso che accompagna i numeri quando si contano oggetti o persone.',
		explanation: [
			'In giapponese non si conta mai "nudo": al numero si attacca un contatore che dipende da cosa si conta: 人 per le persone (三人 = tre persone), 本 per oggetti lunghi, 枚 per oggetti piatti, 匹 per piccoli animali.',
			'Struttura tipica: nome + particella + numero-contatore + verbo: 犬が二匹います = "ci sono due cani".'
		],
		examples: [
			{ jp: '学生[がくせい]が三人[さんにん]います。', it: 'Ci sono tre studenti.' },
			{ jp: 'ビールを二本[にほん]ください。', it: 'Due birre, per favore.' }
		],
		related: ['meishi']
	},
	{
		slug: 'kanyouhyougen',
		label: '慣用表現[かんようひょうげん]',
		icon: '💬',
		title: 'Espressione idiomatica',
		summary: 'Frase fissa il cui significato non è la somma delle parole.',
		explanation: [
			'Va imparata come un blocco unico: お腹が空いた letteralmente è "la pancia si è svuotata", ma significa "ho fame".',
			'Molti saluti e formule di cortesia sono espressioni idiomatiche: よろしくお願いします non ha una traduzione letterale utile.'
		],
		examples: [
			{ jp: 'お腹[なか]が空[す]きました。', it: 'Ho fame.' },
			{ jp: '気[き]をつけて。', it: 'Stai attento / Buon viaggio.' }
		],
		related: []
	},
	{
		slug: 'godan',
		label: '五段動詞[ごだんどうし]',
		icon: '5️⃣',
		title: 'Verbo godan',
		summary: 'La radice "scorre" sulle cinque vocali durante la coniugazione.',
		explanation: [
			'È la classe più numerosa. L\'ultima sillaba cambia vocale a seconda della forma: 飲む → 飲みます (i), 飲まない (a), 飲めば (e), 飲もう (o).',
			'Attenzione ai falsi amici: alcuni verbi in -る sono godan e non ichidan: 帰る (kaeru), 入る (hairu), 要る (iru), 走る (hashiru). Es: 帰る → 帰ります (non ×帰ます).'
		],
		examples: [
			{ jp: '水[みず]を飲[の]む → 飲[の]みます', it: 'bere → forma cortese' },
			{ jp: '家[いえ]に帰[かえ]る → 帰[かえ]ります', it: 'tornare a casa → forma cortese (godan!)' }
		],
		related: ['ichidan', 'fukisoku', 'doushi']
	},
	{
		slug: 'ichidan',
		label: '一段動詞[いちだんどうし]',
		icon: '1️⃣',
		title: 'Verbo ichidan',
		summary: 'Coniugazione regolare: togli る e attacca la desinenza.',
		explanation: [
			'Terminano in -いる o -える. La coniugazione è la più semplice: 食べる → 食べます, 食べない, 食べれば. La radice non cambia mai.',
			'Non tutti i verbi in -いる/-える sono ichidan: vedi le eccezioni godan (帰る, 入る, 要る…).'
		],
		examples: [
			{ jp: 'ご飯[はん]を食[た]べる → 食[た]べます', it: 'mangiare → forma cortese' },
			{ jp: 'テレビを見[み]る → 見[み]ます', it: 'guardare → forma cortese' }
		],
		related: ['godan', 'fukisoku', 'doushi']
	},
	{
		slug: 'fukisoku',
		label: '不規則動詞[ふきそくどうし]',
		icon: '*️⃣',
		title: 'Verbo irregolare',
		summary: 'Solo due: する (fare) e 来る (venire), più i composti in する.',
		explanation: [
			'する: します, しない, して. 来る (くる): 来ます (きます), 来ない (こない), 来て (きて) — la lettura della radice cambia!',
			'Tantissimi verbi sono "nome + する": 勉強する (studiare), 電話する (telefonare). Si coniugano come する.'
		],
		examples: [
			{ jp: '宿題[しゅくだい]をする → します', it: 'fare i compiti → forma cortese' },
			{ jp: '友達[ともだち]が来[く]る → 来[き]ます', it: 'viene un amico → forma cortese' }
		],
		related: ['godan', 'ichidan', 'doushi']
	},
	{
		slug: 'tadoushi',
		label: '他動詞[たどうし]',
		icon: '👉',
		title: 'Verbo transitivo',
		summary: 'L\'azione è diretta verso un oggetto, marcato con を.',
		explanation: [
			'Qualcuno fa qualcosa a qualcosa: ドアを開ける = "(io) apro la porta". L\'oggetto prende を.',
			'Molti verbi vivono in coppia transitivo/intransitivo: 開ける/開く, 閉める/閉まる, 始める/始まる. Il transitivo racconta chi agisce, l\'intransitivo racconta cosa succede.'
		],
		examples: [
			{ jp: '私[わたし]がドアを開[あ]けます。', it: 'Io apro la porta. (azione mia)' },
			{ jp: '電気[でんき]を消[け]します。', it: 'Spengo la luce.' }
		],
		related: ['jidoushi', 'doushi']
	},
	{
		slug: 'jidoushi',
		label: '自動詞[じどうし]',
		icon: '🤖',
		title: 'Verbo intransitivo',
		summary: 'L\'azione avviene da sé: il soggetto prende が, niente を.',
		explanation: [
			'Descrive un evento che accade senza un agente esplicito: ドアが開く = "la porta si apre". Il soggetto prende が.',
			'Confronta con la coppia transitiva: ドアを開ける (io la apro) vs ドアが開く (si apre da sola). Sbagliare particella con questi verbi è l\'errore più comune.'
		],
		examples: [
			{ jp: 'ドアが開[あ]きます。', it: 'La porta si apre.' },
			{ jp: '電気[でんき]が消[き]えました。', it: 'La luce si è spenta.' }
		],
		related: ['tadoushi', 'doushi']
	},
	{
		slug: 'i-keiyoushi',
		label: 'い形容詞[いけいようし]',
		icon: 'い',
		title: 'Aggettivo in -い',
		summary: 'Si coniuga da solo, quasi come un verbo.',
		explanation: [
			'Davanti al nome si attacca direttamente, senza niente in mezzo: 高い山 = "montagna alta".',
			'Si coniuga cambiando la coda -い: 高い → 高くない (negativo) → 高かった (passato) → 高くなかった (passato negativo).',
			'いい (buono) è irregolare: usa la radice よ-: よくない, よかった.'
		],
		examples: [
			{ jp: 'この山[やま]は高[たか]いです。', it: 'Questa montagna è alta.' },
			{ jp: '昨日[きのう]は寒[さむ]かったです。', it: 'Ieri faceva freddo.' }
		],
		related: ['na-keiyoushi', 'keiyoushi']
	},
	{
		slug: 'na-keiyoushi',
		label: 'な形容詞[なけいようし]',
		icon: 'な',
		title: 'Aggettivo in -な',
		summary: 'Per legarsi a un nome ha bisogno del "pezzo" な.',
		explanation: [
			'Regola del な: davanti a un nome serve な: 静かな部屋 = "stanza silenziosa" (×静か部屋 è sbagliato).',
			'Come predicato si comporta come un nome: 部屋は静かです, negativo 静かじゃない, passato 静かでした.',
			'Alcune parole sembrano aggettivi in -い ma sono in -な: きれい (bello/pulito) → きれいな花, 有名 (famoso) → 有名な人.'
		],
		examples: [
			{ jp: '静[しず]かな部屋[へや]ですね。', it: 'Che stanza silenziosa.' },
			{ jp: 'この町[まち]は有名[ゆうめい]です。', it: 'Questa città è famosa.' }
		],
		related: ['i-keiyoushi', 'keiyoushi', 'meishi']
	},
	{
		slug: 'juju',
		label: '授受[じゅじゅ]',
		icon: '🎁',
		title: 'Dare e ricevere (あげる・くれる・もらう)',
		summary: 'Chi dà a chi: la scelta del verbo dipende dalla direzione del favore.',
		explanation: [
			'あげる = io/qualcuno DÀ a qualcun altro (verso l\'esterno): 私は友達にプレゼントをあげた.',
			'くれる = qualcun altro DÀ a ME (verso di me/mio gruppo): 友達が私にプレゼントをくれた.',
			'もらう = io RICEVO da qualcuno: 私は友達にプレゼントをもらった (chi dà prende に/から).',
			'Con la forma て diventano favori: 〜てあげる (faccio un favore), 〜てくれる (mi fanno un favore), 〜てもらう (mi faccio fare qualcosa).'
		],
		examples: [
			{ jp: '母[はは]が本[ほん]を買[か]ってくれた。', it: 'Mia madre mi ha comprato un libro (per me).' },
			{ jp: '先生[せんせい]に日本語[にほんご]を教[おし]えてもらった。', it: 'Mi sono fatto insegnare il giapponese dal maestro.' }
		],
		related: ['doushi']
	},
	{
		slug: 'contrazioni',
		label: '縮約形[しゅくやくけい]',
		icon: '✂️',
		title: 'Forme contratte (parlato)',
		summary: 'Nel parlato molte forme si accorciano. Riconoscere la forma intera dietro la contrazione.',
		explanation: [
			'〜てしまう → 〜ちゃう / 〜でしまう → 〜じゃう: 食べてしまう → 食べちゃう ("finire per…", con sfumatura di rammarico/completamento).',
			'〜なければ → 〜なきゃ / 〜なくては → 〜なくちゃ: 行かなければならない → 行かなきゃ ("devo andare").',
			'〜ておく → 〜とく: 買っておく → 買っとく ("fare in anticipo").',
			'〜ている → 〜てる, 〜ていく → 〜てく, 〜という → 〜って: 食べている → 食べてる.',
			'Regola pratica: la contrazione è solo colloquiale — negli scritti/esame torna alla forma intera.'
		],
		examples: [
			{ jp: '宿題[しゅくだい]をやっちゃった。', it: 'Ho finito i compiti (= やってしまった).' },
			{ jp: 'もう行[い]かなきゃ。', it: 'Devo andare ormai (= 行かなければならない).' }
		],
		related: ['te-shimau', 'te-oku', 'te-iru'],
		contractions: [
			{ short: '〜ちゃう / 〜じゃう', full: '〜てしまう / 〜でしまう', note: 'completamento o rammarico' },
			{ short: '〜なきゃ', full: '〜なければ(ならない)', note: 'dovere / obbligo' },
			{ short: '〜なくちゃ', full: '〜なくては(いけない)', note: 'dovere / obbligo' },
			{ short: '〜とく', full: '〜ておく', note: 'fare in anticipo' },
			{ short: '〜てる', full: '〜ている', note: 'azione in corso / stato' },
			{ short: '〜てく', full: '〜ていく', note: 'andare a fare / continuare' },
			{ short: '〜って', full: '〜という', note: 'citazione / "chiamato"' }
		]
	},
	{
		slug: 'to-omou',
		label: '〜と思[おも]う',
		icon: '💭',
		title: 'Forma composta: 〜と思う',
		summary: 'Esprimere una propria opinione o supposizione: "penso che…".',
		explanation: [
			'Si attacca la forma piana (辞書形/ない形/passato) + と思う: 明日は雨だと思う = "penso che domani pioverà".',
			'Con un nome o un な-aggettivo serve だ prima di と: 便利だと思う = "penso sia comodo"; 学生だと思う = "penso sia uno studente".',
			'Per un\'intenzione si usa la forma volitiva + と思う: 行こうと思う = "penso di andarci" (vedi 意向形).'
		],
		examples: [
			{ jp: 'この本[ほん]は面白[おもしろ]いと思[おも]います。', it: 'Penso che questo libro sia interessante.' },
			{ jp: '明日[あした]は晴[は]れると思[おも]う。', it: 'Penso che domani sarà sereno.' }
		],
		related: ['doushi', 'you-volitiva'],
		consolidaId: 'grammar-api-N4-56'
	},
	{
		slug: 'te-miru',
		label: '〜てみる',
		icon: '🧪',
		title: 'Forma composta: 〜てみる',
		summary: 'Provare a fare qualcosa per vedere com\'è: "provare a…".',
		explanation: [
			'Forma て del verbo + みる (da 見る, ma qui in hiragana): 食べてみる = "provo a mangiare (per vedere che gusto ha)".',
			'みる si coniuga come un normale verbo ichidan: 食べてみます, 食べてみた, 食べてみたい.',
			'Sfumatura: si tenta qualcosa senza sapere il risultato. 着てみる = "provo a indossarlo".'
		],
		examples: [
			{ jp: '新[あたら]しいレストランに行[い]ってみます。', it: 'Provo ad andare al ristorante nuovo.' },
			{ jp: 'この服[ふく]を着[き]てみてもいいですか。', it: 'Posso provare a indossare questo vestito?' }
		],
		related: ['doushi'],
		consolidaId: 'grammar-api-N4-65'
	},
	{
		slug: 'te-oku',
		label: '〜ておく',
		icon: '📦',
		title: 'Forma composta: 〜ておく',
		summary: 'Fare qualcosa in anticipo, in preparazione: "fare per prepararsi".',
		explanation: [
			'Forma て + おく (da 置く): 予約しておく = "prenoto in anticipo (e lascio pronto)".',
			'Indica un\'azione fatta prima, di proposito, per essere pronti dopo: 買っておく = "compro in anticipo".',
			'Nel parlato si contrae in 〜とく: 買っておく → 買っとく (vedi 縮約形).'
		],
		examples: [
			{ jp: '旅行[りょこう]の前[まえ]にホテルを予約[よやく]しておきます。', it: 'Prima del viaggio prenoto l\'hotel (in anticipo).' },
			{ jp: 'ビールを冷[ひ]やしておいた。', it: 'Ho messo la birra a rinfrescare (in anticipo).' }
		],
		related: ['doushi', 'contrazioni'],
		consolidaId: 'grammar-api-N4-20'
	},
	{
		slug: 'te-shimau',
		label: '〜てしまう',
		icon: '💥',
		title: 'Forma composta: 〜てしまう',
		summary: 'Completare un\'azione, spesso con rammarico: "finire per…".',
		explanation: [
			'Forma て + しまう: 全部[ぜんぶ]食べてしまった = "ho finito per mangiare tutto".',
			'Due sfumature: completamento ("l\'ho fatto del tutto") oppure rammarico/involontarietà ("ahimè, è successo").',
			'Nel parlato si contrae in 〜ちゃう / 〜じゃう: 食べてしまう → 食べちゃう (vedi 縮約形).'
		],
		examples: [
			{ jp: '財布[さいふ]を忘[わす]れてしまった。', it: 'Ho dimenticato il portafoglio (purtroppo).' },
			{ jp: '宿題[しゅくだい]をやってしまいました。', it: 'Ho finito (completamente) i compiti.' }
		],
		related: ['doushi', 'contrazioni'],
		consolidaId: 'grammar-api-N4-21'
	},
	{
		slug: 'te-iru',
		label: '〜ている',
		icon: '🔄',
		title: 'Forma composta: 〜ている',
		summary: 'Azione in corso o stato risultante: "sto facendo / è in uno stato".',
		explanation: [
			'Forma て + いる: 食べている = "sto mangiando". Con alcuni verbi indica lo stato: 結婚している = "sono sposato", 知っている = "lo so".',
			'いる si coniuga come ichidan: 食べています, 食べていた, 食べていない.',
			'Nel parlato la い cade: 食べている → 食べてる (vedi 縮約形).'
		],
		examples: [
			{ jp: '今[いま]、音楽[おんがく]を聞[き]いています。', it: 'Adesso sto ascoltando musica.' },
			{ jp: '兄[あに]は東京[とうきょう]に住[す]んでいます。', it: 'Mio fratello vive a Tokyo.' }
		],
		related: ['doushi', 'contrazioni'],
		consolidaId: 'grammar-api-N5-66'
	},
	{
		slug: 'sou-apparenza',
		label: '〜そう',
		icon: '👀',
		title: 'Forma composta: 〜そう (apparenza)',
		summary: 'Come appare qualcosa a prima vista: "sembra…".',
		explanation: [
			'Radice del verbo/aggettivo + そう per dire l\'impressione a occhio: おいしそう = "sembra buono", 雨[あめ]が降[ふ]りそう = "sembra che stia per piovere".',
			'Con gli い-aggettivi cade la -い: 高い → 高そう. Con い-aggettivo いい l\'eccezione è よさそう.',
			'Attenzione: 〜そうだ come "sentito dire" (dopo forma piana, 雨だそうだ = "dicono che piove") è un uso diverso da questo.'
		],
		examples: [
			{ jp: 'このケーキはおいしそうです。', it: 'Questa torta sembra buona.' },
			{ jp: '空[そら]を見[み]ると、雨[あめ]が降[ふ]りそうだ。', it: 'A guardare il cielo, sembra che pioverà.' }
		],
		related: ['keiyoushi', 'doushi'],
		consolidaId: 'grammar-api-N4-54'
	},
	{
		slug: 'you-volitiva',
		label: '意向形[いこうけい] 〜よう',
		icon: '🙌',
		title: 'Forma volitiva: 〜よう / 〜おう',
		summary: 'Proporre o esprimere l\'intenzione di fare qualcosa: "facciamo… / proviamo a…".',
		explanation: [
			'È la versione piana di 〜ましょう. Ichidan: togli る + よう (食べる → 食べよう). Godan: cambia -u in -ō (行く → 行こう, 飲む → 飲もう). する → しよう, 来る → 来よう.',
			'Da sola propone o incita: 行こう! = "andiamo!".',
			'Con 〜と思う esprime un proposito personale: 日本語[にほんご]を勉強[べんきょう]しようと思う = "penso di mettermi a studiare giapponese".'
		],
		examples: [
			{ jp: '一緒[いっしょ]に帰[かえ]ろう。', it: 'Torniamo insieme.' },
			{ jp: '週末[しゅうまつ]は早[はや]く起[お]きようと思[おも]う。', it: 'Nel weekend penso di alzarmi presto.' }
		],
		related: ['doushi', 'to-omou'],
		consolidaId: 'grammar-api-N4-14'
	}
];

// Mappa etichetta (senza furigana) → slug, usata dai badge per linkare la scheda.
export const FORM_SLUG_BY_LABEL: Record<string, string> = Object.fromEntries(
	GRAMMAR_FORMS.map((f) => [f.label.replace(/\[[^\]]+\]/g, ''), f.slug])
);
