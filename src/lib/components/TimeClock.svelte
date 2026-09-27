<script lang="ts">
	// Orologino analogico (quadrante 12 tacche = `total` minuti) con archi colorati:
	// verde = intervallo principale (es. tutta la prova), rosso = intervallo del
	// singolo gruppo. Dà un colpo d'occhio su quanto tempo prende.
	interface Props {
		total?: number; // minuti = giro completo (default 120 = quadrante 2h)
		green?: number; // minuti evidenziati in verde
		red?: number; // minuti evidenziati in rosso (opzionale)
		size?: number; // px
	}
	const { total = 120, green = 0, red, size = 44 }: Props = $props();

	const rG = 34;
	const rR = 23;
	const cG = 2 * Math.PI * rG;
	const cR = 2 * Math.PI * rR;
	const frac = (m: number) => Math.max(0, Math.min(1, m / total));
	const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<svg viewBox="0 0 100 100" width={size} height={size} class="clock" role="img" aria-label="tempo">
	<circle cx="50" cy="50" r="46" class="face" />
	{#each ticks as a (a)}
		<line x1="50" y1="6" x2="50" y2="12" class="tick" transform="rotate({a} 50 50)" />
	{/each}
	<!-- verde: intervallo principale -->
	<circle
		cx="50" cy="50" r={rG} class="arc green"
		stroke-dasharray="{frac(green) * cG} {cG}"
		transform="rotate(-90 50 50)"
	/>
	{#if red !== undefined}
		<circle
			cx="50" cy="50" r={rR} class="arc red"
			stroke-dasharray="{frac(red) * cR} {cR}"
			transform="rotate(-90 50 50)"
		/>
	{/if}
	<circle cx="50" cy="50" r="3" class="hub" />
</svg>

<style>
	.clock { display: block; }
	.face { fill: var(--surface); stroke: var(--line); stroke-width: 2; }
	.tick { stroke: var(--muted); stroke-width: 2; }
	.arc { fill: none; stroke-width: 7; stroke-linecap: round; }
	.arc.green { stroke: var(--success); }
	.arc.red { stroke: var(--danger); }
	.hub { fill: var(--muted); }
</style>
