// Dialoghi-trappola per l'allenamento 聴解 (stile JLPT): si ascolta senza
// testo, poi si risponde. Le trappole sono quelle vere dell'esame: correzioni
// in corsa (やっぱり), negazioni tardive, valori "esca" nominati nel dialogo.
// Riusa il sistema slot/answerSlot dei testi di lettura.

import type { JlptLevel, Slot, Question } from './readingTexts';

export interface DialogueLine {
	who: 'M' | 'F';
	parts: (string | { slot: string })[];
}

export interface ListeningDialogue {
	id: string;
	livello: JlptLevel;
	titolo: string; // per la scelta / debug
	scena: string; // contesto in italiano, mostrato PRIMA (come al JLPT)
	domanda: string; // domanda principale in giapponese, mostrata prima
	lines: DialogueLine[];
	slots: Slot[];
	questions: Question[];
}

export interface ListeningRun {
	dialogue: ListeningDialogue;
	lines: { who: 'M' | 'F'; text: string }[];
	questions: { q: string; choices: string[]; correct: number; evidenceLine?: number }[];
}

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

const norm = (s: string) => s.replace(/[\s　]/g, '');

export function instantiateListening(d: ListeningDialogue): ListeningRun {
	const picked: Record<string, string> = {};
	const pickedIdx: Record<string, number> = {};
	const simple = d.slots.filter((s) => !s.options.some((o) => o.includes('{')));
	const templated = d.slots.filter((s) => s.options.some((o) => o.includes('{')));
	for (const s of simple) {
		pickedIdx[s.id] = Math.floor(Math.random() * s.options.length);
		picked[s.id] = s.options[pickedIdx[s.id]!]!;
	}
	for (const s of templated) {
		pickedIdx[s.id] = Math.floor(Math.random() * s.options.length);
		picked[s.id] = s.options[pickedIdx[s.id]!]!.replace(/\{(\w+)\}/g, (_, id: string) => picked[id]!);
	}
	const lines = d.lines.map((l) => ({
		who: l.who,
		text: l.parts.map((p) => (typeof p === 'string' ? p : picked[p.slot]!)).join('')
	}));
	const evidenceLine = (correct: string): number | undefined => {
		const i = lines.findIndex((l) => norm(l.text).includes(norm(correct)));
		return i >= 0 ? i : undefined;
	};
	const questions = d.questions.map((q) => {
		if ('truthOf' in q) {
			const slot = d.slots.find((s) => s.id === q.truthOf)!;
			const correct = picked[slot.answerSlot![pickedIdx[slot.id]!]!]!;
			const candidateSlots = [...new Set(slot.answerSlot!)];
			const pool = [
				...candidateSlots.map((id) => picked[id]!),
				...candidateSlots.flatMap((id) => d.slots.find((s) => s.id === id)!.options)
			].filter((v) => v !== correct && !v.includes('{'));
			const others = [...new Set(pool)].slice(0, 3);
			const choices = shuffle([correct, ...others]);
			return { q: q.q, choices, correct: choices.indexOf(correct), evidenceLine: evidenceLine(correct) };
		}
		if ('slot' in q) {
			const slot = d.slots.find((s) => s.id === q.slot)!;
			const correct = picked[q.slot]!;
			const crossTraps = d.slots
				.filter((s) => s.id !== q.slot && s.kind !== undefined && s.kind === slot.kind)
				.map((s) => picked[s.id]!)
				.filter((v) => v !== correct);
			const sameSlot = shuffle(slot.options.filter((o) => o !== correct && !crossTraps.includes(o)));
			const others = [...new Set([...crossTraps, ...sameSlot])].slice(0, 3);
			const choices = shuffle([correct, ...others]);
			return { q: q.q, choices, correct: choices.indexOf(correct), evidenceLine: evidenceLine(correct) };
		}
		const order = shuffle(q.choices.map((_, i) => i));
		return {
			q: q.q,
			choices: order.map((i) => q.choices[i]!),
			correct: order.indexOf(q.correct),
			evidenceLine: evidenceLine(q.choices[q.correct]!)
		};
	});
	return { dialogue: d, lines, questions };
}

export const LISTENING_DIALOGUES: ListeningDialogue[] = [
	// ───────────────────────────── N5 ─────────────────────────────
	{
		id: 'n5-yakusoku',
		livello: 'N5',
		titolo: 'Appuntamento',
		scena: 'Due amici si mettono d’accordo per domani.',
		domanda: 'ふたりは　あした　なんじに　あいますか。',
		lines: [
			{ who: 'F', parts: ['あした、', { slot: 't1' }, 'に　', { slot: 'place' }, 'で　あいましょう。'] },
			{ who: 'M', parts: [{ slot: 't1' }, 'ですね。', { slot: 'rev' }] },
			{ who: 'F', parts: ['わかりました。じゃ、そうしましょう。'] }
		],
		slots: [
			{ id: 't1', options: ['さんじ', 'よじ'], kind: 'ora' },
			{ id: 't2', options: ['ごじ', 'ろくじ'], kind: 'ora' },
			{ id: 'place', options: ['えきの　まえ', 'としょかんの　まえ', 'こうえんの　いりぐち'] },
			{
				id: 'rev',
				options: [
					'はい、だいじょうぶです。',
					'すみません、{t2}に　して　ください。',
					'{t2}が　いいです。…あ、いえ、やっぱり　{t1}で　おねがいします。'
				],
				answerSlot: ['t1', 't2', 't1']
			}
		],
		questions: [
			{ q: 'ふたりは　なんじに　あいますか。', truthOf: 'rev' },
			{ q: 'どこで　あいますか。', slot: 'place' }
		]
	},
	{
		id: 'n5-otsukai',
		livello: 'N5',
		titolo: 'La spesa',
		scena: 'La mamma chiede al figlio di comprare qualcosa.',
		domanda: 'おとこのこは　なにを　かいますか。',
		lines: [
			{ who: 'F', parts: ['スーパーで　', { slot: 'item1' }, 'を　かってきて。'] },
			{ who: 'M', parts: [{ slot: 'item1' }, 'だけ？'] },
			{ who: 'F', parts: [{ slot: 'rev' }] },
			{ who: 'M', parts: ['わかった。いってきます！'] }
		],
		slots: [
			{ id: 'item1', options: ['たまご', 'ぎゅうにゅう'], kind: 'cibo' },
			{ id: 'item2', options: ['パン', 'おちゃ'], kind: 'cibo' },
			{
				id: 'rev',
				options: [
					'うん、それだけで　いいよ。',
					'あ、ごめん、{item1}じゃなくて、{item2}を　おねがい。',
					'{item2}も…。ううん、やっぱり　{item1}だけで　いいよ。'
				],
				answerSlot: ['item1', 'item2', 'item1']
			}
		],
		questions: [{ q: 'おとこのこは　なにを　かいますか。', truthOf: 'rev' }]
	},
	{
		id: 'n5-dokoiku',
		livello: 'N5',
		titolo: 'Dove andiamo?',
		scena: 'Due amici decidono dove andare domani.',
		domanda: 'ふたりは　あした　どこへ　いきますか。',
		lines: [
			{ who: 'M', parts: ['あした、', { slot: 'place1' }, 'に　いきませんか。'] },
			{ who: 'F', parts: ['いいですね。でも、あしたは　', { slot: 'weather' }, 'ですよ。'] },
			{ who: 'M', parts: ['そうですか…。', { slot: 'rev' }] },
			{ who: 'F', parts: ['はい、そうしましょう。'] }
		],
		slots: [
			{ id: 'place1', options: ['こうえん', 'どうぶつえん'], kind: 'luogo' },
			{ id: 'place2', options: ['えいがかん', 'びじゅつかん'], kind: 'luogo' },
			{ id: 'weather', options: ['あめ', 'ゆき'] },
			{
				id: 'rev',
				options: [
					'じゃあ、{place2}に　しましょう。',
					'だいじょうぶですよ、かさが　ありますから。{place1}に　いきましょう。'
				],
				answerSlot: ['place2', 'place1']
			}
		],
		questions: [
			{ q: 'ふたりは　どこへ　いきますか。', truthOf: 'rev' },
			{ q: 'あしたの　てんきは　どうですか。', slot: 'weather' }
		]
	},
	{
		id: 'n5-kaban',
		livello: 'N5',
		titolo: 'Quale borsa?',
		scena: 'Una signora compra una borsa in negozio.',
		domanda: 'おんなのひとは　なにいろの　かばんを　かいますか。',
		lines: [
			{ who: 'F', parts: ['すみません、その　かばんを　みせて　ください。'] },
			{ who: 'M', parts: [{ slot: 'color1' }, 'のと　', { slot: 'color2' }, 'の、どちらですか。'] },
			{ who: 'F', parts: [{ slot: 'color1' }, 'のは　いくらですか。'] },
			{ who: 'M', parts: [{ slot: 'color1' }, 'のは　', { slot: 'price1' }, 'えんです。', { slot: 'color2' }, 'のは　', { slot: 'price2' }, 'えんです。'] },
			{ who: 'F', parts: [{ slot: 'rev' }] }
		],
		slots: [
			{ id: 'color1', options: ['あかい', 'くろい'], kind: 'colore' },
			{ id: 'color2', options: ['あおい', 'しろい'], kind: 'colore' },
			{ id: 'price1', options: ['さんぜん', 'よんせん'], kind: 'prezzo' },
			{ id: 'price2', options: ['せんごひゃく', 'にせん'], kind: 'prezzo' },
			{
				id: 'rev',
				options: [
					'じゃあ、{color1}のを　ください。',
					'うーん、ちょっと　たかいですね。{color2}のを　ください。'
				],
				answerSlot: ['color1', 'color2']
			}
		],
		questions: [
			{ q: 'おんなのひとは　なにいろの　かばんを　かいますか。', truthOf: 'rev' },
			{ q: 'はじめの　かばんは　いくらですか。（〜えん）', slot: 'price1' }
		]
	},
	{
		id: 'n5-densha',
		livello: 'N5',
		titolo: 'Che treno prende?',
		scena: 'Un signore chiede informazioni in stazione.',
		domanda: 'おとこのひとは　なんじの　でんしゃに　のりますか。',
		lines: [
			{ who: 'M', parts: ['すみません、', { slot: 't1' }, 'の　でんしゃは　もう　でましたか。'] },
			{ who: 'F', parts: ['はい、', { slot: 't1' }, 'のは　もう　でました。つぎは　', { slot: 't2' }, 'です。'] },
			{ who: 'M', parts: ['そうですか。じゃあ、それに　のります。'] }
		],
		slots: [
			{ id: 't1', options: ['くじ', 'じゅうじ'], kind: 'ora' },
			{ id: 't2', options: ['くじはん', 'じゅうじはん'], kind: 'ora' }
		],
		questions: [
			{ q: 'おとこのひとは　なんじの　でんしゃに　のりますか。', slot: 't2' },
			{ q: 'なんじの　でんしゃは　もう　でましたか。', slot: 't1' }
		]
	},
	// ───────────────────────────── N4 ─────────────────────────────
	{
		id: 'n4-kaigi-voice',
		livello: 'N4',
		titolo: 'Messaggio: la riunione',
		scena: 'Un collega lascia un messaggio vocale sulla riunione.',
		domanda: '会議は何時から始まりますか。',
		lines: [
			{
				who: 'M',
				parts: [
					'もしもし、田中です。',
					{ slot: 'day' },
					'の会議ですが、',
					{ slot: 't1' },
					'からの予定でしたね。',
					{ slot: 'rev' },
					'よろしくお願いします。'
				]
			}
		],
		slots: [
			{ id: 'day', options: ['火曜日', '木曜日'] },
			{ id: 't1', options: ['十時', '十時半'], kind: 'ora' },
			{ id: 't2', options: ['一時', '二時'], kind: 'ora' },
			{ id: 't3', options: ['三時', '四時'], kind: 'ora' },
			{
				id: 'rev',
				options: [
					'変更はありませんので、予定どおりです。',
					'すみませんが、{t2}からに変わりました。',
					'一度{t2}からになりましたが、また変わって、結局{t1}からです。',
					'{t2}からに変更になって、そのあと{t3}からになりました。'
				],
				answerSlot: ['t1', 't2', 't1', 't3']
			}
		],
		questions: [
			{ q: '会議は何時から始まりますか。', truthOf: 'rev' },
			{ q: '会議は何曜日ですか。', slot: 'day' }
		]
	},
	{
		id: 'n4-chumon',
		livello: 'N4',
		titolo: 'Ordine al ristorante',
		scena: 'Un cliente ordina, poi ci ripensa.',
		domanda: '一つ目の料理は、結局いくつになりましたか。',
		lines: [
			{ who: 'M', parts: ['すみません、', { slot: 'dish1' }, 'を', { slot: 'c2' }, 'と、', { slot: 'dish2' }, 'を一つください。'] },
			{ who: 'F', parts: ['はい、', { slot: 'dish1' }, 'を', { slot: 'c2' }, 'と、', { slot: 'dish2' }, 'を一つですね。'] },
			{ who: 'M', parts: ['あ、すみません。', { slot: 'rev' }] },
			{ who: 'F', parts: ['かしこまりました。少々お待ちください。'] }
		],
		slots: [
			{ id: 'dish1', options: ['ラーメン', 'カレー'], kind: 'piatto' },
			{ id: 'dish2', options: ['ぎょうざ', 'サラダ'], kind: 'piatto' },
			{ id: 'c1', options: ['一つ'] },
			{ id: 'c2', options: ['二つ'] },
			{ id: 'c3', options: ['三つ'] },
			{
				id: 'rev',
				options: [
					'やっぱり{dish1}は{c1}でお願いします。',
					'{dish1}を{c3}にしてください。',
					'いえ、そのままで大丈夫です。'
				],
				answerSlot: ['c1', 'c3', 'c2']
			}
		],
		questions: [
			{ q: '一つ目の料理は、結局いくつになりましたか。', truthOf: 'rev' },
			{ q: '男の人は何を頼みましたか。（一つ目）', slot: 'dish1' }
		]
	},
	{
		id: 'n4-bijutsukan',
		livello: 'N4',
		titolo: 'Come ci va?',
		scena: 'Una signora chiede come arrivare al museo.',
		domanda: '女の人は何で美術館へ行きますか。',
		lines: [
			{ who: 'F', parts: ['すみません、美術館へ行きたいんですが。'] },
			{
				who: 'M',
				parts: [
					'バスと電車がありますよ。バスは',
					{ slot: 'min1' },
					'ぐらいかかります。電車は',
					{ slot: 'min2' },
					'ですが、駅から少し歩きますよ。'
				]
			},
			{ who: 'F', parts: [{ slot: 'rev' }, 'ありがとうございました。'] }
		],
		slots: [
			{ id: 'min1', options: ['三十分', '四十分'], kind: 'durata' },
			{ id: 'min2', options: ['十分', '十五分'], kind: 'durata' },
			{ id: 'hb', options: ['バス'] },
			{ id: 'ht', options: ['電車'] },
			{
				id: 'rev',
				options: ['じゃあ、{ht}で行きます。', '歩くのはちょっと…。{hb}にします。'],
				answerSlot: ['ht', 'hb']
			}
		],
		questions: [
			{ q: '女の人は何で行きますか。', truthOf: 'rev' },
			{ q: 'バスはどのぐらいかかりますか。', slot: 'min1' }
		]
	},
	{
		id: 'n4-report',
		livello: 'N4',
		titolo: 'La consegna',
		scena: 'L’insegnante spiega quando consegnare il report.',
		domanda: 'レポートはいつまでに出しますか。',
		lines: [
			{
				who: 'F',
				parts: [
					'レポートは',
					{ slot: 'day1' },
					'までに出してください。',
					{ slot: 'rev' },
					'メールでは受け取りませんから、直接持ってきてくださいね。'
				]
			},
			{ who: 'M', parts: ['はい、わかりました。'] }
		],
		slots: [
			{ id: 'day1', options: ['金曜日', '木曜日'], kind: 'giorno' },
			{ id: 'day2', options: ['月曜日', '水曜日'], kind: 'giorno' },
			{
				id: 'rev',
				options: [
					'締め切りは変わりませんよ。',
					'あ、すみません、{day1}じゃなくて{day2}までです。間違えないでください。'
				],
				answerSlot: ['day1', 'day2']
			}
		],
		questions: [
			{ q: 'レポートはいつまでに出しますか。', truthOf: 'rev' },
			{
				q: 'レポートはどうやって出しますか。',
				choices: ['直接持っていく', 'メールで送る', '郵便で送る', '出さなくてもいい'],
				correct: 0
			}
		]
	},
	{
		id: 'n4-rusuden',
		livello: 'N4',
		titolo: 'Il messaggio in segreteria',
		scena: 'Una collega lascia un messaggio: cosa deve fare il collega?',
		domanda: '男の人は何をしなければなりませんか。',
		lines: [
			{
				who: 'F',
				parts: [
					'お疲れさまです、山田です。すみませんが、',
					{ slot: 'task1' },
					'。',
					{ slot: 'rev' },
					'では、お願いします。'
				]
			}
		],
		slots: [
			{
				id: 'task1',
				options: ['会議の資料をコピーしておいてください', '会議室を予約しておいてください'],
				kind: 'compito'
			},
			{
				id: 'task2',
				options: ['部長にメールを送っておいてください', 'お客様に電話しておいてください'],
				kind: 'compito'
			},
			{
				id: 'rev',
				options: [
					'それだけで大丈夫です。',
					'あ、それはもういいです。かわりに、{task2}。'
				],
				answerSlot: ['task1', 'task2']
			}
		],
		questions: [{ q: '男の人は何をしなければなりませんか。', truthOf: 'rev' }]
	}
];
