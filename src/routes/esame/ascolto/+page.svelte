<script lang="ts">
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakExamListening } from '$lib/core/examListening';

	// Parole d'ordine/tempo da riconoscere nel 課題理解.
	const ORDINE: { jp: string; it: string }[] = [
		{ jp: 'まず / 最初[さいしょ]に / はじめに', it: 'prima di tutto / all’inizio' },
		{ jp: '次[つぎ]に / それから / そのあと', it: 'poi / dopo di che' },
		{ jp: '〜てから', it: 'dopo aver… (e poi)' },
		{ jp: '〜た あとで', it: 'dopo che…' },
		{ jp: '〜る 前[まえ]に', it: 'prima di…' },
		{ jp: '〜たら', it: 'dopo/quando… (poi)' },
		{ jp: '先[さき]に', it: 'prima (di un’altra cosa)' },
		{ jp: '最後[さいご]に', it: 'alla fine' },
		{ jp: 'あとで / 後回[あとまわ]しに', it: 'dopo / rimandare' },
		{ jp: '〜ついでに', it: 'già che ci sei / approfittando' }
	];

	// Esempi ascoltabili (voci alternate come all'esame).
	const ESEMPI: { titolo: string; prompt: string; risposta: string }[] = [
		{
			titolo: '課題理解 — svolta でも/じゃあ',
			prompt: '〔会話〕先生[せんせい]:「レポートは 書[か]けましたか。」 学生[がくせい]:「はい。でも 名前[なまえ]を 書[か]くのを 忘[わす]れました。」 先生:「じゃあ、出[だ]す 前[まえ]に 名前を 書いて ください。」 問: 学生は これから 何を しますか。',
			risposta: '→ 名前を 書く (il compito finale, dopo «でも/じゃあ»)'
		},
		{
			titolo: '課題理解 — ordine (その前に)',
			prompt: '〔会話〕男[おとこ]:「出[で]かける 前[まえ]に ゴミを 出[だ]して。」 女[おんな]:「うん。でも その前に お皿[さら]を 洗[あら]う。洗ってから 出す。」 問: 女の人は はじめに 何を しますか。',
			risposta: '→ お皿を 洗う → ゴミを 出す → 出かける'
		},
		{
			titolo: '課題理解 — cosa comprare (もう ある)',
			prompt: '〔会話〕女[おんな]:「卵[たまご]と 牛乳[ぎゅうにゅう]を 買[か]って きて。」 男[おとこ]:「牛乳は まだ 家[いえ]に あるよ。」 女:「あ、じゃあ 卵 だけ。」 問: 男の人は 何を 買いますか。',
			risposta: '→ 卵 だけ (il latte c’è già → non si compra)'
		},
		{
			titolo: 'ポイント理解 — perché (実は/でも)',
			prompt: '〔会話〕女[おんな]:「どうして 昨日[きのう] 休[やす]んだの?」 男[おとこ]:「朝[あさ] 頭[あたま]が 痛[いた]くて。でも 病院[びょういん]には 行[い]かないで 家[いえ]で 寝[ね]て いました。」 問: 男の人は なぜ 休みましたか。',
			risposta: '→ 頭が 痛かったから (病院 è nominato ma negato)'
		}
	];
</script>

<div class="guida">
	<a class="back" href="{base}/esame">← Esame N4</a>
	<h1 class="page-title">🎧 Trucchi per l’ascolto</h1>
	<p class="sub">Le parole da riconoscere nella domanda e nel dialogo, e le trappole tipiche. L’audio è a voci alternate come all’esame.</p>

	<section class="block">
		<h2>問題1 課題理解 — «cosa fa DOPO»</h2>
		<p>La risposta è l’<strong>azione finale decisa</strong>, non le proposte scartate.</p>
		<p class="lbl">Domanda:</p>
		<ul>
			<li><FuriganaText text="この あと、何[なに]を しますか。" force={true} /> — cosa fa dopo?</li>
			<li><FuriganaText text="まず、何[なに]を しなければ なりませんか。" force={true} /> — per prima cosa?</li>
			<li><FuriganaText text="これから 何[なに]を しますか。" force={true} /> — cosa farà ora?</li>
		</ul>
		<p class="lbl">Segnali di svolta (l’ordine spesso cambia qui):</p>
		<p class="chips">でも · だけど · じゃあ · やっぱり · 先[さき]に · その前[まえ]に</p>
	</section>

	<section class="block">
		<h2>Parole dell’ordine / tempo</h2>
		<div class="tbl">
			{#each ORDINE as r (r.jp)}
				<div class="row"><span class="jp"><FuriganaText text={r.jp} force={true} /></span><span class="it">{r.it}</span></div>
			{/each}
		</div>
		<p class="warn">⚠️ <FuriganaText text="〜ながら" force={true} /> = <strong>contemporaneo</strong>, non sequenza.</p>
	</section>

	<section class="block">
		<h2>Cosa si compra / porta</h2>
		<p class="lbl">Domanda:</p>
		<ul>
			<li><FuriganaText text="何[なに]を 買[か]いますか / 持[も]って いきますか。" force={true} /></li>
			<li><FuriganaText text="いくつ / 何個[なんこ] / 何本[なんぼん] / 何枚[なんまい] 買[か]いますか。" force={true} /></li>
		</ul>
		<p class="lbl">Trappole (cosa NON comprare / cambi):</p>
		<ul>
			<li><FuriganaText text="A じゃなくて B" force={true} /> — non A ma B</li>
			<li><FuriganaText text="A は もう ある / 家[いえ]に ある" force={true} /> — ce l’ho già → non comprarlo</li>
			<li><FuriganaText text="A は いらない" force={true} /> — non serve · <FuriganaText text="A が 足[た]りない" force={true} /> — manca A</li>
			<li><FuriganaText text="二[ふた]つ… やっぱり 三[みっ]つ" force={true} /> — cambio di quantità</li>
		</ul>
	</section>

	<section class="block">
		<h2>問題2 ポイント理解 — dettaglio / perché</h2>
		<p>Ti danno tempo di <strong>leggere le opzioni</strong> prima. Punta a UN dato.</p>
		<p class="lbl">Domanda:</p>
		<p class="chips">どうして · なぜ · いつ · どこで · だれと · いくら · 一番[いちばん]〜</p>
		<p class="warn">⚠️ Il distrattore è spesso <strong>detto e poi negato/corretto</strong> (<FuriganaText text="〜と 思[おも]って いたが、実[じつ]は…" force={true} />).</p>
	</section>

	<section class="block">
		<h2>問題3 発話表現 · 問題4 即時応答</h2>
		<p><strong>発話表現</strong>: immagine (freccia sul parlante) → <FuriganaText text="何[なん]と 言[い]いますか。" force={true} /> scegli la battuta.</p>
		<p><strong>即時応答</strong>: senti una battuta → scegli la risposta. Riconosci il tipo:</p>
		<ul>
			<li><FuriganaText text="〜ませんか / 〜ましょうか" force={true} /> — invito/offerta → accetta/rifiuta</li>
			<li><FuriganaText text="〜ても いいですか" force={true} /> — permesso → どうぞ / すみません…</li>
			<li>domanda <strong>negativa</strong> (<FuriganaText text="まだ?" force={true} />) — attento a はい/いいえ</li>
		</ul>
		<p class="drills">Allenati: <a href="{base}/esame/hatsuwa">発話表現</a> · <a href="{base}/esame/sokuji">即時応答</a></p>
	</section>

	<section class="block">
		<h2>🃏 Mazzi tematici (flashcard + pronuncia)</h2>
		<p>Ripassa il lessico per tema: tocca la carta per girarla, 🔊 per la pronuncia; le «da rivedere» tornano.</p>
		<p class="drills"><a href="{base}/mazzo/kaden">🔌 家電を買う — elettrodomestici e acquisti</a></p>
	</section>

	<section class="block">
		<h2>Esempi ascoltabili</h2>
		{#each ESEMPI as ex (ex.titolo)}
			<article class="ex">
				<div class="ex-top"><span class="ex-t">{ex.titolo}</span><button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => speakExamListening(ex.prompt)}>🔊</button></div>
				<div class="ex-jp"><FuriganaText text={ex.prompt} force={true} /></div>
				<p class="ex-r">{ex.risposta}</p>
			</article>
		{/each}
	</section>
</div>

<style>
	.guida { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.block { display: grid; gap: 6px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; }
	.block h2 { margin: 0 0 2px; font-size: 1.02rem; }
	.lbl { margin: 4px 0 0; font-size: 0.78rem; font-weight: 700; color: var(--muted); }
	.block ul { margin: 2px 0; padding-left: 18px; display: grid; gap: 3px; font-size: 0.9rem; }
	.chips { margin: 2px 0; font-size: 0.95rem; }
	.warn { margin: 4px 0 0; font-size: 0.82rem; color: var(--warn-ink); background: var(--warn-bg); border-radius: 8px; padding: 6px 9px; }
	.tbl { display: grid; gap: 4px; }
	.row { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--line); padding: 3px 0; }
	.row .jp { font-size: 0.95rem; }
	.row .it { font-size: 0.82rem; color: var(--muted); text-align: right; }
	.drills a { color: var(--brand); text-decoration: none; font-weight: 600; }
	.ex { display: grid; gap: 4px; border-top: 1px solid var(--line); padding-top: 8px; }
	.ex-top { display: flex; justify-content: space-between; align-items: center; }
	.ex-t { font-size: 0.8rem; font-weight: 700; color: var(--brand); }
	.ex-jp { font-size: 1.05rem; }
	.ex-r { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.tts { border: none; background: none; cursor: pointer; font-size: 1rem; }
</style>
