// Gioco «Relazioni» (beta): conversazione guidata dove il registro cambia col
// rapporto con l'interlocutore. Solo dati/logica pura qui — niente stato UI
// (vive in src/routes/relazioni/+page.svelte).
//
// 3 scenari ↔ 3 registri (phrase-bank curata dalla spec, NON improvvisata):
// - shotaimen (prima conoscenza): 丁寧 simmetrico (entrambi です・ます)
// - tomodachi (amico/famiglia): 普通体 simmetrico (entrambi piano)
// - joushi (capo/cena aziendale): 敬語 asimmetrico — il capo parla 丁寧/piano
//   leggero, l'utente SEMPRE umile (kenjougo) + onorifico (sonkeigo) verso di
//   lui. Questa asimmetria è il punto didattico dello scenario.

export type Register = 'teinei' | 'plain' | 'keigo';

export type ScenarioId = 'shotaimen' | 'tomodachi' | 'joushi';

// Temi mescolabili nella conversazione (挨拶 apre sempre, chiusura chiude sempre).
export type Theme = 'greeting' | 'origin' | 'work' | 'hobby' | 'family' | 'closing';

export interface Line {
	jp: string;
	read: string; // lettura in kana
	it: string;
	en: string;
}

// Una battuta utente "giusta" o "distrattore", con la spiegazione del perché
// è sbagliata quando lo è (registro o contenuto).
export interface Option extends Line {
	correct: boolean;
	reason?: string; // perché è sbagliata (per il feedback)
}

export interface ThemeBank {
	theme: Theme;
	npc: Line; // battuta dell'NPC per questo tema in questo scenario
	options: Option[]; // 1+ corrette + distrattori, stesso tema
}

export interface Scenario {
	id: ScenarioId;
	icon: string;
	label: string;
	context: string;
	register: Register;
	npc: string; // chi è l'interlocutore
	npcIcon: string;
	themes: ThemeBank[]; // include sempre 'greeting' e 'closing'
}

// ── Helper per costruire le Option senza ripetere `correct` ovunque ──
function ok(jp: string, read: string, it: string, en: string): Option {
	return { jp, read, it, en, correct: true };
}
function bad(jp: string, read: string, it: string, en: string, reason: string): Option {
	return { jp, read, it, en, correct: false, reason };
}
function npcLine(jp: string, read: string, it: string, en: string): Line {
	return { jp, read, it, en };
}

// ═══════════════════════════════════════════════════════════════════════
// 丁寧 — 🤝 shotaimen (prima conoscenza): entrambi in です・ます
// ═══════════════════════════════════════════════════════════════════════
const SHOTAIMEN_THEMES: ThemeBank[] = [
	{
		theme: 'greeting',
		npc: npcLine('はじめまして。田中と申します。', 'はじめまして。たなかと もうします。', 'Piacere. Mi chiamo Tanaka (umile).', 'Nice to meet you. My name is Tanaka.'),
		options: [
			ok('はじめまして。どうぞよろしくお願いします。', 'はじめまして。どうぞ よろしく おねがいします。', 'Piacere. Piacere di conoscerla.', 'Nice to meet you. Pleased to make your acquaintance.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual per un primo incontro: serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (troppo casual)', 'Nice to meet ya! (too casual)', 'registro troppo casual per un primo incontro: serve 丁寧')
		]
	},
	{
		theme: 'origin',
		npc: npcLine('どちらのご出身ですか？', 'どちらの ごしゅっしんですか？', 'Di dov\'è (lei)?', 'Where are you from?'),
		options: [
			ok('東京から来ました。', 'とうきょうから きました。', 'Vengo da Tokyo.', 'I come from Tokyo.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual per un conoscente nuovo: serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (fuori contesto e troppo casual)', 'Nice to meet ya! (off-topic and too casual)', 'non risponde alla domanda ed è troppo casual')
		]
	},
	{
		theme: 'work',
		npc: npcLine('お仕事は何ですか？', 'おしごとは なんですか？', 'Che lavoro fa?', 'What do you do for work?'),
		options: [
			ok('会社員です。', 'かいしゃいんです。', 'Sono un impiegato.', 'I\'m an office worker.'),
			ok('学生です。', 'がくせいです。', 'Sono uno studente.', 'I\'m a student.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual per un conoscente nuovo: serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (fuori contesto e troppo casual)', 'Nice to meet ya! (off-topic and too casual)', 'non risponde alla domanda ed è troppo casual')
		]
	},
	{
		theme: 'hobby',
		npc: npcLine('趣味は何ですか？', 'しゅみは なんですか？', 'Quali sono i suoi hobby?', 'What are your hobbies?'),
		options: [
			ok('音楽を聞くことです。', 'おんがくを きくことです。', 'Ascoltare musica.', 'Listening to music.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual per un conoscente nuovo: serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (fuori contesto e troppo casual)', 'Nice to meet ya! (off-topic and too casual)', 'non risponde alla domanda ed è troppo casual')
		]
	},
	{
		theme: 'family',
		npc: npcLine('銀行で働いています。', 'ぎんこうで はたらいています。', 'Lavoro in banca.', 'I work at a bank.'),
		options: [
			ok('そうですか。', 'そうですか。', 'Ah, capisco.', 'I see.'),
			ok('いいですね。', 'いいですね。', 'Che bello.', 'That\'s nice.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual: verso un conoscente serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (fuori contesto)', 'Nice to meet ya! (off-topic)', 'non è un aizuchi appropriato qui ed è troppo casual')
		]
	},
	{
		theme: 'closing',
		npc: npcLine('これからどうぞよろしくお願いします。', 'これから どうぞ よろしく おねがいします。', 'Piacere di conoscerla, d\'ora in poi.', 'Pleased to work/get along with you from now on.'),
		options: [
			ok('はじめまして。どうぞよろしくお願いします。', 'はじめまして。どうぞ よろしく おねがいします。', 'Piacere. Piacere di conoscerla.', 'Nice to meet you. Pleased to make your acquaintance.'),
			bad('うん、そうだよ。', 'うん、そうだよ。', 'Sì, esatto. (troppo casual)', 'Yeah, that\'s right. (too casual)', 'registro troppo casual per chiudere un primo incontro: serve 丁寧'),
			bad('よろしくね！', 'よろしくね！', 'Piacere! (troppo casual)', 'Nice to meet ya! (too casual)', 'troppo casual per un primo incontro: serve 丁寧')
		]
	}
];

// ═══════════════════════════════════════════════════════════════════════
// 普通体 — 🫂 tomodachi (amico/famiglia): entrambi in piano (tame-guchi)
// ═══════════════════════════════════════════════════════════════════════
const TOMODACHI_THEMES: ThemeBank[] = [
	{
		theme: 'greeting',
		npc: npcLine('久しぶり！元気だった？', 'ひさしぶり！げんきだった？', 'Quanto tempo! Stavi bene?', 'Long time no see! Have you been well?'),
		options: [
			ok('うん、元気だよ。〇〇は？', 'うん、げんきだよ。〇〇は？', 'Sì, sto bene. E tu?', 'Yeah, I\'m good. What about you?'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (troppo formale)', 'Yes, thanks to you, I\'m well. (too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	},
	{
		theme: 'work',
		npc: npcLine('最近、仕事が忙しくてさ。', 'さいきん、しごとが いそがしくてさ。', 'Ultimamente il lavoro è impegnativo, sai.', 'Work\'s been busy lately, you know.'),
		options: [
			ok('へえ、いいね。', 'へえ、いいね。', 'Ah sì, capisco.', 'Oh really, I see.'),
			ok('そうなんだ。', 'そうなんだ。', 'Ah, è così.', 'Oh, is that so.'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (fuori tema e troppo formale)', 'Yes, thanks to you, I\'m well. (off-topic and too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	},
	{
		theme: 'origin',
		npc: npcLine('週末は何してるの？', 'しゅうまつは なにしてるの？', 'Cosa fai nel weekend?', 'What are you doing this weekend?'),
		options: [
			ok('週末は家でゆっくりしてた。', 'しゅうまつは いえで ゆっくりしてた。', 'Nel weekend me la sono presa comoda a casa.', 'I relaxed at home over the weekend.'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (fuori tema e troppo formale)', 'Yes, thanks to you, I\'m well. (off-topic and too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	},
	{
		theme: 'hobby',
		npc: npcLine('最近ジムに通ってるんだ。', 'さいきん ジムに かよってるんだ。', 'Ultimamente vado in palestra.', 'I\'ve been going to the gym lately.'),
		options: [
			ok('へえ、いいね。', 'へえ、いいね。', 'Ah sì, bello.', 'Oh really, nice.'),
			ok('そうなんだ。', 'そうなんだ。', 'Ah, è così.', 'Oh, is that so.'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (fuori tema e troppo formale)', 'Yes, thanks to you, I\'m well. (off-topic and too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	},
	{
		theme: 'family',
		npc: npcLine('最近どう？', 'さいきん どう？', 'Come va ultimamente?', 'How\'s it going lately?'),
		options: [
			ok('まあまあかな。', 'まあまあかな。', 'Così così, direi.', 'So-so, I\'d say.'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (troppo formale)', 'Yes, thanks to you, I\'m well. (too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	},
	{
		theme: 'closing',
		npc: npcLine('また今度遊ぼうね。', 'また こんど あそぼうね。', 'Usciamo di nuovo un\'altra volta, eh.', 'Let\'s hang out again sometime.'),
		options: [
			ok('うん、また今度ね。', 'うん、また こんどね。', 'Sì, alla prossima.', 'Yeah, see you next time.'),
			bad('はい、おかげさまで元気です。', 'はい、おかげさまで げんきです。', 'Sì, grazie, sto bene. (fuori tema e troppo formale)', 'Yes, thanks to you, I\'m well. (off-topic and too formal)', 'troppo formale per un amico: serve 普通体'),
			bad('さようでございます。', 'さようで ございます。', 'È proprio così. (troppo formale)', 'That is indeed so. (too formal)', 'keigo fuori luogo con un amico: serve 普通体')
		]
	}
];

// ═══════════════════════════════════════════════════════════════════════
// 敬語 asimmetrico — 🍻 joushi (capo/cena aziendale): il capo in 丁寧/piano
// leggero, l'utente SEMPRE in umile (kenjougo)/onorifico (sonkeigo).
// ═══════════════════════════════════════════════════════════════════════
const JOUSHI_THEMES: ThemeBank[] = [
	{
		theme: 'greeting',
		npc: npcLine('お疲れさま。今日はよく来てくれたね。', 'おつかれさま。きょうは よく きてくれたね。', 'Buon lavoro. Sono contento che tu sia venuto oggi.', 'Good work. Glad you came today.'),
		options: [
			ok('本日はお招きいただき、ありがとうございます。', 'ほんじつは おまねき いただき、ありがとうございます。', 'Grazie per avermi invitato oggi.', 'Thank you for inviting me today.'),
			bad('うん、まあまあだよ。', 'うん、まあまあだよ。', 'Sì, così così. (piano: maleducato col capo)', 'Yeah, so-so. (plain: rude to your boss)', 'piano = maleducato col capo: serve umile/onorifico'),
			bad('ゴルフするの？', 'ゴルフするの？', 'Giochi a golf? (piano: maleducato col capo)', 'Do you play golf? (plain: rude to your boss)', 'piano = maleducato col capo: serve umile/onorifico')
		]
	},
	{
		theme: 'work',
		npc: npcLine('最近、仕事はどうですか？', 'さいきん、しごとは どうですか？', 'Come va il lavoro ultimamente?', 'How\'s work going lately?'),
		options: [
			ok('はい、おかげさまで頑張っております。', 'はい、おかげさまで がんばって おります。', 'Sì, grazie, mi sto impegnando (umile).', 'Yes, thanks to you, I\'ve been doing my best (humble).'),
			bad('うん、まあまあだよ。', 'うん、まあまあだよ。', 'Sì, così così. (piano: maleducato col capo)', 'Yeah, so-so. (plain: rude to your boss)', 'piano = maleducato col capo: serve umile/onorifico'),
			bad('ゴルフするの？', 'ゴルフするの？', 'Giochi a golf? (fuori tema e piano)', 'Do you play golf? (off-topic and plain)', 'non risponde al tema lavoro ed è in piano: maleducato col capo')
		]
	},
	{
		theme: 'hobby',
		npc: npcLine('何か趣味はありますか？', 'なにか しゅみは ありますか？', 'Ha qualche hobby?', 'Do you have any hobbies?'),
		options: [
			ok('休みの日は本を読んでおります。', 'やすみのひは ほんを よんでおります。', 'Nei giorni liberi leggo libri (umile).', 'On my days off, I read books (humble).'),
			bad('うん、まあまあだよ。', 'うん、まあまあだよ。', 'Sì, così così. (fuori tema e piano)', 'Yeah, so-so. (off-topic and plain)', 'non risponde al tema hobby ed è in piano: maleducato col capo'),
			bad('ゴルフするの？', 'ゴルフするの？', 'Giochi a golf? (piano: maleducato col capo)', 'Do you play golf? (plain: rude to your boss)', 'piano = maleducato col capo: serve umile/onorifico')
		]
	},
	{
		theme: 'family',
		npc: npcLine('私は週末よくゴルフに行くんですよ。', 'わたしは しゅうまつ よく ゴルフに いくんですよ。', 'Nel weekend vado spesso a giocare a golf, sa.', 'On weekends I often go play golf, you know.'),
		options: [
			ok('部長もゴルフをなさるんですか。', 'ぶちょうも ゴルフを なさるんですか。', 'Anche lei, direttore, gioca a golf? (onorifico)', 'Do you play golf too, director? (honorific)'),
			bad('うん、まあまあだよ。', 'うん、まあまあだよ。', 'Sì, così così. (fuori tema e piano)', 'Yeah, so-so. (off-topic and plain)', 'non è una reazione pertinente ed è in piano: maleducato col capo'),
			bad('ゴルフするの？', 'ゴルフするの？', 'Giochi a golf? (piano: maleducato col capo)', 'Do you play golf? (plain: rude to your boss)', 'piano = maleducato col capo: verso il capo serve なさる (onorifico)')
		]
	},
	{
		theme: 'closing',
		npc: npcLine('今日はありがとう。気をつけて帰ってね。', 'きょうは ありがとう。きを つけて かえってね。', 'Grazie per oggi. Torna a casa con attenzione.', 'Thanks for today. Take care on your way home.'),
		options: [
			ok('本日はお招きいただき、ありがとうございます。', 'ほんじつは おまねき いただき、ありがとうございます。', 'Grazie per avermi invitato oggi.', 'Thank you for inviting me today.'),
			bad('うん、まあまあだよ。', 'うん、まあまあだよ。', 'Sì, così così. (piano: maleducato col capo)', 'Yeah, so-so. (plain: rude to your boss)', 'piano = maleducato col capo: serve umile/onorifico'),
			bad('ゴルフするの？', 'ゴルフするの？', 'Giochi a golf? (fuori tema e piano)', 'Do you play golf? (off-topic and plain)', 'non è una chiusura appropriata ed è in piano: maleducato col capo')
		]
	}
];

export const SCENARIOS: Scenario[] = [
	{
		id: 'shotaimen',
		icon: '🤝',
		label: 'Prima conoscenza',
		context: 'Conoscente nuovo — registro 丁寧 (です・ます)',
		register: 'teinei',
		npc: 'Tanaka',
		npcIcon: '🙂',
		themes: SHOTAIMEN_THEMES
	},
	{
		id: 'tomodachi',
		icon: '🫂',
		label: 'Amico/famiglia',
		context: 'Amico stretto — registro 普通体 (tame-guchi)',
		register: 'plain',
		npc: 'amico',
		npcIcon: '🧑',
		themes: TOMODACHI_THEMES
	},
	{
		id: 'joushi',
		icon: '🍻',
		label: 'Capo / cena aziendale',
		context: 'Superiore — 敬語 asimmetrico (umile/onorifico verso di lui)',
		register: 'keigo',
		npc: 'capo',
		npcIcon: '👔',
		themes: JOUSHI_THEMES
	}
];

export function findScenario(id: ScenarioId): Scenario {
	const s = SCENARIOS.find((x) => x.id === id);
	if (!s) throw new Error(`Scenario sconosciuto: ${id}`);
	return s;
}

// ── Costruzione turni ──
// Un turno = una battuta NPC (di un tema) + le opzioni utente mescolate.
export interface Turn {
	theme: Theme;
	npcLine: Line;
	options: Option[]; // mescolate
	correctIndex: number;
}

function shuffleArr<T>(xs: readonly T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Mescola l'ordine dei temi "centrali" (tutto tranne greeting/closing, che
// aprono/chiudono sempre la conversazione) e costruisce la lista dei turni.
export function buildTurns(scenario: Scenario): Turn[] {
	const greeting = scenario.themes.find((t) => t.theme === 'greeting');
	const closing = scenario.themes.find((t) => t.theme === 'closing');
	const middle = scenario.themes.filter((t) => t.theme !== 'greeting' && t.theme !== 'closing');
	const order = [
		...(greeting ? [greeting] : []),
		...shuffleArr(middle),
		...(closing ? [closing] : [])
	];
	return order.map((bank) => {
		const options = shuffleArr(bank.options);
		const correctIndex = options.findIndex((o) => o.correct);
		return { theme: bank.theme, npcLine: bank.npc, options, correctIndex };
	});
}

// ── Punteggio ──
// Base per turno corretto + bonus se pochi errori/hint usati.
export function computeScore(turnsTotal: number, correct: number, hintsUsed: number): number {
	const base = correct * 20;
	const accuracyBonus = turnsTotal > 0 && correct === turnsTotal ? 30 : 0;
	const hintPenalty = hintsUsed * 8;
	return Math.max(0, base + accuracyBonus - hintPenalty);
}

// ── Parola-chiave del tema per il consolidamento (recordPracticeMiss) ──
// Solo i temi la cui parola-chiave esiste nel catalogo (verificato a mano
// contro static/seed-n5n4.json): 趣味, 仕事, 家族, 学校. 出身 non è nel
// catalogo come voce propria: nessuna parola-chiave per 'origin'/'greeting'/
// 'closing' → per quei temi la UI non registra la miss (vedi spec: "in dubbio
// ometti la registrazione").
export const THEME_KEYWORD: Partial<Record<Theme, string>> = {
	work: '仕事',
	hobby: '趣味',
	family: '家族'
};
