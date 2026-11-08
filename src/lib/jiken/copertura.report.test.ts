// 事件 — copertura del vocabolario: quali parole N5/N4 compaiono nei testi del
// gioco, missione per missione, con la stessa divisione in parole del
// dizionario dell'app (segmentaGruppo + lookupToken). Scrive
// docs/giallo-copertura.md. Si lancia a mano: npm run jiken:copertura
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWordIndex, lookupToken, segmentaGruppo, type WordHit, type WordRow } from '$lib/core/wordLookup';
import { LUOGHI, OGGETTI, PERSONAGGI } from './mondo';
import { M1 } from './missioni/m1';
import { M2 } from './missioni/m2';
import { M3 } from './missioni/m3';
import { M4 } from './missioni/m4';
import { UI } from './ui';
import { PREMI, paroleGioco } from './giochi';
import type { Passo, Testo } from './tipi';

const MISSIONI = [M1, M2, M3, M4];

function testiPassi(ps: Passo[], out: string[]): void {
	for (const p of ps) {
		if ('dice' in p) out.push(p.ja);
		else if ('narra' in p) out.push(p.narra);
		else if ('nota' in p) out.push(p.nota);
		else if ('io' in p) out.push(p.io);
		else if ('pensa' in p) out.push(p.pensa);
		else if ('obiettivo' in p) out.push(p.ja);
		else if ('scelta' in p) p.scelta.forEach((o) => { out.push(o.ja); testiPassi(o.passi ?? [], out); });
		else if ('se' in p) { testiPassi(p.allora, out); testiPassi(p.altrimenti ?? [], out); }
		else if ('domanda' in p) { out.push(p.domanda.ja); p.domanda.opzioni.forEach((o) => out.push(o.ja)); }
		else if ('prova' in p) { out.push(p.prova.ja); testiPassi(p.prova.ok, out); testiPassi(p.prova.no, out); }
	}
}

// fonti, nell'ordine in cui il giocatore le incontra
function fonti(): { nome: string; testi: string[] }[] {
	const mondo: string[] = [];
	for (const l of LUOGHI) { mondo.push(l.nome); if (l.perche) mondo.push(l.perche.ja); testiPassi(l.ambiente ?? [], mondo); }
	for (const v of Object.values(UI)) for (const t of [v].flat() as Testo[]) mondo.push(t.ja);
	for (const c of Object.values(PERSONAGGI)) mondo.push(c.nome);
	for (const o of Object.values(OGGETTI)) mondo.push(o.ja);
	for (const o of Object.values(PREMI)) mondo.push(o.ja);
	return [
		{ nome: 'mondo e interfaccia', testi: mondo },
		...MISSIONI.map((m) => {
			const t: string[] = [m.titolo];
			if (m.epilogo) t.push(m.epilogo.ja);
			for (const sc of m.scene) testiPassi(sc.passi, t);
			return { nome: `${m.id} ${m.titolo}`, testi: t };
		})
	];
}

interface Analisi {
	parole: Map<string, { hit: WordHit; volte: number }>;
	forme: Map<string, number>;
	ignoti: Map<string, number>;
	sopra: Map<string, string>; // token coi kanji che sono parole N3/EXTRA
}
// code grammaticali in hiragana che il dizionario non ha come parole
const CODE = /^(です|でした|でしょう|ん|だけ|まで|ます|ませ|でも|ましょ)/;
// map: solo N5/N4 (così un token in kana non finisce su una parola N3 omofona);
// tutto: il vocabolario intero, per riconoscere le parole sopra il livello
function analizza(testi: string[], map: Map<string, WordHit>, tutto: Map<string, WordHit>): Analisi {
	const a: Analisi = { parole: new Map(), forme: new Map(), ignoti: new Map(), sopra: new Map() };
	for (const t of testi) {
		// via il furigana (漢字[かな] → 漢字) e i segnaposto ({nome})
		const pulito = t.replace(/\[[^\]]*\]/g, '').replace(/\{[a-z]+\}/g, '');
		for (const g of pulito.split(/[ 　]+/).filter(Boolean)) {
			const tokens = segmentaGruppo(g, map);
			tokens.forEach((tok, i) => {
				if (!/[ぁ-んァ-ヶ一-龯々]/.test(tok)) return;
				let hit = lookupToken(map, tok, tokens[i - 1]);
				// il ripiego «sottostringa coi kanji» trova un kanji solo dentro un nome
				// (吉田 → 田): conta solo se la parola copre tutti i kanji del token
				if (hit && /[一-龯々]/.test(tok) && !hit.forma && [...tok].filter((c) => /[一-龯々]/.test(c)).some((c) => !hit!.scrittura.includes(c))) hit = null;
				if (!hit) {
					const su = /[一-龯々]/.test(tok) ? tutto.get(tok) : undefined;
					if (su && su.livello_jlpt !== 'N5' && su.livello_jlpt !== 'N4') a.sopra.set(tok, su.livello_jlpt);
					else if (/[一-龯々]|^[ァ-ヶー]{2,}$|^[ぁ-ん]{4,}$/.test(tok) && !CODE.test(tok) && !/\d/.test(tok)) a.ignoti.set(tok, (a.ignoti.get(tok) ?? 0) + 1);
					return;
				}
				const x = a.parole.get(hit.id) ?? { hit, volte: 0 };
				x.volte += 1;
				a.parole.set(hit.id, x);
				if (hit.forma) a.forme.set(hit.forma, (a.forme.get(hit.forma) ?? 0) + 1);
			});
		}
	}
	return a;
}

const GRUPPI: [string, (w: WordRow) => boolean][] = [
	['verbi', (w) => w.tipo_jp.startsWith('動詞')],
	['aggettivi', (w) => w.tipo_jp.startsWith('形容詞') || w.tipo_jp.startsWith('形容動詞')],
	['nomi', (w) => w.tipo_jp.startsWith('名詞')],
	['avverbi', (w) => w.tipo_jp.startsWith('副詞')],
	['altro', () => true]
];
const gruppo = (w: WordRow): string => GRUPPI.find(([, f]) => f(w))![0];

it.skipIf(!process.env.COPERTURA)('copertura del vocabolario', () => {
	const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')).words as WordRow[];
	const map = buildWordIndex(seed.filter((w) => w.livello_jlpt === 'N5' || w.livello_jlpt === 'N4'));
	const tutto = buildWordIndex(seed);
	const livello = (lv: string): WordRow[] => seed.filter((w) => w.livello_jlpt === lv);
	const N5 = livello('N5');
	const N4 = livello('N4');
	const viste = new Set<string>();
	const righe: string[] = [];
	const capitoli: string[] = [];
	const fuoriLivello = new Map<string, string>();
	const tutteForme = new Map<string, number>();
	const tuttiIgnoti = new Map<string, number>();

	for (const f of fonti()) {
		const a = analizza(f.testi, map, tutto);
		const ids = [...a.parole.values()];
		const n5 = ids.filter((x) => x.hit.livello_jlpt === 'N5');
		const n4 = ids.filter((x) => x.hit.livello_jlpt === 'N4');
		const n4nuove = n4.filter((x) => !viste.has(x.hit.id));
		const n5nuove = n5.filter((x) => !viste.has(x.hit.id));
		for (const [k, lv] of a.sopra) if (!fuoriLivello.has(k)) fuoriLivello.set(k, `${lv}, ${f.nome}`);
		for (const [k, v] of a.forme) tutteForme.set(k, (tutteForme.get(k) ?? 0) + v);
		for (const [k, v] of a.ignoti) tuttiIgnoti.set(k, (tuttiIgnoti.get(k) ?? 0) + v);
		ids.forEach((x) => viste.add(x.hit.id));
		righe.push(`| ${f.nome} | ${f.testi.length} | ${n5.length} (+${n5nuove.length}) | ${n4.length} (+${n4nuove.length}) | ${a.forme.size} |`);
		capitoli.push(`### ${f.nome}\n\nN4 nuove (${n4nuove.length}): ${n4nuove.map((x) => x.hit.scrittura).join('、') || '—'}\n`);
	}

	const coperte = (ws: WordRow[]): WordRow[] => ws.filter((w) => viste.has(w.id));
	const mancanti = (ws: WordRow[]): string =>
		GRUPPI.map(([g]) => {
			const m = ws.filter((w) => !viste.has(w.id) && gruppo(w) === g);
			return m.length ? `- **${g}** (${m.length}): ${m.map((w) => (w.scrittura === w.lettura ? w.scrittura : `${w.scrittura}（${w.lettura}）`)).join('、')}` : '';
		}).filter(Boolean).join('\n');
	const pct = (a: number, b: number): string => `${Math.round((a / b) * 100)}%`;
	const giochi = paroleGioco(seed);

	const md = `# 事件 — copertura del vocabolario

Generato da \`npm run jiken:copertura\` (src/lib/jiken/copertura.report.test.ts) il ${new Date().toISOString().slice(0, 10)}.
Divisione in parole e de-coniugazione: le stesse del dizionario dell'app
(\`segmentaGruppo\` + \`lookupToken\`), sul vocabolario di \`static/seed-n5n4.json\`.
Non è perfetta: qualche parola corta può essere riconosciuta dentro un'altra, e
le parole che il dizionario non conosce restano fuori (vedi «non riconosciuti»).

## Totale

- **N5**: ${coperte(N5).length} / ${N5.length} (${pct(coperte(N5).length, N5.length)})
- **N4**: ${coperte(N4).length} / ${N4.length} (${pct(coperte(N4).length, N4.length)})
- Sala giochi: in più, UFOキャッチャー e クイズ pescano a caso tra ${giochi.length} nomi N5/N4
  (non contati qui).

## Per capitolo

Parole diverse trovate; tra parentesi quelle che compaiono per la prima volta.

| fonte | testi | N5 | N4 | forme coniugate |
|---|---|---|---|---|
${righe.join('\n')}

${capitoli.join('\n')}
## Forme coniugate riconosciute

${[...tutteForme].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join('、') || '—'}

## Parole sopra il livello (N3/EXTRA) usate nei testi

Parole intere del vocabolario N3/EXTRA: vanno bene solo se servono davvero
(coi kanji N5/N4 o col furigana).

${[...fuoriLivello].map(([k, v]) => `- ${k} — ${v}`).join('\n') || '—'}

## Non riconosciuti dal dizionario

Nomi propri, parole fuori dal vocabolario o divisioni sbagliate (i più frequenti).

${[...tuttiIgnoti].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, v]) => `${k} (${v})`).join('、') || '—'}

## N4 mancanti (${N4.length - coperte(N4).length})

${mancanti(N4)}

## N5 mancanti (${N5.length - coperte(N5).length})

${mancanti(N5)}
`;
	writeFileSync('docs/giallo-copertura.md', md);
	console.log(`N5 ${coperte(N5).length}/${N5.length} · N4 ${coperte(N4).length}/${N4.length}\n${righe.join('\n')}`);
});
