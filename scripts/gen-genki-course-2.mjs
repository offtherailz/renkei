// Genera static/corso-genki-2.json: corso "Genki II" (N4) con le lezioni
// nell'ordine del libro. Come per Genki I, si mappa solo l'ORDINE delle
// strutture sul catalogo aperto: nessuna lista di vocaboli o kanji del libro
// viene copiata (sono materiale protetto). Le parole di ogni lezione sono
// quelle collegate alle frasi d'esempio della sua grammatica.
//
// Uso: node scripts/gen-genki-course-2.mjs

import fs from "node:fs/promises";

// struttura esatta (come nel catalogo N4) → numero lezione Genki II.
// 24 = "Extra": pattern N4 fuori dal percorso del libro (particelle, forme
// già incontrate in Genki I ma catalogate N4, ecc.). Le strutture non elencate
// finiscono automaticamente lì, così la copertura N4 resta del 100%.
const LESSON_OF = new Map(Object.entries({
	// L13 — potenziale, elencare motivi, «sembra», provare
	"可能形": 13, "見える/聞こえる": 13, "〜し、〜し": 13, "〜そう": 13, "〜てみる": 13, "〜なら": 13,
	// L14 — desideri, ipotesi, dare e ricevere, consigli
	"〜かもしれない": 14, "〜てあげる": 14, "〜てくれる": 14, "〜てもらう": 14, "〜たらどうですか": 14,
	// L15 — volitiva e intenzioni, preparativi
	"意向形": 15, "〜（よ）うと思う": 15, "〜ておく": 15, "予定": 15,
	// L16 — favori cortesi, «fare in modo che»
	"〜てくださる": 16, "〜てくれませんか / 〜ていただけませんか": 16, "〜ように": 16, "〜ようにする": 16, "〜ようになる": 16,
	// L17 — sentito dire, condizionale たら, «sembra»
	"〜たら": 17, "〜ようだ/みたいだ": 17, "〜ような": 17, "〜なくてもいい": 17,
	"〜という意味": 17, "〜と言う": 17, "あとで": 17, "〜てから VS 〜あとで": 17,
	// L18 — transitivi/intransitivi, stato risultante, てしまう, と, ながら, ば
	"自動詞/他動詞": 18, "いる": 18, "まだ〜ている": 18, "〜ている": 18, "〜てしまう": 18,
	"〜と": 18, "〜ながら": 18, "〜ば": 18, "条件形": 18, "〜ばよかった": 18,
	// L19 — onorifico (尊敬語), ringraziare, はず
	"敬語": 19, "お〜になる": 19, "お〜ください／ご〜ください": 19,
	"〜てくれて、ありがとう": 19, "〜てよかった": 19, "〜はず": 19,
	// L20 — umile (謙譲語), spiegare
	"謙譲語": 20, "〜んです": 20, "〜ので": 20,
	// L21 — passivo
	"受身形": 21, "〜のに": 21, "〜ても": 21,
	// L22 — causativo, chiedere permesso, scopo
	"使役形": 22, "〜せてください／〜させてください": 22, "〜ために": 22,
	// L23 — causativo-passivo, decisioni, casi
	"使役受身形": 23, "〜(に)する/にする": 23, "〜ことになる": 23, "場合": 23
}));

const TITLES = {
	13: ["L13 — アルバイトさがし", "Potenziale (可能形), 見える/聞こえる, elencare con 〜し, 〜そう, 〜てみる, 〜なら."],
	14: ["L14 — バレンタインデー", "Desideri e ipotesi (〜かもしれない), dare e ricevere (あげる・くれる・もらう), consigli con 〜たらどうですか."],
	15: ["L15 — 長野旅行", "Volitiva (意向形) e intenzioni (〜(よ)うと思う), preparativi con 〜ておく, 予定."],
	16: ["L16 — 忘れ物", "Favori cortesi (〜てくださる, 〜ていただけませんか) e 〜ように / 〜ようになる."],
	17: ["L17 — ぐちとうわさ話", "Sentito dire e apparenza (〜ようだ/みたいだ), condizionale 〜たら, 〜という意味."],
	18: ["L18 — ハプニング", "Transitivi e intransitivi, 〜ている di stato, 〜てしまう, 〜と, 〜ながら, 〜ば / 〜ばよかった."],
	19: ["L19 — 出迎え", "Keigo onorifico (尊敬語): お〜になる, お〜ください; ringraziare con 〜てくれて、ありがとう; 〜てよかった; 〜はず."],
	20: ["L20 — メアリーさんの買い物", "Keigo umile (謙譲語) e le spiegazioni con 〜んです / 〜ので."],
	21: ["L21 — どろぼう", "Passivo (受身形), 〜のに, 〜ても."],
	22: ["L22 — 日本の教育", "Causativo (使役形), chiedere permesso con 〜させてください, scopo con 〜ために."],
	23: ["L23 — 別れ", "Causativo-passivo (使役受身形), decisioni con 〜ことになる, 〜場合."],
	24: ["Extra — altri pattern N4", "Pattern N4 del catalogo fuori dal percorso di Genki II."]
};

const EXTRA_LESSON = 24;

const seed = JSON.parse(await fs.readFile("static/seed-n5n4.json", "utf8"));
const grammarN4 = seed.grammar.filter((g) => g.livello_jlpt === "N4");
const wordsById = new Map(seed.words.map((w) => [w.id, w]));

const byLesson = new Map();
let inExtra = 0;
for (const g of grammarN4) {
	const n = LESSON_OF.get(g.struttura) ?? EXTRA_LESSON;
	if (n === EXTRA_LESSON) inExtra += 1;
	if (!byLesson.has(n)) byLesson.set(n, []);
	byLesson.get(n).push(g.id);
}

const lezioni = [...Object.keys(TITLES)].map(Number).sort((a, b) => a - b).map((n) => {
	const grammatica = byLesson.get(n) ?? [];
	const parole = [];
	const seen = new Set();
	for (const gid of grammatica) {
		const g = grammarN4.find((x) => x.id === gid);
		for (const wid of g?.frasi_esempio_parole_linkate ?? []) {
			if (seen.has(wid) || !wordsById.has(wid)) continue;
			seen.add(wid);
			parole.push(wid);
			if (parole.length >= 25) break;
		}
		if (parole.length >= 25) break;
	}
	return {
		id: `L${n}`,
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
		id: "genki-2",
		nome: "Genki II (ordine del libro)",
		descrizione: "Le 11 lezioni di Genki II (L13-L23) come percorso: la grammatica N4 del catalogo nell'ordine del libro, più una lezione Extra coi pattern rimanenti.",
		autore: "Renkei (mappatura sul catalogo aperto)",
		livello_jlpt: "N4"
	},
	lezioni
};

await fs.writeFile("static/corso-genki-2.json", `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
const totGram = lezioni.reduce((s, l) => s + l.grammatica.length, 0);
console.log(`Genki II: ${lezioni.length} lezioni, ${totGram}/${grammarN4.length} voci N4 (${inExtra} in Extra), ${lezioni.reduce((s, l) => s + l.parole.length, 0)} parole.`);
for (const l of lezioni) console.log(` ${l.id} grammatica=${l.grammatica.length} parole=${l.parole.length}`);
