// Guida alle particelle: per ciascuna gli usi principali a livello N5/N4,
// con spiegazione ed esempio breve. Linkata dai quiz (chip "Particella X").

export interface ParticleUse {
	titolo: string;
	spiegazione: string;
	esempio: { jp: string; it: string };
}

export interface ParticleEntry {
	particella: string;
	nome: string;
	usi: ParticleUse[];
	confusioni?: string; // con cosa si confonde e come distinguerle
}

export const PARTICLE_GUIDE: ParticleEntry[] = [
	{
		particella: 'は',
		nome: 'Tema (si legge wa)',
		usi: [
			{ titolo: 'Tema della frase', spiegazione: '"Per quanto riguarda X…": presenta di cosa si parla.', esempio: { jp: '私[わたし]は学生[がくせい]です。', it: 'Io sono uno studente.' } },
			{ titolo: 'Contrasto', spiegazione: 'Mette X in contrasto con altro, anche implicito.', esempio: { jp: '肉[にく]は食[た]べません。', it: 'La carne (quella sì che) non la mangio.' } }
		],
		confusioni: 'は vs が: は presenta il tema noto, が introduce o mette a fuoco il soggetto. "Chi è venuto?" → 田中さんが来た (informazione nuova).'
	},
	{
		particella: 'が',
		nome: 'Soggetto',
		usi: [
			{ titolo: 'Soggetto (informazione nuova)', spiegazione: 'Marca chi/cosa compie l\'azione, specie se è la novità della frase.', esempio: { jp: '雨[あめ]が降[ふ]っています。', it: 'Sta piovendo.' } },
			{ titolo: 'Con verbi/aggettivi di stato', spiegazione: 'Con 好き, 上手, ほしい, できる, わかる… l\'oggetto del sentimento prende が.', esempio: { jp: '犬[いぬ]が好[す]きです。', it: 'Mi piacciono i cani.' } },
			{ titolo: 'Con gli intransitivi', spiegazione: 'Nelle coppie transitivo/intransitivo, l\'evento spontaneo usa が.', esempio: { jp: 'ドアが開[あ]きました。', it: 'La porta si è aperta.' } }
		],
		confusioni: 'が vs を: 開ける (transitivo) → ドアを開ける; 開く (intransitivo) → ドアが開く.'
	},
	{
		particella: 'を',
		nome: 'Complemento oggetto',
		usi: [
			{ titolo: 'Oggetto diretto', spiegazione: 'Ciò su cui cade l\'azione del verbo transitivo.', esempio: { jp: '水[みず]を飲[の]みます。', it: 'Bevo l\'acqua.' } },
			{ titolo: 'Luogo attraversato', spiegazione: 'Con verbi di movimento: lo spazio percorso.', esempio: { jp: '公園[こうえん]を散歩[さんぽ]します。', it: 'Passeggio per il parco.' } }
		]
	},
	{
		particella: 'に',
		nome: 'Destinazione / tempo / esistenza',
		usi: [
			{ titolo: 'Destinazione', spiegazione: 'Il punto di arrivo del movimento.', esempio: { jp: '学校[がっこう]に行[い]きます。', it: 'Vado a scuola.' } },
			{ titolo: 'Orario preciso', spiegazione: 'Con ore, giorni, date.', esempio: { jp: '七時[しちじ]に起[お]きます。', it: 'Mi alzo alle sette.' } },
			{ titolo: 'Luogo di esistenza', spiegazione: 'Con います/あります: dove qualcosa si trova.', esempio: { jp: '部屋[へや]に猫[ねこ]がいます。', it: 'Nella stanza c\'è un gatto.' } },
			{ titolo: 'Destinatario', spiegazione: 'A chi si dà/dice qualcosa.', esempio: { jp: '友達[ともだち]に手紙[てがみ]を書[か]きます。', it: 'Scrivo una lettera a un amico.' } }
		],
		confusioni: 'に vs で: に = dove si STA o si arriva, で = dove si FA qualcosa. 部屋にいる ma 部屋で勉強する.'
	},
	{
		particella: 'で',
		nome: 'Luogo dell\'azione / mezzo',
		usi: [
			{ titolo: 'Luogo dell\'azione', spiegazione: 'Dove avviene l\'attività.', esempio: { jp: '図書館[としょかん]で勉強[べんきょう]します。', it: 'Studio in biblioteca.' } },
			{ titolo: 'Mezzo/strumento', spiegazione: 'Con che cosa si fa qualcosa.', esempio: { jp: 'バスで行[い]きます。', it: 'Vado in autobus.' } },
			{ titolo: 'Causa', spiegazione: 'Per via di (malattie, eventi).', esempio: { jp: 'かぜで休[やす]みました。', it: 'Sono stato a casa per il raffreddore.' } }
		]
	},
	{
		particella: 'と',
		nome: 'Compagnia / "e" esaustivo',
		usi: [
			{ titolo: 'Elenco completo', spiegazione: '"E" quando si elencano TUTTI gli elementi.', esempio: { jp: '犬[いぬ]と猫[ねこ]がいます。', it: 'Ci sono un cane e un gatto (e basta).' } },
			{ titolo: 'Compagnia', spiegazione: 'Insieme a qualcuno.', esempio: { jp: '友達[ともだち]と映画[えいが]を見[み]ました。', it: 'Ho visto un film con un amico.' } },
			{ titolo: 'Citazione', spiegazione: 'Con 言う/思う: virgolette della frase riferita.', esempio: { jp: '行[い]くと言[い]いました。', it: 'Ha detto che va.' } }
		],
		confusioni: 'と vs や: と elenca tutto, や elenca esempi ("tra cui").'
	},
	{
		particella: 'へ',
		nome: 'Direzione (si legge e)',
		usi: [
			{ titolo: 'Direzione del movimento', spiegazione: 'Verso dove; quasi intercambiabile con に per la destinazione, ma sottolinea la direzione.', esempio: { jp: '日本[にほん]へ行[い]きます。', it: 'Vado in Giappone.' } }
		]
	},
	{
		particella: 'の',
		nome: 'Possesso / collegamento',
		usi: [
			{ titolo: 'Possesso e appartenenza', spiegazione: 'A di B: il primo nome descrive il secondo.', esempio: { jp: '私[わたし]の本[ほん]です。', it: 'È il mio libro.' } },
			{ titolo: 'Nominalizzatore', spiegazione: 'Trasforma un verbo in "il fatto di…".', esempio: { jp: '泳[およ]ぐのが好[す]きです。', it: 'Mi piace nuotare.' } }
		],
		confusioni: 'Tra due NOMI ci va の (日本語の先生); dopo un aggettivo in -な ci va な (静かな部屋).'
	},
	{
		particella: 'も',
		nome: '"Anche"',
		usi: [
			{ titolo: 'Anche / pure', spiegazione: 'Sostituisce は/が/を quando si aggiunge un elemento.', esempio: { jp: '私[わたし]も行[い]きます。', it: 'Vengo anch\'io.' } },
			{ titolo: 'Negazione totale', spiegazione: 'Con interrogativi + negazione: nessuno/niente.', esempio: { jp: '何[なに]も食[た]べませんでした。', it: 'Non ho mangiato niente.' } }
		]
	},
	{
		particella: 'から',
		nome: 'Da / perché',
		usi: [
			{ titolo: 'Punto di partenza', spiegazione: 'Da (luogo o tempo).', esempio: { jp: '九時[くじ]から働[はたら]きます。', it: 'Lavoro dalle nove.' } },
			{ titolo: 'Causa', spiegazione: 'A fine frase: "perciò/perché".', esempio: { jp: '高[たか]いですから、買[か]いません。', it: 'È caro, perciò non lo compro.' } }
		]
	},
	{
		particella: 'まで',
		nome: 'Fino a',
		usi: [
			{ titolo: 'Limite di luogo o tempo', spiegazione: 'Fino a (spesso in coppia con から).', esempio: { jp: '九時[くじ]から五時[ごじ]まで働[はたら]きます。', it: 'Lavoro dalle nove alle cinque.' } }
		]
	},
	{
		particella: 'や',
		nome: 'Elenco parziale',
		usi: [
			{ titolo: '"E… tra le altre cose"', spiegazione: 'Elenca esempi, non tutto; spesso con など.', esempio: { jp: '寿司[すし]やラーメンなどを食[た]べました。', it: 'Ho mangiato sushi, ramen e altro.' } }
		],
		confusioni: 'や vs と: や = elenco aperto, と = elenco chiuso.'
	}
];
