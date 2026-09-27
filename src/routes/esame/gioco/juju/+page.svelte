<script lang="ts">
	import ExamMiniGame from '$lib/components/ExamMiniGame.svelte';
	import { GIOCO_JUJU } from '$lib/data/esame-n4-giochi';
</script>

<ExamMiniGame
	title="🎁 Direzione del favore"
	intro="Chi dà, chi riceve, in che direzione? Scegli あげる / くれる / もらう (e il keigo) giusto."
	rounds={GIOCO_JUJU}
	creditMondai={['hatsuwa', 'sokuji', 'bunpo1']}
	showArrows={true}
/>
