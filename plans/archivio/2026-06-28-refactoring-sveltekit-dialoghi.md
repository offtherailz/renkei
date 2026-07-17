# Piano: Renkei — Refactoring e Espansione

## Context

L'app è già in TypeScript con Vite/Dexie e un'architettura dati solida (SRS, quiz engine, course import). Il problema principale è che **3100 righe di DOM imperativo in `main.ts`** rendono tutto difficile da mantenere e da estendere. L'utente vuole:

1. Manutenibilità e percorso verso una mobile app
2. Nuovi tipi di contenuto: dialoghi con frasi linkate al vocabolario
3. Navigazione tra concetti collegati (parola → kanji usati → grammatica che la usa → dialoghi)
4. Condivisione dei contenuti custom tra dispositivi **senza backend**

---

## Fase 1 — Migrazione a SvelteKit

### Perché SvelteKit
- TypeScript first-class, stessa filosofia del progetto attuale
- `$state` e `$derived` rimpiazzano le variabili globali di `main.ts` con un sistema reattivo
- Routing basato su file system (semplice, nessun boilerplate)
- PWA nativa via `@sveltejs/adapter-static` + Vite plugin
- Capacitor funziona direttamente su build SvelteKit per iOS/Android

### Cosa si conserva intatto
- `src/db/schema.ts` — Dexie schema, zero modifiche
- `src/core/*` — SRS, furigana, tokenizer, TTS, i18n
- `src/quiz/*` — engine, types, distractorIndex
- `src/types/models.ts` — tutti i modelli TypeScript
- `public/seed-n5n4.json` — dati seed N5/N4

### Struttura SvelteKit proposta
```
src/
├── lib/
│   ├── db/         ← schema.ts, import.ts, course-import.ts (invariati)
│   ├── core/       ← srs.ts, furigana.ts, tts.ts, tokenizer.ts, i18n.ts (invariati)
│   ├── quiz/       ← engine.ts, types.ts, distractorIndex.ts (invariati)
│   ├── types/      ← models.ts (invariato)
│   └── components/
│       ├── FuriganaText.svelte   ← parser furigana → <ruby>
│       ├── SrsCard.svelte        ← card vocabolo con badge JLPT e progresso
│       ├── QuizCard.svelte       ← contenitore quiz (delegato ai mode-components)
│       ├── DetailPanel.svelte    ← vista dettaglio parola/kanji/grammatica
│       ├── DialogueViewer.svelte ← visualizzatore dialogo con tap su parole
│       └── ObjectiveTree.svelte  ← albero obiettivi con progress bar
├── routes/
│   ├── +layout.svelte    ← nav bottom, app shell, init DB
│   ├── +page.svelte      ← home / dashboard
│   ├── quiz/+page.svelte ← sessione quiz
│   ├── detail/[id]/+page.svelte ← dettaglio item (word/kanji/grammar/dialogue)
│   ├── courses/+page.svelte     ← gestione corsi importati
│   ├── stats/+page.svelte       ← statistiche
│   └── settings/+page.svelte   ← impostazioni
└── app.css  ← invariato, adattato per Svelte scoped styles
```

### Store globali Svelte (rimpiazzano variabili globali main.ts)
```typescript
// src/lib/stores.ts
export const sessionState = $state<SessionState | null>(null);
export const activeQuiz = $state<QuizQuestion | null>(null);
export const currentUser = $state<UserProfile | null>(null);
```

---

## Fase 2 — Nuovo tipo di contenuto: Dialogo

### Nuovo modello `Dialogue` (aggiunta a `models.ts`)
```typescript
interface DialogueLine {
  personaggio: string;
  testo: string;               // notazione furigana: 漢字[よみ]
  traduzione: LocalizedText;
  parole_linkate: string[];    // IDs di Word
}

interface Dialogue {
  id: string;                  // es. "genki-l18-gram-dl-01"
  titolo: LocalizedText;
  corso_id?: string;
  livello_jlpt?: JLPTLevel;
  contesto?: LocalizedText;    // breve descrizione situazione
  righe: DialogueLine[];
  parole_linkate: string[];    // aggregato da tutte le righe
  grammatica_linkata: string[];
}
```

### Aggiunta a Dexie schema (version 7)
```typescript
this.dialogues = this.table('dialogues');
// schema: 'id, corso_id, livello_jlpt, *parole_linkate, *grammatica_linkata'
```

### Estensione formato corso (.renkei-course.json)
Nuovo campo opzionale `dialoghi_nuovi`:
```json
{
  "dialoghi_nuovi": [
    {
      "id": "genki-l18-p4-dl-01",
      "titolo": { "it": "Al ristorante", "en": "At the restaurant" },
      "livello_jlpt": "N4",
      "righe": [
        {
          "personaggio": "田中",
          "testo": "窓[まど]を開[あ]けてもいいですか。",
          "traduzione": { "it": "Posso aprire la finestra?" },
          "parole_linkate": ["genki-l18-p4-開ける"]
        }
      ],
      "grammatica_linkata": ["genki-l18-p4-gram-te-mo-ii"]
    }
  ]
}
```

### UI: `DialogueViewer.svelte`
- Ogni riga mostra personaggio + testo con furigana renderizzata
- Tap su una parola → popup con significato + link al detail panel
- Badge JLPT sulla card del dialogo
- SRS: review dialogo come item (mostra dialogo, traduci singola riga scelta casualmente)

---

## Fase 3 — Navigazione tra concetti

### Auto-link parola → kanji
Al momento il campo `kanji_usati` è manuale. Aggiungere in `course-import.ts` (e in `import.ts` per il seed) un passo di auto-derivazione:
```typescript
function extractKanji(scrittura: string): string[] {
  return [...scrittura].filter(ch => /[一-鿿]/.test(ch));
}
// Eseguito al momento dell'import, popola kanji_usati automaticamente
```

### Vista dettaglio arricchita (`DetailPanel.svelte`)
Ogni item mostra sezioni collegate:

**Parola** → kanji usati (cliccabili) → altre parole con stesso kanji → grammatica che usa questa parola → dialoghi che la contengono

**Kanji** → tutte le parole che lo usano (da index `*kanji_usati`) → significato + letture

**Grammatica** → frasi esempio + dialoghi che la esemplificano → parole linkate

**Dialogo** → tutte le parole presenti (cliccabili) → grammatica usata

### "Cluster tematico" (opzionale, step successivo)
Tag tematici sulle parole (`tag: string[]`) + vista filtrata per tag. Es.: "trasporti", "cibo", "casa".

---

## Fase 4 — Condivisione senza backend

### Approccio: URL-based import + file export
1. **Import da URL** — l'utente incolla un URL di un file JSON pubblico (GitHub raw, gist, qualsiasi HTTPS). L'app fa `fetch(url)` e importa. Ideale per corsi condivisi su GitHub.
   ```
   Flusso: Docente crea repo GitHub con corso.renkei-course.json
   → Studente copia raw URL → incolla nell'app → importa
   ```

2. **Export bundle** — nuovo menu "Esporta" che serializza tutti i dati custom (course datasets + lessons + custom words + kanji + grammatica + dialoghi) in un file `.renkei-bundle.json`. Altri dispositivi importano il bundle.

3. **Sync progress** — esportare/importare `srs_progress` separatamente (file `renkei-progress.json`), così lo studente può spostare il proprio stato SRS su un nuovo dispositivo.

### File critici da toccare
- [src/db/course-import.ts](src/db/course-import.ts) — aggiungere `dialoghi_nuovi`, auto-link kanji
- [src/db/schema.ts](src/db/schema.ts) — version 7 con tabella `dialogues`
- [src/types/models.ts](src/types/models.ts) — `Dialogue`, `DialogueLine`
- [COURSE_FORMAT.md](COURSE_FORMAT.md) — documentare nuovo campo `dialoghi_nuovi`
- **Nuovo**: `src/lib/db/export.ts` — bundle export/import
- **Nuovo**: `src/lib/db/url-import.ts` — fetch + import da URL

---

## Ordine di esecuzione suggerito

| Step | Cosa | Impatto |
|------|------|---------|
| 1 | Setup SvelteKit, porta db/core/quiz/types invariati | Fondamenta |
| 2 | `+layout.svelte` + routing + init DB | App funzionante vuota |
| 3 | `DetailPanel.svelte` + `FuriganaText.svelte` | Browse contenuti |
| 4 | `QuizCard.svelte` + sessione quiz | Feature core |
| 5 | Schema v7 + modello Dialogue | Nuovo tipo contenuto |
| 6 | `DialogueViewer.svelte` + import corso | Dialoghi in-app |
| 7 | Auto-link kanji + navigazione concetti | Grafo contenuti |
| 8 | Export bundle + import da URL | Condivisione |

---

## Verifica

- `npm run dev` — app carica senza errori
- Importa `AccademiaGiapponeseA2P4.renkei-course.json` esistente → zero regressioni
- Crea un dialogo test nel corso → appare in DetailPanel della parola linkata
- Export bundle → importa su secondo browser/profilo → dati identici
- Build: `npm run build` → bundle size simile o minore all'attuale
