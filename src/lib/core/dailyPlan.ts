// Completamento del «Piano di oggi» (17/07): le voci del piano si spuntano
// durante la giornata invece di restare link statici. I flag vivono in
// localStorage con la data locale (stessa semantica del budget carte nuove:
// reset al cambio di giorno) — niente da migrare, niente righe DB.
//
// Cosa conta come «fatto»:
// - Ripassi SRS: automatico — dueCount a zero DOPO aver studiato oggi
//   (derivato in home, qui non serve un flag).
// - Punti deboli: una sessione «ripasso deboli» COMPLETATA oggi.
// - Attività del giorno: APERTA oggi (iniziata — il completamento vero
//   dipende dal gioco, segnare l'apertura è onesto e uniforme).

const KEY = "renkei_daily_plan";

function dayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DailyPlanFlags {
  day: string;
  weakDone?: boolean;
  activityStarted?: boolean;
}

function load(now = Date.now()): DailyPlanFlags {
  if (typeof localStorage === "undefined") return { day: dayKey(now) };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as DailyPlanFlags | null;
    if (raw && raw.day === dayKey(now)) return raw;
  } catch {
    /* parse fallito: si riparte pulito */
  }
  return { day: dayKey(now) };
}

function save(flags: DailyPlanFlags): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(flags));
}

export function weakDoneToday(now = Date.now()): boolean {
  return load(now).weakDone === true;
}

export function markWeakDoneToday(now = Date.now()): void {
  save({ ...load(now), weakDone: true });
}

export function activityStartedToday(now = Date.now()): boolean {
  return load(now).activityStarted === true;
}

export function markActivityStartedToday(now = Date.now()): void {
  save({ ...load(now), activityStarted: true });
}
