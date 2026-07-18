<script lang="ts">
	import { base } from '$app/paths';
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import { speakSentenceJapanese } from '$lib/core/tts';

	// Mini-guida alla grammatica del confronto, linkata dal gioco ⚖️ Comparazioni.
	interface Ex { jp: string; it: string }
	interface Pattern { icon: string; nome: string; struttura: string; spiega: string; ex: Ex[] }
	const PATTERNS: Pattern[] = [
		{
			icon: '⚖️',
			nome: 'AはBより〜  (A è più … di B)',
			struttura: 'A は B より [aggettivo]',
			spiega: 'より vuol dire «rispetto a / di». Metti prima la cosa di cui parli (A), poi il termine di paragone con より.',
			ex: [
				{ jp: '新幹線[しんかんせん]は 車[くるま]より 速[はや]いです。', it: 'Lo shinkansen è più veloce dell’auto.' },
				{ jp: '富士山[ふじさん]は スカイツリーより 高[たか]いです。', it: 'Il Fuji è più alto della Skytree.' }
			]
		},
		{
			icon: '👉',
			nome: 'BよりAのほうが〜  /  どちらのほうが〜?',
			struttura: 'A と B、どちらのほうが [aggettivo] ですか。 → A のほうが [aggettivo] です。',
			spiega: 'のほうが mette in risalto il vincitore (A). Per la domanda fra DUE cose si usa どちら (quale dei due).',
			ex: [
				{ jp: '犬[いぬ]と 猫[ねこ]、どちらのほうが 大[おお]きいですか。', it: 'Cane e gatto, quale dei due è più grande?' },
				{ jp: '猫より 犬のほうが 大きいです。', it: 'Il cane è più grande del gatto.' }
			]
		},
		{
			icon: '🥇',
			nome: '〜の中で〜がいちばん〜  (il più … di tutti)',
			struttura: '[gruppo] の中[なか]で [X] が いちばん [aggettivo] です。',
			spiega: 'いちばん = «il numero uno». Per chiedere fra TRE o più cose si usa どれ (quale). Con persone/luoghi/tempo: だれ / どこ / いつ.',
			ex: [
				{ jp: 'この 中[なか]で どれが いちばん 高[たか]いですか。', it: 'Fra questi, qual è il più alto?' },
				{ jp: 'エベレストが いちばん 高いです。', it: 'L’Everest è il più alto.' }
			]
		},
		{
			icon: '🚫',
			nome: 'AはBほど〜ない  (A non è … quanto B)',
			struttura: 'A は B ほど [aggettivo in forma negativa]',
			spiega: 'ほど + negativo = «non tanto … quanto». A è il termine “più debole”. Attento: il verbo/aggettivo va al NEGATIVO (高い → 高くない).',
			ex: [
				{ jp: '自転車[じてんしゃ]は 新幹線[しんかんせん]ほど 速[はや]くないです。', it: 'La bici non è veloce quanto lo shinkansen.' },
				{ jp: '今日[きょう]は 昨日[きのう]ほど 寒[さむ]くないです。', it: 'Oggi non fa freddo quanto ieri.' }
			]
		}
	];
</script>

<div class="guida">
	<a class="back" href="{base}/comparazioni">← ⚖️ Comparazioni</a>
	<h1 class="page-title">Come si confrontano le cose</h1>
	<p class="intro">
		In giapponese non esiste un «più» come in italiano: il confronto si fa con
		<strong>より</strong>, <strong>のほうが</strong>, <strong>いちばん</strong> e
		<strong>ほど〜ない</strong>. Ecco i quattro schemi del gioco.
	</p>

	{#each PATTERNS as p (p.nome)}
		<article class="card">
			<h2 class="p-nome"><span class="p-icon">{p.icon}</span> {p.nome}</h2>
			<p class="p-struttura">{p.struttura}</p>
			<p class="p-spiega">{p.spiega}</p>
			<div class="ex-list">
				{#each p.ex as e (e.jp)}
					<div class="ex">
						<div class="ex-jp">
							<InteractiveSentence text={e.jp} />
							<button class="tts" title="Ascolta" onclick={() => speakSentenceJapanese(e.jp.replace(/\[[^\]]*\]/g, ''))}>🔊</button>
						</div>
						<p class="ex-it">💬 {e.it}</p>
					</div>
				{/each}
			</div>
		</article>
	{/each}

	<a class="proceed" href="{base}/comparazioni">▶️ Gioca alle Comparazioni</a>
</div>

<style>
	.guida { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.intro { margin: 0; font-size: 0.9rem; color: var(--muted); line-height: 1.6; }
	.card { background: var(--surface); border-radius: 16px; padding: 18px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 8px; }
	.p-nome { margin: 0; font-size: 1.02rem; }
	.p-icon { margin-right: 4px; }
	.p-struttura { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--brand); background: var(--surface-2); border-radius: 8px; padding: 8px 10px; }
	.p-spiega { margin: 0; font-size: 0.86rem; color: var(--muted); line-height: 1.55; }
	.ex-list { display: grid; gap: 8px; margin-top: 2px; }
	.ex { background: var(--surface-2); border-radius: 10px; padding: 8px 10px; display: grid; gap: 2px; }
	.ex-jp { display: flex; align-items: baseline; gap: 6px; font-size: 1.05rem; }
	.ex-it { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.tts { border: none; background: none; cursor: pointer; font-size: 0.9rem; padding: 0 2px; }
	.proceed { justify-self: center; margin-top: 4px; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; text-decoration: none; }
</style>
