<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { appState } from '$lib/stores.svelte';
	import { loadObjectiveSummaries, countDueCards, countUnseenActive, loadCompletedObjectives, loadWeakItems, type ObjectiveSummary, type WeakItem } from '$lib/db/queries';
	import { canIntroduceNewCard, newCardsUsedToday, DEFAULT_NEW_CARDS_PER_DAY } from '$lib/core/dailyNewCards';
	import { db } from '$lib/db/schema';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import Confetti from '$lib/components/Confetti.svelte';
	import { computeStreak, celebrateOncePerDay, detectNewCompletions, type Streak } from '$lib/core/celebration';
	import { autoAdvanceCompletedLessons, listCourses, importCourseDataset, studyOnlyCourse } from '$lib/db/course-import';
	import { setObjectiveTreeEnabled } from '$lib/db/objectives';
	import { activityStartedToday, markActivityStartedToday } from '$lib/core/dailyPlan';

	let summaries = $state<ObjectiveSummary[]>([]);
	let dueCount = $state(0);
	let duePaused = $state(0);
	let unseenCount = $state(0);
	let loading = $state(true);
	let sessionStreak = $state<Streak | null>(null);
	let showConfetti = $state(false);
	let packParty = $state<string[]>([]); // nomi dei pack/lezioni appena completati

	// ── Piano di oggi ──
	let weakest = $state<WeakItem[]>([]);
	// completamento delle voci del piano (spunte giornaliere, localStorage)
	let activityDone = $state(false);
	// attività a rotazione giornaliera (varietà senza dover scegliere)
	const ACTIVITIES = [
		{ href: 'avventure', icon: '🗺️', label: "Un'avventura", hint: 'kaimono, ristorante o treno' },
		{ href: 'lettura', icon: '⚡', label: 'Lettura veloce', hint: 'un testo a tempo' },
		{ href: 'choukai', icon: '👂', label: '聴解 trappola', hint: 'un dialogo solo audio' },
		{ href: 'skimming', icon: '🔎', label: 'Skimming', hint: "trova l'informazione" },
		{ href: 'riordina', icon: '🧩', label: 'Riordina la frase', hint: 'sintassi a tocchi' }
	];
	const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
	const activity = ACTIVITIES[dayOfYear % ACTIVITIES.length]!;

	async function loadWeakest(): Promise<void> {
		weakest = await loadWeakItems(3);
	}

	// 0 ripassi dovuti ≠ "tutto fatto": se negli obiettivi attivi ci sono carte
	// mai viste e il budget giornaliero non è esaurito, il quiz ha ancora roba.
	const newCardsAvailable = $derived(
		unseenCount > 0 &&
			canIntroduceNewCard(appState.userProfile ?? {}, appState.settings.nuove_carte_al_giorno ?? DEFAULT_NEW_CARDS_PER_DAY)
	);
	// In modalità "più volte al giorno" (toggle spento) le carte tornano dovute in
	// giornata: la home non deve dire «tutto fatto per oggi».
	const studyOncePerDay = $derived(appState.settings.ripasso_una_volta_al_giorno ?? true);
	// Quante carte nuove entrerebbero ancora oggi: budget residuo, limitato da
	// quante mai-viste esistono davvero negli obiettivi attivi.
	const newCardsToday = $derived.by(() => {
		const cap = appState.settings.nuove_carte_al_giorno ?? DEFAULT_NEW_CARDS_PER_DAY;
		const left = Math.max(0, cap - newCardsUsedToday(appState.userProfile ?? {}));
		return Math.min(unseenCount, left);
	});

	async function loadData() {
		loading = true;
		const [s, due, unseen] = await Promise.all([loadObjectiveSummaries(), countDueCards(), countUnseenActive()]);
		summaries = s;
		dueCount = due.attivi;
		duePaused = due.inPausa;
		unseenCount = unseen;
		activityDone = activityStartedToday();
		void loadWeakest();
		void loadStreak(due.attivi);
		void loadPackParty();
		loading = false;
	}

	// ── Completamento del piano (spunte) ─────────────────────────────────────
	// Ripassi: fatto = niente dovuto E niente carte nuove che entrerebbero E hai
	// studiato oggi (stessa condizione del messaggio «tutto fatto per oggi»).
	const reviewsDone = $derived(
		dueCount === 0 && !newCardsAvailable && (sessionStreak?.attivoOggi ?? false)
	);
	// Punti deboli è un teaser (non un check giornaliero affidabile): fuori dal conteggio.
	const planTotal = $derived(2);
	const planDone = $derived((reviewsDone ? 1 : 0) + (activityDone ? 1 : 0));

	function startActivity(): void {
		// la navigazione del link procede da sola: qui solo la spunta
		markActivityStartedToday();
		activityDone = true;
	}

	// Festa (una volta sola) quando un pack/lezione arriva a "tutte le carte
	// viste almeno una volta". Lo snapshot vive in localStorage. Se è una
	// lezione di un corso, sblocca subito la successiva (percorso guidato che
	// avanza da solo, niente da spuntare a mano su /courses).
	async function loadPackParty(): Promise<void> {
		const done = await loadCompletedObjectives();
		const fresh = detectNewCompletions(done.map((d) => d.id));
		if (fresh.length === 0) return;
		const names = new Map(done.map((d) => [d.id, d.name]));
		const unlocked = await autoAdvanceCompletedLessons(fresh);
		packParty = [...fresh.map((id) => names.get(id) ?? id), ...unlocked.map((t) => `→ sbloccata: ${t}`)];
		showConfetti = true;
		setTimeout(() => (showConfetti = false), 3500);
	}

	// Streak dalle sessioni registrate + festa (una volta al giorno) quando i
	// ripassi del giorno sono a zero DOPO aver studiato oggi.
	async function loadStreak(due: number): Promise<void> {
		const sessions = await db.study_sessions.toArray();
		sessionStreak = computeStreak(sessions);
		if (due === 0 && sessionStreak.attivoOggi && celebrateOncePerDay('zero')) {
			showConfetti = true;
			setTimeout(() => (showConfetti = false), 3500);
		}
	}

	// Attiva/pausa un obiettivo: il quiz pesca solo da quelli "in studio".
	async function toggleObjective(id: string, enabled: boolean): Promise<void> {
		await db.study_objectives.update(id, { study_enabled: enabled, updated_at: Date.now() });
		summaries = await loadObjectiveSummaries();
	}

	// Onboarding al primo avvio: chi ha già basi non tocca nulla (comportamento
	// di oggi, tutto il catalogo attivo); chi parte da zero importa Genki I e
	// studia solo la lezione 1 — le prossime si sbloccano da sole.
	const ONBOARDING_KEY = 'renkei_onboarding_seen';
	let showOnboarding = $state(false);
	let onboardingStep = $state<'choice' | 'level' | 'mode'>('choice');
	let onboardingBusy = $state(false);
	let onboardingError = $state('');

	function dismissOnboarding(): void {
		try {
			localStorage.setItem(ONBOARDING_KEY, '1');
		} catch { /* niente storage: pazienza, ricomparirà */ }
		showOnboarding = false;
	}

	// Nota che resta in home dopo l'onboarding, per spiegare cosa è cambiato
	// (mettere in pausa un intero catalogo non è un'azione dell'utente: va
	// spiegata subito, altrimenti sembra che "tutto si sia spento da solo").
	let onboardingNotice = $state('');

	function chooseConsolidamento(): void {
		onboardingStep = 'level';
	}

	async function pickLevel(level: 'N5' | 'N4' | 'tutti'): Promise<void> {
		onboardingBusy = true;
		try {
			if (level === 'N5') {
				await setObjectiveTreeEnabled('obj-catalog-n4', false);
				onboardingNotice = 'Ho messo in pausa il catalogo N4 (i progressi restano salvati) — lo riattivi quando vuoi qui sotto, «Catalogo JLPT N4 → ✓ In studio».';
			} else if (level === 'N4') {
				await setObjectiveTreeEnabled('obj-catalog-n5', false);
				onboardingNotice = 'Ho messo in pausa il catalogo N5 (i progressi restano salvati) — lo riattivi quando vuoi qui sotto, «Catalogo JLPT N5 → ✓ In studio».';
			}
			onboardingStep = 'mode';
			await loadData();
		} finally {
			onboardingBusy = false;
		}
	}

	// Cadenza di studio scelta nell'intro: imposta e persiste ripasso_una_volta_al_giorno.
	async function chooseMode(oncePerDay: boolean): Promise<void> {
		appState.settings.ripasso_una_volta_al_giorno = oncePerDay;
		try {
			const updated = { ...$state.snapshot(appState.settings), updated_at: Date.now() };
			await db.app_settings.put(updated);
			appState.settings = updated;
		} catch { /* niente storage: pazienza, resta il default in memoria */ }
		dismissOnboarding();
	}

	async function chooseGuidato(): Promise<void> {
		onboardingBusy = true;
		onboardingError = '';
		try {
			const existing = await listCourses();
			if (!existing.some((c) => c.id === 'genki-1')) {
				const resp = await fetch(`${base}/corso-genki-1.json`);
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
				await importCourseDataset(await resp.text());
			}
			await studyOnlyCourse('genki-1');
			onboardingNotice = '🎯 Segui Genki I lezione per lezione: il catalogo libero N5/N4 è in pausa per non distrarti (i progressi restano salvati) — lo riattivi quando vuoi qui sotto.';
			onboardingStep = 'mode';
			await loadData();
		} catch (e) {
			onboardingError = `Non sono riuscito a impostare il percorso guidato (${String(e)}). Puoi farlo comunque da Corsi quando vuoi.`;
		} finally {
			onboardingBusy = false;
		}
	}

	onMount(loadData);

	// Ricarica quando appState viene inizializzato; l'onboarding si mostra solo
	// a quel punto (serve il seed pronto se si sceglie il percorso guidato).
	$effect(() => {
		if (appState.initialized) {
			loadData();
			if (typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY)) {
				showOnboarding = true;
			}
		}
	});

	function progressColor(p: number): string {
		if (p >= 75) return 'var(--progress-good)';
		if (p >= 40) return 'var(--progress-mid)';
		return 'var(--progress-low)';
	}

	const userLevel = $derived(appState.userProfile?.livello ?? 1);
	const userXp = $derived(appState.userProfile?.xp_totali ?? 0);
	// streak mostrata: quella tollerante dalle sessioni (fallback al profilo)
	const streak = $derived(sessionStreak?.giorni ?? appState.userProfile?.streak_giorni ?? 0);
	const xpForNextLevel = $derived(userLevel * 220);
	const xpProgress = $derived(Math.min(100, Math.round((userXp % 220) / 220 * 100)));
</script>

<header class="topbar">
	<img src="{base}/renkei-logo.svg" alt="Renkei" class="logo" width="52" height="52" />
	<div class="topbar-info">
		<h1 class="topbar-title">連携 Renkei</h1>
		<p class="topbar-sub">Lv.{userLevel} • 🔥 {streak} giorni</p>
	</div>
	<div class="topbar-xp">
		<div class="xp-badge">XP {userXp}</div>
		<div class="xp-bar-wrap">
			<div class="xp-bar-fill" style="width:{xpProgress}%"></div>
		</div>
	</div>
</header>

{#if showOnboarding}
<div class="onboarding-backdrop">
	<div class="onboarding-card">
		{#if onboardingStep === 'choice'}
			<h2 class="onboarding-title">Benvenuto su Renkei 👋</h2>
			<p class="onboarding-sub">Come vuoi iniziare?</p>
			<button class="onboarding-choice" onclick={chooseConsolidamento} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">📚 Ho già delle basi</span>
				<span class="onboarding-choice-hint">Voglio ripassare e consolidare — scelgo io quale livello attivare.</span>
			</button>
			<button class="onboarding-choice" onclick={chooseGuidato} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">🌱 Sono all'inizio</span>
				<span class="onboarding-choice-hint">Voglio un percorso guidato — importo Genki I e parto dalla lezione 1, il resto resta in pausa.</span>
			</button>
		{:else if onboardingStep === 'level'}
			<h2 class="onboarding-title">Quale livello attivi?</h2>
			<p class="onboarding-sub">Il resto resta in pausa — lo riattivi quando vuoi da «Il piano di oggi».</p>
			<button class="onboarding-choice" onclick={() => pickLevel('N5')} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">🌱 Solo N5</span>
				<span class="onboarding-choice-hint">Le basi: parole, kanji e grammatica di livello N5.</span>
			</button>
			<button class="onboarding-choice" onclick={() => pickLevel('N4')} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">📗 Solo N4</span>
				<span class="onboarding-choice-hint">Hai già N5: parti dal livello successivo.</span>
			</button>
			<button class="onboarding-choice" onclick={() => pickLevel('tutti')} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">📚 Entrambi</span>
				<span class="onboarding-choice-hint">N5 e N4 attivi insieme, come oggi.</span>
			</button>
		{:else}
			<h2 class="onboarding-title">Come vuoi studiare?</h2>
			<p class="onboarding-sub">Puoi cambiare quando vuoi in Impostazioni.</p>
			<button class="onboarding-choice" onclick={() => chooseMode(true)} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">📅 Una volta al giorno (consigliato)</span>
				<span class="onboarding-choice-hint">Ogni carta torna al massimo una volta al giorno: finito il ripasso, sei a posto fino a domani.</span>
			</button>
			<button class="onboarding-choice" onclick={() => chooseMode(false)} disabled={onboardingBusy}>
				<span class="onboarding-choice-title">🔁 Più volte al giorno</span>
				<span class="onboarding-choice-hint">Ripassi ravvicinati (10/60 min) sulle carte nuove: puoi tornare più volte in giornata.</span>
			</button>
		{/if}
		{#if onboardingBusy}<p class="onboarding-status">Preparo il percorso…</p>{/if}
		{#if onboardingError}<p class="onboarding-status error">{onboardingError}</p>{/if}
		<button class="onboarding-skip" onclick={dismissOnboarding} disabled={onboardingBusy}>Scelgo dopo</button>
	</div>
</div>
{/if}

{#if dueCount > 0}
<div class="due-banner">
	<span>📋 <strong>{dueCount}</strong> ripass{dueCount === 1 ? 'o' : 'i'} in attesa</span>
	<a href="{base}/quiz" class="btn btn-primary btn-sm">Ripassare ora</a>
</div>
{/if}

{#if showConfetti}
	<Confetti />
{/if}

{#if onboardingNotice}
<div class="notice-banner" role="status">
	<span class="notice-emoji">ℹ️</span>
	<span>{onboardingNotice}</span>
	<button class="party-close" onclick={() => (onboardingNotice = '')} aria-label="Chiudi">✕</button>
</div>
{/if}

{#if packParty.length > 0}
<div class="party-banner" role="status">
	<span class="party-emoji">🏆</span>
	<span>
		<strong>{packParty.length === 1 ? 'Completato' : 'Completati'}: {packParty.join(' • ')}</strong>
		— hai visto tutte le carte almeno una volta. すごい！
	</span>
	<button class="party-close" onclick={() => (packParty = [])} aria-label="Chiudi">✕</button>
</div>
{/if}
<section class="section-card">
	<h2 class="section-title">☀️ Il piano di oggi
		<span class="plan-progress" class:complete={planDone >= planTotal}>{planDone}/{planTotal}</span>
		{#if sessionStreak && sessionStreak.giorni > 0}
			<span class="streak" class:risk={sessionStreak.aRischio} title={sessionStreak.aRischio ? 'Streak a rischio: una sessione oggi la salva!' : 'Giorni di studio di fila'}>🔥 {sessionStreak.giorni}{sessionStreak.aRischio ? ' !' : ''}</span>
		{:else if sessionStreak?.aRischio}
			<span class="streak risk" title="Ultima chiamata: una sessione oggi salva la streak">🔥 !</span>
		{/if}
	</h2>
	<div class="plan-list">
		<a class="plan-row" class:done={reviewsDone} href="{base}/quiz">
			<span class="plan-icon">{reviewsDone ? '✅' : dueCount > 0 ? '📋' : '✨'}</span>
			<span class="plan-body">
				<span class="plan-label">Ripassi SRS</span>
				<span class="plan-hint">{dueCount > 0 ? `${dueCount} in attesa: prima questi!` : newCardsAvailable ? 'nessun ripasso in attesa — carte nuove pronte da iniziare ✨' : sessionStreak?.attivoOggi ? (studyOncePerDay ? 'tutto fatto per oggi — おつかれさま！🎉' : 'ripassi di adesso fatti — altri possono tornare più tardi oggi ⏳') : 'tutto fatto — torna più tardi'}{duePaused > 0 ? ` (+${duePaused} in pausa)` : ''}</span>
			</span>
			<span class="plan-go">→</span>
		</a>
		{#if weakest.length > 0}
			<div class="plan-row static weak-teaser">
				<span class="plan-icon">💪</span>
				<span class="plan-body">
					<span class="plan-label">Punti deboli <a class="weak-all" href="{base}/quiz?deboli=1">🔁 ripassali</a> <a class="weak-all" href="{base}/punti-deboli">vedi tutti →</a></span>
					<span class="plan-chips">
						{#each weakest as w (w.href)}
							<a class="weak-chip" href="{base}/{w.href}">{w.label} <small>{w.pct}%</small></a>
						{/each}
					</span>
				</span>
			</div>
		{/if}
		<a class="plan-row" class:done={activityDone} href="{base}/{activity.href}" onclick={startActivity}>
			<span class="plan-icon">{activityDone ? '✅' : activity.icon}</span>
			<span class="plan-body">
				<span class="plan-label">Attività del giorno: {activity.label}</span>
				<span class="plan-hint">{activityDone ? 'iniziata oggi ✓ — rigiocala quando vuoi' : `${activity.hint} — domani cambia`}</span>
			</span>
			<span class="plan-go">→</span>
		</a>
		<p class="plan-totals">
			Oggi ti aspettano: <strong>{dueCount}</strong> ripass{dueCount === 1 ? 'o' : 'i'}{duePaused > 0 ? ` (+${duePaused} in pausa)` : ''} · <strong>{newCardsToday}</strong> {newCardsToday === 1 ? 'carta nuova' : 'carte nuove'}
		</p>
	</div>
</section>

<section class="section-card">
	<div class="section-header">
		<h2 class="section-title">Obiettivi di studio</h2>
		<a href="{base}/quiz" class="btn btn-primary">▶ Avvia sessione{dueCount > 0 ? ` · ${dueCount}` : ''}</a>
	</div>
	<p class="obj-explainer">«✓ In studio» include tutto il suo contenuto nei ripassi del quiz; «⏸️ Pausa» lo lascia da parte — i progressi non si perdono, restano in attesa finché non riattivi.</p>

	{#if loading}
		<p class="muted-text">Caricamento…</p>
	{:else if summaries.length === 0}
		<p class="muted-text">Nessun obiettivo trovato. Il database si sta inizializzando…</p>
	{:else}
		<div class="objective-list">
			{#each summaries.filter((s) => s.objective.id !== 'obj-catalog-extra' || s.objective.study_enabled) as s}
				<article class="objective-card" class:disabled={!s.objective.study_enabled}>
					<div class="obj-top">
						<div>
							<strong class="obj-name">{s.objective.name}</strong>
							{#if s.objective.target_jlpt}
								<JlptBadge level={s.objective.target_jlpt} />
							{/if}
						</div>
						<button
							class="obj-status"
							class:enabled={s.objective.study_enabled}
							title={s.objective.study_enabled ? 'Tocca per mettere in pausa' : 'Tocca per mettere in studio'}
							onclick={() => toggleObjective(s.objective.id, !s.objective.study_enabled)}
						>
							{s.objective.study_enabled ? '✓ In studio' : '⏸️ Pausa'}
						</button>
					</div>
					<div class="obj-meta">
						{s.totalItems} item • {s.words} parole • {s.kanji} kanji • {s.grammar} grammatica
					</div>
					{#if s.dueCount > 0}
						<div class="obj-due">{s.dueCount} ripass{s.dueCount === 1 ? 'o' : 'i'} pront{s.dueCount === 1 ? 'o' : 'i'}</div>
					{/if}
					<div class="bar-wrap">
						<div class="bar-fill" style="width:{s.progress}%; background:{progressColor(s.progress)}"></div>
					</div>
					<div class="obj-progress-label">Consolidamento: {s.progress}%</div>
				</article>
			{/each}
		</div>
	{/if}
</section>

<section class="section-card quick-links">
	<h2 class="section-title">🧠 Studia</h2>
	<div class="quick-grid">
		<a href="{base}/quiz" class="quick-card">
			<span class="quick-icon">📋</span>
			<span>Sessione quiz</span>
		</a>
		<a href="{base}/punti-deboli" class="quick-card">
			<span class="quick-icon">💪</span>
			<span>Punti deboli — ripassa sempre</span>
		</a>
		<a href="{base}/courses" class="quick-card">
			<span class="quick-icon">📚</span>
			<span>Corsi</span>
		</a>
	</div>

	<h2 class="section-title group">🎮 Attività</h2>
	<div class="quick-grid">
		<a href="{base}/giochi" class="quick-card">
			<span class="quick-icon">🎮</span>
			<span>Giochi</span>
		</a>
		<a href="{base}/avventure" class="quick-card">
			<span class="quick-icon">🗺️</span>
			<span>Avventure</span>
		</a>
		<a href="{base}/ascolto" class="quick-card">
			<span class="quick-icon">🎧</span>
			<span>Ascolto dialoghi</span>
		</a>
		<a href="{base}/lettura" class="quick-card">
			<span class="quick-icon">⚡</span>
			<span>Lettura veloce</span>
		</a>
		<a href="{base}/shadowing" class="quick-card">
			<span class="quick-icon">🗣️</span>
			<span>Shadowing</span>
		</a>
		<a href="{base}/mani-libere" class="quick-card">
			<span class="quick-icon">🚗</span>
			<span>Mani libere <span class="quick-beta">beta</span></span>
		</a>
	</div>

	<h2 class="section-title group">📖 Cataloghi</h2>
	<div class="quick-grid">
		<a href="{base}/consolida" class="quick-card">
			<span class="quick-icon">💪</span>
			<span>Vocabolario</span>
		</a>
		<a href="{base}/forme" class="quick-card">
			<span class="quick-icon">📖</span>
			<span>Forme grammaticali</span>
		</a>
		<a href="{base}/forme-composte" class="quick-card">
			<span class="quick-icon">🧩</span>
			<span>Forme composte</span>
		</a>
		<a href="{base}/particelle" class="quick-card">
			<span class="quick-icon">🪝</span>
			<span>Particelle</span>
		</a>
		<a href="{base}/contatori" class="quick-card">
			<span class="quick-icon">🔢</span>
			<span>Contatori</span>
		</a>
		<a href="{base}/frasi-utili" class="quick-card">
			<span class="quick-icon">🆘</span>
			<span>Frasi utili</span>
		</a>
	</div>

	<h2 class="section-title group">⚙️ Altro</h2>
	<div class="quick-grid">
		<a href="{base}/guida" class="quick-card">
			<span class="quick-icon">📖</span>
			<span>Guida</span>
		</a>
		<a href="{base}/stats" class="quick-card">
			<span class="quick-icon">📊</span>
			<span>Statistiche</span>
		</a>
		<a href="{base}/settings" class="quick-card">
			<span class="quick-icon">⚙️</span>
			<span>Impostazioni</span>
		</a>
	</div>
</section>

<style>
	.topbar {
		background: linear-gradient(155deg, #0f2d64, #184ca7 55%, #2969d8);
		color: #fff;
		border-radius: 18px;
		padding: 16px;
		display: grid;
		grid-template-columns: 56px 1fr auto;
		gap: 12px;
		align-items: center;
		box-shadow: 0 14px 28px rgba(20, 52, 103, 0.28);
	}

	.logo { border-radius: 10px; width: 52px; height: 52px; display: block; }

	.topbar-info { min-width: 0; }

	.topbar-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.topbar-sub {
		margin: 2px 0 0;
		font-size: 0.78rem;
		opacity: 0.85;
	}

	.topbar-xp {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.xp-badge {
		font-size: 0.7rem;
		font-weight: 700;
		background: rgba(255,255,255,0.18);
		padding: 2px 8px;
		border-radius: 20px;
	}

	.xp-bar-wrap {
		width: 60px;
		height: 4px;
		background: rgba(255,255,255,0.25);
		border-radius: 4px;
		overflow: hidden;
	}

	.xp-bar-fill {
		height: 100%;
		background: #7dd3fc;
		border-radius: 4px;
		transition: width 0.4s;
	}

	.due-banner {
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		color: var(--warn-ink);
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		gap: 8px;
	}

	.onboarding-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(14, 29, 51, 0.55);
		display: grid;
		place-items: center;
		padding: 20px;
		z-index: 500;
	}
	.onboarding-card {
		background: var(--surface);
		border-radius: 18px;
		padding: 22px;
		max-width: 400px;
		width: 100%;
		display: grid;
		gap: 12px;
		box-shadow: 0 12px 40px rgba(14, 29, 51, 0.3);
	}
	.onboarding-title { margin: 0; font-size: 1.2rem; text-align: center; }
	.onboarding-sub { margin: 0; text-align: center; color: var(--muted); font-size: 0.9rem; }
	.onboarding-choice {
		display: grid;
		gap: 4px;
		text-align: left;
		background: var(--surface-2);
		border: 1.5px solid var(--line);
		border-radius: 12px;
		padding: 14px;
		cursor: pointer;
	}
	.onboarding-choice:hover:not(:disabled) { border-color: var(--brand); }
	.onboarding-choice:disabled { opacity: 0.6; cursor: default; }
	.onboarding-choice-title { font-weight: 700; font-size: 1rem; }
	.onboarding-choice-hint { font-size: 0.8rem; color: var(--muted); line-height: 1.4; }
	.onboarding-status { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }
	.onboarding-status.error { color: var(--danger); }
	.onboarding-skip { background: none; border: none; color: var(--muted); font-size: 0.82rem; text-decoration: underline; cursor: pointer; justify-self: center; }

	.notice-banner {
		background: var(--info-bg);
		border: 1px solid var(--info-border);
		color: var(--ink);
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.notice-emoji { font-size: 1.1rem; }

	.party-banner {
		background: var(--gold-bg);
		border: 1px solid var(--gold-border);
		color: var(--gold-ink);
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.9rem;
		line-height: 1.45;
	}
	.party-emoji { font-size: 1.3rem; }
	.party-close {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--gold-ink);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 4px;
	}

	.section-card {
		background: var(--surface);
		border-radius: 18px;
		padding: 18px;
		box-shadow: 0 2px 12px rgba(14, 29, 51, 0.07);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
		gap: 8px;
	}

	.section-title {
		margin: 0 0 14px;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink);
	}

	.section-header .section-title { margin: 0; }

	.streak {
		margin-left: 8px;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		color: var(--warn-ink);
		font-size: 0.8rem;
		font-weight: 800;
		vertical-align: middle;
	}
	.streak.risk { background: rgba(239,107,107,0.14); border-color: var(--danger); color: var(--danger); }

	.objective-list {
		display: grid;
		gap: 10px;
	}

	.objective-card {
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 12px 14px;
		background: var(--surface-2);
	}

	.objective-card.disabled { opacity: 0.55; }

	.obj-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 4px;
	}

	.obj-name { font-size: 0.9rem; }

	.obj-status {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 8px;
		white-space: nowrap;
		background: var(--surface-2);
		color: var(--muted);
		border: 1px solid transparent;
		cursor: pointer;
	}
	.obj-status:hover { border-color: var(--brand); }

	.obj-status.enabled {
		background: var(--ok-bg);
		color: var(--ok-ink);
	}

	.obj-meta {
		font-size: 0.75rem;
		color: var(--muted);
		margin-bottom: 4px;
	}

	.obj-due {
		font-size: 0.73rem;
		color: var(--brand);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.bar-wrap {
		height: 6px;
		background: var(--line);
		border-radius: 4px;
		overflow: hidden;
		margin: 6px 0 4px;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.4s;
	}

	.obj-progress-label {
		font-size: 0.7rem;
		color: var(--muted);
	}

	.plan-list { display: grid; gap: 8px; }
	.plan-totals { margin: 0; font-size: 0.78rem; color: var(--muted); text-align: right; }
	.plan-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2); text-decoration: none; color: var(--ink); }
	.plan-row:not(.static):hover { border-color: var(--brand); }
	.plan-row.done { opacity: 0.65; border-style: dashed; }
	.plan-progress {
		font-size: 0.72rem; font-weight: 800; color: var(--muted);
		border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}
	.plan-progress.complete { color: var(--success); border-color: var(--success); }
	.plan-icon { font-size: 1.4rem; }
	.plan-body { flex: 1; min-width: 0; display: grid; gap: 2px; }
	.plan-label { font-size: 0.88rem; font-weight: 700; }
	.plan-hint { font-size: 0.75rem; color: var(--muted); }
	.plan-go { color: var(--brand); font-weight: 700; }
	.plan-chips { display: flex; flex-wrap: wrap; gap: 6px; }
	.weak-chip { padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); text-decoration: none; color: var(--ink); font-size: 0.85rem; }
	.weak-chip small { color: var(--muted); font-size: 0.7rem; }
	.weak-chip:hover { border-color: var(--brand); }
	.weak-teaser { padding: 8px 12px; }
	.weak-teaser .plan-icon { font-size: 1.1rem; }
	.weak-teaser .plan-label { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 0.78rem; font-weight: 600; color: var(--muted); }
	.weak-teaser .weak-chip { font-size: 0.78rem; padding: 2px 8px; }
	.weak-all { font-size: 0.75rem; font-weight: 600; color: var(--brand); text-decoration: none; white-space: nowrap; }
	.weak-all:hover { text-decoration: underline; }

	.quick-links .section-title { margin-bottom: 12px; }
	.quick-links .section-title.group { margin-top: 18px; }

	.quick-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.quick-beta {
		font-size: 0.55rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 1px 5px; vertical-align: middle;
	}
	.quick-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 8px;
		border-radius: 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
		font-size: 0.8rem;
		font-weight: 500;
		transition: background 150ms;
	}

	.quick-card:hover { background: #e8f0fe; }

	.quick-icon { font-size: 1.4rem; }

	.muted-text { color: var(--muted); font-size: 0.85rem; }
	.obj-explainer { margin: -6px 0 4px; font-size: 0.78rem; color: var(--muted); line-height: 1.4; }

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px 16px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 0.85rem;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: opacity 150ms;
	}

	.btn:hover { opacity: 0.88; }

	.btn-primary {
		background: var(--brand);
		color: #fff;
	}

	.btn-sm { padding: 5px 12px; font-size: 0.78rem; }
</style>
