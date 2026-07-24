<script lang="ts">
	// 📅 Prendi appuntamento (beta): negozi giorno+ora con un interlocutore,
	// cambiando registro (普通体/丁寧/敬語) secondo lo scenario scelto. Tu
	// proponi con un picker; l'NPC risponde a voce (accordo, o rifiuto+motivo
	// e contro-proposta): ascolti, controlli il TUO calendario e rispondi
	// (accetti se libero, altrimenti controproponi). Finisce quando concordate
	// lo stesso giorno+ora. Punteggio: pochi turni + pochi aiuti.
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import RepeatBar from '$lib/components/RepeatBar.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import { speakSequence, speakSentenceJapanese } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';
	import { appState } from '$lib/stores.svelte';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import { gameSnapshot } from '$lib/core/gameKit';
	import {
		WEEKDAYS,
		SCENARIOS,
		HOURS,
		type Scenario,
		type ScenarioId,
		type CalendarSlot,
		type Proposal,
		type WeekDate,
		generateWeek,
		generateWeekCalendar,
		randomPhrasing,
		dayItalian,
		isFree,
		slotAt,
		hourLabel,
		buildProposeLine,
		buildNpcProposeLine,
		pickRandomProposal,
		buildUserAcceptLine,
		buildUserCounterLine,
		buildNpcAcceptLine,
		buildNpcRejectLine,
		buildConfirmLine,
		pickNpcCounterProposal,
		randomMotivo,
		randomLuogo,
		computeScore
	} from '$lib/core/appuntamento';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function npcGender(): Gender {
		return opposite(userGender());
	}

	type Who = 'me' | 'npc';
	type Scene = 'pick' | 'play' | 'done';
	let scene = $state<Scene>('pick');

	let scenario = $state<Scenario | null>(null);
	let calendar = $state<CalendarSlot[]>([]);
	let week = $state<WeekDate[]>([]); // date reali (mese/giorno) allineate ai 7 giorni
	let dialog = $state<{ who: Who; text: string }[]>([]);

	// Negoziazione: l'ultima proposta "sul tavolo" e chi l'ha fatta per ultimo.
	let pendingProposal = $state<Proposal | null>(null); // proposta ancora da valutare dall'altra parte
	let lastRejected = $state<Proposal | null>(null); // per costruire G/G2 nelle battute
	let tried = $state<Proposal[]>([]); // tutte le proposte già passate (per non ripeterle)
	let agreed = $state<Proposal | null>(null);
	let luogo = $state('');

	let turns = $state(0);
	let hintsUsed = $state(0);
	let hintLevel = $state(0); // 0=niente, 1=lettura, 2=traduzione it, 3=evidenzia calendario
	let npcLine = $state(''); // ultima battuta NPC display (per copione / hint)
	let npcLineSpoken = $state(''); // stessa battuta in kana (per TTS/ripetizione)
	let npcLineIt = $state('');
	let showScript = $state(false);
	let gamesPlayed = $state(0); // per il messaggio guida dei primi 2 round

	// Picker utente (giorno + ora)
	let pickDay = $state<number | null>(null);
	let pickHour = $state<number | null>(null);

	let best = $state(0);
	let finalScore = $state(0);
	let isRecord = $state(false);

	// ── Mic (opzionale, fallback picker/bottoni) ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');

	onMount(() => {
		primeVoices();
		canSpeak = speechAvailable();
		best = getHighscore('appuntamento');
	});

	export const snapshot = gameSnapshot(
		() => ({
			scene,
			scenario,
			calendar,
			week,
			dialog,
			pendingProposal,
			lastRejected,
			tried,
			agreed,
			luogo,
			turns,
			hintsUsed,
			hintLevel,
			npcLine,
			npcLineSpoken,
			npcLineIt,
			gamesPlayed,
			pickDay,
			pickHour,
			finalScore,
			isRecord
		}),
		(s) => {
			scene = s.scene;
			scenario = s.scenario;
			calendar = s.calendar;
			week = s.week;
			dialog = s.dialog;
			pendingProposal = s.pendingProposal;
			lastRejected = s.lastRejected;
			tried = s.tried;
			agreed = s.agreed;
			luogo = s.luogo;
			turns = s.turns;
			hintsUsed = s.hintsUsed;
			hintLevel = s.hintLevel;
			npcLine = s.npcLine;
			npcLineSpoken = s.npcLineSpoken;
			npcLineIt = s.npcLineIt;
			gamesPlayed = s.gamesPlayed;
			pickDay = s.pickDay;
			pickHour = s.pickHour;
			finalScore = s.finalScore;
			isRecord = s.isRecord;
		}
	);

	function pushLine(who: Who, text: string): void {
		dialog = [...dialog, { who, text }];
	}

	function pick(id: ScenarioId): void {
		scenario = SCENARIOS.find((s) => s.id === id)!;
		calendar = generateWeekCalendar();
		week = generateWeek();
		dialog = [];
		pendingProposal = null;
		lastRejected = null;
		tried = [];
		agreed = null;
		luogo = '';
		turns = 0;
		hintsUsed = 0;
		hintLevel = 0;
		npcLine = '';
		npcLineSpoken = '';
		npcLineIt = '';
		pickDay = null;
		pickHour = null;
		showScript = false;
		heard = '';
		scene = 'play';
		// ~metà delle volte è l'interlocutore a prendere l'iniziativa.
		if (Math.random() < 0.5) npcOpen();
	}

	function quit(): void {
		scenario = null;
		scene = 'pick';
	}

	// Traduzioni it per le battute NPC (per l'hint di 2° livello): tenute qui
	// perché dipendono dal template + slot concreti, non nella phrase-bank pura.
	function npcAcceptTranslation(p: Proposal): string {
		const g = WEEKDAYS[p.weekdayIndex]!.it;
		return `Va bene, ${g} alle ${hourLabel(p.hour)}.`;
	}
	function npcProposeTranslation(p: Proposal): string {
		const g = WEEKDAYS[p.weekdayIndex]!.it;
		return `Ti propone ${g} alle ${hourLabel(p.hour)}.`;
	}
	function npcRejectTranslation(rejected: Proposal, next: Proposal, motivo: string): string {
		const g = WEEKDAYS[rejected.weekdayIndex]!.it;
		const g2 = WEEKDAYS[next.weekdayIndex]!.it;
		const motivoIt: Record<string, string> = {
			バイト: 'un turno di lavoretto',
			用事: 'un impegno',
			約束: 'un altro impegno preso',
			ジム: 'la palestra',
			予定: 'un impegno',
			仕事: 'lavoro',
			先約: 'un impegno precedente'
		};
		return `Mi dispiace, ${g} ho ${motivoIt[motivo] ?? motivo}… che ne dici di ${g2}?`;
	}

	// L'utente propone giorno+ora dal picker.
	function propose(): void {
		if (!scenario || pickDay === null || pickHour === null) return;
		const p: Proposal = { weekdayIndex: pickDay, hour: pickHour };
		const forms = buildProposeLine(scenario, p, week, 'weekday');
		pushLine('me', forms.display);
		speakSentenceJapanese(forms.spoken, voiceParams(userGender()));
		tried = [...tried, p];
		turns += 1;
		npcRespond(p);
	}

	// L'NPC valuta la proposta corrente: accorda se il giorno gli va bene E
	// l'utente stesso è libero in quello slot; altrimenti rifiuta+contropropone.
	function npcRespond(p: Proposal): void {
		// L'NPC alterna a caso giorno-settimana (土曜日) e giorno-mese (3月14日):
		// conversazione più naturale, tu devi capirle entrambe dal calendario.
		const ph = randomPhrasing();
		const npcOk = isFree(calendar, p.weekdayIndex, p.hour);
		if (npcOk) {
			const forms = buildNpcAcceptLine(scenario!, p, week, ph);
			npcLine = forms.display;
			npcLineSpoken = forms.spoken;
			npcLineIt = npcAcceptTranslation(p);
			pushLine('npc', forms.display);
			speakSequence([{ text: forms.spoken, options: voiceParams(npcGender()) }]);
			agreed = p;
			hintLevel = 0;
			return;
		}
		const motivo = randomMotivo(scenario!);
		const next = pickNpcCounterProposal(calendar, p, tried);
		const forms = buildNpcRejectLine(scenario!, p, next, motivo, week, ph);
		npcLine = forms.display;
		npcLineSpoken = forms.spoken;
		npcLineIt = npcRejectTranslation(p, next, motivo);
		pushLine('npc', forms.display);
		speakSequence([{ text: forms.spoken, options: voiceParams(npcGender()) }]);
		lastRejected = p;
		pendingProposal = next;
		hintLevel = 0;
		heard = '';
	}

	// A volte è l'NPC a prendere l'iniziativa: apre lui proponendo un giorno+ora
	// (slot casuale, non filtrato sul tuo calendario). Tu ascolti, controlli il
	// calendario e accetti o controproponi — come per una contro-proposta.
	function npcOpen(): void {
		if (!scenario) return;
		const p = pickRandomProposal();
		const ph = randomPhrasing();
		const forms = buildNpcProposeLine(scenario, p, week, ph);
		npcLine = forms.display;
		npcLineSpoken = forms.spoken;
		npcLineIt = npcProposeTranslation(p);
		pushLine('npc', forms.display);
		speakSequence([{ text: forms.spoken, options: voiceParams(npcGender()) }]);
		pendingProposal = p;
		tried = [p];
		hintLevel = 0;
	}

	// L'utente, dopo aver "capito" la contro-proposta (eventualmente con
	// aiuto), risponde: accetta se lui è libero in quello slot, altrimenti
	// contropropone un terzo slot dal picker.
	function acceptPending(): void {
		if (!scenario || !pendingProposal) return;
		const forms = buildUserAcceptLine(scenario);
		pushLine('me', forms.display);
		speakSentenceJapanese(forms.spoken, voiceParams(userGender()));
		turns += 1;
		tried = [...tried, pendingProposal];
		const p = pendingProposal;
		pendingProposal = null;
		// Chi ha proposto per ultimo (l'NPC) ha detto il suo giorno libero:
		// se anche l'utente è libero lì, è accordo immediato.
		if (isFree(calendar, p.weekdayIndex, p.hour)) {
			agreed = p;
		} else {
			// L'utente accetta comunque "a voce" ma poi si accorge di essere
			// occupato: nella pratica non dovrebbe capitare se guarda il
			// calendario — miss leggero sull'ora (曜日 non è un contatore del
			// consolidamento; 時 sì ed è ciò che si allena qui).
			void recordPracticeMiss('counter:時');
			npcRespond(p);
		}
	}

	function counterFromPending(): void {
		if (!scenario || !pendingProposal || pickDay === null || pickHour === null) return;
		const next: Proposal = { weekdayIndex: pickDay, hour: pickHour };
		const forms = buildUserCounterLine(scenario, pendingProposal, next, week, 'weekday');
		pushLine('me', forms.display);
		speakSentenceJapanese(forms.spoken, voiceParams(userGender()));
		turns += 1;
		tried = [...tried, next];
		pendingProposal = null;
		npcRespond(next);
	}

	function confirm(): void {
		if (!scenario || !agreed) return;
		luogo = randomLuogo(scenario);
		const forms = buildConfirmLine(scenario, agreed, luogo, week, 'weekday');
		pushLine('me', forms.display);
		speakSentenceJapanese(forms.spoken, voiceParams(userGender()));
		finalScore = computeScore(turns, hintsUsed);
		isRecord = submitScore('appuntamento', finalScore);
		best = getHighscore('appuntamento');
		gamesPlayed += 1;
		scene = 'done';
	}

	// ── Hint 💡: 1=lettura(furigana via TTS ripetuto), 2=traduzione it, 3=evidenzia calendario ──
	function useHint(): void {
		if (hintLevel >= 3) return;
		hintLevel += 1;
		hintsUsed += 1;
	}

	// ── Mic: prova a dire la proposta/risposta a voce invece del picker ──
	async function speakMyLine(expected: string[], onMatch: () => void): Promise<void> {
		if (micState !== 'idle') return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (alts.length === 0) {
			heard = '（何も聞こえませんでした…riprova）';
			return;
		}
		heard = alts[0]!;
		if (speechMatches(alts, [expected])) onMatch();
	}

	function playAgain(): void {
		if (!scenario) return;
		pick(scenario.id);
	}

	const dayList = [0, 1, 2, 3, 4, 5, 6];
</script>

{#snippet repeatBar(line: string)}
	<RepeatBar {line} gender={npcGender()} />
{/snippet}

<div class="appt">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>

	{#if showScript}
		<ScriptLog
			lines={dialog}
			icons={{ me: '🙂', npc: scenario?.npcIcon ?? '🗣️' }}
			title="📜 La negoziazione finora"
		/>
	{/if}

	{#if scene === 'pick'}
		<article class="scene">
			<h1 class="page-title">📅 Prendi appuntamento <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Scegli con chi devi fissare un appuntamento: il registro (普通体/丁寧/敬語) cambia secondo
				il rapporto. Guarda il tuo calendario, proponi un giorno e un'ora, e negozia finché non
				trovate un momento che va bene a entrambi.
			</p>
			<div class="scenario-grid">
				{#each SCENARIOS as s (s.id)}
					<button class="scenario-card" onclick={() => pick(s.id)}>
						<span class="scenario-icon">{s.icon}</span>
						<span class="scenario-label">{s.label}</span>
						<span class="scenario-context">{s.context}</span>
					</button>
				{/each}
			</div>
			<p class="record">🏆 Record: {best}</p>
		</article>
	{:else if scene === 'play' && scenario}
		<article class="scene">
			<div class="game-head">
				<button class="quit" onclick={quit}>← Esci</button>
				<span class="score-line">{scenario.icon} {scenario.label} · turno {turns + 1}</span>
			</div>

			{#if gamesPlayed === 0 && turns < 2}
				<p class="onboard">Usa gli aiuti per capire come funziona, poi provaci da solo.</p>
			{/if}

			<!-- Calendario personale, sempre visibile -->
			<div class="calendar">
				<p class="calendar-title">🗓️ Il tuo calendario{#if week[0]} — {week[0].month}月{/if}</p>
				<div class="cal-grid">
					<div class="cal-corner"></div>
					{#each dayList as d (d)}
						<div class="cal-head" class:hl={hintLevel >= 3 && pendingProposal?.weekdayIndex === d}>
							<span class="cal-wd">{WEEKDAYS[d]!.jp.slice(0, 1)}</span>
							{#if week[d]}<span class="cal-date">{week[d].day}</span>{/if}
						</div>
					{/each}
					{#each HOURS as hour (hour)}
						<div class="cal-hourlabel">{hourLabel(hour)}</div>
						{#each dayList as d (d)}
							{@const slot = slotAt(calendar, d, hour)}
							<div
								class="cal-cell"
								class:busy={slot?.busy}
								class:hl={hintLevel >= 3 && pendingProposal?.weekdayIndex === d && pendingProposal?.hour === hour}
								title={slot?.busy ? slot.reason ?? '' : 'libero'}
							>
								{#if slot?.busy}{slot.reason}{/if}
							</div>
						{/each}
					{/each}
				</div>
				<p class="calendar-legend">
					<span class="legend-free">libero</span> · <span class="legend-busy">occupato</span>
				</p>
			</div>

			{#if agreed === null && pendingProposal === null}
				<!-- Turno utente: prima proposta -->
				<div class="turn">
					<p class="who">🙂 Proponi tu</p>
					<div class="picker">
						<div class="picker-section">
							<span class="picker-label">Giorno</span>
							<div class="picker-grid picker-grid-day">
								{#each dayList as d (d)}
									<button type="button" class="picker-btn day-btn" class:selected={pickDay === d} onclick={() => (pickDay = d)}><span class="day-wd">{WEEKDAYS[d]!.jp.slice(0, 1)}</span><span class="day-date">{week[d]?.day}</span></button>
								{/each}
							</div>
						</div>
						<div class="picker-section">
							<span class="picker-label">Ora</span>
							<div class="picker-grid picker-grid-hour">
								{#each HOURS as h (h)}
									<button type="button" class="picker-btn" class:selected={pickHour === h} onclick={() => (pickHour = h)}>{hourLabel(h)}</button>
								{/each}
							</div>
						</div>
					</div>
					{#if pickDay !== null && pickHour !== null}
						{@const myLine = buildProposeLine(scenario, { weekdayIndex: pickDay, hour: pickHour }, week, 'weekday')}
						<div class="say-preview">
							<span class="say-label">🗣️ Dici:</span>
							<span class="say-jp">{myLine.display}</span>
							<button type="button" class="say-listen" title="Ascolta" onclick={() => speakSentenceJapanese(myLine.spoken, voiceParams(userGender()))}>🔊</button>
						</div>
						<p class="say-it">≈ {dayItalian(week, pickDay)}, alle {pickHour}</p>
						{#if canSpeak}
							<button
								class="mic"
								class:listening={micState === 'listening'}
								onclick={() => speakMyLine([myLine.display], propose)}
							>
								{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
							</button>
							<HeardDiff {heard} candidates={[myLine.display]} />
						{/if}
					{/if}
					<button class="proceed" disabled={pickDay === null || pickHour === null} onclick={propose}>
						Proponi →
					</button>
				</div>
			{:else if pendingProposal !== null}
				<!-- Turno NPC: ha risposto (accordo o rifiuto+controproposta), l'utente ascolta -->
				<div class="turn">
					<p class="who">{scenario.npcIcon} {scenario.npc}</p>
					<p class="bubble" class:hidden-solution={hintLevel < 2}>
						{#if hintLevel >= 2}{npcLine}{:else}🔊 …ascolta cosa dice{/if}
					</p>
					{@render repeatBar(npcLineSpoken)}
					{#if hintLevel >= 2}
						<p class="bubble-it">{npcLineIt}</p>
					{/if}
					<div class="hint-row">
						<button class="hint-btn" disabled={hintLevel >= 3} onclick={useHint}>
							💡 Aiuto {hintLevel > 0 ? `(${hintLevel}/3)` : ''}
						</button>
						{#if hintLevel === 0}<span class="hint-note">1° = lettura, 2° = traduzione, 3° = evidenzia sul calendario</span>{/if}
					</div>
					<p class="hint">Capito il giorno proposto? Guarda il tuo calendario: sei libero?</p>
					{#if isFree(calendar, pendingProposal.weekdayIndex, pendingProposal.hour)}
						{@const acceptLine = buildUserAcceptLine(scenario)}
						<div class="say-preview">
							<span class="say-label">🗣️ Dici:</span>
							<span class="say-jp">{acceptLine.display}</span>
							<button type="button" class="say-listen" title="Ascolta" onclick={() => speakSentenceJapanese(acceptLine.spoken, voiceParams(userGender()))}>🔊</button>
						</div>
						{#if canSpeak}
							<button
								class="mic"
								class:listening={micState === 'listening'}
								onclick={() => speakMyLine([acceptLine.display], acceptPending)}
							>
								{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
							</button>
							<HeardDiff {heard} candidates={[acceptLine.display]} />
						{/if}
						<button class="proceed" onclick={acceptPending}>✅ Accetta</button>
					{:else}
						<p class="hint warn">Sei occupato in quello slot: controproponi un altro giorno/ora.</p>
						<div class="picker">
							<div class="picker-section">
								<span class="picker-label">Giorno</span>
								<div class="picker-grid picker-grid-day">
									{#each dayList as d (d)}
										<button type="button" class="picker-btn day-btn" class:selected={pickDay === d} onclick={() => (pickDay = d)}><span class="day-wd">{WEEKDAYS[d]!.jp.slice(0, 1)}</span><span class="day-date">{week[d]?.day}</span></button>
									{/each}
								</div>
							</div>
							<div class="picker-section">
								<span class="picker-label">Ora</span>
								<div class="picker-grid picker-grid-hour">
									{#each HOURS as h (h)}
										<button type="button" class="picker-btn" class:selected={pickHour === h} onclick={() => (pickHour = h)}>{hourLabel(h)}</button>
									{/each}
								</div>
							</div>
						</div>
						{#if pickDay !== null && pickHour !== null}
							{@const cLine = buildUserCounterLine(scenario, pendingProposal!, { weekdayIndex: pickDay, hour: pickHour }, week, 'weekday')}
							<div class="say-preview">
								<span class="say-label">🗣️ Dici:</span>
								<span class="say-jp">{cLine.display}</span>
								<button type="button" class="say-listen" title="Ascolta" onclick={() => speakSentenceJapanese(cLine.spoken, voiceParams(userGender()))}>🔊</button>
							</div>
						{/if}
						<button class="proceed" disabled={pickDay === null || pickHour === null} onclick={counterFromPending}>
							Controproponi →
						</button>
					{/if}
				</div>
			{:else if agreed}
				<!-- Accordo raggiunto -->
				<div class="turn">
					<p class="who">{scenario.npcIcon} {scenario.npc}</p>
					<p class="bubble">{npcLine}</p>
					{@render repeatBar(npcLineSpoken)}
					<p class="agree-summary">
						✅ Accordo: <strong>{WEEKDAYS[agreed.weekdayIndex]!.jp} {hourLabel(agreed.hour)}</strong>
					</p>
					<button class="proceed" onclick={confirm}>Conferma il luogo →</button>
				</div>
			{/if}
		</article>
	{:else if scene === 'done' && scenario && agreed}
		<article class="scene">
			<p class="who">{isRecord ? '🏆 Nuovo record!' : '🎉 Appuntamento fissato!'}</p>
			<p class="bubble">
				{WEEKDAYS[agreed.weekdayIndex]!.jp} {hourLabel(agreed.hour)} — {luogo}
			</p>
			<p class="hint">
				Punteggio: <strong>{finalScore}</strong> (turni: {turns}, aiuti usati: {hintsUsed}) · 🏆 record: {best}
			</p>
			<ScriptLog
				lines={dialog}
				icons={{ me: '🙂', npc: scenario.npcIcon }}
				title="📜 Il dialogo completo"
			/>
			<div class="done-actions">
				<button class="proceed" onclick={playAgain}>🔁 Un altro appuntamento</button>
				<button class="proceed secondary" onclick={quit}>Cambia scenario</button>
			</div>
		</article>
	{/if}
</div>

<style>
	.appt { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.hint.warn { color: var(--warn-ink); }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; text-align: center; }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.hidden-solution { color: var(--muted); font-weight: 500; }
	.bubble-it { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.record { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }

	.scenario-grid { display: grid; gap: 10px; }
	.scenario-card {
		display: grid; gap: 4px; padding: 14px; border-radius: 14px; border: 1px solid var(--line);
		background: linear-gradient(170deg, var(--surface), var(--surface-2)); cursor: pointer; text-align: left;
	}
	.scenario-card:hover { border-color: var(--brand); }
	.scenario-icon { font-size: 1.5rem; }
	.scenario-label { font-weight: 700; color: var(--ink); }
	.scenario-context { font-size: 0.78rem; color: var(--muted); }

	.game-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.quit { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.score-line { font-size: 0.82rem; color: var(--muted); font-weight: 600; }
	.onboard { margin: 0; text-align: center; font-size: 0.8rem; color: var(--info-ink); background: var(--info-bg); border: 1px solid var(--info-border); border-radius: 10px; padding: 8px; }

	.calendar { display: grid; gap: 6px; }
	.calendar-title { margin: 0; font-size: 0.85rem; font-weight: 700; text-align: center; }
	.cal-grid { display: grid; grid-template-columns: auto repeat(7, 1fr); gap: 3px; font-size: 0.62rem; }
	.cal-head { display: flex; flex-direction: column; align-items: center; line-height: 1.1; text-align: center; font-weight: 700; color: var(--muted); padding: 2px 0; border-radius: 4px; }
	.cal-date { font-weight: 600; color: var(--ink); }
	.cal-head.hl { background: var(--gold-bg); color: var(--gold-ink); }
	.cal-hourlabel { text-align: right; padding-right: 4px; color: var(--muted); font-weight: 600; white-space: nowrap; }
	.cal-cell { min-height: 28px; border-radius: 4px; background: var(--ok-bg); display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
	.cal-cell.busy { background: var(--danger-bg); color: var(--danger); font-weight: 700; }
	.cal-cell.hl { outline: 2px solid var(--gold-border); background: var(--gold-bg); }
	.calendar-legend { margin: 0; text-align: center; font-size: 0.68rem; color: var(--muted); }
	.legend-free { color: var(--success); font-weight: 700; }
	.legend-busy { color: var(--danger); font-weight: 700; }

	.turn { display: grid; gap: 10px; }
	.picker { display: grid; gap: 10px; }
	.picker-section { display: grid; gap: 4px; }
	.picker-label { font-size: 0.72rem; color: var(--muted); font-weight: 600; text-align: center; }
	.picker-grid { display: grid; gap: 6px; }
	.picker-grid-day { grid-template-columns: repeat(7, 1fr); }
	.picker-grid-hour { grid-template-columns: repeat(4, 1fr); }
	.picker-btn { min-height: 40px; padding: 6px 4px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface-2); color: var(--ink); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.picker-btn:hover { border-color: var(--brand); }
	.picker-btn.selected { border-color: var(--brand); background: var(--brand); color: var(--surface); }
	.day-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; line-height: 1.05; }
	.day-wd { font-size: 0.9rem; }
	.day-date { font-size: 0.68rem; color: var(--muted); font-weight: 600; }
	.picker-btn.selected .day-date { color: var(--surface); }

	.say-preview { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
	.say-label { font-size: 0.72rem; color: var(--muted); font-weight: 700; }
	.say-jp { font-size: 1.05rem; font-weight: 700; color: var(--ink); }
	.say-listen { border: none; background: transparent; font-size: 1.1rem; cursor: pointer; padding: 0 2px; }
	.say-it { margin: 0; text-align: center; font-size: 0.75rem; color: var(--muted); }

	.hint-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
	.hint-btn { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--warn-border); background: var(--warn-bg); color: var(--warn-ink); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
	.hint-btn:disabled { opacity: 0.6; cursor: default; }
	.hint-note { font-size: 0.7rem; color: var(--muted); }

	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.agree-summary { margin: 0; text-align: center; font-size: 1rem; }

	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
	.proceed.secondary { background: var(--surface-2); color: var(--ink); border-color: var(--line); }
	.done-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
</style>
