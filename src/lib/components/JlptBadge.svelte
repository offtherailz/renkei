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

<span class="jlpt-badge" style="background:{color.bg}; color:{color.fg}" title="Livello JLPT">
	<ruby>{level}<rt>JLPT</rt></ruby>
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
	}

	.jlpt-badge rt {
		font-size: 0.48rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}
</style>
