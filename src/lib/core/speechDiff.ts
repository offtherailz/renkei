// Confronto visivo tra ciò che l'utente ha detto a voce e la frase attesa:
// usato ovunque mostriamo "Ho sentito: ...", per capire cosa è andato storto
// invece di un semplice giusto/sbagliato. Non è un secondo giudice — il
// giudizio resta a speechMatches(); questo serve solo a mostrare la
// differenza in modo leggibile.
import { normalizeSpeech } from './speech';

export interface DiffPart {
	text: string;
	kind: 'same' | 'miss' | 'extra';
}

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i += 1) {
		const row = [i];
		for (let j = 1; j <= n; j += 1) {
			row.push(a[i - 1] === b[j - 1] ? prevRow[j - 1]! : 1 + Math.min(prevRow[j - 1]!, prevRow[j]!, row[j - 1]!));
		}
		prevRow = row;
	}
	return prevRow[n]!;
}

// Sceglie a quale forma (jp coi kanji, yomi in kana, o una variante) è più
// vicino ciò che hai detto, così il confronto non mescola kanji e kana.
export function bestDiffTarget(said: string, candidates: (string | undefined)[]): string {
	const list = candidates.filter((c): c is string => !!c);
	const normSaid = normalizeSpeech(said);
	let best = list[0] ?? '';
	let bestDist = Infinity;
	for (const c of list) {
		const d = levenshtein(normSaid, normalizeSpeech(c));
		if (d < bestDist) { bestDist = d; best = c; }
	}
	return best;
}

// Diff a livello di carattere tra quello che hai detto e la frase attesa,
// dopo normalizeSpeech (via punteggiatura/spazi, kana e numeri equivalenti:
// "。" non compare mai, "1"/"一" non vengono segnati come diversi):
// 'miss' = dovevi dirlo e non l'hai detto (da aggiungere/correggere),
// 'extra' = hai detto qualcosa che non c'era, 'same' = combacia.
export function diffChars(said: string, expected: string): DiffPart[] {
	const a = normalizeSpeech(said);
	const b = normalizeSpeech(expected);
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = 1; i <= m; i += 1) {
		for (let j = 1; j <= n; j += 1) {
			dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
		}
	}
	const rev: DiffPart[] = [];
	let i = m;
	let j = n;
	while (i > 0 && j > 0) {
		if (a[i - 1] === b[j - 1]) { rev.push({ kind: 'same', text: a[i - 1]! }); i -= 1; j -= 1; }
		else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) { rev.push({ kind: 'extra', text: a[i - 1]! }); i -= 1; }
		else { rev.push({ kind: 'miss', text: b[j - 1]! }); j -= 1; }
	}
	while (i > 0) { rev.push({ kind: 'extra', text: a[i - 1]! }); i -= 1; }
	while (j > 0) { rev.push({ kind: 'miss', text: b[j - 1]! }); j -= 1; }
	rev.reverse();
	// unisce caratteri consecutivi dello stesso tipo in un unico span
	const parts: DiffPart[] = [];
	for (const part of rev) {
		const last = parts[parts.length - 1];
		if (last && last.kind === part.kind) last.text += part.text;
		else parts.push({ ...part });
	}
	return parts;
}
