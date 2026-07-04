// Schede delle forme grammaticali collegate ai badge (JpBadge).
// Ogni scheda spiega la forma, le regole d'uso (es. な/の) e mostra esempi.

export interface GrammarFormExample {
	jp: string; // notazione furigana base[lettura]
	it: string;
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
		icon: '🔴',
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
		icon: '🧩',
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
	}
];

// Mappa etichetta (senza furigana) → slug, usata dai badge per linkare la scheda.
export const FORM_SLUG_BY_LABEL: Record<string, string> = Object.fromEntries(
	GRAMMAR_FORMS.map((f) => [f.label.replace(/\[[^\]]+\]/g, ''), f.slug])
);
