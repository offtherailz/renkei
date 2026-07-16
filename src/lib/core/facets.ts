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
	desc: string; // cos'è questa abilità
	train: string; // come si rafforza nell'app
}

export const FACET_META: FacetMeta[] = [
	{
		field: 'facet_meaning_r',
		icon: '💡',
		label: 'Capire',
		desc: 'Vedi la parola giapponese e ne riconosci il significato.',
		train: 'Domande «cosa significa?» a scelta multipla e flashcard nel quiz.'
	},
	{
		field: 'facet_meaning_p',
		icon: '🎯',
		label: 'Recuperare',
		desc: 'Dal significato italiano ti viene in mente la parola giapponese.',
		train: 'Flashcard inverse (IT → JP) nel quiz, dallo stage 2.'
	},
	{
		field: 'facet_form_read',
		icon: '📖',
		label: 'Leggere',
		desc: 'Sai leggere la parola scritta in kanji (la sua pronuncia).',
		train: 'Domande «come si legge?» nel quiz e i giochi di lettura.'
	},
	{
		field: 'facet_form_write',
		icon: '✍️',
		label: 'Scrivere',
		desc: 'Sai comporre la parola coi suoi kanji/kana, non solo riconoscerla.',
		train: 'Composizione carattere per carattere (arriva a parola consolidata, stage 4+).'
	},
	{
		field: 'facet_form_listen',
		icon: '👂',
		label: 'Ascoltare',
		desc: 'Riconosci la parola quando la senti, senza vederla scritta.',
		train: 'Domande di solo ascolto nel quiz (dallo stage 1) e i giochi di ascolto.'
	},
	{
		field: 'facet_form_speak',
		icon: '🎤',
		label: 'Dire',
		desc: 'Sai pronunciarla a voce, recuperandola da solo.',
		train: 'Produzione al microfono (stage 3+) e le avventure parlate.'
	},
	{
		field: 'facet_use',
		icon: '🧩',
		label: 'Usare',
		desc: 'Sai metterla in una frase: particella giusta, forma giusta, contesto giusto.',
		train: 'Cloze di particelle, coniugazione e frasi nel quiz, dallo stage 2.'
	}
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
		case 'composition':
			return 'facet_form_write';
		case 'listening':
			return 'facet_form_listen';
		case 'spoken-production':
			return 'facet_form_speak';
		case 'particle-cloze':
		case 'conjugation':
		case 'verb-form-cloze':
		case 'usage-cloze':
		case 'transitivity-pair':
		case 'cloze':
		case 'sentence-ordering':
			return 'facet_use';
		default:
			return null; // counter-quiz, counter-reading, time-reading
	}
}

// Celle applicabili alla parola, in base alla classe (tipo_jp) e ai dati:
// - 📖 Leggere solo se c'è kanji da decifrare (full-kana: la "lettura" È la
//   parola, domanda tautologica — è il bug くれる);
// - ✍️ Scrivere quasi sempre: comporre vale anche in kana (く・れ・る), escluse
//   solo le espressioni idiomatiche (comporre una frase intera non ha senso);
// - 🧩 solo se c'è materia d'uso: frasi d'esempio, o coniugazione
//   (verbo/aggettivo), o un contatore suggerito;
// - 💡🎯👂🎤 sempre (ogni parola ha significato e forma orale).
export function applicableFacets(word: Word): Set<FacetField> {
	const out = new Set<FacetField>(['facet_meaning_r', 'facet_meaning_p', 'facet_form_listen', 'facet_form_speak']);
	const hasKanjiForm = word.scrittura !== word.lettura;
	const isIdiom = word.tipo_jp.startsWith('慣用表現');
	if (hasKanjiForm) out.add('facet_form_read');
	if (!isIdiom) out.add('facet_form_write');
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
