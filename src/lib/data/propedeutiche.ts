// Domande propedeutiche curate dall'insegnante madrelingua (report
// plans/2026-07-17-domande-propedeutiche-report.md): frasi costruite apposta
// perché il contesto renda UNICA la risposta (particella が/を per i 自/他,
// registro per il keigo, uso specifico per le particelle, contesto per la
// forma). Ogni item porta il «perché» mostrato dopo la risposta.
import raw from './propedeutiche-n5n4.json';
import { KEIGO_SUPPLETIVE_WORDS } from '$lib/core/keigo';
import type { UsageClozeQuestion } from '$lib/quiz/types';

export interface CuratedItem {
	tipo: 'verbo-contesto' | 'particella-uso' | 'forma-contesto';
	frase_con_buco: string;
	corretta: string;
	distrattori: string[];
	perche: string;
	traduzione_it: string;
	// verbo/forma-contesto: id della parola-carta (forma dizionario) a cui
	// l'item è agganciato — così il quiz/consolida di QUELLA parola può pescarlo.
	parola?: string;
	// forma-contesto: slug della costruzione in GRAMMAR_FORMS (tai, te-iru,
	// tsumori…) — lo pesca il drill /consolida/gram:<slug>.
	gram?: string;
}

export const CURATED_ITEMS: CuratedItem[] = (raw as { items: CuratedItem[] }).items;

export function curatedByParticle(particle: string): CuratedItem[] {
	return CURATED_ITEMS.filter((i) => i.tipo === 'particella-uso' && i.corretta === particle);
}

// Item agganciati a una parola-carta: verbo-contesto (coppia 自/他 o keigo,
// il contesto forza il verbo giusto) e forma-contesto (il contesto forza la
// forma di coniugazione giusta di quel verbo).
export function curatedByWord(wordId: string): CuratedItem[] {
	return CURATED_ITEMS.filter((i) => i.parola === wordId);
}

// forma-contesto per costruzione (gram:tai, gram:te-iru…): li antepone il
// drill della costruzione, come le curate delle particelle.
export function curatedByGram(slug: string): CuratedItem[] {
	return CURATED_ITEMS.filter((i) => i.tipo === 'forma-contesto' && i.gram === slug);
}

// Sotto-insieme keigo dei verbo-contesto (la parola-carta è un suppletivo
// onorifico/umile): li pesca anche il gioco /keigo come round di completamento.
export function curatedKeigoItems(): CuratedItem[] {
	return CURATED_ITEMS.filter(
		(i) => i.tipo === 'verbo-contesto' && i.parola !== undefined && KEIGO_SUPPLETIVE_WORDS.has(i.parola)
	);
}

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
}

// Converte un item curato nella forma usage-cloze già renderizzata ovunque
// (scelte, frase completa dopo la risposta, traduzione, spiegazione).
export function curatedToQuestion(item: CuratedItem): UsageClozeQuestion {
	return {
		mode: 'usage-cloze',
		wordId: item.corretta,
		sentenceWithBlank: item.frase_con_buco,
		fullSentence: item.frase_con_buco.replace(/[＿_]+/, item.corretta),
		translation: item.traduzione_it,
		explanation: item.perche,
		gram: item.gram,
		choices: shuffle([item.corretta, ...item.distrattori]),
		correctChoice: item.corretta
	};
}
