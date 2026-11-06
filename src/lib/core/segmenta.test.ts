import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { segmentaGruppo, type WordHit } from './wordLookup';

// indice come quello dell'app (a parità di lettura vince il livello più basso)
const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as { words: { id: string; scrittura: string; lettura: string; tipo_jp: string; livello_jlpt: string }[] };
const LIV: Record<string, number> = { N5: 0, N4: 1, N3: 2 };
const map = new Map<string, WordHit>();
for (const w of [...seed.words].sort((a, b) => (LIV[a.livello_jlpt] ?? 3) - (LIV[b.livello_jlpt] ?? 3))) {
	const hit = { id: w.id, scrittura: w.scrittura, lettura: w.lettura, tipo_jp: w.tipo_jp, livello_jlpt: w.livello_jlpt, significato: '', ambigua: false } as WordHit;
	if (!map.has(w.scrittura)) map.set(w.scrittura, hit);
	if (!map.has(w.lettura)) map.set(w.lettura, hit);
}

describe('segmentaGruppo (testi con gli spazi)', () => {
	it.each([
		['ぎゅうにゅうを', ['ぎゅうにゅう', 'を']],
		['さいふが', ['さいふ', 'が']],
		['9時までに', ['9時', 'までに']],
		['学生ですが、', ['学生', 'です', 'が', '、']],
		['ラーメンを', ['ラーメン', 'を']],
		['吉田さんの', ['吉田', 'さん', 'の']],
		['送りたいんですが。', ['送りたい', 'んですが', '。']],
		['しれません。', ['しれません', '。']],
		['なくしたのは', ['なくした', 'の', 'は']]
	])('%s', (g, atteso) => {
		expect(segmentaGruppo(g, map)).toEqual(atteso);
	});
});
