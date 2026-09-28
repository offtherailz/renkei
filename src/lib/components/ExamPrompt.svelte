<script lang="ts">
	// Rende la consegna d'esame separando graficamente: scena 〔…〕, testo/frase,
	// e domanda (問:…). Toglie i marcatori di servizio (★に入るのは?, 語群:…).
	// `interactive`: parole cliccabili (Approfondisci) nel testo e nella domanda.
	import InteractiveSentence from './InteractiveSentence.svelte';
	import FuriganaText from './FuriganaText.svelte';
	import { examStrip } from '$lib/data/kanjiN4';

	const {
		text,
		interactive = false,
		mondai = '',
		furigana = false
	}: { text: string; interactive?: boolean; mondai?: string; furigana?: boolean } = $props();

	// Istruzione per i tipi d'ascolto in cui non è ovvio cosa scegliere.
	const instr = $derived(
		mondai === 'sokuji'
			? '👂 即時応答 — ascolta la battuta e scegli la RISPOSTA adatta.'
			: mondai === 'hatsuwa'
				? '👂 発話表現 — nella situazione descritta, scegli COSA DIRE.'
				: ''
	);

	interface Parsed {
		scena: string;
		body: string;
		question: string;
		kumitate: boolean;
	}
	function parse(t: string): Parsed {
		let s = t;
		let scena = '';
		const sm = s.match(/^〔([^〕]*)〕\s*/);
		if (sm) {
			scena = sm[1]!.trim();
			s = s.slice(sm[0].length);
		}
		// marcatori di servizio del 組み立て
		s = s.replace(/★に\s*入るのは[?？]\s*/g, '').replace(/\s*語群[:：][^」』]*$/s, '');
		let question = '';
		const qm = s.match(/問[:：]\s*([\s\S]*)$/);
		if (qm) {
			question = qm[1]!.trim();
			s = s.slice(0, qm.index).trim();
		}
		const body = s.trim();
		return { scena, body, question, kumitate: body.includes('★') };
	}

	const p = $derived(parse(text));

	// 組み立て: i 4 spazi «＿①＿②★③＿④» sono illeggibili una volta tolti gli spazi.
	// Renderli come CASELLE distinte, senza numeri, con la ★ evidenziata (il pezzo
	// da indovinare va lì). Ritorna testo e caselle da comporre inline.
	function kumiSegments(body: string): { kind: 'text' | 'box'; text?: string; star?: boolean }[] {
		const out: { kind: 'text' | 'box'; text?: string; star?: boolean }[] = [];
		const re = /([＿★])[①-⑳]/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(body))) {
			if (m.index > last) out.push({ kind: 'text', text: body.slice(last, m.index) });
			out.push({ kind: 'box', star: m[1] === '★' });
			last = m.index + m[0].length;
		}
		if (last < body.length) out.push({ kind: 'text', text: body.slice(last) });
		return out;
	}
	const kumiParts = $derived(p.kumitate ? kumiSegments(p.body) : []);
	// 【…】 marca la parola-bersaglio (es. 漢字読み): all'esame va SOTTOLINEATA,
	// non messa tra parentesi. Spezza la riga in segmenti normali/bersaglio.
	function segs(line: string): { t: string; target: boolean }[] {
		const parts: { t: string; target: boolean }[] = [];
		const re = /【([^】]*)】/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(line))) {
			if (m.index > last) parts.push({ t: line.slice(last, m.index), target: false });
			parts.push({ t: m[1]!, target: true });
			last = m.index + m[0].length;
		}
		if (last < line.length) parts.push({ t: line.slice(last), target: false });
		return parts.length ? parts : [{ t: line, target: false }];
	}
	// Righe del corpo: se è un dialogo (役:「…」) → una battuta per riga;
	// altrimenti (lettura) → una frase per riga. Non spezzare dentro 「…」.
	const DLG_RE =
		/(女の人|男の人|女の子|男の子|アナウンス|ニュース|天気予報|店員|先生|学生|子ども|客|母|父|子|女|男)\s*[：:]\s*「[^」]*」/g;
	const bodyLines = $derived.by(() => {
		const dlg = p.body.match(DLG_RE);
		if (dlg && dlg.length > 0) return dlg.map((x) => x.trim());
		return p.body
			.split(/(?<=。)/)
			.map((x) => x.trim())
			.filter(Boolean);
	});
</script>

<div class="exam-prompt">
	{#if p.scena && p.scena !== '会話'}
		<p class="ep-scena">🔎 {p.scena}</p>
	{/if}
	{#if p.kumitate}
		<p class="ep-instr">🧩 Ordina i pezzi: quale va nel riquadro ★?</p>
	{:else if instr}
		<p class="ep-instr">{instr}</p>
	{/if}
	{#if p.body && p.kumitate}
		<p class="ep-line kumi">
			{#each kumiParts as part, i (i)}
				{#if part.kind === 'box'}<span class="kumi-box" class:star={part.star}>{part.star ? '★' : ''}</span>{:else}{@render piece(part.text ?? '')}{/if}
			{/each}
		</p>
	{:else if p.body}
		<div class="ep-body">
			{#each bodyLines as line (line)}
				<p class="ep-line">
					{#each segs(line) as seg (seg.t + seg.target)}
						{#if seg.target}<span class="ep-target">{@render piece(seg.t)}</span>{:else}{@render piece(seg.t)}{/if}
					{/each}
				</p>
			{/each}
		</div>
	{/if}
	{#if p.question}
		<p class="ep-q">
			❓ {#each segs(p.question) as seg (seg.t + seg.target)}{#if seg.target}<span class="ep-target">{@render piece(seg.t)}</span>{:else}{@render piece(seg.t)}{/if}{/each}
		</p>
	{/if}
</div>

{#snippet piece(t: string)}
	{#if interactive}<InteractiveSentence text={t} />{:else if furigana}<FuriganaText text={t} force={true} />{:else}<FuriganaText text={examStrip(t)} force={true} />{/if}
{/snippet}

<style>
	.exam-prompt { display: grid; gap: 6px; }
	.ep-scena { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.ep-instr { margin: 0; font-size: 0.8rem; font-weight: 700; color: var(--info-ink); background: var(--info-bg); border-radius: 8px; padding: 5px 9px; }
	.ep-body { display: grid; gap: 2px; }
	.ep-line { margin: 0; }
	.ep-q { margin: 4px 0 0; font-weight: 700; border-top: 1px solid var(--line); padding-top: 6px; }
	/* Parola-bersaglio come all'esame: sottolineata, non tra parentesi. */
	.ep-target { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; }
	/* 組み立て: caselle vuote ben separate, la ★ evidenziata (lì va la risposta). */
	.ep-line.kumi { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; line-height: 2.2; }
	.kumi-box { display: inline-block; min-width: 2.4em; border-bottom: 2px solid var(--ink); text-align: center; }
	.kumi-box.star { border: 2px solid var(--warn-ink); border-radius: 6px; color: var(--warn-ink); font-weight: 800; background: var(--warn-bg); min-width: 2em; }
</style>
