// Riconoscimento vocale giapponese (Web Speech API). Disponibile su Chrome,
// Edge e Safari recenti; serve HTTPS e permesso microfono. Dove manca, le
// avventure restano a bottoni.

interface RecognitionAlternative {
	transcript: string;
}
interface RecognitionResultEvent {
	results: ArrayLike<ArrayLike<RecognitionAlternative>>;
}
interface Recognition {
	lang: string;
	interimResults: boolean;
	maxAlternatives: number;
	onresult: ((e: RecognitionResultEvent) => void) | null;
	onerror: ((e: { error?: string }) => void) | null;
	onend: (() => void) | null;
	start: () => void;
	stop: () => void;
	abort: () => void;
}

function recognitionCtor(): (new () => Recognition) | null {
	if (typeof window === 'undefined') return null;
	const w = window as unknown as Record<string, unknown>;
	return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

export function speechAvailable(): boolean {
	return recognitionCtor() !== null;
}

// Ascolta una frase in giapponese e ritorna le alternative riconosciute
// (migliore per prima). Array vuoto = niente capito / negato / errore.
export function listenJapanese(): Promise<string[]> {
	const Ctor = recognitionCtor();
	if (!Ctor) return Promise.resolve([]);
	return new Promise((resolve) => {
		const rec = new Ctor();
		rec.lang = 'ja-JP';
		rec.interimResults = false;
		rec.maxAlternatives = 5;
		let done = false;
		const finish = (out: string[]) => {
			if (done) return;
			done = true;
			resolve(out);
		};
		rec.onresult = (e) => {
			const first = e.results[0];
			const out: string[] = [];
			if (first) {
				for (let i = 0; i < first.length; i += 1) {
					const t = first[i]?.transcript?.trim();
					if (t) out.push(t);
				}
			}
			finish(out);
		};
		rec.onerror = () => finish([]);
		rec.onend = () => finish([]);
		try {
			rec.start();
		} catch {
			finish([]);
		}
	});
}

// Normalizza per il confronto: via spazi/punteggiatura, cifre a mezza
// larghezza, katakana → hiragana (il riconoscitore oscilla tra i due).
export function normalizeSpeech(s: string): string {
	return s
		.replace(/[\s　。、！？!?．.,]/g, '')
		.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
		.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// La frase detta "vale" se contiene tutte le parti attese (ognuna con le sue
// varianti accettabili: kanji, lettura kana, cifre…).
export function speechMatches(alternatives: string[], parts: string[][]): boolean {
	return alternatives.some((alt) => {
		const norm = normalizeSpeech(alt);
		return parts.every((variants) => variants.some((v) => norm.includes(normalizeSpeech(v))));
	});
}
