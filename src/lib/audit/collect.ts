// Collettore per l'audit linguistico esteso: raccoglie il CONTENUTO dati
// deterministico (frasi d'esempio, parafrasi, item curati, definizioni choukai,
// frasi utili) in un modello unico `AuditItem` con id STABILE, così i verdetti
// dell'insegnante si aggregano fra i cicli senza rivedere ciò che è già vagliato.
//
// Nota: NON campiona le domande generate a caso (id instabile) — l'audit una-tantum
// dei generatori resta `questionAudit.test.ts`. Qui si audita la SORGENTE (i dati),
// che è ciò che conta per la correttezza linguistica e che aggrega in modo stabile.
import PROPEDEUTICHE from '../data/propedeutiche-n5n4.json';
import COMPARAZIONI from '../data/comparazioni.json';
import COPPIE from '../data/coppie-n5n4.json';
import { LISTENING_DIALOGUES } from '../core/listeningDialogues';
import { SITUATIONS } from '../core/usefulPhrases';
import { stripFuriganaNotation } from '../core/furigana';
import type { Word, Grammar } from '../types/models';

export type AuditGruppo = 'quiz' | 'consolida' | 'gioco';

export interface AuditItem {
	id: string;
	gruppo: AuditGruppo;
	source: string;
	domanda?: string;
	contesto?: string;
	jp: string;
	reading?: string;
	it?: string;
	scelte?: string[];
	corretta?: string;
	perche?: string;
	ref?: string;
}

// Hash deterministico (djb2 → base36): stabile fra run/macchine, niente dipendenze.
export function hashId(...parts: (string | undefined)[]): string {
	const s = parts.filter(Boolean).join('|');
	let h = 5381;
	for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
	return h.toString(36).padStart(7, '0').slice(0, 8);
}

function item(gruppo: AuditGruppo, source: string, fields: Omit<AuditItem, 'id' | 'gruppo' | 'source'>): AuditItem {
	return { id: hashId(source, fields.jp, fields.corretta), gruppo, source, ...fields };
}

// ── Sorgenti ──────────────────────────────────────────────────────────────────

// Frasi d'esempio delle parole (base di quiz/consolida/avverbi).
export function collectWordSentences(words: Word[]): AuditItem[] {
	const out: AuditItem[] = [];
	for (const w of words) {
		for (const ex of w.frasi_esempio ?? []) {
			out.push(item('quiz', 'frase-parola', {
				jp: stripFuriganaNotation(ex.testo),
				it: ex.traduzione?.it,
				ref: `word:${w.id}`
			}));
		}
	}
	return out;
}

// Frasi d'esempio della grammatica.
export function collectGrammarSentences(grammar: Grammar[]): AuditItem[] {
	const out: AuditItem[] = [];
	for (const g of grammar) {
		for (const ex of g.frasi_esempio ?? []) {
			out.push(item('quiz', 'frase-grammatica', {
				jp: stripFuriganaNotation(ex.testo),
				it: ex.traduzione?.it,
				contesto: g.struttura,
				ref: `grammar:${g.id}`
			}));
		}
	}
	return out;
}

// Parafrasi 言い換え (gioco /iikae): gruppi di equivalenti a livello di frase.
export function collectParafrasi(words: Word[]): AuditItem[] {
	const out: AuditItem[] = [];
	for (const w of words) {
		if (!(w.parafrasi?.length)) continue;
		out.push(item('gioco', 'iikae', {
			jp: w.scrittura,
			corretta: w.parafrasi.join('・'),
			it: (w.significato?.it ?? [])[0],
			ref: `word:${w.id}`
		}));
	}
	return out;
}

// Consolida: item curati propedeutici (forma-contesto / keigo / 自他).
export function collectPropedeutiche(): AuditItem[] {
	const arr = (PROPEDEUTICHE as unknown as {
		items: Array<{
			tipo: string; frase_con_buco: string; corretta: string; parola?: string;
			distrattori?: string[]; perche?: string; traduzione_it?: string;
		}>;
	}).items;
	return arr.map((q) =>
		item('consolida', 'propedeutiche', {
			domanda: q.frase_con_buco,
			jp: q.frase_con_buco.replace('＿＿', q.corretta),
			corretta: q.corretta,
			scelte: [q.corretta, ...(q.distrattori ?? [])],
			perche: q.perche,
			it: q.traduzione_it,
			ref: q.parola
		})
	);
}

// Gioco /comparazioni: coppie (どっち/componi/ほど) e superlativi (一番).
export function collectComparazioni(): AuditItem[] {
	const data = COMPARAZIONI as unknown as {
		coppie: Array<{ a: { jp: string; it: string }; b: { jp: string; it: string }; adj: { dict: string; neg: string; it: string }; winner: 'a' | 'b' }>;
		superlativi: Array<{ gruppo: { it: string }; items: { jp: string; it: string }[]; adj: { dict: string; it: string }; winner: number }>;
	};
	const out: AuditItem[] = [];
	for (const c of data.coppie) {
		const win = c.winner === 'a' ? c.a : c.b;
		const los = c.winner === 'a' ? c.b : c.a;
		out.push(item('gioco', 'comparazioni', {
			domanda: `${c.a.jp}と${c.b.jp}、どちらのほうが${c.adj.dict}？`,
			jp: `${los.jp}より${win.jp}のほうが${c.adj.dict}です。`,
			corretta: win.jp,
			it: `${win.it} è più ${c.adj.it} di ${los.it}`,
			perche: `neg: ${c.adj.neg}`
		}));
	}
	for (const s of data.superlativi) {
		const win = s.items[s.winner]!;
		out.push(item('gioco', 'comparazioni', {
			domanda: `(${s.gruppo.it}) どれがいちばん${s.adj.dict}？`,
			jp: `${win.jp}がいちばん${s.adj.dict}です。`,
			corretta: win.jp,
			it: `${win.it} è il più ${s.adj.it}`
		}));
	}
	return out;
}

// Gioco /coppie: coppie difficili curate.
export function collectCoppie(): AuditItem[] {
	const data = COPPIE as unknown as { items: Array<{ a: string; b: string; domanda?: string; corretta?: string; perche?: string }> };
	return (data.items ?? []).map((c) =>
		item('gioco', 'coppie', {
			domanda: c.domanda,
			jp: `${c.a} / ${c.b}`,
			corretta: c.corretta,
			perche: c.perche
		})
	);
}

// Choukai: definizione dei dialoghi (battute con opzioni di slot) + domande.
export function collectChoukai(): AuditItem[] {
	const out: AuditItem[] = [];
	for (const d of LISTENING_DIALOGUES) {
		const slotOpts = new Map(d.slots.map((s) => [s.id, s.options.join('／')]));
		const lines = d.lines
			.map((l) => `${l.who}: ` + l.parts.map((p) => (typeof p === 'string' ? p : `〈${slotOpts.get(p.slot) ?? p.slot}〉`)).join(''))
			.join('\n');
		out.push(item('gioco', 'choukai', {
			contesto: d.scena,
			domanda: d.domanda,
			jp: lines,
			ref: d.id
		}));
	}
	return out;
}

// Frasi utili (situazioni di sopravvivenza).
export function collectFrasiUtili(): AuditItem[] {
	const out: AuditItem[] = [];
	for (const s of SITUATIONS) {
		for (const f of s.frasi) {
			out.push(item('gioco', 'frasi-utili', {
				contesto: s.titolo,
				jp: f.jp,
				reading: f.yomi,
				it: f.it,
				perche: f.quando
			}));
		}
	}
	return out;
}

export function collectAll(words: Word[], grammar: Grammar[]): AuditItem[] {
	const all = [
		...collectWordSentences(words),
		...collectGrammarSentences(grammar),
		...collectParafrasi(words),
		...collectPropedeutiche(),
		...collectComparazioni(),
		...collectCoppie(),
		...collectChoukai(),
		...collectFrasiUtili()
	];
	// dedup per id (stessa frase in più punti → un solo item da vagliare)
	const byId = new Map<string, AuditItem>();
	for (const it of all) if (!byId.has(it.id)) byId.set(it.id, it);
	return [...byId.values()];
}
