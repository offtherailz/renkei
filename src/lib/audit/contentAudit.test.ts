// Runner dell'audit contenuti + test di sanità.
//
// Sotto-comandi (env CAUDIT):
//   CAUDIT=batches npx vitest run src/lib/audit/contentAudit.test.ts   # genera i lotti dei non-vagliati
//   CAUDIT=ingest  npx vitest run src/lib/audit/contentAudit.test.ts   # legge le tabelle compilate → verdetti.jsonl
//   CAUDIT=report  npx vitest run src/lib/audit/contentAudit.test.ts   # scrive report.md aggregato
//
// Ciclo: batches → l'insegnante compila le tabelle → ingest → report. I già
// vagliati (per id) restano fuori dai lotti successivi; le % si accumulano.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectAll, hashId } from './collect';
import {
	parseVerdictsJsonl,
	reviewedIds,
	pendingItems,
	parseFilledBatch,
	renderBatch,
	aggregate,
	renderReport,
	type VerdictRow
} from './verdicts';
import type { Grammar, Word } from '../types/models';

const DIR = 'plans/content-audit';
const VERDICTS = path.join(DIR, 'verdetti.jsonl');
const BATCH_SIZE = 50;

function loadSeed(): { words: Word[]; grammar: Grammar[] } {
	const seed = JSON.parse(fs.readFileSync('static/seed-n5n4.json', 'utf8'));
	return { words: seed.words ?? [], grammar: seed.grammar ?? [] };
}
function loadVerdicts(): VerdictRow[] {
	return fs.existsSync(VERDICTS) ? parseVerdictsJsonl(fs.readFileSync(VERDICTS, 'utf8')) : [];
}

const cmd = process.env.CAUDIT;

describe('audit contenuti (runner, solo con CAUDIT=…)', () => {
	(cmd === 'batches' ? it : it.skip)('batches: genera i lotti dei non-vagliati', () => {
		fs.mkdirSync(DIR, { recursive: true });
		const { words, grammar } = loadSeed();
		const all = collectAll(words, grammar);
		const pending = pendingItems(all, reviewedIds(loadVerdicts()));
		const max = Number(process.env.CAUDIT_MAX ?? 10); // lotti per run
		// pulizia lotti vecchi
		for (const f of fs.readdirSync(DIR)) if (/^lotto-\d+\.md$/.test(f)) fs.unlinkSync(path.join(DIR, f));
		let n = 0;
		for (let i = 0; i < pending.length && n < max; i += BATCH_SIZE, n += 1) {
			fs.writeFileSync(path.join(DIR, `lotto-${String(n + 1).padStart(3, '0')}.md`), renderBatch(pending.slice(i, i + BATCH_SIZE), n + 1), 'utf8');
		}
		fs.writeFileSync(
			path.join(DIR, 'INDICE.md'),
			`# Audit contenuti\n\nItem totali: ${all.length} · da vagliare: ${pending.length} · lotti generati: ${n} (di ${BATCH_SIZE}).\nCompila le tabelle nei \`lotto-*.md\`, poi \`CAUDIT=ingest\`.\n`,
			'utf8'
		);
		// n=0 è legittimo quando tutto è già vagliato (copertura completa)
		expect(n).toBeGreaterThanOrEqual(pending.length > 0 ? 1 : 0);
	});

	(cmd === 'dump' ? it : it.skip)('dump: pendenti in forma compatta (per vaglio inline)', () => {
		fs.mkdirSync(DIR, { recursive: true });
		const { words, grammar } = loadSeed();
		const all = collectAll(words, grammar);
		const pending = pendingItems(all, reviewedIds(loadVerdicts()));
		const lines = pending.map((i) =>
			[i.id, i.source, i.domanda ?? '', i.jp.replace(/\n/g, '⏎'), i.corretta ?? '', i.it ?? '', i.perche ?? ''].join('\t')
		);
		fs.writeFileSync(path.join(DIR, 'pending.tsv'), lines.join('\n') + '\n', 'utf8');
		console.log(`dump: ${pending.length} pendenti in pending.tsv`);
		expect(pending.length).toBeGreaterThanOrEqual(0);
	});

	(cmd === 'ingest' ? it : it.skip)('ingest: tabelle compilate → verdetti.jsonl', () => {
		const { words, grammar } = loadSeed();
		const bySource = new Map(collectAll(words, grammar).map((x) => [x.id, x.source]));
		const already = reviewedIds(loadVerdicts());
		const ciclo = new Date().toISOString().slice(0, 16);
		const rows: string[] = [];
		for (const f of fs.readdirSync(DIR)) {
			if (!/^lotto-\d+\.md$/.test(f)) continue;
			for (const v of parseFilledBatch(fs.readFileSync(path.join(DIR, f), 'utf8'))) {
				if (already.has(v.id)) continue;
				already.add(v.id);
				rows.push(JSON.stringify({ id: v.id, source: bySource.get(v.id) ?? '?', verdetto: v.verdetto, problema: v.problema, ciclo }));
			}
		}
		if (rows.length) fs.appendFileSync(VERDICTS, rows.join('\n') + '\n', 'utf8');
		console.log(`ingest: ${rows.length} nuovi verdetti`);
		expect(rows.length).toBeGreaterThanOrEqual(0);
	});

	(cmd === 'report' ? it : it.skip)('report: aggregato in report.md', () => {
		const { words, grammar } = loadSeed();
		const items = collectAll(words, grammar);
		const agg = aggregate(loadVerdicts(), items);
		fs.mkdirSync(DIR, { recursive: true });
		fs.writeFileSync(path.join(DIR, 'report.md'), renderReport(agg, items.length), 'utf8');
		expect(agg.totali).toBeGreaterThanOrEqual(0);
	});
});

describe('audit contenuti (sanità, sempre attivi)', () => {
	it('id stabile e deterministico', () => {
		expect(hashId('s', 'jp', 'c')).toBe(hashId('s', 'jp', 'c'));
		expect(hashId('s', 'jp', 'c')).not.toBe(hashId('s', 'jp2', 'c'));
	});

	it('collectAll produce item con id unici', () => {
		const { words, grammar } = loadSeed();
		const all = collectAll(words, grammar);
		expect(all.length).toBeGreaterThan(100);
		expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
	});

	it('pendingItems esclude i già vagliati; aggregate calcola le %', () => {
		const items = [
			{ id: 'a', gruppo: 'quiz' as const, source: 'x', jp: '1' },
			{ id: 'b', gruppo: 'gioco' as const, source: 'y', jp: '2' },
			{ id: 'c', gruppo: 'gioco' as const, source: 'y', jp: '3' }
		];
		const reviewed = new Set(['a']);
		expect(pendingItems(items, reviewed).map((i) => i.id)).toEqual(['b', 'c']);
		const verdicts: VerdictRow[] = [
			{ id: 'a', source: 'x', verdetto: 'ok', ciclo: 'c1' },
			{ id: 'b', source: 'y', verdetto: 'errore', ciclo: 'c1' }
		];
		const agg = aggregate(verdicts, items);
		expect(agg.totali).toBe(2);
		expect(agg.problemi).toBe(1);
		expect(agg.pct).toBe(50);
		expect(agg.perSource['y']!.pct).toBe(100);
	});

	it('parseFilledBatch legge solo le righe con verdetto valido', () => {
		const md = '| id | verdetto | problema |\n|---|---|---|\n| aaa | ok |  |\n| bbb | errore | manca を |\n| ccc |  |  |\n';
		const rows = parseFilledBatch(md);
		expect(rows.map((r) => r.id)).toEqual(['aaa', 'bbb']);
		expect(rows[1]!.problema).toBe('manca を');
	});
});
