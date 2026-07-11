<script lang="ts">
	// Coriandoli leggeri in emoji: nessun colore cablato, si dissolvono da soli.
	const EMOJI = ['🎉', '✨', '🌸', '⭐', '🎊'];
	const pieces = Array.from({ length: 22 }, (_, i) => ({
		emoji: EMOJI[i % EMOJI.length]!,
		left: Math.random() * 100,
		delay: Math.random() * 0.7,
		duration: 1.6 + Math.random() * 1.4,
		size: 0.8 + Math.random() * 0.9
	}));
</script>

<div class="confetti" aria-hidden="true">
	{#each pieces as p, i (i)}
		<span
			class="piece"
			style="left:{p.left}%; animation-delay:{p.delay}s; animation-duration:{p.duration}s; font-size:{p.size}rem;"
		>{p.emoji}</span>
	{/each}
</div>

<style>
	.confetti {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 999;
	}
	.piece {
		position: absolute;
		top: -8%;
		animation-name: fall;
		animation-timing-function: ease-in;
		animation-fill-mode: forwards;
	}
	@keyframes fall {
		0% { transform: translateY(0) rotate(0deg); opacity: 1; }
		80% { opacity: 1; }
		100% { transform: translateY(110vh) rotate(320deg); opacity: 0; }
	}
</style>
