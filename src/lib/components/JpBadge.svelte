<script lang="ts">
	import { renderFuriganaToHtml } from '$lib/core/furigana';
	import { detectUserLocale } from '$lib/core/i18n';

	const { label, variant = '' }: { label: string; variant?: string } = $props();

	const TOOLTIPS_IT: Record<string, string> = {
		名詞: 'Nome: parola che indica persone, cose, luoghi o concetti.',
		動詞: "Verbo: indica un'azione o uno stato.",
		形容詞: 'Aggettivo: descrive qualità o caratteristiche.',
		副詞: 'Avverbio: modifica verbo, aggettivo o frase.',
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
		読み: 'Indicazioni di lettura del termine o kanji.'
	};

	const TOOLTIPS_EN: Record<string, string> = {
		名詞: 'Noun: names people, things, places, or concepts.',
		動詞: 'Verb: expresses an action or state.',
		形容詞: 'Adjective: describes qualities or characteristics.',
		副詞: 'Adverb: modifies a verb, adjective, or sentence.',
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
		読み: 'Reading hints for the term or kanji.'
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
		助詞: '🪝',
		助数詞: '🔢',
		慣用表現: '💬',
		五段動詞: '5️⃣',
		一段動詞: '1️⃣',
		不規則動詞: '*️⃣',
		他動詞: '👉',
		自動詞: '🤖',
		い形容詞: '🔴',
		な形容詞: '🧩'
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
	const icon = $derived(ICONS_BY_LABEL[plain] ?? ICONS_BY_VARIANT[variant] ?? '');
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span class="jp-badge {variant}" tabindex="0">
	{#if icon}<span class="badge-icon">{icon}</span>{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html renderFuriganaToHtml(label)}
	<span class="badge-tooltip" role="tooltip">{tooltip}</span>
</span>

<style>
	.jp-badge {
		position: relative;
		cursor: help;
	}

	.badge-icon {
		margin-right: 4px;
		font-style: normal;
		font-size: 1.25em;
		line-height: 1;
		vertical-align: middle;
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
