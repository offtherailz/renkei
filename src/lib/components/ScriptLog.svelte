<script lang="ts">
	// Copione condiviso delle avventure/giochi: battute cliccabili (popup parola)
	// con icona e accento per personaggio. Le pagine tengono solo il toggle 📜.
	import InteractiveSentence from './InteractiveSentence.svelte';

	interface Props {
		lines: { who: string; text: string }[];
		icons?: Record<string, string>;
		accents?: Record<string, string>; // who → colore bordo (token del tema)
		title?: string;
	}
	let { lines, icons = {}, accents = {}, title = '📜 Il dialogo finora' }: Props = $props();

	function iconOf(who: string): string {
		return icons[who] ?? (who === 'me' ? '🙂' : '🗣️');
	}
</script>

<div class="script">
	{#if title}<p class="script-title">{title}</p>{/if}
	{#each lines as l}
		<p
			class="line"
			class:me={l.who === 'me'}
			style={l.who !== 'me' && accents[l.who] ? `border-left-color:${accents[l.who]}` : ''}
		>
			<span class="line-who">{iconOf(l.who)}</span>
			<InteractiveSentence text={l.text} />
		</p>
	{/each}
</div>

<style>
	.script { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 4px; }
	.script-title { margin: 0 0 4px; font-size: 0.85rem; font-weight: 700; }
	.line { margin: 0; font-size: 0.95rem; padding: 5px 9px; border-radius: 8px; color: var(--ink); background: var(--surface-2); border-left: 3px solid var(--muted); }
	.line.me { border-left-color: var(--brand); text-align: right; }
	.line-who { font-size: 0.9rem; }
</style>
