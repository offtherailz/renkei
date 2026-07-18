// Verdetti dell'insegnante + aggregazione. Funzioni PURE (nessun fs): il runner
// (contentAudit.test.ts) fa la lettura/scrittura file. Così i verdetti si
// accumulano fra i cicli e le percentuali si calcolano senza rivedere nulla.
import type { AuditItem, AuditGruppo } from './collect';

export type Verdetto = 'ok' | 'errore' | 'dubbio';
export interface VerdictRow {
	id: string;
	source: string;
	verdetto: Verdetto;
	problema?: string;
	ciclo: string;
}

const VALID: Verdetto[] = ['ok', 'errore', 'dubbio'];

export function parseVerdictsJsonl(text: string): VerdictRow[] {
	const out: VerdictRow[] = [];
	for (const line of text.split('\n')) {
		const t = line.trim();
		if (!t) continue;
		try {
			const v = JSON.parse(t) as VerdictRow;
			if (v.id && VALID.includes(v.verdetto)) out.push(v);
		} catch {
			/* riga malformata: ignora */
		}
	}
	return out;
}

export function reviewedIds(verdicts: VerdictRow[]): Set<string> {
	return new Set(verdicts.map((v) => v.id));
}

export function pendingItems(all: AuditItem[], reviewed: Set<string>): AuditItem[] {
	return all.filter((i) => !reviewed.has(i.id));
}

// Parsa la tabella «Verdetti» compilata dall'insegnante in un lotto .md:
//   | id | verdetto | problema |
// Righe con verdetto vuoto o non valido vengono saltate (non ancora vagliate).
export function parseFilledBatch(md: string): { id: string; verdetto: Verdetto; problema?: string }[] {
	const out: { id: string; verdetto: Verdetto; problema?: string }[] = [];
	for (const line of md.split('\n')) {
		const m = line.match(/^\s*\|(.+)\|\s*$/);
		if (!m) continue;
		const cells = m[1]!.split('|').map((c) => c.trim());
		if (cells.length < 2) continue;
		const [id, verdettoRaw, problema] = cells;
		if (!id || id === 'id' || /^-+$/.test(id)) continue; // header/separatore
		const verdetto = (verdettoRaw ?? '').toLowerCase() as Verdetto;
		if (!VALID.includes(verdetto)) continue;
		out.push({ id, verdetto, problema: problema || undefined });
	}
	return out;
}

// ── Rendering lotti ─────────────────────────────────────────────────────────

export function renderBatch(items: AuditItem[], numero: number): string {
	const L: string[] = [];
	L.push(`# Lotto ${String(numero).padStart(3, '0')} — audit contenuti`, '');
	L.push('Vaglia ogni voce, poi compila la tabella in fondo: **verdetto** = `ok` / `errore` / `dubbio`, **problema** = nota breve.', '');
	items.forEach((it, i) => {
		L.push(`### ${i + 1}. [${it.source}] \`${it.id}\``);
		if (it.contesto) L.push(`- contesto: ${it.contesto}`);
		if (it.domanda) L.push(`- domanda: ${it.domanda}`);
		L.push(`- jp: ${it.jp.replace(/\n/g, ' ⏎ ')}`);
		if (it.reading) L.push(`- lettura: ${it.reading}`);
		if (it.corretta) L.push(`- ✅ corretta: ${it.corretta}`);
		if (it.scelte?.length) L.push(`- scelte: ${it.scelte.join(' ・ ')}`);
		if (it.it) L.push(`- it: ${it.it}`);
		if (it.perche) L.push(`- perché: ${it.perche}`);
		L.push('');
	});
	L.push('## Verdetti (compila qui)', '', '| id | verdetto | problema |', '|---|---|---|');
	for (const it of items) L.push(`| ${it.id} |  |  |`);
	L.push('');
	return L.join('\n');
}

// ── Aggregazione ────────────────────────────────────────────────────────────

export interface Aggregate {
	totali: number;
	problemi: number;
	pct: number;
	perGruppo: Record<string, { tot: number; problemi: number; pct: number }>;
	perSource: Record<string, { tot: number; problemi: number; pct: number }>;
	perCiclo: Record<string, { tot: number; problemi: number; pct: number }>;
}

const isProblem = (v: Verdetto) => v === 'errore' || v === 'dubbio';
const pct = (p: number, t: number) => (t === 0 ? 0 : Math.round((p / t) * 1000) / 10);

export function aggregate(verdicts: VerdictRow[], items: AuditItem[]): Aggregate {
	const gruppoById = new Map<string, AuditGruppo>(items.map((i) => [i.id, i.gruppo]));
	const bump = (m: Record<string, { tot: number; problemi: number; pct: number }>, k: string, prob: boolean) => {
		const e = (m[k] ??= { tot: 0, problemi: 0, pct: 0 });
		e.tot += 1;
		if (prob) e.problemi += 1;
	};
	const perGruppo: Aggregate['perGruppo'] = {};
	const perSource: Aggregate['perSource'] = {};
	const perCiclo: Aggregate['perCiclo'] = {};
	let problemi = 0;
	for (const v of verdicts) {
		const prob = isProblem(v.verdetto);
		if (prob) problemi += 1;
		bump(perGruppo, gruppoById.get(v.id) ?? 'quiz', prob);
		bump(perSource, v.source, prob);
		bump(perCiclo, v.ciclo, prob);
	}
	for (const m of [perGruppo, perSource, perCiclo]) for (const k of Object.keys(m)) m[k]!.pct = pct(m[k]!.problemi, m[k]!.tot);
	return { totali: verdicts.length, problemi, pct: pct(problemi, verdicts.length), perGruppo, perSource, perCiclo };
}

export function renderReport(agg: Aggregate, totItems: number): string {
	const L: string[] = [];
	L.push('# Audit contenuti — report aggregato', '');
	L.push(`Vagliati **${agg.totali}** su ${totItems} item totali (${pct(agg.totali, totItems)}%).`);
	L.push(`Problemi (errore+dubbio): **${agg.problemi}** = **${agg.pct}%** dei vagliati.`, '');
	const tab = (titolo: string, m: Record<string, { tot: number; problemi: number; pct: number }>) => {
		L.push(`## ${titolo}`, '', '| chiave | vagliati | problemi | % |', '|---|--:|--:|--:|');
		for (const [k, e] of Object.entries(m).sort((a, b) => b[1].pct - a[1].pct)) L.push(`| ${k} | ${e.tot} | ${e.problemi} | ${e.pct}% |`);
		L.push('');
	};
	tab('Per gruppo', agg.perGruppo);
	tab('Per source', agg.perSource);
	tab('Per ciclo', agg.perCiclo);
	return L.join('\n');
}
