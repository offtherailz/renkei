<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { appState } from '$lib/stores.svelte';
	import { detectUserLocale, pickLocalizedText, pickLocalizedArray } from '$lib/core/i18n';
	import { renderFuriganaToHtml } from '$lib/core/furigana';
	import { normalizeMastery } from '$lib/core/srs';
	import { speakWordReading, speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { saveCorrection } from '$lib/db/corrections';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import JpBadge from '$lib/components/JpBadge.svelte';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import ConjugationDrill from '$lib/components/ConjugationDrill.svelte';
	import ConjugationTable from '$lib/components/ConjugationTable.svelte';
	import UsageDrill from '$lib/components/UsageDrill.svelte';
	import type { Word, Kanji, Grammar, Counter } from '$lib/types/models';
	import { GRAMMAR_FORMS, FORM_SLUG_BY_STRUTTURA, ATTACHMENT_SCHEMAS, formPage } from '$lib/data/grammarForms';

	// Forme composte più utili da collegare alla scheda di un verbo.
	const VERB_COMPOSED_SLUGS = ['te-miru', 'te-oku', 'te-shimau', 'te-iru', 'to-omou', 'you-volitiva', 'sou-apparenza'];
	const verbComposedForms = VERB_COMPOSED_SLUGS
		.map((s) => GRAMMAR_FORMS.find((f) => f.slug === s))
		.filter((f): f is NonNullable<typeof f> => Boolean(f));

	const locale = detectUserLocale();

	// itemId format: "word:xxx", "kanji:xxx", "grammar:xxx"
	const itemId = $derived($page.params.id ?? '');

	let word = $state<Word | null>(null);
	let kanji = $state<Kanji | null>(null);
	let grammar = $state<Grammar | null>(null);
	let loading = $state(true);

	// Related items
	let synonyms = $state<Word[]>([]);
	let antonyms = $state<Word[]>([]);
	let homophones = $state<Word[]>([]);
	let kanjiUsed = $state<Kanji[]>([]);
	let kanjiMissing = $state<string[]>([]);

	// ── Correzione voce (parole e grammatica): patch in user_corrections ──
	let fixOpen = $state(false);
	let fixLettura = $state('');
	let fixStruttura = $state('');
	let fixGlosse = $state(''); // una per riga
	let fixFrasi = $state(''); // "frase :: traduzione" per riga
	let fixMotivo = $state('');
	let fixStatus = $state<'idle' | 'saved'>('idle');
	function openFix(): void {
		fixOpen = !fixOpen;
		fixStatus = 'idle';
		if (!fixOpen) return;
		if (word) {
			fixLettura = word.lettura;
			fixGlosse = (word.significato.it ?? []).join('\n');
			fixFrasi = (word.frasi_esempio ?? [])
				.map((ex) => `${ex.testo} :: ${ex.traduzione?.it ?? ''}`)
				.join('\n');
		} else if (grammar) {
			fixStruttura = grammar.struttura;
			fixGlosse = pickLocalizedText(grammar.spiegazione, locale);
			fixFrasi = (grammar.frasi_esempio ?? [])
				.map((ex) => `${ex.testo} :: ${pickLocalizedText(ex.traduzione, locale)}`)
				.join('\n');
		}
	}
	// Il form corregge solo la traduzione italiana (un tocco, un textarea):
	// la traduzione inglese va preservata dall'originale, altrimenti ogni
	// correzione la sovrascriverebbe con testo italiano (bug reale, trovato
	// discutendone). Match per frase invariata, poi per posizione, altrimenti
	// (frase nuova/riscritta senza originale) resta l'IT come ripiego.
	function parseFrasi(
		original: { testo: string; traduzione?: { it?: string; en?: string } }[]
	): { testo: string; traduzione: { it: string; en: string }; parole_linkate: string[] }[] {
		const byTesto = new Map(original.map((ex) => [ex.testo, ex.traduzione?.en ?? '']));
		return fixFrasi
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean)
			.map((l, i) => {
				const [testo, trad = ''] = l.split('::').map((s) => s.trim());
				const en = byTesto.get(testo!) || original[i]?.traduzione?.en || trad;
				return { testo: testo!, traduzione: { it: trad, en }, parole_linkate: [] };
			})
			.filter((ex) => ex.testo);
	}
	async function saveFix(): Promise<void> {
		if (word) {
			const patch: Record<string, unknown> = {};
			if (fixLettura.trim() && fixLettura.trim() !== word.lettura) patch.lettura = fixLettura.trim();
			const glosse = fixGlosse.split('\n').map((s) => s.trim()).filter(Boolean);
			if (glosse.length && glosse.join('|') !== (word.significato.it ?? []).join('|')) {
				patch.significato = { it: glosse, en: word.significato.en };
			}
			const frasi = parseFrasi(word.frasi_esempio ?? []);
			if (fixFrasi.trim()) patch.frasi_esempio = frasi;
			if (Object.keys(patch).length === 0) return;
			await saveCorrection('word', word.id, patch, fixMotivo.trim() || undefined);
		} else if (grammar) {
			const patch: Record<string, unknown> = {};
			if (fixStruttura.trim() && fixStruttura.trim() !== grammar.struttura) patch.struttura = fixStruttura.trim();
			if (fixGlosse.trim() && fixGlosse.trim() !== pickLocalizedText(grammar.spiegazione, locale)) {
				patch.spiegazione = { it: fixGlosse.trim(), en: grammar.spiegazione.en };
			}
			if (fixFrasi.trim()) {
				const frasi = parseFrasi(grammar.frasi_esempio ?? []);
				patch.frasi_esempio = frasi;
				patch.frasi_esempio_parole_linkate = [];
			}
			if (Object.keys(patch).length === 0) return;
			await saveCorrection('grammar', grammar.id, patch, fixMotivo.trim() || undefined);
		}
		fixStatus = 'saved';
		await loadItem(); // ricarica la voce corretta
	}

	// ── Note personali (persistite in user_personalization) ──
	let noteText = $state('');
	let noteStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let noteTimer: ReturnType<typeof setTimeout> | null = null;
	function onNoteInput(): void {
		noteStatus = 'saving';
		if (noteTimer) clearTimeout(noteTimer);
		noteTimer = setTimeout(() => void saveNote(), 600);
	}
	async function saveNote(): Promise<void> {
		const existing = await db.user_personalization.get(itemId);
		await db.user_personalization.put({
			id_item: itemId,
			note_personali: noteText,
			id_gruppi_personalizzati: existing?.id_gruppi_personalizzati ?? [],
			updated_at: Date.now()
		});
		noteStatus = 'saved';
	}
	let grammarUsing = $state<Grammar[]>([]);
	let wordsUsingKanji = $state<Word[]>([]);
	let verbPair = $state<Word | null>(null);
	let suggestedCounter = $state<Counter | null>(null);
	let suruVerb = $state<Word | null>(null);
	let baseNoun = $state<Word | null>(null);

	// SRS info
	let masteryPct = $state(0);
	let srsStage = $state(0);
	let nextReviewLabel = $state('');

	// Regole d'uso: la forma composta corrispondente a questa voce grammatica
	// (mappa curata struttura → slug), con le forme che seguono la stessa regola.
	const grammarForm = $derived.by(() => {
		if (!grammar) return null;
		const slug = FORM_SLUG_BY_STRUTTURA[grammar.struttura];
		return slug ? (GRAMMAR_FORMS.find((f) => f.slug === slug) ?? null) : null;
	});
	const sameRuleForms = $derived.by(() => {
		if (!grammarForm?.schemaId) return [];
		return GRAMMAR_FORMS.filter(
			(f) => f.composed && f.slug !== grammarForm.slug && f.schemaId === grammarForm.schemaId
		);
	});

	async function loadItem(): Promise<void> {
		loading = true;
		word = null; kanji = null; grammar = null;
		synonyms = []; antonyms = []; homophones = []; kanjiUsed = []; kanjiMissing = []; grammarUsing = []; wordsUsingKanji = [];
		verbPair = null; suggestedCounter = null; suruVerb = null; baseNoun = null;

		const currentKind = itemId.split(':')[0];
		const currentRawId = itemId.split(':').slice(1).join(':');

		// note personali della carta (user_personalization, chiave = itemId completo)
		noteText = '';
		noteStatus = 'idle';
		try {
			noteText = (await db.user_personalization.get(itemId))?.note_personali ?? '';
		} catch {
			/* niente note */
		}

		try {
			if (currentKind === 'word') {
				word = (await db.words.get(currentRawId)) ?? null;
				if (word) {
					const resolve = (ids: string[]) =>
						Promise.all(ids.slice(0, 8).map((id) => db.words.get(id))).then((r) => r.filter((w): w is Word => !!w));
					const [srs, syn, ant, homo, kanjiItems, grammarItems] = await Promise.all([
						db.srs_progress.get(`word:${currentRawId}`),
						resolve(word.sinonimi ?? []),
						resolve(word.contrari ?? []),
						resolve(word.omofoni ?? []),
						Promise.all(word.kanji_usati.map((k) => db.kanji.get(k))),
						db.grammar.where('frasi_esempio_parole_linkate').equals(currentRawId).toArray()
					]);
					synonyms = syn;
					antonyms = ant;
					homophones = homo;
					kanjiUsed = kanjiItems.filter((k): k is Kanji => !!k);
					// kanji citati dalla parola ma fuori dal catalogo N5/N4 (es. 交差点):
					// si mostrano lo stesso, con link esterno.
					kanjiMissing = word.kanji_usati.filter((c, i) => !kanjiItems[i]);
					grammarUsing = grammarItems;
					if (word.id_verbo_corrispondente) {
						verbPair = (await db.words.get(word.id_verbo_corrispondente)) ?? null;
					}
					if (word.id_contatore_suggerito) {
						suggestedCounter = (await db.counters.get(word.id_contatore_suggerito)) ?? null;
					}
					if (word.id_verbo_suru) {
						suruVerb = (await db.words.get(word.id_verbo_suru)) ?? null;
					}
					if (word.id_nome_origine) {
						baseNoun = (await db.words.get(word.id_nome_origine)) ?? null;
					}
					if (srs) {
						masteryPct = normalizeMastery(srs.srs_stage, srs.mastery_points);
						srsStage = srs.srs_stage;
						const mins = Math.max(0, Math.round((srs.next_review_date - Date.now()) / 60_000));
						nextReviewLabel = mins <= 0 ? 'adesso' : `tra ~${mins} min`;
					}
				}
			} else if (currentKind === 'kanji') {
				kanji = (await db.kanji.get(currentRawId)) ?? null;
				if (kanji) {
					const [srs, wordItems] = await Promise.all([
						db.srs_progress.get(`kanji:${currentRawId}`),
						db.words.where('kanji_usati').equals(currentRawId).toArray()
					]);
					wordsUsingKanji = wordItems;
					if (srs) {
						masteryPct = normalizeMastery(srs.srs_stage, srs.mastery_points);
						srsStage = srs.srs_stage;
						const mins = Math.max(0, Math.round((srs.next_review_date - Date.now()) / 60_000));
						nextReviewLabel = mins <= 0 ? 'adesso' : `tra ~${mins} min`;
					}
				}
			} else if (currentKind === 'grammar') {
				grammar = (await db.grammar.get(currentRawId)) ?? null;
				if (grammar) {
					const srs = await db.srs_progress.get(`grammar:${currentRawId}`);
					if (srs) {
						masteryPct = normalizeMastery(srs.srs_stage, srs.mastery_points);
						srsStage = srs.srs_stage;
						const mins = Math.max(0, Math.round((srs.next_review_date - Date.now()) / 60_000));
						nextReviewLabel = mins <= 0 ? 'adesso' : `tra ~${mins} min`;
					}
				}
			}
		} catch (e) {
			console.error('Errore caricamento dettaglio:', e);
		} finally {
			loading = false;
		}
	}

	// ricarica anche quando l'app finisce l'inizializzazione: arrivando qui a
	// freddo (refresh/link diretto) il DB potrebbe non essere ancora pronto
	$effect(() => { void itemId; void appState.initialized; loadItem(); });

	function progressColor(p: number): string {
		if (p >= 75) return 'var(--progress-good)';
		if (p >= 40) return 'var(--progress-mid)';
		return 'var(--progress-low)';
	}

	function jishoUrl(q: string): string {
		return `https://jisho.org/search/${encodeURIComponent(q)}`;
	}

	function jishoSentencesUrl(q: string): string {
		return `https://jisho.org/search/${encodeURIComponent(q)}%20%23sentences`;
	}

	function tatoebaUrl(q: string): string {
		const toLang = locale === 'it' ? 'ita' : 'eng';
		return `https://tatoeba.org/it/sentences/search?from=jpn&to=${toLang}&query=${encodeURIComponent(q)}`;
	}

	function koohiiUrl(k: string): string {
		return `https://kanji.koohii.com/study/kanji/${encodeURIComponent(k)}`;
	}

</script>

<div class="detail-page">
	<div class="detail-nav">
		<button class="back-btn" onclick={() => history.back()}>← Indietro</button>
	</div>

	{#if loading}
		<p class="muted-text">Caricamento…</p>

	<!-- WORD -->
	{:else if word}
		<article class="detail-card">
			<div class="detail-hero">
				<span class="item-writing ja-big">{word.scrittura}</span>
				{#if word.scrittura !== word.lettura}
					<span class="item-reading">{word.lettura}</span>
				{/if}
				<button class="tts-btn" onclick={() => speakWordReading(word!)} title="Ascolta">🔊</button>
				<a class="consolida-btn" href="{base}/consolida/{encodeURIComponent(word.id)}">💪 Consolida</a>
			</div>
			<div class="badges-row">
				<JlptBadge level={word.livello_jlpt} />
				<JpBadge label={word.tipo_jp} variant="jp-badge-pos" />
				{#if word.tipo_jp === '動詞[どうし]' && word.classe_verbo_jp}
					<JpBadge label={word.classe_verbo_jp} variant="jp-badge-verb-class" />
				{/if}
				{#if word.tipo_jp === '動詞[どうし]' && word.transitivita_jp}
					<JpBadge label={word.transitivita_jp} variant="jp-badge-transitivity" />
				{/if}
				{#if word.tipo_jp === '形容詞[けいようし]' && word.tipo_aggettivo_jp}
					<JpBadge label={word.tipo_aggettivo_jp} variant="jp-badge-adjective" />
				{/if}
			</div>
			<div class="meanings">
				{#each pickLocalizedArray(word.significato, locale) as meaning, i}
					<span class="meaning-item">{i + 1}. {meaning}</span>
				{/each}
			</div>
			{#if suggestedCounter || suruVerb || baseNoun}
				<div class="hint-row">
					{#if suruVerb}
						<a class="counter-hint" href="{base}/detail/{encodeURIComponent(`word:${suruVerb.id}`)}">
							🏃 Verbo: <strong>{suruVerb.scrittura}</strong> →
						</a>
					{/if}
					{#if baseNoun}
						<a class="counter-hint" href="{base}/detail/{encodeURIComponent(`word:${baseNoun.id}`)}">
							📦 Nome di origine: <strong>{baseNoun.scrittura}</strong> →
						</a>
					{/if}
					{#if suggestedCounter}
						<a class="counter-hint" href="{base}/contatori#{encodeURIComponent(suggestedCounter.id)}">
							🔢 Si conta con <strong>{suggestedCounter.simbolo}</strong> ({suggestedCounter.lettura}) →
						</a>
					{/if}
				</div>
			{/if}
		</article>

		{#if masteryPct > 0 || srsStage > 0}
		<article class="detail-card">
			<p class="card-title">Memorizzazione</p>
			<div class="bar-wrap">
				<div class="bar-fill" style="width:{masteryPct}%; background:{progressColor(masteryPct)}"></div>
			</div>
			<p class="detail-meta">SRS {srsStage}/7 • Consolidamento {masteryPct}%{nextReviewLabel ? ` • Prossimo ripasso ${nextReviewLabel}` : ''}</p>
		</article>
		{/if}

		{#if word.tipo_jp.startsWith('動詞') || word.tipo_jp.startsWith('形容詞')}
			<ConjugationTable {word} />
			<ConjugationDrill {word} />
		{/if}

		{#if word.tipo_jp.startsWith('動詞')}
		<article class="detail-card">
			<p class="card-title">Forme composte utili</p>
			<p class="composed-hint">Costruzioni che partono da questo verbo: 📖 spiegazione, 💪 esercizio.</p>
			<div class="composed-list">
				{#each verbComposedForms as form}
					<div class="composed-row">
						<a href="{base}/forme#{form.slug}" class="composed-chip">
							{stripFuriganaNotation(form.label)}
						</a>
						{#if form.consolidaId}
							<a href="{base}/consolida/{encodeURIComponent(`grammar:${form.consolidaId}`)}" class="composed-drill">💪 Esercitati</a>
						{/if}
					</div>
				{/each}
			</div>
		</article>
		{/if}

		{#key word.id}
			<UsageDrill {word} />
		{/key}

		{#if word.frasi_esempio?.length}
		<article class="detail-card">
			<p class="card-title">Frasi esempio</p>
			{#each word.frasi_esempio as ex}
				<div class="example-row">
					<div class="example-line">
						<InteractiveSentence text={ex.testo} />
						<button class="tts-mini" onclick={() => speakSentenceJapanese(stripFuriganaNotation(ex.testo))} title="Ascolta">🔊</button>
					</div>
					<p class="example-trans">{pickLocalizedText(ex.traduzione, locale)}</p>
				</div>
			{/each}
		</article>
		{/if}

		{#if word.usi && word.usi.length > 0}
		<article class="detail-card">
			<p class="card-title">Usi — la stessa parola, più ruoli</p>
			<div class="usi-list">
				{#each word.usi as uso, i (i)}
					<div class="uso-row">
						<div class="uso-badges">
							{#each uso.tipi_jp as t (t)}
								<JpBadge label={t} variant="jp-badge-pos" />
							{/each}
						</div>
						<p class="uso-gloss">{pickLocalizedText(uso.significato, locale)}</p>
						{#if uso.esempio}
							<div class="uso-example">
								<InteractiveSentence text={uso.esempio.testo} />
								<button class="tts-mini" onclick={() => speakSentenceJapanese(stripFuriganaNotation(uso.esempio!.testo))} title="Ascolta">🔊</button>
							</div>
							<p class="uso-trans">{pickLocalizedText(uso.esempio.traduzione, locale)}</p>
						{/if}
					</div>
				{/each}
			</div>
		</article>
		{/if}

		{#if kanjiUsed.length > 0 || kanjiMissing.length > 0}
		<article class="detail-card">
			<p class="card-title">Kanji usati</p>
			<div class="chip-row">
				{#each kanjiUsed as k}
					<a href="{base}/detail/kanji:{k.id}" class="kanji-chip">
						<span class="kanji-char">{k.id}</span>
						<span class="kanji-meaning">{locale === 'it' ? k.significato.it : k.significato.en}</span>
					</a>
				{/each}
				{#each kanjiMissing as c (c)}
					<a href="https://jisho.org/search/{encodeURIComponent(c)}%20%23kanji" target="_blank" rel="noopener" class="kanji-chip out">
						<span class="kanji-char">{c}</span>
						<span class="kanji-meaning">fuori catalogo · Jisho ↗</span>
					</a>
				{/each}
			</div>
		</article>
		{/if}

		{#snippet relCard(titolo: string, list: Word[])}
			{#if list.length > 0}
			<article class="detail-card">
				<p class="card-title">{titolo}</p>
				<div class="chip-row">
					{#each list as w}
						<a href="{base}/detail/word:{w.id}" class="word-chip">
							<span class="chip-writing">{w.scrittura}</span>
							<span class="chip-meaning">{pickLocalizedArray(w.significato, locale)[0] ?? ''}</span>
						</a>
					{/each}
				</div>
			</article>
			{/if}
		{/snippet}

		{@render relCard('Sinonimi', synonyms)}
		{@render relCard('Contrari', antonyms)}
		{@render relCard('Omofoni (stessa lettura)', homophones)}

		{#if grammarUsing.length > 0}
		<article class="detail-card">
			<p class="card-title">Grammatica correlata</p>
			{#each grammarUsing as g}
				<a href="{base}/detail/grammar:{g.id}" class="grammar-row">
					<strong>{g.struttura}</strong>
					<span class="detail-meta">{pickLocalizedText(g.spiegazione, locale)}</span>
				</a>
			{/each}
		</article>
		{/if}

		{#if verbPair}
		<article class="detail-card">
			<p class="card-title">Verbo correlato ({word.transitivita_jp === '他動詞[たどうし]' ? 'intransitivo' : 'transitivo'})</p>
			<div class="chip-row">
				<a href="{base}/detail/word:{verbPair.id}" class="word-chip">
					<span class="chip-writing">{verbPair.scrittura}</span>
					<span class="chip-meaning">{verbPair.lettura} — {pickLocalizedArray(verbPair.significato, locale)[0] ?? ''}</span>
				</a>
			</div>
		</article>
		{/if}

		<div class="links-row">
			<a href={word.link_jisho ?? jishoUrl(word.scrittura)} target="_blank" rel="noopener" class="external-link">Apri su Jisho</a>
			<a href={jishoSentencesUrl(word.scrittura)} target="_blank" rel="noopener" class="external-link">Frasi su Jisho</a>
			<a href={tatoebaUrl(word.scrittura)} target="_blank" rel="noopener" class="external-link">Frasi su Tatoeba</a>
		</div>

	<!-- KANJI -->
	{:else if kanji}
		<article class="detail-card">
			<div class="detail-hero">
				<span class="kanji-hero">{kanji.id}</span>
				<a class="consolida-btn" href="{base}/consolida/{encodeURIComponent(kanji.id)}">💪 Consolida</a>
			</div>
			<div class="badges-row">
				<JlptBadge level={kanji.livello_jlpt} />
			</div>
			<div class="meanings">
				<span class="meaning-item">{locale === 'it' ? kanji.significato.it : kanji.significato.en}</span>
			</div>
			<div class="readings-grid">
				<div>
					<p class="reading-label">On'yomi</p>
					<p class="reading-values">{kanji.letture_on.join('、')}</p>
				</div>
				<div>
					<p class="reading-label">Kun'yomi</p>
					<p class="reading-values">{kanji.letture_kun.join('、')}</p>
				</div>
			</div>
		</article>

		{#if masteryPct > 0}
		<article class="detail-card">
			<p class="card-title">Memorizzazione</p>
			<div class="bar-wrap">
				<div class="bar-fill" style="width:{masteryPct}%; background:{progressColor(masteryPct)}"></div>
			</div>
			<p class="detail-meta">SRS {srsStage}/7 • {masteryPct}%{nextReviewLabel ? ` • Prossimo ${nextReviewLabel}` : ''}</p>
		</article>
		{/if}

		{#if wordsUsingKanji.length > 0}
		<article class="detail-card">
			<p class="card-title">Parole con questo kanji ({wordsUsingKanji.length})</p>
			<div class="chip-row">
				{#each wordsUsingKanji.slice(0, 20) as w}
					<a href="{base}/detail/word:{w.id}" class="word-chip">
						<span class="chip-writing">{w.scrittura}</span>
						<span class="chip-meaning">{pickLocalizedArray(w.significato, locale)[0] ?? ''}</span>
					</a>
				{/each}
			</div>
		</article>
		{/if}

		<div class="links-row">
			<a href={kanji.link_jisho ?? jishoUrl('#kanji ' + kanji.id)} target="_blank" rel="noopener" class="external-link">Apri su Jisho</a>
			<a href={kanji.link_koohii ?? koohiiUrl(kanji.id)} target="_blank" rel="noopener" class="external-link">Apri su Kanji Koohii</a>
			<a href={tatoebaUrl(kanji.id)} target="_blank" rel="noopener" class="external-link">Frasi su Tatoeba</a>
		</div>

	<!-- GRAMMAR -->
	{:else if grammar}
		<article class="detail-card">
			<div class="detail-hero">
				<p class="grammar-structure">{grammar.struttura}</p>
				{#if grammar.frasi_esempio?.length}
					<a class="consolida-btn" href="{base}/consolida/{encodeURIComponent(`grammar:${grammar.id}`)}">💪 Consolida</a>
				{/if}
			</div>
			<div class="badges-row">
				<JlptBadge level={grammar.livello_jlpt} />
				{#if grammar.categoria_jp}<JpBadge label={grammar.categoria_jp} variant="jp-badge-pos" />{/if}
			</div>
			<p class="grammar-explanation">{pickLocalizedText(grammar.spiegazione, locale)}</p>
		</article>

		{#if grammarForm}
		<article class="detail-card">
			<p class="card-title">▸ Regole d'uso — si attacca a</p>
			{#if grammarForm.attachment && grammarForm.attachment.length > 0}
				<ul class="attach-list">
					{#each grammarForm.attachment as a}
						<li><span class="attach-base">{a.base}</span> <span class="attach-arrow">→</span> {a.connessione}</li>
					{/each}
				</ul>
			{/if}
			{#if grammarForm.schemaId && ATTACHMENT_SCHEMAS[grammarForm.schemaId]}
				<div class="schema-line">
					<span class="schema-badge">regola: {ATTACHMENT_SCHEMAS[grammarForm.schemaId].label}</span>
					{#if sameRuleForms.length > 0}
						<span class="detail-meta">stessa regola di:</span>
						{#each sameRuleForms as o}
							<a class="mini-chip" href="{base}/{formPage(o.slug)}#{o.slug}">{stripFuriganaNotation(o.label)}</a>
						{/each}
					{/if}
				</div>
			{/if}
			<a class="form-link" href="{base}/{formPage(grammarForm.slug)}#{grammarForm.slug}">📖 Scheda completa in Forme composte →</a>
		</article>
		{/if}

		{#if masteryPct > 0}
		<article class="detail-card">
			<p class="card-title">Memorizzazione</p>
			<div class="bar-wrap">
				<div class="bar-fill" style="width:{masteryPct}%; background:{progressColor(masteryPct)}"></div>
			</div>
			<p class="detail-meta">SRS {srsStage}/7 • {masteryPct}%</p>
		</article>
		{/if}

		{#if grammar.frasi_esempio.length > 0}
		<article class="detail-card">
			<p class="card-title">Frasi esempio</p>
			{#each grammar.frasi_esempio as ex}
				<div class="example-row">
					<div class="example-line">
						<InteractiveSentence text={ex.testo} />
						<button class="tts-mini" onclick={() => speakSentenceJapanese(stripFuriganaNotation(ex.testo))} title="Ascolta">🔊</button>
					</div>
					<p class="example-trans">{pickLocalizedText(ex.traduzione, locale)}</p>
					{#if ex.parole_linkate.length > 0}
						<div class="linked-words">
							{#each ex.parole_linkate as wid}
								<a href="{base}/detail/word:{wid}" class="mini-chip">{wid}</a>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</article>
		{/if}

	{:else}
		<p class="muted-text">Elemento non trovato: {itemId}</p>
	{/if}

	{#if word || grammar}
	<article class="detail-card">
		<p class="card-title">
			✏️ Correggi questa voce
			<button class="v-toggle" onclick={openFix}>{fixOpen ? 'chiudi' : 'apri'}</button>
			{#if fixStatus === 'saved'}<span class="note-status">corretta ✓ (vale anche dopo gli aggiornamenti)</span>{/if}
		</p>
		{#if fixOpen}
			<div class="fix-form">
				{#if word}
					<label class="fix-label">Lettura
						<input class="fix-input" bind:value={fixLettura} />
					</label>
					<label class="fix-label">Significati (uno per riga)
						<textarea class="fix-area" rows="3" bind:value={fixGlosse}></textarea>
					</label>
				{:else if grammar}
					<label class="fix-label">Struttura
						<input class="fix-input" bind:value={fixStruttura} />
					</label>
					<label class="fix-label">Spiegazione
						<textarea class="fix-area" rows="3" bind:value={fixGlosse}></textarea>
					</label>
				{/if}
				<label class="fix-label">Frasi d'esempio (una per riga: frase :: traduzione)
					<textarea class="fix-area" rows="3" bind:value={fixFrasi}></textarea>
				</label>
				<label class="fix-label">Motivo (opzionale)
					<input class="fix-input" bind:value={fixMotivo} placeholder="es. lettura sbagliata, esempio troppo difficile…" />
				</label>
				<button class="fix-save" onclick={saveFix}>💾 Salva correzione</button>
				<p class="fix-hint">La correzione si applica subito e sopravvive agli aggiornamenti dell'app. Da Impostazioni puoi esportarla per farla entrare nell'app pubblicata.</p>
			</div>
		{/if}
	</article>
	{/if}

	{#if word || kanji || grammar}
	<article class="detail-card">
		<p class="card-title">📝 Le mie note {#if noteStatus === 'saved'}<span class="note-status">salvate ✓</span>{:else if noteStatus === 'saving'}<span class="note-status">…</span>{/if}</p>
		<textarea
			class="note-area"
			rows="3"
			placeholder="Mnemonici, trucchi, esempi tuoi… restano su questo dispositivo."
			bind:value={noteText}
			oninput={onNoteInput}
		></textarea>
	</article>
	{/if}
</div>

<style>
	.detail-page { display: grid; gap: 12px; }

	.detail-nav {
		margin-bottom: 4px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.links-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.back-btn {
		background: none;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 6px 12px;
		font-size: 0.82rem;
		cursor: pointer;
		color: var(--muted);
	}

	.back-btn:hover { background: var(--line); }

	.detail-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 10px;
	}

	.detail-hero {
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
	}

	.ja-big { font-size: 2.8rem; font-weight: 700; line-height: 1; }
	.kanji-hero { font-size: 5rem; font-weight: 700; text-align: center; }

	.item-reading { font-size: 1.1rem; color: var(--muted); }

	.tts-btn {
		background: none;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 4px 8px;
		cursor: pointer;
		font-size: 1rem;
		margin-left: auto;
	}

	.consolida-btn {
		border: 1px solid var(--brand);
		border-radius: 8px;
		padding: 5px 12px;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--brand);
		text-decoration: none;
	}
	.consolida-btn:hover { background: rgba(107, 160, 242, 0.14); }

	.badges-row { display: flex; gap: 6px; flex-wrap: wrap; }

	.hint-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.counter-hint {
		justify-self: start;
		font-size: 0.82rem;
		padding: 5px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--ink);
		text-decoration: none;
	}

	.counter-hint:hover { border-color: var(--brand); }

	.counter-hint strong { font-size: 1.05rem; }

	.meanings { display: flex; flex-direction: column; gap: 4px; }
	.meaning-item { font-size: 1rem; color: var(--ink); }

	.card-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.detail-meta { font-size: 0.75rem; color: var(--muted); margin: 0; }

	/* Regole d'uso (forme composte) */
	.attach-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 0.88rem; }
	.attach-base { font-weight: 700; }
	.attach-arrow { color: var(--muted); }
	.schema-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
	.schema-badge { background: var(--info-bg); border: 1px solid var(--info-border); color: var(--ink); border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; }
	.form-link { font-size: 0.82rem; color: var(--brand); text-decoration: none; font-weight: 600; }

	.bar-wrap { height: 6px; background: var(--line); border-radius: 4px; overflow: hidden; }
	.bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }

	.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }

	.kanji-chip, .word-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px 12px;
		border-radius: 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
		gap: 2px;
		min-width: 64px;
		text-align: center;
	}

	.kanji-chip:hover, .word-chip:hover { background: #eef2ff; border-color: var(--brand); }
	.kanji-chip.out { opacity: 0.75; border-style: dashed; }
	.usi-list { display: grid; gap: 10px; }
	.uso-row { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--surface-2); display: grid; gap: 6px; }
	.uso-badges { display: flex; flex-wrap: wrap; gap: 4px; }
	.uso-gloss { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.uso-example { display: flex; align-items: baseline; gap: 6px; }
	.uso-trans { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.note-status { font-size: 0.72rem; color: var(--success); font-weight: 600; margin-left: 6px; }
	.v-toggle { margin-left: 6px; border: 1px solid var(--line); background: var(--surface-2); border-radius: 8px; padding: 2px 8px; font-size: 0.72rem; cursor: pointer; color: var(--muted); text-transform: none; letter-spacing: 0; }
	.fix-form { display: grid; gap: 10px; }
	.fix-label { display: grid; gap: 4px; font-size: 0.78rem; font-weight: 600; color: var(--muted); }
	.fix-input, .fix-area { border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); padding: 8px 10px; font: inherit; font-size: 0.92rem; }
	.fix-area { resize: vertical; }
	.fix-input:focus, .fix-area:focus { outline: none; border-color: var(--brand); }
	.fix-save { justify-self: start; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.fix-hint { margin: 0; font-size: 0.72rem; color: var(--muted); }
	.note-area { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); padding: 10px 12px; font: inherit; font-size: 0.92rem; resize: vertical; }
	.note-area:focus { outline: none; border-color: var(--brand); }

	.composed-hint { font-size: 0.78rem; color: var(--muted); margin: 0 0 8px; }

	.composed-list { display: flex; flex-direction: column; gap: 6px; }
	.composed-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

	.composed-chip {
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--brand);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.composed-chip:hover { background: var(--info-bg); border-color: var(--brand); }

	.composed-drill {
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--ok-bg);
		border: 1px solid var(--success);
		text-decoration: none;
		color: var(--ok-ink);
		font-size: 0.84rem;
		font-weight: 600;
	}
	.composed-drill:hover { filter: brightness(0.96); }

	.kanji-char { font-size: 1.6rem; line-height: 1; }
	.kanji-meaning { font-size: 0.68rem; color: var(--muted); }
	.chip-writing { font-size: 1.15rem; font-weight: 600; }
	.chip-meaning { font-size: 0.68rem; color: var(--muted); }

	.grammar-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
	}

	.grammar-row:hover { background: #eef2ff; }

	.grammar-structure { font-size: 1.3rem; font-weight: 700; margin: 0; }
	.grammar-explanation { font-size: 0.9rem; line-height: 1.5; margin: 0; color: var(--muted); }

	.readings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.reading-label { font-size: 0.7rem; font-weight: 600; color: var(--muted); margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.05em; }
	.reading-values { font-size: 1rem; margin: 0; }

	.example-row {
		padding: 10px 12px;
		border-radius: 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		display: grid;
		gap: 4px;
	}

	:global(.example-ja) { font-size: 1.15rem; line-height: 1.9; }
	.example-line { display: flex; align-items: flex-start; gap: 6px; }
	.tts-mini { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; flex-shrink: 0; }
	.example-trans { font-size: 0.82rem; color: var(--muted); margin: 0; }

	.linked-words { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

	.mini-chip {
		font-size: 0.85rem;
		padding: 2px 8px;
		border-radius: 6px;
		background: #eef2ff;
		color: var(--brand);
		text-decoration: none;
	}

	.mini-chip:hover { background: var(--brand); color: #fff; }

	.external-link {
		font-size: 0.82rem;
		color: var(--brand);
		text-decoration: none;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid var(--line);
		display: inline-block;
		background: var(--surface);
	}

	.external-link:hover { background: #eef2ff; }

	.muted-text { color: var(--muted); font-size: 0.85rem; }
</style>
