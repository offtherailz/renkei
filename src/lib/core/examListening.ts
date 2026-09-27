// Lettura a più voci di una domanda d'ascolto d'esame, in formato JLPT:
//  1) annuncio (narratore, femminile): inquadra la scena + legge la domanda
//  2) il dialogo, con voce femminile per 女 e maschile per 男 (e ruoli affini)
//  3) la domanda ripetuta alla fine (come nell'esame vero)
// Le domande senza dialogo (annunci/meteo/即時応答) si leggono a voce singola.

import { speakSentenceJapaneseAsync, stopSpeaking, type SpeakOptions } from './tts';
import { voiceParams, type Gender } from './voices';

// Token per interrompere una lettura in corso quando ne parte un'altra / si esce.
let playToken = 0;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Seg {
	text?: string;
	options?: SpeakOptions;
	pause?: number; // ms di silenzio
}
async function runSequence(items: Seg[], token: number): Promise<void> {
	for (const it of items) {
		if (token !== playToken) return; // superata da una nuova lettura / stop
		if (it.pause) {
			await delay(it.pause);
			continue;
		}
		if (it.text) await speakSentenceJapaneseAsync(it.text, it.options);
	}
}

const MALE_ROLES = new Set(['男', '男の人', '男の子', '父', '先生', '客', '店長']);
const FEMALE_ROLES = new Set(['女', '女の人', '女の子', '母', '店員', '学生']);
const NARRATOR_ROLES = new Set(['アナウンス', 'ニュース', '天気', '天気予報', '放送']);

function genderFor(role: string): Gender {
	if (MALE_ROLES.has(role)) return 'maschile';
	return 'femminile'; // 女/母/店員/… e default
}

// Estrae le battute «役:「…」» dal corpo del dialogo.
interface Line {
	role: string;
	text: string;
}
function parseLines(body: string): Line[] {
	const out: Line[] = [];
	const re = /(女の人|男の人|女の子|男の子|アナウンス|ニュース|天気予報|店員|先生|学生|子ども|客|母|父|子|女|男)\s*[：:]\s*「([^」]*)」/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body)) !== null) out.push({ role: m[1]!, text: m[2]! });
	return out;
}

// Nome del ruolo come lo direbbe il narratore d'esame.
const ROLE_NAME: Record<string, string> = {
	女: '女[おんな]の人', 女の人: '女[おんな]の人', 男: '男[おとこ]の人', 男の人: '男[おとこ]の人',
	女の子: '女[おんな]の子', 男の子: '男[おとこ]の子', 母: 'お母[かあ]さん', 父: 'お父[とう]さん',
	子: '子[こ]ども', 子ども: '子[こ]ども', 先生: '先生[せんせい]', 学生: '学生[がくせい]',
	店員: '店員[てんいん]', 客: 'お客[きゃく]さん'
};

export function speakExamListening(prompt: string, rate = 1): void {
	const token = ++playToken;
	stopSpeaking();

	// Voci nettamente diverse: narratrice = femminile con pitch/tempo distinti,
	// 女 = femminile normale, 男 = maschile. Così si capisce chi parla.
	const fBase = voiceParams('femminile');
	const narrator: SpeakOptions = { ...fBase, pitch: (fBase.pitch ?? 1) + 0.3, rate: rate * 0.92 };
	const female: SpeakOptions = { ...voiceParams('femminile'), rate };
	const male: SpeakOptions = { ...voiceParams('maschile'), rate };

	// separa la domanda finale (dopo 「問:」)
	let body = prompt;
	let question = '';
	const qIdx = body.indexOf('問:');
	if (qIdx >= 0) {
		question = body.slice(qIdx + 2).trim();
		body = body.slice(0, qIdx).trim();
	}
	// scena/cornice nel marcatore iniziale 〔…〕
	let scena = '';
	const sm = body.match(/^〔([^〕]*)〕\s*/);
	if (sm) {
		scena = sm[1]!.trim();
		body = body.slice(sm[0].length).trim();
	}

	const lines = parseLines(body);
	const items: Seg[] = [];

	// 1) annuncio: scena/cornice + domanda
	if (scena && scena !== '会話') {
		items.push({ text: scena, options: narrator });
	} else {
		const roles = [...new Set(lines.filter((l) => !NARRATOR_ROLES.has(l.role)).map((l) => l.role))];
		if (roles.length >= 2) {
			const a = ROLE_NAME[roles[0]!] ?? roles[0]!;
			const b = ROLE_NAME[roles[1]!] ?? roles[1]!;
			items.push({ text: `${a}と ${b}が 話[はな]して います。`, options: narrator });
		} else if (lines.some((l) => NARRATOR_ROLES.has(l.role))) {
			items.push({ text: 'アナウンスを 聞[き]いて ください。', options: narrator });
		}
	}
	if (question) items.push({ text: question, options: narrator });

	// pausa prima del dialogo
	items.push({ pause: 2500 });

	// 2) dialogo a voci alternate
	if (lines.length > 0) {
		for (const l of lines) {
			const opts = NARRATOR_ROLES.has(l.role) ? narrator : genderFor(l.role) === 'maschile' ? male : female;
			items.push({ text: l.text, options: opts });
		}
	} else {
		items.push({ text: body, options: female });
	}

	// pausa prima della domanda ripetuta
	if (question) {
		items.push({ pause: 2500 });
		items.push({ text: question, options: narrator });
	}

	void runSequence(items, token);
}
