<script lang="ts">
	import { base } from '$app/paths';
	import { renderFuriganaToHtml } from '$lib/core/furigana';
	import { detectUserLocale } from '$lib/core/i18n';
	import { FORM_SLUG_BY_LABEL } from '$lib/data/grammarForms';

	const { label, variant = '' }: { label: string; variant?: string } = $props();

	const TOOLTIPS_IT: Record<string, string> = {
		名詞: 'Nome: parola che indica persone, cose, luoghi o concetti.',
		動詞: "Verbo: indica un'azione o uno stato.",
		形容詞: 'Aggettivo: descrive qualità o caratteristiche.',
		副詞: 'Avverbio: modifica verbo, aggettivo o frase.',
		連体詞: 'Rentaishi: parola pre-nominale, sta solo davanti a un nome (この/その/あの). Non si coniuga.',
		接続詞: 'Congiunzione: collega frasi o proposizioni (でも, そして…).',
		数詞: 'Numerale: parola che indica un numero (一, 二, 百, 一つ…).',
		助数詞: 'Contatore numerale: usato per contare oggetti/persone.',
		慣用表現: 'Espressione idiomatica: frase fissa con significato non letterale.',
		その他: 'Altra categoria grammaticale.',
		五段動詞: 'Verbo godan: la base cambia su 5 vocali in coniugazione.',
		一段動詞: 'Verbo ichidan: coniugazione regolare in -る (ru-verb).',
		不規則動詞: 'Verbo irregolare: coniugazione non regolare.',
		自動詞: 'Verbo intransitivo: non regge complemento oggetto diretto.',
		他動詞: 'Verbo transitivo: regge complemento oggetto diretto.',
		い形容詞: 'Aggettivo in -い: si coniuga direttamente.',
		な形容詞: 'Aggettivo in -な: richiede な prima del nome.',
		文法: 'Categoria grammaticale / struttura di grammatica.',
		読み: 'Indicazioni di lettura del termine o kanji.',
		尊敬語: 'Sonkeigo: eleva le azioni di altri (capo, cliente, superiori).',
		謙譲語: 'Kenjougo: abbassa te stesso per essere umile verso l\'interlocutore.'
	};

	const TOOLTIPS_EN: Record<string, string> = {
		名詞: 'Noun: names people, things, places, or concepts.',
		動詞: 'Verb: expresses an action or state.',
		形容詞: 'Adjective: describes qualities or characteristics.',
		副詞: 'Adverb: modifies a verb, adjective, or sentence.',
		連体詞: 'Rentaishi: pre-noun adjectival, only precedes a noun (この/その/あの). Does not inflect.',
		接続詞: 'Conjunction: links clauses or sentences.',
		数詞: 'Numeral: a word denoting a number (一, 二, 百, 一つ…).',
		助数詞: 'Counter word used with numbers for counting.',
		慣用表現: 'Idiomatic expression: fixed phrase with non-literal meaning.',
		その他: 'Other grammatical category.',
		五段動詞: 'Godan verb: stem shifts across five vowel rows.',
		一段動詞: 'Ichidan verb: regular -ru verb conjugation.',
		不規則動詞: 'Irregular verb: non-regular conjugation pattern.',
		自動詞: 'Intransitive verb: does not take a direct object.',
		他動詞: 'Transitive verb: takes a direct object.',
		い形容詞: 'I-adjective: inflects directly.',
		な形容詞: 'Na-adjective: requires な before nouns.',
		文法: 'Grammar category / pattern.',
		読み: 'Reading hints for the term or kanji.',
		尊敬語: 'Sonkeigo: elevates the actions of others (boss, customer, superiors).',
		謙譲語: 'Kenjougo: lowers yourself to be humble toward the listener.'
	};

	// Icone per riconoscere la categoria a colpo d'occhio.
	// Parti del discorso: 🏃 verbo (azione), 📦 sostantivo (oggetto statico),
	// 🎨 aggettivo (descrive), 🔀 avverbio (modifica), 🪝 particella (lega).
	// Classe verbale: 5️⃣ godan, 1️⃣ ichidan, *️⃣ irregolare.
	// Transitività: 👉 他動詞 (azione verso un oggetto), 🤖 自動詞 (azione su di sé).
	// Aggettivi: 🔴 in -い (forma pura), 🧩 in -な (serve il "pezzo" な).
	const ICONS_BY_LABEL: Record<string, string> = {
		動詞: '🏃',
		名詞: '📦',
		形容詞: '🎨',
		副詞: '🔀',
		連体詞: '📌',
		接続詞: '➕',
		助詞: '🪝',
		数詞: '🔟',
		助数詞: '🔢',
		慣用表現: '💬',
		五段動詞: '5️⃣',
		一段動詞: '1️⃣',
		不規則動詞: '*️⃣',
		他動詞: '👉',
		自動詞: '🤖',
		尊敬語: '👑',
		謙譲語: '🙇'
	};

	// Aggettivi: l'icona È la desinenza — い/な stilizzati come emoticon.
	const KANA_ICONS: Record<string, string> = {
		い形容詞: 'い',
		な形容詞: 'な'
	};

	const ICONS_BY_VARIANT: Record<string, string> = {
		'jp-badge-pos': '☰'
	};

	const locale = detectUserLocale();
	const plain = $derived(label.replace(/\[[^\]]+\]/g, ''));
	const tooltip = $derived(
		(locale === 'it' ? TOOLTIPS_IT : TOOLTIPS_EN)[plain] ??
			(locale === 'it' ? 'Etichetta grammaticale.' : 'Grammar label.')
	);
	const kanaIcon = $derived(KANA_ICONS[plain] ?? '');
	const icon = $derived(kanaIcon ? '' : (ICONS_BY_LABEL[plain] ?? ICONS_BY_VARIANT[variant] ?? ''));
	const formSlug = $derived(FORM_SLUG_BY_LABEL[plain]);
</script>

{#if formSlug}
	<a class="jp-badge jp-badge-link {variant}" href="{base}/forme#{formSlug}">
		{#if kanaIcon}<span class="kana-icon kana-icon-{kanaIcon === 'い' ? 'i' : 'na'}">{kanaIcon}</span>{/if}
		{#if icon}<span class="badge-icon">{icon}</span>{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderFuriganaToHtml(label)}
		<span class="badge-tooltip" role="tooltip">{tooltip} Tocca per la spiegazione.</span>
	</a>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<span class="jp-badge {variant}" tabindex="0">
		{#if kanaIcon}<span class="kana-icon kana-icon-{kanaIcon === 'い' ? 'i' : 'na'}">{kanaIcon}</span>{/if}
		{#if icon}<span class="badge-icon">{icon}</span>{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderFuriganaToHtml(label)}
		<span class="badge-tooltip" role="tooltip">{tooltip}</span>
	</span>
{/if}

<style>
	.jp-badge {
		position: relative;
		cursor: help;
	}

	.jp-badge-link {
		cursor: pointer;
		text-decoration: none;
	}

	.jp-badge-link:hover {
		filter: brightness(0.96);
	}

	.badge-icon {
		margin-right: 4px;
		font-style: normal;
		font-size: 1.25em;
		line-height: 1;
		vertical-align: middle;
	}

	/* い/な come emoticon: cerchietto colorato con il kana bianco in rilievo */
	.kana-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5em;
		height: 1.5em;
		margin-right: 4px;
		border-radius: 50%;
		color: #fff;
		font-size: 0.95em;
		font-weight: 800;
		line-height: 1;
		vertical-align: middle;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
		box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.18), inset 0 2px 3px rgba(255, 255, 255, 0.35);
	}

	.kana-icon-i {
		background: radial-gradient(circle at 30% 30%, #fb7185, var(--danger));
	}

	.kana-icon-na {
		background: radial-gradient(circle at 30% 30%, #5eead4, #0d9488);
	}

	.badge-tooltip {
		position: absolute;
		bottom: calc(100% + 7px);
		left: 50%;
		transform: translateX(-50%);
		width: max-content;
		max-width: 220px;
		padding: 6px 10px;
		border-radius: 8px;
		background: #0f2d64;
		color: #fff;
		font-size: 0.72rem;
		font-weight: 500;
		line-height: 1.35;
		text-align: center;
		opacity: 0;
		visibility: hidden;
		transition: opacity 120ms;
		pointer-events: none;
		z-index: 100;
	}

	.badge-tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 5px solid transparent;
		border-top-color: #0f2d64;
	}

	.jp-badge:hover .badge-tooltip,
	.jp-badge:focus .badge-tooltip {
		opacity: 1;
		visibility: visible;
	}
</style>
