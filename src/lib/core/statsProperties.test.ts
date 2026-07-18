import { describe, it, expect } from "vitest";
import {
  createInitialSrs,
  applySrsReview,
  applyPracticeReview,
  bumpFacet,
  FACET_FIELDS,
  normalizeMastery,
  normalizePracticeOnlyMastery,
  touchReviewDate,
  markKnown
} from "./srs";
import { facetsToTrain, applicableFacets, FACET_UNLOCK_STAGE } from "./facets";
import { calculateQuizXp } from "../quiz/engine";
import type { SrsProgress, Word, JLPTLevel } from "../types/models";
import type { XpInput } from "../quiz/types";

// Test di PROPRIETÀ (18/07): non esempi a campione ma invarianti verificate su
// TUTTO il dominio — ogni stage, ogni cella, ogni modo di domanda, ogni livello.
// Consolidano il contratto degli algoritmi di punteggio: le statistiche devono
// crescere quando si risponde bene, restare nei limiti, e ogni scrittura deve
// toccare SOLO i campi che le competono.

const NOW = new Date(2026, 0, 10, 9, 0, 0).getTime();
const STAGES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function atStage(stage: number, extra: Partial<SrsProgress> = {}): SrsProgress {
  return { ...createInitialSrs("word:x", NOW), srs_stage: stage as SrsProgress["srs_stage"], ...extra };
}

describe("applySrsReview: invarianti su tutto il dominio", () => {
  it("per ogni stage e per entrambi gli esiti, i campi restano nei limiti", () => {
    for (const stage of STAGES) {
      for (const correct of [true, false]) {
        for (const ease of [1.3, 2.3, 2.8]) {
          const next = applySrsReview(atStage(stage, { ease_factor: ease }), correct, NOW);
          expect(next.srs_stage).toBeGreaterThanOrEqual(0);
          expect(next.srs_stage).toBeLessThanOrEqual(7);
          expect(next.ease_factor).toBeGreaterThanOrEqual(1.3);
          expect(next.ease_factor).toBeLessThanOrEqual(2.8);
          expect(next.mastery_points).toBeGreaterThanOrEqual(-100);
          expect(next.mastery_points).toBeLessThanOrEqual(100);
          expect(next.updated_at).toBe(NOW);
        }
      }
    }
  });

  it("risposta giusta: OGNI statistica di crescita cresce (stage, ease, streak, mastery, data)", () => {
    for (const stage of STAGES) {
      const before = atStage(stage, { mastery_points: 0, streak: 2, ease_factor: 2.0 });
      const next = applySrsReview(before, true, NOW);
      expect(next.srs_stage).toBe(Math.min(stage + 1, 7));
      expect(next.ease_factor).toBeGreaterThan(before.ease_factor);
      expect(next.streak).toBe(3);
      expect(next.mastery_points).toBeGreaterThan(before.mastery_points);
      expect(next.next_review_date).toBeGreaterThan(NOW);
      expect(next.lapses ?? 0).toBe(0);
    }
  });

  it("il premio di mastery cresce con lo stage (12 + stage raggiunto)", () => {
    let prevDelta = 0;
    for (const stage of STAGES) {
      const next = applySrsReview(atStage(stage, { mastery_points: 0 }), true, NOW);
      const delta = next.mastery_points;
      expect(delta).toBeGreaterThanOrEqual(prevDelta);
      prevDelta = delta;
    }
  });

  it("risposta sbagliata: stage giù, streak azzerata, lapse contato, ritorno a 8 minuti — per ogni stage", () => {
    for (const stage of STAGES) {
      const before = atStage(stage, { streak: 5, lapses: 2 });
      const next = applySrsReview(before, false, NOW);
      expect(next.srs_stage).toBe(Math.max(stage - 1, 0));
      expect(next.streak).toBe(0);
      expect(next.lapses).toBe(3);
      expect(next.next_review_date).toBe(NOW + 8 * 60_000);
    }
  });

  it("l'intervallo cresce strettamente a ogni stage (la scala SRS è una scala)", () => {
    let prev = 0;
    for (const stage of STAGES.slice(0, 7)) {
      const next = applySrsReview(atStage(stage, { ease_factor: 2.3 }), true, NOW);
      const interval = next.next_review_date - NOW;
      expect(interval).toBeGreaterThan(prev);
      prev = interval;
    }
  });
});

describe("applyPracticeReview: tocca SOLO ciò che le compete", () => {
  it("qualunque sia lo stato di partenza, cambia solo mastery/lapses/updated_at", () => {
    for (const stage of STAGES) {
      for (const correct of [true, false]) {
        const before = atStage(stage, { mastery_points: 10, streak: 4, lapses: 1, ease_factor: 2.1 });
        const next = applyPracticeReview(before, correct, NOW);
        // campi che DEVONO restare identici (la pratica non muove il calendario)
        expect(next.srs_stage).toBe(before.srs_stage);
        expect(next.next_review_date).toBe(before.next_review_date);
        expect(next.ease_factor).toBe(before.ease_factor);
        expect(next.streak).toBe(before.streak);
        expect(next.buried).toBe(before.buried);
        // campi che si muovono, nel verso giusto
        expect(next.mastery_points).toBe(before.mastery_points + (correct ? 4 : -6));
        expect(next.lapses).toBe((before.lapses ?? 0) + (correct ? 0 : 1));
      }
    }
  });
});

describe("bumpFacet: ogni cella cresce e cala nel suo campo, senza toccare il resto", () => {
  it("per OGNI cella: +4 su giusto, -6 su sbagliato, clamp ±100, altre celle intatte", () => {
    for (const field of FACET_FIELDS) {
      const base = atStage(3, { mastery_points: 42 });
      const up = bumpFacet(base, field, true, NOW);
      expect(up[field]).toBe(4);
      const down = bumpFacet(up, field, false, NOW);
      expect(down[field]).toBe(-2);
      // clamp ai due estremi
      expect(bumpFacet({ ...base, [field]: 99 }, field, true, NOW)[field]).toBe(100);
      expect(bumpFacet({ ...base, [field]: -98 }, field, false, NOW)[field]).toBe(-100);
      // le ALTRE celle e le statistiche SRS non si muovono
      for (const other of FACET_FIELDS) {
        if (other !== field) expect(up[other] ?? 0).toBe(base[other] ?? 0);
      }
      expect(up.srs_stage).toBe(base.srs_stage);
      expect(up.mastery_points).toBe(base.mastery_points);
      expect(up.next_review_date).toBe(base.next_review_date);
    }
  });
});

describe("normalizzazioni: 0-100 e monotone", () => {
  it("normalizeMastery è dentro 0-100 e cresce con stage e punti", () => {
    let prevByStage = -1;
    for (const stage of STAGES) {
      const v = normalizeMastery(stage, 0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(prevByStage);
      prevByStage = v;
      // a stage fisso, più punti = mai meno percentuale
      let prevByPoints = -1;
      for (const pts of [-100, -50, 0, 50, 100]) {
        const p = normalizeMastery(stage, pts);
        expect(p).toBeGreaterThanOrEqual(prevByPoints);
        prevByPoints = p;
      }
    }
  });

  it("normalizePracticeOnlyMastery: estremi esatti e monotonia", () => {
    expect(normalizePracticeOnlyMastery(-100)).toBe(0);
    expect(normalizePracticeOnlyMastery(100)).toBe(100);
    let prev = -1;
    for (let pts = -100; pts <= 100; pts += 10) {
      const v = normalizePracticeOnlyMastery(pts);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("touchReviewDate e markKnown: proprietà sul dominio degli stage", () => {
  it("touchReviewDate sposta sempre avanti, di più a stage più alti", () => {
    let prev = 0;
    for (const stage of STAGES) {
      const next = touchReviewDate(atStage(stage, { ease_factor: 2.3 }), NOW);
      const interval = next.next_review_date - NOW;
      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeGreaterThanOrEqual(prev);
      expect(next.srs_stage).toBe(stage);
      prev = interval;
    }
  });

  it("markKnown: per ogni stage di partenza arriva ad almeno 5 e mai retrocede", () => {
    for (const stage of STAGES) {
      const next = markKnown(atStage(stage, { mastery_points: -20 }), NOW);
      expect(next.srs_stage).toBe(Math.max(stage, 5));
      expect(next.mastery_points).toBeGreaterThanOrEqual(60);
      expect(next.buried).toBe(false);
    }
  });
});

describe("facetsToTrain: gli sblocchi sono monotoni con lo stage", () => {
  const verb: Word = {
    id: "食べる",
    scrittura: "食べる",
    lettura: "たべる",
    significato: { it: ["mangiare"], en: ["to eat"] },
    livello_jlpt: "N5",
    tipo_jp: "動詞[どうし]",
    kanji_usati: ["食"],
    classe_verbo_jp: "一段動詞[いちだんどうし]",
    frasi_esempio: [{ testo: "パンを 食べます。", traduzione: { it: "Mangio il pane.", en: "I eat bread." } }],
    sinonimi: [],
    contrari: [],
    omofoni: [],
    updated_at: 0
  } as unknown as Word;

  it("salendo di stage il set di celle allenabili non perde mai pezzi", () => {
    let prev = new Set<string>();
    for (const stage of STAGES) {
      const cells = new Set(facetsToTrain(verb, stage, {}));
      for (const c of prev) expect(cells.has(c)).toBe(true);
      prev = cells;
    }
  });

  it("a stage 7 un verbo completo allena TUTTE le celle applicabili", () => {
    const cells = new Set(facetsToTrain(verb, 7, {}));
    for (const f of applicableFacets(verb)) expect(cells.has(f)).toBe(true);
  });

  it("ogni cella ha una soglia di sblocco definita e raggiungibile (≤ 7)", () => {
    for (const f of FACET_FIELDS) {
      expect(FACET_UNLOCK_STAGE[f]).toBeGreaterThanOrEqual(0);
      expect(FACET_UNLOCK_STAGE[f]).toBeLessThanOrEqual(7);
    }
  });
});

describe("calculateQuizXp: copertura di TUTTI i modi e crescita coi fattori", () => {
  const ALL_MODES: XpInput["quizMode"][] = [
    "flashcard-production", "flashcard-recognition", "flashcard-reading-recognition",
    "multiple-choice", "sentence-ordering", "cloze", "reading-choice", "listening",
    "particle-cloze", "counter-quiz", "conjugation", "transitivity-pair",
    "counter-reading", "time-reading", "composition", "spoken-production",
    "verb-form-cloze", "usage-cloze"
  ];
  const LEVELS: JLPTLevel[] = ["N5", "N4", "EXTRA", "N3", "N2", "N1"];
  const base = (over: Partial<XpInput>): XpInput => ({
    quizMode: "multiple-choice",
    isCorrect: true,
    responseTimeMs: 5000,
    jlptLevel: "N5",
    srsStage: 0,
    ...over
  });

  it("OGNI modo di domanda dà XP > 0 sul corretto e 0 sullo sbagliato", () => {
    for (const quizMode of ALL_MODES) {
      const ok = calculateQuizXp(base({ quizMode }));
      expect(ok.base).toBeGreaterThan(0);
      expect(ok.total).toBeGreaterThan(0);
      const ko = calculateQuizXp(base({ quizMode, isCorrect: false }));
      expect(ko.total).toBe(0);
    }
  });

  it("OGNI livello (compreso EXTRA) produce un totale valido, mai sotto N5", () => {
    const n5 = calculateQuizXp(base({})).total;
    for (const jlptLevel of LEVELS) {
      const t = calculateQuizXp(base({ jlptLevel })).total;
      expect(t).toBeGreaterThanOrEqual(n5);
    }
  });

  it("l'XP cresce con lo stage SRS e con la difficoltà JLPT (monotonia)", () => {
    let prevStage = 0;
    for (const srsStage of STAGES) {
      const t = calculateQuizXp(base({ srsStage })).total;
      expect(t).toBeGreaterThanOrEqual(prevStage);
      prevStage = t;
    }
    const order: JLPTLevel[] = ["N5", "N4", "N3", "N2", "N1"];
    let prevLvl = 0;
    for (const jlptLevel of order) {
      const t = calculateQuizXp(base({ jlptLevel })).total;
      expect(t).toBeGreaterThanOrEqual(prevLvl);
      prevLvl = t;
    }
  });

  it("rispondere in fretta non dà mai meno XP che rispondere piano", () => {
    for (const quizMode of ALL_MODES) {
      const fast = calculateQuizXp(base({ quizMode, responseTimeMs: 2000 })).total;
      const mid = calculateQuizXp(base({ quizMode, responseTimeMs: 10000 })).total;
      const slow = calculateQuizXp(base({ quizMode, responseTimeMs: 30000 })).total;
      expect(fast).toBeGreaterThanOrEqual(mid);
      expect(mid).toBeGreaterThanOrEqual(slow);
    }
  });
});
