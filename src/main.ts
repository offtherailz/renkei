import "./app.css";
import {
  AppSettings,
  DatabaseSeed,
  InteractiveWord,
  Kanji,
  JLPTLevel,
  SrsProgress,
  StudyGoal,
  StudyObjective,
  UserPersonalization,
  Word,
  applySrsReview,
  calculateQuizXp,
  createGrammarQuestion,
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
  speakSentenceJapanese,
  speakWordReading
} from "./index";
import { ClozeQuestion, DistractorIndex, QuizContext, QuizQuestion, SentenceOrderingQuestion } from "./quiz/types";
import { Grammar } from "./types/models";

type ItemKind = "word" | "grammar" | "kanji" | "objective";
type Section = "home" | "quiz" | "settings" | "detail" | "stats";

interface SessionStats {
  startedAt: number;
  endedAt: number;
  answers: number;
  correct: number;
  wrong: number;
  timeout: number;
}

interface StudySessionState {
  startedAt: number;
  answers: number;
  correct: number;
  wrong: number;
  timeout: number;
}

interface DailyAggregate {
  day: string;
  durationMs: number;
  answers: number;
  correct: number;
  wrong: number;
  timeout: number;
}

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
const STUDY_STATS_STORAGE_KEY = "renkei_study_session_stats_v1";
const SEED_DATA_REVISION = "2026-06-07-catalog-v2";
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
let detailBackObjectiveRef: ItemRef | null = null;

let autoNextTimerId: number | null = null;
let answerTimeoutId: number | null = null;
let answerTickIntervalId: number | null = null;
let nextCountdownIntervalId: number | null = null;
let sessionState: StudySessionState | null = null;
let currentSection: Section = "home";
let studyGoal: StudyGoal | null = null;

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

function buildJishoKanjiUrl(kanji: string): string {
  return `https://jisho.org/search/%23kanji%20${encodeURIComponent(kanji)}`;
}

function buildJishoSentenceUrl(query: string): string {
  return `https://jisho.org/search/${encodeURIComponent(query)}%20%23sentences`;
}

function buildTatoebaSentenceUrl(query: string): string {
  const toLang = locale === "it" ? "ita" : "eng";
  return `https://tatoeba.org/it/sentences/search?from=jpn&to=${toLang}&query=${encodeURIComponent(query)}`;
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
  if (nextCountdownIntervalId !== null) {
    clearInterval(nextCountdownIntervalId);
    nextCountdownIntervalId = null;
  }
  const timer = document.getElementById("answer-timer");
  if (timer) {
    timer.textContent = "";
  }
}

function setActiveSection(section: Section): void {
  currentSection = section;
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

function updateDetailHeaderActions(): void {
  const quizBtn = document.getElementById("btn-back-quiz") as HTMLButtonElement | null;
  const objectiveBtn = document.getElementById("btn-back-objective") as HTMLButtonElement | null;
  if (quizBtn) {
    quizBtn.hidden = !activeQuiz;
  }
  if (objectiveBtn) {
    objectiveBtn.hidden = !detailBackObjectiveRef;
    if (detailBackObjectiveRef) {
      const objective = objectives.find((obj) => obj.id === detailBackObjectiveRef?.key.replace("objective:", ""));
      objectiveBtn.textContent = objective ? `Torna a ${objective.name}` : "Torna all'obiettivo";
    }
  }
}

function navigateToSection(section: Section, pushHistory = true): void {
  setActiveSection(section);
  if (pushHistory) {
    history.pushState({ section }, "", location.href);
  }
}

function toDayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function readSessionStats(): SessionStats[] {
  const raw = localStorage.getItem(STUDY_STATS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as SessionStats[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row) => typeof row.startedAt === "number" && typeof row.endedAt === "number");
  } catch {
    return [];
  }
}

function writeSessionStats(rows: SessionStats[]): void {
  localStorage.setItem(STUDY_STATS_STORAGE_KEY, JSON.stringify(rows.slice(-200)));
}

function aggregateLastWeek(stats: SessionStats[]): DailyAggregate[] {
  const now = Date.now();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  const map = new Map<string, DailyAggregate>();

  for (const row of stats) {
    if (row.endedAt < cutoff) {
      continue;
    }
    const day = toDayKey(row.endedAt);
    const current = map.get(day) ?? {
      day,
      durationMs: 0,
      answers: 0,
      correct: 0,
      wrong: 0,
      timeout: 0
    };
    current.durationMs += Math.max(0, row.endedAt - row.startedAt);
    current.answers += row.answers;
    current.correct += row.correct;
    current.wrong += row.wrong;
    current.timeout += row.timeout;
    map.set(day, current);
  }

  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function getTodayAggregate(stats: SessionStats[]): DailyAggregate {
  const today = toDayKey(Date.now());
  const week = aggregateLastWeek(stats);
  return (
    week.find((row) => row.day === today) ?? {
      day: today,
      durationMs: 0,
      answers: 0,
      correct: 0,
      wrong: 0,
      timeout: 0
    }
  );
}

function startStudySession(): void {
  if (sessionState) {
    return;
  }
  sessionState = {
    startedAt: Date.now(),
    answers: 0,
    correct: 0,
    wrong: 0,
    timeout: 0
  };
}

function stopStudySession(manualStop = true): void {
  if (!sessionState) {
    return;
  }
  const endedAt = Date.now();
  const finished: SessionStats = {
    startedAt: sessionState.startedAt,
    endedAt,
    answers: sessionState.answers,
    correct: sessionState.correct,
    wrong: sessionState.wrong,
    timeout: sessionState.timeout
  };
  const all = readSessionStats();
  all.push(finished);
  writeSessionStats(all);
  sessionState = null;
  clearTimers();
  if (manualStop) {
    setStatus("Sessione fermata. Progressi salvati nelle statistiche.", true);
  }
  renderStatsPanel();
}

function updateSessionOnAnswer(correct: boolean, reason: "manual" | "timeout"): void {
  if (!sessionState) {
    startStudySession();
  }
  if (!sessionState) {
    return;
  }
  sessionState.answers += 1;
  if (correct) {
    sessionState.correct += 1;
    return;
  }
  sessionState.wrong += 1;
  if (reason === "timeout") {
    sessionState.timeout += 1;
  }
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

function getObjectiveChildren(objectiveId: string): StudyObjective[] {
  return objectives.filter((obj) => obj.parent_objective_id === objectiveId);
}

function objectiveDirectItems(objective: StudyObjective): ItemRef[] {
  if (objective.catalog_item_keys.length > 0) {
    return objective.catalog_item_keys
      .map((key) => parseItemRef(key))
      .filter((item): item is ItemRef => Boolean(item));
  }

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

function objectivePool(objective: StudyObjective): ItemRef[] {
  const stack = [objective];
  const unique = new Map<string, ItemRef>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const item of objectiveDirectItems(current)) {
      unique.set(item.key, item);
    }

    const children = getObjectiveChildren(current.id);
    stack.push(...children);
  }

  return [...unique.values()];
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

function objectiveItemBreakdown(items: ItemRef[]): { words: number; kanji: number; grammar: number } {
  return items.reduce(
    (acc, item) => {
      if (item.kind === "word") {
        acc.words += 1;
      } else if (item.kind === "kanji") {
        acc.kanji += 1;
      } else if (item.kind === "grammar") {
        acc.grammar += 1;
      }
      return acc;
    },
    { words: 0, kanji: 0, grammar: 0 }
  );
}

function masteryText(itemKey: string): string {
  const srs = getSrsByItem(itemKey) ?? createInitialSrs(itemKey);
  const mastery = normalizeMastery(srs.srs_stage, srs.mastery_points);
  const minutes = Math.max(0, Math.round((srs.next_review_date - Date.now()) / 60_000));
  const next = minutes <= 0 ? "adesso" : `tra ~${minutes} min`;
  return `Consolidamento ${mastery}% • SRS ${srs.srs_stage}/7 • Prossimo ripasso ${next}`;
}

function alternativeReadings(word: Word): string[] {
  const bySameWriting = words
    .filter((w) => w.scrittura === word.scrittura && w.id !== word.id)
    .map((w) => w.lettura);

  const fromId = word.id.includes("-") ? [word.id.split("-")[1] ?? ""] : [];
  const unique = new Set([...bySameWriting, ...fromId, word.lettura].filter((reading) => Boolean(reading)));
  unique.delete(word.lettura);
  return [...unique];
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
  const topLevel = objectives.filter((obj) => !obj.parent_objective_id);

  for (const objective of topLevel) {
    const progress = objectiveProgress(objective);
    const children = getObjectiveChildren(objective.id);
    const items = objectivePool(objective).length;
    const breakdown = objectiveItemBreakdown(objectivePool(objective));
    const card = document.createElement("article");
    card.className = "objective-item objective-item-compact";
    card.setAttribute("data-objective-open", objective.id);
    card.innerHTML = `
      <div class="objective-top">
        <strong>${escapeHtml(objective.name)}</strong>
        <button class="objective-toggle ${objective.study_enabled ? "objective-toggle-on" : "objective-toggle-off"}" data-objective-toggle="${objective.id}">
          ${objective.study_enabled ? "In studio" : "Pausa"}
        </button>
      </div>
      <div class="objective-sub">${objective.target_jlpt ? `Target ${objective.target_jlpt}` : "Catalogo custom"} • ${items} item • ${children.length} gruppi</div>
      <div class="objective-sub">Parole ${breakdown.words} • Kanji ${breakdown.kanji} • Grammatica ${breakdown.grammar}</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${progress}%; background:${progressColor(progress)}"></div></div>
      <div class="objective-sub">Consolidamento: ${progress}%</div>
      <div class="objective-hint">Apri dettagli per vedere i gruppi</div>
    `;
    root.appendChild(card);
  }
}

function renderStatsPanel(): void {
  const root = document.getElementById("stats-panel");
  if (!root) {
    return;
  }

  const history = readSessionStats();
  const week = aggregateLastWeek(history);
  const totals = week.reduce(
    (acc, row) => {
      acc.durationMs += row.durationMs;
      acc.answers += row.answers;
      acc.correct += row.correct;
      acc.wrong += row.wrong;
      acc.timeout += row.timeout;
      return acc;
    },
    { durationMs: 0, answers: 0, correct: 0, wrong: 0, timeout: 0 }
  );

  const weeklyMinutes = Math.round(totals.durationMs / 60_000);
  const accuracy = totals.answers > 0 ? Math.round((totals.correct / totals.answers) * 100) : 0;
  const sessionDuration = sessionState ? Math.round((Date.now() - sessionState.startedAt) / 60_000) : 0;
  const today = getTodayAggregate(history);

  const tasks = [
    `Risposte oggi: ${today.answers}`,
    `Review giornalieri: ${today.answers}/${studyGoal?.daily_reviews ?? 20}`,
    `Nuove parole (proxy): ${today.correct}/${studyGoal?.daily_new_words ?? 10}`,
    `Grammatica (proxy): ${Math.round(today.correct * 0.3)}/${studyGoal?.daily_grammar ?? 5}`
  ];

  root.innerHTML = `
    <article class="material-card">
      <p class="material-card-title">Statistiche settimana</p>
      <p><strong>Tempo totale:</strong> ${weeklyMinutes} min</p>
      <p><strong>Risposte:</strong> ${totals.answers} • <strong>Corrette:</strong> ${totals.correct} • <strong>Accuracy:</strong> ${accuracy}%</p>
      <p><strong>Timeout:</strong> ${totals.timeout}</p>
      <p class="objective-sub">Sessioni registrate: ${history.length}</p>
    </article>
    <article class="material-card">
      <p class="material-card-title">Sessione corrente</p>
      <p>${
        sessionState
          ? `<strong>In corso:</strong> ${sessionDuration} min • Risposte ${sessionState.answers} (✅ ${sessionState.correct} / ❌ ${sessionState.wrong})`
          : "Nessuna sessione attiva. Premi Studia per iniziare."
      }</p>
      <button id="btn-stop-session-stats" class="ghost" type="button" ${sessionState ? "" : "disabled"}>Ferma sessione</button>
    </article>
    <article class="material-card">
      <p class="material-card-title">Obiettivi giornalieri</p>
      <p><strong>Target JLPT:</strong> ${studyGoal?.target_jlpt ?? "N4"}</p>
      <div class="goal-list">${tasks.map((task) => `<div class="goal-row">${escapeHtml(task)}</div>`).join("")}</div>
    </article>
  `;

  const stop = document.getElementById("btn-stop-session-stats") as HTMLButtonElement | null;
  stop?.addEventListener("click", () => {
    stopStudySession(true);
  });
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

async function applyObjectiveFocus(level: JLPTLevel): Promise<void> {
  const now = Date.now();
  const next = objectives.map((o) => {
    const isLevelScope = o.target_jlpt === level || (o.parent_objective_id ? objectives.find((x) => x.id === o.parent_objective_id)?.target_jlpt === level : false);
    return { ...o, study_enabled: isLevelScope, updated_at: now };
  });
  await db.study_objectives.bulkPut(next);
  objectives = next;
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
        <img class="logo" src="${BASE_URL}renkei-logo.svg" alt="Renkei logo" />
        <div>
          <h1>Renkei (連携)</h1>
          <p class="tagline">JLPT trainer touch-first: Active Recall + SRS + obiettivi</p>
        </div>
        <button id="btn-burger" class="ghost burger-btn" type="button" aria-label="Apri menu">☰</button>
      </header>

      <aside id="app-menu" class="app-menu">
        <button class="menu-link menu-link-active" data-nav-section="home" type="button">Home</button>
        <button class="menu-link" data-nav-section="stats" type="button">Statistiche</button>
        <button class="menu-link" data-nav-section="settings" type="button">Settings</button>
      </aside>

      <section class="card panel-section panel-active" data-section="home">
        <div class="section-head">
          <h2>Home</h2>
          <button id="btn-study-all" class="ghost" type="button">Attiva tutti</button>
        </div>

        <div class="objective-list" id="objective-list"></div>

        <div class="row">
          <button id="btn-start-study" class="primary-wide" type="button">Studia</button>
          <button id="btn-focus-n5" class="ghost" type="button">Focus N5</button>
          <button id="btn-focus-n4" class="ghost" type="button">Focus N4</button>
        </div>
      </section>

      <section class="card quiz-card panel-section" data-section="quiz">
        <div class="section-head">
          <h2>Studio</h2>
          <div class="quiz-actions">
            <button id="btn-tts" class="ghost" type="button">Ascolta</button>
            <button id="btn-next-quiz" class="ghost" type="button">Salta</button>
            <button id="btn-stop-session" class="ghost" type="button">Ferma sessione</button>
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
          <div class="quiz-actions">
            <button id="btn-back-objective" class="ghost" type="button" hidden>Torna all'obiettivo</button>
            <button id="btn-back-quiz" class="ghost" type="button" hidden>Torna al quiz</button>
          </div>
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
          <article class="material-card">
            <p class="material-card-title">Pianificazione obiettivi</p>
            <label class="material-field">
              <span>Target JLPT</span>
              <select id="goal-target-jlpt">
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </label>
            <label class="material-field">
              <span>Review giornalieri</span>
              <input id="goal-daily-reviews" type="number" min="1" step="1" />
            </label>
            <label class="material-field">
              <span>Nuove parole/giorno</span>
              <input id="goal-daily-new" type="number" min="1" step="1" />
            </label>
            <label class="material-field">
              <span>Esercizi grammatica/giorno</span>
              <input id="goal-daily-grammar" type="number" min="1" step="1" />
            </label>
          </article>
          <article class="material-card">
            <p class="material-card-title">Catalogo locale</p>
            <p class="objective-sub">Forza il download del seed piu recente e riallinea parole, kanji, grammatica e obiettivi di default senza cancellare i tuoi progressi SRS.</p>
            <div class="row wrap-row">
              <button id="btn-refresh-catalog" class="ghost" type="button">Aggiorna catalogo</button>
            </div>
          </article>
          <button class="material-primary" type="submit">Salva impostazioni</button>
        </form>
      </section>

      <section class="card panel-section" data-section="stats">
        <div class="section-head"><h2>Statistiche studio</h2></div>
        <div id="stats-panel" class="settings-form"></div>
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
  const seedUrl = `${BASE_URL}seed-n5n4.json?v=${encodeURIComponent(SEED_DATA_REVISION)}`;
  const response = await fetch(seedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Seed non trovato.");
  }
  const payload = await response.text();

  if (counters.length > 0) {
    const parsed = JSON.parse(payload) as DatabaseSeed;
    await db.words.bulkPut(parsed.words);
    await db.kanji.bulkPut(parsed.kanji);
    await db.grammar.bulkPut(parsed.grammar);
    await db.counters.bulkPut(parsed.counters);
    return;
  }

  await importDatabaseFromJson(payload);
}

function chunkKeys(keys: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += size) {
    chunks.push(keys.slice(index, index + size));
  }
  return chunks;
}

function buildPackObjectives(
  parentId: string,
  label: string,
  level: JLPTLevel,
  keys: string[],
  packSize: number,
  now: number
): StudyObjective[] {
  return chunkKeys(keys, packSize).map((chunk, index) => ({
    id: `${parentId}-pack-${index + 1}`,
    name: `${label} • Pack ${index + 1}`,
    objective_type: "custom",
    target_jlpt: level,
    parent_objective_id: parentId,
    catalog_item_keys: chunk,
    study_enabled: true,
    created_at: now,
    updated_at: now
  }));
}

async function ensureDefaultObjectives(): Promise<void> {
  const rows = await db.study_objectives.toArray();

  const [seedWords, seedGrammar, seedKanji] = await Promise.all([db.words.toArray(), db.grammar.toArray(), db.kanji.toArray()]);

  const levelWordKeys = (level: JLPTLevel): string[] =>
    seedWords.filter((w) => w.livello_jlpt === level).map((w) => `word:${w.id}`);

  const levelGrammarKeys = (level: JLPTLevel): string[] =>
    seedGrammar.filter((g) => g.livello_jlpt === level).map((g) => `grammar:${g.id}`);

  const levelKanjiKeys = (level: JLPTLevel): string[] => {
    const kanjiSet = new Set(seedWords.filter((w) => w.livello_jlpt === level).flatMap((w) => w.kanji_usati));
    return seedKanji.filter((k) => kanjiSet.has(k.id)).map((k) => `kanji:${k.id}`);
  };

  const now = Date.now();
  const defaults: StudyObjective[] = [
    {
      id: "obj-catalog-n5",
      name: "Catalogo JLPT N5",
      objective_type: "jlpt",
      target_jlpt: "N5",
      catalog_item_keys: [],
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n5-words",
      name: "Parole N5",
      objective_type: "custom",
      target_jlpt: "N5",
      parent_objective_id: "obj-catalog-n5",
      catalog_item_keys: levelWordKeys("N5"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n5-kanji",
      name: "Kanji N5",
      objective_type: "custom",
      target_jlpt: "N5",
      parent_objective_id: "obj-catalog-n5",
      catalog_item_keys: levelKanjiKeys("N5"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n5-grammar",
      name: "Grammatica N5",
      objective_type: "custom",
      target_jlpt: "N5",
      parent_objective_id: "obj-catalog-n5",
      catalog_item_keys: levelGrammarKeys("N5"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n4",
      name: "Catalogo JLPT N4",
      objective_type: "jlpt",
      target_jlpt: "N4",
      catalog_item_keys: [],
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n4-words",
      name: "Parole N4",
      objective_type: "custom",
      target_jlpt: "N4",
      parent_objective_id: "obj-catalog-n4",
      catalog_item_keys: levelWordKeys("N4"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n4-kanji",
      name: "Kanji N4",
      objective_type: "custom",
      target_jlpt: "N4",
      parent_objective_id: "obj-catalog-n4",
      catalog_item_keys: levelKanjiKeys("N4"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "obj-catalog-n4-grammar",
      name: "Grammatica N4",
      objective_type: "custom",
      target_jlpt: "N4",
      parent_objective_id: "obj-catalog-n4",
      catalog_item_keys: levelGrammarKeys("N4"),
      study_enabled: true,
      created_at: now,
      updated_at: now
    }
  ];

  defaults.push(
    ...buildPackObjectives("obj-catalog-n5-words", "Parole N5", "N5", levelWordKeys("N5"), 50, now),
    ...buildPackObjectives("obj-catalog-n5-kanji", "Kanji N5", "N5", levelKanjiKeys("N5"), 20, now),
    ...buildPackObjectives("obj-catalog-n5-grammar", "Grammatica N5", "N5", levelGrammarKeys("N5"), 8, now),
    ...buildPackObjectives("obj-catalog-n4-words", "Parole N4", "N4", levelWordKeys("N4"), 50, now),
    ...buildPackObjectives("obj-catalog-n4-kanji", "Kanji N4", "N4", levelKanjiKeys("N4"), 20, now),
    ...buildPackObjectives("obj-catalog-n4-grammar", "Grammatica N4", "N4", levelGrammarKeys("N4"), 8, now)
  );

  const previousById = new Map(rows.map((row) => [row.id, row]));
  const syncedDefaults = defaults.map((objective) => {
    const previous = previousById.get(objective.id);
    return previous
      ? {
          ...objective,
          study_enabled: previous.study_enabled,
          created_at: previous.created_at,
          updated_at: now
        }
      : objective;
  });

  const staleSystemIds = rows.map((row) => row.id).filter((id) => id.startsWith("obj-catalog-") && !syncedDefaults.some((next) => next.id === id));
  if (staleSystemIds.length > 0) {
    await db.study_objectives.bulkDelete(staleSystemIds);
  }

  await db.study_objectives.bulkPut(syncedDefaults);
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

async function ensureDefaultStudyGoal(): Promise<void> {
  const row = await db.study_goals.get("default");
  if (row) {
    studyGoal = row;
    return;
  }

  const defaultGoal: StudyGoal = {
    id: "default",
    target_jlpt: "N4",
    daily_new_words: 10,
    daily_reviews: 20,
    daily_grammar: 5,
    modes_priority: ["flashcard-production", "multiple-choice", "sentence-ordering", "cloze"],
    updated_at: Date.now()
  };

  await db.study_goals.put(defaultGoal);
  studyGoal = defaultGoal;
}

async function hydrateState(): Promise<void> {
  const [loadedWords, loadedKanji, loadedGrammar, loadedObjectives, loadedSrs] = await Promise.all([
    db.words.toArray(),
    db.kanji.toArray(),
    db.grammar.toArray(),
    db.study_objectives.toArray(),
    db.srs_progress.toArray()
  ]);

  words = loadedWords;
  kanjiRows = loadedKanji;
  grammar = loadedGrammar;
  srsRows = loadedSrs;
  objectives = loadedObjectives.map((obj) => ({
    ...obj,
    catalog_item_keys: obj.catalog_item_keys ?? []
  }));

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

  if (itemRef.kind === "kanji") {
    const kanji = kanjiRows.find((k) => k.id === itemRef.key.replace("kanji:", ""));
    if (!kanji) {
      return null;
    }

    activeWordForTts = null;
    const correct = nativeMeaning(kanji.significato);
    const distractors = kanjiRows
      .filter((k) => k.id !== kanji.id)
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((k) => nativeMeaning(k.significato));

    return {
      itemRef,
      question: {
        mode: "multiple-choice",
        wordId: kanji.id,
        prompt: kanji.id,
        correctChoice: correct,
        choices: [correct, ...distractors].sort(() => Math.random() - 0.5)
      },
      startedAt: Date.now(),
      answered: false
    };
  }

  const entry = context.grammarById.get(itemRef.key.replace("grammar:", ""));
  if (!entry || entry.frasi_esempio.length === 0) {
    return null;
  }

  activeWordForTts = null;
  const example = sample(entry.frasi_esempio);
  const question = await createGrammarQuestion({ grammar: entry, example }, distractorIndex, entry.livello_jlpt, context, locale);

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
  if (question.mode === "reading-choice") {
    return question.correctChoice;
  }
  return (question as ClozeQuestion).correctChoice;
}

function speakAfterAnswer(quiz: ActiveQuiz): void {
  if (quiz.itemRef.kind === "word") {
    const word = context.wordsById.get(quiz.itemRef.key.replace("word:", ""));
    if (word) {
      speakWordReading(word);
    }
    return;
  }

  if (quiz.question.mode === "sentence-ordering") {
    speakSentenceJapanese(quiz.question.correctOrder.join(""));
    return;
  }

  if (quiz.question.mode === "reading-choice") {
    speakSentenceJapanese(quiz.question.plainSentence);
    return;
  }

  if (quiz.question.mode === "cloze") {
    speakSentenceJapanese(quiz.question.correctChoice);
    return;
  }

  if (quiz.question.mode === "multiple-choice") {
    speakSentenceJapanese(quiz.question.prompt);
  }
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
  return `<button class="chip chip-link" data-detail-key="word:${word.id}" data-popup-reading="${escapeHtml(word.lettura)}" data-popup-meaning="${escapeHtml(nativeMeaning(word.significato))}"><span class="chip-main"><ruby>${escapeHtml(word.scrittura)}<rt>${escapeHtml(word.lettura)}</rt></ruby></span><span class="chip-badges">${jlptLevelBadge(word.livello_jlpt)}</span></button>`;
}

function kanjiLinkButton(kanji: Kanji): string {
  const tag = (kanji.study_tags ?? []).find((value) => /^n[1-5]$/i.test(value));
  const level = (tag ? tag.toUpperCase() : "N5") as JLPTLevel;
  return `<button class="chip chip-link" data-detail-key="kanji:${kanji.id}" data-popup-reading="${escapeHtml(kanji.letture_kun.join(" / "))}" data-popup-meaning="${escapeHtml(nativeMeaning(kanji.significato))}"><span class="chip-main">${escapeHtml(kanji.id)}</span><span class="chip-badges">${jlptLevelBadge(level)}</span></button>`;
}

function jlptLevelBadge(level: JLPTLevel): string {
  return `<span class="level-badge level-${level.toLowerCase()}">${escapeHtml(level)}</span>`;
}

function furiganaBadge(label: string): string {
  return `<span class="jp-badge">${renderFuriganaToHtml(label)}</span>`;
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
          <div class="row wrap-row">
            <a class="external-link" href="${buildJishoSentenceUrl(ex.testo)}" target="_blank" rel="noreferrer">Frasi su Jisho</a>
            <a class="external-link" href="${buildTatoebaSentenceUrl(ex.testo)}" target="_blank" rel="noreferrer">Frasi su Tatoeba</a>
          </div>
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

  detailBackObjectiveRef = null;

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
    const altReadings = alternativeReadings(word);

    panel.innerHTML = `
      <article class="material-card">
        <div class="detail-card-head">
          <p class="material-card-title" data-popup-reading="${escapeHtml(word.lettura)}" data-popup-meaning="${escapeHtml(nativeMeaning(word.significato))}">${escapeHtml(word.scrittura)} (${escapeHtml(word.lettura)})</p>
          <div class="detail-badges">${jlptLevelBadge(word.livello_jlpt)}${furiganaBadge(word.tipo_jp)}</div>
        </div>
        <p>${escapeHtml(nativeMeaning(word.significato))}</p>
        <p><strong>Memoria:</strong> ${escapeHtml(masteryText(itemRef.key))}</p>
        <p><strong>Letture alternative:</strong> ${altReadings.length > 0 ? escapeHtml(altReadings.join(" / ")) : "-"}</p>
        <p><strong>Pitch:</strong> ${escapeHtml(word.pitch_accent ?? "-")}</p>
        <div class="row">
          <button class="ghost" data-tts-reading="${escapeHtml(word.id)}" type="button">Ascolta pronuncia</button>
          <a class="external-link" href="${escapeHtml(word.link_jisho ?? `https://jisho.org/search/${encodeURIComponent(word.scrittura)}`)}" target="_blank" rel="noreferrer">Apri su Jisho</a>
          <a class="external-link" href="${buildJishoSentenceUrl(word.scrittura)}" target="_blank" rel="noreferrer">Frasi su Jisho</a>
          <a class="external-link" href="${buildTatoebaSentenceUrl(word.scrittura)}" target="_blank" rel="noreferrer">Frasi su Tatoeba</a>
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
        <div class="detail-card-head">
          <p class="material-card-title">Kanji ${escapeHtml(kanji.id)}</p>
          <div class="detail-badges">${jlptLevelBadge(itemRef.level)}${furiganaBadge(`読[よ]み`)}</div>
        </div>
        <p>${escapeHtml(nativeMeaning(kanji.significato))}</p>
        <p><strong>On'yomi:</strong> ${escapeHtml(kanji.letture_on.join(" / ") || "-")}</p>
        <p><strong>Kun'yomi:</strong> ${escapeHtml(kanji.letture_kun.join(" / ") || "-")}</p>
        <div class="row">
          <a class="external-link" href="${buildJishoKanjiUrl(kanji.id)}" target="_blank" rel="noreferrer">Apri su Jisho</a>
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
        <div class="detail-card-head">
          <p class="material-card-title" data-popup-reading="" data-popup-meaning="${escapeHtml(pickLocalizedText(item.spiegazione, locale))}">${escapeHtml(item.struttura)}</p>
          <div class="detail-badges">${jlptLevelBadge(item.livello_jlpt)}${item.categoria_jp ? furiganaBadge(item.categoria_jp) : ""}</div>
        </div>
        <p>${escapeHtml(pickLocalizedText(item.spiegazione, locale))}</p>
      </article>
      ${grammarExampleMarkup(item)}
      ${noteEditorMarkup(itemRef.key)}
    `;
    await hydrateNoteField(itemRef.key);
  } else {
    const objective = objectives.find((obj) => obj.id === itemRef.key.replace("objective:", ""));
    if (!objective) {
      panel.innerHTML = "";
      panel.classList.remove("detail-open");
      updateDetailHeaderActions();
      return;
    }

    if (objective.parent_objective_id) {
      detailBackObjectiveRef = parseItemRef(`objective:${objective.parent_objective_id}`);
    }

    const children = getObjectiveChildren(objective.id);
    const pool = objectivePool(objective);
    const directItems = objectiveDirectItems(objective);
    const poolBreakdown = objectiveItemBreakdown(pool);
    const progress = objectiveProgress(objective);

    if (children.length > 0) {
      panel.innerHTML = `
        <article class="material-card">
          <p class="material-card-title">${escapeHtml(objective.name)}</p>
          <p><strong>Target:</strong> ${objective.target_jlpt ?? "Custom"}</p>
          <p><strong>Contenuti:</strong> ${pool.length} item • Parole ${poolBreakdown.words} • Kanji ${poolBreakdown.kanji} • Grammatica ${poolBreakdown.grammar}</p>
          <p><strong>Consolidamento:</strong> ${progress}%</p>
          <p class="objective-sub">Apri un gruppo per vedere il dettaglio completo.</p>
        </article>
        <article class="material-card">
          <p class="material-card-title">Gruppi obiettivo</p>
          <div class="objective-group-list">${children
            .map((child) => {
              const childPool = objectivePool(child);
              const childProgress = objectiveProgress(child);
              const childBreakdown = objectiveItemBreakdown(childPool);
              return `<button class="objective-group-btn" data-detail-key="objective:${child.id}" type="button"><strong>${escapeHtml(child.name)}</strong><span>${childPool.length} item • ${childBreakdown.words}P ${childBreakdown.kanji}K ${childBreakdown.grammar}G • ${childProgress}%</span></button>`;
            })
            .join("")}</div>
        </article>
      `;
    } else {
      const directWords = directItems
        .filter((item) => item.kind === "word")
        .map((item) => context.wordsById.get(item.key.replace("word:", "")))
        .filter((row): row is Word => Boolean(row));
      const directKanji = directItems
        .filter((item) => item.kind === "kanji")
        .map((item) => kanjiRows.find((k) => k.id === item.key.replace("kanji:", "")))
        .filter((row): row is Kanji => Boolean(row));
      const directGrammar = directItems
        .filter((item) => item.kind === "grammar")
        .map((item) => context.grammarById.get(item.key.replace("grammar:", "")))
        .filter((row): row is Grammar => Boolean(row));

      panel.innerHTML = `
        <article class="material-card">
          <p class="material-card-title">${escapeHtml(objective.name)}</p>
          <p><strong>Target:</strong> ${objective.target_jlpt ?? "Custom"}</p>
          <p><strong>Contenuti diretti:</strong> ${directItems.length} item</p>
          <p><strong>Consolidamento:</strong> ${progress}%</p>
        </article>
        <article class="material-card">
          <p class="material-card-title">PAROLE</p>
          <div class="chip-wrap">${directWords.map((w) => wordLinkButton(w)).join("") || "<span class=\"objective-sub\">Nessuna parola in questo gruppo.</span>"}</div>
        </article>
        <article class="material-card">
          <p class="material-card-title">KANJI</p>
          <div class="chip-wrap">${directKanji.map((k) => kanjiLinkButton(k)).join("") || "<span class=\"objective-sub\">Nessun kanji in questo gruppo.</span>"}</div>
        </article>
        <article class="material-card">
          <p class="material-card-title">FORME GRAMMATICALI</p>
          <div class="chip-wrap">${directGrammar
            .map(
              (g) =>
                `<button class="chip chip-link" data-detail-key="grammar:${g.id}" data-popup-reading="" data-popup-meaning="${escapeHtml(pickLocalizedText(g.spiegazione, locale))}"><span class="chip-main">${escapeHtml(g.struttura)}</span><span class="chip-badges">${jlptLevelBadge(g.livello_jlpt)}${g.categoria_jp ? furiganaBadge(g.categoria_jp) : ""}</span></button>`
            )
            .join("") || "<span class=\"objective-sub\">Nessuna grammatica in questo gruppo.</span>"}</div>
        </article>
      `;
    }
  }

  panel.classList.add("detail-open");
  updateDetailHeaderActions();

  if (interactiveWordInstance) {
    interactiveWordInstance.destroy();
  }

  const sentenceText =
    itemRef.kind === "grammar"
      ? context.grammarById.get(itemRef.key.replace("grammar:", ""))?.frasi_esempio[0]?.testo ?? ""
      : "";

  if (sentenceText) {
    const hint = document.createElement("p");
    hint.className = "objective-sub";
    hint.textContent = "Tap su una parola per aprire glossario e dettagli.";
    panel.appendChild(hint);

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

  setQuizInteractionEnabled(false);
  root.innerHTML = "";

  const detail = document.createElement("button");
  detail.className = "choice-btn";
  detail.textContent = "Approfondisci";
  detail.addEventListener("click", () => {
    if (activeQuiz) {
      clearTimers();
      detailCurrentItem = activeQuiz.itemRef;
      navigateToSection("detail");
      void renderDetailPanel(activeQuiz.itemRef);
    }
  });

  const next = document.createElement("button");
  next.className = "choice-btn next-btn";
  next.textContent = "Prossima domanda";
  next.addEventListener("click", async () => {
    clearTimers();
    await nextAutoQuiz();
  });

  root.append(detail, next);

  if (correct) {
    const totalMs = Math.max(500, settings.auto_next_delay_ms);
    const startedAt = Date.now();
    const update = (): void => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const seconds = remainingMs / 1000;
      const ratio = Math.max(0, Math.min(1, elapsed / totalMs));
      next.style.setProperty("--countdown-progress", `${Math.round(ratio * 100)}%`);
      next.textContent = `Prossima domanda (${seconds.toFixed(1)}s)`;
      if (remainingMs <= 0 && nextCountdownIntervalId !== null) {
        clearInterval(nextCountdownIntervalId);
        nextCountdownIntervalId = null;
      }
    };

    update();
    nextCountdownIntervalId = window.setInterval(update, 90);
    autoNextTimerId = window.setTimeout(async () => {
      await nextAutoQuiz();
    }, totalMs);
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

function setQuizInteractionEnabled(enabled: boolean): void {
  const root = document.getElementById("choices");
  if (root) {
    root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }
  const skip = document.getElementById("btn-next-quiz") as HTMLButtonElement | null;
  if (skip) {
    skip.disabled = !enabled;
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
  setQuizInteractionEnabled(true);

  const q = activeQuiz.question;
  const level = activeQuiz.itemRef.level;
  const sessionLabel = sessionState ? ` • Sessione: ${sessionState.answers} risposte` : "";
  setQuizMeta(`Item ${activeQuiz.itemRef.kind.toUpperCase()} • ${level}${sessionLabel}`);

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

  if (q.mode === "reading-choice") {
    questionRoot.innerHTML = `Come si legge la parte evidenziata?<div class="solution reading-prompt">${q.sentenceHtml}</div>`;
    renderChoices(q.choices, async (choice) => {
      await evaluateAnswer(choice === q.correctChoice, level, "manual");
    });
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
  updateSessionOnAnswer(correct, reason);

  const elapsed = Date.now() - activeQuiz.startedAt;
  const before = getSrsByItem(activeQuiz.itemRef.key) ?? createInitialSrs(activeQuiz.itemRef.key);
  const after = await upsertSrs(activeQuiz.itemRef.key, correct);
  speakAfterAnswer(activeQuiz);

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
  renderStatsPanel();

  const nextMin = Math.max(1, Math.round((after.next_review_date - Date.now()) / 60_000));

  if (reason === "timeout") {
    revealCorrectAnswer(activeQuiz);
    setStatus(`Tempo scaduto. Risposta non ricordata. Ripasso ~${nextMin} min. Premi Prossima domanda o Approfondisci.`, false);
    renderPostAnswerActions(false);
    return;
  }

  if (correct) {
    setStatus(`Corretto! +${xp.total} XP. Ripasso ~${nextMin} min.`, true);
    renderPostAnswerActions(true);
    return;
  }

  revealCorrectAnswer(activeQuiz);
  setStatus(`Errato. -6 XP. Ripasso anticipato ~${nextMin} min. Premi Prossima domanda o Approfondisci.`, false);
  renderPostAnswerActions(false);
}

function fillSettingsForm(): void {
  const auto = document.getElementById("setting-auto-next") as HTMLInputElement | null;
  const max = document.getElementById("setting-max-answer") as HTMLInputElement | null;
  const goalJlpt = document.getElementById("goal-target-jlpt") as HTMLSelectElement | null;
  const goalReviews = document.getElementById("goal-daily-reviews") as HTMLInputElement | null;
  const goalNewWords = document.getElementById("goal-daily-new") as HTMLInputElement | null;
  const goalGrammar = document.getElementById("goal-daily-grammar") as HTMLInputElement | null;
  if (auto) {
    auto.value = (settings.auto_next_delay_ms / 1000).toString();
  }
  if (max) {
    max.value = (settings.max_answer_time_ms / 1000).toString();
  }
  if (goalJlpt && studyGoal) {
    goalJlpt.value = studyGoal.target_jlpt;
  }
  if (goalReviews && studyGoal) {
    goalReviews.value = studyGoal.daily_reviews.toString();
  }
  if (goalNewWords && studyGoal) {
    goalNewWords.value = studyGoal.daily_new_words.toString();
  }
  if (goalGrammar && studyGoal) {
    goalGrammar.value = studyGoal.daily_grammar.toString();
  }
}

async function saveSettingsFromForm(): Promise<void> {
  const auto = document.getElementById("setting-auto-next") as HTMLInputElement | null;
  const max = document.getElementById("setting-max-answer") as HTMLInputElement | null;
  const goalJlpt = document.getElementById("goal-target-jlpt") as HTMLSelectElement | null;
  const goalReviews = document.getElementById("goal-daily-reviews") as HTMLInputElement | null;
  const goalNewWords = document.getElementById("goal-daily-new") as HTMLInputElement | null;
  const goalGrammar = document.getElementById("goal-daily-grammar") as HTMLInputElement | null;

  if (!auto || !max || !goalJlpt || !goalReviews || !goalNewWords || !goalGrammar) {
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
  studyGoal = {
    id: "default",
    target_jlpt: goalJlpt.value as JLPTLevel,
    daily_reviews: Math.max(1, Number(goalReviews.value || "20")),
    daily_new_words: Math.max(1, Number(goalNewWords.value || "10")),
    daily_grammar: Math.max(1, Number(goalGrammar.value || "5")),
    modes_priority: studyGoal?.modes_priority ?? ["flashcard-production", "multiple-choice", "sentence-ordering", "cloze"],
    updated_at: Date.now()
  };
  await db.study_goals.put(studyGoal);
  renderStatsPanel();
  setStatus("Impostazioni salvate.", true);
}

async function refreshCatalogFromSeed(): Promise<void> {
  clearTimers();
  activeQuiz = null;
  activeWordForTts = null;
  detailCurrentItem = null;

  await ensureSeedLoaded();
  await ensureDefaultObjectives();
  await hydrateState();

  navigateToSection("home");
  renderObjectives();
  renderStatsPanel();

  const detailPanel = document.getElementById("detail-panel");
  if (detailPanel) {
    detailPanel.innerHTML = "";
    detailPanel.classList.remove("detail-open");
  }

  setQuizMeta("");
  renderCurrentQuiz();
  setStatus(`Catalogo aggiornato: ${words.length} parole, ${kanjiRows.length} kanji, ${grammar.length} elementi di grammatica.`, true);
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
  const list = document.getElementById("objective-list");
  const studyAllBtn = document.getElementById("btn-study-all") as HTMLButtonElement | null;
  const startStudyBtn = document.getElementById("btn-start-study") as HTMLButtonElement | null;
  const focusN5Btn = document.getElementById("btn-focus-n5") as HTMLButtonElement | null;
  const focusN4Btn = document.getElementById("btn-focus-n4") as HTMLButtonElement | null;
  const nextQuizBtn = document.getElementById("btn-next-quiz") as HTMLButtonElement | null;
  const ttsBtn = document.getElementById("btn-tts") as HTMLButtonElement | null;
  const stopSessionBtn = document.getElementById("btn-stop-session") as HTMLButtonElement | null;
  const menu = document.getElementById("app-menu");
  const burgerBtn = document.getElementById("btn-burger") as HTMLButtonElement | null;
  const settingsForm = document.getElementById("settings-form") as HTMLFormElement | null;
  const refreshCatalogBtn = document.getElementById("btn-refresh-catalog") as HTMLButtonElement | null;
  const detailPanel = document.getElementById("detail-panel");
  const backQuizBtn = document.getElementById("btn-back-quiz") as HTMLButtonElement | null;
  const backObjectiveBtn = document.getElementById("btn-back-objective") as HTMLButtonElement | null;

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
    navigateToSection("detail");
    await renderDetailPanel(objectiveRef);
  });

  studyAllBtn?.addEventListener("click", async () => {
    await setStudyAll();
    setStatus("Tutti gli obiettivi sono attivi.", true);
  });

  startStudyBtn?.addEventListener("click", async () => {
    startStudySession();
    renderStatsPanel();
    navigateToSection("quiz");
    await nextAutoQuiz();
  });

  focusN5Btn?.addEventListener("click", async () => {
    await applyObjectiveFocus("N5");
    setStatus("Focus N5 attivato.", true);
  });

  focusN4Btn?.addEventListener("click", async () => {
    await applyObjectiveFocus("N4");
    setStatus("Focus N4 attivato.", true);
  });

  nextQuizBtn?.addEventListener("click", async () => {
    await nextAutoQuiz();
  });

  ttsBtn?.addEventListener("click", () => {
    if (activeWordForTts) {
      speakWordReading(activeWordForTts);
    }
  });

  stopSessionBtn?.addEventListener("click", () => {
    stopStudySession(true);
    navigateToSection("home");
  });

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettingsFromForm();
  });

  refreshCatalogBtn?.addEventListener("click", async () => {
    refreshCatalogBtn.disabled = true;
    setStatus("Aggiornamento catalogo in corso...", true);
    try {
      await refreshCatalogFromSeed();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento catalogo fallito.";
      setStatus(message, false);
    } finally {
      refreshCatalogBtn.disabled = false;
    }
  });

  burgerBtn?.addEventListener("click", () => {
    menu?.classList.toggle("menu-open");
  });

  menu?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("[data-nav-section]") as HTMLButtonElement | null;
    const section = button?.getAttribute("data-nav-section") as Section | null;
    if (section) {
      navigateToSection(section);
      if (section === "stats") {
        renderStatsPanel();
      }
    }
  });

  backQuizBtn?.addEventListener("click", () => {
    if (!activeQuiz) {
      return;
    }
    navigateToSection("quiz");
  });

  backObjectiveBtn?.addEventListener("click", async () => {
    if (!detailBackObjectiveRef) {
      return;
    }
    detailCurrentItem = detailBackObjectiveRef;
    await renderDetailPanel(detailBackObjectiveRef);
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

function setupHistoryGuards(): void {
  history.replaceState({ section: "home" as Section }, "", location.href);

  window.addEventListener("popstate", (event) => {
    const section = (event.state?.section as Section | undefined) ?? null;
    if (section) {
      setActiveSection(section);
      if (section === "stats") {
        renderStatsPanel();
      }
      return;
    }

    if (sessionState) {
      const leave = window.confirm("Hai una sessione in corso. Vuoi uscire dalla pagina?");
      if (!leave) {
        history.pushState({ section: currentSection }, "", location.href);
      }
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!sessionState) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });
}

function mountInitialQuizState(): void {
  setQuizMeta("Avvia una sessione dalla Home per iniziare il quiz.");
  const question = document.getElementById("question");
  if (question) {
    question.textContent = "La prossima domanda viene generata automaticamente quando avvii una sessione.";
  }
  updateDetailHeaderActions();
}

async function bootstrap(): Promise<void> {
  registerServiceWorker();
  mountUi();
  setupInlinePopup();
  wireEvents();
  setupHistoryGuards();

  await ensureSeedLoaded();
  await ensureDefaultObjectives();
  await ensureDefaultSettings();
  await ensureDefaultStudyGoal();
  await hydrateState();

  renderObjectives();
  fillSettingsForm();
  renderStatsPanel();
  mountInitialQuizState();
  setActiveSection("home");
  setStatus("Pronto. Avvia una sessione dalla Home.", true);
}

void bootstrap();
