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

// Mazzi pubblici, nell'app per tutti. Quelli delle lezioni dell'utente stanno nel
// suo file corso (corsi/mazzi-lezioni.renkei-course.json): si importano da «Corsi»
// e restano solo sul dispositivo (tabella course_mazzi), registrati qui all'avvio.
export const MAZZI: Record<string, Mazzo> = {};

let privati: Record<string, Mazzo> = {};
export function setPrivateMazzi(list: Mazzo[]): void {
	privati = Object.fromEntries(list.map((m) => [m.id, m]));
}

// Carta del mazzo → chiavi per la parola di catalogo: scrittura (prima
// variante di «省エネ, 省エネルギー», 〜 dei suffissi, anche senza な finale:
// 快適な → 快適), poi lettura (おしゃれな → お洒落).
export function cardCatalogKeys(c: MazzoCard): { writings: string[]; readings: string[] } {
	const jp = c.jp.split(/[,、]/)[0]!.trim().replace(/^～/, '〜');
	const yomi = c.yomi.replace(/^～/, '〜');
	return { writings: [jp, jp.replace(/な$/, '')], readings: [yomi, yomi.replace(/な$/, '')] };
}

export function findMazzo(id: string): Mazzo | null {
	return MAZZI[id] ?? privati[id] ?? null;
}
export const allMazzi = (): Mazzo[] => [...Object.values(MAZZI), ...Object.values(privati)];

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
