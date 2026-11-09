// 事件 — il tempo che fa, giorno per giorno. È quello che la TV ha previsto la sera
// prima (SERE in missioni/comune.ts): se cambia una previsione, va cambiato qui.
// Senza voce: sereno.
export type Tempo = 'sereno' | 'nuvoloso' | 'pioggia' | 'nebbia' | 'vento';

const h = (o: number): number => o * 60;
// per ogni giorno: fasce [da che ora, che tempo], in ordine
export const GIORNI_METEO: Record<number, [number, Tempo][]> = {
	1: [[0, 'sereno'], [h(12), 'nuvoloso'], [h(18), 'pioggia']], // «午前中は はれ、午後から くもり、夜は 雨»
	2: [[0, 'nuvoloso']], // «一日中 くもり»
	3: [[0, 'sereno'], [h(17), 'vento']], // «夕方から 風が つよく»
	8: [[0, 'nebbia'], [h(12), 'sereno']], // «朝は きり、昼からは はれ»
	9: [[0, 'pioggia'], [h(9), 'nuvoloso']], // «雨は 朝 9時ごろ やむ»
	10: [[0, 'sereno']], // «はれて、25度»
	15: [[0, 'nuvoloso'], [h(10), 'pioggia'], [h(12), 'nuvoloso'], [h(15), 'pioggia'], [h(17), 'nuvoloso']], // «くもりで、ときどき 雨»
	16: [[0, 'sereno']], // «一日中 はれて、空気が かわいて»
	17: [[0, 'sereno']], // «朝は ひえて»
	22: [[0, 'sereno'], [h(17), 'pioggia']], // «はれますが、夕方から 雨»
	23: [[0, 'sereno']], // «はれて、すずしい»
	24: [[0, 'sereno']], // «三日間は はれ»
	25: [[0, 'sereno']],
	26: [[0, 'sereno']],
	27: [[0, 'pioggia']], // «そのあと 雨の 日が つづく»
	28: [[0, 'pioggia']]
};

export function tempo(giorno: number, minuti: number): Tempo {
	const fasce = GIORNI_METEO[giorno];
	if (!fasce) return 'sereno';
	let t: Tempo = 'sereno';
	for (const [da, x] of fasce) if (minuti >= da) t = x;
	return t;
}

export const ICONA_TEMPO: Record<Tempo, string> = { sereno: '', nuvoloso: '☁️', pioggia: '🌧️', nebbia: '🌫️', vento: '💨' };
