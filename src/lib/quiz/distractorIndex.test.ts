import { describe, expect, it } from 'vitest';
import { buildDistractors } from './distractorIndex';
import type { DistractorIndex } from './types';

function makeIndex(): DistractorIndex {
	return {
		N5: [
			{ id: 'benkyou', meaning: 'studiare', scrittura: '勉強する' },
			{ id: 'renshuu', meaning: 'esercitarsi', scrittura: '練習する' },
			{ id: 'shitsumon', meaning: 'chiedere', scrittura: '質問する' },
			{ id: 'neko', meaning: 'gatto', scrittura: '猫' },
			{ id: 'inu', meaning: 'cane', scrittura: '犬' },
			{ id: 'ookii', meaning: 'grande', scrittura: '大きい' }
		],
		N4: [],
		N3: [],
		N2: [],
		N1: [],
		EXTRA: []
	};
}

describe('buildDistractors', () => {
	it('senza preferSuru pesca da tutto il livello', () => {
		const index = makeIndex();
		const picks = buildDistractors('N5', index, 'benkyou', 3);
		expect(picks).toHaveLength(3);
	});

	it('con preferSuru: se ci sono abbastanza altri verbi in する, li usa tutti', () => {
		const index = makeIndex();
		const picks = buildDistractors('N5', index, 'benkyou', 2, { preferSuru: true });
		expect(picks).toHaveLength(2);
		expect(picks.every((p) => p.scrittura.endsWith('する'))).toBe(true);
	});

	it('con preferSuru: se non ce ne sono abbastanza, completa con il resto del livello', () => {
		const index = makeIndex();
		// solo 2 altri verbi in する disponibili (oltre a benkyou), ne chiediamo 3
		const picks = buildDistractors('N5', index, 'benkyou', 3, { preferSuru: true });
		expect(picks).toHaveLength(3);
	});
});
