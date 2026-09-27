<script lang="ts">
	import ExamMiniGame from '$lib/components/ExamMiniGame.svelte';
	import { GIOCO_JOKEN } from '$lib/data/esame-n4-giochi';
</script>

<ExamMiniGame
	title="🔀 Condizionali と / ば / たら / なら"
	intro="Scegli la condizionale giusta per il contesto: conseguenza automatica, ipotesi, richiesta o ripresa del tema."
	rounds={GIOCO_JOKEN}
	creditMondai={['bunpo1', 'kumitate']}
/>
