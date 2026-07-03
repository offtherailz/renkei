import { db } from "./schema";
import type {
  CourseDatasetInput,
  CourseDatasetMeta,
  CourseLessonMeta,
  Dialogue,
  Grammar,
  JLPTLevel,
  Kanji,
  StudyObjective,
  Word,
  WordTypeJP
} from "../types/models";

// ── Validation ────────────────────────────────────────────────────────────────

const ALLOWED_TIPO_JP: WordTypeJP[] = [
  "名詞[めいし]",
  "動詞[どうし]",
  "形容詞[けいようし]",
  "副詞[ふくし]",
  "助数詞[じょすうし]",
  "慣用表現[かんようひょうげん]",
  "その他[そのた]"
];

function validateDataset(dataset: CourseDatasetInput): void {
  const corsoId = dataset.corso?.id;
  if (!corsoId) {
    throw new Error("corso.id è obbligatorio.");
  }

  if (!dataset.lezioni || dataset.lezioni.length === 0) {
    throw new Error("Il dataset deve contenere almeno una lezione.");
  }

  // Build full set of resolvable word IDs (new words defined in this file)
  const newWordIds = new Set((dataset.parole_nuove ?? []).map((w) => w.id));
  const newGrammarIds = new Set((dataset.grammatica_nuova ?? []).map((g) => g.id));

  for (const word of dataset.parole_nuove ?? []) {
    if (!word.id.startsWith(`${corsoId}-`)) {
      throw new Error(`parole_nuove: l'id "${word.id}" deve iniziare con "${corsoId}-".`);
    }
    if (!word.scrittura) {
      throw new Error(`parole_nuove: l'id "${word.id}" manca di "scrittura".`);
    }
    if (!word.lettura) {
      throw new Error(`parole_nuove: l'id "${word.id}" manca di "lettura".`);
    }
    if (!word.significato_it || word.significato_it.length === 0) {
      throw new Error(`parole_nuove: l'id "${word.id}" manca di "significato_it".`);
    }
    if (!ALLOWED_TIPO_JP.includes(word.tipo_jp)) {
      throw new Error(`parole_nuove: l'id "${word.id}" ha tipo_jp non valido: "${word.tipo_jp}".`);
    }
  }

  for (const gram of dataset.grammatica_nuova ?? []) {
    if (!gram.id.startsWith(`${corsoId}-`)) {
      throw new Error(`grammatica_nuova: l'id "${gram.id}" deve iniziare con "${corsoId}-".`);
    }
  }

  for (const lezione of dataset.lezioni) {
    if (!lezione.id) {
      throw new Error("Ogni lezione deve avere un campo 'id'.");
    }
    if (!lezione.titolo) {
      throw new Error(`La lezione "${lezione.id}" manca del campo 'titolo'.`);
    }
    // Only validate words defined in parole_nuove; seed words will be resolved at import time
    for (const wordId of lezione.parole ?? []) {
      if (wordId.startsWith(`${corsoId}-`) && !newWordIds.has(wordId)) {
        throw new Error(`Lezione "${lezione.id}": la parola "${wordId}" non è definita in parole_nuove.`);
      }
    }
    for (const gramId of lezione.grammatica ?? []) {
      if (gramId.startsWith(`${corsoId}-`) && !newGrammarIds.has(gramId)) {
        throw new Error(`Lezione "${lezione.id}": la grammatica "${gramId}" non è definita in grammatica_nuova.`);
      }
    }
  }
}

// ── Converters ────────────────────────────────────────────────────────────────

function flattenGrammarLinks(g: Grammar): Grammar {
  const linked = new Set<string>();
  for (const ex of g.frasi_esempio) {
    for (const w of ex.parole_linkate) {
      linked.add(w);
    }
  }
  return { ...g, frasi_esempio_parole_linkate: [...linked] };
}

// ── Main import function ──────────────────────────────────────────────────────

export interface CourseImportResult {
  corsoId: string;
  paroleAggiunte: number;
  parolePatchate: number;
  kanjiAggiunti: number;
  grammaticaAggiunta: number;
  dialoghiAggiunti: number;
  lezioniFinalizzate: number;
  obiettivoCreatoId: string;
}

export async function importCourseDataset(jsonText: string): Promise<CourseImportResult> {
  const dataset = JSON.parse(jsonText) as CourseDatasetInput;

  if (dataset.versione !== "1.0") {
    throw new Error(`Versione non supportata: "${dataset.versione}". Supportata: "1.0".`);
  }

  validateDataset(dataset);

  const now = Date.now();
  const corsoId = dataset.corso.id;
  const corsoObjectiveId = `course:${corsoId}`;

  // ── 1. Import new words ───────────────────────────────────────────────────
  const newWords: Word[] = (dataset.parole_nuove ?? []).map((w) => ({
    id: w.id,
    scrittura: w.scrittura,
    lettura: w.lettura,
    significato: {
      it: w.significato_it,
      en: w.significato_en ?? w.significato_it
    },
    livello_jlpt: w.livello_jlpt,
    tipo_jp: w.tipo_jp,
    kanji_usati: w.kanji_usati ?? [],
    classe_verbo_jp: w.classe_verbo_jp,
    transitivita_jp: w.transitivita_jp,
    tipo_aggettivo_jp: w.tipo_aggettivo_jp,
    sinonimi: w.sinonimi ?? [],
    contrari: w.contrari ?? [],
    omofoni: w.omofoni ?? [],
    source_name: dataset.corso.nome,
    study_tags: [`corso:${corsoId}`],
    updated_at: now
  }));

  // ── 2. Apply patches to existing words ───────────────────────────────────
  const patchedWords: Word[] = [];
  for (const patch of dataset.parole_patch ?? []) {
    const existing = await db.words.get(patch.id);
    if (!existing) {
      continue; // skip silently — seed may not have this word yet
    }
    const updated: Word = {
      ...existing,
      significato: {
        it: patch.significato_it ?? existing.significato.it,
        en: patch.significato_en ?? existing.significato.en
      },
      sinonimi: patch.sinonimi ?? existing.sinonimi,
      contrari: patch.contrari ?? existing.contrari,
      omofoni: patch.omofoni ?? existing.omofoni,
      classe_verbo_jp: patch.classe_verbo_jp ?? existing.classe_verbo_jp,
      transitivita_jp: patch.transitivita_jp ?? existing.transitivita_jp,
      tipo_aggettivo_jp: patch.tipo_aggettivo_jp ?? existing.tipo_aggettivo_jp,
      updated_at: now
    };
    patchedWords.push(updated);
  }

  // ── 3. Import new kanji ───────────────────────────────────────────────────
  const newKanji: Kanji[] = (dataset.kanji_nuovi ?? []).map((k) => ({
    id: k.id,
    significato: {
      it: k.significato_it,
      en: k.significato_en ?? k.significato_it
    },
    letture_on: k.letture_on,
    letture_kun: k.letture_kun,
    parole_correlate: k.parole_correlate ?? [],
    link_jisho: `https://jisho.org/search/${encodeURIComponent(k.id)}%23kanji`,
    link_koohii: `https://kanji.koohii.com/study/kanji/${encodeURIComponent(k.id)}`,
    source_name: dataset.corso.nome,
    study_tags: [`corso:${corsoId}`],
    updated_at: now
  }));

  // ── 4. Import new grammar ─────────────────────────────────────────────────
  const newGrammar: Grammar[] = (dataset.grammatica_nuova ?? []).map((g) => {
    const frasi = (g.frasi_esempio ?? []).map((ex) => ({
      testo: ex.testo,
      traduzione: {
        it: ex.traduzione_it,
        en: ex.traduzione_en ?? ex.traduzione_it
      },
      parole_linkate: ex.parole_linkate ?? []
    }));
    const linked = new Set<string>();
    for (const ex of frasi) {
      for (const wId of ex.parole_linkate) {
        linked.add(wId);
      }
    }
    return {
      id: g.id,
      struttura: g.struttura,
      spiegazione: {
        it: g.spiegazione_it,
        en: g.spiegazione_en ?? g.spiegazione_it
      },
      livello_jlpt: g.livello_jlpt,
      categoria_jp: g.categoria_jp,
      frasi_esempio: frasi,
      frasi_esempio_parole_linkate: [...linked],
      source_name: dataset.corso.nome,
      study_tags: [`corso:${corsoId}`],
      updated_at: now
    };
  });

  // ── 5. Import dialogues ───────────────────────────────────────────────────
  const newDialogues: Dialogue[] = (dataset.dialoghi_nuovi ?? []).map((d) => {
    const righe = d.righe.map((r) => ({
      personaggio: r.personaggio,
      testo: r.testo,
      traduzione: { it: r.traduzione_it, en: r.traduzione_en ?? r.traduzione_it },
      parole_linkate: r.parole_linkate ?? [],
      updated_at: now
    }));
    const allWords = new Set(righe.flatMap((r) => r.parole_linkate));
    return {
      id: d.id,
      titolo: { it: d.titolo_it, en: d.titolo_en ?? d.titolo_it },
      corso_id: corsoId,
      livello_jlpt: d.livello_jlpt,
      contesto: d.contesto_it ? { it: d.contesto_it, en: d.contesto_en ?? d.contesto_it } : undefined,
      righe,
      parole_linkate: [...allWords],
      grammatica_linkata: d.grammatica_linkata ?? [],
      updated_at: now
    };
  });

  // ── 6. Build StudyObjective hierarchy (course root + lesson children) ─────
  const corsoObjective: StudyObjective = {
    id: corsoObjectiveId,
    name: dataset.corso.nome,
    objective_type: "custom",
    target_jlpt: dataset.corso.livello_jlpt as JLPTLevel | undefined,
    catalog_item_keys: [],
    study_enabled: false,
    created_at: now,
    updated_at: now
  };

  const lessonObjectives: StudyObjective[] = [];
  const lessonMetas: CourseLessonMeta[] = [];

  const sortedLezioni = [...dataset.lezioni].sort((a, b) => a.numero - b.numero);

  for (const lezione of sortedLezioni) {
    const lessonObjectiveId = `course:${corsoId}:lesson:${lezione.id}`;
    const lessonMetaId = `${corsoId}::${lezione.id}`;

    const allWordKeys = (lezione.parole ?? []).map((id) => `word:${id}`);
    const allKanjiKeys = (lezione.kanji ?? []).map((id) => `kanji:${id}`);
    const allGrammarKeys = (lezione.grammatica ?? []).map((id) => `grammar:${id}`);
    const allItemKeys = [...allWordKeys, ...allKanjiKeys, ...allGrammarKeys];

    const lessonObj: StudyObjective = {
      id: lessonObjectiveId,
      name: lezione.titolo,
      objective_type: "custom",
      parent_objective_id: corsoObjectiveId,
      catalog_item_keys: allItemKeys,
      study_enabled: false,
      created_at: now,
      updated_at: now
    };

    lessonObjectives.push(lessonObj);

    lessonMetas.push({
      id: lessonMetaId,
      corso_id: corsoId,
      lesson_id: lezione.id,
      numero: lezione.numero,
      titolo: lezione.titolo,
      descrizione: lezione.descrizione,
      note: lezione.note,
      parole: lezione.parole ?? [],
      kanji: lezione.kanji ?? [],
      grammatica: lezione.grammatica ?? [],
      objective_id: lessonObjectiveId,
      updated_at: now
    });
  }

  // ── 6. Build CourseMeta ───────────────────────────────────────────────────
  const courseMeta: CourseDatasetMeta = {
    id: corsoId,
    nome: dataset.corso.nome,
    descrizione: dataset.corso.descrizione,
    autore: dataset.corso.autore,
    livello_jlpt: dataset.corso.livello_jlpt as JLPTLevel | undefined,
    importato_il: now,
    updated_at: now
  };

  // ── 7. Write everything in a single transaction ───────────────────────────
  await db.transaction(
    "rw",
    [db.words, db.kanji, db.grammar, db.dialogues, db.study_objectives, db.course_datasets, db.course_lessons],
    async () => {
      if (newWords.length > 0) await db.words.bulkPut(newWords);
      if (patchedWords.length > 0) await db.words.bulkPut(patchedWords);
      if (newKanji.length > 0) await db.kanji.bulkPut(newKanji);
      if (newGrammar.length > 0) await db.grammar.bulkPut(newGrammar.map(flattenGrammarLinks));
      if (newDialogues.length > 0) await db.dialogues.bulkPut(newDialogues);

      await db.study_objectives.put(corsoObjective);
      if (lessonObjectives.length > 0) await db.study_objectives.bulkPut(lessonObjectives);
      await db.course_datasets.put(courseMeta);
      if (lessonMetas.length > 0) await db.course_lessons.bulkPut(lessonMetas);
    }
  );

  return {
    corsoId,
    paroleAggiunte: newWords.length,
    parolePatchate: patchedWords.length,
    kanjiAggiunti: newKanji.length,
    grammaticaAggiunta: newGrammar.length,
    dialoghiAggiunti: newDialogues.length,
    lezioniFinalizzate: lessonMetas.length,
    obiettivoCreatoId: corsoObjectiveId
  };
}

export async function listCourses(): Promise<CourseDatasetMeta[]> {
  return db.course_datasets.orderBy("importato_il").reverse().toArray();
}

export async function getLessonsForCourse(corsoId: string): Promise<CourseLessonMeta[]> {
  return db.course_lessons.where("corso_id").equals(corsoId).sortBy("numero");
}

export async function deleteCourse(corsoId: string): Promise<void> {
  const lessons = await getLessonsForCourse(corsoId);
  const lessonObjectiveIds = lessons.map((l) => l.objective_id);
  const courseObjectiveId = `course:${corsoId}`;

  // Collect word IDs that were added by this course (identified by study_tags)
  const courseWords = await db.words.where("study_tags").startsWith(`corso:${corsoId}`).toArray();
  const courseWordIds = courseWords.map((w) => w.id);

  const courseKanji = await db.kanji.where("study_tags").startsWith(`corso:${corsoId}`).toArray();
  const courseKanjiIds = courseKanji.map((k) => k.id);

  const courseGrammar = await db.grammar.where("study_tags").startsWith(`corso:${corsoId}`).toArray();
  const courseGrammarIds = courseGrammar.map((g) => g.id);

  const courseDialogues = await db.dialogues.where('corso_id').equals(corsoId).toArray();
  const courseDialogueIds = courseDialogues.map((d) => d.id);

  await db.transaction(
    "rw",
    [db.words, db.kanji, db.grammar, db.dialogues, db.srs_progress, db.study_objectives, db.course_datasets, db.course_lessons],
    async () => {
      // Remove course-specific content
      await db.words.bulkDelete(courseWordIds);
      await db.kanji.bulkDelete(courseKanjiIds);
      await db.grammar.bulkDelete(courseGrammarIds);
      if (courseDialogueIds.length > 0) await db.dialogues.bulkDelete(courseDialogueIds);

      // Remove SRS progress for deleted items
      const allDeletedKeys = [
        ...courseWordIds.map((id) => `word:${id}`),
        ...courseKanjiIds.map((id) => `kanji:${id}`),
        ...courseGrammarIds.map((id) => `grammar:${id}`)
      ];
      await db.srs_progress.bulkDelete(allDeletedKeys);

      // Remove objectives
      await db.study_objectives.bulkDelete([courseObjectiveId, ...lessonObjectiveIds]);

      // Remove meta
      await db.course_datasets.delete(corsoId);
      await db.course_lessons.bulkDelete(lessons.map((l) => l.id));
    }
  );
}
