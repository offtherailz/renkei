import "./app.css";
import {
  AppSettings,
  InteractiveWord,
  Kanji,
  JLPTLevel,
  SrsProgress,
  StudyObjective,
  UserPersonalization,
  Word,
  applySrsReview,
  calculateQuizXp,
  createClozeQuestion,
  createFlashcardProductionQuestion,
  createFlashcardRecognitionQuestion,
  createInitialSrs,
  createMultipleChoiceQuestion,
  createSentenceOrderingQuestion,
  db,
  detectUserLocale,
  importDatabaseFromJson,
  normalizeMastery,
  pickLocalizedArray,
  pickLocalizedText,
  preloadDistractorIndex,
  renderFuriganaToHtml,
  speakWordReading
} from "./index";
import { ClozeQuestion, DistractorIndex, QuizContext, QuizQuestion, SentenceOrderingQuestion } from "./quiz/types";
import { Grammar } from "./types/models";

type ItemKind = "word" | "grammar" | "kanji" | "objective";
type Section = "home" | "quiz" | "settings" | "detail";

interface ItemRef {
  key: string;
  kind: ItemKind;
  level: JLPTLevel;
}

interface ActiveQuiz {
  itemRef: ItemRef;
  question: QuizQuestion;
  startedAt: number;
  answered: boolean;
}

const BASE_URL = import.meta.env.BASE_URL;
const OWNER_GITHUB = "https://github.com/offtherailz";
const locale = detectUserLocale();

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  auto_next_delay_ms: 2000,
  max_answer_time_ms: 20000,
  updated_at: Date.now()
};

let words: Word[] = [];
let kanjiRows: Kanji[] = [];
let grammar: Grammar[] = [];
let objectives: StudyObjective[] = [];
let srsRows: SrsProgress[] = [];
let context: QuizContext;
let distractorIndex: DistractorIndex = { N5: [], N4: [], N3: [], N2: [], N1: [] };
let settings: AppSettings = { ...DEFAULT_SETTINGS };

let activeQuiz: ActiveQuiz | null = null;
let activeWordForTts: Word | null = null;
let interactiveWordInstance: InteractiveWord | null = null;
let detailCurrentItem: ItemRef | null = null;

let autoNextTimerId: number | null = null;
let answerTimeoutId: number | null = null;
let answerTickIntervalId: number | null = null;

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function byIdMap<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jlptRank(level: JLPTLevel): number {
  const rank: Record<JLPTLevel, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  return rank[level];
}

function supportsLevel(level: JLPTLevel, target: JLPTLevel): boolean {
  return jlptRank(level) <= jlptRank(target);
}

function jlptLabel(level: JLPTLevel): string {
  return `JLPT ${level}`;
}

function nativeMeaning(values: { it: string[]; en: string[] } | { it: string; en: string }): string {
  if (Array.isArray((values as { it: string[] }).it)) {
    const arrayValues = values as { it: string[]; en: string[] };
    return locale === "it" ? arrayValues.it.join(" / ") : arrayValues.en.join(" / ");
  }
  const textValues = values as { it: string; en: string };
  return locale === "it" ? textValues.it : textValues.en;
}

async function loadUserNote(itemId: string): Promise<string> {
  const row = await db.user_personalization.get(itemId);
  return row?.note_personali ?? "";
}

async function saveUserNote(itemId: string, note: string): Promise<void> {
  const current = await db.user_personalization.get(itemId);
  const payload: UserPersonalization = {
    id_item: itemId,
    id_gruppi_personalizzati: current?.id_gruppi_personalizzati ?? [],
    note_personali: note.trim(),
    updated_at: Date.now()
  };
  await db.user_personalization.put(payload);
}

function clearTimers(): void {
  if (autoNextTimerId !== null) {
    clearTimeout(autoNextTimerId);
    autoNextTimerId = null;
  }
  if (answerTimeoutId !== null) {
    clearTimeout(answerTimeoutId);
    answerTimeoutId = null;
  }
  if (answerTickIntervalId !== null) {
    clearInterval(answerTickIntervalId);
    answerTickIntervalId = null;
  }
  const timer = document.getElementById("answer-timer");
  if (timer) {
    timer.textContent = "";
  }
}

function setActiveSection(section: Section): void {
  const panels = document.querySelectorAll<HTMLElement>(".panel-section");
  for (const panel of panels) {
    panel.classList.toggle("panel-active", panel.getAttribute("data-section") === section);
  }
  const navButtons = document.querySelectorAll<HTMLButtonElement>("[data-nav-section]");
  for (const btn of navButtons) {
    const isActive = btn.getAttribute("data-nav-section") === section;
    btn.classList.toggle("menu-link-active", isActive);
  }

  const menu = document.getElementById("app-menu");
  menu?.classList.remove("menu-open");
}

function setStatus(text: string, ok: boolean): void {
  const root = document.getElementById("feedback");
  if (!root) {
    return;
  }
  root.textContent = text;
  root.className = ok ? "feedback ok" : "feedback bad";
}

function setQuizMeta(text: string): void {
  const root = document.getElementById("quiz-meta");
  if (root) {
    root.textContent = text;
  }
}

function clearPostActions(): void {
  const root = document.getElementById("post-actions");
  if (root) {
    root.innerHTML = "";
  }
}

function getEnabledObjectives(): StudyObjective[] {
  return objectives.filter((o) => o.study_enabled);
}

function objectivePool(objective: StudyObjective): ItemRef[] {
  if (objective.objective_type !== "jlpt" || !objective.target_jlpt) {
    return [];
  }

  const w = words
    .filter((x) => supportsLevel(x.livello_jlpt, objective.target_jlpt as JLPTLevel))
    .map((x) => ({ key: `word:${x.id}`, kind: "word" as const, level: x.livello_jlpt }));
  const g = grammar
    .filter((x) => supportsLevel(x.livello_jlpt, objective.target_jlpt as JLPTLevel))
    .map((x) => ({ key: `grammar:${x.id}`, kind: "grammar" as const, level: x.livello_jlpt }));
  return [...w, ...g];
}

function getActivePool(): ItemRef[] {
  const merged = getEnabledObjectives().flatMap((o) => objectivePool(o));
  const unique = new Map<string, ItemRef>();
  for (const item of merged) {
    unique.set(item.key, item);
  }
  return [...unique.values()];
}

function getSrsByItem(itemKey: string): SrsProgress | undefined {
  return srsRows.find((s) => s.id_item === itemKey);
}

async function upsertSrs(itemKey: string, correct: boolean): Promise<SrsProgress> {
  const current = getSrsByItem(itemKey) ?? createInitialSrs(itemKey);
  const updated = applySrsReview(current, correct);
  await db.srs_progress.put(updated);
  const idx = srsRows.findIndex((s) => s.id_item === itemKey);
  if (idx === -1) {
    srsRows.push(updated);
  } else {
    srsRows[idx] = updated;
  }
  return updated;
}

async function addXp(delta: number): Promise<void> {
  const current = await db.user_profile.get("default");
  const now = Date.now();
  if (!current) {
    const base = Math.max(0, delta);
    await db.user_profile.put({
      id: "default",
      xp_totali: base,
      livello: Math.max(1, Math.floor(base / 220) + 1),
      streak_giorni: 0,
      badge_sbloccati: [],
      updated_at: now
    });
    return;
  }

  const total = Math.max(0, current.xp_totali + delta);
  await db.user_profile.put({
    ...current,
    xp_totali: total,
    livello: Math.max(1, Math.floor(total / 220) + 1),
    updated_at: now
  });
}

function objectiveProgress(objective: StudyObjective): number {
  const pool = objectivePool(objective);
  if (pool.length === 0) {
    return 0;
  }
  const values = pool.map((item) => {
    const srs = getSrsByItem(item.key);
    return srs ? normalizeMastery(srs.srs_stage, srs.mastery_points) : 0;
  });
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function progressColor(progress: number): string {
  if (progress >= 75) {
    return "var(--progress-good)";
  }
  if (progress >= 40) {
    return "var(--progress-mid)";
  }
  return "var(--progress-low)";
}

function renderObjectives(): void {
  const root = document.getElementById("objective-list");
  if (!root) {
    return;
  }

  root.innerHTML = "";
  for (const objective of objectives) {
    const progress = objectiveProgress(objective);
    const card = document.createElement("article");
    card.className = "objective-item";
    card.setAttribute("data-objective-open", objective.id);
    card.innerHTML = `
      <div class="objective-top">
        <strong>${escapeHtml(objective.name)}</strong>
        <button class="objective-toggle ${objective.study_enabled ? "objective-toggle-on" : "objective-toggle-off"}" data-objective-toggle="${objective.id}">
          ${objective.study_enabled ? "In studio" : "Pausa"}
        </button>
      </div>
      <div class="objective-sub">${objective.target_jlpt ? `Target ${objective.target_jlpt}` : "Custom"}</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${progress}%; background:${progressColor(progress)}"></div></div>
      <div class="objective-sub">Consolidamento: ${progress}%</div>
    `;
    root.appendChild(card);
  }
}

async function toggleObjective(objectiveId: string, value: boolean): Promise<void> {
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) {
    return;
  }
  await db.study_objectives.put({ ...objective, study_enabled: value, updated_at: Date.now() });
  objectives = objectives.map((o) => (o.id === objectiveId ? { ...o, study_enabled: value } : o));
  renderObjectives();
}

async function setStudyAll(): Promise<void> {
  const now = Date.now();
  const next = objectives.map((o) => ({ ...o, study_enabled: true, updated_at: now }));
  await db.study_objectives.bulkPut(next);
  objectives = next;
  renderObjectives();
}

async function addObjective(name: string, level: JLPTLevel): Promise<void> {
  const now = Date.now();
  const objective: StudyObjective = {
    id: `obj-${crypto.randomUUID()}`,
    name: name.trim() || `Obiettivo ${level}`,
    objective_type: "jlpt",
    target_jlpt: level,
    study_enabled: true,
    created_at: now,
    updated_at: now
  };
  await db.study_objectives.add(objective);
  objectives.push(objective);
  renderObjectives();
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${BASE_URL}sw.js`);
  });
}

function mountUi(): void {
  document.body.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="topbar-left">
          <button id="btn-burger" class="ghost burger-btn" type="button" aria-label="Apri menu">☰</button>
          <img class="logo" src="${BASE_URL}renkei-logo.svg" alt="Renkei logo" />
        </div>
        <div>
          <h1>Renkei (連携)</h1>
          <p class="tagline">JLPT trainer touch-first: Active Recall + SRS + obiettivi</p>
        </div>
      </header>

      <aside id="app-menu" class="app-menu">
        <button class="menu-link menu-link-active" data-nav-section="home" type="button">Home</button>
        <button class="menu-link" data-nav-section="quiz" type="button">Studio</button>
        <button class="menu-link" data-nav-section="settings" type="button">Settings</button>
      </aside>

      <section class="card panel-section panel-active" data-section="home">
        <div class="section-head">
          <h2>Home</h2>
          <button id="btn-study-all" class="ghost" type="button">Attiva tutti</button>
        </div>

        <div class="objective-list" id="objective-list"></div>

        <form id="objective-form" class="objective-form">
          <input id="objective-name" type="text" placeholder="Nuovo obiettivo (es. Ripasso N4)" />
          <select id="objective-level">
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
          <button type="submit">Aggiungi</button>
        </form>

        <div class="row">
          <button id="btn-start-study" class="primary-wide" type="button">Studia</button>
        </div>
      </section>

      <section class="card quiz-card panel-section" data-section="quiz">
        <div class="section-head">
          <h2>Studio</h2>
          <div class="quiz-actions">
            <button id="btn-tts" class="ghost" type="button">Ascolta</button>
            <button id="btn-next-quiz" class="ghost" type="button">Salta</button>
          </div>
        </div>

        <div id="quiz-meta" class="quiz-meta"></div>
        <div id="answer-timer" class="quiz-meta"></div>
        <div id="question" class="question"></div>
        <div id="choices" class="choice-list"></div>
        <div id="post-actions" class="row"></div>
        <div id="feedback" class="feedback"></div>
      </section>

      <section class="card panel-section" data-section="detail">
        <div class="section-head">
          <h2>Approfondisci</h2>
          <button id="btn-back-quiz" class="ghost" type="button">Torna al quiz</button>
        </div>
        <div id="detail-panel" class="detail-panel"></div>
      </section>

      <section class="card panel-section" data-section="settings">
        <div class="section-head"><h2>Impostazioni</h2></div>
        <form id="settings-form" class="settings-form">
          <article class="material-card">
            <p class="material-card-title">Flusso Quiz</p>
            <label class="material-field">
              <span>Auto prossima domanda (secondi)</span>
              <input id="setting-auto-next" type="number" min="0.5" step="0.5" />
              <small>Default: 2 secondi</small>
            </label>
            <label class="material-field">
              <span>Tempo massimo risposta (secondi)</span>
              <input id="setting-max-answer" type="number" min="3" step="1" />
              <small>Allo scadere: segna non ricordata</small>
            </label>
          </article>
          <button class="material-primary" type="submit">Salva impostazioni</button>
        </form>
      </section>

      <footer class="credits">
        Built by <a href="${OWNER_GITHUB}" target="_blank" rel="noreferrer">offtherailz</a>
      </footer>
    </main>

    <div id="inline-popup" class="inline-popup" role="status" aria-live="polite"></div>
  `;
}

async function ensureSeedLoaded(): Promise<void> {
  const counters = await db.counters.toArray();
  if (counters.length > 0) {
    return;
  }

  const response = await fetch(`${BASE_URL}seed-n5n4.json`);
  if (!response.ok) {
    throw new Error("Seed non trovato.");
  }
  const payload = await response.text();
  await importDatabaseFromJson(payload);
}

async function ensureDefaultObjectives(): Promise<void> {
  const rows = await db.study_objectives.toArray();
  if (rows.length > 0) {
    return;
  }

  const now = Date.now();
  const defaults: StudyObjective[] = [
    {
      id: "obj-jlpt-n5",
      name: "Base N5",
      objective_type: "jlpt",
      target_jlpt: "N5",
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-jlpt-n4",
      name: "Progressione N4",
      objective_type: "jlpt",
      target_jlpt: "N4",
      study_enabled: true,
      created_at: now,
      updated_at: now
    }
  ];

  await db.study_objectives.bulkPut(defaults);
}

async function ensureDefaultSettings(): Promise<void> {
  const row = await db.app_settings.get("default");
  if (row) {
    settings = row;
    return;
  }
  await db.app_settings.put(DEFAULT_SETTINGS);
  settings = { ...DEFAULT_SETTINGS };
}

async function hydrateState(): Promise<void> {
  [words, kanjiRows, grammar, objectives, srsRows] = await Promise.all([
    db.words.toArray(),
    db.kanji.toArray(),
    db.grammar.toArray(),
    db.study_objectives.toArray(),
    db.srs_progress.toArray()
  ]);

  const wordsById = byIdMap(words);
  const grammarById = byIdMap(grammar);

  context = {
    wordsById,
    grammarById,
    locale
  };

  distractorIndex = await preloadDistractorIndex();
}

function parseItemRef(itemKey: string): ItemRef | null {
  if (itemKey.startsWith("word:")) {
    const word = context.wordsById.get(itemKey.replace("word:", ""));
    return word ? { key: itemKey, kind: "word", level: word.livello_jlpt } : null;
  }
  if (itemKey.startsWith("kanji:")) {
    const kanji = kanjiRows.find((k) => k.id === itemKey.replace("kanji:", ""));
    if (!kanji) {
      return null;
    }
    const relatedLevels = words
      .filter((w) => w.kanji_usati.includes(kanji.id))
      .map((w) => w.livello_jlpt)
      .sort((a, b) => jlptRank(a) - jlptRank(b));
    return {
      key: itemKey,
      kind: "kanji",
      level: relatedLevels[0] ?? "N5"
    };
  }
  if (itemKey.startsWith("grammar:")) {
    const item = context.grammarById.get(itemKey.replace("grammar:", ""));
    return item ? { key: itemKey, kind: "grammar", level: item.livello_jlpt } : null;
  }
  if (itemKey.startsWith("objective:")) {
    const objective = objectives.find((obj) => obj.id === itemKey.replace("objective:", ""));
    return objective
      ? {
          key: itemKey,
          kind: "objective",
          level: objective.target_jlpt ?? "N5"
        }
      : null;
  }
  return null;
}

function pickWordMode(stage: number): "flashcard-production" | "flashcard-recognition" | "multiple-choice" {
  if (stage <= 1) {
    return Math.random() < 0.5 ? "flashcard-recognition" : "multiple-choice";
  }
  if (stage <= 3) {
    return Math.random() < 0.6 ? "multiple-choice" : "flashcard-recognition";
  }
  return Math.random() < 0.55 ? "flashcard-production" : "multiple-choice";
}

async function generateQuizForItem(itemRef: ItemRef): Promise<ActiveQuiz | null> {
  if (itemRef.kind === "word") {
    const word = context.wordsById.get(itemRef.key.replace("word:", ""));
    if (!word) {
      return null;
    }
    activeWordForTts = word;
    const srs = getSrsByItem(itemRef.key) ?? createInitialSrs(itemRef.key);
    const mode = pickWordMode(srs.srs_stage);

    const question =
      mode === "flashcard-production"
        ? createFlashcardProductionQuestion(word, locale)
        : mode === "flashcard-recognition"
          ? createFlashcardRecognitionQuestion(word, locale, distractorIndex, context)
          : createMultipleChoiceQuestion(word, context, distractorIndex);

    return { itemRef, question, startedAt: Date.now(), answered: false };
  }

  const entry = context.grammarById.get(itemRef.key.replace("grammar:", ""));
  if (!entry || entry.frasi_esempio.length === 0) {
    return null;
  }

  activeWordForTts = null;
  const example = sample(entry.frasi_esempio);
  const question =
    Math.random() < 0.5
      ? await createSentenceOrderingQuestion({ grammar: entry, example }, locale)
      : await createClozeQuestion({ grammar: entry, example }, distractorIndex, entry.livello_jlpt, context);

  return { itemRef, question, startedAt: Date.now(), answered: false };
}

function getCorrectAnswerText(question: QuizQuestion): string {
  if (question.mode === "flashcard-production") {
    return question.correctAnswer;
  }
  if (question.mode === "flashcard-recognition") {
    return question.correctAnswer;
  }
  if (question.mode === "multiple-choice") {
    return question.correctChoice;
  }
  if (question.mode === "sentence-ordering") {
    return question.correctOrder.join("");
  }
  return (question as ClozeQuestion).correctChoice;
}

function revealCorrectAnswer(currentQuiz: ActiveQuiz): void {
  const root = document.getElementById("choices");
  if (!root) {
    return;
  }

  const answer = document.createElement("div");
  answer.className = "solution";
  answer.textContent = `Risposta: ${getCorrectAnswerText(currentQuiz.question)}`;
  root.appendChild(answer);
}

function wordLinkButton(word: Word): string {
  return `<button class="chip" data-detail-key="word:${word.id}" data-popup-reading="${escapeHtml(word.lettura)}" data-popup-meaning="${escapeHtml(nativeMeaning(word.significato))}">${escapeHtml(word.scrittura)} (${escapeHtml(word.lettura)})</button>`;
}

function kanjiLinkButton(kanji: Kanji): string {
  return `<button class="chip" data-detail-key="kanji:${kanji.id}" data-popup-reading="${escapeHtml(kanji.letture_kun.join(" / "))}" data-popup-meaning="${escapeHtml(nativeMeaning(kanji.significato))}">${escapeHtml(kanji.id)}</button>`;
}

function noteEditorMarkup(itemId: string): string {
  return `
    <section class="note-box">
      <p class="material-card-title">Note personali</p>
      <textarea data-note-input="${itemId}" rows="3" placeholder="Scrivi qui la tua nota personale..."></textarea>
      <button class="material-primary" data-note-save="${itemId}" type="button">Salva nota</button>
    </section>
  `;
}

function grammarExampleMarkup(item: Grammar): string {
  return item.frasi_esempio
    .map((ex, idx) => {
      const allowed = ex.parole_linkate
        .map((id) => context.wordsById.get(id))
        .filter((w): w is Word => Boolean(w))
        .filter((w) => supportsLevel(w.livello_jlpt, item.livello_jlpt));

      const chips = allowed.length > 0 ? allowed.map((w) => wordLinkButton(w)).join("") : "<span class=\"objective-sub\">Nessuna parola linkabile.</span>";

      return `
        <article class="material-card">
          <p><strong>Esempio ${idx + 1}</strong></p>
          <p>${renderFuriganaToHtml(ex.testo)}</p>
          <p class="objective-sub">${escapeHtml(pickLocalizedText(ex.traduzione, locale))}</p>
          <div class="chip-wrap">${chips}</div>
        </article>
      `;
    })
    .join("");
}

async function hydrateNoteField(itemId: string): Promise<void> {
  const input = document.querySelector(`[data-note-input=\"${CSS.escape(itemId)}\"]`) as HTMLTextAreaElement | null;
  if (!input) {
    return;
  }
  input.value = await loadUserNote(itemId);
}

function bindKanjiWordFilter(kanji: Kanji): void {
  const select = document.getElementById("kanji-word-filter") as HTMLSelectElement | null;
  const list = document.getElementById("kanji-words-list");
  if (!select || !list) {
    return;
  }

  const render = (): void => {
    const level = select.value;
    const rows = words
      .filter((w) => w.kanji_usati.includes(kanji.id))
      .filter((w) => (level === "ALL" ? true : w.livello_jlpt === level));
    list.innerHTML = rows.length > 0 ? rows.map((w) => wordLinkButton(w)).join("") : "<span class=\"objective-sub\">Nessuna parola per questo filtro.</span>";
  };

  select.addEventListener("change", render);
  render();
}

async function renderDetailPanel(itemRef: ItemRef): Promise<void> {
  const panel = document.getElementById("detail-panel");
  if (!panel) {
    return;
  }

  if (itemRef.kind === "word") {
    const word = context.wordsById.get(itemRef.key.replace("word:", ""));
    if (!word) {
      panel.innerHTML = "";
      panel.classList.remove("detail-open");
      return;
    }

    const verbPair = word.id_verbo_corrispondente ? context.wordsById.get(word.id_verbo_corrispondente) : undefined;
    const semantic = {
      sinonimi: word.sinonimi.map((id) => context.wordsById.get(id)).filter((w): w is Word => Boolean(w)),
      contrari: word.contrari.map((id) => context.wordsById.get(id)).filter((w): w is Word => Boolean(w)),
      omofoni: word.omofoni.map((id) => context.wordsById.get(id)).filter((w): w is Word => Boolean(w))
    };
    const usedKanji = word.kanji_usati.map((id) => kanjiRows.find((k) => k.id === id)).filter((k): k is Kanji => Boolean(k));

    panel.innerHTML = `
      <article class="material-card">
        <p class="material-card-title" data-popup-reading="${escapeHtml(word.lettura)}" data-popup-meaning="${escapeHtml(nativeMeaning(word.significato))}">${escapeHtml(word.scrittura)} (${escapeHtml(word.lettura)})</p>
        <p>${escapeHtml(nativeMeaning(word.significato))}</p>
        <p><strong>Livello:</strong> ${jlptLabel(word.livello_jlpt)} • <strong>Tipo:</strong> ${escapeHtml(word.tipo_jp)}</p>
        <p><strong>Pitch:</strong> ${escapeHtml(word.pitch_accent ?? "-")}</p>
        <div class="row">
          <button class="ghost" data-tts-reading="${escapeHtml(word.id)}" type="button">Ascolta pronuncia</button>
          <a class="external-link" href="${escapeHtml(word.link_jisho ?? `https://jisho.org/search/${encodeURIComponent(word.scrittura)}`)}" target="_blank" rel="noreferrer">Apri su Jisho</a>
        </div>
        <p class="objective-sub">Kanji utilizzati</p>
        <div class="chip-wrap">${usedKanji.map((k) => kanjiLinkButton(k)).join("") || "<span class=\"objective-sub\">Nessun kanji.</span>"}</div>
        ${word.tipo_jp === "動詞[どうし]" ? `<p><strong>Classe:</strong> ${escapeHtml(word.classe_verbo_jp ?? "-")} • <strong>Transitività:</strong> ${escapeHtml(word.transitivita_jp ?? "-")}</p>` : ""}
        ${word.tipo_jp === "動詞[どうし]" && verbPair ? `<div class="chip-wrap"><button class="chip" data-detail-key="word:${verbPair.id}">Verbo correlato: ${escapeHtml(verbPair.scrittura)} (${escapeHtml(verbPair.lettura)})</button><a class="external-link" href="https://jisho.org/search/${encodeURIComponent(word.scrittura)}%20%23verb" target="_blank" rel="noreferrer">Coniugazione</a></div>` : ""}
        ${word.tipo_jp === "形容詞[けいようし]" ? `<p><strong>Classe aggettivo:</strong> ${escapeHtml(word.tipo_aggettivo_jp ?? "-")}</p>` : ""}
        <p class="objective-sub">Relazioni semantiche</p>
        <p><strong>Sinonimi</strong></p><div class="chip-wrap">${semantic.sinonimi.map((w) => wordLinkButton(w)).join("") || "<span class=\"objective-sub\">-</span>"}</div>
        <p><strong>Contrari</strong></p><div class="chip-wrap">${semantic.contrari.map((w) => wordLinkButton(w)).join("") || "<span class=\"objective-sub\">-</span>"}</div>
        <p><strong>Omofoni</strong></p><div class="chip-wrap">${semantic.omofoni.map((w) => wordLinkButton(w)).join("") || "<span class=\"objective-sub\">-</span>"}</div>
      </article>
      ${noteEditorMarkup(itemRef.key)}
    `;
    await hydrateNoteField(itemRef.key);
  } else if (itemRef.kind === "kanji") {
    const kanji = kanjiRows.find((k) => k.id === itemRef.key.replace("kanji:", ""));
    if (!kanji) {
      panel.innerHTML = "";
      panel.classList.remove("detail-open");
      return;
    }

    panel.innerHTML = `
      <article class="material-card">
        <p class="material-card-title">Kanji ${escapeHtml(kanji.id)}</p>
        <p>${escapeHtml(nativeMeaning(kanji.significato))}</p>
        <p><strong>On'yomi:</strong> ${escapeHtml(kanji.letture_on.join(" / ") || "-")}</p>
        <p><strong>Kun'yomi:</strong> ${escapeHtml(kanji.letture_kun.join(" / ") || "-")}</p>
        <div class="row">
          <a class="external-link" href="${escapeHtml(kanji.link_jisho ?? `https://jisho.org/search/${encodeURIComponent(kanji.id)}%20%23kanji`)}" target="_blank" rel="noreferrer">Apri su Jisho</a>
          <a class="external-link" href="https://kanji.koohii.com/study/kanji/${encodeURIComponent(kanji.id)}" target="_blank" rel="noreferrer">Apri su Kanji Koohii</a>
        </div>
        <label class="material-field">
          <span>Filtra vocaboli per livello JLPT</span>
          <select id="kanji-word-filter">
            <option value="ALL">Tutti</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
          </select>
        </label>
        <div id="kanji-words-list" class="chip-wrap"></div>
      </article>
      ${noteEditorMarkup(itemRef.key)}
    `;
    bindKanjiWordFilter(kanji);
    await hydrateNoteField(itemRef.key);
  } else if (itemRef.kind === "grammar") {
    const item = context.grammarById.get(itemRef.key.replace("grammar:", ""));
    if (!item) {
      panel.innerHTML = "";
      panel.classList.remove("detail-open");
      return;
    }

    panel.innerHTML = `
      <article class="material-card">
        <p class="material-card-title" data-popup-reading="" data-popup-meaning="${escapeHtml(pickLocalizedText(item.spiegazione, locale))}">${escapeHtml(item.struttura)}</p>
        <p>${escapeHtml(pickLocalizedText(item.spiegazione, locale))}</p>
        <p><strong>Livello:</strong> ${jlptLabel(item.livello_jlpt)}</p>
      </article>
      ${grammarExampleMarkup(item)}
      ${noteEditorMarkup(itemRef.key)}
    `;
    await hydrateNoteField(itemRef.key);
  } else {
    const objective = objectives.find((obj) => obj.id === itemRef.key.replace("objective:", ""));
    if (!objective || !objective.target_jlpt) {
      panel.innerHTML = "";
      panel.classList.remove("detail-open");
      return;
    }

    const scopedWords = words.filter((w) => supportsLevel(w.livello_jlpt, objective.target_jlpt as JLPTLevel));
    const scopedGrammar = grammar.filter((g) => supportsLevel(g.livello_jlpt, objective.target_jlpt as JLPTLevel));
    const kanjiSet = new Set(scopedWords.flatMap((w) => w.kanji_usati));
    const scopedKanji = kanjiRows.filter((k) => kanjiSet.has(k.id));

    panel.innerHTML = `
      <article class="material-card">
        <p class="material-card-title">${escapeHtml(objective.name)}</p>
        <p><strong>Target:</strong> ${objective.target_jlpt}</p>
        <p class="objective-sub">Clicca un elemento per aprire la scheda completa.</p>
      </article>
      <article class="material-card">
        <p class="material-card-title">PAROLE (Vocabolario)</p>
        <div class="chip-wrap">${scopedWords.map((w) => wordLinkButton(w)).join("")}</div>
      </article>
      <article class="material-card">
        <p class="material-card-title">KANJI</p>
        <div class="chip-wrap">${scopedKanji.map((k) => kanjiLinkButton(k)).join("") || "<span class=\"objective-sub\">Nessun kanji disponibile.</span>"}</div>
      </article>
      <article class="material-card">
        <p class="material-card-title">FORME GRAMMATICALI</p>
        <div class="chip-wrap">${scopedGrammar
          .map(
            (g) =>
              `<button class="chip" data-detail-key="grammar:${g.id}" data-popup-reading="" data-popup-meaning="${escapeHtml(pickLocalizedText(g.spiegazione, locale))}">${escapeHtml(g.struttura)} (${g.livello_jlpt})</button>`
          )
          .join("")}</div>
      </article>
    `;
  }

  panel.classList.add("detail-open");

  if (interactiveWordInstance) {
    interactiveWordInstance.destroy();
  }

  const sentenceText =
    itemRef.kind === "grammar"
      ? context.grammarById.get(itemRef.key.replace("grammar:", ""))?.frasi_esempio[0]?.testo ?? ""
      : itemRef.kind === "word"
        ? `${context.wordsById.get(itemRef.key.replace("word:", ""))?.scrittura ?? ""}を使う。`
        : "";

  if (sentenceText) {
    const container = document.createElement("p");
    container.className = "interactive-sentence";
    panel.appendChild(container);
    interactiveWordInstance = new InteractiveWord({
      db,
      container,
      text: sentenceText,
      locale
    });
    await interactiveWordInstance.render();
  }

  panel.querySelectorAll<HTMLElement>("[data-note-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-note-save");
      if (!id) {
        return;
      }
      const input = panel.querySelector(`[data-note-input=\"${CSS.escape(id)}\"]`) as HTMLTextAreaElement | null;
      if (!input) {
        return;
      }
      await saveUserNote(id, input.value);
      setStatus("Nota salvata.", true);
    });
  });

  panel.querySelectorAll<HTMLElement>("[data-tts-reading]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wordId = btn.getAttribute("data-tts-reading");
      if (!wordId) {
        return;
      }
      const row = context.wordsById.get(wordId);
      if (row) {
        speakWordReading(row);
      }
    });
  });
}

function renderPostAnswerActions(correct: boolean): void {
  const root = document.getElementById("post-actions");
  if (!root || !activeQuiz) {
    return;
  }

  root.innerHTML = "";

  const detail = document.createElement("button");
  detail.className = "choice-btn";
  detail.textContent = "Approfondisci";
  detail.addEventListener("click", () => {
    if (activeQuiz) {
      clearTimers();
      detailCurrentItem = activeQuiz.itemRef;
      setActiveSection("detail");
      void renderDetailPanel(activeQuiz.itemRef);
    }
  });

  const next = document.createElement("button");
  next.className = "choice-btn";
  next.textContent = "Prossima domanda";
  next.addEventListener("click", async () => {
    clearTimers();
    await nextAutoQuiz();
  });

  root.append(detail, next);

  if (correct) {
    const seconds = Math.max(0.5, settings.auto_next_delay_ms / 1000);
    next.textContent = `Prossima domanda (${seconds.toFixed(seconds < 1 ? 1 : 0)}s)`;
    autoNextTimerId = window.setTimeout(async () => {
      await nextAutoQuiz();
    }, settings.auto_next_delay_ms);
  }
}

function startAnswerDeadline(): void {
  if (!activeQuiz) {
    return;
  }

  const timer = document.getElementById("answer-timer");
  const startTs = activeQuiz.startedAt;
  const maxMs = settings.max_answer_time_ms;

  const tick = (): void => {
    if (!timer || !activeQuiz || activeQuiz.answered) {
      return;
    }
    const remaining = Math.max(0, maxMs - (Date.now() - startTs));
    timer.textContent = `Tempo risposta: ${(remaining / 1000).toFixed(1)}s`;
  };

  tick();
  answerTickIntervalId = window.setInterval(tick, 100);

  answerTimeoutId = window.setTimeout(async () => {
    if (!activeQuiz || activeQuiz.answered) {
      return;
    }
    await evaluateAnswer(false, activeQuiz.itemRef.level, "timeout");
  }, maxMs);
}

function renderChoices(values: string[], onPick: (value: string) => Promise<void>): void {
  const root = document.getElementById("choices");
  if (!root) {
    return;
  }

  root.innerHTML = "";
  for (const value of values) {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.textContent = value;
    button.addEventListener("click", async () => onPick(value));
    root.appendChild(button);
  }
}

function renderSentenceOrdering(question: SentenceOrderingQuestion, level: JLPTLevel): void {
  const root = document.getElementById("choices");
  if (!root) {
    return;
  }

  root.innerHTML = "";

  const area = document.createElement("div");
  area.className = "build-area";

  const selected: string[] = [];
  const buttons: HTMLButtonElement[] = [];

  for (const token of question.tokens) {
    const btn = document.createElement("button");
    btn.className = "token-btn";
    btn.textContent = token;
    btn.addEventListener("click", () => {
      selected.push(token);
      area.textContent = selected.join("");
      btn.disabled = true;
    });
    buttons.push(btn);
    root.appendChild(btn);
  }

  const controls = document.createElement("div");
  controls.className = "row";

  const reset = document.createElement("button");
  reset.className = "choice-btn";
  reset.textContent = "Reset";
  reset.addEventListener("click", () => {
    selected.length = 0;
    area.textContent = "";
    for (const btn of buttons) {
      btn.disabled = false;
    }
  });

  const check = document.createElement("button");
  check.className = "choice-btn";
  check.textContent = "Conferma";
  check.addEventListener("click", async () => {
    const ok = selected.join("") === question.correctOrder.join("");
    await evaluateAnswer(ok, level, "manual");
  });

  controls.append(reset, check);
  root.append(area, controls);
}

function renderCurrentQuiz(): void {
  const questionRoot = document.getElementById("question");
  const choicesRoot = document.getElementById("choices");
  const detail = document.getElementById("detail-panel");

  if (!questionRoot || !choicesRoot || !activeQuiz) {
    return;
  }

  if (detail) {
    detail.innerHTML = "";
    detail.classList.remove("detail-open");
  }
  clearPostActions();
  setStatus("", true);

  const q = activeQuiz.question;
  const level = activeQuiz.itemRef.level;
  setQuizMeta(`Item ${activeQuiz.itemRef.kind.toUpperCase()} • ${level}`);

  if (q.mode === "flashcard-production") {
    questionRoot.textContent = `Produci significato o pronuncia di: ${q.prompt}`;
    choicesRoot.innerHTML = "";

    const reveal = document.createElement("button");
    reveal.className = "choice-btn";
    reveal.textContent = "Mostra soluzione";
    reveal.addEventListener("click", () => {
      const out = document.createElement("div");
      out.className = "solution";
      out.textContent = q.correctAnswer;
      choicesRoot.appendChild(out);
    });

    const correct = document.createElement("button");
    correct.className = "choice-btn good";
    correct.textContent = "Ricordata";
    correct.addEventListener("click", async () => {
      await evaluateAnswer(true, level, "manual");
    });

    const wrong = document.createElement("button");
    wrong.className = "choice-btn bad";
    wrong.textContent = "Non ricordata";
    wrong.addEventListener("click", async () => {
      await evaluateAnswer(false, level, "manual");
    });

    choicesRoot.append(reveal, correct, wrong);
    return;
  }

  if (q.mode === "flashcard-recognition") {
    questionRoot.textContent = `Scegli la parola giusta per: ${q.prompt}`;
    renderChoices(q.choices ?? [], async (choice) => {
      await evaluateAnswer(choice === q.correctAnswer, level, "manual");
    });
    return;
  }

  if (q.mode === "multiple-choice") {
    questionRoot.textContent = `Scegli il significato corretto di ${q.prompt}`;
    renderChoices(q.choices, async (choice) => {
      await evaluateAnswer(choice === q.correctChoice, level, "manual");
    });
    return;
  }

  if (q.mode === "sentence-ordering") {
    questionRoot.textContent = `Riordina i token: ${q.prompt}`;
    renderSentenceOrdering(q, level);
    return;
  }

  const cloze = q as ClozeQuestion;
  questionRoot.innerHTML = `Completa la frase: ${cloze.sentenceWithBlank}`;
  renderChoices(cloze.choices, async (choice) => {
    await evaluateAnswer(choice === cloze.correctChoice, level, "manual");
  });
}

async function evaluateAnswer(
  correct: boolean,
  level: JLPTLevel,
  reason: "manual" | "timeout"
): Promise<void> {
  if (!activeQuiz || activeQuiz.answered) {
    return;
  }

  activeQuiz.answered = true;
  clearTimers();

  const elapsed = Date.now() - activeQuiz.startedAt;
  const before = getSrsByItem(activeQuiz.itemRef.key) ?? createInitialSrs(activeQuiz.itemRef.key);
  const after = await upsertSrs(activeQuiz.itemRef.key, correct);

  const xp = calculateQuizXp({
    quizMode: activeQuiz.question.mode,
    isCorrect: correct,
    responseTimeMs: elapsed,
    jlptLevel: level,
    srsStage: before.srs_stage,
    completedCustomGroup: false
  });

  await addXp(correct ? xp.total : -6);
  renderObjectives();

  const nextMin = Math.max(1, Math.round((after.next_review_date - Date.now()) / 60_000));

  if (reason === "timeout") {
    revealCorrectAnswer(activeQuiz);
    setStatus(`Tempo scaduto. Risposta non ricordata. Ripasso ~${nextMin} min.`, false);
    renderPostAnswerActions(false);
    return;
  }

  if (correct) {
    setStatus(`Corretto! +${xp.total} XP. Ripasso ~${nextMin} min.`, true);
    renderPostAnswerActions(true);
    return;
  }

  revealCorrectAnswer(activeQuiz);
  setStatus(`Errato. -6 XP. Ripasso anticipato ~${nextMin} min.`, false);
  renderPostAnswerActions(false);
}

function fillSettingsForm(): void {
  const auto = document.getElementById("setting-auto-next") as HTMLInputElement | null;
  const max = document.getElementById("setting-max-answer") as HTMLInputElement | null;
  if (auto) {
    auto.value = (settings.auto_next_delay_ms / 1000).toString();
  }
  if (max) {
    max.value = (settings.max_answer_time_ms / 1000).toString();
  }
}

async function saveSettingsFromForm(): Promise<void> {
  const auto = document.getElementById("setting-auto-next") as HTMLInputElement | null;
  const max = document.getElementById("setting-max-answer") as HTMLInputElement | null;
  if (!auto || !max) {
    return;
  }

  const autoMs = Math.round(Math.max(0.5, Number(auto.value || "2")) * 1000);
  const maxMs = Math.round(Math.max(3, Number(max.value || "20")) * 1000);

  settings = {
    id: "default",
    auto_next_delay_ms: autoMs,
    max_answer_time_ms: maxMs,
    updated_at: Date.now()
  };

  await db.app_settings.put(settings);
  setStatus("Impostazioni salvate.", true);
}

function setupInlinePopup(): void {
  const popup = document.getElementById("inline-popup");
  if (!popup) {
    return;
  }

  let touchTimer: number | null = null;

  const show = (event: MouseEvent | TouchEvent, target: HTMLElement): void => {
    const reading = target.getAttribute("data-popup-reading") ?? "";
    const meaning = target.getAttribute("data-popup-meaning") ?? "";
    if (!reading && !meaning) {
      return;
    }

    const point = "touches" in event && event.touches.length > 0 ? event.touches[0] : (event as MouseEvent);
    popup.innerHTML = `<strong>${escapeHtml(meaning || "-")}</strong><br/><span>${escapeHtml(reading || "-")}</span>`;
    popup.style.left = `${point.clientX + 12}px`;
    popup.style.top = `${point.clientY + 12}px`;
    popup.classList.add("inline-popup-open");
  };

  const hide = (): void => {
    popup.classList.remove("inline-popup-open");
  };

  document.addEventListener("mouseover", (event) => {
    const target = (event.target as HTMLElement).closest("[data-popup-meaning]") as HTMLElement | null;
    if (target) {
      show(event, target);
    }
  });

  document.addEventListener("mouseout", () => {
    hide();
  });

  document.addEventListener("touchstart", (event) => {
    const target = (event.target as HTMLElement).closest("[data-popup-meaning]") as HTMLElement | null;
    if (!target) {
      return;
    }
    touchTimer = window.setTimeout(() => {
      show(event, target);
    }, 260);
  });

  document.addEventListener("touchend", () => {
    if (touchTimer !== null) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    hide();
  });
}

async function nextAutoQuiz(): Promise<void> {
  clearTimers();
  clearPostActions();

  const pool = getActivePool();
  if (pool.length === 0) {
    setStatus("Attiva almeno un obiettivo nella Home e premi Studia.", false);
    return;
  }

  const poolSet = new Set(pool.map((p) => p.key));
  const now = Date.now();

  const due = srsRows
    .filter((row) => row.next_review_date <= now)
    .map((row) => parseItemRef(row.id_item))
    .filter((item): item is ItemRef => Boolean(item))
    .filter((item) => poolSet.has(item.key));

  let selected: ItemRef | undefined;

  if (due.length > 0) {
    selected = due.sort((a, b) => {
      const aDue = getSrsByItem(a.key)?.next_review_date ?? 0;
      const bDue = getSrsByItem(b.key)?.next_review_date ?? 0;
      return aDue - bDue;
    })[0];
  } else {
    const unseen = pool.filter((item) => !getSrsByItem(item.key));
    selected = unseen.length > 0 ? sample(unseen) : sample(pool);
  }

  if (!selected) {
    setStatus("Nessun item disponibile per il quiz.", false);
    return;
  }

  const quiz = await generateQuizForItem(selected);
  if (!quiz) {
    setStatus("Non riesco a generare questa domanda.", false);
    return;
  }

  activeQuiz = quiz;
  detailCurrentItem = selected;
  renderCurrentQuiz();
  startAnswerDeadline();
}

function wireEvents(): void {
  const form = document.getElementById("objective-form") as HTMLFormElement | null;
  const nameInput = document.getElementById("objective-name") as HTMLInputElement | null;
  const levelSelect = document.getElementById("objective-level") as HTMLSelectElement | null;
  const list = document.getElementById("objective-list");
  const studyAllBtn = document.getElementById("btn-study-all") as HTMLButtonElement | null;
  const startStudyBtn = document.getElementById("btn-start-study") as HTMLButtonElement | null;
  const nextQuizBtn = document.getElementById("btn-next-quiz") as HTMLButtonElement | null;
  const ttsBtn = document.getElementById("btn-tts") as HTMLButtonElement | null;
  const menu = document.getElementById("app-menu");
  const burgerBtn = document.getElementById("btn-burger") as HTMLButtonElement | null;
  const settingsForm = document.getElementById("settings-form") as HTMLFormElement | null;
  const detailPanel = document.getElementById("detail-panel");
  const backQuizBtn = document.getElementById("btn-back-quiz") as HTMLButtonElement | null;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput?.value ?? "";
    const level = (levelSelect?.value ?? "N5") as JLPTLevel;
    await addObjective(name, level);
    if (nameInput) {
      nameInput.value = "";
    }
    setStatus("Obiettivo aggiunto.", true);
  });

  list?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("[data-objective-toggle]") as HTMLButtonElement | null;
    const objectiveId = button?.getAttribute("data-objective-toggle");
    if (objectiveId) {
      const objective = objectives.find((obj) => obj.id === objectiveId);
      await toggleObjective(objectiveId, !(objective?.study_enabled ?? false));
      return;
    }

    const card = target.closest("[data-objective-open]") as HTMLElement | null;
    const openId = card?.getAttribute("data-objective-open");
    if (!openId) {
      return;
    }

    const objectiveRef = parseItemRef(`objective:${openId}`);
    if (!objectiveRef) {
      return;
    }

    detailCurrentItem = objectiveRef;
    setActiveSection("detail");
    await renderDetailPanel(objectiveRef);
  });

  studyAllBtn?.addEventListener("click", async () => {
    await setStudyAll();
    setStatus("Tutti gli obiettivi sono attivi.", true);
  });

  startStudyBtn?.addEventListener("click", async () => {
    setActiveSection("quiz");
    await nextAutoQuiz();
  });

  nextQuizBtn?.addEventListener("click", async () => {
    await nextAutoQuiz();
  });

  ttsBtn?.addEventListener("click", () => {
    if (activeWordForTts) {
      speakWordReading(activeWordForTts);
    }
  });

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettingsFromForm();
  });

  burgerBtn?.addEventListener("click", () => {
    menu?.classList.toggle("menu-open");
  });

  menu?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("[data-nav-section]") as HTMLButtonElement | null;
    const section = button?.getAttribute("data-nav-section") as Section | null;
    if (section) {
      setActiveSection(section);
    }
  });

  backQuizBtn?.addEventListener("click", () => {
    setActiveSection("quiz");
  });

  detailPanel?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const btn = target.closest("[data-detail-key]") as HTMLButtonElement | null;
    const key = btn?.getAttribute("data-detail-key");
    if (!key) {
      return;
    }

    const item = parseItemRef(key);
    if (!item) {
      return;
    }

    detailCurrentItem = item;
    await renderDetailPanel(item);
  });
}

function mountInitialQuizState(): void {
  setQuizMeta("Premi Studia dalla Home per iniziare il quiz.");
  const question = document.getElementById("question");
  if (question) {
    question.textContent = "Studia genera automaticamente la prossima domanda.";
  }
}

async function bootstrap(): Promise<void> {
  registerServiceWorker();
  mountUi();
  setupInlinePopup();
  wireEvents();

  await ensureSeedLoaded();
  await ensureDefaultObjectives();
  await ensureDefaultSettings();
  await hydrateState();

  renderObjectives();
  fillSettingsForm();
  mountInitialQuizState();
  setActiveSection("home");
  setStatus("Pronto. Avvia dallo Studia in Home.", true);
}

void bootstrap();
