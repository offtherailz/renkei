export type LocaleCode = "it" | "en";

export interface LocalizedText {
  it: string;
  en: string;
}

export interface LocalizedStringArray {
  it: string[];
  en: string[];
}

// EXTRA = parola utile ma fuori dalle liste JLPT (lessico tecnico tipo 搭乗券):
// studiabile come le altre, ma catalogata onestamente (feedback utente 17/07).
export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "EXTRA";

export type WordTypeJP =
  | "名詞[めいし]"
  | "動詞[どうし]"
  | "形容詞[けいようし]"
  | "副詞[ふくし]"
  | "連体詞[れんたいし]"
  | "助詞[じょし]"
  | "接続詞[せつぞくし]"
  | "数詞[すうし]"
  | "助数詞[じょすうし]"
  | "慣用表現[かんようひょうげん]"
  | "その他[そのた]";

export type VerbClassJP = "五段動詞[ごだんどうし]" | "一段動詞[いちだんどうし]" | "不規則動詞[ふきそくどうし]";

export type VerbTransitivityJP = "自動詞[じどうし]" | "他動詞[たどうし]";

export type AdjectiveTypeJP = "い形容詞[いけいようし]" | "な形容詞[なけいようし]";

export interface BaseEntity {
  updated_at: number;
}

export interface Word extends BaseEntity {
  id: string;
  scrittura: string;
  lettura: string;
  significato: LocalizedStringArray;
  chapter_tags?: string[];
  study_tags?: string[];
  source_name?: string;
  source_license?: string;
  source_url?: string;
  livello_jlpt: JLPTLevel;
  tipo_jp: WordTypeJP;
  pitch_accent?: string;
  link_jisho?: string;
  kanji_usati: string[];
  id_contatore_suggerito?: string;
  classe_verbo_jp?: VerbClassJP;
  transitivita_jp?: VerbTransitivityJP;
  id_verbo_corrispondente?: string;
  id_verbo_suru?: string;
  id_nome_origine?: string;
  tipo_aggettivo_jp?: AdjectiveTypeJP;
  frasi_esempio?: WordExample[];
  // Parole multi-uso (たくさん & co.): un elemento per senso JMdict, con le
  // categorie di quel senso, le glosse e un'eventuale frase d'esempio propria.
  usi?: WordUso[];
  sinonimi: string[];
  contrari: string[];
  omofoni: string[];
  // Parole legate ma NON interscambiabili (妻↔奥さん, 兄↔弟): navigazione e
  // studio del contrasto, mai usate come sinonimi nelle domande.
  correlati?: string[];
  // Gruppi 言い換え (parafrasi stile JLPT: 大変≈難しい, 全部≈みんな): equivalenti
  // a livello di FRASE, non sinonimi lessicali. Alimentano il gioco /iikae e la
  // scheda; distinti dai sinonimi (che restano interscambiabili parola-per-parola).
  parafrasi?: string[];
}

// Correzione utente a una voce del catalogo: patch parziale che si applica
// subito in locale e si riapplica dopo ogni re-import del seed. L'export usa
// lo stesso formato di scripts/data/word-overrides.json / grammar-overrides.json.
export interface UserCorrection extends BaseEntity {
  id: string; // "word:<id>" | "grammar:<id>"
  kind: "word" | "grammar";
  patch: Record<string, unknown>;
  // valori originali dei campi patchati, per poter rimuovere la correzione
  original?: Record<string, unknown>;
  // true se un aggiornamento del seed ha cambiato il dato sotto la patch:
  // la correzione va riverificata (magari upstream ha già sistemato).
  stale?: boolean;
  motivo?: string;
}

export interface WordUso {
  tipi_jp: string[];
  significato: LocalizedText;
  esempio?: WordExample;
}

export interface WordExample {
  testo: string;
  traduzione: LocalizedText;
}

export interface StudySessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  answers: number;
  correct: number;
  wrong: number;
  timeout: number;
  xp: number;
  // Ripartizione per skill (opzionale: le sessioni precedenti non ce l'hanno).
  answersByType?: Record<'words' | 'kanji' | 'grammar', { answers: number; correct: number }>;
}

export interface Kanji extends BaseEntity {
  id: string;
  significato: LocalizedText;
  livello_jlpt: JLPTLevel;
  chapter_tags?: string[];
  study_tags?: string[];
  source_name?: string;
  source_license?: string;
  source_url?: string;
  letture_on: string[];
  letture_kun: string[];
  link_jisho?: string;
  link_koohii: string;
  parole_correlate: string[];
}

export interface GrammarExample {
  testo: string;
  traduzione: LocalizedText;
  parole_linkate: string[];
}

export interface Grammar extends BaseEntity {
  id: string;
  struttura: string;
  spiegazione: LocalizedText;
  chapter_tags?: string[];
  study_tags?: string[];
  source_name?: string;
  source_license?: string;
  source_url?: string;
  livello_jlpt: JLPTLevel;
  categoria_jp?: string;
  frasi_esempio: GrammarExample[];
  frasi_esempio_parole_linkate: string[];
}

export interface Counter extends BaseEntity {
  id: string;
  simbolo: string;
  lettura: string;
  significato: LocalizedText;
  livello_jlpt: JLPTLevel;
  note?: LocalizedText;
  letture_irregolari?: string;
  parole_tipiche?: string[];
}

export interface SrsProgress extends BaseEntity {
  id_item: string;
  srs_stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  next_review_date: number;
  ease_factor: number;
  streak: number;
  mastery_points: number;
  // Errori totali (quiz + pratica). Opzionale (righe storiche senza campo):
  // serve ai punti deboli — "debole" = ha sbagliato, non "è ancora giovane".
  lapses?: number;
  // Sfaccettature della conoscenza (modello Nation: Forma/Significato/Uso ×
  // ricettivo/produttivo), scala -100..100 come mastery_points. Solo
  // informative e per la scelta del MODO di domanda — mai per lo scheduling.
  // Opzionali: niente bump di versione Dexie, non indicizzate.
  facet_meaning_r?: number; // 💡 Capire (JP→IT)
  facet_meaning_p?: number; // 🎯 Recuperare (IT→JP)
  facet_form_read?: number; // 📖 Leggere (kanji→よみ)
  facet_form_write?: number; // ✍️ Scrivere (comporre)
  facet_form_listen?: number; // 👂 Ascoltare
  facet_form_speak?: number; // 🎤 Dire (microfono)
  facet_use?: number; // 🧩 Usare (particelle/coniugazione/cloze in frase)
  // Seppellita dall'utente ("non assillarmi"): fuori da rotazione quiz, conteggi
  // e punti deboli finché non viene riesumata dalla scheda.
  buried?: boolean;
}

export interface UserPersonalization extends BaseEntity {
  id_item: string;
  note_personali?: string;
  id_gruppi_personalizzati: string[];
}

export interface UserProfile extends BaseEntity {
  id: "default";
  xp_totali: number;
  livello: number;
  streak_giorni: number;
  badge_sbloccati: string[];
  // Carte MAI viste introdotte oggi (limite giornaliero, vedi $lib/core/dailyNewCards):
  // i ripassi dovuti restano illimitati, solo l'ingresso di materiale nuovo è razionato.
  nuove_oggi?: number;
  nuove_oggi_data?: string;
}

export interface StudyGoal extends BaseEntity {
  id: "default";
  target_jlpt: JLPTLevel;
  daily_new_words: number;
  daily_reviews: number;
  daily_grammar: number;
  modes_priority: Array<"flashcard-production" | "multiple-choice" | "sentence-ordering" | "cloze">;
}

export interface StudyTask extends BaseEntity {
  id: string;
  target_jlpt: JLPTLevel;
  title: string;
  description: string;
  category: "vocabulary" | "grammar" | "review" | "challenge";
  done: boolean;
  xp_reward: number;
}

export interface StudyObjective extends BaseEntity {
  id: string;
  name: string;
  objective_type: "jlpt" | "custom";
  target_jlpt?: JLPTLevel;
  parent_objective_id?: string;
  catalog_item_keys: string[];
  study_enabled: boolean;
  created_at: number;
}

export interface AppSettings extends BaseEntity {
  id: "default";
  auto_next_delay_ms: number;
  max_answer_time_ms: number;
  session_duration_minutes: number;
  session_timer_runs_in_detail: boolean;
  forme_note?: string[];
  lingua_contenuti?: "auto" | "it" | "en";
  voce_utente?: "maschile" | "femminile";
  furigana_kanji_avanzati?: boolean;
  // Furigana visibili nei testi che portano la notazione 漢字[よみ] (dialoghi,
  // esempi grammatica). Default true; spegnerli per allenare la lettura.
  furigana_visibile?: boolean;
  nuove_carte_al_giorno?: number;
  // Cadenza di ripasso. Default true: ogni carta torna al massimo una volta al
  // giorno (dopo una risposta giusta il prossimo ripasso viene spostato a domani
  // se cadrebbe ancora oggi). Falso = "learning steps" ravvicinati (10/60 min).
  ripasso_una_volta_al_giorno?: boolean;
}

export interface DatabaseSeed {
  words: Word[];
  kanji: Kanji[];
  grammar: Grammar[];
  counters: Counter[];
  dialogues?: Dialogue[];
  srs_progress?: SrsProgress[];
  user_personalization?: UserPersonalization[];
  user_profile?: UserProfile[];
}

// ── Course dataset types ──────────────────────────────────────────────────────

export interface CourseDatasetMeta extends BaseEntity {
  /** Unique slug, used as prefix for all generated IDs */
  id: string;
  nome: string;
  descrizione?: string;
  autore?: string;
  livello_jlpt?: JLPTLevel;
  /** ISO timestamp of the last import */
  importato_il: number;
}

export interface CourseLessonMeta extends BaseEntity {
  /** "{corso_id}::{lesson_id}", e.g. "minna-1::L01" */
  id: string;
  corso_id: string;
  lesson_id: string;
  numero: number;
  titolo: string;
  descrizione?: string;
  /** Markdown text shown as lesson reading material */
  note?: string;
  /** word IDs (seed + new) belonging to this lesson */
  parole: string[];
  kanji: string[];
  grammatica: string[];
  /** study_objective id created for this lesson */
  objective_id: string;
}

// ── Input format types (what the JSON file contains) ─────────────────────────

export interface CourseWordInput {
  id: string;
  scrittura: string;
  lettura: string;
  significato_it: string[];
  significato_en?: string[];
  livello_jlpt: JLPTLevel;
  tipo_jp: WordTypeJP;
  kanji_usati?: string[];
  classe_verbo_jp?: VerbClassJP;
  transitivita_jp?: VerbTransitivityJP;
  tipo_aggettivo_jp?: AdjectiveTypeJP;
  sinonimi?: string[];
  contrari?: string[];
  omofoni?: string[];
  note?: string;
}

export interface CourseWordPatch {
  id: string;
  significato_it?: string[];
  significato_en?: string[];
  sinonimi?: string[];
  contrari?: string[];
  omofoni?: string[];
  classe_verbo_jp?: VerbClassJP;
  transitivita_jp?: VerbTransitivityJP;
  tipo_aggettivo_jp?: AdjectiveTypeJP;
  note_aggiuntive?: string;
}

export interface CourseKanjiInput {
  id: string;
  significato_it: string;
  significato_en?: string;
  letture_on: string[];
  letture_kun: string[];
  parole_correlate?: string[];
}

export interface CourseGrammarExampleInput {
  testo: string;
  traduzione_it: string;
  traduzione_en?: string;
  parole_linkate?: string[];
}

export interface CourseGrammarInput {
  id: string;
  struttura: string;
  spiegazione_it: string;
  spiegazione_en?: string;
  livello_jlpt: JLPTLevel;
  categoria_jp?: string;
  frasi_esempio?: CourseGrammarExampleInput[];
}

export interface CourseLessonInput {
  id: string;
  numero: number;
  titolo: string;
  descrizione?: string;
  note?: string;
  parole?: string[];
  kanji?: string[];
  grammatica?: string[];
}

export interface CourseDatasetInput {
  versione: "1.0";
  corso: {
    id: string;
    nome: string;
    descrizione?: string;
    autore?: string;
    livello_jlpt?: JLPTLevel;
    lingua_origine?: LocaleCode;
  };
  lezioni: CourseLessonInput[];
  parole_nuove?: CourseWordInput[];
  parole_patch?: CourseWordPatch[];
  kanji_nuovi?: CourseKanjiInput[];
  grammatica_nuova?: CourseGrammarInput[];
  dialoghi_nuovi?: CourseDialogueInput[];
}

// ── Dialogue types ────────────────────────────────────────────────────────────

export interface DialogueLine extends BaseEntity {
  personaggio: string;
  testo: string;
  traduzione: LocalizedText;
  parole_linkate: string[];
}

export interface DialogueQuestion {
  testo: LocalizedText;
  opzioni: string[];
  corretta: string;
  spiegazione: LocalizedText;
  domanda_jp?: string; // domanda in giapponese stile JLPT (letta all'inizio)
  parole_chiave?: string[]; // "trigger" da catturare nell'audio
  tipo?: string; // categoria: task, sequenza, logistica, punto...
}

export interface Dialogue extends BaseEntity {
  id: string;
  titolo: LocalizedText;
  corso_id?: string;
  livello_jlpt?: JLPTLevel;
  contesto?: LocalizedText;
  righe: DialogueLine[];
  parole_linkate: string[];
  grammatica_linkata: string[];
  domande?: DialogueQuestion[];
}

export interface CourseDialogueLineInput {
  personaggio: string;
  testo: string;
  traduzione_it: string;
  traduzione_en?: string;
  parole_linkate?: string[];
}

export interface CourseDialogueInput {
  id: string;
  titolo_it: string;
  titolo_en?: string;
  livello_jlpt?: JLPTLevel;
  contesto_it?: string;
  contesto_en?: string;
  righe: CourseDialogueLineInput[];
  grammatica_linkata?: string[];
}

export interface CourseLessonInputV2 extends CourseLessonInput {
  dialoghi?: string[];
}
