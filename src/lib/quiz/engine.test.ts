import { describe, expect, it } from "vitest";
import {
  calculateQuizXp,
  createFlashcardRecognitionQuestion,
  createMultipleChoiceQuestion,
  pickReadingTarget,
  shuffle
} from "./engine";
import type { DistractorIndex, QuizContext, XpInput } from "./types";
import type { Word } from "../types/models";

function makeWord(id: string, scrittura: string, meaningIt: string): Word {
  return {
    id,
    scrittura,
    lettura: scrittura,
    significato: { it: [meaningIt], en: [meaningIt] },
    livello_jlpt: "N5",
    tipo_jp: "名詞[めいし]",
    kanji_usati: [],
    sinonimi: [],
    contrari: [],
    omofoni: [],
    updated_at: 0
  } as unknown as Word;
}

function makeContext(words: Word[]): { context: QuizContext; index: DistractorIndex } {
  return {
    context: {
      locale: "it",
      wordsById: new Map(words.map((w) => [w.id, w])),
      grammarById: new Map()
    },
    index: {
      N5: words.map((w) => ({ id: w.id })),
      N4: [],
      N3: [],
      N2: [],
      N1: []
    } as unknown as DistractorIndex
  };
}

function makeInput(overrides: Partial<XpInput> = {}): XpInput {
  return {
    quizMode: "multiple-choice",
    jlptLevel: "N5",
    srsStage: 0,
    responseTimeMs: 10_000,
    isCorrect: true,
    completedCustomGroup: false,
    ...overrides
  };
}

describe("shuffle", () => {
  it("mantiene tutti gli elementi senza modificare l'originale", () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("distrattori senza duplicati", () => {
  // parole con scritture/significati duplicati per stressare la dedup
  const words = [
    makeWord("w1", "犬", "cane"),
    makeWord("w2", "犬", "cane"),
    makeWord("w3", "猫", "gatto"),
    makeWord("w4", "鳥", "uccello"),
    makeWord("w5", "魚", "pesce")
  ];

  it("flashcard-recognition: nessuna scelta duplicata né uguale alla corretta", () => {
    const { context, index } = makeContext(words);
    for (let i = 0; i < 20; i += 1) {
      const q = createFlashcardRecognitionQuestion(words[0]!, "it", index, context);
      const choices = q.choices ?? [];
      expect(new Set(choices).size).toBe(choices.length);
      expect(choices.filter((c) => c === q.correctAnswer)).toHaveLength(1);
    }
  });

  it("multiple-choice: nessun significato duplicato né uguale al corretto", () => {
    const { context, index } = makeContext(words);
    for (let i = 0; i < 20; i += 1) {
      const q = createMultipleChoiceQuestion(words[0]!, context, index);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices.filter((c) => c === q.correctChoice)).toHaveLength(1);
    }
  });
});

describe("nuove modalità con distrattori pedagogici", () => {
  it("counter-quiz: distrattori dalla stessa famiglia di contatori", async () => {
    const { createCounterQuestion } = await import("./engine");
    const counters = [
      { id: "匹", simbolo: "匹", lettura: "ひき" },
      { id: "頭", simbolo: "頭", lettura: "とう" },
      { id: "羽", simbolo: "羽", lettura: "わ" },
      { id: "冊", simbolo: "冊", lettura: "さつ" }
    ] as never[];
    const word = { ...makeWord("犬", "犬", "cane"), id_contatore_suggerito: "匹" };
    const q = createCounterQuestion(word, counters as never, "it");
    expect(q).not.toBeNull();
    expect(q!.correctChoice).toBe("匹（ひき）");
    expect(q!.choices).toContain("頭（とう）"); // confondibile: animali grandi
    expect(new Set(q!.choices).size).toBe(q!.choices.length);
  });

  it("conjugation: pesca una forma tra quelle consentite", async () => {
    const { createConjugationQuizQuestion } = await import("./engine");
    const verb = {
      ...makeWord("飲む", "飲む", "bere"),
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "五段動詞[ごだんどうし]"
    };
    const q = createConjugationQuizQuestion(verb as never, new Set(["te"]));
    expect(q).not.toBeNull();
    expect(q!.correctChoice).toBe("飲んで");
    expect(q!.choices).toContain("飲んで");
  });

  it("particle-cloze: oscura una particella e offre confondibili", async () => {
    const { createParticleClozeQuestion } = await import("./engine");
    const word = {
      ...makeWord("水", "水", "acqua"),
      frasi_esempio: [{ testo: "犬が水を飲む。", traduzione: { it: "Il cane beve acqua.", en: "" } }]
    };
    const q = await createParticleClozeQuestion(word as never, "it");
    expect(q).not.toBeNull();
    expect(q!.sentenceWithBlank).toContain("＿＿");
    expect(q!.choices).toContain(q!.correctChoice);
    // が (tema/soggetto) non è mai bersaglio: ambiguo. Resta solo を.
    expect(q!.correctChoice).toBe("を");
  });
});

describe("transitivity-pair e nuove letture", () => {
  it("transitivity-pair: il distrattore principe è il gemello nella stessa forma", async () => {
    const { createTransitivityPairQuestion } = await import("./engine");
    const akeru = {
      ...makeWord("開ける", "開ける", "aprire"),
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "一段動詞[いちだんどうし]",
      transitivita_jp: "他動詞[たどうし]",
      id_verbo_corrispondente: "開く",
      frasi_esempio: [{ testo: "ドアを開けます。", traduzione: { it: "Apro la porta.", en: "" } }]
    };
    const aku = {
      ...makeWord("開く", "開く", "aprirsi"),
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "五段動詞[ごだんどうし]"
    };
    const { context } = makeContext([akeru, aku] as never[]);
    const q = createTransitivityPairQuestion(akeru as never, context, "it");
    expect(q).not.toBeNull();
    expect(q!.correctChoice).toBe("開けます");
    expect(q!.choices).toContain("開きます"); // il gemello intransitivo, stessa forma
    expect(q!.sentenceWithBlank).toBe("ドアを＿＿"); // domanda mirata nome+particella
  });

  it("counter-reading: distrattori di rendaku", async () => {
    const { createCounterReadingQuestion } = await import("./engine");
    const counters = [{
      id: "本", simbolo: "本", lettura: "ほん",
      significato: { it: "", en: "" }, livello_jlpt: "N5",
      letture_irregolari: "さんぼん (3)", updated_at: 0
    }];
    const word = { ...makeWord("鉛筆", "鉛筆", "matita"), id_contatore_suggerito: "本" };
    const q = createCounterReadingQuestion(word as never, counters as never);
    expect(q).not.toBeNull();
    expect(q!.prompt).toBe("3本");
    expect(q!.correctChoice).toBe("さんぼん");
    expect(q!.choices).toContain("さんほん");
  });

  it("conta oggetti: prompt di emoji e distrattori con contatore diverso", async () => {
    const { generateCountObjects } = await import("./engine");
    const counters = [
      { id: "匹", simbolo: "匹", lettura: "ひき", significato: { it: "", en: "" }, livello_jlpt: "N5", letture_irregolari: "いっぴき (1)・さんびき (3)・ろっぴき (6)", updated_at: 0 },
      { id: "本", simbolo: "本", lettura: "ほん", significato: { it: "", en: "" }, livello_jlpt: "N5", letture_irregolari: "いっぽん (1)・さんぼん (3)", updated_at: 0 },
      { id: "枚", simbolo: "枚", lettura: "まい", significato: { it: "", en: "" }, livello_jlpt: "N5", updated_at: 0 }
    ];
    let sawFish = false;
    for (let i = 0; i < 80 && !sawFish; i += 1) {
      const q = generateCountObjects(counters as never);
      if (!q) continue;
      expect(q.distractors).not.toContain(q.correct);
      expect(q.prompt).toBe(q.emoji.repeat(q.count));
      if (q.emoji === "🐟") sawFish = true;
    }
    expect(sawFish).toBe(true);
  });

  it("okurigana error variant: 送る → 送くる", async () => {
    const { okuriganaErrorVariant } = await import("./engine");
    const word = makeWord("送る", "送る", "inviare");
    (word as { lettura: string }).lettura = "おくる";
    expect(okuriganaErrorVariant(word)).toBe("送くる");
  });
});

describe("calculateQuizXp", () => {
  it("risposta sbagliata: zero XP", () => {
    const xp = calculateQuizXp(makeInput({ isCorrect: false }));
    expect(xp.total).toBe(0);
  });

  it("N5 stage 0: solo base + eventuale speed bonus", () => {
    const xp = calculateQuizXp(makeInput({ responseTimeMs: 15_000 }));
    expect(xp.base).toBe(12);
    expect(xp.difficultyBonus).toBe(0);
    expect(xp.speedBonus).toBe(0);
    expect(xp.total).toBe(12);
  });

  it("il bonus velocità scala con il tempo di risposta", () => {
    expect(calculateQuizXp(makeInput({ responseTimeMs: 5_000 })).speedBonus).toBe(3);
    expect(calculateQuizXp(makeInput({ responseTimeMs: 10_000 })).speedBonus).toBe(1);
    expect(calculateQuizXp(makeInput({ responseTimeMs: 15_000 })).speedBonus).toBe(0);
  });

  it("livelli JLPT più alti e stage SRS più alti danno più XP", () => {
    const n5 = calculateQuizXp(makeInput());
    const n1 = calculateQuizXp(makeInput({ jlptLevel: "N1" }));
    expect(n1.total).toBeGreaterThan(n5.total);

    const stage7 = calculateQuizXp(makeInput({ srsStage: 7 }));
    expect(stage7.total).toBeGreaterThan(n5.total);
  });

  it("completare un gruppo personalizzato dà +20", () => {
    const xp = calculateQuizXp(makeInput({ completedCustomGroup: true }));
    expect(xp.groupCompletionBonus).toBe(20);
  });

  it("il totale è la somma delle componenti", () => {
    const xp = calculateQuizXp(makeInput({ jlptLevel: "N3", srsStage: 4, responseTimeMs: 3_000 }));
    expect(xp.total).toBe(xp.base + xp.difficultyBonus + xp.speedBonus + xp.groupCompletionBonus);
  });
});

describe("pickReadingTarget", () => {
  it("non ingloba il kana che precede la parola (bug reale: が dentro il box insieme a 開いて)", () => {
    const target = pickReadingTarget("ドア[どあ]が開いて[あいて]いる。");
    expect(target?.base).toBe("開いて");
    expect(target?.reading).toBe("あいて");
    expect(target?.match).toBe("開いて[あいて]");
  });

  it("nessun kana da togliere: il match resta invariato", () => {
    const target = pickReadingTarget("いま、勉強[べんきょう]している。");
    expect(target?.base).toBe("勉強");
    expect(target?.match).toBe("勉強[べんきょう]");
  });
});

describe("createVerbFormClozeQuestion", () => {
  const verb = {
    id: "食べる",
    scrittura: "食べる",
    lettura: "たべる",
    significato: { it: ["mangiare"], en: ["to eat"] },
    livello_jlpt: "N5",
    tipo_jp: "動詞[どうし]",
    classe_verbo_jp: "一段動詞[いちだんどうし]",
    kanji_usati: ["食"],
    sinonimi: [], contrari: [], omofoni: [], updated_at: 0,
    frasi_esempio: [
      { testo: "パンを 食べて ください。", traduzione: { it: "Mangia il pane, per favore.", en: "Please eat the bread." } }
    ]
  } as never;

  it("oscura la forma coniugata trovata nella frase; le opzioni sono forme dello stesso verbo", async () => {
    const { createVerbFormClozeQuestion } = await import("./engine");
    const q = createVerbFormClozeQuestion(verb, "it");
    expect(q).not.toBeNull();
    expect(q!.correctChoice).toBe("食べて");
    expect(q!.sentenceWithBlank).toContain("＿＿");
    expect(q!.sentenceWithBlank).not.toContain("食べて");
    expect(q!.choices).toContain("食べて");
    expect(new Set(q!.choices).size).toBe(q!.choices.length);
    expect(q!.formKey).toBe("te");
  });

  it("parola senza frasi o non coniugabile: null", async () => {
    const { createVerbFormClozeQuestion } = await import("./engine");
    const noun = { ...(verb as object), tipo_jp: "名詞[めいし]", classe_verbo_jp: undefined } as never;
    expect(createVerbFormClozeQuestion(noun, "it")).toBeNull();
  });
});

describe("blankClozeTarget (scelta dell'occorrenza giusta)", () => {
  it("か dentro かれ non viene oscurato: vince il か grammaticale dopo il verbo (bug reale)", async () => {
    const { createGrammarQuestion } = await import("./engine");
    const grammar = {
      id: "g-ka",
      struttura: "〜か",
      spiegazione: { it: "domanda incorporata", en: "embedded question" },
      livello_jlpt: "N4",
      frasi_esempio: [],
      frasi_esempio_parole_linkate: [],
      updated_at: 0
    } as never;
    const example = {
      testo: "かれが どこに いるか 知って いますか。",
      traduzione: { it: "Sai dove si trova lui?", en: "Do you know where he is?" }
    } as never;
    const context = { locale: "it", wordsById: new Map(), grammarById: new Map() } as never;
    const emptyIndex = { N5: [], N4: [], N3: [], N2: [], N1: [] } as never;
    const q = await createGrammarQuestion({ grammar, example }, emptyIndex, "N4", context, "it");
    if (q.mode === "cloze") {
      expect(q.sentenceWithBlank).toContain("かれが");
      expect(q.sentenceWithBlank).not.toMatch(/^___れが|^＿＿れが/);
    }
  });
});
