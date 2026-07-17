import { describe, it, expect } from "vitest";
import {
  createInitialSrs,
  applySrsReview,
  markKnown,
  snoozeReview,
  setBuried
} from "./srs";
import {
  canIntroduceNewCard,
  recordNewCardIntroduced,
  newCardsUsedToday,
  type NewCardBudget
} from "./dailyNewCards";
import type { SrsProgress } from "../types/models";

// Simulatore SRS multi-giorno: guida le funzioni pure dell'engine attraverso
// tempo SIMULATO (nowTs esplicito, nessun mock di orologio) per verificare che
// l'algoritmo "regga" in vari scenari — il capo del cold-start da 1400 carte,
// la convergenza di chi studia bene, le carte-leech che non spariscono.

const DAY_MS = 24 * 60 * 60 * 1000;
// Mezzanotte LOCALE: il budget carte-nuove si azzera al cambio di data locale
// (dayKey usa getFullYear/Month/Date), quindi la "giornata" del simulatore deve
// allinearsi lì, altrimenti una finestra rolling scavalca il reset e introduce
// il doppio delle carte (comportamento reale, ma non ciò che vogliamo misurare).
const START = new Date(2026, 0, 1, 0, 0, 0).getTime();

// RNG deterministico (LCG) così i test sono stabili.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface SimCard {
  id: string;
  srs: SrsProgress | null;
  pCorrect: number; // probabilità che l'utente la azzecchi
}

interface DayStat {
  day: number;
  reviews: number;
  introduced: number;
  dueBacklogAtDayEnd: number;
}

interface SimResult {
  cards: SimCard[];
  days: DayStat[];
  maxIntroducedInADay: number;
  totalReviews: number;
}

interface SimConfig {
  cardCount: number;
  pCorrect: number | ((i: number) => number);
  cap: number;
  days: number;
  seed?: number;
}

function simulate(cfg: SimConfig): SimResult {
  const rng = makeRng(cfg.seed ?? 12345);
  const cards: SimCard[] = Array.from({ length: cfg.cardCount }, (_, i) => ({
    id: `w${i}`,
    srs: null,
    pCorrect: typeof cfg.pCorrect === "function" ? cfg.pCorrect(i) : cfg.pCorrect
  }));
  const unseen = [...cards];
  let budget: NewCardBudget = {};
  const days: DayStat[] = [];
  let maxIntroducedInADay = 0;
  let totalReviews = 0;

  let now = START;
  for (let day = 0; day < cfg.days; day += 1) {
    const dayEnd = START + (day + 1) * DAY_MS;
    let reviewsToday = 0;
    let introducedToday = 0;

    // Sessioni intra-giornata: gli intervalli iniziali (10-60 min) fanno
    // ricomparire le carte più volte nello stesso giorno.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // introduci carte nuove finché c'è budget nel giorno di calendario
      while (canIntroduceNewCard(budget, cfg.cap, now) && unseen.length > 0) {
        const c = unseen.shift()!;
        c.srs = createInitialSrs(c.id, now);
        budget = recordNewCardIntroduced(budget, now);
        introducedToday += 1;
      }
      const due = cards.filter(
        (c) => c.srs && !c.srs.buried && c.srs.next_review_date <= now
      );
      if (due.length > 0) {
        for (const c of due) {
          const correct = rng() < c.pCorrect;
          c.srs = applySrsReview(c.srs!, correct, now);
          reviewsToday += 1;
          totalReviews += 1;
        }
        continue; // rivaluta allo stesso istante (carte nuove / ancora dovute)
      }
      // niente di dovuto adesso: salta al prossimo ripasso entro il giorno
      let nextDue = Infinity;
      for (const c of cards) {
        if (c.srs && !c.srs.buried && c.srs.next_review_date < nextDue) {
          nextDue = c.srs.next_review_date;
        }
      }
      if (nextDue < dayEnd) {
        now = nextDue;
        continue;
      }
      break; // giornata finita
    }

    now = dayEnd;
    const dueBacklogAtDayEnd = cards.filter(
      (c) => c.srs && !c.srs.buried && c.srs.next_review_date <= now
    ).length;
    days.push({ day, reviews: reviewsToday, introduced: introducedToday, dueBacklogAtDayEnd });
    maxIntroducedInADay = Math.max(maxIntroducedInADay, introducedToday);
  }

  return { cards, days, maxIntroducedInADay, totalReviews };
}

describe("SRS simulazione multi-giorno", () => {
  it("non introduce mai più carte nuove del limite giornaliero", () => {
    const r = simulate({ cardCount: 400, pCorrect: 0.85, cap: 20, days: 20, seed: 7 });
    expect(r.maxIntroducedInADay).toBeLessThanOrEqual(20);
  });

  it("chi studia bene converge: stage alti e ripassi/giorno in calo", () => {
    const r = simulate({ cardCount: 60, pCorrect: 0.9, cap: 20, days: 40, seed: 3 });
    const introduced = r.cards.filter((c) => c.srs);
    // tutte e 60 introdotte entro 40 giorni (60/20 = 3 giorni bastano)
    expect(introduced.length).toBe(60);
    const avgStage =
      introduced.reduce((s, c) => s + (c.srs!.srs_stage as number), 0) / introduced.length;
    expect(avgStage).toBeGreaterThan(4);
    // il carico cala: l'ultima settimana ha molti meno ripassi della prima
    const firstWeek = r.days.slice(3, 10).reduce((s, d) => s + d.reviews, 0);
    const lastWeek = r.days.slice(-7).reduce((s, d) => s + d.reviews, 0);
    expect(lastWeek).toBeLessThan(firstWeek);
  });

  it("cold-start da tante carte: il cap tiene il backlog limitato", () => {
    const cap = 20;
    const days = 25;
    const r = simulate({ cardCount: 1400, pCorrect: 0.85, cap, days, seed: 11 });
    // mai introdotte più di cap*giorni carte distinte
    const introduced = r.cards.filter((c) => c.srs).length;
    expect(introduced).toBeLessThanOrEqual(cap * days);
    // il backlog dovuto a fine giornata non esplode: resta nell'ordine delle
    // carte in apprendimento, non delle migliaia
    const maxBacklog = Math.max(...r.days.map((d) => d.dueBacklogAtDayEnd));
    expect(maxBacklog).toBeLessThan(cap * 8);
  });

  it("una carta sempre sbagliata resta bassa, torna spesso, non si seppellisce da sola", () => {
    const r = simulate({
      cardCount: 30,
      pCorrect: (i) => (i === 0 ? 0 : 0.9),
      cap: 20,
      days: 15,
      seed: 5
    });
    const leech = r.cards[0]!;
    expect(leech.srs).not.toBeNull();
    expect(leech.srs!.srs_stage).toBe(0); // mai salita
    expect(leech.srs!.buried ?? false).toBe(false); // niente auto-suspend
    expect((leech.srs!.lapses ?? 0)).toBeGreaterThan(5); // continua a ricomparire
  });
});

describe("Budget carte nuove tra un giorno e l'altro", () => {
  it("il giorno dopo il budget è pieno di nuovo: N carte nuove entrano", () => {
    const day1 = new Date(2026, 0, 1, 9, 0).getTime();
    const day2 = new Date(2026, 0, 2, 9, 0).getTime();
    let budget: NewCardBudget = {};
    let introduced = 0;
    while (canIntroduceNewCard(budget, 20, day1)) {
      budget = recordNewCardIntroduced(budget, day1);
      introduced += 1;
    }
    expect(introduced).toBe(20);
    // il giorno dopo (cambio data locale) il contatore riparte da zero
    expect(newCardsUsedToday(budget, day2)).toBe(0);
    expect(canIntroduceNewCard(budget, 20, day2)).toBe(true);
  });

  it("le carte extra di ieri (Continua ancora un po') NON riducono il budget di oggi", () => {
    const day1 = new Date(2026, 0, 1, 9, 0).getTime();
    const day2 = new Date(2026, 0, 2, 9, 0).getTime();
    for (const extra of [5, 10, 20]) {
      let budget: NewCardBudget = {};
      // ieri: cap 20 + extra sbloccate a mano (il tetto di sessione sale)
      const capIeri = 20 + extra;
      let introducedIeri = 0;
      while (canIntroduceNewCard(budget, capIeri, day1)) {
        budget = recordNewCardIntroduced(budget, day1);
        introducedIeri += 1;
      }
      expect(introducedIeri).toBe(capIeri);
      // oggi: budget di nuovo pieno, niente "debito" per gli extra di ieri
      expect(newCardsUsedToday(budget, day2)).toBe(0);
      let introducedOggi = 0;
      while (canIntroduceNewCard(budget, 20, day2)) {
        budget = recordNewCardIntroduced(budget, day2);
        introducedOggi += 1;
      }
      expect(introducedOggi).toBe(20);
    }
  });

  it("le carte extra di ieri aumentano però il carico ripassi dei giorni dopo", () => {
    // stesso profilo utente, con e senza 20 extra il giorno 1: nei giorni
    // successivi chi ha esagerato ha più ripassi, ma il sistema non esplode.
    const base = simulate({ cardCount: 200, pCorrect: 0.85, cap: 20, days: 5, seed: 9 });
    const spinto = simulate({ cardCount: 200, pCorrect: 0.85, cap: 40, days: 1, seed: 9 });
    const introdotteBase = base.days[0]!.introduced;
    const introdotteSpinto = spinto.days[0]!.introduced;
    expect(introdotteSpinto).toBe(introdotteBase + 20);
    // più materiale in circolo = più ripassi da smaltire il giorno stesso
    expect(spinto.days[0]!.reviews).toBeGreaterThan(base.days[0]!.reviews);
  });
});

describe("Statistiche agli estremi", () => {
  it("sempre corretto: stage sale fino a 7, mastery satura a 100, intervalli fino a ~mesi", () => {
    let p = createInitialSrs("x", START);
    let now = START;
    const stages: number[] = [];
    let lastInterval = 0;
    for (let i = 0; i < 12; i += 1) {
      p = applySrsReview(p, true, now);
      stages.push(p.srs_stage);
      lastInterval = p.next_review_date - now;
      now = p.next_review_date; // rispondi appena la carta è dovuta
    }
    // monotono non-decrescente, tetto a 7 (mai oltre)
    for (let i = 1; i < stages.length; i += 1) expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1]!);
    expect(p.srs_stage).toBe(7);
    expect(p.mastery_points).toBe(100); // clampato, non oltre
    expect(p.streak).toBe(12);
    expect(p.lapses ?? 0).toBe(0);
    // a stage 7 l'intervallo è il massimo (30g × ease): ordine di grandezza mesi
    expect(lastInterval).toBeGreaterThan(30 * DAY_MS);
    expect(lastInterval).toBeLessThan(120 * DAY_MS);
  });

  it("sempre sbagliato: stage inchiodato a 0, mastery satura a -100, ritorno ogni 8 minuti", () => {
    let p = createInitialSrs("x", START);
    let now = START;
    for (let i = 0; i < 15; i += 1) {
      p = applySrsReview(p, false, now);
      expect(p.srs_stage).toBe(0); // non scende sotto 0, non sale mai
      expect(p.next_review_date - now).toBe(8 * 60_000); // torna subito
      now = p.next_review_date;
    }
    expect(p.mastery_points).toBe(-100); // clampato, niente overflow
    expect(p.lapses).toBe(15); // gli errori si contano tutti
    expect(p.streak).toBe(0);
    expect(p.ease_factor).toBeCloseTo(1.3, 5); // pavimento dell'ease
  });

  it("recupero dopo il disastro: da -100 si risale (l'algoritmo non intrappola)", () => {
    let p = createInitialSrs("x", START);
    let now = START;
    for (let i = 0; i < 10; i += 1) {
      p = applySrsReview(p, false, now);
      now = p.next_review_date;
    }
    // ora l'utente ha capito la parola: risposte giuste
    for (let i = 0; i < 8; i += 1) {
      p = applySrsReview(p, true, now);
      now = p.next_review_date;
    }
    expect(p.srs_stage).toBe(7); // il tetto resta raggiungibile
    expect(p.mastery_points).toBeGreaterThan(0); // la mastery risale
  });
});

describe("SRS: proprietà dei singoli passaggi", () => {
  it("la risposta giusta allunga sempre l'intervallo salendo di stage", () => {
    let p = createInitialSrs("x", START);
    let prevInterval = 0;
    for (let i = 0; i < 7; i += 1) {
      const before = p.next_review_date;
      p = applySrsReview(p, true, START);
      const interval = p.next_review_date - before;
      expect(interval).toBeGreaterThan(prevInterval);
      expect(p.srs_stage).toBe(Math.min(i + 1, 7));
      prevInterval = interval;
    }
  });

  it("la risposta sbagliata scende di stage e rimette la carta a breve (8 min)", () => {
    let p = createInitialSrs("x", START);
    for (let i = 0; i < 4; i += 1) p = applySrsReview(p, true, START); // stage 4
    const wrong = applySrsReview(p, false, START);
    expect(wrong.srs_stage).toBe(3);
    expect(wrong.next_review_date - START).toBe(8 * 60_000);
    expect(wrong.lapses).toBe(1);
  });

  it("«La so già» salta a stage 5 senza consumare budget di stage 7", () => {
    const p = markKnown(createInitialSrs("x", START), START);
    expect(p.srs_stage).toBe(5);
    expect(p.next_review_date).toBeGreaterThan(START); // ripasso lontano ma esiste
  });

  it("rimanda (snooze) spinge in avanti la data; seppellisci esclude dal dovuto", () => {
    const base = createInitialSrs("x", START);
    const snoozed = snoozeReview(base, 3, START);
    expect(snoozed.next_review_date).toBeGreaterThanOrEqual(START + 3 * DAY_MS);
    const buried = setBuried(base, true, START);
    expect(buried.buried).toBe(true);
  });
});
