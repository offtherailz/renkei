// Grafica delle scene di «Un giorno in Giappone» (disegni originali generati
// con IA, file in static/giorno): personaggi ritagliati in due versioni
// allineate (bocca chiusa / mentre parla) da sovrapporre allo sfondo del luogo.
import type { PlaceId } from './giorno';

type Where = PlaceId | 'eki';

// chi si incontra in ogni luogo quando parla «il luogo» (personale, clienti)
const CAST: Partial<Record<Where, { F: string[]; M: string[] }>> = {
	kaisha: { F: ['collega_donna'], M: ['collega_uomo'] },
	ginkou: { F: ['collega_donna'], M: ['capo_uomo'] },
	yuubin: { F: ['collega_donna'], M: ['capo_uomo'] },
	hoteru: { F: ['collega_donna'], M: ['cameriere'] },
	konbini: { F: ['commessa_konbini'], M: ['passante'] },
	panya: { F: ['commessa_konbini'], M: ['passante'] },
	hanaya: { F: ['fioraia'], M: ['passante'] },
	resutoran: { F: ['amica'], M: ['cameriere'] },
	kafe: { F: ['amica'], M: ['cameriere'] },
	byouin: { F: ['medico'], M: ['passante'] },
	kusuri: { F: ['medico'], M: ['passante'] },
	// a scuola chi parla è quasi sempre uno studente; l'insegnante solo col suo ruolo
	gakkou: { F: ['studentessa'], M: ['studente_uomo'] },
	toshokan: { F: ['studentessa'], M: ['studente_uomo'] },
	honya: { F: ['studentessa'], M: ['studente_uomo'] }
};
const STREET = { F: ['amica', 'signora_anziana'], M: ['passante'] };

const BG: Partial<Record<Where, string>> = {
	kaisha: 'ufficio', hoteru: 'ufficio', ginkou: 'banca', yuubin: 'posta', resutoran: 'ristorante', kafe: 'cafe',
	toshokan: 'biblioteca', honya: 'biblioteca', gakkou: 'scuola', byouin: 'ospedale',
	konbini: 'konbini', eki: 'stazione', panya: 'panetteria', hanaya: 'fioraio'
};
// le indicazioni si chiedono per strada, qualunque sia la meta
const STREET_BG = 'strada';

export interface SceneLook {
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
	// tra scuola e libri l'amica è la studentessa
	const sprite =
		role === 'luogo' || (role === 'amico' && who === 'F' && SCHOOL.includes(place)) ? (CAST[place] ?? STREET)[who][0]! : ROLE[role][who];
	return { bg: role === 'passante' ? STREET_BG : (BG[place] ?? null), sprite };
}
const SCHOOL: Where[] = ['gakkou', 'toshokan', 'honya'];

export const spriteSrc = (base: string, id: string, talking: boolean) => `${base}/giorno/ritratti/${id}-${talking ? 'parla' : 'chiusa'}.png`;
export const bgSrc = (base: string, id: string) => `${base}/giorno/sfondi/${id}.jpg`;
