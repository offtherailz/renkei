// Segmenta le frasi del seed in "pezzi" (bunsetsu: parola + particelle e
// ausiliari che le si appoggiano) e riconosce le forme grammaticali.
//
// Gira a build-time con kuromoji (dizionario IPADIC, 18 MB: troppo per
// l'app), il risultato va in static/segmenti-n5n4.json.
//
//   node scripts/segmenta-frasi.mjs            genera il file
//   node scripts/segmenta-frasi.mjs --rivedi   scrive anche l'elenco dei casi dubbi
//
// Formato di una frase segmentata:  "くすり·を|飲む·の·を|わすれ·ない·で|ください·。"
//   |  confine di pezzo      ·  confine di parola dentro il pezzo
//
// kuromoji sbaglia sulle parole scritte tutte in kana: le frasi corrette a
// mano stanno in scripts/data/segmenti-correzioni.json (frase → pezzi, con
// o senza i · interni) e vincono sempre sul calcolo automatico.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'static/seed-n5n4.json');
const OUT = path.join(ROOT, 'static/segmenti-n5n4.json');
const CORREZIONI = path.join(ROOT, 'scripts/data/segmenti-correzioni.json');
const DA_RIVEDERE = path.join(ROOT, 'scripts/data/segmenti-da-rivedere.txt');

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');

const FURIGANA = /([^\[\]\s​]+)\[([^\[\]]+)\]/g;
export const senzaFurigana = (s) => s.replace(FURIGANA, (_m, base) => base);

const KANA = /^[ぁ-んー]+$/;
const CHIUDE = /^[、。！？!?」』）)…・〜~，．,.]+$/;
const APRE = /^[「『（(]+$/;
const VUOTO = /^[＿_]+$/;

// Etichette delle forme: nel file vanno i codici, l'app sceglie la lingua.
export const ETICHETTE = {
	te: 'forma て',
	'te-iru': 'ている (azione in corso / stato)',
	'te-kudasai': 'てください (richiesta)',
	'te-aux': 'て + ausiliare',
	'te-miru': 'てみる (provare a)',
	'te-oku': 'ておく (fare in anticipo)',
	'te-shimau': 'てしまう (finire / purtroppo)',
	'te-aru': 'てある (è stato fatto)',
	'te-ageru': 'てあげる (fare per qualcuno)',
	'te-kureru': 'てくれる (qualcuno fa per me)',
	'te-morau': 'てもらう (farsi fare)',
	'te-itadaku': 'ていただく (farsi fare, umile)',
	'te-yaru': 'てやる (fare per qualcuno, informale)',
	'te-kuru': 'てくる (venire facendo / cominciare a)',
	'te-iku': 'ていく (andare facendo / continuare a)',
	'te-wa-ikenai': 'てはいけない (divieto)',
	'te-mo-ii': 'てもいい (permesso)',
	'nai-de': 'ないで (senza fare / non fare)',
	nakereba: 'なければ (se non… / dovere)',
	'zu-ni': 'ずに (senza fare)',
	'you-ni': 'ように (in modo da / affinché)',
	'n-desu': 'んです/のです (spiegazione)',
	kamoshirenai: 'かもしれない (forse)',
	tsumori: 'つもり (intenzione)',
	hazu: 'はず (dovrebbe)',
	'to-iu': 'という (chiamato / che dice)',
	'ni-tsuite': 'について (riguardo a)',
	'ni-yotte': 'によって (a seconda di / da parte di)',
	'ni-totte': 'にとって (per, dal punto di vista di)',
	'to-shite': 'として (in qualità di)',
	'ni-taishite': 'に対して (nei confronti di)',
	'te-wa': 'ては',
	'te-mo': 'ても (anche se)',
	'te-kara': 'てから (dopo aver)',
	masu: 'ます (cortese)',
	mashita: 'ました (passato cortese)',
	masen: 'ません (negativo cortese)',
	mashou: 'ましょう (volitivo cortese)',
	deshita: 'でした (passato cortese)',
	nai: 'ない (negativo)',
	zu: 'ず (negativo)',
	ta: 'た (passato)',
	tara: 'たら (condizionale)',
	ba: 'ば (condizionale)',
	nara: 'なら (condizionale)',
	tai: 'たい (desiderio)',
	volitivo: 'volitivo (〜う/〜よう)',
	darou: 'だろう/でしょう (probabilmente)',
	passivo: 'passivo (〜れる)',
	'passivo-potenziale': 'passivo o potenziale (〜られる)',
	potenziale: 'potenziale',
	causativo: 'causativo (〜せる/〜させる)',
	imperativo: 'imperativo',
	nasai: 'なさい (ordine gentile)',
	nagara: 'ながら (mentre)',
	tari: 'たり (elenco di azioni)',
	sou: 'そう (sembra / dicono)',
	you: 'よう (sembra / in modo da)',
	rashii: 'らしい (pare che)',
	yasui: 'やすい (facile da)',
	nikui: 'にくい (difficile da)',
	sugiru: 'すぎる (troppo)'
};

const TE_AUX = {
	みる: 'te-miru', 見る: 'te-miru', おく: 'te-oku', 置く: 'te-oku', しまう: 'te-shimau', ある: 'te-aru',
	あげる: 'te-ageru', 上げる: 'te-ageru', くれる: 'te-kureru', もらう: 'te-morau', 貰う: 'te-morau',
	いただく: 'te-itadaku', 頂く: 'te-itadaku', やる: 'te-yaru', くる: 'te-kuru', 来る: 'te-kuru',
	いく: 'te-iku', 行く: 'te-iku', ゆく: 'te-iku'
};
// costruzioni riconosciute dal testo del pezzo (kuromoji le dà già unite)
const COSTRUZIONI = [
	[/かも(しれ|知れ)/, 'kamoshirenai'],
	[/ては(いけ|なら(ない|ん|なかっ)|だめ|ダメ)/, 'te-wa-ikenai'],
	[/[んい]では(いけ|なら(ない|ん|なかっ)|だめ|ダメ)/, 'te-wa-ikenai'],
	[/[てで]も(いい|よい|良い|よろしい|かまい|かまわ|構い|構わ)/, 'te-mo-ii']
];
// particelle composte: kuromoji le dà come un solo morfema (助詞, 連語)
const PARTICELLE_COMPOSTE = [
	[/^という$/, 'to-iu'],
	[/^について$/, 'ni-tsuite'],
	[/^によ(って|り|る)$/, 'ni-yotte'],
	[/^にとって$/, 'ni-totte'],
	[/^として$/, 'to-shite'],
	[/^に対(して|する|し)$/, 'ni-taishite']
];
const E_U = { え: 'う', け: 'く', げ: 'ぐ', せ: 'す', て: 'つ', ね: 'ぬ', べ: 'ぶ', め: 'む', れ: 'る' };

export async function creaSegmentatore() {
	const tk = await new Promise((res, rej) =>
		kuromoji
			.builder({ dicPath: path.join(ROOT, 'node_modules/kuromoji/dict') })
			.build((e, t) => (e ? rej(e) : res(t)))
	);
	const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
	const letture = new Set();
	const scritture = new Set();
	for (const w of seed.words) {
		if (w.scrittura) scritture.add(w.scrittura);
		for (const l of [w.lettura, w.scrittura]) if (l && KANA.test(l) && l.length >= 2) letture.add(l);
	}

	const isNum = (t) => (t.pos === '名詞' && t.pos_detail_1 === '数') || /^[0-9０-９]+$/.test(t.s);

	const perLunghezza = new Map();
	for (const l of letture) {
		if (!perLunghezza.has(l.length)) perLunghezza.set(l.length, new Set());
		perLunghezza.get(l.length).add(l);
	}
	const LUNGHEZZA_MAX = Math.max(...perLunghezza.keys());
	const PARTICELLA = /^(助詞|助動詞)$/;

	function grezzi(pezzo) {
		const a = [];
		let pos = 0;
		for (const r of tk.tokenize(pezzo)) {
			const t = { ...r, s: r.surface_form, da: pos };
			pos += t.s.length;
			const p = a[a.length - 1];
			if (p && ((isNum(p) && isNum(t)) || (VUOTO.test(p.s) && VUOTO.test(t.s)))) {
				p.s += t.s;
				continue;
			}
			a.push(t);
		}
		return a;
	}

	// kuromoji ha "inventato" questo morfema spezzando una parola in kana?
	function sospetto(t, i) {
		if (!KANA.test(t.s)) return false;
		if (t.word_type === 'UNKNOWN') return true;
		if (PARTICELLA.test(t.pos)) return i === 0; // un pezzo non inizia con una particella
		if (/^(動詞|形容詞|副詞|接続詞|連体詞|感動詞|接頭詞)$/.test(t.pos)) return false; // し·ます, い·ない: radici vere
		if (t.s.length === 1) return true;
		if (t.pos === '名詞' && t.pos_detail_1 === '固有名詞') return true;
		return t.pos === '名詞' && t.pos_detail_1 === '一般' && t.s.length <= 2 && !letture.has(t.s);
	}

	// 1) morfemi kuromoji; dove kuromoji spezza una parola in kana che è a
	// catalogo (じ|ゅぎょう, え|き, り|ょこう) la parola si ricompone e il resto
	// del pezzo si rianalizza da solo.
	function ricomposti(pezzo, profondita = 0) {
		const a = grezzi(pezzo);
		if (profondita > 6) return a;
		for (let i = 0; i < a.length; i += 1) {
			const t = a[i];
			if (!sospetto(t, i)) continue;
			const fine = t.da + t.s.length;
			for (let len = Math.min(LUNGHEZZA_MAX, pezzo.length); len >= 2; len -= 1) {
				const parole = perLunghezza.get(len);
				if (!parole) continue;
				for (let da = Math.max(0, t.da - len + 1); da < fine && da + len <= pezzo.length; da += 1) {
					const a_ = da + len;
					if (da >= t.da && a_ <= fine && len < t.s.length) continue; // tutta dentro il morfema
					if (da === t.da && a_ === fine) continue; // è già il morfema
					// parole di 2 kana: solo se partono dal kana sospetto a inizio pezzo o dopo una parola intera
					if (len === 2 && !(da === t.da && t.s.length === 1)) continue;
					if (!a.some((x) => x.da === da)) continue; // la parola parte da un confine di morfema
					const ultimo = a.find((x) => x.da < a_ && x.da + x.s.length >= a_);
					if (ultimo && ultimo.da + ultimo.s.length !== a_ && ultimo.word_type !== 'UNKNOWN' && !/^[はがをにでとのもへや]$/.test(ultimo.s.slice(a_ - ultimo.da))) continue; // e non taglia un morfema noto
					const parola = pezzo.slice(da, a_);
					if (!parole.has(parola)) continue;
					return [
						...(da > 0 ? ricomposti(pezzo.slice(0, da), profondita + 1) : []),
						{ s: parola, pos: '名詞', pos_detail_1: '一般', basic_form: parola, conjugated_form: '*', unito: true },
						...(a_ < pezzo.length ? ricomposti(pezzo.slice(a_), profondita + 1).map((x, k) => (k === 0 && x.s.length === 1 && /^[はがをにでとのもへや]$/.test(x.s) ? { ...x, pos: '助詞', pos_detail_1: '格助詞' } : x)) : [])
					];
				}
			}
		}
		return a;
	}

	// secondo passaggio: morfemi in kana tutti "plausibili" che insieme fanno
	// una parola del catalogo (さい|ふ, らい|しゅう, おい|わい)
	function morfemi(pezzo) {
		const a = ricomposti(pezzo);
		const b = [];
		for (let i = 0; i < a.length; i += 1) {
			let unito = false;
			for (let n = 4; n >= 2 && !unito; n -= 1) {
				const run = a.slice(i, i + n);
				if (run.length < n || !run.every((t) => KANA.test(t.s) && !t.unito)) continue;
				const parola = run.map((t) => t.s).join('');
				if (!letture.has(parola)) continue;
				if (parola.length < 3) {
					// ち|ち|は: due kana soli a inizio pezzo, seguiti da una particella
					const dopo = a[i + n];
					const ok = i === 0 && n === 2 && run.every((t) => t.s.length === 1) && (!dopo || (dopo.pos === '助詞' && dopo.pos_detail_1 !== '接続助詞'));
					if (!ok) continue;
				}
				if (run.some((t) => t.pos === '助動詞') || run[n - 1].pos === '助詞') continue;
				b.push({ s: parola, pos: '名詞', pos_detail_1: '一般', basic_form: parola, conjugated_form: '*', unito: true });
				i += n - 1;
				unito = true;
			}
			if (!unito) b.push(a[i]);
		}
		return b;
	}

	// 2) un morfema si appoggia al pezzo precedente?
	function siAppoggia(t, prev) {
		const p = t.pos;
		const d = t.pos_detail_1;
		if (CHIUDE.test(t.s)) return true;
		if (!prev) return false;
		if (APRE.test(prev.s)) return true;
		// 「…」と / 「…」は: la particella dopo la citazione resta con la citazione
		if (/[」』）)]$/.test(prev.s) && (p === '助詞' || p === '助動詞')) return true;
		if (CHIUDE.test(prev.s) || APRE.test(t.s) || VUOTO.test(t.s) || VUOTO.test(prev.s)) return false;
		if (p === '助詞' || p === '助動詞') return true;
		if ((p === '動詞' || p === '形容詞') && (d === '非自立' || d === '接尾')) return true;
		if (p === '名詞' && d === '接尾') return true;
		if (p === '名詞' && d === '非自立' && (/^[のん]$/.test(t.s) || t.pos_detail_2 === '助動詞語幹')) return true;
		if (p === '名詞' && d === '特殊' && t.pos_detail_2 === '助動詞語幹') return true; // そう (伝聞)
		if (p === '動詞' && /^(する|できる)$/.test(t.basic_form) && prev.pos === '名詞' && prev.pos_detail_1 === 'サ変接続') return true;
		if (prev.pos === '接頭詞') return true;
		if (isNum(prev) && p === '名詞' && t.s.length <= 4) return true; // 三百グラム, 5月
		// verbo composto: 飲み込む, 跳ね飛ばす, 取り上げる
		if (p === '動詞' && prev.pos === '動詞' && prev.conjugated_form === '連用形' && prev.pos_detail_1 === '自立') return true;
		// かもしれない
		if (/^(しれる|知れる)$/.test(t.basic_form) && /も$/.test(prev.s)) return true;
		// nome composto: 語学センター, 日本語学校, 何曜日 (non dopo 来年, 今夜, きのう...)
		if (p === '名詞' && /^(一般|サ変接続|固有名詞)$/.test(d) && !t.unito && prev.pos === '名詞') {
			const pd = prev.pos_detail_1;
			if (/^(一般|サ変接続|固有名詞|形容動詞語幹)$/.test(pd) && !prev.unito && !KANA.test(prev.s) && !KANA.test(t.s)) return true;
			if (prev.s === '何') return true;
		}
		return false;
	}

	function gruppi(testo) {
		const out = [];
		for (const pezzo of testo.split(/[\s　]+/).filter(Boolean)) {
			let prev = null;
			let cur = null;
			const ms = morfemi(pezzo);
			// «あね が»: un pezzo tra spazi fatto solo di particelle sta con la parola prima
			if (out.length && PARTICELLA.test(ms[0].pos) && ms.slice(1).every((t) => CHIUDE.test(t.s))) {
				out[out.length - 1].push(...ms);
				continue;
			}
			for (const t of ms) {
				if (cur && siAppoggia(t, prev)) cur.push(t);
				else {
					cur = [t];
					out.push(cur);
				}
				prev = t;
			}
		}
		return out;
	}

	// 3) forme grammaticali dentro un pezzo
	function forme(g) {
		const out = new Set();
		const haMasu = g.some((x) => x.basic_form === 'ます');
		for (let i = 0; i < g.length; i += 1) {
			const t = g[i];
			const n = g[i + 1];
			const pv = g[i - 1];
			const b = t.basic_form;
			const p = t.pos;
			if (p === '助詞' && t.pos_detail_1 === '接続助詞' && /^(て|で|って)$/.test(t.s) && pv && /^(動詞|形容詞)$/.test(pv.pos)) {
				if (n && n.pos === '動詞' && n.pos_detail_1 === '非自立') {
					if (/^(下さる|くださる)$/.test(n.basic_form)) out.add('te-kudasai');
					else if (/^(いる|おる)$/.test(n.basic_form)) out.add('te-iru');
					else out.add(TE_AUX[n.basic_form] ?? 'te-aux');
				} else if (n && n.s === 'は') out.add('te-wa');
				else if (n && n.s === 'も') out.add('te-mo');
				else if (n && n.s === 'から') out.add('te-kara');
				else out.add('te');
			}
			if (p === '助動詞') {
				if (b === 'ます') {
					if (t.s === 'ましょ') out.add('mashou');
					else if (n && n.s === 'ん') out.add('masen');
					else if (n && n.basic_form === 'た') out.add('mashita');
					else out.add('masu');
				} else if (b === 'ない') {
					if (n && n.s === 'で') out.add('nai-de');
					else if (t.conjugated_form === '仮定形' && n && n.s === 'ば') out.add('nakereba');
					else out.add('nai');
				}
				else if (b === 'た') {
					if (t.s === 'たら' || t.s === 'だら') out.add('tara');
					else if (pv && pv.basic_form === 'です') out.add('deshita');
					else if (!haMasu) out.add('ta');
				} else if (b === 'たい') out.add('tai');
				else if (b === 'う' || b === 'よう') {
					if (pv && /^(だろ|でしょ)$/.test(pv.s)) out.add('darou');
					else if (!(pv && pv.s === 'ましょ')) out.add('volitivo');
				} else if (b === 'だ' && t.s === 'なら') out.add('nara');
				else if (b === 'らしい') out.add('rashii');
				else if (b === 'ぬ' && t.s === 'ず') out.add(n && n.s === 'に' ? 'zu-ni' : 'zu');
			}
			if (p === '動詞' && t.pos_detail_1 === '接尾') {
				if (b === 'れる') out.add('passivo');
				if (b === 'られる') out.add('passivo-potenziale');
				if (/^(せる|させる)$/.test(b)) out.add('causativo');
			}
			if (p === '動詞' && b === 'できる') out.add('potenziale');
			// 眠れる ← 眠る: verbo ichidan in え-る la cui forma godan è a catalogo
			if (p === '動詞' && t.pos_detail_1 === '自立' && /一段/.test(t.conjugated_type || '') && b && b.length >= 3 && !scritture.has(b)) {
				const u = E_U[b[b.length - 2]];
				if (u && scritture.has(b.slice(0, -2) + u)) out.add('potenziale');
			}
			if (t.conjugated_form === '仮定形' && n && n.s === 'ば' && b !== 'ない') out.add('ba');
			if (p === '動詞' && t.pos_detail_1 === '自立' && /^命令/.test(t.conjugated_form || '') && !/(ください|下さい|なさい|らっしゃい|ませ)$/.test(t.s) && (!n || CHIUDE.test(n.s) || n.pos_detail_1 === '終助詞')) out.add('imperativo');
			if (p === '助詞') for (const [re, codice] of PARTICELLE_COMPOSTE) if (re.test(t.s)) out.add(codice);
			if (t.s === 'なさい' && pv && pv.pos === '動詞' && pv.conjugated_form === '連用形' && pv.s !== 'ごめん') out.add('nasai');
			if (p === '助詞' && t.s === 'ながら') out.add('nagara');
			if (p === '助詞' && (t.s === 'たり' || t.s === 'だり')) out.add('tari');
			if (p === '名詞' && t.s === 'そう' && t.pos_detail_2 === '助動詞語幹') out.add('sou');
			if (p === '名詞' && t.s === 'よう' && t.pos_detail_2 === '助動詞語幹') out.add(n && n.s === 'に' ? 'you-ni' : 'you');
			if (p === '名詞' && t.pos_detail_1 === '非自立' && /^[のん]$/.test(t.s) && n && /^(です|だ)$/.test(n.basic_form)) out.add('n-desu');
			if (p === '名詞' && t.s === 'つもり') out.add('tsumori');
			if (p === '名詞' && t.s === 'はず' && t.pos_detail_1 === '非自立') out.add('hazu');
			if (p === '形容詞' && t.pos_detail_1 === '非自立' && b === 'やすい') out.add('yasui');
			if (p === '形容詞' && t.pos_detail_1 === '非自立' && b === 'にくい') out.add('nikui');
			if (p === '動詞' && t.pos_detail_1 === '非自立' && /^(すぎる|過ぎる)$/.test(b)) out.add('sugiru');
		}
		const testo = g.map((x) => x.s).join('');
		for (const [re, codice] of COSTRUZIONI) if (re.test(testo)) out.add(codice);
		if (out.has('te-wa-ikenai')) out.delete('te-wa');
		if (out.has('te-mo-ii')) out.delete('te-mo');
		return [...out];
	}

	// forme di tutti i pezzi; ては + いけない e ても + いい stanno su due pezzi
	function formeDi(gs) {
		const fs_ = gs.map((g) => forme(g));
		for (let i = 0; i < gs.length - 1; i += 1) {
			const dopo = gs[i + 1].map((t) => t.s).join('');
			const cambia = (da, a) => {
				const k = fs_[i].indexOf(da);
				if (k >= 0) fs_[i][k] = a;
			};
			if (/^(いけ|なら(ない|ん|なかっ)|だめ|ダメ)/.test(dopo)) cambia('te-wa', 'te-wa-ikenai');
			if (/^(いい|よい|良い|よろしい|かまい|かまわ|構い|構わ)/.test(dopo)) cambia('te-mo', 'te-mo-ii');
		}
		return fs_;
	}

	// segnali di errore probabile, per la revisione a mano
	function dubbi(gs) {
		const motivi = new Set();
		for (const g of gs) {
			const nudo = g.filter((t) => !CHIUDE.test(t.s) && !APRE.test(t.s));
			if (nudo.length === 0) continue;
			const testo = nudo.map((t) => t.s).join('');
			if (/^[ぁ-ん]$/.test(testo) && !(/^[あえおまわ]$/.test(testo) && g.length > nudo.length)) motivi.add('kana isolato');
			if (/^(助詞|助動詞)$/.test(nudo[0].pos) && !nudo[0].unito && !/^[「『（(]/.test(g[0].s)) motivi.add('pezzo che inizia con particella');
			for (const t of nudo) {
				if (t.unito || !KANA.test(t.s)) continue;
				if (t.word_type === 'UNKNOWN') motivi.add('parola sconosciuta');
				if (t.pos === '名詞' && /^(一般|固有名詞)$/.test(t.pos_detail_1) && t.s.length <= 2 && !letture.has(t.s)) motivi.add('nome corto in kana');
				if (t.pos === '名詞' && t.pos_detail_1 === '固有名詞') motivi.add('nome proprio in kana');
			}
		}
		return [...motivi];
	}

	return {
		segmenta(testo) {
			const gs = gruppi(testo);
			return {
				seg: gs.map((g) => g.map((t) => t.s).join('·')).join('|'),
				forme: formeDi(gs),
				dubbi: dubbi(gs)
			};
		},
		// pezzi già decisi a mano: dentro ogni pezzo valgono i · scritti, altrimenti kuromoji
		daCorrezione(corretta) {
			const pezzi = corretta.split('|');
			const gs = pezzi.map((pz) => morfemi(pz.replace(/·/g, '')));
			return {
				seg: pezzi.map((pz, i) => (pz.includes('·') ? pz : gs[i].map((t) => t.s).join('·'))).join('|'),
				forme: formeDi(gs),
				dubbi: []
			};
		}
	};
}

export function frasiDelSeed(seed) {
	const out = new Set();
	(function visita(v, chiave) {
		if (typeof v === 'string') {
			if (chiave !== 'testo') return;
			const plain = senzaFurigana(v).trim();
			if (/[ぁ-んァ-ヶ一-龯]/.test(plain)) out.add(plain);
		} else if (Array.isArray(v)) v.forEach((x) => visita(x, chiave));
		else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visita(x, k);
	})(seed, '');
	return [...out];
}

const compatta = (s) => s.replace(/[\s　|·]+/g, '');

async function main() {
	const rivedi = process.argv.includes('--rivedi');
	const seg = await creaSegmentatore();
	const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
	const correzioni = fs.existsSync(CORREZIONI) ? JSON.parse(fs.readFileSync(CORREZIONI, 'utf8')) : {};
	const frasi = frasiDelSeed(seed);
	const out = {};
	const daRivedere = [];
	let corrette = 0;
	const usate = new Set();
	for (const f of frasi) {
		if (/[|·]/.test(f)) throw new Error(`La frase contiene un separatore riservato: ${f}`);
		let r;
		if (correzioni[f]) {
			if (compatta(correzioni[f]) !== compatta(f)) throw new Error(`Correzione che non ricompone la frase:\n  ${f}\n  ${correzioni[f]}`);
			r = seg.daCorrezione(correzioni[f]);
			corrette += 1;
			usate.add(f);
		} else r = seg.segmenta(f);
		if (compatta(r.seg) !== compatta(f)) throw new Error(`Segmentazione che non ricompone la frase:\n  ${f}\n  ${r.seg}`);
		const forme = {};
		r.forme.forEach((fs_, i) => {
			if (fs_.length) forme[i] = fs_;
		});
		out[f] = Object.keys(forme).length ? [r.seg, forme] : [r.seg];
		if (r.dubbi.length) daRivedere.push(`${f}\t${r.seg.replace(/·/g, '')}\t${r.dubbi.join(', ')}`);
	}
	const orfane = Object.keys(correzioni).filter((k) => !usate.has(k));
	const righe = Object.entries(out).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`);
	fs.writeFileSync(OUT, `{"versione":1,"etichette":${JSON.stringify(ETICHETTE)},"frasi":{\n${righe.join(',\n')}\n}}\n`);
	console.log(`frasi ${frasi.length}, corrette a mano ${corrette}, dubbie ${daRivedere.length}, correzioni orfane ${orfane.length}`);
	console.log(`scritto ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
	if (rivedi) {
		fs.writeFileSync(DA_RIVEDERE, daRivedere.join('\n') + '\n');
		console.log(`scritto ${path.relative(ROOT, DA_RIVEDERE)}`);
	}
	if (orfane.length) console.log('orfane:\n  ' + orfane.slice(0, 20).join('\n  '));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
