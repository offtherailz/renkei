// Scene disegnate (generate con IA, originali) per «Un giorno in Giappone»:
// luogo + personaggio, in due versioni (bocca chiusa / mentre parla) già
// allineate, così alternarle anima solo la bocca. File in static/giorno/scene.
import type { PlaceId } from './giorno';

export interface SceneArt {
	id: string;
	who: 'F' | 'M';
	places: (PlaceId | 'eki')[];
	name: string; // come lo chiama il riquadro di dialogo
}

export const SCENE_ART: SceneArt[] = [
	{ id: 'studentessa-aula', who: 'F', places: ['gakkou'], name: '学生' },
	{ id: 'studentessa-biblio', who: 'F', places: ['toshokan', 'honya'], name: '学生' }
];

// il disegno per un luogo e per chi parla (se il luogo ne ha uno solo, vale per entrambi)
export function artFor(place: PlaceId | 'eki', who: 'F' | 'M' | null): SceneArt | null {
	const here = SCENE_ART.filter((a) => a.places.includes(place));
	return here.find((a) => a.who === who) ?? here[0] ?? null;
}
export const artSrc = (base: string, a: SceneArt, talking: boolean) => `${base}/giorno/scene/${a.id}-${talking ? 'parla' : 'chiusa'}.png`;
