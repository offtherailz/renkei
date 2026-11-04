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

// chi si incontra in ogni luogo quando parla «il luogo» (personale, clienti)
const CAST: Partial<Record<Where, { F: string[]; M: string[] }>> = {
	kaisha: { F: ['collega_donna'], M: ['collega_uomo'] },
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
	toshokan: { F: ['amica'], M: ['studente_uomo'] },
	honya: { F: ['amica'], M: ['studente_uomo'] }
};
const STREET = { F: ['amica', 'signora_anziana'], M: ['passante'] };

const BG: Partial<Record<Where, string>> = {
	kaisha: 'ufficio', hoteru: 'ufficio', ginkou: 'banca', yuubin: 'posta', resutoran: 'ristorante', kafe: 'cafe',
	toshokan: 'biblioteca', honya: 'biblioteca', gakkou: 'scuola', byouin: 'ospedale',
	konbini: 'konbini'
};
// le indicazioni si chiedono per strada, qualunque sia la meta
const STREET_BG = 'strada';

export interface SceneLook {
	composed: string | null; // scena già composta
	bg: string | null; // sfondo disegnato (altrimenti quello in codice)
	sprite: string | null; // personaggio da sovrapporre
}

// Il ruolo di chi parla viene dalla missione (il capo dà i compiti, il passante
// le indicazioni…): così il personaggio è quello giusto, non uno a caso del luogo.
export type Role = 'capo' | 'collega' | 'amico' | 'passante' | 'insegnante' | 'luogo';
const ROLE: Record<Exclude<Role, 'luogo'>, { F: string; M: string }> = {
	capo: { F: 'capo_donna', M: 'capo_uomo' },
	collega: { F: 'collega_donna', M: 'collega_uomo' },
	amico: { F: 'amica', M: 'studente_uomo' },
	passante: { F: 'signora_anziana', M: 'passante' },
	insegnante: { F: 'collega_donna', M: 'insegnante' }
};

export function sceneLook(place: Where, who: 'F' | 'M', role: Role = 'luogo'): SceneLook {
	const comp = role === 'luogo' || role === 'amico' ? COMPOSED.find((c) => c.who === who && c.places.includes(place)) : undefined;
	if (comp) return { composed: comp.id, bg: null, sprite: null };
	const sprite = role === 'luogo' ? (CAST[place] ?? STREET)[who][0]! : ROLE[role][who];
	return { composed: null, bg: role === 'passante' ? STREET_BG : (BG[place] ?? null), sprite };
}

export const composedSrc = (base: string, id: string, talking: boolean) => `${base}/giorno/scene/${id}-${talking ? 'parla' : 'chiusa'}.png`;
export const spriteSrc = (base: string, id: string, talking: boolean) => `${base}/giorno/ritratti/${id}-${talking ? 'parla' : 'chiusa'}.png`;
export const bgSrc = (base: string, id: string) => `${base}/giorno/sfondi/${id}.jpg`;
