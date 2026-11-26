// 🎯 Contesto al volo — allenamento a cogliere il contesto dalla frase d'apertura
// del 聴解 (課題理解 / ポイント理解), dove all'esame l'audio passa UNA volta sola.
//
// All'esame, PRIMA del dialogo, il narratore dice chi parla (男の人と女の人が…)
// e fa già la domanda. Chi la coglie sa cosa cercare; chi la perde ascolta tutto
// «alla cieca». Qui si gioca in due tempi:
//  1) si sente solo l'apertura → indovina COSA chiedono e DI CHI;
//  2) si sente il dialogo (1 ascolto in modalità esame) → si risponde.
// Logica pura (niente TTS/DOM): testata in contestoAscolto.test.ts.

export type TipoDomanda =
	| 'prima'
	| 'azione'
	| 'perche'
	| 'quando'
	| 'dove'
	| 'chi'
	| 'come'
	| 'prezzo'
	| 'quanti'
	| 'cosa';

export const TIPO_LABEL: Record<TipoDomanda, string> = {
	prima: 'Cosa fa PER PRIMA',
	azione: 'Cosa farà (l’azione decisa)',
	perche: 'Il motivo (perché)',
	quando: 'Quando / a che ora',
	dove: 'Dove',
	chi: 'Con chi / quale persona',
	come: 'In che modo (mezzo)',
	prezzo: 'Quanto paga / costa',
	quanti: 'Quanti (un numero)',
	cosa: 'Quale cosa / oggetto'
};

// Cosa tenere d'occhio nel dialogo, una volta capito il tipo di domanda.
export const TIPO_CONSIGLIO: Record<TipoDomanda, string> = {
	prima: 'Segui l’ORDINE: まず, その前に, 先に, 〜てから. Spesso l’ordine cambia a metà con でも.',
	azione: 'Conta l’ultima decisione: dopo でも / じゃあ / やっぱり. Le prime proposte sono trappole.',
	perche: 'Cerca 〜から / 〜くて / 〜ので. Le cause nominate e poi negate (〜ないで) sono distrattori.',
	quando: 'Segna ogni orario/giorno e cancella quelli cambiati (予定だったけど…, 変わった).',
	dove: 'Segna i luoghi: la risposta è quello scelto alla fine, non il primo proposto.',
	chi: 'Segna le persone: chi è 忙しい / non può viene scartato.',
	come: 'Ascolta il mezzo (バスで, 歩いて…) e i rifiuti: 大丈夫 = «no grazie».',
	prezzo: 'Prezzo e sconto (〜円引き): spesso serve un calcolo veloce.',
	quanti: 'Segna i numeri: やっぱり / 〜じゃなくて cambia la quantità.',
	cosa: 'Elimina quello che c’è già (もう ある), che non serve (いらない) o che viene scartato.'
};

const ORDINE_TIPI: TipoDomanda[] = ['prima', 'azione', 'perche', 'quando', 'dove', 'chi', 'come', 'prezzo', 'quanti', 'cosa'];

export const stripFurigana = (s: string): string => s.replace(/\[[^\]]*\]/g, '');

export function classificaDomanda(domanda: string): TipoDomanda {
	const q = stripFurigana(domanda).replace(/\s+/g, ' ');
	if (/まず|はじめに|最初に|先に/.test(q)) return 'prima';
	if (/なぜ|どうして/.test(q)) return 'perche';
	if (/いくら/.test(q)) return 'prezzo';
	if (/いくつ|何個|何本|何枚|何人/.test(q)) return 'quanti';
	if (/何時|いつ|何曜|何日/.test(q)) return 'quando';
	if (/どこ/.test(q)) return 'dove';
	if (/だれ|誰/.test(q)) return 'chi';
	if (/どうやって|何で 行/.test(q)) return 'come';
	if (/何色|どれ|何が|何を ?(買|持|借|食|飲)|何です/.test(q)) return 'cosa';
	if (/しますか|すれば|しなければ|これから|この ?あと/.test(q)) return 'azione';
	return 'cosa';
}

// Ruoli: forma «corta» come nel copione (女, 男, 子…) ⇄ nome italiano.
const ROLE_NORM: Record<string, string> = {
	女の人: '女', 男の人: '男', 子ども: '子', お客さん: '客', お母さん: '母', お父さん: '父'
};
const ROLE_IT: Record<string, string> = {
	女: 'la donna', 男: 'l’uomo', 子: 'il bambino', 男の子: 'il ragazzo', 女の子: 'la ragazza',
	学生: 'lo studente', 先生: 'l’insegnante', 店員: 'il commesso', 客: 'il cliente',
	母: 'la madre', 父: 'il padre', 部長: 'il capo reparto', 店長: 'il titolare', 課長: 'il caposezione',
	社長: 'il presidente', 駅員: 'il ferroviere', 医者: 'il medico', 兄: 'il fratello maggiore'
};
export const ENTRAMBI = 'tutti e due';
export const normRuolo = (r: string): string => {
	const s = stripFurigana(r).trim();
	return ROLE_NORM[s] ?? s;
};
export const ruoloIt = (r: string): string => ROLE_IT[normRuolo(r)] ?? normRuolo(r);

export interface Battuta {
	who: string; // ruolo senza furigana (部長)
	text: string; // con furigana
}

export interface PromptDiviso {
	scena: string; // 〔会話〕 → '会話'
	battute: Battuta[];
	domanda: string; // dopo «問:»
}

const BATTUTA = /((?:[^\s「」『』：:。、！？!?〔〕\[\]]|\[[^\]]*\]){1,12}?)\s*[：:]\s*「([^」]*)」/g;

export function dividiPrompt(prompt: string): PromptDiviso {
	let body = prompt;
	let domanda = '';
	const qi = body.indexOf('問:');
	if (qi >= 0) {
		domanda = body.slice(qi + 2).trim();
		body = body.slice(0, qi).trim();
	}
	let scena = '';
	const sm = body.match(/^〔([^〕]*)〕\s*/);
	if (sm) {
		scena = sm[1]!.trim();
		body = body.slice(sm[0].length);
	}
	const battute: Battuta[] = [];
	for (const m of body.matchAll(new RegExp(BATTUTA.source, 'g'))) battute.push({ who: stripFurigana(m[1]!), text: m[2]! });
	return { scena, battute, domanda };
}

// Di chi parla la domanda: «男の人は…» → 男. null se il soggetto non è una
// persona del dialogo (どうして 電車は…, 映画は…).
export function soggettoDomanda(domanda: string, ruoli: string[]): string | null {
	const m = stripFurigana(domanda).trim().match(/^([^\sはが、]{1,6})は/);
	if (!m) return null;
	const s = normRuolo(m[1]!);
	if (s === '二人') return ENTRAMBI;
	return ruoli.map(normRuolo).includes(s) ? s : null;
}

// Segnali di svolta/negazione: dove all'esame cambia la risposta.
export const SEGNALI: { jp: string; it: string; re: RegExp }[] = [
	{ jp: 'でも', it: 'però (svolta)', re: /でも[、。 ]/ },
	{ jp: 'じゃあ', it: 'allora (decisione)', re: /じゃあ|じゃ、/ },
	{ jp: 'やっぱり', it: 'anzi, alla fine', re: /やっぱり/ },
	{ jp: '〜けど', it: 'ma…', re: /けど/ },
	{ jp: '実は', it: 'in realtà', re: /実[はわ]/ },
	{ jp: 'その前に / 先に', it: 'prima (cambia l’ordine)', re: /その前に|先に|前に/ },
	{ jp: '〜てから', it: 'dopo aver…', re: /てから|でから/ },
	{ jp: 'もう', it: 'già (fatto/c’è)', re: /もう/ },
	{ jp: 'まだ', it: 'ancora', re: /まだ/ },
	{ jp: '〜だけ', it: 'solo', re: /だけ/ },
	{ jp: '〜じゃなくて', it: 'non… ma', re: /じゃなくて|ではなくて/ },
	{ jp: 'だめ / いらない', it: 'no / non serve', re: /だめ|いらない|いりません/ },
	{ jp: '大丈夫', it: '«tranquillo» = no grazie', re: /大丈夫/ },
	{ jp: '変わった', it: 'è cambiato', re: /変わ/ },
	{ jp: '〜ないで', it: 'senza… (negato)', re: /ないで/ }
];

export function segnaliIn(battute: Battuta[]): { jp: string; it: string }[] {
	const testo = battute.map((b) => stripFurigana(b.text)).join(' ');
	return SEGNALI.filter((s) => s.re.test(testo)).map(({ jp, it }) => ({ jp, it }));
}

export interface ContestoRound {
	domanda: string;
	tipo: TipoDomanda;
	tipoOpzioni: TipoDomanda[]; // 4, con dentro `tipo`
	ruoli: string[]; // ruoli distinti del dialogo, normalizzati
	chi: string | null; // soggetto (ruolo normalizzato o ENTRAMBI); null = domanda non su una persona
	chiOpzioni: string[]; // etichette italiane, vuoto se chi === null
	chiCorretta: string; // etichetta italiana corretta ('' se chi === null)
	segnali: { jp: string; it: string }[];
}

// Una domanda d'ascolto è adatta se ha domanda e almeno due battute.
export function adattoAlContesto(prompt: string): boolean {
	const d = dividiPrompt(prompt);
	return d.domanda !== '' && d.battute.length >= 2;
}

export function costruisciRound(prompt: string, rnd: () => number = Math.random): ContestoRound {
	const d = dividiPrompt(prompt);
	const tipo = classificaDomanda(d.domanda);
	const altri = shuffle(ORDINE_TIPI.filter((t) => t !== tipo), rnd).slice(0, 3);
	const tipoOpzioni = shuffle([tipo, ...altri], rnd);
	const ruoli = [...new Set(d.battute.map((b) => normRuolo(b.who)))];
	const chi = ruoli.length >= 2 ? soggettoDomanda(d.domanda, ruoli) : null;
	let chiOpzioni: string[] = [];
	let chiCorretta = '';
	if (chi) {
		chiCorretta = chi === ENTRAMBI ? ENTRAMBI : ruoloIt(chi);
		chiOpzioni = [...new Set([...ruoli.map(ruoloIt), ENTRAMBI])];
	}
	return { domanda: d.domanda, tipo, tipoOpzioni, ruoli, chi, chiOpzioni, chiCorretta, segnali: segnaliIn(d.battute) };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}
