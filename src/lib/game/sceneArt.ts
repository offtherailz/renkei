// Grafica delle scene di «Un giorno in Giappone» (disegni originali generati
// con IA, file in static/giorno): personaggi ritagliati in due versioni
// allineate (bocca chiusa / mentre parla) da sovrapporre allo sfondo del luogo;
// alcune scene sono già composte (personaggio + sfondo nello stesso disegno).
import type { PlaceId } from './giorno';

type Where = PlaceId | 'eki';

// scene composte: valgono per chi parla del genere indicato
const COMPOSED: { id: string; who: 'F' | 'M'; places: Where[] }[] = [
	{ id: 'studentessa-aula', who: 'F', places: ['gakkou'] },
	{ id: 'studentessa-biblio', who: 'F', places: ['toshokan', 'honya'] }
];

// chi si incontra dove (scelto in modo stabile per missione)
const CAST: Partial<Record<Where, { F: string[]; M: string[] }>> = {
	kaisha: { F: ['collega_donna', 'capo_donna'], M: ['collega_uomo', 'capo_uomo'] },
	ginkou: { F: ['collega_donna'], M: ['capo_uomo'] },
	yuubin: { F: ['collega_donna'], M: ['capo_uomo'] },
	hoteru: { F: ['collega_donna'], M: ['cameriere'] },
	konbini: { F: ['commessa_konbini'], M: ['passante'] },
	panya: { F: ['commessa_konbini'], M: ['passante'] },
	hanaya: { F: ['commessa_konbini'], M: ['passante'] },
	resutoran: { F: ['amica'], M: ['cameriere'] },
	kafe: { F: ['amica'], M: ['cameriere'] },
	byouin: { F: ['medico'], M: ['passante'] },
	kusuri: { F: ['medico'], M: ['passante'] },
	gakkou: { F: ['amica'], M: ['insegnante'] },
	toshokan: { F: ['amica'], M: ['insegnante'] },
	honya: { F: ['amica'], M: ['insegnante'] }
};
const STREET = { F: ['amica', 'signora_anziana'], M: ['passante'] };

const BG: Partial<Record<Where, string>> = {
	kaisha: 'ufficio', ginkou: 'ufficio', yuubin: 'ufficio', hoteru: 'ufficio', resutoran: 'ristorante', kafe: 'cafe'
};

function hash(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}

export interface SceneLook {
	composed: string | null; // scena già composta
	bg: string | null; // sfondo disegnato (altrimenti quello in codice)
	sprite: string | null; // personaggio da sovrapporre
}

export function sceneLook(place: Where, who: 'F' | 'M', key: string): SceneLook {
	const comp = COMPOSED.find((c) => c.who === who && c.places.includes(place));
	if (comp) return { composed: comp.id, bg: null, sprite: null };
	const cast = (CAST[place] ?? STREET)[who];
	return { composed: null, bg: BG[place] ?? null, sprite: cast[hash(key) % cast.length] ?? null };
}

export const composedSrc = (base: string, id: string, talking: boolean) => `${base}/giorno/scene/${id}-${talking ? 'parla' : 'chiusa'}.png`;
export const spriteSrc = (base: string, id: string, talking: boolean) => `${base}/giorno/ritratti/${id}-${talking ? 'parla' : 'chiusa'}.png`;
export const bgSrc = (base: string, id: string) => `${base}/giorno/sfondi/${id}.jpg`;
