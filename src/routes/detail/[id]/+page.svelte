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
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import JpBadge from '$lib/components/JpBadge.svelte';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import ConjugationDrill from '$lib/components/ConjugationDrill.svelte';
	import ConjugationTable from '$lib/components/ConjugationTable.svelte';
	import UsageDrill from '$lib/components/UsageDrill.svelte';
	import type { Word, Kanji, Grammar, Counter } from '$lib/types/models';

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

	async function loadItem(): Promise<void> {
		loading = true;
		word = null; kanji = null; grammar = null;
		synonyms = []; antonyms = []; homophones = []; kanjiUsed = []; grammarUsing = []; wordsUsingKanji = [];
		verbPair = null; suggestedCounter = null; suruVerb = null; baseNoun = null;

		const currentKind = itemId.split(':')[0];
		const currentRawId = itemId.split(':').slice(1).join(':');

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

	$effect(() => { void itemId; loadItem(); });

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

		{#if kanjiUsed.length > 0}
		<article class="detail-card">
			<p class="card-title">Kanji usati</p>
			<div class="chip-row">
				{#each kanjiUsed as k}
					<a href="{base}/detail/kanji:{k.id}" class="kanji-chip">
						<span class="kanji-char">{k.id}</span>
						<span class="kanji-meaning">{locale === 'it' ? k.significato.it : k.significato.en}</span>
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
