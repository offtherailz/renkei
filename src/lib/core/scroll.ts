import { tick } from 'svelte';

// Scroll robusto a un elemento per id. Aspetta che il layout sia pronto
// (tick + un frame) prima di scrollare: arrivando da un'altra pagina, o con
// àncore a id prefissati (p-に, non gestite dallo scroll nativo dell'hash), lo
// scroll onMount partirebbe troppo presto e finirebbe nel punto sbagliato.
export async function scrollToAnchor(id: string): Promise<void> {
	if (!id) return;
	await tick();
	requestAnimationFrame(() => {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
}
