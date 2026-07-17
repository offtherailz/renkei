// Strumenti di TEST (non per l'uso normale): avanzano il tempo percepito
// dall'app per collaudare le statistiche e la tenuta dell'SRS su più giorni,
// senza dover aspettare davvero. Gated dietro il flag localStorage
// `renkei_dev_tools` (attivabile con ?dev=1) così non compaiono nell'uso reale.
import { db } from "$lib/db/schema";

export const DEV_TOOLS_KEY = "renkei_dev_tools";

export function devToolsEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DEV_TOOLS_KEY) === "1";
}

export function maybeEnableDevToolsFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("dev") === "1") localStorage.setItem(DEV_TOOLS_KEY, "1");
  if (params.get("dev") === "0") localStorage.removeItem(DEV_TOOLS_KEY);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "Viaggia nel tempo" di N giorni in AVANTI: sposta indietro tutte le date di
// ripasso (così ciò che sarebbe dovuto tra N giorni è dovuto adesso) e libera
// il budget di carte nuove (data del contatore nel passato). Non tocca stage,
// mastery o lapses: la storia resta, cambia solo "quando siamo".
export async function advanceDays(n: number): Promise<{ shifted: number }> {
  const deltaMs = n * DAY_MS;
  const rows = await db.srs_progress.toArray();
  const updated = rows.map((r) => ({
    ...r,
    next_review_date: r.next_review_date - deltaMs
  }));
  if (updated.length > 0) await db.srs_progress.bulkPut(updated);

  // il budget carte-nuove si azzera al cambio di data locale: portandolo a ieri
  // il quiz può reintrodurre carte nuove come fosse un nuovo giorno.
  const profile = await db.user_profile.get("default");
  if (profile) {
    const past = new Date(Date.now() - deltaMs);
    const key = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
    await db.user_profile.put({ ...profile, nuove_oggi: 0, nuove_oggi_data: key });
  }
  return { shifted: updated.length };
}
