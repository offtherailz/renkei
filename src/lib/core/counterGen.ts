// Generatore di letture numero+contatore per esercizi randomizzati.
// Copre i contatori dove il valore va estratto a caso: giorni del mese (1-31),
// ore (1-12), minuti (1-59), yen (prezzi tipici). Applica rendaku e letture
// irregolari così da poter interrogare qualsiasi numero, non solo una lista fissa.

// Letture dei numeri sino-giapponesi (quelle usate per contare/prezzi: よん/なな/きゅう).
const UNITS = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

function hundreds(d: number): string {
	if (d === 0) return '';
	if (d === 1) return 'ひゃく';
	if (d === 3) return 'さんびゃく';
	if (d === 6) return 'ろっぴゃく';
	if (d === 8) return 'はっぴゃく';
	return UNITS[d] + 'ひゃく';
}

function thousands(d: number): string {
	if (d === 0) return '';
	if (d === 1) return 'せん';
	if (d === 3) return 'さんぜん';
	if (d === 8) return 'はっせん';
	return UNITS[d] + 'せん';
}

function tens(d: number): string {
	if (d === 0) return '';
	if (d === 1) return 'じゅう';
	return UNITS[d] + 'じゅう';
}

function belowTenThousand(n: number): string {
	const th = Math.floor(n / 1000);
	const h = Math.floor((n % 1000) / 100);
	const t = Math.floor((n % 100) / 10);
	const u = n % 10;
	return thousands(th) + hundreds(h) + tens(t) + UNITS[u];
}

// Lettura di un numero 0..99999 in hiragana.
export function readNumber(n: number): string {
	if (n === 0) return 'ゼロ';
	const man = Math.floor(n / 10000);
	const rest = n % 10000;
	return (man > 0 ? belowTenThousand(man) + 'まん' : '') + belowTenThousand(rest);
}

// ── Giorni del mese (1-31) ──
const IRREGULAR_DAYS: Record<number, string> = {
	1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか',
	6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか',
	14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか'
};

export function dayReading(n: number): string {
	return IRREGULAR_DAYS[n] ?? readNumber(n) + 'にち';
}

// ── Ore (1-12): 4→よじ, 7→しちじ, 9→くじ ──
const HOUR_UNITS: Record<number, string> = { 4: 'よ', 7: 'しち', 9: 'く' };

export function hourReading(n: number): string {
	if (HOUR_UNITS[n]) return HOUR_UNITS[n] + 'じ';
	return readNumber(n) + 'じ';
}

// ── Minuti (1-59): rendaku ふん/ぷん ──
// forme 1-10; le decine si compongono (21 = にじゅう + いっぷん).
const MIN_1_10: Record<number, string> = {
	1: 'いっぷん', 2: 'にふん', 3: 'さんぷん', 4: 'よんぷん', 5: 'ごふん',
	6: 'ろっぷん', 7: 'ななふん', 8: 'はっぷん', 9: 'きゅうふん', 10: 'じゅっぷん'
};

export function minuteReading(n: number): string {
	if (n <= 10) return MIN_1_10[n]!;
	const t = Math.floor(n / 10);
	const u = n % 10;
	const tensWord = UNITS[t] + 'じゅ'; // にじゅ, さんじゅ…
	if (u === 0) return tensWord + 'っぷん'; // 20 → にじゅっぷん
	return tensWord + 'う' + MIN_1_10[u]!; // 21 → にじゅう + いっぷん
}

export function yenReading(n: number): string {
	return readNumber(n) + 'えん';
}

// Prezzi tipici (per non generare cifre assurde).
const TYPICAL_PRICES = [
	100, 120, 150, 200, 250, 300, 380, 500, 600, 680, 800, 980,
	1000, 1200, 1500, 1800, 2000, 2800, 3000, 3800, 5000, 6000, 8000, 9800,
	10000, 12000, 15000, 30000
];

export interface GeneratedReading {
	prompt: string; // es. 4時, 300円
	correct: string;
	distractors: string[];
}

const RAND = (max: number) => Math.floor(Math.random() * max);
const uniq = (xs: string[]) => [...new Set(xs)];

// I contatori con lettura generabile a caso (drill randomizzato).
export const GENERATED_COUNTERS = new Set(['日', '時', '分', '円']);

export function generateReading(counterId: string): GeneratedReading | null {
	switch (counterId) {
		case '日': {
			const n = 1 + RAND(31);
			const correct = dayReading(n);
			const distractors = uniq([
				readNumber(n) + 'にち',
				readNumber(n) + 'か',
				dayReading(((n % 31) + 1))
			]).filter((d) => d !== correct);
			return { prompt: `${n}日`, correct, distractors: distractors.slice(0, 3) };
		}
		case '時': {
			const n = 1 + RAND(12);
			const correct = hourReading(n);
			const distractors = uniq([
				readNumber(n) + 'じ', // lettura "regolare" sbagliata (よじ→よんじ, くじ→きゅうじ)
				hourReading(((n % 12) + 1)), // ora vicina
				hourReading(((n + 5) % 12) + 1)
			]).filter((d) => d !== correct);
			return { prompt: `${n}時`, correct, distractors: distractors.slice(0, 3) };
		}
		case '分': {
			const n = 1 + RAND(59);
			const correct = minuteReading(n);
			// distrattore: scambio ふん↔ぷん
			const swapped = correct.includes('ぷん')
				? correct.replace(/ぷん$/, 'ふん')
				: correct.replace(/ふん$/, 'ぷん');
			const distractors = uniq([swapped, minuteReading(((n % 59) + 1))]).filter((d) => d !== correct);
			return { prompt: `${n}分`, correct, distractors: distractors.slice(0, 3) };
		}
		case '円': {
			const n = TYPICAL_PRICES[RAND(TYPICAL_PRICES.length)]!;
			const correct = yenReading(n);
			// distrattore: numero senza rendaku (さんひゃく invece di さんびゃく)
			const naive = naiveNumber(n) + 'えん';
			const distractors = uniq([
				naive,
				yenReading(TYPICAL_PRICES[RAND(TYPICAL_PRICES.length)]!),
				yenReading(TYPICAL_PRICES[RAND(TYPICAL_PRICES.length)]!)
			]).filter((d) => d !== correct);
			return { prompt: `${n.toLocaleString('en-US')}円`, correct, distractors: distractors.slice(0, 3) };
		}
		default:
			return null;
	}
}

// Lettura "ingenua" senza rendaku: buon distrattore per i prezzi.
function naiveNumber(n: number): string {
	const th = Math.floor(n / 1000);
	const h = Math.floor((n % 1000) / 100);
	const t = Math.floor((n % 100) / 10);
	const u = n % 10;
	const man = Math.floor(n / 10000);
	const naiveH = (d: number) => (d === 0 ? '' : UNITS[d] + 'ひゃく');
	const naiveTh = (d: number) => (d === 0 ? '' : UNITS[d] + 'せん');
	if (man > 0) return readNumber(n); // sopra 10000 lascio corretto
	return naiveTh(th) + naiveH(h) + tens(t) + UNITS[u];
}
