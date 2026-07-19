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
	// Il riconoscimento vocale funziona solo in secure context (https/localhost):
	// via http su IP l'API può esistere ma fallire — meglio i fallback a bottoni.
	if (typeof window !== 'undefined' && !window.isSecureContext) return false;
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

// Come listenJapanese, ma ritorna anche un `abort()` per interrompere subito
// l'ascolto (es. quando l'utente tocca un comando invece di parlare).
export function abortableListen(): { promise: Promise<string[]>; abort: () => void } {
	const Ctor = recognitionCtor();
	if (!Ctor) return { promise: Promise.resolve([]), abort: () => {} };
	let rec: Recognition | null = null;
	const promise = new Promise<string[]>((resolve) => {
		rec = new Ctor();
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
			if (first) for (let i = 0; i < first.length; i += 1) {
				const t = first[i]?.transcript?.trim();
				if (t) out.push(t);
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
	return { promise, abort: () => { try { rec?.abort(); } catch { /* pazienza */ } } };
}

const KANJI_DIGIT: Record<string, number> = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
const KANJI_UNIT: Record<string, number> = { '十': 10, '百': 100, '千': 1000 };

// 一時 / 1時: il riconoscitore (e chi scrive le frasi) oscilla tra numero
// scritto in kanji e cifre arabe — converte ogni sequenza di kanji-numero in
// cifre così il confronto non li tratta come diversi.
function kanjiNumeralsToArabic(s: string): string {
	return s.replace(/[〇零一二三四五六七八九十百千]+/g, (seq) => {
		let total = 0;
		let num = 0;
		for (const ch of seq) {
			if (ch in KANJI_DIGIT) num = KANJI_DIGIT[ch]!;
			else { total += (num || 1) * KANJI_UNIT[ch]!; num = 0; }
		}
		return String(total + num);
	});
}

// ── Numerali in KANA → forma scritta ─────────────────────────────────────────
// Il riconoscitore trascrive le letture come forma scritta («さんじ» → «3時»,
// «ここのか» → «9日»): per far convergere le due superfici, anche i numerali
// kana vengono convertiti in cifre+unità. Simmetrico: si applica sia alle
// varianti attese sia alla trascrizione, quindi non crea falsi match.
const NATIVE_DAYS: [string, string][] = [
	['ついたち', '1日'], ['ふつか', '2日'], ['みっか', '3日'], ['よっか', '4日'],
	['いつか', '5日'], ['むいか', '6日'], ['なのか', '7日'], ['ようか', '8日'],
	['ここのか', '9日'], ['とおか', '10日'], ['はつか', '20日']
];
const KANA_DIGIT: [string, number][] = [
	['じゅう', 10], ['ひゃく', 100], ['びゃく', 100], ['ぴゃく', 100],
	['せん', 1000], ['ぜん', 1000], ['まん', 10000],
	['いち', 1], ['きゅう', 9], ['しち', 7], ['なな', 7], ['ろく', 6],
	['よん', 4], ['はち', 8], ['さん', 3], ['ご', 5], ['く', 9], ['よ', 4],
	['し', 4], ['に', 2]
];
const KANA_UNIT: [string, string][] = [
	['じかん', '時間'], ['ふん', '分'], ['ぷん', '分'], ['にち', '日'],
	['えん', '円'], ['ばん', '番'], ['じ', '時']
];
const KANA_NUM_ATOM = 'じゅう|ひゃく|びゃく|ぴゃく|せん|ぜん|まん|いち|きゅう|しち|なな|ろく|よん|はち|さん|ご|く|よ|し|に';
const KANA_NUM_RE = new RegExp(`((?:${KANA_NUM_ATOM})+)(じかん|ふん|ぷん|にち|えん|ばん|じ)(はん)?`, 'g');

function kanaNumberValue(seq: string): number | null {
	let total = 0;
	let num = 0;
	let rest = seq;
	while (rest.length > 0) {
		const hit = KANA_DIGIT.find(([k]) => rest.startsWith(k));
		if (!hit) return null;
		const [k, v] = hit;
		if (v >= 10) {
			total += (num || 1) * v;
			num = 0;
		} else {
			num = v;
		}
		rest = rest.slice(k.length);
	}
	return total + num;
}

function kanaNumeralsToWritten(s: string): string {
	let out = s;
	for (const [kana, written] of NATIVE_DAYS) out = out.split(kana).join(written);
	out = out.replace(KANA_NUM_RE, (m, num: string, unitKana: string, han?: string) => {
		const v = kanaNumberValue(num);
		if (v === null) return m;
		const unit = KANA_UNIT.find(([k]) => k === unitKana)?.[1] ?? unitKana;
		return `${v}${unit}${han ? '半' : ''}`;
	});
	return out;
}

// Normalizza per il confronto: via spazi/punteggiatura, cifre a mezza
// larghezza, katakana → hiragana (il riconoscitore oscilla tra i due),
// numeri in kanji → cifre arabe, numerali kana → cifre+unità.
export function normalizeSpeech(s: string): string {
	return kanaNumeralsToWritten(
		kanjiNumeralsToArabic(
			s
				.replace(/[\s　。、！？!?．.,]/g, '')
				.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
				.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
		)
	);
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

// ── Kana → kanji per il match vocale ────────────────────────────────────────
// Le frasi N5 sono spesso memorizzate in kana (わたしは がくせいです), ma il
// riconoscitore trascrive in kanji (私は学生です): questa mappa genera una
// VARIANTE scritta aggiuntiva (longest-first, solo parole ≥2 kana non ambigue).
// Una conversione sbagliata produce solo una variante che non matcha, mai un
// match errato.
const KANA_KANJI_N5: [string, string][] = [
	['わたし', '私'], ['がくせい', '学生'], ['せんせい', '先生'], ['がっこう', '学校'],
	['だいがく', '大学'], ['としょかん', '図書館'], ['ともだち', '友達'], ['でんしゃ', '電車'],
	['えいがかん', '映画館'], ['えいが', '映画'], ['びじゅつかん', '美術館'], ['どうぶつえん', '動物園'],
	['こうえん', '公園'], ['ぎんこう', '銀行'], ['びょういん', '病院'], ['ゆうびんきょく', '郵便局'],
	['えき', '駅'], ['みせ', '店'], ['ほんや', '本屋'],
	['いりぐち', '入口'], ['でぐち', '出口'], ['きたぐち', '北口'], ['みなみぐち', '南口'],
	['ひがしぐち', '東口'], ['にしぐち', '西口'], ['ばんせん', '番線'],
	['にほんご', '日本語'], ['にほん', '日本'], ['きょう', '今日'], ['あした', '明日'],
	['きのう', '昨日'], ['まいにち', '毎日'], ['まいあさ', '毎朝'], ['こんばん', '今晩'],
	['げつようび', '月曜日'], ['かようび', '火曜日'], ['すいようび', '水曜日'],
	['もくようび', '木曜日'], ['きんようび', '金曜日'], ['どようび', '土曜日'],
	['にちようび', '日曜日'], ['せんしゅう', '先週'], ['らいしゅう', '来週'],
	['らいねん', '来年'], ['きょねん', '去年'], ['ことし', '今年'],
	['おとこ', '男'], ['おんな', '女'], ['こども', '子供'], ['かぞく', '家族'],
	['おかあさん', 'お母さん'], ['おとうさん', 'お父さん'], ['おにいさん', 'お兄さん'],
	['おねえさん', 'お姉さん'], ['おとうと', '弟'], ['いもうと', '妹'],
	['くるま', '車'], ['じてんしゃ', '自転車'], ['ひこうき', '飛行機'],
	['てがみ', '手紙'], ['しゃしん', '写真'], ['しんぶん', '新聞'], ['ざっし', '雑誌'],
	['じしょ', '辞書'], ['かいしゃ', '会社'], ['しごと', '仕事'], ['べんきょう', '勉強'],
	['りょこう', '旅行'], ['かいもの', '買い物'], ['りょうり', '料理'], ['そうじ', '掃除'],
	['せんたく', '洗濯'], ['さんぽ', '散歩'], ['おんがく', '音楽'], ['やさい', '野菜'],
	['さかな', '魚'], ['にく', '肉'], ['たまご', '卵'], ['ぎゅうにゅう', '牛乳'],
	['みず', '水'], ['おちゃ', 'お茶'], ['ごはん', 'ご飯'], ['あさごはん', '朝ご飯'],
	['ひるごはん', '昼ご飯'], ['ばんごはん', '晩ご飯'], ['てんき', '天気'],
	['あめ', '雨'], ['ゆき', '雪'], ['かぜ', '風'], ['やま', '山'], ['うみ', '海'],
	['たべます', '食べます'], ['たべる', '食べる'], ['たべて', '食べて'], ['たべた', '食べた'],
	['のみます', '飲みます'], ['のむ', '飲む'], ['のんで', '飲んで'], ['のんだ', '飲んだ'],
	['いきます', '行きます'], ['いく', '行く'], ['いって', '行って'], ['いった', '行った'],
	['きます', '来ます'], ['よみます', '読みます'], ['よむ', '読む'], ['よんで', '読んで'],
	['かきます', '書きます'], ['かく', '書く'], ['かいて', '書いて'],
	['ききます', '聞きます'], ['きく', '聞く'], ['きいて', '聞いて'],
	['はなします', '話します'], ['はなす', '話す'], ['はなして', '話して'],
	['みます', '見ます'], ['みる', '見る'], ['みて', '見て'], ['みた', '見た'],
	['かいます', '買います'], ['かう', '買う'], ['かって', '買って'], ['かった', '買った'],
	['おきます', '起きます'], ['おきる', '起きる'], ['ねます', '寝ます'], ['ねる', '寝る'],
	['あいます', '会います'], ['あう', '会う'], ['あって', '会って'],
	['つくります', '作ります'], ['つくる', '作る'], ['つくって', '作って'],
	['はたらきます', '働きます'], ['はたらく', '働く'],
	['おおきい', '大きい'], ['ちいさい', '小さい'], ['たかい', '高い'], ['やすい', '安い'],
	['あたらしい', '新しい'], ['ふるい', '古い'], ['さむい', '寒い'], ['あつい', '暑い'],
	['おいしい', '美味しい'], ['たのしい', '楽しい'], ['はやい', '早い'], ['ながい', '長い'],
	['すき', '好き'], ['げんき', '元気'], ['しずか', '静か'], ['ゆうめい', '有名'],
	['なん', '何'], ['なに', '何'], ['いっしょ', '一緒'], ['じかん', '時間'],
	['いえ', '家'], ['うち', '家'], ['へや', '部屋'], ['まえ', '前'], ['うしろ', '後ろ'],
	['うえ', '上'], ['した', '下'], ['なか', '中'], ['ちかく', '近く'], ['となり', '隣']
];
// longest-first così にほんご vince su にほん, あさごはん su ごはん.
const KANA_KANJI_SORTED = [...KANA_KANJI_N5].sort((a, b) => b[0].length - a[0].length);

// Variante «come la scriverebbe il riconoscitore» di una frase in kana.
// Ritorna null se non cambia nulla (nessuna parola nota).
export function kanaToKanjiWritten(phrase: string): string | null {
	let out = phrase;
	for (const [kana, kanji] of KANA_KANJI_SORTED) out = out.split(kana).join(kanji);
	return out !== phrase ? out : null;
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
