// Tema dell'app: segue il sistema oppure è forzato chiaro/scuro. Si salva sul
// dispositivo (localStorage) e si applica come data-tema su <html>; app.html lo
// legge prima del primo disegno, così la pagina non lampeggia.
export type Tema = 'sistema' | 'chiaro' | 'scuro';
export const CHIAVE_TEMA = 'renkei_tema';

export function leggiTema(): Tema {
	try {
		const t = localStorage.getItem(CHIAVE_TEMA);
		return t === 'chiaro' || t === 'scuro' ? t : 'sistema';
	} catch {
		return 'sistema';
	}
}

export function impostaTema(t: Tema): void {
	try {
		if (t === 'sistema') localStorage.removeItem(CHIAVE_TEMA);
		else localStorage.setItem(CHIAVE_TEMA, t);
	} catch {
		/* niente storage: vale solo per questa visita */
	}
	if (t === 'sistema') delete document.documentElement.dataset.tema;
	else document.documentElement.dataset.tema = t;
}
