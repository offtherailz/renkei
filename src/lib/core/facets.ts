import type { Word } from '../types/models';
import type { QuizQuestion } from '../quiz/types';
import { FACET_FIELDS, type FacetField } from './srs';

// Sfaccettature della conoscenza di una parola (Paul Nation: Forma, Significato,
// Uso — ciascuna ricettiva/produttiva). Una sola tassonomia trasversale: ogni
// modo di domanda ha un tag (facetOfMode), ogni parola dichiara quali celle la
// riguardano (applicableFacets). Le celle guidano SOLO quale modo di domanda
// esce e il radar della scheda — mai lo scheduling della parola.

export interface FacetMeta {
	field: FacetField;
	icon: string;
	label: string;
}

export const FACET_META: FacetMeta[] = [
	{ field: 'facet_meaning_r', icon: '💡', label: 'Capire' },
	{ field: 'facet_meaning_p', icon: '🎯', label: 'Recuperare' },
	{ field: 'facet_form_read', icon: '📖', label: 'Leggere' },
	{ field: 'facet_form_write', icon: '✍️', label: 'Scrivere' },
	{ field: 'facet_form_listen', icon: '👂', label: 'Ascoltare' },
	{ field: 'facet_form_speak', icon: '🎤', label: 'Dire' },
	{ field: 'facet_use', icon: '🧩', label: 'Usare' }
];

// Modo di domanda → sfaccettatura che allena. null = la domanda non riguarda
// una sfaccettatura della PAROLA (es. contatori/orario: entità counter:*).
export function facetOfMode(mode: QuizQuestion['mode']): FacetField | null {
	switch (mode) {
		case 'flashcard-recognition':
		case 'multiple-choice':
			return 'facet_meaning_r';
		case 'flashcard-production':
			return 'facet_meaning_p';
		case 'flashcard-reading-recognition':
		case 'reading-choice':
			return 'facet_form_read';
		case 'listening':
			return 'facet_form_listen';
		case 'particle-cloze':
		case 'conjugation':
		case 'transitivity-pair':
		case 'cloze':
		case 'sentence-ordering':
			return 'facet_use';
		default:
			return null; // counter-quiz, counter-reading, time-reading
	}
}

// Celle applicabili alla parola, in base alla classe (tipo_jp) e ai dati:
// - 📖/✍️ solo se c'è una forma scritta in kanji da leggere/comporre
//   (full-kana: scrittura === lettura → N.A., è il bug くれる);
// - ✍️ mai per le espressioni idiomatiche (unità multi-parola, comporla
//   carattere per carattere non ha senso);
// - 🧩 solo se c'è materia d'uso: frasi d'esempio, o coniugazione
//   (verbo/aggettivo), o un contatore suggerito;
// - 💡🎯👂🎤 sempre (ogni parola ha significato e forma orale).
export function applicableFacets(word: Word): Set<FacetField> {
	const out = new Set<FacetField>(['facet_meaning_r', 'facet_meaning_p', 'facet_form_listen', 'facet_form_speak']);
	const hasKanjiForm = word.scrittura !== word.lettura;
	const isIdiom = word.tipo_jp.startsWith('慣用表現');
	if (hasKanjiForm) {
		out.add('facet_form_read');
		if (!isIdiom) out.add('facet_form_write');
	}
	const conjugates = word.tipo_jp.startsWith('動詞') || word.tipo_jp.startsWith('形容詞');
	if ((word.frasi_esempio?.length ?? 0) > 0 || conjugates || word.id_contatore_suggerito) {
		out.add('facet_use');
	}
	return out;
}

// Ordine di sblocco per stage SRS (agganciato alla scala già esistente in
// pickWordMode): il difficile arriva quando la parola è consolidata.
export const FACET_UNLOCK_STAGE: Record<FacetField, number> = {
	facet_meaning_r: 0,
	facet_form_read: 0,
	facet_form_listen: 1,
	facet_meaning_p: 2,
	facet_use: 2,
	facet_form_speak: 3,
	facet_form_write: 4
};

// Le celle su cui vale la pena insistere adesso: applicabili, sbloccate allo
// stage attuale, ordinate dalla meno sviluppata.
export function facetsToTrain(word: Word, stage: number, progress: Partial<Record<FacetField, number | undefined>>): FacetField[] {
	return FACET_FIELDS.filter(
		(f) => applicableFacets(word).has(f) && stage >= FACET_UNLOCK_STAGE[f]
	).sort((a, b) => (progress[a] ?? 0) - (progress[b] ?? 0));
}
