import { describe, expect, it } from 'vitest';
import { AUTO_MAZZI, pickTuttoLivello } from './mazzi';

describe('pickTuttoLivello', () => {
	const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);
	const areas = [
		{ kind: 'word' as const, ids: ids('w', 30) },
		{ kind: 'kanji' as const, ids: ids('k', 30) },
		{ kind: 'grammar' as const, ids: ids('g', 30) }
	];

	it('rispetta la dose e la proporzione 3:1:1', () => {
		const q = pickTuttoLivello(areas, () => -1, 15);
		expect(q.length).toBe(15);
		expect(q.filter((x) => x.kind === 'word').length).toBe(9);
		expect(q.filter((x) => x.kind === 'kanji').length).toBe(3);
		expect(q.filter((x) => x.kind === 'grammar').length).toBe(3);
	});

	it('prima le mai viste, mai quelle già padroneggiate', () => {
		const q = pickTuttoLivello([{ kind: 'word', ids: ['nuova', 'debole', 'fatta'] }], (k) => (k === 'word:nuova' ? -1 : k === 'word:debole' ? 20 : 80), 5);
		expect(q.map((x) => x.raw).sort()).toEqual(['debole', 'nuova']);
		expect(pickTuttoLivello([{ kind: 'word', ids: ['nuova', 'debole'] }], (k) => (k === 'word:nuova' ? -1 : 20), 1)[0]!.raw).toBe('nuova');
	});

	it('area esaurita: il posto passa alle altre', () => {
		const q = pickTuttoLivello([{ kind: 'word', ids: ids('w', 20) }, { kind: 'kanji', ids: [] }, { kind: 'grammar', ids: [] }], () => -1, 15);
		expect(q.length).toBe(15);
	});

	it('niente duplicati', () => {
		const q = pickTuttoLivello(areas, () => -1, 15).map((x) => x.raw);
		expect(new Set(q).size).toBe(q.length);
	});
});

describe('AUTO_MAZZI', () => {
	it('id unici e mazzi per livello presenti', () => {
		const list = AUTO_MAZZI.map((m) => m.id);
		expect(new Set(list).size).toBe(list.length);
		for (const id of ['tutto-n4', 'tutto-n5', 'nomi-n4', 'nomi-n5', 'avverbi-n4', 'avverbi-n5']) expect(list).toContain(id);
	});
});
