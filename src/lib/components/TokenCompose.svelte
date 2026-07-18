<script lang="ts">
	// Banco di pezzi → area risposta, condiviso da /riordina, /dettato e dal quiz
	// (modi sentence-ordering + composition). Componente CONTROLLATO: gli array
	// stanno nella pagina (bind:), così snapshot e logica di conferma non cambiano.
	// Interazioni: tap per spostare fra banco e risposta; drag&drop (pointer-based,
	// funziona anche su touch) per riordinare e spostare i pezzi.
	interface Props {
		bank: string[];
		answer: string[];
		disabled?: boolean;
		placeholder?: string;
		status?: 'right' | 'wrong' | null;
		// mostra «Tutte le parole usate ✓» quando il banco è vuoto (ordering/dettato)
		bankDoneHint?: boolean;
	}
	let {
		bank = $bindable(),
		answer = $bindable(),
		disabled = false,
		placeholder = '',
		status = null,
		bankDoneHint = false
	}: Props = $props();

	type Zone = 'bank' | 'answer';
	const DRAG_THRESHOLD = 6; // px: sotto questa soglia è un tap, non un drag

	// stato del drag in corso
	let dragging = $state(false);
	let dragText = $state('');
	let ghostX = $state(0);
	let ghostY = $state(0);
	let dropZone = $state<Zone | null>(null);
	let dropIdx = $state(0);

	let startX = 0;
	let startY = 0;
	let srcZone = $state<Zone>('bank');
	let srcIdx = $state(0);
	let pointerId = -1;
	let armed = false; // pointerdown avvenuto, in attesa di superare la soglia

	function move(sZone: Zone, sIdx: number, tZone: Zone, tIdx: number): void {
		const src = sZone === 'bank' ? [...bank] : [...answer];
		const val = src[sIdx];
		if (val === undefined) return;
		src.splice(sIdx, 1);
		if (sZone === tZone) {
			let insert = tIdx;
			if (sIdx < tIdx) insert -= 1;
			src.splice(Math.max(0, Math.min(insert, src.length)), 0, val);
			if (sZone === 'bank') bank = src;
			else answer = src;
		} else {
			const tgt = tZone === 'bank' ? [...bank] : [...answer];
			tgt.splice(Math.max(0, Math.min(tIdx, tgt.length)), 0, val);
			if (sZone === 'bank') {
				bank = src;
				answer = tgt;
			} else {
				answer = src;
				bank = tgt;
			}
		}
	}

	// tap: banco → fondo risposta; risposta → fondo banco
	function tap(zone: Zone, idx: number): void {
		if (disabled) return;
		if (zone === 'bank') move('bank', idx, 'answer', answer.length);
		else move('answer', idx, 'bank', bank.length);
	}

	function onPointerDown(e: PointerEvent, zone: Zone, idx: number): void {
		if (disabled) return;
		armed = true;
		srcZone = zone;
		srcIdx = idx;
		startX = e.clientX;
		startY = e.clientY;
		pointerId = e.pointerId;
	}

	// individua zona + indice d'inserimento sotto il puntatore
	function resolveTarget(x: number, y: number): { zone: Zone; idx: number } | null {
		const el = document.elementFromPoint(x, y);
		if (!el) return null;
		const tokenEl = el.closest('[data-tc-zone][data-tc-idx]') as HTMLElement | null;
		if (tokenEl) {
			const zone = tokenEl.dataset.tcZone as Zone;
			const idx = Number(tokenEl.dataset.tcIdx);
			const rect = tokenEl.getBoundingClientRect();
			const after = x > rect.left + rect.width / 2;
			return { zone, idx: after ? idx + 1 : idx };
		}
		const zoneEl = el.closest('[data-tc-zone]') as HTMLElement | null;
		if (zoneEl) {
			const zone = zoneEl.dataset.tcZone as Zone;
			return { zone, idx: zone === 'bank' ? bank.length : answer.length };
		}
		return null;
	}

	function onPointerMove(e: PointerEvent): void {
		if (pointerId !== e.pointerId) return;
		if (!armed && !dragging) return;
		if (!dragging) {
			if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
			// supera la soglia: parte il drag
			dragging = true;
			dragText = (srcZone === 'bank' ? bank : answer)[srcIdx] ?? '';
			try {
				(e.target as HTMLElement).setPointerCapture(e.pointerId);
			} catch {
				/* niente capture: pazienza */
			}
		}
		ghostX = e.clientX;
		ghostY = e.clientY;
		const t = resolveTarget(e.clientX, e.clientY);
		if (t) {
			dropZone = t.zone;
			dropIdx = t.idx;
		} else {
			dropZone = null;
		}
	}

	function endDrag(): void {
		dragging = false;
		armed = false;
		dropZone = null;
		pointerId = -1;
	}

	function onPointerUp(e: PointerEvent): void {
		if (pointerId !== e.pointerId) return;
		if (dragging) {
			const t = resolveTarget(e.clientX, e.clientY);
			if (t) move(srcZone, srcIdx, t.zone, t.idx);
		}
		endDrag();
	}

	function onPointerCancel(): void {
		endDrag();
	}
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerCancel} />

<div
	class="tc-answer"
	class:filled={answer.length > 0}
	class:right={status === 'right'}
	class:wrong={status === 'wrong'}
	class:drop-here={dragging && dropZone === 'answer'}
	data-tc-zone="answer"
>
	{#if answer.length === 0}
		<span class="tc-placeholder">{placeholder}</span>
	{/if}
	{#each answer as tok, i (i)}
		{#if dragging && dropZone === 'answer' && dropIdx === i}<span class="tc-marker"></span>{/if}
		<button
			class="tc-token picked"
			class:ghosted={dragging && srcZone === 'answer' && srcIdx === i}
			data-tc-zone="answer"
			data-tc-idx={i}
			{disabled}
			onpointerdown={(e) => onPointerDown(e, 'answer', i)}
			onclick={() => { if (!dragging) tap('answer', i); }}
		>{tok}</button>
	{/each}
	{#if dragging && dropZone === 'answer' && dropIdx >= answer.length}<span class="tc-marker"></span>{/if}
</div>

<div class="tc-bank" class:drop-here={dragging && dropZone === 'bank'} data-tc-zone="bank">
	{#each bank as tok, i (i)}
		{#if dragging && dropZone === 'bank' && dropIdx === i}<span class="tc-marker"></span>{/if}
		<button
			class="tc-token"
			class:ghosted={dragging && srcZone === 'bank' && srcIdx === i}
			data-tc-zone="bank"
			data-tc-idx={i}
			{disabled}
			onpointerdown={(e) => onPointerDown(e, 'bank', i)}
			onclick={() => { if (!dragging) tap('bank', i); }}
		>{tok}</button>
	{/each}
	{#if bank.length === 0 && bankDoneHint && !disabled}
		<span class="tc-bank-done">Tutte le parole usate ✓</span>
	{/if}
</div>

{#if dragging}
	<div class="tc-ghost" style="left:{ghostX}px; top:{ghostY}px;">{dragText}</div>
{/if}

<style>
	.tc-answer {
		min-height: 52px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
		background: var(--surface-2); border: 1.5px dashed var(--line); border-radius: 12px; padding: 10px;
	}
	.tc-answer.right { border-color: var(--success); border-style: solid; background: var(--ok-bg); }
	.tc-answer.wrong { border-color: var(--danger); border-style: solid; background: var(--danger-bg); }
	.tc-answer.drop-here, .tc-bank.drop-here { border-color: var(--brand); }
	.tc-placeholder { font-size: 0.82rem; color: var(--muted); }
	.tc-bank { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; min-height: 30px; }
	.tc-bank-done { font-size: 0.82rem; color: var(--success); font-weight: 600; }
	.tc-token {
		padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--line);
		background: var(--surface); color: var(--ink); font-size: 1.1rem; cursor: pointer;
		touch-action: none; user-select: none;
	}
	.tc-token:hover:not(:disabled) { border-color: var(--brand); }
	.tc-token:disabled { cursor: default; }
	.tc-token.picked { background: var(--surface-2); font-weight: 700; }
	.tc-token.ghosted { opacity: 0.3; }
	.tc-marker { width: 3px; align-self: stretch; min-height: 1.6em; background: var(--brand); border-radius: 2px; }
	.tc-ghost {
		position: fixed; transform: translate(-50%, -50%); z-index: 50; pointer-events: none;
		padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--brand);
		background: var(--surface); color: var(--ink); font-size: 1.1rem; font-weight: 700;
		box-shadow: 0 4px 14px rgba(14,29,51,0.25);
	}
</style>
