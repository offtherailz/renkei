// Genera static/corso-genki-1.json: corso "Genki I" (N5) con le lezioni
// nell'ordine del libro. Mappatura ESPLICITA struttura→lezione (rivista a
// mano); le parole di ogni lezione sono quelle collegate alle frasi
// d'esempio della sua grammatica.
//
// Uso: node scripts/gen-genki-course.mjs

import fs from "node:fs/promises";

// struttura esatta (come nel catalogo N5) → numero lezione Genki I.
// 13 = "Extra": pattern N5 fuori dal percorso Genki I.
const LESSON_OF = new Map(Object.entries({
	"〜は〜です": 1, "だ・です": 1, "は": 1, "か": 1, "の": 1,
	"じゃない・ではない": 2, "も": 2, "ね": 2, "よ": 2, "をください": 2,
	"を": 3, "で": 3, "に": 3, "に/へ": 3, "〜に行く": 3, "ませんか": 3,
	"があります": 4, "がいます": 4, "と": 4, "前に": 4, "が": 4,
	"い形容詞": 5, "な形容詞": 5, "ましょう": 5, "ましょうか": 5, "どんな": 5, "はどうですか": 5,
	"てください": 6, "てもいいです": 6, "なくてもいい": 6, "てはいけない": 6, "ちゃいけない・じゃいけない": 6, "てから": 6,
	"〜ている／〜でいる": 7,
	"ないでください": 8, "ないで": 8, "のが好き": 8, "のが上手": 8, "のが下手": 8,
	"から": 9, "まだ": 9, "まだ〜ていません": 9, "けど": 9, "でも": 9, "しかし": 9, "けれども": 9,
	"は〜より・・・です": 10, "より〜ほうが": 10, "一番": 10, "〜の中で〜が一番〜": 10, "〜くなる／〜になる": 10, "つもり": 10, "どうやって": 10,
	"たい": 11, "がほしい": 11, "たり〜たり": 11, "たことがある": 11, "や": 11,
	"んです": 12, "のです": 12, "ので": 12, "ほうがいい": 12, "すぎる": 12, "なくてはいけない": 12, "なくちゃ": 12, "なくてはならない": 12, "でしょう": 12, "だろう": 12, "どうして": 12,
	"いつも": 13, "とても": 13, "もう": 13, "だけ": 13, "まで": 13, "なあ": 13, "方": 13, "か〜か": 13, "てある": 13, "にする": 13, "一緒に": 13, "とき": 13
}));

const TITLES = {
	1: ["L1 — あたらしいともだち", "Presentarsi: XはYです, の del possesso, domande con か."],
	2: ["L2 — かいもの", "Indicare le cose: じゃないです, も, ね/よ, 〜をください."],
	3: ["L3 — デートのやくそく", "I verbi in ます e le particelle を・で・に・へ; inviti con ませんか."],
	4: ["L4 — はじめてのデート", "Esserci: あります/います; が; と; posizioni (前に)."],
	5: ["L5 — おきなわりょこう", "Aggettivi い e な; proposte con ましょう; どんな."],
	6: ["L6 — ロバートさんのいちにち", "La forma in て: richieste, permessi e divieti."],
	7: ["L7 — かぞくのしゃしん", "〜ている: azioni in corso e stati."],
	8: ["L8 — バーベキュー", "〜ないでください e の nominalizzatore (のが好き/上手)."],
	9: ["L9 — かぶき", "Motivi con から; まだ〜ていません; le congiunzioni «ma»."],
	10: ["L10 — ふゆやすみのよてい", "Confronti (より・一番); 〜つもり; 〜くなる/〜になる."],
	11: ["L11 — やすみのあと", "Desideri (〜たい/〜がほしい); 〜たり〜たり; 〜たことがある."],
	12: ["L12 — びょうき", "Spiegazioni (〜んです); consigli (〜ほうがいい); obblighi."],
	13: ["Extra — altri pattern N5", "Pattern N5 utili fuori dal percorso Genki I."]
};

const seed = JSON.parse(await fs.readFile("static/seed-n5n4.json", "utf8"));
const grammarN5 = seed.grammar.filter((g) => g.livello_jlpt === "N5");
const wordsById = new Map(seed.words.map((w) => [w.id, w]));

const byLesson = new Map();
const unassigned = [];
for (const g of grammarN5) {
	const n = LESSON_OF.get(g.struttura);
	if (!n) {
		unassigned.push(`${g.id} ${g.struttura}`);
		continue;
	}
	if (!byLesson.has(n)) byLesson.set(n, []);
	byLesson.get(n).push(g.id);
}

const lezioni = [...Object.keys(TITLES)].map(Number).sort((a, b) => a - b).map((n) => {
	const grammatica = byLesson.get(n) ?? [];
	const parole = [];
	const seen = new Set();
	for (const gid of grammatica) {
		const g = grammarN5.find((x) => x.id === gid);
		for (const wid of g?.frasi_esempio_parole_linkate ?? []) {
			if (seen.has(wid) || !wordsById.has(wid)) continue;
			seen.add(wid);
			parole.push(wid);
			if (parole.length >= 25) break;
		}
		if (parole.length >= 25) break;
	}
	return {
		id: `L${String(n).padStart(2, "0")}`,
		numero: n,
		titolo: TITLES[n][0],
		descrizione: TITLES[n][1],
		parole,
		kanji: [],
		grammatica
	};
});

const dataset = {
	versione: "1.0",
	corso: {
		id: "genki-1",
		nome: "Genki I (ordine del libro)",
		descrizione: "Le 12 lezioni di Genki I come percorso: la grammatica N5 del catalogo nell'ordine del libro, più una lezione Extra coi pattern rimanenti.",
		autore: "Renkei (mappatura sul catalogo aperto)",
		livello_jlpt: "N5"
	},
	lezioni
};

await fs.writeFile("static/corso-genki-1.json", `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(`Genki I: ${lezioni.length} lezioni, ${lezioni.reduce((s, l) => s + l.grammatica.length, 0)}/${grammarN5.length} voci N5, ${lezioni.reduce((s, l) => s + l.parole.length, 0)} parole.`);
for (const l of lezioni) console.log(` ${l.id} grammatica=${l.grammatica.length} parole=${l.parole.length}`);
if (unassigned.length) console.log("NON ASSEGNATE:\n " + unassigned.join("\n "));
