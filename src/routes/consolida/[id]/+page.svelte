<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { createInitialSrs, applyPracticeReview, normalizePracticeOnlyMastery } from '$lib/core/srs';
	import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from '$lib/core/i18n';
	import { speakWordReading, speakSentenceJapanese, speakSentenceJapaneseAsync } from '$lib/core/tts';
	import { speechAvailable, listenJapanese, speechMatches, sentenceMatchVariants } from '$lib/core/speech';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import TokenCompose from '$lib/components/TokenCompose.svelte';
	import {
		createCompositionQuestion,
		createFlashcardRecognitionQuestion,
		createFlashcardReadingRecognitionQuestion,
		createMultipleChoiceQuestion,
		createConjugationQuizQuestion,
		createParticleClozeQuestion,
		createCounterQuestion,
		createCounterDrillQuestion,
		createTransitivityPairQuestion,
		createGrammarQuestion,
		shuffle
	} from '$lib/quiz/engine';
	import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
	import { choicesOf, correctOf, promptOf } from '$lib/quiz/questionView';
	import { DEFAULT_KNOWN_FORMS, conjClassKey, CONJ_CLASS_LABELS, CONSTRUCTION_BY_FORM_KEY } from '$lib/core/conjugation';
	import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
	import { blankSentence } from '$lib/core/usage';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { SITUATIONS, type UsefulPhrase } from '$lib/core/usefulPhrases';
	import { curatedByParticle, curatedByWord, curatedByGram, curatedToQuestion } from '$lib/data/propedeutiche';
	import type { Word, Counter } from '$lib/types/models';
	import type { QuizContext, DistractorIndex, QuizQuestion } from '$lib/quiz/types';

	const locale = detectUserLocale();
	const wordId = $derived($page.params.id ?? '');

	let word = $state<Word | null>(null);
	let kanjiChar = $state<string | null>(null);
	let grammarMode = $state(false);
	let counterMode = $state(false);
	let phrase = $state<UsefulPhrase | null>(null);
	let phraseJudged = $state(false);
	let phraseStep = $state<'ready' | 'listening' | 'said' | 'revealed'>('ready');
	let canSpeak = $state(false);
	let heard = $state('');
	let lastOk = $state<boolean | null>(null);
	// item SRS che questa sessione consolida (pratica: muove solo il mastery)
	let srsTarget = $state<string | null>(null);
	// drill "di classe" (conj:*/particella:*): sottotitolo dedicato nell'header
	let classDrillSub = $state<string | null>(null);
	let classDrillPct = $state<number | null>(null);
	let title = $state('');
	let queue = $state<QuizQuestion[]>([]);
	let idx = $state(0);
	let picked = $state<string | null>(null);
	let revealed = $state(false);
	let score = $state({ ok: 0, tot: 0 });
	let loading = $state(true);

	const current = $derived(queue[idx] ?? null);

	// ✍️ composizione: banco/risposta a token (come nel quiz). Setup IMPERATIVO
	// al cambio di domanda (setupComp da next/build), non con $effect: l'effect
	// rigirava a ogni interazione (le sue dipendenze si invalidavano coi proxy)
	// e resettava il banco — i token cliccati "non si componevano" (bug 17/07).
	let compBank = $state<string[]>([]);
	let compAnswer = $state<string[]>([]);
	// mappa parole per recuperare la frase d'esempio alla rivelazione (anche nei
	// drill di kanji, dove la domanda può essere su una parola diversa da `word`)
	let wordsById = $state<Map<string, Word>>(new Map());

	// frase da mostrare/ascoltare alla fine: la frase della domanda se c'è,
	// altrimenti (composizione) la prima frase d'esempio della parola.
	function revealSentence(q: QuizQuestion | null): { jp: string; it: string } | null {
		if (!q) return null;
		if ('fullSentence' in q && q.fullSentence) {
			return { jp: q.fullSentence, it: 'translation' in q && q.translation ? q.translation : '' };
		}
		if ('wordId' in q && q.wordId) {
			const ex = wordsById.get(q.wordId)?.frasi_esempio?.[0];
			if (ex) return { jp: stripFuriganaNotation(ex.testo), it: pickLocalizedText(ex.traduzione, locale) };
		}
		return null;
	}
	function setupComp(): void {
		const q = queue[idx];
		if (q?.mode === 'composition') {
			compBank = [...q.tokens];
			compAnswer = [];
		}
	}
	function compSubmit(): void {
		if (!current || current.mode !== 'composition' || revealed || compAnswer.length === 0) return;
		const correct = compAnswer.join('') === current.correctAnswer;
		picked = compAnswer.join('');
		revealed = true;
		score = { ok: score.ok + (correct ? 1 : 0), tot: score.tot + 1 };
		void recordPractice(correct);
		speakSentenceJapanese(current.correctAnswer);
	}

	async function build(): Promise<void> {
		loading = true;
		picked = null; revealed = false; idx = 0; score = { ok: 0, tot: 0 };
		word = null; kanjiChar = null; grammarMode = false; counterMode = false; phrase = null; phraseJudged = false; srsTarget = null;
		classDrillSub = null; classDrillPct = null;
		phraseStep = 'ready'; heard = ''; lastOk = null;

		const [words, counters] = await Promise.all([db.words.toArray(), db.counters.toArray()]);
		const context: QuizContext = {
			locale,
			wordsById: new Map(words.map((x) => [x.id, x])),
			grammarById: new Map()
		};
		wordsById = context.wordsById;
		const distractors: DistractorIndex = await preloadDistractorIndex();

		// id può essere bare (parola/kanji) o prefissato (grammar:...)
		const [kind, ...rest] = wordId.includes(':') ? wordId.split(':') : ['auto', wordId];
		const rawId = wordId.includes(':') ? rest.join(':') : wordId;

		// Grammatica: micro-drill con le domande grammaticali (cloze/reading).
		if (kind === 'grammar') {
			const g = await db.grammar.get(rawId);
			if (g && g.frasi_esempio?.length) {
				grammarMode = true;
				srsTarget = `grammar:${g.id}`;
				title = g.struttura;
				const qs: QuizQuestion[] = [];
				for (let i = 0; i < 8 && qs.length < 5; i += 1) {
					const example = g.frasi_esempio[Math.floor(Math.random() * g.frasi_esempio.length)]!;
					const q = await createGrammarQuestion({ grammar: g, example }, distractors, g.livello_jlpt, context, locale);
					if (q.mode === 'cloze' || q.mode === 'reading-choice') qs.push(q);
				}
				queue = qs;
			}
			loading = false;
			return;
		}

		// Classe di coniugazione (conj:godan…): coda di coniugazioni su PIÙ parole
		// della stessa classe — la debolezza è della classe, non di una parola.
		if (kind === 'conj') {
			classDrillSub = 'Coniugazione della classe';
			srsTarget = `conj:${rawId}`;
			title = CONJ_CLASS_LABELS[rawId] ?? rawId;
			const row = await db.srs_progress.get(srsTarget);
			if (row) classDrillPct = normalizePracticeOnlyMastery(row.mastery_points);
			const pool = shuffle(words.filter((w) => conjClassKey(w) === `conj:${rawId}`));
			const allowed = new Set(DEFAULT_KNOWN_FORMS);
			const qs: QuizQuestion[] = [];
			const seen = new Set<string>();
			for (const w of pool.slice(0, 20)) {
				if (qs.length >= 6) break;
				const q = createConjugationQuizQuestion(w, allowed);
				if (q && !seen.has(`${q.dictionary}|${q.formLabel}`)) {
					seen.add(`${q.dictionary}|${q.formLabel}`);
					qs.push(q);
				}
			}
			queue = qs;
			loading = false;
			return;
		}

		// Costruzione (gram:kanou…): prima le frasi CURATE dall'insegnante (il
		// contesto forza la forma, col «perché»), poi coniugazioni di QUELLA
		// forma su più parole. Le curate coprono anche costruzioni senza formKey
		// (つもり, たほうがいい…), che prima non avevano drill.
		if (kind === 'gram') {
			const formKeys = new Set(
				Object.entries(CONSTRUCTION_BY_FORM_KEY)
					.filter(([, slug]) => slug === rawId)
					.map(([key]) => key)
			);
			const curated: QuizQuestion[] = shuffle(curatedByGram(rawId)).map(curatedToQuestion);
			if (formKeys.size > 0 || curated.length > 0) {
				classDrillSub = 'Uso della costruzione';
				srsTarget = `gram:${rawId}`;
				title = GRAMMAR_FORMS.find((f) => f.slug === rawId)?.title ?? rawId;
				const row = await db.srs_progress.get(srsTarget);
				if (row) classDrillPct = normalizePracticeOnlyMastery(row.mastery_points);
				const qs: QuizQuestion[] = [...curated];
				if (formKeys.size > 0) {
					const pool = shuffle(words.filter((w) => w.tipo_jp.startsWith('動詞') || w.tipo_jp.startsWith('形容詞')));
					const seen = new Set<string>();
					for (const w of pool.slice(0, 40)) {
						if (qs.length >= 6) break;
						const q = createConjugationQuizQuestion(w, formKeys);
						// il builder può ricadere sulle forme base se la parola non ha
						// questa forma: si accettano solo domande della forma richiesta
						if (q && formKeys.has(q.formKey) && !seen.has(q.dictionary)) {
							seen.add(q.dictionary);
							qs.push(q);
						}
					}
				}
				queue = qs;
			}
			loading = false;
			return;
		}

		// Particella (particella:に…): frasi col buco proprio su quella particella,
		// ritentando su parole diverse (stesso pattern "coda anche parziale").
		if (kind === 'particella') {
			classDrillSub = 'Uso della particella';
			srsTarget = `particella:${rawId}`;
			title = `Particella ${rawId}`;
			const row = await db.srs_progress.get(srsTarget);
			if (row) classDrillPct = normalizePracticeOnlyMastery(row.mastery_points);
			// prima le domande CURATE dall'insegnante (frasi costruite apposta
			// perché questa particella sia l'unica giusta, con il «perché»)…
			const qs: QuizQuestion[] = shuffle(curatedByParticle(rawId)).slice(0, 4).map(curatedToQuestion);
			// …poi si riempie con i cloze generati dalle frasi del catalogo
			const pool = shuffle(words.filter((w) => w.frasi_esempio?.length));
			const seenSentences = new Set<string>(qs.map((q) => (q as { fullSentence: string }).fullSentence));
			for (const w of pool.slice(0, 80)) {
				if (qs.length >= 6) break;
				const q = await createParticleClozeQuestion(w, locale);
				if (q && q.correctChoice === rawId && !seenSentences.has(q.fullSentence)) {
					seenSentences.add(q.fullSentence);
					qs.push(q);
				}
			}
			queue = qs;
			loading = false;
			return;
		}

		// Frase utile (dallo shadowing): non è a scelta multipla, è pratica a
		// voce — riascolto + autovalutazione, come nel gioco di provenienza.
		if (kind === 'phrase') {
			const found = SITUATIONS.flatMap((s) => s.frasi).find((p) => p.jp === rawId);
			if (found) {
				phrase = found;
				srsTarget = `phrase:${found.jp}`;
				title = found.jp;
			}
			loading = false;
			return;
		}

		// Contatore: drill sulle letture irregolari (N+contatore) + uso.
		if (kind === 'counter') {
			const c = (counters as Counter[]).find((x) => x.id === rawId);
			if (c) {
				counterMode = true;
				srsTarget = `counter:${c.id}`;
				title = `${c.simbolo}（${c.lettura}）`;
				queue = buildCounterQuestions(c, counters as Counter[]);
			}
			loading = false;
			return;
		}

		const w = await db.words.get(rawId);
		if (w) {
			word = w;
			srsTarget = `word:${w.id}`;
			title = w.scrittura;
			queue = shuffle(buildWordQuestions(w, context, distractors, counters as Counter[]));
			loading = false;
			return;
		}

		// Kanji: drill sulle parole in catalogo che usano questo kanji.
		const k = await db.kanji.get(rawId);
		if (k) {
			kanjiChar = k.id;
			srsTarget = `kanji:${k.id}`;
			title = k.id;
			const withKanji = words.filter((x) => x.kanji_usati.includes(k.id));
			const qs: QuizQuestion[] = [];
			for (const x of shuffle(withKanji).slice(0, 8)) {
				qs.push(
					Math.random() < 0.5
						? createMultipleChoiceQuestion(x, context, distractors)
						: createFlashcardRecognitionQuestion(x, locale, distractors, context)
				);
			}
			queue = qs;
			loading = false;
			return;
		}

		loading = false;
	}

	// Drill contatore: più letture N+contatore (distrattori = le altre letture
	// irregolari dello stesso contatore) + una domanda "cosa conta?".
	function buildCounterQuestions(c: Counter, counters: Counter[]): QuizQuestion[] {
		const qs: QuizQuestion[] = [];
		const seen = new Set<string>();
		for (let i = 0; i < 12 && qs.length < 6; i += 1) {
			const q = createCounterDrillQuestion(c);
			if (q && !seen.has(q.prompt)) { seen.add(q.prompt); qs.push(q); }
		}
		const usage = counterMeaningQuestion(c, counters);
		if (usage) qs.push(usage);
		return shuffle(qs);
	}

	// "Cosa conta 日?" — opzioni = significati di altri contatori.
	function counterMeaningQuestion(c: Counter, counters: Counter[]): QuizQuestion | null {
		const correct = pickLocalizedText(c.significato, locale);
		const pool = counters
			.filter((x) => x.id !== c.id)
			.map((x) => pickLocalizedText(x.significato, locale))
			.filter((m) => m && m !== correct);
		const distractors = shuffle([...new Set(pool)]).slice(0, 3);
		if (distractors.length < 2) return null;
		return {
			mode: 'flashcard-recognition',
			wordId: `counter:${c.id}`,
			prompt: `Cosa conta ${c.simbolo}（${c.lettura}）?`,
			promptLanguage: locale,
			choices: shuffle([correct, ...distractors]),
			correctAnswer: correct,
			warningMultipleDefinitions: false
		};
	}

	function buildWordQuestions(
		w: Word,
		context: QuizContext,
		distractors: DistractorIndex,
		counters: Counter[]
	): QuizQuestion[] {
		const qs: QuizQuestion[] = [];
		qs.push(createMultipleChoiceQuestion(w, context, distractors)); // diretto JP→IT
		qs.push(createFlashcardRecognitionQuestion(w, locale, distractors, context)); // inverso IT→JP
		// ✍️ composizione: qui in Consolida si prova SUBITO (nel quiz si sblocca
		// a parola consolidata, stage 4)
		const comp = createCompositionQuestion(w, locale, context);
		if (comp) qs.push(comp);
		const usage = usageQuestion(w, context); // prova d'uso: parola oscurata nella sua frase
		if (usage) qs.push(usage);
		if (w.kanji_usati.length > 0 && w.scrittura !== w.lettura) {
			qs.push(createFlashcardReadingRecognitionQuestion(w, locale, distractors, context));
		}
		if (w.tipo_jp.startsWith('動詞') || w.tipo_jp.startsWith('形容詞')) {
			// più forme di coniugazione (fino a 2 distinte)
			const seen = new Set<string>();
			for (let i = 0; i < 4 && seen.size < 2; i += 1) {
				const cq = createConjugationQuizQuestion(w, new Set(DEFAULT_KNOWN_FORMS));
				if (cq && !seen.has(cq.formLabel)) { seen.add(cq.formLabel); qs.push(cq); }
			}
		}
		// frasi propedeutiche curate della parola (自/他, keigo, forma nel
		// contesto): la frase forza la risposta, col «perché» dopo.
		for (const item of curatedByWord(w.id)) qs.push(curatedToQuestion(item));
		if (w.id_verbo_corrispondente) {
			// transitività in contesto (se c'è una frase) o riconoscimento del gemello
			const tq = w.frasi_esempio?.length ? createTransitivityPairQuestion(w, context, locale) : null;
			if (tq) qs.push(tq);
			const rel = relationQuestion(w, [w.id_verbo_corrispondente], context,
				w.transitivita_jp?.startsWith('他') ? "verbo intransitivo corrispondente" : "verbo transitivo corrispondente");
			if (rel) qs.push(rel);
		}
		const syn = relationQuestion(w, w.sinonimi ?? [], context, 'sinonimo');
		if (syn) qs.push(syn);
		const ant = relationQuestion(w, w.contrari ?? [], context, 'contrario');
		if (ant) qs.push(ant);
		if (w.id_contatore_suggerito) {
			const cq = createCounterQuestion(w, counters, locale);
			if (cq) qs.push(cq);
		}
		return qs;
	}

	// Prova d'uso: la parola oscurata nella sua frase d'esempio, distrattori
	// dello stesso tipo. Riusa la forma flashcard (prompt = frase col buco).
	function usageQuestion(w: Word, context: QuizContext): QuizQuestion | null {
		const ex = w.frasi_esempio?.[0];
		if (!ex) return null;
		const sentence = stripFuriganaNotation(ex.testo);
		const blanked = blankSentence(sentence, w.scrittura);
		if (!blanked) return null;
		const pool = [...context.wordsById.values()].filter(
			(x) => x.id !== w.id && x.tipo_jp === w.tipo_jp
		);
		const distractors = shuffle(pool).slice(0, 3).map((x) => x.scrittura);
		if (distractors.length < 2) return null;
		return {
			mode: 'flashcard-recognition',
			wordId: w.id,
			prompt: `Completa: ${blanked}`,
			promptLanguage: 'ja',
			choices: shuffle([w.scrittura, ...distractors]),
			correctAnswer: w.scrittura,
			warningMultipleDefinitions: false
		};
	}

	// Domanda a scelta: "Quale è il <relazione> di X?" — corretta = una parola
	// collegata, distrattori dello stesso tipo. Riusa la forma FlashcardQuestion
	// (prompt in IT, opzioni in JP) così il TTS legge la risposta giusta.
	function relationQuestion(
		w: Word,
		relatedIds: string[],
		context: QuizContext,
		label: string
	): QuizQuestion | null {
		const target = relatedIds.map((id) => context.wordsById.get(id)).find((x) => x);
		if (!target) return null;
		const pool = [...context.wordsById.values()].filter(
			(x) => x.id !== w.id && x.id !== target.id && x.tipo_jp === w.tipo_jp
		);
		const distractors = shuffle(pool).slice(0, 3).map((x) => x.scrittura);
		if (distractors.length < 2) return null;
		const gloss = pickLocalizedArray(w.significato, locale)[0] ?? '';
		return {
			mode: 'flashcard-recognition',
			wordId: w.id,
			prompt: `${label} di ${w.scrittura}${gloss ? ` (${gloss})` : ''}`,
			promptLanguage: locale,
			choices: shuffle([target.scrittura, ...distractors]),
			correctAnswer: target.scrittura,
			warningMultipleDefinitions: false
		};
	}

	function pick(choice: string): void {
		if (picked !== null || !current) return;
		picked = choice;
		revealed = true;
		const correct = choice === correctOf(current);
		score = { ok: score.ok + (correct ? 1 : 0), tot: score.tot + 1 };
		void recordPractice(correct);
		// per coniugazione/transitività leggi la forma corretta, non la parola base
		const m = current.mode;
		if (m === 'particle-cloze' || m === 'usage-cloze' || m === 'verb-form-cloze') {
			// come nel quiz: quando metti una parola/forma nella frase, si legge
			// la frase COMPLETA (feedback utente 17/07: mancava per usage-cloze)
			speakSentenceJapanese((current as { fullSentence: string }).fullSentence);
		} else if (m === 'counter-reading' || m === 'conjugation' || m === 'transitivity-pair' || m === 'flashcard-reading-recognition') {
			speakSentenceJapanese(correctOf(current));
		} else if (m === 'flashcard-recognition' && !counterMode) {
			// in modalità contatore la flashcard chiede il significato (italiano): niente TTS
			speakSentenceJapanese(correctOf(current));
		} else if (word) {
			speakWordReading(word);
		}
	}

	// La pratica consolida davvero (muove il mastery dell'item), ma non dà XP.
	async function recordPractice(correct: boolean): Promise<void> {
		if (!srsTarget) return;
		const existing = await db.srs_progress.get(srsTarget);
		const updated = applyPracticeReview(existing ?? createInitialSrs(srsTarget), correct);
		await db.srs_progress.put(updated);
	}

	async function judgePhrase(ok: boolean): Promise<void> {
		if (phraseJudged) return;
		phraseJudged = true;
		score = { ok: score.ok + (ok ? 1 : 0), tot: score.tot + 1 };
		await recordPractice(ok);
	}

	// Ascolta la frase e poi, subito dopo, attiva il microfono per la
	// ripetizione — stesso cuore dello shadowing. Senza mic si ferma
	// dopo l'ascolto e l'utente si autovaluta (come prima).
	async function listenAndPractice(rate = 1): Promise<void> {
		if (!phrase || phraseStep === 'listening' || phraseStep === 'revealed') return;
		const p = phrase;
		heard = '';
		lastOk = null;
		await speakSentenceJapaneseAsync(p.jp, { rate });
		if (!canSpeak) {
			phraseStep = 'said';
			return;
		}
		phraseStep = 'listening';
		const alts = await listenJapanese();
		if (phraseStep !== 'listening') return;
		if (alts.length === 0) {
			heard = '（niente capito, riprova）';
			phraseStep = 'said';
			return;
		}
		heard = alts[0]!;
		const ok = speechMatches(alts, [sentenceMatchVariants(p.jp, p.yomi, ...(p.varianti ?? []))]);
		lastOk = ok;
		phraseStep = 'revealed';
		await judgePhrase(ok);
	}

	async function replayPhrase(rate = 1): Promise<void> {
		if (!phrase) return;
		await speakSentenceJapaneseAsync(phrase.jp, { rate });
	}

	function next(): void {
		if (idx + 1 >= queue.length) { void rebuild(); return; }
		idx += 1; picked = null; revealed = false;
		setupComp();
	}

	async function rebuild(): Promise<void> {
		await build();
		setupComp();
	}

	onMount(() => {
		canSpeak = speechAvailable();
		void rebuild();
	});
	$effect(() => { void wordId; void rebuild(); });
</script>

<div class="consolida">
	<div class="nav"><button class="back" onclick={() => history.back()}>← Indietro</button></div>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else if !word && !kanjiChar && !grammarMode && !counterMode && !phrase && !classDrillSub}
		<p class="muted">Elemento non trovato.</p>
	{:else}
		<header class="head">
			<h1>💪 Consolida: {title}</h1>
			<p class="sub">
				{kanjiChar ? 'Parole con questo kanji in studio' : grammarMode ? 'Uso della forma grammaticale' : counterMode ? 'Letture numero + contatore' : phrase ? 'Frase utile — pratica a voce' : (classDrillSub ?? 'Allenamento libero')}{classDrillPct !== null ? ` — padronanza ${classDrillPct}%` : ''} — consolida (niente XP). {score.ok}/{score.tot}
			</p>
		</header>

		{#if phrase}
			{@const p = phrase}
			<article class="card">
				{#if phraseStep === 'ready'}
					<p class="muted" style="text-align:center;">🔒 Ascolta e ripeti subito dopo</p>
					<div class="choices">
						<button class="next" onclick={() => listenAndPractice()}>▶ Ascolta</button>
						<button class="choice" onclick={() => listenAndPractice(0.6)}>🐢 ゆっくり</button>
					</div>
				{:else if phraseStep === 'listening'}
					<p class="muted" style="text-align:center;">🔒 …</p>
					<button class="next" disabled>🎙️ Ripeti ora!</button>
				{:else}
					<p class="qprompt"><InteractiveSentence text={p.jp} /></p>
					<p class="sub" style="text-align:center;">{p.yomi}</p>
					<p class="sub" style="text-align:center;">{p.it}</p>
					<HeardDiff {heard} candidates={[p.jp, p.yomi, ...(p.varianti ?? [])]} />
					{#if phraseStep === 'said'}
						<div class="choices">
							<button class="choice" onclick={() => listenAndPractice()}>🔊 もう一度</button>
							<button class="choice" onclick={() => listenAndPractice(0.6)}>🐢 ゆっくり</button>
						</div>
						{#if !phraseJudged}
							<p class="muted" style="text-align:center;">Come è andata la tua ripetizione?</p>
							<div class="choices">
								<button class="choice right" onclick={() => judgePhrase(true)}>✓ Bene</button>
								<button class="choice wrong" onclick={() => judgePhrase(false)}>✗ Da rifare</button>
							</div>
						{/if}
					{:else if lastOk}
						<p class="muted" style="text-align:center;">✓ Bene detto!</p>
					{:else}
						<p class="muted" style="text-align:center;">✗ Non hai detto la frase giusta.</p>
					{/if}
					{#if phraseJudged}
						<button class="next" onclick={() => replayPhrase()}>🔊 Risenti l'audio</button>
						<p class="muted" style="text-align:center;">✓ Consolidato.</p>
					{/if}
				{/if}
			</article>
		{:else if current}
			{#key idx}
			<article class="card">
				<p class="qmode">{current.mode}</p>
				<p class="qprompt">{promptOf(current)}</p>
				{#if current.mode === 'composition'}
					{#if current.reading}<p class="muted" style="text-align:center;">Lettura: {current.reading}</p>{/if}
					<TokenCompose
						bind:bank={compBank}
						bind:answer={compAnswer}
						disabled={revealed}
						placeholder="Componi qui la parola…"
						status={revealed ? (picked === current.correctAnswer ? 'right' : 'wrong') : null} />
					{#if !revealed}
						<button class="next" onclick={compSubmit} disabled={compAnswer.length === 0}>Conferma parola</button>
					{:else}
						<p class="muted" style="text-align:center;">{picked === current.correctAnswer ? '✓' : '✗'} {current.correctAnswer}{current.reading ? `（${current.reading}）` : ''}</p>
					{/if}
				{:else}
				<div class="choices">
					{#each choicesOf(current) as choice (choice)}
						<button
							class="choice"
							class:right={revealed && choice === correctOf(current)}
							class:wrong={picked === choice && choice !== correctOf(current)}
							disabled={picked !== null}
							onclick={() => pick(choice)}
						>{choice}</button>
					{/each}
				</div>
				{/if}
				{#if revealed}
					<!-- alla fine: la frase (cliccabile + ascoltabile) e il suo significato -->
					{@const rs = revealSentence(current)}
					{#if rs}
						<p class="explain-jp"><InteractiveSentence text={rs.jp} /></p>
						<button class="listen-sentence" onclick={() => speakSentenceJapanese(rs.jp)}>🔊 Ascolta la frase</button>
						{#if rs.it}<p class="explain-it">💬 {rs.it}</p>{/if}
					{/if}
					{#if 'explanation' in current && current.explanation}
						<p class="explain-it">✅ {current.explanation}</p>
					{/if}
					{#if current.mode === 'conjugation'}
						<p class="explain-it">✅ {current.dictionary} → {current.formLabel}: <strong>{current.correctChoice}</strong></p>
					{/if}
					<button class="next" onclick={next}>{idx + 1 >= queue.length ? '🔁 Altro giro' : 'Avanti →'}</button>
				{/if}
			</article>
			{/key}
		{:else if kanjiChar}
			<p class="muted">Nessuna parola in catalogo con {kanjiChar}.</p>
		{:else if grammarMode}
			<p class="muted">Nessuna domanda generabile per questa forma.</p>
		{/if}

		{#if word}
			<div class="meanings">
				{#each pickLocalizedArray(word.significato, locale) as m, i}<span>{i + 1}. {m}</span>{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.consolida { display: grid; gap: 12px; }
	.nav { margin-bottom: 4px; }
	.back { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; cursor: pointer; color: var(--muted); }
	.head h1 { margin: 0; font-size: 1.2rem; }
	.sub { margin: 2px 0 0; font-size: 0.8rem; color: var(--muted); }
	.card { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 12px; }
	.qmode { margin: 0; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.qprompt { margin: 0; font-size: 1.5rem; font-weight: 700; text-align: center; }
	.explain-jp { margin: 0; font-size: 1.05rem; text-align: center; }
	.explain-it { margin: 0; font-size: 0.85rem; color: var(--muted); text-align: center; }
	.listen-sentence { justify-self: center; padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }
	.next { justify-self: end; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--brand); background: transparent; color: var(--brand); font-weight: 600; cursor: pointer; }
	.next:hover { background: var(--brand); color: #fff; }
	.meanings { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--muted); }
	.muted { color: var(--muted); }
</style>
