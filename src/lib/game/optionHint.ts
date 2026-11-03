// Perché un'opzione è giusta o sbagliata, quando la domanda non lo dice: per le
// domande dei libri le opzioni spesso non hanno traduzione. Usa il dizionario
// dell'app (stesso indice delle frasi interattive) e il ruolo delle particelle.
import { lookupToken, type WordHit } from '$lib/core/wordLookup';
import { PARTICLE_ROLE } from '$lib/data/particleGuide';

const KANA = /^[ぁ-んー\s]+$/u;
const HAS_KANJI = /[一-龯]/u;

const gloss = (h: WordHit) => `${h.scrittura}${h.lettura !== h.scrittura ? `（${h.lettura}）` : ''} = ${h.significato}`;

export function optionHint(
	index: Map<string, WordHit> | null,
	tipo: 'moji' | 'goi' | 'bunpou' | string,
	label: string,
	option: string,
	right: boolean
): string {
	if (!index) return '';
	const o = option.trim();
	const particle = PARTICLE_ROLE[o];
	if (particle) return `${o}: ${particle}`;
	// 読み: l'opzione è una lettura in kana
	if (tipo === 'moji' && label.includes('ひらがな') && KANA.test(o)) {
		const hit = index.get(o.replace(/\s/g, ''));
		if (hit && hit.scrittura !== hit.lettura) return right ? gloss(hit) : `lettura di ${gloss(hit)}`;
		return right ? '' : 'lettura inesistente: occhio a ゛, kana piccoli e vocali lunghe';
	}
	// 表記: l'opzione è una scrittura in kanji
	if (tipo === 'moji' && HAS_KANJI.test(o)) {
		const hit = lookupToken(index, o);
		if (hit && o.startsWith(hit.scrittura.replace(/[ぁ-ん]+$/u, ''))) return right ? gloss(hit) : `è ${gloss(hit)}`;
		return right ? '' : 'scrittura inesistente: kanji simili ma sbagliati';
	}
	// frasi intere (つかいかた, いいかえ): niente glossa parola per parola
	if (o.length > 12 || /[。、]/.test(o)) return '';
	const hit = lookupToken(index, o);
	if (!hit) return '';
	return gloss(hit) + (hit.forma ? ` · ${hit.forma}` : '');
}
