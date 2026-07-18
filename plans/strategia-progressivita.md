# Strategia — Renkei progressivo per chi comincia, pieno per chi è esperto

Documento di strategia (non piano operativo di un singolo item): come far crescere
la superficie dell'app col learner, senza biforcare l'app né toccare il motore di
studio. Il rollout è a strati adottabili in sequenza.

## Context

Renkei è denso di funzioni (quiz SRS, consolida, punti deboli, sfaccettature
Nation, molti giochi e beta, avventure col microfono, cataloghi, forme/particelle).
Ottimo per chi è già avanti (ripassa, approfondisce, incrementa), ma **spaesante per
chi inizia**: troppa scelta subito. L'onboarding chiede già «Ho basi / Sono
all'inizio», ma dopo la UI è identica per tutti. Obiettivo: superficie che **cresce
col learner** — principiante guidato e ridotto, esperto con tutto in mano.

## Principio guida: progressive disclosure

Una sola app, stessa base dati e stesso SRS. Cambia solo **cosa è in vista**:
- **Esperto** → tutto sempre visibile (comportamento attuale).
- **Principiante** → nucleo essenziale visibile; il resto **🔒 con teaser** («si
  sblocca quando…») che si apre man mano che avanzi.

Il gating è **solo di visibilità/ingresso ai giochi**, mai dei dati o dello
scheduling: le carte/forme avanzate restano nel motore, si nasconde solo la porta.

## Segnali già disponibili (da riusare, niente nuovo tracking)

- `UserProfile`: `xp_totali`, `livello`, `streak_giorni`, `badge_sbloccati`
  (`src/lib/types/models.ts`).
- `srs_progress`: stage per carta + sfaccettature (facet_*), `lapses`.
- `countDueCards`/`getActiveItemKeys` (`src/lib/db/queries.ts`), `computeStreak`
  (`src/lib/core/celebration.ts`), `settings.forme_note` (forme conosciute).
- Onboarding a step (`src/routes/+page.svelte`) e toggle in Impostazioni
  (`src/routes/settings/+page.svelte`).

## Strategie (a strati, adottabili in sequenza)

- **S1 — Profilo esperienza** `principiante | esperto`. Impostato dall'onboarding
  (mappa la scelta esistente: «Sono all'inizio»→principiante, «Ho basi»→esperto) e
  cambiabile in Impostazioni. In principiante la home mostra meno sezioni.
- **S2 — Sblocchi graduali** (motore di feature-gating). Giochi/attività si aprono
  al raggiungimento di soglie di progresso; finché sono chiusi, **🔒 + teaser**.
- **S3 — «Prossimo passo» guidato**. Una card in home che suggerisce **l'unica**
  azione migliore ora (nuove / ripassi / un gioco mirato / un'avventura), lasciando
  i menù come «Esplora tutto». Utile soprattutto in principiante.
- **S4 — Percorso a tappe**. Estende il «guidato» (oggi solo Genki) a un percorso
  N5 nativo con checkpoint che sbloccano attività.

**Raccomandazione**: nucleo = **S1 + S2** (dà subito ordine e motivazione). S3 dopo,
quando S2 è tarato. S4 opzionale/di lungo periodo.

## Dettaglio tecnico — la spina di feature-gating

Un unico primitivo riusabile, così tutte le strategie ci si innestano senza
riscrivere le schermate:

1. **Setting** `esperienza: 'principiante' | 'esperto'` in `AppSettings`
   (default dall'onboarding; esistenti → `esperto`, nessuna regressione).
2. **`learnerStats()`** (nuovo, `src/lib/core/learner.ts`): calcola una volta i
   segnali → `{ livello, streak, carteStage2PerLivello, formeNote, haDeboli,
   frasiFatte }`. Riusa `srs_progress` + `settings.forme_note` + profilo.
3. **Registry** `src/lib/core/features.ts`: tabella dichiarativa
   `{ id, label, group, unlock: (ctx) => boolean, teaser: string }` — le **soglie
   vivono qui (dati)**, una sola fonte da tarare. `ctx = { settings, stats }`.
4. **`featureState(id, ctx): 'shown' | 'locked' | 'hidden'`** (puro, testabile):
   `esperto` → sempre `shown`; `principiante` → `shown` se `unlock`, altrimenti
   `locked` (con teaser) o `hidden` per il puro rumore.
5. **Consumatori**: le sezioni della home (🧠 Studia / 🎮 Attività / 📖 Cataloghi /
   ⚙️ Altro in `src/routes/+page.svelte`) e `/giochi` renderizzano ogni voce via
   `featureState`; le `locked` mostrano 🔒 + «si sblocca quando…». Esperto invariato.

## Mappa di sblocco proposta (bozza — sono solo dati nel registry)

- **Sempre** (nucleo): 🧠 Studia (quiz), Ripassi, Vocabolario, 1–2 giochi base
  (es. Lettura, Riordina), guida.
- **Dopo le prime carte** (es. ≥15 a stage≥2): 🧩 Riordina/✍️ Dettato completi.
- **Dopo prime frasi + audio ok**: 👂 Choukai (ascolto).
- **Dopo basi di coniugazione** (forme note ≥ N o carte-verbo a stage≥2): 🧬 Catena,
  ⚖️ Comparazioni, 🔧 Keigo, forme/particelle avanzate.
- **Dopo Frasi utili / livello ≥ k**: 🗺️ Avventure (microfono).
- **Punti deboli**: appare quando esistono deboli (già così di fatto).
- **Esperto**: tutto `shown`, ignora le soglie.

## Default per utenti esistenti

Esistenti → `esperto` (zero regressione). Nuovi → dall'onboarding. Toggle in
Impostazioni sempre disponibile per cambiare in qualsiasi momento.

## Rollout incrementale (ogni step da solo su staging, esperto sempre intatto)

1. **S1**: setting `esperienza` + mapping onboarding + toggle Impostazioni. Nessun
   gating attivo ancora (entrambe le modalità mostrano tutto).
2. **S2**: `learner.ts` + `features.ts` + `featureState()` con test; gate di **pochi**
   giochi avanzati in principiante, con teaser. Home/giochi rendono i 🔒.
3. **Taratura** soglie sul campo; estensione del gating alle altre voci.
4. (opz) **S3** card «prossimo passo»; (opz) **S4** percorso a tappe.

## Verifica

- `npm run check` + `npm run build` puliti.
- Unit test (`featureState`, `learnerStats`): principiante blocca sotto soglia,
  esperto sempre `shown`, mapping onboarding corretto.
- Manuale su staging: device fresco → principiante → home ridotta + giochi avanzati
  🔒 con hint; avanza col dev `?dev=1` (o impara carte) → lo sblocco scatta; toggle
  «Esperto» in Impostazioni → tutto visibile. Utente esistente → parte esperto.

## Rischi / note

- **Non spezzare l'esperto**: è il default e non deve mai vedere gating.
- Teaser **motivanti, non frustranti**: hint chiaro e vicino («ti manca poco: …»).
- Gating = sola **visibilità**; SRS, dati e punteggi restano invariati.
- Copy i18n (it/en) per label e teaser.
- Aggiornare `/guida` quando S2 va in prod (spiegare gli sblocchi).
