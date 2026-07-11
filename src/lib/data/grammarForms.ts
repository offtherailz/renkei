// Schede delle forme grammaticali collegate ai badge (JpBadge).
// Le "parti del discorso" (composed !== true) stanno in /forme; le forme
// composte / costruzioni (composed === true) in /forme-composte.

export interface GrammarFormExample {
	jp: string; // notazione furigana base[lettura]
	it: string;
}

// Coppia contrazione ↔ forma intera, mostrata con badge "contrazione di…".
export interface GrammarContraction {
	short: string; // forma contratta (colloquiale)
	full: string; // forma intera (scritto/esame)
	fullSlug?: string; // slug della scheda della forma intera, se esiste
	note?: string;
}

// "Schema di attacco": a quale parola si aggancia la forma e con quale forma.
export interface GrammarAttachment {
	base: string; // Verbo / Aggettivo in -い / Aggettivo in -な / Nome
	connessione: string; // es. "forma て", "radice ます", "forma piana"
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
	composed?: boolean; // true → scheda della pagina /forme-composte
	attachment?: GrammarAttachment[]; // schema di attacco
	schemaId?: string; // schema condiviso: forme con lo stesso id si richiamano
	exceptions?: string[];
	// Solo per la scheda delle contrazioni: mappa contratta → forma intera.
	contractions?: GrammarContraction[];
	// id di una voce grammar del seed per lanciare un drill Consolida mirato.
	consolidaId?: string;
}

// Legenda degli schemi di attacco, mostrata in cima a /forme-composte.
export const ATTACHMENT_SCHEMAS: Record<string, { label: string; descrizione: string }> = {
	te: {
		label: 'Forma て + ausiliare',
		descrizione: 'Si prende la forma て del verbo e vi si aggancia un secondo verbo (みる, おく, しまう, いる, あげる…).'
	},
	stem: {
		label: 'Radice (連用形 / aggettivo troncato)',
		descrizione: 'Verbo alla radice ます (食べ-, 飲み-); aggettivo in -い senza -い (高→高), in -な senza -な.'
	},
	plain: {
		label: 'Forma piana',
		descrizione: 'Frase alla forma piana (辞書形 / ない / た). Con un nome o un な-aggettivo spesso serve だ.'
	},
	dictionary: {
		label: 'Forma dizionario',
		descrizione: 'Verbo alla forma del dizionario (食べる, 行く), non passato e affermativo.'
	},
	ta: {
		label: 'Forma passata piana (た)',
		descrizione: 'Verbo alla forma た (食べた, 行った).'
	},
	nai: {
		label: 'Forma negativa piana (ない)',
		descrizione: 'Verbo alla forma ない, spesso trasformata in なければ / なくては.'
	},
	ba: {
		label: 'Forma condizionale ば',
		descrizione: 'Radice condizionale: 食べる→食べれば, 行く→行けば, 高い→高ければ.'
	},
	volitional: {
		label: 'Forma volitiva (意向形)',
		descrizione: '食べる→食べよう, 行く→行こう, する→しよう.'
	},
	conjugation: {
		label: 'Coniugazione del verbo (per classe)',
		descrizione: 'Il verbo stesso cambia forma secondo la classe (godan / ichidan / irregolari): potenziale, passivo, causativo.'
	}
};

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
		related: ['te-shimau', 'te-oku', 'te-iru', 'nakereba'],
		contractions: [
			{ short: '〜ちゃう / 〜じゃう', full: '〜てしまう / 〜でしまう', fullSlug: 'te-shimau', note: 'completamento o rammarico' },
			{ short: '〜なきゃ', full: '〜なければ(ならない)', fullSlug: 'nakereba', note: 'dovere / obbligo' },
			{ short: '〜なくちゃ', full: '〜なくては(いけない)', fullSlug: 'nakereba', note: 'dovere / obbligo' },
			{ short: '〜とく', full: '〜ておく', fullSlug: 'te-oku', note: 'fare in anticipo' },
			{ short: '〜てる', full: '〜ている', fullSlug: 'te-iru', note: 'azione in corso / stato' },
			{ short: '〜てく', full: '〜ていく', note: 'andare a fare / continuare' },
			{ short: '〜って', full: '〜という', note: 'citazione / "chiamato"' }
		]
	},

	// ---- Forme composte / costruzioni (pagina /forme-composte) ----
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
		related: ['doushi', 'te-miru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma て (per 〜てあげる/くれる/もらう)' }],
		schemaId: 'te'
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
		related: ['doushi', 'you-volitiva', 'tsumori'],
		composed: true,
		attachment: [
			{ base: 'Verbo', connessione: 'forma piana' },
			{ base: 'Aggettivo in -い', connessione: 'forma piana' },
			{ base: 'Nome', connessione: '+ だ' },
			{ base: 'Aggettivo in -な', connessione: '+ だ' }
		],
		schemaId: 'plain',
		exceptions: ['Intenzione: forma volitiva + と思う (行こうと思う).'],
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
		related: ['doushi', 'te-oku', 'te-shimau', 'te-iru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma て' }],
		schemaId: 'te',
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
		related: ['doushi', 'contrazioni', 'te-miru', 'te-iru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma て' }],
		schemaId: 'te',
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
		related: ['doushi', 'contrazioni', 'te-miru', 'te-iru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma て' }],
		schemaId: 'te',
		exceptions: ['Verbi in で: 〜でしまう (読んでしまう → 読んじゃう).'],
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
		related: ['doushi', 'contrazioni', 'te-miru', 'te-oku'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma て' }],
		schemaId: 'te',
		consolidaId: 'grammar-api-N5-66'
	},
	{
		slug: 'tai',
		label: '〜たい',
		icon: '🙋',
		title: 'Desiderativo: 〜たい',
		summary: 'Esprimere ciò che si vuole fare: "voglio…".',
		explanation: [
			'Radice ます del verbo + たい: 食べる → 食べたい, 飲む → 飲みたい.',
			'Si coniuga come un い-aggettivo: 食べたくない (non voglio), 食べたかった (volevo).',
			'Vale per chi parla (io) o nelle domande (tu). Per una terza persona si usa 〜たがる.'
		],
		examples: [
			{ jp: '水[みず]が飲[の]みたいです。', it: 'Voglio bere acqua.' },
			{ jp: '日本[にほん]へ行[い]きたい。', it: 'Voglio andare in Giappone.' }
		],
		related: ['doushi', 'sugiru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'radice ます' }],
		schemaId: 'stem',
		exceptions: [
			'Terza persona: 〜たがる (彼は行きたがっている).',
			'L\'oggetto può prendere が invece di を: 水が飲みたい.'
		],
		consolidaId: 'grammar-api-N5-63'
	},
	{
		slug: 'sugiru',
		label: '〜すぎる',
		icon: '📈',
		title: 'Eccesso: 〜すぎる',
		summary: 'Fare qualcosa troppo, o essere troppo…',
		explanation: [
			'Verbo alla radice ます + すぎる: 食べすぎる = "mangiare troppo".',
			'Aggettivo senza coda + すぎる: 高い → 高すぎる, 静か → 静かすぎる.',
			'Il risultato è un verbo ichidan: 食べすぎた, 高すぎない.'
		],
		examples: [
			{ jp: '食[た]べすぎました。', it: 'Ho mangiato troppo.' },
			{ jp: 'この本[ほん]は高[たか]すぎる。', it: 'Questo libro è troppo caro.' }
		],
		related: ['doushi', 'keiyoushi', 'tai'],
		composed: true,
		attachment: [
			{ base: 'Verbo', connessione: 'radice ます' },
			{ base: 'Aggettivo in -い', connessione: 'senza -い' },
			{ base: 'Aggettivo in -な', connessione: 'senza -な' }
		],
		schemaId: 'stem',
		exceptions: ['いい → よすぎる', 'ない → なさすぎる'],
		consolidaId: 'grammar-api-N4-37'
	},
	{
		slug: 'yasui-nikui',
		label: '〜やすい・〜にくい',
		icon: '🔧',
		title: 'Facile / difficile da: 〜やすい・〜にくい',
		summary: 'Quanto è facile o difficile fare qualcosa.',
		explanation: [
			'Radice ます + やすい (facile) / にくい (difficile): 読みやすい = "facile da leggere", 食べにくい = "difficile da mangiare".',
			'Il risultato è un い-aggettivo: 読みやすかった, 食べにくくない.'
		],
		examples: [
			{ jp: 'この本[ほん]は読[よ]みやすいです。', it: 'Questo libro è facile da leggere.' },
			{ jp: 'この肉[にく]は硬[かた]くて食[た]べにくい。', it: 'Questa carne è dura e difficile da mangiare.' }
		],
		related: ['doushi', 'i-keiyoushi'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'radice ます' }],
		schemaId: 'stem'
	},
	{
		slug: 'nagara',
		label: '〜ながら',
		icon: '🎧',
		title: 'Contemporaneità: 〜ながら',
		summary: 'Fare due azioni insieme: "mentre…".',
		explanation: [
			'Radice ます + ながら: 音楽を聞きながら勉強する = "studio ascoltando musica".',
			'Le due azioni hanno lo stesso soggetto; l\'azione principale è la seconda.'
		],
		examples: [
			{ jp: '音楽[おんがく]を聞[き]きながら走[はし]る。', it: 'Corro ascoltando musica.' },
			{ jp: '歩[ある]きながら話[はな]さないで。', it: 'Non parlare mentre cammini.' }
		],
		related: ['doushi'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'radice ます' }],
		schemaId: 'stem',
		exceptions: ['Le due azioni devono avere lo stesso soggetto.'],
		consolidaId: 'grammar-api-N4-36'
	},
	{
		slug: 'sou-apparenza',
		label: '〜そう',
		icon: '👀',
		title: 'Forma composta: 〜そう (apparenza)',
		summary: 'Come appare qualcosa a prima vista: "sembra…".',
		explanation: [
			'Radice del verbo/aggettivo + そう per dire l\'impressione a occhio: おいしそう = "sembra buono", 雨[あめ]が降[ふ]りそう = "sembra che stia per piovere".',
			'Con gli い-aggettivi cade la -い: 高い → 高そう.',
			'Attenzione: 〜そうだ come "sentito dire" (dopo forma piana, 雨だそうだ = "dicono che piove") è un uso diverso da questo.'
		],
		examples: [
			{ jp: 'このケーキはおいしそうです。', it: 'Questa torta sembra buona.' },
			{ jp: '空[そら]を見[み]ると、雨[あめ]が降[ふ]りそうだ。', it: 'A guardare il cielo, sembra che pioverà.' }
		],
		related: ['keiyoushi', 'doushi', 'sugiru'],
		composed: true,
		attachment: [
			{ base: 'Verbo', connessione: 'radice ます' },
			{ base: 'Aggettivo in -い', connessione: 'senza -い' },
			{ base: 'Aggettivo in -な', connessione: 'senza -な' }
		],
		schemaId: 'stem',
		exceptions: ['いい → よさそう, ない → なさそう', 'Diverso da 〜そうだ "sentito dire" (forma piana + そうだ).'],
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
		related: ['doushi', 'to-omou', 'tsumori'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma volitiva (意向形)' }],
		schemaId: 'volitional',
		exceptions: ['する → しよう, 来る → 来よう.'],
		consolidaId: 'grammar-api-N4-14'
	},
	{
		slug: 'ba',
		label: '〜ば',
		icon: '➰',
		title: 'Condizionale 〜ば',
		summary: 'Se… (condizione generale o ipotetica).',
		explanation: [
			'Godan: -u → -eba (行く → 行けば, 飲む → 飲めば). Ichidan: る → れば (食べる → 食べれば).',
			'Aggettivo in -い: い → ければ (高い → 高ければ). する → すれば, 来る → 来れば.',
			'Esprime una condizione: "se accade A, (allora) B". Spesso per condizioni generali o ipotesi.'
		],
		examples: [
			{ jp: '安[やす]ければ買[か]います。', it: 'Se costa poco, lo compro.' },
			{ jp: '早[はや]く行[い]けば間[ま]に合[あ]う。', it: 'Se vai presto, fai in tempo.' }
		],
		related: ['tara', 'to-cond', 'nara', 'doushi'],
		composed: true,
		attachment: [
			{ base: 'Verbo', connessione: 'forma condizionale ば' },
			{ base: 'Aggettivo in -い', connessione: '-ければ' }
		],
		schemaId: 'ba',
		consolidaId: 'grammar-api-N4-46'
	},
	{
		slug: 'tara',
		label: '〜たら',
		icon: '⏭️',
		title: 'Condizionale 〜たら',
		summary: 'Quando / se… (dopo che succede A, allora B).',
		explanation: [
			'Forma た del verbo + ら: 食べたら, 行ったら, 来たら.',
			'È il condizionale più versatile: "se/quando A succede, poi B". Spesso per eventi in sequenza.',
			'Aggettivi e nomi: 高かったら, 学生だったら.'
		],
		examples: [
			{ jp: '家[いえ]に帰[かえ]ったら電話[でんわ]します。', it: 'Quando torno a casa, telefono.' },
			{ jp: '雨[あめ]が降[ふ]ったら行[い]きません。', it: 'Se piove, non vado.' }
		],
		related: ['ba', 'to-cond', 'nara', 'doushi'],
		composed: true,
		attachment: [
			{ base: 'Verbo', connessione: 'forma た + ら' },
			{ base: 'Aggettivo in -い', connessione: '-かったら' },
			{ base: 'Nome', connessione: 'だったら' }
		],
		schemaId: 'ta',
		consolidaId: 'grammar-api-N4-47'
	},
	{
		slug: 'to-cond',
		label: '〜と (条件[じょうけん])',
		icon: '🔁',
		title: 'Condizionale 〜と',
		summary: 'Conseguenza automatica o naturale: "(ogni volta) che… allora sempre".',
		explanation: [
			'Forma dizionario (piana non passata) + と: 春になると花が咲く = "quando arriva la primavera, i fiori sbocciano".',
			'Per risultati naturali, automatici o ripetuti (leggi di natura, istruzioni, abitudini).',
			'La seconda parte NON può essere volontà, ordine, richiesta o invito.'
		],
		examples: [
			{ jp: 'このボタンを押[お]すと、ドアが開[あ]きます。', it: 'Se premi questo bottone, la porta si apre.' },
			{ jp: '右[みぎ]に曲[ま]がると、駅[えき]があります。', it: 'Girando a destra, c\'è la stazione.' }
		],
		related: ['ba', 'tara', 'nara', 'doushi'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma dizionario' }],
		schemaId: 'dictionary',
		exceptions: ['La 2ª parte non può essere volontà / ordine / richiesta / invito.'],
		consolidaId: 'grammar-api-N4-45'
	},
	{
		slug: 'nara',
		label: '〜なら',
		icon: '🗯️',
		title: 'Condizionale 〜なら',
		summary: 'Se è vero che… / riguardo a… (parte da ciò che ha detto l\'altro).',
		explanation: [
			'Nome / forma piana + なら: 日本に行くなら、京都がいい = "se vai in Giappone, Kyoto è meglio".',
			'Riprende un tema appena introdotto dall\'interlocutore e dà consiglio, opinione o condizione.',
			'Con i nomi si attacca direttamente: 温泉なら…'
		],
		examples: [
			{ jp: '温泉[おんせん]なら、箱根[はこね]がいいです。', it: 'Se parliamo di terme, Hakone è buona.' },
			{ jp: '忙[いそが]しいなら、手伝[てつだ]います。', it: 'Se sei occupato, ti aiuto.' }
		],
		related: ['ba', 'tara', 'to-cond'],
		composed: true,
		attachment: [
			{ base: 'Nome', connessione: '+ なら' },
			{ base: 'Verbo', connessione: 'forma piana + なら' }
		],
		schemaId: 'plain',
		consolidaId: 'grammar-api-N4-48'
	},
	{
		slug: 'kanou',
		label: '可能形[かのうけい] 〜(ら)れる',
		icon: '💪',
		title: 'Potenziale: potere / riuscire a',
		summary: 'Esprimere capacità o possibilità: "riesco a…".',
		explanation: [
			'Godan: -u → -eru (書く → 書ける, 飲む → 飲める). Ichidan: る → られる (食べる → 食べられる; colloquiale 食べれる).',
			'する → できる, 来る → 来られる (こられる).',
			'L\'oggetto spesso passa da を a が: 日本語が話せる.'
		],
		examples: [
			{ jp: '漢字[かんじ]が読[よ]めます。', it: 'Riesco a leggere i kanji.' },
			{ jp: '日本語[にほんご]が話[はな]せる。', it: 'So parlare giapponese.' }
		],
		related: ['doushi', 'ukemi', 'shieki', 'godan', 'ichidan'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'coniugazione potenziale (per classe)' }],
		schemaId: 'conjugation',
		exceptions: ['する → できる, 来る → 来られる', 'ら-nuki colloquiale: 食べれる, 見れる'],
		consolidaId: 'grammar-api-N4-10'
	},
	{
		slug: 'ukemi',
		label: '受身形[うけみけい] 〜(ら)れる',
		icon: '🎯',
		title: 'Passivo: subire un\'azione',
		summary: 'L\'azione è subìta dal soggetto: "vengo / mi viene…".',
		explanation: [
			'Godan: -u → -areru (言う → 言われる, 読む → 読まれる). Ichidan: る → られる (食べる → 食べられる).',
			'する → される, 来る → 来られる. Chi compie l\'azione prende に.',
			'Esiste il passivo "di disturbo": subire un danno da qualcosa (財布を盗まれた = "mi hanno rubato il portafoglio").'
		],
		examples: [
			{ jp: '先生[せんせい]に褒[ほ]められた。', it: 'Sono stato lodato dal maestro.' },
			{ jp: '弟[おとうと]にケーキを食[た]べられた。', it: 'Mio fratello mi ha mangiato la torta (a mio danno).' }
		],
		related: ['doushi', 'kanou', 'shieki'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'coniugazione passiva (per classe)' }],
		schemaId: 'conjugation',
		exceptions: ['Attenzione: per gli ichidan potenziale e passivo hanno la stessa forma (食べられる).'],
		consolidaId: 'grammar-api-N4-15'
	},
	{
		slug: 'shieki',
		label: '使役形[しえきけい] 〜(さ)せる',
		icon: '🫵',
		title: 'Causativo: far fare / lasciar fare',
		summary: 'Fare in modo che qualcuno faccia qualcosa.',
		explanation: [
			'Godan: -u → -aseru (行く → 行かせる, 飲む → 飲ませる). Ichidan: る → させる (食べる → 食べさせる).',
			'する → させる, 来る → 来させる.',
			'Chi è costretto/lasciato agire prende を o に a seconda della sfumatura.'
		],
		examples: [
			{ jp: '子供[こども]に野菜[やさい]を食[た]べさせる。', it: 'Faccio mangiare le verdure al bambino.' },
			{ jp: '先生[せんせい]は学生[がくせい]を立[た]たせた。', it: 'Il maestro ha fatto alzare gli studenti.' }
		],
		related: ['doushi', 'kanou', 'ukemi'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'coniugazione causativa (per classe)' }],
		schemaId: 'conjugation',
		consolidaId: 'grammar-api-N4-16'
	},
	{
		slug: 'hou-ga-ii',
		label: '〜ほうがいい',
		icon: '👍',
		title: 'Consiglio: 〜ほうがいい',
		summary: 'Suggerire cosa è meglio fare: "faresti meglio a…".',
		explanation: [
			'Forma た del verbo + ほうがいい (affermativo): 早く寝たほうがいい = "faresti meglio a dormire presto".',
			'Negativo: forma ない + ほうがいい: 無理をしないほうがいい = "faresti meglio a non strafare".'
		],
		examples: [
			{ jp: '薬[くすり]を飲[の]んだほうがいいです。', it: 'Faresti meglio a prendere la medicina.' },
			{ jp: '無理[むり]をしないほうがいい。', it: 'Faresti meglio a non strafare.' }
		],
		related: ['doushi', 'tara', 'ta-koto-ga-aru'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma た (affermativo) / ない (negativo)' }],
		schemaId: 'ta',
		exceptions: ['Il negativo usa la forma ない, non た.'],
		consolidaId: 'grammar-api-N4-27'
	},
	{
		slug: 'tsumori',
		label: '〜つもり',
		icon: '🧭',
		title: 'Intenzione: 〜つもり',
		summary: 'Dichiarare un proposito: "ho intenzione di…".',
		explanation: [
			'Forma dizionario + つもり: 行くつもり = "ho intenzione di andare".',
			'Negativo: forma ない + つもり (行かないつもり) oppure 〜つもりはない.',
			'Più deciso e programmato di 〜ようと思う.'
		],
		examples: [
			{ jp: '来年[らいねん]日本[にほん]へ行[い]くつもりです。', it: 'L\'anno prossimo ho intenzione di andare in Giappone.' },
			{ jp: '今日[きょう]は何[なに]もしないつもりだ。', it: 'Oggi non ho intenzione di fare niente.' }
		],
		related: ['doushi', 'you-volitiva', 'to-omou'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma dizionario / ない' }],
		schemaId: 'plain',
		consolidaId: 'grammar-api-N4-64'
	},
	{
		slug: 'ta-koto-ga-aru',
		label: '〜たことがある',
		icon: '🗺️',
		title: 'Esperienza: 〜たことがある',
		summary: 'Aver fatto qualcosa almeno una volta (esperienza).',
		explanation: [
			'Forma た + ことがある: 日本に行ったことがある = "sono stato in Giappone (ho l\'esperienza)".',
			'Negativo: 〜たことがない = "non ho mai…".',
			'Diverso dal semplice passato: qui conta l\'esperienza, non il singolo evento.'
		],
		examples: [
			{ jp: '寿司[すし]を食[た]べたことがありますか。', it: 'Hai mai mangiato sushi?' },
			{ jp: '富士山[ふじさん]に登[のぼ]ったことがない。', it: 'Non sono mai salito sul Fuji.' }
		],
		related: ['doushi', 'hou-ga-ii'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma た + ことがある' }],
		schemaId: 'ta',
		consolidaId: 'grammar-api-N5-62'
	},
	{
		slug: 'nakereba',
		label: '〜なければならない',
		icon: '❗',
		title: 'Obbligo: 〜なければならない',
		summary: 'Dover fare qualcosa (obbligo, dovere).',
		explanation: [
			'Forma ない → togli -い + ければならない: 行く → 行かない → 行かなければならない = "devo andare".',
			'Varianti equivalenti: 〜なくてはならない / 〜なくてはいけない.',
			'Nel parlato si contrae in 〜なきゃ / 〜なくちゃ (vedi 縮約形).'
		],
		examples: [
			{ jp: '薬[くすり]を飲[の]まなければならない。', it: 'Devo prendere la medicina.' },
			{ jp: '明日[あした]は早[はや]く起[お]きなければなりません。', it: 'Domani devo alzarmi presto.' }
		],
		related: ['doushi', 'contrazioni'],
		composed: true,
		attachment: [{ base: 'Verbo', connessione: 'forma ない → なければ' }],
		schemaId: 'nai',
		consolidaId: 'grammar-api-N4-60'
	}
];

// Mappa etichetta (senza furigana) → slug, usata dai badge per linkare la scheda.
export const FORM_SLUG_BY_LABEL: Record<string, string> = Object.fromEntries(
	GRAMMAR_FORMS.map((f) => [f.label.replace(/\[[^\]]+\]/g, ''), f.slug])
);

// Slug delle forme composte (vivono in /forme-composte anziché /forme).
export const COMPOSED_SLUGS = new Set(
	GRAMMAR_FORMS.filter((f) => f.composed).map((f) => f.slug)
);

// Pagina che ospita la scheda di uno slug: serve per i link incrociati.
export function formPage(slug: string): 'forme' | 'forme-composte' {
	return COMPOSED_SLUGS.has(slug) ? 'forme-composte' : 'forme';
}

// Mappa curata: struttura ESATTA della voce grammatica del seed → slug della
// forma composta con le sue regole d'uso. Serve alla scheda grammatica per
// mostrare "si attacca a" e le forme con la stessa regola (l'overlap tra il
// catalogo /forme-composte e le voci del seed). Curata a mano: il match
// automatico per sottostringa dà falsi positivi (たい → みたいだ).
export const FORM_SLUG_BY_STRUTTURA: Record<string, string> = {
	'〜てあげる': 'juju',
	'〜てくれる': 'juju',
	'〜てもらう': 'juju',
	'〜てくださる': 'juju',
	'〜と思う': 'to-omou',
	'〜（よ）うと思う': 'to-omou',
	'〜てみる': 'te-miru',
	'〜ておく': 'te-oku',
	'〜てしまう': 'te-shimau',
	'〜ている': 'te-iru',
	'〜ている／〜でいる': 'te-iru',
	'たい': 'tai',
	'〜すぎる': 'sugiru',
	'すぎる': 'sugiru',
	'〜ながら': 'nagara',
	'〜そう': 'sou-apparenza',
	'意向形': 'you-volitiva',
	'〜ば': 'ba',
	'条件形': 'ba',
	'〜たら': 'tara',
	'〜と': 'to-cond',
	'〜なら': 'nara',
	'可能形': 'kanou',
	'受身形': 'ukemi',
	'使役形': 'shieki',
	'〜せてください／〜させてください': 'shieki',
	'ほうがいい': 'hou-ga-ii',
	'つもり': 'tsumori',
	'〜つもり': 'tsumori',
	'たことがある': 'ta-koto-ga-aru',
	'〜なければいけない': 'nakereba',
	'なくてはいけない': 'nakereba',
	'なくてはならない': 'nakereba'
};
