export type LocaleCode = "it" | "en";

export interface LocalizedText {
  it: string;
  en: string;
}

export interface LocalizedStringArray {
  it: string[];
  en: string[];
}

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type WordTypeJP =
  | "名詞[めいし]"
  | "動詞[どうし]"
  | "形容詞[けいようし]"
  | "副詞[ふくし]"
  | "助数詞[じょすうし]"
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
  livello_jlpt: JLPTLevel;
  tipo_jp: WordTypeJP;
  pitch_accent?: string;
  link_jisho?: string;
  kanji_usati: string[];
  id_contatore_suggerito?: string;
  classe_verbo_jp?: VerbClassJP;
  transitivita_jp?: VerbTransitivityJP;
  id_verbo_corrispondente?: string;
  tipo_aggettivo_jp?: AdjectiveTypeJP;
  sinonimi: string[];
  contrari: string[];
  omofoni: string[];
}

export interface Kanji extends BaseEntity {
  id: string;
  significato: LocalizedText;
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
}

export interface SrsProgress extends BaseEntity {
  id_item: string;
  srs_stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  next_review_date: number;
  ease_factor: number;
  streak: number;
  mastery_points: number;
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
  study_enabled: boolean;
  created_at: number;
}

export interface AppSettings extends BaseEntity {
  id: "default";
  auto_next_delay_ms: number;
  max_answer_time_ms: number;
}

export interface DatabaseSeed {
  words: Word[];
  kanji: Kanji[];
  grammar: Grammar[];
  counters: Counter[];
  srs_progress?: SrsProgress[];
  user_personalization?: UserPersonalization[];
  user_profile?: UserProfile[];
}
