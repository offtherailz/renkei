import { describe, expect, it } from "vitest";
import { facetOfMode, applicableFacets, facetsToTrain, FACET_UNLOCK_STAGE, FACET_META } from "./facets";
import { bumpFacet, createInitialSrs, FACET_FIELDS } from "./srs";
import type { Word } from "../types/models";

function makeWord(over: Partial<Word>): Word {
	return {
		id: "x",
		scrittura: "食べる",
		lettura: "たべる",
		significato: { it: ["mangiare"], en: ["to eat"] },
		livello_jlpt: "N5",
		tipo_jp: "動詞[どうし]",
		kanji_usati: ["食"],
		sinonimi: [],
		contrari: [],
		omofoni: [],
		updated_at: 0,
		...over
	} as unknown as Word;
}

describe("facetOfMode", () => {
	it("mappa i modi alle celle giuste", () => {
		expect(facetOfMode("flashcard-recognition")).toBe("facet_meaning_r");
		expect(facetOfMode("multiple-choice")).toBe("facet_meaning_r");
		expect(facetOfMode("flashcard-production")).toBe("facet_meaning_p");
		expect(facetOfMode("flashcard-reading-recognition")).toBe("facet_form_read");
		expect(facetOfMode("reading-choice")).toBe("facet_form_read");
		expect(facetOfMode("listening")).toBe("facet_form_listen");
		expect(facetOfMode("particle-cloze")).toBe("facet_use");
		expect(facetOfMode("conjugation")).toBe("facet_use");
		expect(facetOfMode("transitivity-pair")).toBe("facet_use");
	});

	it("contatori/orario: nessuna cella della parola", () => {
		expect(facetOfMode("counter-quiz")).toBeNull();
		expect(facetOfMode("counter-reading")).toBeNull();
		expect(facetOfMode("time-reading")).toBeNull();
	});
});

describe("applicableFacets", () => {
	it("verbo con kanji e frasi: tutte le celle", () => {
		const w = makeWord({ frasi_esempio: [{ testo: "パンを食べる。", traduzione: { it: "Mangio il pane." } }] } as Partial<Word>);
		const set = applicableFacets(w);
		for (const f of FACET_FIELDS) expect(set.has(f), f).toBe(true);
	});

	it("parola full-kana (くれる): niente Leggere/Scrivere", () => {
		const w = makeWord({ scrittura: "くれる", lettura: "くれる", kanji_usati: [] });
		const set = applicableFacets(w);
		expect(set.has("facet_form_read")).toBe(false);
		expect(set.has("facet_form_write")).toBe(false);
		expect(set.has("facet_meaning_r")).toBe(true);
	});

	it("espressione idiomatica: mai Scrivere (comporre non ha senso)", () => {
		const w = makeWord({ tipo_jp: "慣用表現[かんようひょうげん]", scrittura: "お世話になりました", lettura: "おせわになりました" });
		const set = applicableFacets(w);
		expect(set.has("facet_form_write")).toBe(false);
		expect(set.has("facet_form_read")).toBe(true);
	});

	it("nome senza frasi né contatore: niente Usare", () => {
		const w = makeWord({ tipo_jp: "名詞[めいし]", scrittura: "本", lettura: "ほん" });
		expect(applicableFacets(w).has("facet_use")).toBe(false);
	});
});

describe("facetsToTrain", () => {
	const word = makeWord({ frasi_esempio: [{ testo: "パンを食べる。", traduzione: { it: "Mangio il pane." } }] } as Partial<Word>);

	it("stage 0: solo Capire e Leggere sbloccate", () => {
		const got = facetsToTrain(word, 0, {});
		expect(got).toContain("facet_meaning_r");
		expect(got).toContain("facet_form_read");
		expect(got).not.toContain("facet_form_speak");
		expect(got).not.toContain("facet_form_write");
	});

	it("stage 4: tutte, ordinate dalla meno sviluppata", () => {
		const got = facetsToTrain(word, 4, { facet_meaning_r: 50, facet_form_read: -20, facet_use: 10 });
		expect(got[0]).toBe("facet_form_read"); // -20, la più debole
		expect(got).toContain("facet_form_write"); // sbloccata a stage 4
	});

	it("full-kana a stage alto: Scrivere resta esclusa (non applicabile)", () => {
		const kana = makeWord({ scrittura: "くれる", lettura: "くれる" });
		expect(facetsToTrain(kana, 7, {})).not.toContain("facet_form_write");
	});
});

describe("bumpFacet", () => {
	it("+4 su corretto, -6 su errore, clamp a ±100, campo giusto", () => {
		let p = createInitialSrs("word:x");
		p = bumpFacet(p, "facet_meaning_r", true);
		expect(p.facet_meaning_r).toBe(4);
		p = bumpFacet(p, "facet_meaning_r", false);
		expect(p.facet_meaning_r).toBe(-2);
		expect(p.facet_use).toBeUndefined(); // le altre non si muovono
		for (let i = 0; i < 40; i += 1) p = bumpFacet(p, "facet_meaning_r", true);
		expect(p.facet_meaning_r).toBe(100);
	});

	it("non tocca stage/mastery/data di ripasso", () => {
		const before = createInitialSrs("word:x");
		const after = bumpFacet(before, "facet_use", true);
		expect(after.srs_stage).toBe(before.srs_stage);
		expect(after.mastery_points).toBe(before.mastery_points);
		expect(after.next_review_date).toBe(before.next_review_date);
	});
});

describe("coerenza costanti", () => {
	it("FACET_META e FACET_UNLOCK_STAGE coprono tutti i campi", () => {
		expect(FACET_META.map((m) => m.field).sort()).toEqual([...FACET_FIELDS].sort());
		for (const f of FACET_FIELDS) expect(FACET_UNLOCK_STAGE[f]).toBeGreaterThanOrEqual(0);
	});
});
