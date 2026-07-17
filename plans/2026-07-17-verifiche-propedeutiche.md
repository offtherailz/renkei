# Verifiche da fare sul lavoro del 17/07 (staging)

Lavoro consegnato su staging (`/renkei/staging/`, gh-pages 46f3569): 63 item curati consumati
(quiz specials, consolida parola, gioco /keigo, drill gram:*), fix frase-lista ば (seed v58),
keigo esclusi dalla coniugazione a secco. Test manuali che non ho potuto fare da questa
macchina (niente browser automatizzabile) + questioni aperte.

## Test funzionali (5-10 min)

1. **Consolida parola 自/他** — `/consolida/開ける` (o 閉める, 落とす…): in coda deve
   apparire una frasa curata «completa la frase» con spiegazione dopo la risposta.
   Domanda: la posizione in coda va bene o meglio mescolata?
2. **Quiz specials** — fare qualche quiz con carte tipo 食べる/開ける/来る attive: ogni tanto
   (bucket ~40%) deve uscire una frase curata al posto della domanda normale.
   Domanda: la frequenza percepita è giusta o dominano sulle altre specials?
3. **Gioco /keigo** — una partita intera: ~3 round su 10 sono «Completa: dal contesto capisci
   chi parla a chi» (frasi 社長は…/わたしは…). Dopo la risposta: frase intera cliccabile,
   traduzione, 💡 perché, TTS della frase intera. Mic: prova a dire la frase intera.
   Domanda: il mix 3 situazioni + 2 richieste + 3 completamenti + 2 verbi va bene?
4. **Drill costruzioni nuove** — `/consolida/gram:tsumori` e `/consolida/gram:hou-ga-ii`:
   prima non esistevano (nessun formKey), ora devono dare 1 domanda curata ciascuno.
   Domanda: drill da 1 sola domanda ha senso o va nascosto il link finché non ci sono ≥3?
   (Le altre: ta-koto-ga-aru, tai, nagara, nakereba, te-iru, kanou, sugiru.)
5. **Drill gram esistenti** — `/consolida/gram:tai` (o te-iru, kanou): la frase curata deve
   stare PRIMA delle coniugazioni generate, totale ≤6 domande.
6. **Keigo non più coniugato** — quiz/consolida con いただく/参る/召し上がる: non devono più
   uscire domande «passato di いただく?». Verificare che il gioco /keigo li usi ancora.
7. **Seed v58** — su un dispositivo già usato: le Impostazioni devono mostrare la revisione
   `2026-07-17-fix-frase-ba-v58` dopo il refresh; la voce grammar 条件形 (N4) non deve più
   avere la frase «飲めば、食べれば、すれば、来れば。» ma «この ボタンを 押せば…».

## Questioni aperte (da decidere, non bloccanti)

- **Doppio binario 自/他**: ora sulla stessa parola esistono sia `transitivity-pair` (generata)
  sia la curata. Tenerle entrambe o preferire la curata quando esiste?
- **Crediting classe**: le curate rispondono come `usage-cloze` sulla parola → alimenta
  `facet_use` della parola, NON `conj:*`/`gram:*` dal quiz. Va bene così (il gram:* si
  allena nel suo drill) o le forma-contesto dal quiz dovrebbero accreditare anche gram:*?
- **Item ください (item 23)**: corretta «ください» = scrittura della carta くださる in forma
  ます — nel quiz la scelta «ください» potrebbe confondersi con il ください richiesta.
  L'insegnante l'ha costruita bene (contesto 部長が 私に), ma da riguardare in uso.
- **止める::とめる**: l'id con `::` funziona nei link `/consolida/止める::とめる`? Testare
  la scheda e il drill dalla riga del vocabolario (encoding URL).

## Collaudo insegnante virtuale (segnato per dopo)

Agente-insegnante madrelingua che vaglia SOLO domande/contenuti/relazioni (niente UI):
- campiona domande generate (audit `AUDIT=1 npx vitest run src/lib/quiz/questionAudit.test.ts`
  → plans/question-audit-sample.md, già pronto);
- vaglia relazioni (sinonimi/contrari/自他/keigo/correlati quando ci saranno);
- output: report di note/correzioni da applicare (formato dei report di curatela esistenti).
Token-frugale: usare il file di audit come input, non l'app.
