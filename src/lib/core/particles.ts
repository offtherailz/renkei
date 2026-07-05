// Riconoscimento delle particelle nelle frasi (per il quiz cloze) e
// distrattori pedagogici: le particelle che si confondono davvero tra loro.

// Ordinate per lunghezza decrescente: から/まで si controllano prima di か.
export const PARTICLES = ['から', 'まで', 'は', 'が', 'を', 'に', 'で', 'と', 'へ', 'の', 'も', 'や'] as const;

export const CONFUSABLE_PARTICLES: Record<string, string[]> = {
	は: ['が', 'も', 'を'],
	が: ['は', 'を', 'に'],
	を: ['が', 'に', 'で'],
	に: ['で', 'へ', 'を'],
	で: ['に', 'と', 'を'],
	と: ['に', 'や', 'も'],
	へ: ['に', 'まで', 'で'],
	の: ['が', 'に', 'な'],
	も: ['は', 'が', 'と'],
	から: ['まで', 'より', 'ので'],
	まで: ['から', 'へ', 'に'],
	や: ['と', 'も', 'か']
};

export interface ParticleHit {
	particle: string;
	// indice del carattere di inizio particella nella frase intera
	index: number;
}

// Trova le particelle in coda ai segmenti BudouX: il tokenizer spezza in
// bunsetsu, quindi una particella "vera" chiude quasi sempre un segmento
// (犬が / 学校に). Richiedere testo prima della particella evita i falsi
// positivi tipo こんにちは.
export function findParticles(segments: string[]): ParticleHit[] {
	const hits: ParticleHit[] = [];
	let offset = 0;
	for (const segment of segments) {
		for (const particle of PARTICLES) {
			if (segment.length > particle.length && segment.endsWith(particle)) {
				hits.push({ particle, index: offset + segment.length - particle.length });
				break;
			}
		}
		offset += segment.length;
	}
	return hits;
}

export function blankParticleAt(sentence: string, hit: ParticleHit): string {
	return (
		sentence.slice(0, hit.index) + '＿＿' + sentence.slice(hit.index + hit.particle.length)
	);
}
