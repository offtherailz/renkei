<script lang="ts">
	// Un timbro はんこ disegnato: cerchio d'inchiostro col kanji al centro.
	// livello 0 = non ancora preso (contorno), 1 rosa leggero, 2 朱 pieno, 3 con bordo d'oro e 極.
	const { kanji, livello, grande = false }: { kanji: string; livello: number; grande?: boolean } = $props();
	// ogni timbro è storto a modo suo (sempre uguale per lo stesso kanji)
	const giro = $derived(((kanji.codePointAt(0) ?? 0) % 17) - 8);
</script>

<span class="hanko l{livello}" class:grande style="--giro: {giro}deg">
	<span class="k">{livello ? kanji : '?'}</span>
	{#if livello === 3}<span class="kiwami">極</span>{/if}
</span>

<style>
	.hanko { --ink: #c8102e; position: relative; display: inline-grid; place-items: center; width: 54px; height: 54px; border-radius: 48% 52% 50% 47%; border: 3px solid var(--ink); color: var(--ink); transform: rotate(var(--giro)); font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif; font-weight: 700; line-height: 1; mix-blend-mode: multiply; box-shadow: inset 0 0 0 2px transparent; }
	.hanko.grande { width: 120px; height: 120px; border-width: 6px; }
	.k { font-size: 30px; }
	.grande .k { font-size: 68px; }
	/* inchiostro un po' consumato: più chiaro ai bordi */
	.l1, .l2, .l3 { background: radial-gradient(circle at 40% 35%, transparent 55%, color-mix(in srgb, var(--ink) 10%, transparent)); }
	.l0 { --ink: #a9a39a; border-style: dashed; border-width: 2px; mix-blend-mode: normal; }
	.l0 .k { font-size: 22px; font-family: inherit; }
	.l1 { --ink: #e2899a; opacity: 0.85; }
	.l2 { --ink: #c8102e; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ink) 35%, transparent); }
	.l3 { --ink: #c8102e; box-shadow: 0 0 0 3px #d9a520, inset 0 0 0 2px color-mix(in srgb, var(--ink) 35%, transparent); }
	.kiwami { position: absolute; right: -8px; bottom: -6px; background: #d9a520; color: #fff; font-size: 11px; padding: 2px 3px; border-radius: 3px; transform: rotate(calc(-1 * var(--giro))); mix-blend-mode: normal; }
	.grande .kiwami { font-size: 20px; right: -12px; bottom: -8px; padding: 3px 5px; }
</style>
