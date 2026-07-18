# Simulatore di studio — report

> Generato da `SIM=1 npx vitest run src/lib/core/studySim.report.test.ts`.
> Modello del cuore SRS (ignora giochi/avventure/consolida, giorni saltati).

Assunzioni: ~7s a domanda; la sessione del giorno smaltisce tutto il dovuto.
«Padroneggiato» = padronanza ≥ 60% (70% stage + 30% mastery). «Debole» = <60% e già sbagliata.

| Scenario | Catalogo | Nuove/g | Precisione | 1 volta/g | Giorni al 80% | Min/g medi | Min/g picco | Ripassi/g sett.1/4/12 | Backlog max | Deboli sett.1/4/12 |
|---|--:|--:|--:|:--:|--:|--:|--:|:--:|--:|:--:|
| Casual N5 | 887 | 5 | 85% | sì | 147 | 6 | 9 | 20/34/43 | 16 | 11/8/10 |
| Normale N5 | 887 | 10 | 85% | sì | 76 | 6 | 18 | 37/69/96 | 29 | 12/15/23 |
| Intenso N5 | 887 | 20 | 85% | sì | 41 | 7 | 23 | 74/139/29 | 55 | 38/32/0 |
| Normale N5 (churn, 1/g OFF) | 887 | 10 | 85% | no | 74 | 6 | 14 | 45/71/94 | 1 | 11/13/14 |
| Normale N5 precisione 75% | 887 | 10 | 75% | sì | 77 | 9 | 26 | 45/89/127 | 35 | 29/30/43 |
| Normale N5 precisione 95% | 887 | 10 | 95% | sì | 76 | 5 | 15 | 34/59/74 | 25 | 7/5/2 |
| Intenso N5+N4 | 1893 | 20 | 85% | sì | 81 | 9 | 35 | 74/139/190 | 56 | 38/32/35 |
