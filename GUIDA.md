# Guida all'uso — Renkei

Renkei è un trainer JLPT touch-first che usa il metodo **Active Recall + SRS** (Spaced Repetition System) per aiutarti a memorizzare parole, kanji e forme grammaticali in modo duraturo.

---

## Come iniziare

1. Apri l'app — il catalogo (N5 + N4) viene caricato automaticamente.
2. Nella **Home** trovi gli obiettivi di studio raggruppati per livello.
3. Attiva/disattiva ogni gruppo con il toggle **In studio / Pausa**.
4. Premi **Studia ora** per avviare una sessione.

> Puoi anche usare **Focus N5** o **Focus N4** per attivare solo un livello con un tocco.

---

## La sessione di studio

Una sessione ha una durata predefinita (default: **5 minuti**, modificabile nelle Impostazioni).

- Il **countdown** appare nella barra in alto durante il quiz.
- Alla scadenza del tempo viene mostrata la **schermata riepilogo** automaticamente.
- Puoi terminare prima con il pulsante **Termina sessione**.

### Tipi di domanda

| Domanda | Cosa devi fare |
|---|---|
| **Produci** | Vedi la parola giapponese e dici mentalmente significato e lettura — poi valuti da solo se hai ricordato |
| **Riconoscimento** | Vedi il significato italiano → scegli la parola giapponese giusta tra 4 opzioni |
| **Pronuncia → Scrittura** | Vedi la lettura (hiragana/katakana) → scegli la scrittura kanji corretta tra 4 opzioni |
| **Scelta multipla** | Vedi la parola giapponese → scegli il significato corretto tra 4 opzioni |
| **Riordina la frase** | Ricomponi i token di una frase d'esempio della grammatica nel giusto ordine |
| **Completa la frase** | Una parola della frase è oscurata → scegli quella corretta tra 4 opzioni |
| **Come si legge?** | Un kanji nella frase è evidenziato → scegli la lettura corretta |

> Le domande cambiano in base al tuo livello SRS per ogni parola: all'inizio prevale il riconoscimento, poi si aggiunge la produzione man mano che consolidi.

### Rispondere

- Tocca la risposta che ritieni corretta.
- Il tasto **Non la so** conta come risposta sbagliata e anticipa il prossimo ripasso.
- Dopo la risposta puoi toccare **Approfondisci** per aprire il dettaglio della parola/kanji/grammatica.

---

## Il riepilogo sessione

Alla fine di ogni sessione vedi:

- Tempo impiegato e numero di risposte
- Quante corrette, sbagliate, scadute
- Lista delle **risposte errate** con la risposta che hai dato e quella corretta
- Tocca una voce della lista errori per aprire il dettaglio e studiare la parola

---

## Come funziona la memorizzazione (SRS)

Ogni parola, kanji o forma grammaticale ha uno **stage SRS** da 0 a 7:

| Stage | Significato | Prossimo ripasso |
|---|---|---|
| 0 | Mai studiato | Subito |
| 1–2 | Inizio | Minuti / ore |
| 3–4 | In progress | Ore / 1 giorno |
| 5–6 | Consolidato | Giorni |
| 7 | Masterizzato | ~1 mese |

- **Risposta corretta** → stage sale, prossimo ripasso si allontana.
- **Risposta sbagliata** → stage scende, ripasso anticipato.

Il sistema propone automaticamente per prime le parole con **ripasso scaduto**, poi quelle mai viste, infine quelle in fase avanzata.

---

## Il pannello dettaglio

Tocca **Approfondisci** dopo una risposta oppure tocca direttamente una parola/kanji/grammatica nella Home per aprire il dettaglio.

### Cosa trovi nel dettaglio di una parola

- **Lettura e scrittura** con furigana
- **Badge grammaticali**: tipo di parola, classe del verbo (godan/ichidan), transitività, tipo di aggettivo
- **Significato** principale
- **Sezione Memoria**: due barre di avanzamento — Consolidamento (%) e SRS stage
- **Letture alternative**: letture diverse per la stessa scrittura (mostrata solo se esistono)
- **Pitch accent**: pronuncia intonata (mostrata solo se disponibile)
- **Kanji usati**: tocca un kanji per aprirne il dettaglio
- **Relazioni semantiche**: Significati simili, Contrari, Omofoni
- **Note personali**: campo di testo per appunti tuoi
- Link a **Jisho** e **Tatoeba** per approfondimenti esterni

### Cosa trovi nel dettaglio di un kanji

- Letture **on'yomi** e **kun'yomi**
- Parole del vocabolario che usano quel kanji (filtrabile per livello)
- Link a Jisho e Kanji Koohii

### Cosa trovi nel dettaglio di una forma grammaticale

- Spiegazione in italiano
- Frasi d'esempio cliccabili parola per parola
- Tocca ogni parola della frase per aprire il glossario contestuale

---

## Impostazioni

Raggiungi le Impostazioni dal menu (≡) in alto a destra.

| Impostazione | Descrizione |
|---|---|
| **Auto-avanza dopo (sec)** | Secondi di attesa prima di passare automaticamente alla prossima domanda dopo una risposta corretta |
| **Tempo massimo risposta (sec)** | Scaduto questo tempo, la risposta viene contata come errata |
| **Durata sessione (min)** | Minuti totali per ogni sessione di studio |
| **Timer in dettaglio** | Se attivo, il countdown continua anche mentre sei nel pannello dettaglio |
| **Obiettivo JLPT** | Livello di riferimento per le statistiche giornaliere |
| **Revisioni giornaliere** | Obiettivo giornaliero di ripasso (SRS) |
| **Nuove parole al giorno** | Obiettivo di parole nuove da studiare ogni giorno |
| **Grammatica al giorno** | Obiettivo di forme grammaticali al giorno |

---

## Aggiornare il catalogo

Se rilasciamo aggiornamenti ai dati (nuove parole, correzioni, metadati):

1. Vai in Impostazioni
2. Tocca **Aggiorna catalogo**
3. L'aggiornamento importa solo i dati nuovi — **i tuoi progressi SRS non vengono toccati**

---

## Usare l'app offline

Renkei funziona completamente offline dopo il primo caricamento. Tutti i dati sono salvati sul dispositivo. La connessione serve solo per aggiornare il catalogo o aprire i link esterni (Jisho, Tatoeba).

---

## Domande frequenti

**Le mie statistiche si perdono se aggiorno l'app?**
No. I progressi SRS, le note personali e le impostazioni sono salvati nel browser (IndexedDB) e sopravvivono agli aggiornamenti dell'app.

**Perché alcune parole vengono chieste più spesso?**
L'SRS anticipa il ripasso delle parole che hai sbagliato di recente. È normale all'inizio che le stesse voci tornino spesso.

**Posso studiare solo la grammatica?**
Al momento non esiste un filtro per tipo di contenuto: il sistema propone parole, kanji e grammatica in base agli obiettivi attivati. Puoi mettere in pausa gli obiettivi che non vuoi studiare.

**Cosa significa il badge viola/verde/rosa sulle parole?**
Indicano informazioni grammaticali extra: classe del verbo (五段/一段/不規則), transitività (自動詞/他動詞), tipo di aggettivo (い/な). Hovering o tap sul badge mostra la spiegazione.
