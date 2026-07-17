// Segnalazioni problemi (beta), stesso pattern delle correzioni dati: si
// salvano LOCALMENTE e si esportano come file JSON che il tester manda per il
// canale che già usa (niente backend, niente email pubblica, niente GitHub).
import { SEED_REVISION } from '$lib/version';
import { BUILD_ID } from '$lib/buildInfo';

export interface BugReport {
	id: string;
	testo: string;
	pagina: string; // dove si trovava l'utente quando l'ha scritta
	build: string;
	seed: string;
	userAgent: string;
	creato_il: number;
}

const KEY = 'renkei_bug_reports';

export function listBugReports(): BugReport[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '[]') as BugReport[];
	} catch {
		return [];
	}
}

export function addBugReport(testo: string, pagina: string): BugReport {
	const report: BugReport = {
		id: String(Date.now()),
		testo: testo.trim(),
		pagina,
		build: BUILD_ID,
		seed: SEED_REVISION,
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
		creato_il: Date.now()
	};
	const all = [...listBugReports(), report];
	localStorage.setItem(KEY, JSON.stringify(all));
	return report;
}

export function removeBugReport(id: string): void {
	localStorage.setItem(KEY, JSON.stringify(listBugReports().filter((r) => r.id !== id)));
}

// Scarica il file da mandare (come l'export delle correzioni).
export function exportBugReports(): void {
	const blob = new Blob([JSON.stringify({ versione: '1.0', segnalazioni: listBugReports() }, null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `renkei-segnalazioni-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}
