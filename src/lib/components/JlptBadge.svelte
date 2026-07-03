<script lang="ts">
	const { level }: { level: string } = $props();

	const COLORS: Record<string, { bg: string; fg: string }> = {
		N5: { bg: '#dcfce7', fg: '#166534' },
		N4: { bg: '#dbeafe', fg: '#1e40af' },
		N3: { bg: '#fef9c3', fg: '#854d0e' },
		N2: { bg: '#ffedd5', fg: '#9a3412' },
		N1: { bg: '#fee2e2', fg: '#991b1b' }
	};

	const color = $derived(COLORS[level] ?? { bg: '#e0e7ff', fg: '#3730a3' });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span class="jlpt-badge" style="background:{color.bg}; color:{color.fg}" tabindex="0">
	<ruby>{level}<rt>JLPT</rt></ruby>
	<span class="badge-tooltip" role="tooltip">Livello JLPT (Japanese Language Proficiency Test)</span>
</span>

<style>
	.jlpt-badge {
		display: inline-flex;
		align-items: center;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 2px 8px 3px;
		border-radius: 8px;
		line-height: 1.15;
		position: relative;
		cursor: help;
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

	.jlpt-badge:hover .badge-tooltip,
	.jlpt-badge:focus .badge-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.jlpt-badge rt {
		font-size: 0.48rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}
</style>
