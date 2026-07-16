<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { goto, beforeNavigate } from '$app/navigation';
	import { db } from '$lib/db/schema';
	import { loadWeakItems } from '$lib/db/queries';
	import { appState, emptySkillCounts, type SkillKey } from '$lib/stores.svelte';
	import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from '$lib/core/i18n';
	import { createInitialSrs, applySrsReview, applyPracticeReview, touchReviewDate, normalizeMastery, bumpFacet, type FacetField } from '$lib/core/srs';
	import { facetOfMode, facetsToTrain } from '$lib/core/facets';
	import { speakWordReading, speakSentenceJapanese } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import { renderFuriganaToHtml, stripFuriganaNotation } from '$lib/core/furigana';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import {
		createFlashcardProductionQuestion,
		createCompositionQuestion,
		createSpokenProductionQuestion,
		createVerbFormClozeQuestion,
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createListeningQuestion,
		createGrammarQuestion,
		createParticleClozeQuestion,
		createCounterQuestion,
		createCounterDrillQuestion,
		createConjugationQuizQuestion,
		createTransitivityPairQuestion,
		createCounterReadingQuestion,
		createTimeReadingQuestion,
		calculateQuizXp,
		shuffle
	} from '$lib/quiz/engine';
	import { DEFAULT_KNOWN_FORMS, buildConjugationTable, conjClassKey, CONSTRUCTION_BY_FORM_KEY } from '$lib/core/conjugation';
	import { wordHasAdvancedKanji } from '$lib/core/kanjiLevel';
	import { canIntroduceNewCard, recordNewCardIntroduced, DEFAULT_NEW_CARDS_PER_DAY } from '$lib/core/dailyNewCards';
	import { isTimeTriggerWord } from '$lib/core/timeReadings';
	import Confetti from '$lib/components/Confetti.svelte';
	import { computeStreak as computeSessionStreak, isMilestone, type Streak } from '$lib/core/celebration';
	import type {
		QuizQuestion, QuizContext, DistractorIndex,
		FlashcardQuestion, MultipleChoiceQuestion,
		SentenceOrderingQuestion, CompositionQuestion, SpokenProductionQuestion, VerbFormClozeQuestion, ClozeQuestion, ReadingChoiceQuestion, ListeningQuestion,
		ParticleClozeQuestion, CounterQuestion, ConjugationQuizQuestion,
		TransitivityPairQuestion, CounterReadingQuestion, TimeReadingQuestion
	} from '$lib/quiz/types';
	import type { Word, Kanji, Grammar, SrsProgress, StudyObjective, Counter } from '$lib/types/models';
	import type { ItemRef, ItemKind, StudySessionState, ActiveQuiz, DeepDiveItem } from '$lib/stores.svelte';

	const locale = detectUserLocale();

	// ── State ─────────────────────────────────────────────────────────────────────
	let phase = $state<'init' | 'quiz' | 'summary'>('init');
	let loadError = $state('');

	// In-session data (loaded once)
	let words = $state<Word[]>([]);
	let kanjiRows = $state<Kanji[]>([]);
	let grammarRows = $state<Grammar[]>([]);
	let counterRows = $state<Counter[]>([]);
	let objectives = $state<StudyObjective[]>([]);
	let srsMap = $state(new Map<string, SrsProgress>());
	let context = $state<QuizContext | null>(null);
	let distractorIndex = $state<DistractorIndex>({ N5: [], N4: [], N3: [], N2: [], N1: [] });

	// Session
	let session = $state<StudySessionState | null>(null);
	let quiz = $state<ActiveQuiz | null>(null);
	let revealedProduction = $state(false);
	let answerFeedback = $state<'correct' | 'wrong' | null>(null);
	let bankTokens = $state<string[]>([]);
	let answerTokens = $state<string[]>([]);
	// 🎤 spoken-production: stato del microfono e trascrizione sentita
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	let nowTick = $state(Date.now());
	let answerRemainingS = $state(0);
	let sessionPaused = $state(false);
	let autoNextProgress = $state(0);
	let autoNextRemainingS = $state(0);
	let sessionTimerId: ReturnType<typeof setInterval> | null = null;
	let autoNextTimer: ReturnType<typeof setTimeout> | null = null;
	let autoNextCountdownId: ReturnType<typeof setInterval> | null = null;
	let answerTimerId: ReturnType<typeof setInterval> | null = null;

	// Summary
	let summarySession = $state<StudySessionState | null>(null);
	// true quando la sessione finisce perché non c'è più nulla di dovuto né
	// carte nuove da introdurre (tetto giornaliero), non per scadenza del timer.
	let finishedEverything = $state(false);
	// true quando la sessione finisce E non c'è NESSUNA carta mai vista negli
	// obiettivi attivi (a prescindere dal tetto): alzare il tetto non servirebbe
	// a niente, va detto chiaro invece di far sembrare che il bottone non faccia nulla.
	let poolFullyExhausted = $state(false);
	// Sblocco manuale del tetto giornaliero (bottone "Continua ancora un po'"):
	// vale solo finché resti su questa pagina, non tocca l'impostazione salvata.
	let extraCardsUnlocked = $state(0);

	// Per decidere se offrire "➕ Continua ancora un po'": guarda solo lo scope
	// ATTIVO (mai gli obiettivi in pausa) — il bottone non deve mai pescare
	// contenuto che l'utente ha volutamente messo in pausa.
	function poolHasUnseen(pool: ItemRef[]): boolean {
		return pool.some((item) => !getSrs(item.key));
	}

	function continueWithMoreCards(n: number): void {
		extraCardsUnlocked += n;
		startSession();
	}
	// celebrazione a fine sessione: streak, record personale, coriandoli
	let summaryStreak = $state<Streak | null>(null);
	let summaryBest = $state(false);
	let summaryConfetti = $state(false);

	async function loadSummaryExtras(answers: number, correct: number, celebrate = true): Promise<void> {
		const sessions = await db.study_sessions.toArray();
		const st = computeSessionStreak(sessions);
		summaryStreak = st;
		const acc = answers > 0 ? correct / answers : 0;
		// record personale: miglior accuratezza tra le sessioni con almeno 10 risposte
		const prevBest = Math.max(
			0,
			...sessions
				.filter((s) => s.answers >= 10 && s.startedAt !== Number(summarySession?.startedAt))
				.map((s) => s.correct / s.answers)
		);
		summaryBest = answers >= 10 && acc > prevBest;
		if (celebrate && (summaryBest || acc >= 0.9 || isMilestone(st.giorni))) {
			summaryConfetti = true;
			setTimeout(() => (summaryConfetti = false), 3500);
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────────
	function sample<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)] as T;
	}

	function getSrs(key: string): SrsProgress | undefined {
		return srsMap.get(key);
	}

	const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window;

	// Selezione del modo guidata dalle sfaccettature (modello Nation): tra le
	// celle applicabili alla parola e sbloccate allo stage attuale, si insiste
	// su quella meno sviluppata (con un po' di casualità per non essere monotoni:
	// si pesca tra le 2 più deboli, mai la stessa cella due volte di fila).
	// Le celle senza un modo in questa rosa (Usare → speciali conjugation/
	// particle-cloze; Dire/Scrivere → modalità future) restano fuori qui.
	let lastFacetPicked: FacetField | null = null;
	type WordMode = FlashcardQuestion['mode'] | 'multiple-choice' | 'listening' | 'composition' | 'spoken-production';
	const MODE_BY_FACET: Partial<Record<FacetField, WordMode[]>> = {
		facet_meaning_r: ['flashcard-recognition', 'multiple-choice'],
		facet_meaning_p: ['flashcard-production'],
		facet_form_read: ['flashcard-reading-recognition'],
		facet_form_listen: ['listening'],
		facet_form_write: ['composition'],
		facet_form_speak: ['spoken-production']
	};

	function pickWordMode(stage: number, word: Word): WordMode {
		const row = getSrs(`word:${word.id}`);
		let candidates = facetsToTrain(word, stage, row ?? {}).filter((f) => {
			const modes = MODE_BY_FACET[f];
			if (!modes) return false;
			if (f === 'facet_form_listen' && (appState.quizMuted || !hasTts)) return false;
			// il Parlato esce solo se il mic c'è davvero (e non in modalità muta)
			if (f === 'facet_form_speak' && (!canSpeak || appState.quizMuted)) return false;
			// reading-recognition tautologica senza kanji (それほど→それほど) — già
			// esclusa da applicableFacets (full-kana), doppia guardia qui.
			if (f === 'facet_form_read' && word.kanji_usati.length === 0) return false;
			return true;
		});
		if (candidates.length > 1 && lastFacetPicked) {
			const filtered = candidates.filter((f) => f !== lastFacetPicked);
			if (filtered.length > 0) candidates = filtered;
		}
		if (candidates.length === 0) return 'multiple-choice';
		const pick = candidates.length === 1 || Math.random() < 0.7 ? candidates[0]! : candidates[1]!;
		lastFacetPicked = pick;
		const modes = MODE_BY_FACET[pick]!;
		return modes[Math.floor(Math.random() * modes.length)]!;
	}

	function getActivePool(): ItemRef[] {
		const enabled = objectives.filter((o) => o.study_enabled);
		const keys = new Set<string>();
		const stack = [...enabled];
		const seen = new Set(enabled.map((o) => o.id));
		while (stack.length) {
			const obj = stack.pop()!;
			for (const k of obj.catalog_item_keys) keys.add(k);
			// i figli in pausa restano fuori: mettere in pausa "Parole N5"
			// deve funzionare anche col padre "Catalogo N5" attivo
			for (const child of objectives.filter(
				(o) => o.parent_objective_id === obj.id && o.study_enabled && !seen.has(o.id)
			)) {
				seen.add(child.id);
				stack.push(child);
			}
		}
		const fromObjectives = [...keys]
			.map((key): ItemRef | null => {
				if (key.startsWith('word:')) return { key, kind: 'word' };
				if (key.startsWith('kanji:')) return { key, kind: 'kanji' };
				if (key.startsWith('grammar:')) return { key, kind: 'grammar' };
				return null;
			})
			.filter((x): x is ItemRef => x !== null);

		// I contatori non appartengono a nessun obiettivo (sono "fuori piano", come
		// countDueCards li tratta): se un errore in un'avventura ne ha reso uno
		// dovuto, deve poter tornare a essere ripassato qui — altrimenti resta
		// "dovuto" per sempre (nessun altro posto avanza il suo SRS).
		const dueCounters: ItemRef[] = counterRows
			.map((c): ItemRef => ({ key: `counter:${c.id}`, kind: 'counter' }))
			.filter((ref) => srsMap.has(ref.key));

		return [...fromObjectives, ...dueCounters];
	}

	async function generateQuestion(ref: ItemRef): Promise<QuizQuestion | null> {
		if (!context) return null;

		if (ref.kind === 'word') {
			const word = context.wordsById.get(ref.key.replace('word:', ''));
			if (!word) return null;
			const srs = getSrs(ref.key) ?? createInitialSrs(ref.key);

			// Modalità speciali con distrattori pedagogici: si raccolgono quelle
			// applicabili alla parola e se ne tenta una a caso (~40% delle volte).
			// Il cloze sulla particella (particleCloze) è tenuto FUORI da questo
			// bucket: è disponibile per quasi ogni parola (basta una frase
			// d'esempio), quindi nel bucket comune finiva per dominare — spesso
			// era l'UNICA speciale disponibile per un nome, portando la sua quota
			// reale al 40% dei turni invece di essere una variante occasionale.
			// Ha un suo peso più basso e separato.
			const specials: (() => QuizQuestion | null | Promise<QuizQuestion | null>)[] = [];
			if (word.frasi_esempio?.length && word.id_verbo_corrispondente) {
				specials.push(() => createTransitivityPairQuestion(word, context!, locale));
			}
			if (word.id_contatore_suggerito) {
				specials.push(() => createCounterQuestion(word, counterRows, locale));
				specials.push(() => createCounterReadingQuestion(word, counterRows));
			}
			if (
				(word.tipo_jp.startsWith('動詞') || word.tipo_jp.startsWith('形容詞')) &&
				srs.srs_stage >= 1
			) {
				const allowed = new Set(appState.settings.forme_note ?? DEFAULT_KNOWN_FORMS);
				specials.push(() => createConjugationQuizQuestion(word, allowed));
				// cloze sulla forma in contesto (て per la richiesta, た per il passato…)
				if (word.frasi_esempio?.length && srs.srs_stage >= 2) {
					specials.push(() => createVerbFormClozeQuestion(word, locale));
				}
			}
			if (isTimeTriggerWord(word.scrittura)) {
				specials.push(() => createTimeReadingQuestion(word));
			}
			if (specials.length > 0 && Math.random() < 0.4) {
				const pick = specials[Math.floor(Math.random() * specials.length)]!;
				const special = await pick();
				if (special) return special;
			}
			if (word.frasi_esempio?.length && Math.random() < 0.15) {
				const particleQuestion = await createParticleClozeQuestion(word, locale);
				if (particleQuestion) return particleQuestion;
			}

			const mode = pickWordMode(srs.srs_stage, word);
			if (mode === 'flashcard-production') return createFlashcardProductionQuestion(word, locale);
			if (mode === 'flashcard-recognition') return createFlashcardRecognitionQuestion(word, locale, distractorIndex, context);
			if (mode === 'flashcard-reading-recognition') return createFlashcardReadingRecognitionQuestion(word, locale, distractorIndex, context);
			if (mode === 'listening') return createListeningQuestion(word, distractorIndex, context);
			if (mode === 'composition') {
				const comp = createCompositionQuestion(word, locale, context);
				if (comp) return comp;
			}
			if (mode === 'spoken-production') return createSpokenProductionQuestion(word, locale);
			return createMultipleChoiceQuestion(word, context, distractorIndex);
		}

		if (ref.kind === 'counter') {
			const counter = counterRows.find((c) => c.id === ref.key.replace('counter:', ''));
			return counter ? createCounterDrillQuestion(counter) : null;
		}

		if (ref.kind === 'kanji') {
			const kanji = kanjiRows.find((k) => k.id === ref.key.replace('kanji:', ''));
			if (!kanji) return null;
			const correct = locale === 'it' ? kanji.significato.it : kanji.significato.en;
			const distractors = shuffle(kanjiRows.filter((k) => k.id !== kanji.id))
				.map((k) => (locale === 'it' ? k.significato.it : k.significato.en))
				.filter((value, index, values) => values.indexOf(value) === index)
				.filter((value) => value !== correct && value.length > 0)
				.slice(0, 3);
			return {
				mode: 'multiple-choice',
				wordId: kanji.id,
				prompt: kanji.id,
				correctChoice: correct,
				choices: shuffle([correct, ...distractors])
			} satisfies MultipleChoiceQuestion;
		}

		const entry = context.grammarById.get(ref.key.replace('grammar:', ''));
		if (!entry || entry.frasi_esempio.length === 0) return null;
		const example = sample(entry.frasi_esempio);
		return createGrammarQuestion({ grammar: entry, example }, distractorIndex, entry.livello_jlpt, context, locale);
	}

	// I ripassi dovuti sono sempre illimitati; solo l'ingresso di carte MAI
	// viste è razionato (altrimenti, con gli intervalli iniziali corti, il
	// conto dei ripassi non scende mai). Al tetto raggiunto, se non c'è nulla
	// di dovuto, si torna null: la sessione finisce da sola (niente da fare
	// finché non torni domani) invece di ripetere a caso carte non ancora dovute.
	function pickNextItem(pool: ItemRef[]): ItemRef | null {
		if (pool.length === 0) return null;
		const now = Date.now();
		const due = pool.filter((item) => {
			const srs = getSrs(item.key);
			return srs ? srs.next_review_date <= now : false;
		}).sort((a, b) => (getSrs(a.key)?.next_review_date ?? 0) - (getSrs(b.key)?.next_review_date ?? 0));

		if (due.length > 0) return due[0]!;
		// Sblocco esplicito e temporaneo (bottone "Continua ancora un po'" nel
		// riepilogo, quando non c'è più nulla di dovuto): alza il tetto solo per
		// questa sessione, senza toccare l'impostazione salvata.
		const cap = (appState.settings.nuove_carte_al_giorno ?? DEFAULT_NEW_CARDS_PER_DAY) + extraCardsUnlocked;
		if (!canIntroduceNewCard(appState.userProfile ?? {}, cap, now)) return null;
		const unseen = pool.filter((item) => !getSrs(item.key));
		return unseen.length > 0 ? sample(unseen) : null;
	}

	// ── Modalità ripasso punti deboli (/quiz?deboli=1) ─────────────────────────
	// Stesso quiz (UI, audio, Approfondisci), ma pesca dalla coda dei deboli.
	// conj:/particella: non sono generabili da sole: serve una parola "portatrice"
	// (una parola della classe / una frase col buco su quella particella) — il
	// crediting poi torna da solo alla classe via il dispatch di handleAnswer.
	async function weakQuestionFor(item: { kind: string; raw: string }): Promise<{ ref: ItemRef; q: QuizQuestion } | null> {
		if (!context) return null;
		if (item.kind === 'conj') {
			const pool = shuffle([...context.wordsById.values()].filter((w) => conjClassKey(w) === `conj:${item.raw}`));
			const allowed = new Set(appState.settings.forme_note ?? DEFAULT_KNOWN_FORMS);
			for (const w of pool.slice(0, 8)) {
				const q = createConjugationQuizQuestion(w, allowed);
				if (q) return { ref: { key: `word:${w.id}`, kind: 'word' }, q };
			}
			return null;
		}
		if (item.kind === 'particella') {
			const pool = shuffle([...context.wordsById.values()].filter((w) => w.frasi_esempio?.length));
			for (const w of pool.slice(0, 40)) {
				const q = await createParticleClozeQuestion(w, locale);
				if (q?.correctChoice === item.raw) return { ref: { key: `word:${w.id}`, kind: 'word' }, q };
			}
			return null;
		}
		const kinds: Record<string, ItemKind> = { word: 'word', kanji: 'kanji', grammar: 'grammar', counter: 'counter' };
		const kind = kinds[item.kind];
		if (!kind) return null;
		const ref: ItemRef = { key: `${item.kind}:${item.raw}`, kind };
		const q = await generateQuestion(ref);
		return q ? { ref, q } : null;
	}

	async function nextWeakQuestion(): Promise<{ ref: ItemRef; q: QuizQuestion } | null> {
		const queue = session?.weakQueue;
		if (!queue) return null;
		while (queue.length > 0) {
			const item = queue.shift()!;
			const resolved = await weakQuestionFor(item);
			if (resolved) return resolved;
		}
		return null;
	}

	// Traccia una carta mai vista appena introdotta nel conteggio giornaliero
	// (stesso profilo che tiene XP/streak: addXp, chiamato subito dopo per
	// ogni risposta, legge questo aggiornamento a sua volta e lo preserva).
	async function recordNewCardToday(): Promise<void> {
		const now = Date.now();
		// $state.snapshot: Dexie non sa clonare i proxy di Svelte 5 (badge_sbloccati
		// è un array reattivo) — serve la copia piatta, altrimenti IndexedDB lancia
		// DataCloneError.
		const profile = appState.userProfile ? $state.snapshot(appState.userProfile) : null;
		const patch = recordNewCardIntroduced(profile ?? {}, now);
		const updated = profile
			? { ...profile, ...patch, updated_at: now }
			: { id: 'default' as const, xp_totali: 0, livello: 1, streak_giorni: 0, badge_sbloccati: [], ...patch, updated_at: now };
		await db.user_profile.put(updated);
		appState.userProfile = updated;
	}

	async function upsertSrs(key: string, correct: boolean): Promise<SrsProgress> {
		const wasNew = !getSrs(key);
		const current = getSrs(key) ?? createInitialSrs(key);
		const updated = applySrsReview(current, correct);
		await db.srs_progress.put(updated);
		srsMap.set(key, updated);
		if (wasNew) await recordNewCardToday();
		return updated;
	}

	// Contatore "solo pratica" (conj:*, particella:*…): muove mastery_points senza
	// mai promuovere/retrocedere lo stage — la coniugazione è di classe, non di parola.
	async function upsertPracticeOnly(key: string, correct: boolean): Promise<SrsProgress> {
		const current = getSrs(key) ?? createInitialSrs(key);
		const updated = applyPracticeReview(current, correct);
		await db.srs_progress.put(updated);
		srsMap.set(key, updated);
		return updated;
	}

	// La domanda di classe non giudica la parola: le sposta solo la data di ripasso.
	async function touchWordReviewDate(key: string): Promise<void> {
		const current = getSrs(key);
		if (!current) return;
		const updated = touchReviewDate(current);
		await db.srs_progress.put(updated);
		srsMap.set(key, updated);
	}

	function localDayKey(ts: number): string {
		const d = new Date(ts);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	// Striscia giornaliera: +1 se l'ultima attività era ieri, invariata se è
	// già stata oggi, riparte da 1 dopo un buco di più giorni.
	function computeStreak(prevStreak: number, prevTs: number, now: number): number {
		const prevDay = localDayKey(prevTs);
		const today = localDayKey(now);
		if (prevDay === today) return Math.max(1, prevStreak);
		if (prevDay === localDayKey(now - 24 * 60 * 60 * 1000)) return prevStreak + 1;
		return 1;
	}

	async function addXp(delta: number): Promise<void> {
		const current = await db.user_profile.get('default');
		const now = Date.now();
		if (!current) {
			const xp = Math.max(0, delta);
			const created = { id: 'default' as const, xp_totali: xp, livello: 1, streak_giorni: 1, badge_sbloccati: [], updated_at: now };
			await db.user_profile.put(created);
			appState.userProfile = created;
			return;
		}
		const total = Math.max(0, current.xp_totali + delta);
		const streak_giorni = computeStreak(current.streak_giorni ?? 0, current.updated_at, now);
		const updated = { ...current, xp_totali: total, livello: Math.max(1, Math.floor(total / 220) + 1), streak_giorni, updated_at: now };
		await db.user_profile.put(updated);
		appState.userProfile = updated;
	}

	async function advanceToNext(): Promise<void> {
		if (!session) return;
		stopAutoNext();
		// Riprende il timer se era in pausa (risposta sbagliata), recuperando il tempo fermo.
		if (session.pausedAt) {
			session.deadlineAt += Date.now() - session.pausedAt;
			session.pausedAt = null;
		}
		if (isSessionExpired()) {
			endSession();
			return;
		}
		if (session.weak) {
			const nw = await nextWeakQuestion();
			if (!nw) {
				finishedEverything = true;
				poolFullyExhausted = true;
				endSession();
				return;
			}
			quiz = { itemRef: nw.ref, question: nw.q, startedAt: Date.now(), answered: false };
			revealedProduction = false;
			answerFeedback = null;
			bankTokens = nw.q.mode === 'sentence-ordering' || nw.q.mode === 'composition' ? shuffle(nw.q.tokens) : [];
			answerTokens = [];
			heard = ''; micState = 'idle';
			if (nw.q.mode === 'listening' && !appState.quizMuted) speakSentenceJapanese(nw.q.readingToSpeak);
			startAnswerTimer();
			return;
		}
		const pool = getActivePool();
		const next = pickNextItem(pool);
		if (!next) {
			finishedEverything = true;
			poolFullyExhausted = !poolHasUnseen(pool);
			endSession();
			return;
		}
		const question = await generateQuestion(next);
		if (!question) {
			// skip ungenerable and try another
			const fallback = pool.filter((p) => p.key !== next.key);
			const alt = pickNextItem(fallback);
			if (alt) {
				const q2 = await generateQuestion(alt);
				if (q2) {
					quiz = { itemRef: alt, question: q2, startedAt: Date.now(), answered: false };
					revealedProduction = false;
					answerFeedback = null;
					bankTokens = q2.mode === 'sentence-ordering' || q2.mode === 'composition' ? shuffle(q2.tokens) : [];
					answerTokens = [];
					heard = ''; micState = 'idle';
					startAnswerTimer();
					return;
				}
			}
			finishedEverything = true;
			poolFullyExhausted = !poolHasUnseen(pool);
			endSession();
			return;
		}
		quiz = { itemRef: next, question, startedAt: Date.now(), answered: false };
		revealedProduction = false;
		answerFeedback = null;
		bankTokens = question.mode === 'sentence-ordering' || question.mode === 'composition' ? shuffle(question.tokens) : [];
		answerTokens = [];
		heard = ''; micState = 'idle';
		if (question.mode === 'listening' && !appState.quizMuted) speakSentenceJapanese(question.readingToSpeak);
		startAnswerTimer();
	}

	function isSessionExpired(): boolean {
		if (!session) return true;
		if (session.pausedAt) return false;
		return Date.now() >= session.deadlineAt;
	}

	function endSession(): void {
		if (!session) return;
		summarySession = { ...session };
		appState.sessionState = null;
		appState.lastSummary = summarySession;

		const answers = session.answers;
		const correct = session.correct;
		void db.study_sessions
			.put({
				id: String(session.startedAt),
				startedAt: session.startedAt,
				endedAt: Date.now(),
				answers,
				correct,
				wrong: session.wrong,
				timeout: session.timeout,
				xp: session.xp ?? 0,
				answersByType: $state.snapshot(session.answersByType)
			})
			.then(() => loadSummaryExtras(answers, correct));

		session = null;
		phase = 'summary';
		clearTimers();
	}

	function clearTimers(): void {
		if (sessionTimerId) { clearInterval(sessionTimerId); sessionTimerId = null; }
		stopAutoNext();
		stopAnswerTimer();
	}

	function stopAutoNext(): void {
		if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
		if (autoNextCountdownId) { clearInterval(autoNextCountdownId); autoNextCountdownId = null; }
		autoNextProgress = 0;
		autoNextRemainingS = 0;
	}

	function stopAnswerTimer(): void {
		if (answerTimerId) { clearInterval(answerTimerId); answerTimerId = null; }
	}

	// Timer per singola domanda (max_answer_time_ms): allo scadere conta timeout.
	// Le domande di composizione richiedono più tempo di una scelta multipla.
	function answerTimeMultiplier(): number {
		const mode = quiz?.question.mode;
		if (mode === 'sentence-ordering') return 3;
		if (mode === 'composition') return 2;
		if (mode === 'spoken-production') return 1.5;
		if (mode === 'cloze' || mode === 'reading-choice' || mode === 'verb-form-cloze') return 1.5;
		return 1;
	}
	function startAnswerTimer(): void {
		stopAnswerTimer();
		sessionPaused = false;
		const maxMs = appState.settings.max_answer_time_ms * answerTimeMultiplier();
		if (!maxMs || maxMs <= 0) { answerRemainingS = 0; return; }
		const startedAt = Date.now();
		answerRemainingS = maxMs / 1000;
		answerTimerId = setInterval(() => {
			if (!quiz || quiz.answered) { stopAnswerTimer(); return; }
			const remaining = Math.max(0, maxMs - (Date.now() - startedAt));
			answerRemainingS = remaining / 1000;
			if (remaining <= 0) {
				stopAnswerTimer();
				handleAnswer(false, '', true);
			}
		}, 100);
	}

	// Riprende il countdown dal valore corrente di answerRemainingS (non da maxMs):
	// usato dopo una pausa manuale, per non "regalare" tempo extra.
	function resumeAnswerTimer(): void {
		stopAnswerTimer();
		const remainingMs = answerRemainingS * 1000;
		const startedAt = Date.now();
		answerTimerId = setInterval(() => {
			if (!quiz || quiz.answered) { stopAnswerTimer(); return; }
			const remaining = Math.max(0, remainingMs - (Date.now() - startedAt));
			answerRemainingS = remaining / 1000;
			if (remaining <= 0) {
				stopAnswerTimer();
				handleAnswer(false, '', true);
			}
		}, 100);
	}

	// Pausa/riprendi l'intera sessione: ferma il timer di risposta E il timer
	// di sessione (stesso meccanismo di session.pausedAt usato per le revisioni
	// dopo un errore), e nasconde la domanda finché non riprendi — utile se devi
	// allontanarti, senza scadenze silenziose né una domanda lasciata in vista.
	function toggleSessionPause(): void {
		if (!quiz || quiz.answered) return;
		if (sessionPaused) {
			sessionPaused = false;
			if (answerRemainingS > 0) resumeAnswerTimer();
			if (session && session.pausedAt) {
				session.deadlineAt += Date.now() - session.pausedAt;
				session.pausedAt = null;
			}
		} else {
			sessionPaused = true;
			stopAnswerTimer();
			if (session && !session.pausedAt) session.pausedAt = Date.now();
		}
	}

	// Countdown auto-avanzamento dopo risposta corretta, con progresso sul pulsante.
	function startAutoNext(): void {
		stopAutoNext();
		const totalMs = Math.max(500, appState.settings.auto_next_delay_ms);
		const startedAt = Date.now();
		autoNextRemainingS = totalMs / 1000;
		autoNextCountdownId = setInterval(() => {
			const elapsed = Date.now() - startedAt;
			autoNextProgress = Math.min(1, elapsed / totalMs);
			autoNextRemainingS = Math.max(0, (totalMs - elapsed) / 1000);
			if (elapsed >= totalMs && autoNextCountdownId) {
				clearInterval(autoNextCountdownId);
				autoNextCountdownId = null;
			}
		}, 90);
		autoNextTimer = setTimeout(advanceToNext, totalMs);
	}

	function startTimer(): void {
		clearTimers();
		nowTick = Date.now();
		sessionTimerId = setInterval(() => {
			nowTick = Date.now();
			if (session && !session.pausedAt && nowTick >= session.deadlineAt) {
				endSession();
			}
		}, 1000);
	}

	// ── Answer handling ───────────────────────────────────────────────────────────
	function questionSummary(q: QuizQuestion): { prompt: string; correct: string } {
		switch (q.mode) {
			case 'flashcard-production':
			case 'flashcard-recognition':
			case 'flashcard-reading-recognition':
				return { prompt: q.prompt, correct: q.correctAnswer };
			case 'multiple-choice':
				return { prompt: q.prompt, correct: q.correctChoice };
			case 'sentence-ordering':
				return { prompt: q.prompt, correct: q.correctOrder.join('') };
			case 'composition':
				return { prompt: `Componi: ${q.prompt}`, correct: q.correctAnswer };
			case 'spoken-production':
				return { prompt: `Di' a voce: ${q.prompt}`, correct: `${q.expectedWriting}（${q.expectedReading}）` };
			case 'verb-form-cloze':
				return { prompt: q.sentenceWithBlank, correct: q.correctChoice };
			case 'reading-choice':
				return { prompt: q.plainSentence, correct: q.correctChoice };
			case 'listening':
				return { prompt: `🔊 ${q.readingToSpeak}`, correct: q.correctChoice };
			case 'particle-cloze':
			case 'transitivity-pair':
				return { prompt: q.sentenceWithBlank, correct: q.correctChoice };
			case 'counter-quiz':
				return { prompt: `Contatore per ${q.prompt}`, correct: q.correctChoice };
			case 'conjugation':
				return { prompt: `${q.dictionary} → ${q.formLabel}`, correct: q.correctChoice };
			case 'counter-reading':
			case 'time-reading':
				return { prompt: `Lettura di ${q.prompt}`, correct: q.correctChoice };
			case 'cloze':
				return { prompt: q.sentenceWithBlank.replace(/<[^>]*>/g, ''), correct: q.correctChoice };
		}
	}

	// Recap dell'elemento dopo la risposta: è il momento di massimo apprendimento.
	const answeredRecap = $derived.by(() => {
		if (!quiz?.answered) return null;
		const rawId = quiz.itemRef.key.split(':').slice(1).join(':');
		if (quiz.itemRef.kind === 'word') {
			const w = context?.wordsById.get(rawId);
			if (!w) return null;
			return {
				jp: w.scrittura,
				reading: w.lettura !== w.scrittura ? w.lettura : '',
				text: pickLocalizedArray(w.significato, locale).join(' / ')
			};
		}
		if (quiz.itemRef.kind === 'grammar') {
			const g = context?.grammarById.get(rawId);
			if (!g) return null;
			return { jp: g.struttura, reading: '', text: pickLocalizedText(g.spiegazione, locale) };
		}
		if (quiz.itemRef.kind === 'kanji') {
			const k = kanjiRows.find((row) => row.id === rawId);
			if (!k) return null;
			return {
				jp: k.id,
				reading: [...k.letture_kun, ...k.letture_on].slice(0, 3).join('、'),
				text: locale === 'it' ? k.significato.it : k.significato.en
			};
		}
		if (quiz.itemRef.kind === 'counter') {
			const c = counterRows.find((row) => row.id === rawId);
			if (!c) return null;
			return { jp: c.simbolo, reading: c.lettura, text: locale === 'it' ? c.significato.it : c.significato.en };
		}
		return null;
	});

	// ── Approfondimenti post-risposta: argomento principale + elementi della frase ──
	function wordItem(w: Word, primary = false): DeepDiveItem {
		return {
			label: w.scrittura,
			href: `${base}/detail/${encodeURIComponent(`word:${w.id}`)}`,
			consolidaHref: `${base}/consolida/${encodeURIComponent(w.id)}`,
			level: w.livello_jlpt,
			tipo: w.tipo_jp,
			meaning: pickLocalizedArray(w.significato, locale)[0] ?? '',
			primary
		};
	}

	function wordsInSentence(sentence: string, excludeId?: string): DeepDiveItem[] {
		return words
			.filter((w) => w.id !== excludeId && !w.id_nome_origine)
			.filter((w) => (w.scrittura.length >= 2 || /[一-龯]/.test(w.scrittura)) && sentence.includes(w.scrittura))
			.sort((a, b) => b.scrittura.length - a.scrittura.length)
			.slice(0, 4)
			.map((w) => wordItem(w));
	}

	function buildDeepDives(): DeepDiveItem[] {
		if (!quiz) return [];
		const q = quiz.question;
		const rawId = quiz.itemRef.key.split(':').slice(1).join(':');
		const word = quiz.itemRef.kind === 'word' ? context?.wordsById.get(rawId) : undefined;
		const wordLink: DeepDiveItem | null = word ? wordItem(word) : null;
		const dives: DeepDiveItem[] = [];

		if (q.mode === 'particle-cloze') {
			dives.push(
				q.correctChoice === 'な'
					? { label: 'Aggettivi in -な', href: `${base}/forme#na-keiyoushi`, primary: true }
					: { label: `Particella ${q.correctChoice}`, href: `${base}/particelle#${encodeURIComponent(q.correctChoice)}`, primary: true }
			);
			if (wordLink) dives.push(wordLink);
			dives.push(...wordsInSentence(q.fullSentence, word?.id));
		} else if (q.mode === 'transitivity-pair') {
			dives.push({ label: 'Transitivo vs intransitivo', href: `${base}/forme#tadoushi`, primary: true });
			if (wordLink) dives.push(wordLink);
			if (word?.id_verbo_corrispondente) {
				const pair = context?.wordsById.get(word.id_verbo_corrispondente);
				if (pair) dives.push(wordItem(pair));
			}
			dives.push(...wordsInSentence(q.fullSentence, word?.id));
		} else if (q.mode === 'conjugation') {
			const classSlug = word?.classe_verbo_jp?.startsWith('五段')
				? 'godan'
				: word?.classe_verbo_jp?.startsWith('一段')
					? 'ichidan'
					: word?.classe_verbo_jp?.startsWith('不規則')
						? 'fukisoku'
						: word?.tipo_aggettivo_jp?.startsWith('な')
							? 'na-keiyoushi'
							: 'i-keiyoushi';
			dives.push({ label: q.formLabel, href: `${base}/forme#${classSlug}`, primary: true });
			if (wordLink) dives.push(wordLink);
		} else if (q.mode === 'counter-quiz' || q.mode === 'counter-reading') {
			const counterId = word?.id_contatore_suggerito;
			if (counterId) {
				dives.push({
					label: `Contatore ${counterId}`,
					href: `${base}/contatori#${encodeURIComponent(counterId)}`,
					primary: true
				});
			}
			if (wordLink) dives.push(wordLink);
		} else if (q.mode === 'time-reading') {
			dives.push({ label: `Lettura di ${q.prompt}`, href: `${base}/contatori`, primary: true });
			if (wordLink) dives.push(wordLink);
		} else if (quiz.itemRef.kind === 'grammar') {
			const grammar = context?.grammarById.get(rawId);
			dives.push({
				label: grammar?.struttura ?? 'Grammatica',
				href: `${base}/detail/${encodeURIComponent(quiz.itemRef.key)}`,
				primary: true
			});
			const sentence =
				q.mode === 'reading-choice'
					? q.plainSentence
					: q.mode === 'sentence-ordering'
						? q.correctOrder.join('')
						: q.mode === 'cloze'
							? q.sentenceWithBlank.replace(/<[^>]*>/g, '').replace(/___/g, '')
							: '';
			if (sentence) dives.push(...wordsInSentence(sentence));
		} else if (quiz.itemRef.kind === 'kanji') {
			dives.push({
				label: rawId,
				href: `${base}/detail/${encodeURIComponent(quiz.itemRef.key)}`,
				primary: true
			});
			const wordsWithKanji = [...(context?.wordsById.values() ?? [])].filter((w) =>
				w.kanji_usati?.includes(rawId)
			);
			dives.push(...wordsWithKanji.slice(0, 5).map((w) => wordItem(w)));
			if (q.mode === 'multiple-choice') {
				const choices = 'choices' in q && q.choices ? q.choices : [];
				const correct = 'correctChoice' in q ? q.correctChoice : '';
				for (const choice of choices) {
					if (choice === correct) continue;
					const wrongKanji = kanjiRows.find(
						(k) => (locale === 'it' ? k.significato.it : k.significato.en) === choice
					);
					if (wrongKanji) {
						dives.push({
							label: wrongKanji.id,
							href: `${base}/detail/${encodeURIComponent(`kanji:${wrongKanji.id}`)}`,
							kanji: true
						});
					}
				}
			}
		} else {
			// modalità parola classiche: la parola stessa + i suoi kanji
			if (wordLink) dives.push({ ...wordLink, primary: true });
			for (const k of word?.kanji_usati ?? []) {
				dives.push({
					label: k,
					href: `${base}/detail/${encodeURIComponent(`kanji:${k}`)}`,
					consolidaHref: `${base}/consolida/${encodeURIComponent(k)}`,
					kanji: true
				});
			}
			// le risposte sbagliate, quando corrispondono a una parola vera del
			// catalogo, sono utili da approfondire quanto quella giusta — non
			// solo il testo del "perché era sbagliata" (vedi wrongChoiceNotes).
			const choices = 'choices' in q && q.choices ? q.choices : [];
			const correct = 'correctChoice' in q ? q.correctChoice : 'correctAnswer' in q ? q.correctAnswer : '';
			const allWords = [...(context?.wordsById.values() ?? [])];
			const firstMeaning = (w: Word) => pickLocalizedArray(w.significato, locale)[0] ?? '';
			for (const choice of choices) {
				if (choice === correct) continue;
				const wrongWord =
					q.mode === 'multiple-choice'
						? allWords.find((w) => firstMeaning(w).toLowerCase() === choice.trim().toLowerCase())
						: (context?.wordsById.get(choice) ?? allWords.find((w) => w.scrittura === choice));
				if (wrongWord) dives.push(wordItem(wrongWord));
			}
		}

		// dedupe per href, massimo 6 chip
		const seen = new Set<string>();
		return dives.filter((d) => !seen.has(d.href) && seen.add(d.href)).slice(0, 6);
	}

	// Glosse dei distrattori: per le domande a scelta, spiega perché ogni
	// opzione errata era sbagliata (significato nel catalogo o motivo per modalità).
	function wrongChoiceNotes(): { choice: string; reason: string }[] {
		if (!quiz) return [];
		const q = quiz.question;
		const choices = 'choices' in q && q.choices ? q.choices : [];
		const correct =
			'correctChoice' in q ? q.correctChoice : 'correctAnswer' in q ? q.correctAnswer : '';
		if (choices.length === 0) return [];

		const allWords = [...(context?.wordsById.values() ?? [])];
		const firstMeaning = (w: Word) => pickLocalizedArray(w.significato, locale)[0] ?? '';
		// significato (IT) → parola giapponese che lo esprime (per le domande dirette)
		const wordByMeaning = (m: string) => {
			const t = m.trim().toLowerCase();
			return allWords.find((w) => firstMeaning(w).toLowerCase() === t);
		};
		// scrittura (JP) → parola del catalogo (per le domande inverse/lettura)
		const wordByScrittura = (s: string) =>
			context?.wordsById.get(s) ?? allWords.find((w) => w.scrittura === s);

		// domanda diretta: il prompt è in giapponese, le opzioni sono significati IT
		const promptIsJapanese = q.mode === 'multiple-choice';

		// coniugazione: quale forma sarebbe davvero il distrattore?
		const rawId = quiz.itemRef.key.split(':').slice(1).join(':');
		const itemWord = context?.wordsById.get(rawId);
		const conjTable = q.mode === 'conjugation' && itemWord ? buildConjugationTable(itemWord) : [];

		const reasonByMode: Record<string, string> = {
			cloze: 'non adatto al contesto',
			'reading-choice': 'lettura non corretta',
			'particle-cloze': 'particella non adatta qui',
			'counter-quiz': "contatore di un'altra categoria",
			'counter-reading': 'lettura errata (rendaku/concatenazione)',
			'time-reading': 'lettura regolare errata',
			'transitivity-pair': 'verbo gemello (transitività opposta)'
		};

		return choices
			.filter((c) => c !== correct)
			.map((choice) => {
				let reason = reasonByMode[q.mode] ?? 'non corretto';

				if (promptIsJapanese) {
					// opzione = significato di un'altra parola → mostrane il giapponese
					const src = wordByMeaning(choice);
					reason = src
						? `«${choice}» = ${src.scrittura}${src.lettura !== src.scrittura ? ` (${src.lettura})` : ''}`
						: 'significato di un altro termine';
				} else if (q.mode === 'conjugation') {
					const form = conjTable.find((f) => f.value === choice);
					reason = form ? `sarebbe la ${form.label}` : 'forma non corretta';
				} else {
					// opzione in giapponese → mostrane il significato
					const w = wordByScrittura(choice);
					reason = w ? `= ${firstMeaning(w)}` : (reasonByMode[q.mode] ?? 'scrittura di un altro termine');
				}
				return { choice, reason };
			});
	}

	function confirmEndSession(): void {
		if (!window.confirm('Terminare la sessione di studio?')) {
			return;
		}
		endSession();
	}

	// Guardia uscita: con una sessione attiva, il tasto Indietro del browser (o un
	// link) faceva uscire in silenzio. Ora chiediamo conferma — TRANNE quando si va
	// in Approfondisci (navigazione voluta durante il quiz): da lì si torna libero,
	// e da Approfondisci/detail al quiz non c'è guardia. 'leave' (chiudi tab) resta
	// al browser.
	beforeNavigate((nav) => {
		if (!session || nav.type === 'leave') return;
		if (nav.to?.url.pathname.endsWith('/approfondisci')) return;
		if (!window.confirm('Uscire dalla sessione di studio? I progressi restano salvati.')) {
			nav.cancel();
		}
	});

	// Apre la pagina Approfondisci: mette in pausa la sessione e ci porta tutti
	// gli elementi della domanda (argomento, distrattori con glosse, frase).
	// Riassunto della domanda + perché la risposta corretta è giusta.
	function questionSummaryText(): { question: string; correctReason: string } {
		const q = quiz!.question;
		const correct =
			'correctChoice' in q ? q.correctChoice : 'correctAnswer' in q ? q.correctAnswer : '';
		switch (q.mode) {
			case 'multiple-choice':
				return { question: `Significato di ${q.prompt}?`, correctReason: `${q.prompt} = ${correct}` };
			case 'flashcard-recognition':
				return { question: `Quale parola significa «${q.prompt}»?`, correctReason: `${correct} = ${q.prompt}` };
			case 'flashcard-reading-recognition':
				return { question: `Quale scrittura si legge ${q.prompt}?`, correctReason: `${correct} si legge ${q.prompt}` };
			case 'listening':
				return { question: 'Quale parola hai sentito?', correctReason: `Si legge ${q.readingToSpeak} → ${correct}` };
			case 'conjugation':
				return { question: `${q.dictionary} → ${q.formLabel}`, correctReason: `${correct} è la ${q.formLabel} di ${q.dictionary}` };
			case 'particle-cloze':
				return { question: q.sentenceWithBlank, correctReason: `Ci va «${correct}»` };
			case 'transitivity-pair':
				return { question: q.sentenceWithBlank, correctReason: `Forma corretta: ${correct}` };
			case 'counter-quiz':
				return { question: `Contatore per ${q.prompt}?`, correctReason: `Si conta con ${correct}` };
			case 'counter-reading':
			case 'time-reading':
				return { question: `Come si legge ${q.prompt}?`, correctReason: `Si legge ${correct}` };
			case 'cloze':
				return { question: q.sentenceWithBlank.replace(/<[^>]*>/g, ''), correctReason: `Ci va «${correct}»` };
			case 'reading-choice':
				return { question: `Come si legge «${q.targetText}»?`, correctReason: `Si legge ${correct}` };
			default:
				return { question: '', correctReason: '' };
		}
	}

	// La frase della domanda per Approfondisci: piana + annotata (furigana) +
	// traduzione, ripescando l'esempio d'origine dal catalogo quando serve.
	async function buildDiveSentence(): Promise<{ testo: string; annotated?: string; traduzione?: string } | undefined> {
		const q = quiz!.question;
		const strip = stripFuriganaNotation;
		const pickTrans = (t?: { it: string; en: string }) => (t ? pickLocalizedText(t, locale) : undefined);
		const fromExamples = (exs: { testo: string; traduzione?: { it: string; en: string } }[] | undefined, plain: string) => {
			const ex = (exs ?? []).find((e) => strip(e.testo) === plain);
			return ex ? { testo: plain, annotated: ex.testo !== plain ? ex.testo : undefined, traduzione: pickTrans(ex.traduzione) } : { testo: plain };
		};
		if (q.mode === 'particle-cloze' || q.mode === 'transitivity-pair') {
			const w = await db.words.get(q.wordId);
			const found = fromExamples(w?.frasi_esempio, q.fullSentence);
			return { ...found, traduzione: found.traduzione ?? q.translation };
		}
		if (q.mode === 'reading-choice') {
			const g = await db.grammar.get(q.grammarId);
			return fromExamples(g?.frasi_esempio, q.plainSentence);
		}
		if (q.mode === 'cloze') {
			const g = await db.grammar.get(q.grammarId);
			const blankedPlain = q.sentenceWithBlank.replace(/<[^>]*>/g, '');
			const full = blankedPlain.includes('___') ? blankedPlain.replace('___', q.correctChoice) : blankedPlain;
			const exact = fromExamples(g?.frasi_esempio, full);
			if (exact.traduzione || exact.annotated) return exact;
			const loose = (g?.frasi_esempio ?? []).find((e) => strip(e.testo).includes(q.correctChoice));
			return loose ? { testo: strip(loose.testo), annotated: loose.testo, traduzione: pickTrans(loose.traduzione) } : exact;
		}
		if (q.mode === 'sentence-ordering') {
			const g = await db.grammar.get(q.grammarId);
			return fromExamples(g?.frasi_esempio, q.correctOrder.join(''));
		}
		// domande senza frase: mostra l'esempio della parola, se c'è
		if ('wordId' in q && q.wordId && !q.wordId.includes(':')) {
			const w = await db.words.get(q.wordId);
			const ex = w?.frasi_esempio?.[0];
			if (ex) return { testo: strip(ex.testo), annotated: ex.testo !== strip(ex.testo) ? ex.testo : undefined, traduzione: pickTrans(ex.traduzione) };
		}
		return undefined;
	}

	async function openDeepDive(): Promise<void> {
		stopAutoNext();
		if (session && !session.pausedAt) session.pausedAt = Date.now();
		const recap = answeredRecap;
		const summary = questionSummaryText();
		appState.lastDeepDive = {
			title: recap?.jp ?? '',
			reading: recap?.reading,
			meaning: recap?.text,
			question: summary.question,
			correctReason: summary.correctReason,
			sentence: await buildDiveSentence().catch(() => undefined),
			dives: buildDeepDives(),
			notes: wrongChoiceNotes()
		};
		goto(`${base}/approfondisci`);
	}

	async function handleAnswer(correct: boolean, selectedText = '', isTimeout = false): Promise<void> {
		if (!quiz || quiz.answered || !session) return;
		quiz.answered = true;
		answerFeedback = correct ? 'correct' : 'wrong';
		stopAnswerTimer();

		session.answers++;
		const skill: SkillKey = quiz.itemRef.kind === 'kanji' ? 'kanji' : quiz.itemRef.kind === 'grammar' ? 'grammar' : 'words';
		session.answersByType[skill].answers++;
		if (correct) session.answersByType[skill].correct++;
		if (correct) session.correct++;
		else {
			session.wrong++;
			if (isTimeout) session.timeout++;
			// Sull'errore il timer di sessione si ferma: si riparte con "Avanti".
			if (!session.pausedAt) session.pausedAt = Date.now();
			const summary = questionSummary(quiz.question);
			session.wrongAnswers.push({
				happenedAt: Date.now(),
				itemRef: quiz.itemRef,
				questionMode: quiz.question.mode,
				prompt: summary.prompt,
				selectedAnswer: isTimeout ? '⏱ tempo scaduto' : selectedText,
				correctAnswer: summary.correct
			});
		}

		const before = getSrs(quiz.itemRef.key) ?? createInitialSrs(quiz.itemRef.key);
		// La coniugazione è una proprietà della CLASSE (conj:*), non della parola:
		// muove il contatore di classe e sposta solo la data di ripasso della parola.
		if (
			(quiz.question.mode === 'conjugation' || quiz.question.mode === 'verb-form-cloze') &&
			quiz.itemRef.kind === 'word'
		) {
			const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
			const classKey = word ? conjClassKey(word) : null;
			if (classKey) await upsertPracticeOnly(classKey, correct);
			// Se la forma è una COSTRUZIONE con significato proprio (potenziale,
			// passiva, causativa, condizionali…), accredita anche gram:<slug>:
			// così "come vado col potenziale" ha un punteggio suo.
			const gramSlug = CONSTRUCTION_BY_FORM_KEY[(quiz.question as ConjugationQuizQuestion | VerbFormClozeQuestion).formKey];
			if (gramSlug) await upsertPracticeOnly(`gram:${gramSlug}`, correct);
			await touchWordReviewDate(quiz.itemRef.key);
		} else if (quiz.question.mode === 'particle-cloze') {
			// La particella è una proprietà DELLA PARTICELLA, non della parola:
			// il contatore particella:X, la parola muove solo la data di ripasso.
			const choice = (quiz.question as ParticleClozeQuestion).correctChoice;
			if (choice) await upsertPracticeOnly(`particella:${choice}`, correct);
			await touchWordReviewDate(quiz.itemRef.key);
		} else if (
			(quiz.question.mode === 'counter-quiz' || quiz.question.mode === 'counter-reading') &&
			quiz.itemRef.kind === 'word'
		) {
			// Contatore chiesto SU UNA PAROLA (id_contatore_suggerito): il punteggio va
			// al contatore (solo pratica), la parola muove solo la data di ripasso.
			// I contatori "due" dal pool (kind==='counter') NON entrano qui: restano SRS
			// vero (else → upsertSrs), altrimenti perderebbero l'avanzamento di stage.
			const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
			const counterKey = word?.id_contatore_suggerito ? `counter:${word.id_contatore_suggerito}` : null;
			if (counterKey) await upsertPracticeOnly(counterKey, correct);
			await touchWordReviewDate(quiz.itemRef.key);
		} else if (quiz.question.mode === 'time-reading') {
			// L'orario non ha un'entità propria: tocca solo la data di ripasso della parola.
			await touchWordReviewDate(quiz.itemRef.key);
		} else if (session.weak) {
			// Ripasso punti deboli: consolida davvero (mastery) ma senza stage/XP,
			// come Consolida — il calendario SRS resta governato dal quiz normale.
			await upsertPracticeOnly(quiz.itemRef.key, correct);
		} else {
			await upsertSrs(quiz.itemRef.key, correct);
		}
		// Sfaccettatura della parola (modello Nation): ogni domanda su una parola
		// muove anche la cella che allena (per coniugazione/particella è il
		// secondo incremento: la classe sopra, l'Uso della parola qui).
		if (quiz.itemRef.kind === 'word') {
			const facetField = facetOfMode(quiz.question.mode);
			if (facetField) {
				const row = getSrs(quiz.itemRef.key);
				if (row) {
					const withFacet = bumpFacet(row, facetField, correct);
					await db.srs_progress.put(withFacet);
					srsMap.set(quiz.itemRef.key, withFacet);
				}
			}
		}

		if (!session.weak) {
			const xpBreakdown = calculateQuizXp({
				quizMode: quiz.question.mode,
				isCorrect: correct,
				responseTimeMs: Date.now() - quiz.startedAt,
				jlptLevel: (quiz.question as MultipleChoiceQuestion).wordId
					? (words.find((w) => w.id === (quiz!.question as MultipleChoiceQuestion).wordId)?.livello_jlpt ?? 'N5')
					: 'N5',
				srsStage: before.srs_stage,
				completedCustomGroup: false
			});
			session.xp += correct ? xpBreakdown.total : -6;
			await addXp(correct ? xpBreakdown.total : -6);
		}

		// TTS (silenziato in modalità muta: niente audio automatico)
		if (!appState.quizMuted) {
			if (quiz.question.mode === 'particle-cloze' || quiz.question.mode === 'transitivity-pair' || quiz.question.mode === 'verb-form-cloze') {
				speakSentenceJapanese((quiz.question as ParticleClozeQuestion).fullSentence);
			} else if (quiz.question.mode === 'conjugation' || quiz.question.mode === 'counter-reading' || quiz.question.mode === 'time-reading') {
				speakSentenceJapanese((quiz.question as ConjugationQuizQuestion).correctChoice);
			} else if (quiz.itemRef.kind === 'word') {
				const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
				if (word) speakWordReading(word);
			} else if (quiz.question.mode === 'sentence-ordering') {
				speakSentenceJapanese((quiz.question as SentenceOrderingQuestion).correctOrder.join(''));
			}
		}

		if (correct) startAutoNext();
	}

	function handleChoiceClick(choice: string): void {
		if (!quiz || quiz.answered) return;
		const q = quiz.question;
		let correct = false;
		if (q.mode === 'multiple-choice') correct = choice === (q as MultipleChoiceQuestion).correctChoice;
		else if (q.mode === 'flashcard-recognition' || q.mode === 'flashcard-reading-recognition')
			correct = choice === (q as FlashcardQuestion).correctAnswer;
		else if (q.mode === 'cloze') correct = choice === (q as ClozeQuestion).correctChoice;
		else if (q.mode === 'reading-choice') correct = choice === (q as ReadingChoiceQuestion).correctChoice;
		else if (q.mode === 'listening') correct = choice === (q as ListeningQuestion).correctChoice;
		else if (q.mode === 'particle-cloze') correct = choice === (q as ParticleClozeQuestion).correctChoice;
		else if (q.mode === 'verb-form-cloze') correct = choice === (q as VerbFormClozeQuestion).correctChoice;
		else if (q.mode === 'counter-quiz') correct = choice === (q as CounterQuestion).correctChoice;
		else if (q.mode === 'conjugation') correct = choice === (q as ConjugationQuizQuestion).correctChoice;
		else if (q.mode === 'transitivity-pair') correct = choice === (q as TransitivityPairQuestion).correctChoice;
		else if (q.mode === 'counter-reading') correct = choice === (q as CounterReadingQuestion).correctChoice;
		else if (q.mode === 'time-reading') correct = choice === (q as TimeReadingQuestion).correctChoice;
		handleAnswer(correct, choice);
	}

	function handleSentenceOrderSubmit(): void {
		if (!quiz || quiz.answered || bankTokens.length > 0) return;
		const q = quiz.question as SentenceOrderingQuestion;
		const correct = answerTokens.join('') === q.correctOrder.join('');
		handleAnswer(correct, answerTokens.join(''));
	}

	// Composizione: il banco contiene intrusi, quindi non si aspetta che sia
	// vuoto — si conferma quando i caratteri scelti sono almeno quelli attesi.
	function handleCompositionSubmit(): void {
		if (!quiz || quiz.answered || answerTokens.length === 0) return;
		const q = quiz.question as CompositionQuestion;
		handleAnswer(answerTokens.join('') === q.correctAnswer, answerTokens.join(''));
	}

	// 🎤 spoken-production: ascolta e confronta. UN SOLO gruppo che unisce
	// scrittura e lettura (dire l'una O l'altra basta — due gruppi separati
	// richiederebbero erroneamente entrambe nella stessa frase).
	async function recordSpokenAnswer(): Promise<void> {
		if (!quiz || quiz.answered || micState !== 'idle') return;
		const q = quiz.question as SpokenProductionQuestion;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (!quiz || quiz.answered) return;
		if (alts.length === 0) {
			heard = '（niente capito, riprova）';
			return;
		}
		heard = alts[0]!;
		const ok = speechMatches(alts, [[...phraseVariants(q.expectedWriting), ...phraseVariants(q.expectedReading)]]);
		handleAnswer(ok, heard);
	}

	function pickFromBank(index: number): void {
		const token = bankTokens[index];
		if (token === undefined) return;
		answerTokens = [...answerTokens, token];
		bankTokens = bankTokens.filter((_, i) => i !== index);
	}

	function returnToBank(index: number): void {
		const token = answerTokens[index];
		if (token === undefined) return;
		bankTokens = [...bankTokens, token];
		answerTokens = answerTokens.filter((_, i) => i !== index);
	}

	function resetOrdering(): void {
		bankTokens = [...bankTokens, ...answerTokens];
		answerTokens = [];
	}

	// Scorciatoie: 1-4 scelgono la risposta, Invio rivela/conferma/avanza.
	function handleKeydown(e: KeyboardEvent): void {
		if (phase !== 'quiz' || !quiz) return;
		const target = e.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

		if (e.key === 'Enter') {
			e.preventDefault();
			if (quiz.answered) { advanceToNext(); return; }
			if (quiz.question.mode === 'flashcard-production' && !revealedProduction) {
				revealedProduction = true;
				return;
			}
			if (quiz.question.mode === 'sentence-ordering' && bankTokens.length === 0) {
				handleSentenceOrderSubmit();
			}
			if (quiz.question.mode === 'composition') {
				handleCompositionSubmit();
			}
			return;
		}

		const num = Number(e.key);
		if (!Number.isInteger(num) || num < 1 || num > 4 || quiz.answered) return;
		const q = quiz.question;
		if (q.mode === 'flashcard-production') {
			if (!revealedProduction) return;
			if (num === 1) handleAnswer(true, 'Ricordata');
			else if (num === 2) handleAnswer(false, 'Non ricordata');
			return;
		}
		if (q.mode === 'sentence-ordering' || q.mode === 'composition' || q.mode === 'spoken-production') return;
		const choice = (q.choices ?? [])[num - 1];
		if (choice) handleChoiceClick(choice);
	}

	// ── Init ─────────────────────────────────────────────────────────────────────
	async function startSession(): Promise<void> {
		loadError = '';
		appState.lastSummary = null;
		finishedEverything = false;
		poolFullyExhausted = false;
		try {
			[words, kanjiRows, grammarRows, counterRows, objectives] = await Promise.all([
				db.words.toArray(),
				db.kanji.toArray(),
				db.grammar.toArray(),
				db.counters.toArray(),
				db.study_objectives.toArray()
			]);
			const srsRows = await db.srs_progress.toArray();
			srsMap = new Map(srsRows.map((s) => [s.id_item, s]));
			distractorIndex = await preloadDistractorIndex();
			context = {
				locale,
				wordsById: new Map(words.map((w) => [w.id, w])),
				grammarById: new Map(grammarRows.map((g) => [g.id, g]))
			};

			const now = Date.now();
			const wantWeak = new URLSearchParams(window.location.search).has('deboli');

			// Riprende una sessione ancora in corso (es. ritorno da "Approfondisci"),
			// recuperando il tempo di pausa se il timer era fermo nel dettaglio.
			// SOLO se dello stesso tipo: una sessione ripasso-deboli avanzata non
			// deve "catturare" un /quiz normale (coda vuota → finto "tutto fatto").
			const existing = appState.sessionState;
			if (existing && Boolean(existing.weak) === wantWeak) {
				if (existing.pausedAt) {
					existing.deadlineAt += now - existing.pausedAt;
					existing.pausedAt = null;
				}
				if (now < existing.deadlineAt) {
					session = existing;
					phase = 'quiz';
					startTimer();
					await advanceToNext();
					return;
				}
				appState.sessionState = null;
			} else if (existing) {
				appState.sessionState = null;
			}

			const durationMs = (appState.settings.session_duration_minutes || 5) * 60_000;
			// /quiz?deboli=1 → sessione di ripasso dei punti deboli: stessa
			// esperienza quiz, ma coda dai punti deboli e punteggio solo-pratica.
			const weakQueue = wantWeak
				? (await loadWeakItems()).filter((it) => it.kind !== 'phrase').map(({ kind, raw }) => ({ kind, raw }))
				: undefined;
			session = {
				startedAt: now,
				deadlineAt: now + durationMs,
				answers: 0,
				correct: 0,
				wrong: 0,
				timeout: 0,
				xp: 0,
				pausedAt: null,
				wrongAnswers: [],
				answersByType: emptySkillCounts(),
				weak: wantWeak || undefined,
				weakQueue
			};
			appState.sessionState = session;
			phase = 'quiz';
			startTimer();

			await advanceToNext();
		} catch (e) {
			loadError = String(e);
		}
	}

	// Segna, prima di seguire il link, che stiamo per andare a rivedere un
	// errore dal riepilogo: al ritorno vogliamo ritrovare lo stesso riepilogo,
	// non ripartire da capo. Qualunque altro modo di arrivare su /quiz (Home,
	// un altro link…) deve invece avviare subito una sessione nuova.
	function markReviewReturn(): void {
		try { sessionStorage.setItem('quizReviewReturn', '1'); } catch { /* storage non disponibile */ }
	}

	function boot(): void {
		let expectingReturn = false;
		try {
			if (sessionStorage.getItem('quizReviewReturn') === '1') {
				sessionStorage.removeItem('quizReviewReturn');
				expectingReturn = true;
			}
		} catch { /* storage non disponibile */ }
		// Riepilogo ancora aperto SOLO se stavamo tornando dal dettaglio di un
		// errore appena cliccato: altrimenti (Home, un'altra sessione…) si parte
		// sempre da capo, senza mostrare il riepilogo di una sessione passata.
		if (expectingReturn && !appState.sessionState && appState.lastSummary) {
			summarySession = appState.lastSummary;
			phase = 'summary';
			void loadSummaryExtras(summarySession.answers, summarySession.correct, false);
			return;
		}
		appState.lastSummary = null;
		startSession();
	}

	onMount(() => {
		canSpeak = speechAvailable();
		if (appState.initialized) boot();
		else {
			const stop = $effect.root(() => {
				$effect(() => { if (appState.initialized) { boot(); stop(); } });
			});
		}
	});

	onDestroy(() => {
		clearTimers();
		if (session) {
			if (!appState.settings.session_timer_runs_in_detail && !session.pausedAt) {
				session.pausedAt = Date.now();
			}
			appState.sessionState = session;
		}
	});

	// ── Derived UI ────────────────────────────────────────────────────────────────
	// Furigana d'aiuto (opzionale, Impostazioni): la parola può contenere un
	// kanji classificato più avanti del suo livello — mostriamo la lettura
	// solo in quel caso, solo nel "produci la parola" dove è nascosta.
	const kanjiById = $derived(new Map(kanjiRows.map((k) => [k.id, k])));
	const currentQuizWord = $derived.by(() => {
		if (!quiz || quiz.itemRef.kind !== 'word') return null;
		return context?.wordsById.get(quiz.itemRef.key.replace('word:', '')) ?? null;
	});
	const showAdvancedFurigana = $derived(
		Boolean(appState.settings.furigana_kanji_avanzati && currentQuizWord && wordHasAdvancedKanji(currentQuizWord, kanjiById))
	);

	const timeLeftLabel = $derived.by(() => {
		if (!session) return '';
		const ref = session.pausedAt ?? nowTick;
		const ms = Math.max(0, session.deadlineAt - ref);
		const mins = Math.floor(ms / 60_000);
		const secs = Math.floor((ms % 60_000) / 1000);
		return `${session.pausedAt ? '⏸️ ' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
	});

	const accuracy = $derived(() => {
		if (!summarySession || summarySession.answers === 0) return 0;
		return Math.round((summarySession.correct / summarySession.answers) * 100);
	});

	function getTier(acc: number): string {
		if (acc >= 90) return '🏆 Legend';
		if (acc >= 75) return '🥇 Gold';
		if (acc >= 55) return '🥈 Silver';
		return '🥉 Bronze';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- INIT PHASE -->
{#if phase === 'init'}
<div class="quiz-init">
	{#if loadError}
		<p class="error-text">Errore: {loadError}</p>
	{:else}
		<p class="muted-text">Caricamento sessione…</p>
	{/if}
</div>

<!-- QUIZ PHASE -->
{:else if phase === 'quiz' && quiz}
<div class="quiz-shell">
	<div class="quiz-topbar">
		<div class="session-stats">
			<span class="stat-chip">✅ {session?.correct ?? 0}</span>
			<span class="stat-chip bad">❌ {session?.wrong ?? 0}</span>
		</div>
		<div class="timer" title="Tempo sessione">{timeLeftLabel}</div>
		<div class="topbar-actions">
			<button
				class="ghost-btn"
				class:muted-on={appState.quizMuted}
				onclick={() => (appState.quizMuted = !appState.quizMuted)}
				aria-pressed={appState.quizMuted}
				title={appState.quizMuted ? 'Riattiva audio' : 'Silenzia audio (niente ascolto, niente audio risposte)'}
			>
				{appState.quizMuted ? '🔇' : '🔊'}
			</button>
			{#if !quiz.answered}
				<button
					class="ghost-btn {sessionPaused ? 'ctrl-resume' : 'ctrl-pause'}"
					onclick={toggleSessionPause}
					title={sessionPaused ? 'Riprendi la sessione' : 'Metti in pausa: nasconde la domanda e ferma i timer'}
				>
					{sessionPaused ? '▶️' : '⏸️'}
				</button>
			{/if}
			<button class="ghost-btn ctrl-stop" onclick={confirmEndSession} title="Termina sessione">⏹️</button>
		</div>
	</div>

	<div class="quiz-meta">
		{#if session?.weak}🔁 PUNTI DEBOLI • {/if}{quiz.itemRef.kind.toUpperCase()}
		{#if quiz.question.mode !== 'sentence-ordering' && quiz.question.mode !== 'cloze'}
			• {quiz.question.mode.replace(/-/g, ' ')}
		{/if}
	</div>

	{#key quiz.startedAt}
	<article class="quiz-card" class:correct={answerFeedback === 'correct'} class:wrong={answerFeedback === 'wrong'}>
		{#if sessionPaused}
			<div class="paused-overlay">
				<p class="paused-msg">⏸️ Sessione in pausa</p>
				<p class="paused-hint">Timer fermi, domanda nascosta finché non riprendi.</p>
				<button class="proceed-btn" onclick={toggleSessionPause}>▶️ Riprendi</button>
			</div>
		{:else}
		{#if !quiz.answered && answerRemainingS > 0}
			<div class="answer-timer" class:answer-timer-low={answerRemainingS <= 5} title="Tempo per rispondere">
				⏱ {answerRemainingS.toFixed(1)}s
			</div>
		{/if}
		<!-- flashcard-production -->
		{#if quiz.question.mode === 'flashcard-production'}
			{@const q = quiz.question as FlashcardQuestion}
			<p class="question-prompt ja-text">
				{#if showAdvancedFurigana && currentQuizWord}
					<ruby>{q.prompt}<rt class="advanced-furigana">{currentQuizWord.lettura}</rt></ruby>
				{:else}
					{q.prompt}
				{/if}
			</p>
			<p class="question-hint">Produci significato e pronuncia</p>
			{#if !quiz.answered}
				{#if !revealedProduction}
					<button class="choice-btn" onclick={() => revealedProduction = true}>Mostra soluzione</button>
				{:else}
					<div class="solution">{q.correctAnswer}</div>
					<div class="production-btns">
						<button class="choice-btn good" onclick={() => handleAnswer(true, 'Ricordata')}>✅ Ricordata</button>
						<button class="choice-btn bad" onclick={() => handleAnswer(false, 'Non ricordata')}>❌ Non ricordata</button>
					</div>
				{/if}
			{:else}
				<div class="solution">{q.correctAnswer}</div>
			{/if}

		<!-- flashcard-recognition / reading-recognition -->
		{:else if quiz.question.mode === 'flashcard-recognition' || quiz.question.mode === 'flashcard-reading-recognition'}
			{@const q = quiz.question as FlashcardQuestion}
			<p class="question-prompt">{q.prompt}</p>
			<p class="question-hint">{quiz.question.mode === 'flashcard-reading-recognition' ? 'Scegli la scrittura corretta' : 'Scegli la parola giusta'}</p>
			<div class="choices ja-choices">
				{#each (q.choices ?? []) as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctAnswer}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctAnswer}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- multiple-choice -->
		{:else if quiz.question.mode === 'multiple-choice'}
			{@const q = quiz.question as MultipleChoiceQuestion}
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">Scegli il significato corretto</p>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- sentence-ordering -->
		{:else if quiz.question.mode === 'sentence-ordering'}
			{@const q = quiz.question as SentenceOrderingQuestion}
			<p class="question-prompt">{q.prompt}</p>
			<p class="question-hint">Componi la frase toccando le parole nell'ordine giusto. Tocca una parola nella frase per rimetterla giù.</p>
			<div class="answer-area" class:answer-filled={answerTokens.length > 0}>
				{#if answerTokens.length === 0}
					<span class="answer-placeholder">La frase apparirà qui…</span>
				{/if}
				{#each answerTokens as tok, i}
					<button class="token token-picked" disabled={quiz.answered} onclick={() => returnToBank(i)}>{tok}</button>
				{/each}
			</div>
			<div class="token-area">
				{#each bankTokens as tok, i}
					<button class="token" disabled={quiz.answered} onclick={() => pickFromBank(i)}>{tok}</button>
				{/each}
				{#if bankTokens.length === 0 && !quiz.answered}
					<span class="bank-done">Tutte le parole usate ✓</span>
				{/if}
			</div>
			{#if !quiz.answered}
				<div class="ordering-actions">
					<button class="ghost-btn" onclick={resetOrdering} disabled={answerTokens.length === 0}>↺ Ricomincia</button>
					<button class="choice-btn confirm-order" onclick={handleSentenceOrderSubmit} disabled={bankTokens.length > 0}>
						Conferma frase
					</button>
				</div>
			{:else}
				<div class="solution">{q.correctOrder.join('')}</div>
			{/if}

		<!-- composizione: componi la parola coi caratteri (con intrusi) -->
		{:else if quiz.question.mode === 'composition'}
			{@const q = quiz.question as CompositionQuestion}
			<p class="question-prompt">{q.prompt}</p>
			{#if q.reading}<p class="question-hint">Lettura: {q.reading}</p>{/if}
			<p class="question-hint">✍️ Componi la parola toccando i caratteri nell'ordine giusto — attento agli intrusi. Tocca un carattere scelto per rimetterlo giù.</p>
			<div class="answer-area" class:answer-filled={answerTokens.length > 0}>
				{#if answerTokens.length === 0}
					<span class="answer-placeholder">La parola apparirà qui…</span>
				{/if}
				{#each answerTokens as tok, i}
					<button class="token token-picked" disabled={quiz.answered} onclick={() => returnToBank(i)}>{tok}</button>
				{/each}
			</div>
			<div class="token-area">
				{#each bankTokens as tok, i}
					<button class="token" disabled={quiz.answered} onclick={() => pickFromBank(i)}>{tok}</button>
				{/each}
			</div>
			{#if !quiz.answered}
				<div class="ordering-actions">
					<button class="ghost-btn" onclick={resetOrdering} disabled={answerTokens.length === 0}>↺ Ricomincia</button>
					<button class="choice-btn confirm-order" onclick={handleCompositionSubmit} disabled={answerTokens.length === 0}>
						Conferma parola
					</button>
				</div>
			{:else}
				<div class="solution">{q.correctAnswer}{q.reading ? `（${q.reading}）` : ''}</div>
			{/if}

		<!-- spoken-production: pronuncia la parola al microfono -->
		{:else if quiz.question.mode === 'spoken-production'}
			{@const q = quiz.question as SpokenProductionQuestion}
			<p class="question-prompt">{q.prompt}</p>
			{#if q.warningMultipleDefinitions}<p class="question-hint">Più parole possibili: vale quella di questa carta.</p>{/if}
			<p class="question-hint">🎤 Di' la parola in giapponese ad alta voce.</p>
			{#if !quiz.answered}
				<button class="choice-btn mic-btn" class:listening={micState === 'listening'} onclick={recordSpokenAnswer} disabled={micState !== 'idle'}>
					{micState === 'listening' ? '🎙️ Ti ascolto…' : '🎤 Parla ora'}
				</button>
				{#if heard}
					<HeardDiff {heard} candidates={[q.expectedWriting, q.expectedReading]} />
				{/if}
			{:else}
				<div class="solution">{q.expectedWriting}（{q.expectedReading}）</div>
				{#if heard}
					<HeardDiff {heard} candidates={[q.expectedWriting, q.expectedReading]} />
				{/if}
			{/if}

		<!-- reading-choice -->
		{:else if quiz.question.mode === 'reading-choice'}
			{@const q = quiz.question as ReadingChoiceQuestion}
			<p class="question-hint">Come si legge la parte evidenziata?</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="reading-sentence">{@html q.sentenceHtml}</div>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- listening -->
		{:else if quiz.question.mode === 'listening'}
			{@const q = quiz.question as ListeningQuestion}
			<p class="question-hint">Ascolta e scegli la scrittura corretta</p>
			<button class="listen-btn" onclick={() => speakSentenceJapanese(q.readingToSpeak)}>
				🔊 Riascolta
			</button>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- transitivity-pair -->
		{:else if quiz.question.mode === 'transitivity-pair'}
			{@const q = quiz.question as TransitivityPairQuestion}
			<p class="question-hint">Quale verbo serve qui? Attento a chi agisce (が/を)</p>
			<p class="question-prompt ja-sentence">{quiz.answered ? q.fullSentence : q.sentenceWithBlank}</p>
			{#if quiz.answered}<p class="question-hint">{q.translation}</p>{/if}
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- counter-reading / time-reading -->
		{:else if quiz.question.mode === 'counter-reading' || quiz.question.mode === 'time-reading'}
			{@const q = quiz.question as CounterReadingQuestion | TimeReadingQuestion}
			<p class="question-hint">Come si legge?</p>
			<p class="question-prompt ja-text">{q.prompt}</p>
			{#if quiz.question.mode === 'time-reading'}
				<p class="question-hint">{(quiz.question as TimeReadingQuestion).hint}</p>
			{/if}
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- particle-cloze -->
		{:else if quiz.question.mode === 'particle-cloze'}
			{@const q = quiz.question as ParticleClozeQuestion}
			<p class="question-hint">Cosa completa la frase?</p>
			<p class="question-prompt ja-sentence">{quiz.answered ? q.fullSentence : q.sentenceWithBlank}</p>
			{#if quiz.answered}<p class="question-hint">{q.translation}</p>{/if}
			<div class="choices ja-choices particle-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- verb-form-cloze: quale FORMA del verbo completa la frase -->
		{:else if quiz.question.mode === 'verb-form-cloze'}
			{@const q = quiz.question as VerbFormClozeQuestion}
			<p class="question-hint">Quale forma completa la frase?</p>
			<p class="question-prompt ja-sentence">{quiz.answered ? q.fullSentence : q.sentenceWithBlank}</p>
			{#if quiz.answered}<p class="question-hint">{q.translation}</p>{/if}
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- counter-quiz -->
		{:else if quiz.question.mode === 'counter-quiz'}
			{@const q = quiz.question as CounterQuestion}
			<p class="question-hint">Con quale contatore si conta?</p>
			<p class="question-prompt ja-text">{q.prompt}</p>
			<p class="question-hint">{q.promptMeaning}</p>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- conjugation -->
		{:else if quiz.question.mode === 'conjugation'}
			{@const q = quiz.question as ConjugationQuizQuestion}
			<p class="question-hint">Coniuga il verbo/aggettivo</p>
			<p class="question-prompt ja-text">{q.dictionary}</p>
			<p class="question-hint">→ {q.formLabel}</p>
			<div class="choices ja-choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						class:wrong-choice={quiz.answered && answerFeedback === 'wrong' && choice !== q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>

		<!-- cloze -->
		{:else}
			{@const q = quiz.question as ClozeQuestion}
			<p class="question-hint">Completa la frase:</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="question-prompt">{@html q.sentenceWithBlank}</p>
			<div class="choices">
				{#each q.choices as choice, i}
					<button
						class="choice-btn"
						class:correct-choice={quiz.answered && choice === q.correctChoice}
						disabled={quiz.answered}
						onclick={() => handleChoiceClick(choice)}
					><kbd class="key-hint">{i + 1}</kbd>{choice}</button>
				{/each}
			</div>
		{/if}

		{#if !quiz.answered && quiz.question.mode !== 'flashcard-production'}
			<button class="dontknow-btn" onclick={() => handleAnswer(false, 'Non la so', true)}>
				🤷 Non la so
			</button>
		{/if}

		{#if quiz.answered && answerFeedback}
			<div class="feedback-bar" class:feedback-correct={answerFeedback === 'correct'} class:feedback-wrong={answerFeedback === 'wrong'}>
				{answerFeedback === 'correct' ? '✅ Corretto!' : '❌ Sbagliato'}
			</div>
			{#if answeredRecap}
				<div class="answer-recap">
					<span class="recap-jp">{answeredRecap.jp}</span>
					{#if answeredRecap.reading}<span class="recap-reading">{answeredRecap.reading}</span>{/if}
					<span class="recap-meaning">{answeredRecap.text}</span>
				</div>
			{/if}
			<div class="after-actions">
				{#if buildDeepDives().length > 0}
					<button class="dives-toggle" onclick={openDeepDive}>🔍 Approfondisci</button>
				{/if}
				<button
					class="skip-btn"
					style="--countdown-progress: {Math.round(autoNextProgress * 100)}%"
					onclick={advanceToNext}
				>
					{autoNextRemainingS > 0 ? `Avanti (${autoNextRemainingS.toFixed(1)}s) →` : 'Avanti →'}
				</button>
			</div>
		{/if}
		{/if}
	</article>
	{/key}
</div>

<!-- SUMMARY PHASE -->
{:else if phase === 'summary' && summarySession}
<div class="summary-shell">
	<div class="summary-card">
		{#if summarySession.answers > 0}
			<div class="summary-tier">{getTier(accuracy())}</div>
		{/if}
		<h2 class="summary-title">{summarySession.weak ? '🔁 Giro di ripasso completato!' : finishedEverything ? '🎉 Tutto fatto per oggi!' : 'Sessione completata!'}</h2>
		{#if summarySession.weak}
			<p class="summary-hint">Hai passato in rassegna i tuoi punti deboli — la lista si è già riordinata. Un altro giro da <a href="{base}/punti-deboli">Punti deboli</a> quando vuoi.</p>
		{:else if finishedEverything}
			{#if poolFullyExhausted}
				<p class="summary-hint">Hai visto già tutto quello che c'è nei tuoi obiettivi attivi — non c'è altro da sbloccare oggi. Attivane altri (kanji, N4, un corso…) da <a href="{base}/">Il piano di oggi</a> per continuare, o torna domani per i ripassi. 🌙</p>
			{:else}
				<p class="summary-hint">Hai ripassato tutto il dovuto e raggiunto il limite di carte nuove di oggi — torna domani per il resto. 🌙</p>
			{/if}
		{/if}
		{#if summaryConfetti}
			<Confetti />
		{/if}
		{#if summaryStreak && summaryStreak.giorni > 0}
			<p class="summary-streak">
				🔥 {summaryStreak.giorni} {summaryStreak.giorni === 1 ? 'giorno' : 'giorni'} di studio di fila{isMilestone(summaryStreak.giorni) ? ' — traguardo! 🎉' : ''}
			</p>
		{/if}
		{#if summaryBest}
			<p class="summary-best">🏆 Nuovo record personale di accuratezza!</p>
		{/if}
		{#if summarySession.answers > 0}
			<div class="summary-stats">
				<div class="summary-stat">
					<span class="stat-num">{summarySession.answers}</span>
					<span class="stat-label">Risposte</span>
				</div>
				<div class="summary-stat">
					<span class="stat-num">{summarySession.correct}</span>
					<span class="stat-label">Corrette</span>
				</div>
				<div class="summary-stat">
					<span class="stat-num">{accuracy()}%</span>
					<span class="stat-label">Accuracy</span>
				</div>
				<div class="summary-stat">
					<span class="stat-num">{(summarySession.xp ?? 0) >= 0 ? '+' : ''}{summarySession.xp ?? 0}</span>
					<span class="stat-label">XP</span>
				</div>
			</div>
		{/if}
		{#if summarySession.wrongAnswers.length > 0}
			<div class="summary-errors">
				<p class="errors-title">Errori da ripassare ({summarySession.wrongAnswers.length})</p>
				{#each summarySession.wrongAnswers as wa}
					{@const errorHref = wa.itemRef.kind === 'counter' ? `${base}/consolida/${encodeURIComponent(wa.itemRef.key)}` : `${base}/detail/${encodeURIComponent(wa.itemRef.key)}`}
					<a class="error-row" href={errorHref} onclick={markReviewReturn}>
						<span class="error-prompt">{wa.prompt}</span>
						<span class="error-detail">
							<span class="error-selected">{wa.selectedAnswer || '—'}</span>
							→ <span class="error-correct">{wa.correctAnswer}</span>
						</span>
					</a>
				{/each}
			</div>
		{/if}
		<div class="summary-actions">
			{#if finishedEverything && !poolFullyExhausted}
				<button class="btn-primary" onclick={() => continueWithMoreCards(5)}>➕ Continua ancora un po' (5 carte)</button>
			{:else if !finishedEverything}
				<button class="btn-primary" onclick={startSession}>🔁 Nuova sessione</button>
			{/if}
			<a href="{base}/" class="btn-ghost">← Home</a>
		</div>
	</div>
</div>
{/if}

<style>
	.quiz-shell, .quiz-init, .summary-shell {
		display: grid;
		gap: 12px;
	}

	.quiz-init {
		min-height: 200px;
		place-items: center;
	}

	.quiz-topbar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--surface);
		border-radius: 14px;
		box-shadow: 0 2px 8px rgba(14,29,51,0.07);
	}

	.session-stats { display: flex; gap: 6px; flex: 1; }

	.stat-chip {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 8px;
		background: var(--ok-bg);
		color: var(--ok-ink);
	}

	.stat-chip.bad { background: #fee2e2; color: #991b1b; }

	.timer {
		font-size: 1rem;
		font-weight: 700;
		color: var(--brand);
		font-variant-numeric: tabular-nums;
	}

	.ghost-btn {
		font-size: 0.78rem;
		padding: 4px 10px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: transparent;
		cursor: pointer;
		color: var(--muted);
	}

	.ghost-btn:hover { background: var(--line); }

	.topbar-actions { display: flex; align-items: center; gap: 4px; }

	/* Muta attiva: sfondo rosso ben visibile, non solo l'icona che cambia. */
	.ghost-btn.muted-on {
		background: var(--danger-bg);
		border-color: var(--danger);
		color: var(--danger);
	}
	.ghost-btn.muted-on:hover { background: var(--danger-bg); }

	/* Controlli sessione: colore semantico a colpo d'occhio. */
	.ghost-btn.ctrl-pause { background: var(--warn-bg); border-color: var(--warn-border); }
	.ghost-btn.ctrl-pause:hover { background: var(--warn-bg); }
	.ghost-btn.ctrl-resume { background: var(--ok-bg); border-color: var(--success); }
	.ghost-btn.ctrl-resume:hover { background: var(--ok-bg); }
	.ghost-btn.ctrl-stop { background: var(--danger-bg); border-color: var(--danger); }
	.ghost-btn.ctrl-stop:hover { background: var(--danger-bg); }

	.quiz-meta {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0 4px;
	}

	.quiz-card {
		background: var(--surface);
		border-radius: 18px;
		padding: 24px 20px;
		box-shadow: 0 4px 20px rgba(14,29,51,0.09);
		display: grid;
		gap: 12px;
		transition: box-shadow 250ms;
	}

	.quiz-card.correct { box-shadow: 0 4px 20px rgba(15,143,86,0.25); }
	.quiz-card.wrong { box-shadow: 0 4px 20px rgba(209,67,67,0.25); }

	.question-prompt {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.3;
	}

	.advanced-furigana {
		font-size: 0.4em;
		font-weight: 500;
		color: var(--muted);
	}

	.ja-text {
		font-size: 2rem;
		text-align: center;
	}

	.question-hint {
		font-size: 0.78rem;
		color: var(--muted);
		margin: 0;
	}

	.choices {
		display: grid;
		gap: 8px;
	}

	.choice-btn {
		padding: 12px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		background: var(--surface-2);
		cursor: pointer;
		font-size: 0.9rem;
		text-align: left;
		transition: all 150ms;
		color: var(--ink);
	}

	.choice-btn:hover:not(:disabled) { border-color: var(--brand); background: #eef2ff; }

	.ja-choices .choice-btn { font-size: 1.2rem; }

	.ja-sentence { font-size: 1.35rem; line-height: 1.9; text-align: center; }

	.particle-choices {
		grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
	}

	.particle-choices .choice-btn { text-align: center; font-size: 1.4rem; }

	.key-hint {
		display: inline-block;
		min-width: 1.3em;
		margin-right: 8px;
		padding: 1px 4px;
		border: 1px solid var(--line);
		border-radius: 5px;
		background: var(--surface);
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--muted);
		text-align: center;
	}

	@media (hover: none) {
		.key-hint { display: none; }
	}
	.choice-btn:disabled { cursor: default; }
	.choice-btn.good { border-color: var(--success); background: var(--ok-bg); color: var(--ok-ink); }
	.choice-btn.bad { border-color: var(--danger); background: #fee2e2; color: #991b1b; }
	.choice-btn.correct-choice { border-color: var(--success); background: var(--ok-bg); color: var(--ok-ink); }
	.choice-btn.wrong-choice { border-color: var(--danger); background: #fee2e2; color: #991b1b; }

	.solution {
		padding: 12px 16px;
		border-radius: 10px;
		background: #f0fdf4;
		border: 1px solid #86efac;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.production-btns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.answer-area {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 12px;
		border: 2px dashed var(--line);
		border-radius: 10px;
		min-height: 56px;
	}

	.answer-area.answer-filled { border-style: solid; border-color: var(--brand); }

	.answer-placeholder { font-size: 0.82rem; color: var(--muted); }

	.token-area {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		min-height: 56px;
	}

	.bank-done { font-size: 0.82rem; color: var(--success); font-weight: 600; }

	.token {
		padding: 8px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 1.15rem;
		min-height: 44px;
		cursor: pointer;
	}

	.token:hover:not(:disabled) { background: #dde6ff; }

	.token-picked {
		background: var(--brand);
		color: #fff;
	}

	.token-picked:hover:not(:disabled) { opacity: 0.85; background: var(--brand); }

	.ordering-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.confirm-order {
		flex: 1;
		max-width: 240px;
		text-align: center;
		font-weight: 700;
	}

	.confirm-order:disabled { opacity: 0.45; }

	/* 🎤 spoken-production: bottone microfono, pulsa mentre ascolta */
	.mic-btn { text-align: center; font-weight: 700; }
	.mic-btn.listening { animation: mic-pulse 1s ease-in-out infinite; border-color: var(--brand); }
	@keyframes mic-pulse {
		0%, 100% { background: var(--surface); }
		50% { background: rgba(107, 160, 242, 0.2); }
	}

	.listen-btn {
		justify-self: center;
		padding: 14px 28px;
		border-radius: 12px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
	}

	.listen-btn:hover { background: var(--brand); color: #fff; }

	.reading-sentence {
		font-size: 1.1rem;
		line-height: 1.8;
		padding: 10px;
		background: var(--surface-2);
		border-radius: 8px;
	}

	.dontknow-btn {
		justify-self: center;
		padding: 6px 14px;
		border: 1px dashed var(--line);
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.dontknow-btn:hover { border-color: var(--danger); color: var(--danger); }

	.answer-recap {
		display: grid;
		gap: 2px;
		padding: 10px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface-2);
		text-align: center;
	}

	.recap-jp { font-size: 1.5rem; font-weight: 700; }

	.recap-reading { font-size: 0.95rem; color: var(--brand); }

	.recap-meaning { font-size: 0.85rem; color: var(--muted); }

	.feedback-bar {
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 600;
		text-align: center;
	}

	.feedback-correct { background: var(--ok-bg); color: var(--ok-ink); }
	.feedback-wrong { background: #fee2e2; color: #991b1b; }

	.after-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.dives-toggle {
		padding: 8px 14px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--ink);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.dives-toggle:hover { border-color: var(--brand); }

	.skip-btn {
		--countdown-progress: 0%;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: linear-gradient(
			90deg,
			rgba(14, 165, 160, 0.24) var(--countdown-progress),
			transparent var(--countdown-progress)
		);
		color: var(--brand);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.skip-btn:hover { background: var(--brand); color: #fff; }

	.answer-timer {
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
		padding: 2px 6px 2px 10px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
	}

	.answer-timer-low { color: var(--danger); border-color: var(--danger); }

	.paused-overlay {
		display: grid;
		gap: 10px;
		justify-items: center;
		padding: 30px 12px;
		text-align: center;
	}
	.paused-msg { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--muted); }
	.paused-hint { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.proceed-btn {
		padding: 10px 22px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: var(--brand);
		color: #fff;
		font-weight: 600;
		cursor: pointer;
	}

	/* Summary */
	.summary-shell {
		place-items: center;
		min-height: 70vh;
	}

	.summary-card {
		background: var(--surface);
		border-radius: 20px;
		padding: 32px 28px;
		box-shadow: 0 8px 32px rgba(14,29,51,0.12);
		text-align: center;
		display: grid;
		gap: 16px;
		max-width: 360px;
		width: 100%;
	}

	.summary-tier { font-size: 2rem; }
	.summary-title { margin: 0; font-size: 1.3rem; font-weight: 700; }
	.summary-streak { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--warn-ink); }
	.summary-hint { margin: 0; font-size: 0.85rem; color: var(--muted); text-align: center; }
	.summary-best { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--success); }

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 12px 6px;
		background: var(--surface-2);
		border-radius: 10px;
		border: 1px solid var(--line);
	}

	.stat-num { font-size: 1.4rem; font-weight: 700; color: var(--brand); }
	.stat-label { font-size: 0.68rem; color: var(--muted); }

	.summary-errors {
		display: grid;
		gap: 6px;
		text-align: left;
	}

	.errors-title {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.error-row {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		text-decoration: none;
		color: var(--ink);
	}

	.error-row:hover { border-color: var(--brand); background: #eef2ff; }

	.error-prompt { font-size: 0.92rem; font-weight: 600; }

	.error-detail { font-size: 0.78rem; color: var(--muted); }

	.error-selected { color: var(--danger); text-decoration: line-through; }

	.error-correct { color: var(--success); font-weight: 600; }

	.summary-actions {
		display: grid;
		gap: 8px;
	}

	.btn-primary {
		padding: 12px;
		border-radius: 10px;
		background: var(--brand);
		color: #fff;
		border: none;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-primary:hover { opacity: 0.9; }

	.btn-ghost {
		display: block;
		padding: 10px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		text-decoration: none;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.muted-text { color: var(--muted); }
	.error-text { color: var(--danger); }
</style>
