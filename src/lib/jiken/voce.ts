// 事件 — impostazioni del giocatore (nome, uomo/donna, voce, lingua…) e
// riconoscimento delle risposte dette a voce.
import { voiceParams } from '$lib/core/voices';
import { kanaToKanjiWritten, normalizeSpeech, phraseVariants } from '$lib/core/speech';
import { stripFuriganaNotation } from '$lib/core/furigana';
import type { SpeakOptions } from '$lib/core/tts';
import type { Lingua } from './tipi';

export type Sesso = 'M' | 'F';

export interface Impostazioni {
	nome: string;
	sesso: Sesso;
	voce: string | null; // voiceURI della voce scelta per te (null = quella predefinita del sesso)
	tono: number; // pitch della tua voce
	velocita: number; // velocità di tutte le voci
	autoVoce: boolean; // le battute si leggono da sole
	lingua: Lingua;
	completate: string[]; // missioni finite nella partita principale (si possono rigiocare)
	suoni: boolean; // effetti (telefono, campanelli…)
	ambiente: boolean; // uccellini di giorno, grilli di notte
	migliori: Record<string, { ok: number; tot: number; obiettivi?: number; risolto?: boolean }>; // il meglio di ogni missione finita (voto, obiettivi, risolto)
}

export const IMPOSTAZIONI_BASE: Impostazioni = { nome: 'ルカ', sesso: 'M', voce: null, tono: 1, velocita: 1, autoVoce: true, lingua: 'ja', completate: [], suoni: true, ambiente: true, migliori: {} };
const CHIAVE = 'renkei_jiken_imp';

export function caricaImpostazioni(): Impostazioni {
	try {
		const raw = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null') as Partial<Impostazioni> | null;
		// la lingua prima stava da sola
		const lingua = (localStorage.getItem('renkei_jiken_lingua') as Lingua | null) ?? undefined;
		return { ...IMPOSTAZIONI_BASE, ...(lingua ? { lingua } : {}), ...(raw ?? {}) };
	} catch {
		return { ...IMPOSTAZIONI_BASE };
	}
}
export function salvaImpostazioni(i: Impostazioni): void {
	try {
		localStorage.setItem(CHIAVE, JSON.stringify(i));
	} catch {
		/* niente storage */
	}
}

// voci giapponesi del sistema, col sesso indovinato dal nome (se si capisce)
export interface VoceDisponibile {
	uri: string;
	nome: string;
	sesso: Sesso | null;
}
const F = ['female', 'kyoko', 'o-ren', 'haruka', 'ayumi', 'nanami', 'sayaka', 'mizuki', '女'];
const M = ['male', 'otoya', 'hattori', 'ichiro', 'keita', 'daichi', 'naoki', 'takeru', 'takumi', 'kenji', '男'];
export function vociGiapponesi(): VoceDisponibile[] {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis
		.getVoices()
		.filter((v) => v.lang.toLowerCase().startsWith('ja'))
		.map((v) => {
			const n = `${v.name} ${v.voiceURI}`.toLowerCase();
			const g = n.match(/(?:standard|wavenet|neural2)-([a-d])/);
			const sesso: Sesso | null = g ? (g[1] === 'a' || g[1] === 'b' ? 'F' : 'M') : M.some((h) => n.includes(h)) ? 'M' : F.some((h) => n.includes(h)) ? 'F' : null;
			return { uri: v.voiceURI, nome: v.name, sesso };
		});
}

// la tua voce: quella scelta, altrimenti la predefinita del tuo sesso
export function voceGiocatore(i: Impostazioni): SpeakOptions {
	const base = voiceParams(i.sesso === 'F' ? 'femminile' : 'maschile');
	const scelta = i.voce && typeof window !== 'undefined' ? window.speechSynthesis?.getVoices().find((v) => v.voiceURI === i.voce) : null;
	return { ...base, voice: scelta ?? base.voice, pitch: scelta ? i.tono : (base.pitch ?? 1) * i.tono, rate: (base.rate ?? 1) * i.velocita };
}
export function vocePersonaggio(sesso: Sesso, i: Impostazioni): SpeakOptions {
	const base = voiceParams(sesso === 'F' ? 'femminile' : 'maschile');
	return { ...base, rate: (base.rate ?? 1) * i.velocita };
}

// ── risposte a voce: quale opzione hai detto?
function bigrammi(s: string): string[] {
	const out: string[] = [];
	for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
	return out.length ? out : [s];
}
function somiglianza(a: string, b: string): number {
	if (!a || !b) return 0;
	if (a === b) return 1;
	const A = bigrammi(a);
	const B = bigrammi(b);
	const resto = [...B];
	let comuni = 0;
	for (const x of A) {
		const k = resto.indexOf(x);
		if (k >= 0) {
			comuni++;
			resto.splice(k, 1);
		}
	}
	return (2 * comuni) / (A.length + B.length);
}
function varianti(opzione: string): string[] {
	const plain = stripFuriganaNotation(opzione).replace(/[ 　]/g, '');
	const out = new Set<string>([plain]);
	const kanji = kanaToKanjiWritten(plain);
	if (kanji) out.add(kanji);
	for (const seg of plain.split(/[、。！？]/).filter((x) => x.length >= 2)) for (const v of phraseVariants(seg)) out.add(v);
	return [...out].map(normalizeSpeech).filter(Boolean);
}
// Letture dei kanji dal dizionario: 拾う/ひろう → 拾 = ひろ, 財布/さいふ → 財布 = さいふ.
// Servono a riportare in kana quello che il riconoscitore scrive in kanji.
export function lettureKanji(parole: Iterable<{ scrittura: string; lettura: string }>): Map<string, string> {
	const out = new Map<string, string>();
	for (const w of parole) {
		for (const scr of w.scrittura.split(/;\s*/)) {
			const kana = scr.match(/[ぁ-ん]*$/)?.[0] ?? '';
			const kanji = scr.slice(0, scr.length - kana.length);
			const let0 = w.lettura.split(/;\s*/)[0] ?? '';
			if (!kanji || !/^[一-龯々]+$/.test(kanji) || !let0.endsWith(kana)) continue;
			const lettura = let0.slice(0, let0.length - kana.length);
			if (lettura && !out.has(kanji)) out.set(kanji, lettura);
		}
	}
	return out;
}
export function inKana(t: string, letture: Map<string, string>): string {
	return t.replace(/[一-龯々]+/g, (run) => {
		let out = '';
		let i = 0;
		while (i < run.length) {
			let n = run.length - i;
			while (n > 0 && !letture.has(run.slice(i, i + n))) n--;
			if (n === 0) {
				out += run[i];
				i++;
			} else {
				out += letture.get(run.slice(i, i + n));
				i += n;
			}
		}
		return out;
	});
}

// indice dell'opzione detta, o null se non si capisce (o se due si somigliano troppo)
export function opzioneDetta(sentito0: string[], opzioni: string[], letture?: Map<string, string>): number | null {
	const sentito = letture ? [...sentito0, ...sentito0.map((x) => inKana(x, letture))] : sentito0;
	const punti = opzioni.map((o) => {
		const vs = varianti(o);
		let best = 0;
		for (const alt of sentito) {
			const a = normalizeSpeech(alt);
			for (const v of vs) best = Math.max(best, somiglianza(a, v), a.includes(v) && v.length >= 3 ? 0.9 : 0);
		}
		return best;
	});
	const ordine = punti.map((p, i) => [p, i] as const).sort((x, y) => y[0] - x[0]);
	const [primo, secondo] = ordine;
	if (!primo || primo[0] < 0.5) return null;
	if (secondo && primo[0] - secondo[0] < 0.08) return null;
	return primo[1];
}

// testi italiani al maschile o al femminile: «Bentornat{o}» → Bentornato / Bentornata
export const declina = (t: string, s: Sesso): string => t.replaceAll('{o}', s === 'F' ? 'a' : 'o');

// Nome scritto in lettere → katakana, con la pronuncia italiana:
// luca → ルカ, giulia → ジュリア, chiara → キアラ, francesca → フランチェスカ.
export function nomeKatakana(nome: string, romajiToHiragana: (s: string) => string | null): string {
	const t = nome.trim();
	if (!t) return IMPOSTAZIONI_BASE.nome;
	if (!/^[a-zàèéìòùç' -]+$/i.test(t)) return t; // già in kana (o altro): così com'è
	let r = t
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ' -]/g, '')
		.replace(/gli/g, 'ri')
		.replace(/gn/g, 'ny')
		.replace(/sc([ei])/g, 'sh$1')
		.replace(/ch/g, 'k')
		.replace(/gh/g, 'g')
		.replace(/ci([aou])/g, 'ç$1')
		.replace(/c([ei])/g, 'ç$1')
		.replace(/gi([aou])/g, 'j$1')
		.replace(/g([ei])/g, 'j$1')
		.replace(/qu/g, 'ku')
		.replace(/c/g, 'k')
		.replace(/ç/g, 'ch')
		.replace(/l/g, 'r')
		.replace(/v/g, 'b')
		.replace(/x/g, 'kus')
		.replace(/h(?![aeiou])/g, '');
	// consonante senza vocale dopo: +u (dopo t/d +o); la n resta ん
	r = r.replace(/([bcdfgjkmpqrstvwyz])(?=[^aeiouy]|$)/g, (c, _x, i: number) => {
		if (r[i + 1] === c) return c; // doppia: っ
		if (c === 's' && r[i + 1] === 'h') return c;
		if (c === 'c' && r[i + 1] === 'h') return c;
		return c === 't' || c === 'd' ? `${c}o` : `${c}u`;
	});
	const hira = romajiToHiragana(r);
	if (!hira) return t;
	return hira.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}
