# Audit contenuti (per l'insegnante)

Vaglio linguistico a lotti del contenuto dati (frasi parole/grammatica, parafrasi,
propedeutiche, comparazioni, coppie, choukai, frasi utili). I verdetti si accumulano
fra i cicli (per `id` stabile): non si rivede ciò che è già vagliato.

## Ciclo
1. `CAUDIT=batches [CAUDIT_MAX=10] npx vitest run src/lib/audit/contentAudit.test.ts`
   → genera `lotto-*.md` dei non-ancora-vagliati (50 per lotto).
2. L'insegnante compila la tabella «Verdetti» in fondo a ogni lotto:
   `| id | verdetto (ok/errore/dubbio) | problema |`.
3. `CAUDIT=ingest npx vitest run src/lib/audit/contentAudit.test.ts`
   → i verdetti finiscono in `verdetti.jsonl` (versionato).
4. `CAUDIT=report npx vitest run src/lib/audit/contentAudit.test.ts`
   → `report.md` con % problemi per gruppo/source/ciclo.

`verdetti.jsonl` è l'unico file versionato (lo stato accumulato). Lotti/indice/report
sono transitori (in `.gitignore`).

Avventure: fuori per ora (copioni inline nelle route → serve estrarli, refactor).
