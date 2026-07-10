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

// Frasi fatte (saluti & co.): il riconoscitore le scrive spesso in kanji
// (行ってきます, お帰りなさい) — varianti accettate per il confronto.
const SET_PHRASE_KANJI: Record<string, string[]> = {
	いってきます: ['行ってきます', '行って来ます'],
	いってらっしゃい: ['行ってらっしゃい'],
	ただいま: ['只今'],
	おかえり: ['お帰り'],
	おかえりなさい: ['お帰りなさい'],
	おやすみ: ['お休み'],
	おやすみなさい: ['お休みなさい'],
	いただきます: ['頂きます'],
	ごちそうさま: ['ご馳走様'],
	ごちそうさまでした: ['ご馳走様でした', 'ご馳走さまでした'],
	おはよう: ['お早う'],
	おはようございます: ['お早うございます'],
	こんにちは: ['今日は'],
	こんばんは: ['今晩は'],
	ありがとう: ['有難う'],
	ありがとうございます: ['有難うございます'],
	ありがとうございました: ['有難うございました'],
	すみません: ['済みません'],
	おつかれさまです: ['お疲れ様です', 'お疲れさまです'],
	お疲れさまです: ['お疲れ様です', 'おつかれさまです'],
	おさきにしつれいします: ['お先に失礼します'],
	お先に失礼します: ['おさきにしつれいします', 'お先に失礼致します'],
	おねがいします: ['お願いします'],
	はじめまして: ['初めまして'],
	よろしくおねがいします: ['よろしくお願いします', '宜しくお願いします'],
	よろしくお願いします: ['宜しくお願いします', 'よろしくおねがいします'],
	おめでとうございます: ['お目出度うございます'],
	おだいじに: ['お大事に'],
	お大事に: ['おだいじに'],
	しつれいします: ['失礼します'],
	いらっしゃいませ: []
};

export function phraseVariants(phrase: string): string[] {
	return [phrase, ...(SET_PHRASE_KANJI[phrase] ?? [])];
}

// Varianti di match per una frase intera detta a voce: la frase completa più
// i suoi segmenti (spezzati su 、): chi parla fa pausa alla virgola e il
// riconoscimento spesso si chiude lì — basta il segmento più sostanzioso.
export function sentenceMatchVariants(...phrases: (string | undefined)[]): string[] {
	const out = new Set<string>();
	for (const p of phrases) {
		if (!p) continue;
		out.add(p);
		for (const seg of p.split(/[、,]/)) {
			const s = seg.trim();
			if (normalizeSpeech(s).length >= 4) out.add(s);
		}
	}
	return [...out];
}
