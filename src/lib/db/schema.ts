import Dexie, { type Table } from "dexie";
import type {
  AppSettings,
  Counter,
  CourseLessonMeta,
  CourseDatasetMeta,
  Dialogue,
  Grammar,
  JLPTLevel,
  Kanji,
  SrsProgress,
  StudyGoal,
  StudyObjective,
  StudySessionRecord,
  StudyTask,
  UserCorrection,
  UserPersonalization,
  UserProfile,
  Word
} from "../types/models";

export class JapaneseStudyDB extends Dexie {
  words!: Table<Word, string>;
  kanji!: Table<Kanji, string>;
  grammar!: Table<Grammar, string>;
  counters!: Table<Counter, string>;
  srs_progress!: Table<SrsProgress, string>;
  user_personalization!: Table<UserPersonalization, string>;
  user_profile!: Table<UserProfile, "default">;
  study_goals!: Table<StudyGoal, "default">;
  study_tasks!: Table<StudyTask, string>;
  study_objectives!: Table<StudyObjective, string>;
  app_settings!: Table<AppSettings, "default">;
  course_datasets!: Table<CourseDatasetMeta, string>;
  course_lessons!: Table<CourseLessonMeta, string>;
  dialogues!: Table<Dialogue, string>;
  study_sessions!: Table<StudySessionRecord, string>;
  user_corrections!: Table<UserCorrection, string>;

  constructor() {
    // Ambiente di test (npm run deploy:staging) sullo stesso dominio GitHub
    // Pages, sottocartella /staging/: IndexedDB è isolato per ORIGINE, non per
    // percorso, quindi senza un nome diverso stabile e test condividerebbero
    // (e si corromperebbero a vicenda) lo stesso database locale.
    const dbName = import.meta.env.VITE_APP_ENV === "staging" ? "japanese_study_pwa_staging" : "japanese_study_pwa";
    super(dbName);

    this.version(1).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at"
    });

    this.version(2).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at"
    });

    this.version(3).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, study_enabled, created_at, updated_at"
    });

    this.version(4).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, study_enabled, created_at, updated_at",
      app_settings: "&id, updated_at"
    });

    this.version(5).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, parent_objective_id, study_enabled, created_at, updated_at",
      app_settings: "&id, updated_at"
    });

    this.version(6).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, parent_objective_id, study_enabled, created_at, updated_at",
      app_settings: "&id, updated_at",
      course_datasets: "&id, livello_jlpt, importato_il, updated_at",
      course_lessons: "&id, corso_id, numero, objective_id, updated_at"
    });

    this.version(7).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, parent_objective_id, study_enabled, created_at, updated_at",
      app_settings: "&id, updated_at",
      course_datasets: "&id, livello_jlpt, importato_il, updated_at",
      course_lessons: "&id, corso_id, numero, objective_id, updated_at",
      dialogues: "&id, corso_id, livello_jlpt, *parole_linkate, *grammatica_linkata, updated_at"
    });

    this.version(8).stores({
      words: "&id, scrittura, lettura, livello_jlpt, tipo_jp, classe_verbo_jp, transitivita_jp, id_verbo_corrispondente, id_contatore_suggerito, *kanji_usati, *sinonimi, *contrari, *omofoni, updated_at",
      kanji: "&id, *parole_correlate, updated_at",
      grammar: "&id, livello_jlpt, *frasi_esempio_parole_linkate, updated_at",
      counters: "&id, livello_jlpt, updated_at",
      srs_progress: "&id_item, srs_stage, next_review_date, [srs_stage+next_review_date], [id_item+updated_at], mastery_points, updated_at",
      user_personalization: "&id_item, *id_gruppi_personalizzati, updated_at",
      user_profile: "&id, livello, streak_giorni, updated_at",
      study_goals: "&id, target_jlpt, updated_at",
      study_tasks: "&id, target_jlpt, category, done, updated_at",
      study_objectives: "&id, objective_type, target_jlpt, parent_objective_id, study_enabled, created_at, updated_at",
      app_settings: "&id, updated_at",
      course_datasets: "&id, livello_jlpt, importato_il, updated_at",
      course_lessons: "&id, corso_id, numero, objective_id, updated_at",
      dialogues: "&id, corso_id, livello_jlpt, *parole_linkate, *grammatica_linkata, updated_at",
      study_sessions: "&id, startedAt"
    });

    this.version(9).stores({
      user_corrections: "&id, kind, updated_at"
    });
  }
}

export const db = new JapaneseStudyDB();

export async function getDueSrsCards(nowTs = Date.now()): Promise<SrsProgress[]> {
  // Una carta è "da ripassare" se next_review_date <= adesso, a prescindere
  // dallo stage. (L'indice composto [srs_stage+next_review_date] non va bene
  // qui: confronto lessicografico → conterebbe anche carte con data futura.)
  return db.srs_progress
    .where("next_review_date")
    .belowOrEqual(nowTs)
    .sortBy("next_review_date");
}

export async function getWordsByJlpt(level: JLPTLevel): Promise<Word[]> {
  return db.words.where("livello_jlpt").equals(level).toArray();
}

export async function getRelatedWordsByVerbPair(wordId: string): Promise<Word | undefined> {
  const source = await db.words.get(wordId);
  if (!source?.id_verbo_corrispondente) {
    return undefined;
  }
  return db.words.get(source.id_verbo_corrispondente);
}
