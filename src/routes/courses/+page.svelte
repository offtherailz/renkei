<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { importCourseDataset, listCourses, getLessonsForCourse, deleteCourse } from '$lib/db/course-import';
	import type { CourseDatasetMeta, CourseLessonMeta } from '$lib/types/models';
	import JlptBadge from '$lib/components/JlptBadge.svelte';

	let courses = $state<CourseDatasetMeta[]>([]);
	let selectedCourse = $state<CourseDatasetMeta | null>(null);
	let lessons = $state<CourseLessonMeta[]>([]);
	let loading = $state(true);
	let importing = $state(false);
	let importError = $state('');
	let importSuccess = $state('');
	let importUrl = $state('');
	let urlImporting = $state(false);
	let fileInput: HTMLInputElement;

	async function loadCourses(): Promise<void> {
		loading = true;
		courses = await listCourses();
		loading = false;
	}

	async function selectCourse(c: CourseDatasetMeta): Promise<void> {
		selectedCourse = c;
		lessons = await getLessonsForCourse(c.id);
		await loadLessonStates();
	}

	// stato "in studio" per lezione (obiettivi delle lezioni)
	let lessonEnabled = $state<Record<string, boolean>>({});
	async function loadLessonStates(): Promise<void> {
		const map: Record<string, boolean> = {};
		for (const l of lessons) {
			map[l.objective_id] = (await db.study_objectives.get(l.objective_id))?.study_enabled ?? false;
		}
		lessonEnabled = map;
	}
	async function toggleLesson(objectiveId: string): Promise<void> {
		const next = !lessonEnabled[objectiveId];
		await db.study_objectives.update(objectiveId, { study_enabled: next, updated_at: Date.now() });
		lessonEnabled = { ...lessonEnabled, [objectiveId]: next };
	}

	// Modalità corso: mette in pausa tutti gli obiettivi fuori dal corso e
	// attiva la prima lezione — il quiz pesca solo dal corso.
	let focusMsg = $state('');
	async function studyOnlyThisCourse(): Promise<void> {
		if (!selectedCourse) return;
		const prefix = `course:${selectedCourse.id}:`;
		const all = await db.study_objectives.toArray();
		for (const o of all) {
			const inCourse = o.id.startsWith(prefix) || o.id === `course:${selectedCourse.id}`;
			if (!inCourse && o.study_enabled) {
				await db.study_objectives.update(o.id, { study_enabled: false, updated_at: Date.now() });
			}
		}
		const first = lessons[0];
		if (first) await db.study_objectives.update(first.objective_id, { study_enabled: true, updated_at: Date.now() });
		await loadLessonStates();
		focusMsg = `✅ Ora studi solo «${selectedCourse.nome}»: lezione 1 attiva, il resto in pausa. Attiva le lezioni successive da qui man mano che procedi.`;
	}

	async function handleFileImport(e: Event): Promise<void> {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		importing = true;
		importError = '';
		importSuccess = '';
		try {
			const text = await file.text();
			const result = await importCourseDataset(text);
			importSuccess = `✅ Importato! ${result.paroleAggiunte} parole, ${result.kanjiAggiunti} kanji, ${result.grammaticaAggiunta} grammatica in ${result.lezioniFinalizzate} lezioni.`;
			await loadCourses();
		} catch (e) {
			importError = `Errore: ${String(e)}`;
		} finally {
			importing = false;
			input.value = '';
		}
	}

	async function handleUrlImport(): Promise<void> {
		if (!importUrl.trim()) return;
		urlImporting = true;
		importError = '';
		importSuccess = '';
		try {
			const resp = await fetch(importUrl.trim());
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const text = await resp.text();
			const result = await importCourseDataset(text);
			importSuccess = `✅ Importato da URL! ${result.paroleAggiunte} parole, ${result.kanjiAggiunti} kanji, ${result.grammaticaAggiunta} grammatica in ${result.lezioniFinalizzate} lezioni.`;
			importUrl = '';
			await loadCourses();
		} catch (e) {
			importError = `Errore: ${String(e)}`;
		} finally {
			urlImporting = false;
		}
	}

	async function handleDelete(courseId: string): Promise<void> {
		if (!confirm('Eliminare questo corso e tutti i suoi contenuti?')) return;
		await deleteCourse(courseId);
		selectedCourse = null;
		lessons = [];
		await loadCourses();
	}

	// Corso consigliato incluso nell'app: Genki I mappato sul catalogo N5.
	let genkiImporting = $state(false);
	async function importGenki(): Promise<void> {
		genkiImporting = true;
		importError = '';
		importSuccess = '';
		try {
			const resp = await fetch(`${base}/corso-genki-1.json`);
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const result = await importCourseDataset(await resp.text());
			importSuccess = `✅ Genki I importato! ${result.lezioniFinalizzate} lezioni.`;
			await loadCourses();
		} catch (e) {
			importError = `Errore: ${String(e)}`;
		} finally {
			genkiImporting = false;
		}
	}

	onMount(loadCourses);
</script>

<h1 class="page-title">Corsi</h1>

{#if !loading && !courses.some((c) => c.id === 'genki-1')}
<section class="section-card recommended">
	<p class="card-title">⭐ Corso consigliato</p>
	<div class="rec-row">
		<div class="rec-body">
			<strong>Genki I (ordine del libro)</strong>
			<p class="course-meta">La grammatica N5 nell'ordine delle 12 lezioni di Genki I, con le parole delle frasi d'esempio. Un tocco e hai il percorso.</p>
		</div>
		<button class="btn-primary" disabled={genkiImporting} onclick={importGenki}>
			{genkiImporting ? 'Importo…' : '⬇️ Importa'}
		</button>
	</div>
	{#if importError}<p class="error-text">{importError}</p>{/if}
</section>
{/if}

<!-- Import section -->
<section class="section-card">
	<p class="card-title">Importa corso</p>

	<div class="import-row">
		<label class="file-btn">
			{importing ? 'Importando…' : '📂 Carica file .json'}
			<input
				type="file"
				accept=".json,.renkei-course.json"
				style="display:none"
				disabled={importing}
				onchange={handleFileImport}
			/>
		</label>
	</div>

	<div class="url-row">
		<input
			type="url"
			placeholder="URL corso (es. GitHub raw URL)"
			bind:value={importUrl}
			class="url-input"
			disabled={urlImporting}
		/>
		<button class="btn-primary" onclick={handleUrlImport} disabled={urlImporting || !importUrl.trim()}>
			{urlImporting ? '…' : 'Importa URL'}
		</button>
	</div>

	{#if importError}<p class="error-text">{importError}</p>{/if}
	{#if importSuccess}<p class="success-text">{importSuccess}</p>{/if}

	<p class="hint-text">Formato: <code>.renkei-course.json</code> — vedi COURSE_FORMAT.md per la specifica.</p>
</section>

<!-- Course list -->
<section class="section-card">
	<p class="card-title">Corsi importati</p>
	{#if loading}
		<p class="muted-text">Caricamento…</p>
	{:else if courses.length === 0}
		<p class="muted-text">Nessun corso importato. Carica un file sopra.</p>
	{:else}
		<div class="course-list">
			{#each courses as c}
				<button
					type="button"
					class="course-card"
					class:selected={selectedCourse?.id === c.id}
					onclick={() => selectCourse(c)}
				>
					<div class="course-top">
						<strong class="course-name">{c.nome}</strong>
						{#if c.livello_jlpt}
							<JlptBadge level={c.livello_jlpt} />
						{/if}
					</div>
					{#if c.autore}<p class="course-meta">Autore: {c.autore}</p>{/if}
					{#if c.descrizione}<p class="course-meta">{c.descrizione}</p>{/if}
					<p class="course-meta">Importato: {new Date(c.importato_il).toLocaleDateString()}</p>
				</button>
			{/each}
		</div>
	{/if}
</section>

<!-- Selected course lessons -->
{#if selectedCourse}
<section class="section-card">
	<div class="lesson-header">
		<p class="card-title">Lezioni — {selectedCourse.nome}</p>
		<button class="delete-btn" onclick={() => handleDelete(selectedCourse!.id)}>🗑 Elimina corso</button>
	</div>
	<div class="focus-row">
		<button class="btn-primary" onclick={studyOnlyThisCourse}>🎯 Studia solo questo corso</button>
		<p class="course-meta">Mette in pausa gli altri obiettivi (i cataloghi N5/N4 coprono già tutto: senza pausa il corso non cambia niente) e attiva la lezione 1. I ripassi già avviati non si perdono: restano in attesa finché non riattivi il loro obiettivo.</p>
	</div>
	{#if focusMsg}<p class="success-text">{focusMsg}</p>{/if}
	{#each lessons as lesson}
		<article class="lesson-card">
			<strong class="lesson-num">{lesson.numero}.</strong>
			<div class="lesson-info">
				<div class="lesson-title-row">
					<strong>{lesson.titolo}</strong>
					<button
						class="lesson-toggle"
						class:enabled={lessonEnabled[lesson.objective_id]}
						onclick={() => toggleLesson(lesson.objective_id)}
					>
						{lessonEnabled[lesson.objective_id] ? '✓ In studio' : '⏸ Pausa'}
					</button>
				</div>
				{#if lesson.descrizione}<p class="course-meta">{lesson.descrizione}</p>{/if}
				<div class="lesson-stats">
					{#if lesson.parole.length > 0}<span class="stat-pill">{lesson.parole.length} parole</span>{/if}
					{#if lesson.kanji.length > 0}<span class="stat-pill">{lesson.kanji.length} kanji</span>{/if}
					{#if lesson.grammatica.length > 0}<span class="stat-pill">{lesson.grammatica.length} grammatica</span>{/if}
				</div>
				{#if lesson.parole.length > 0}
					<div class="word-chips">
						{#each lesson.parole.slice(0, 8) as wid}
							<a href="{base}/detail/word:{wid}" class="mini-chip">{wid}</a>
						{/each}
						{#if lesson.parole.length > 8}
							<span class="mini-chip muted">+{lesson.parole.length - 8}</span>
						{/if}
					</div>
				{/if}
			</div>
		</article>
	{/each}
</section>
{/if}

<style>
	.page-title { margin: 0 0 4px; font-size: 1.2rem; font-weight: 700; }

	.section-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 12px;
	}

	.section-card.recommended { border: 1.5px solid var(--brand); }
	.rec-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
	.rec-body { flex: 1; min-width: 200px; display: grid; gap: 4px; }

	.card-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.import-row, .url-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

	.file-btn {
		display: inline-flex;
		align-items: center;
		padding: 8px 16px;
		border-radius: 10px;
		border: 1.5px dashed var(--line);
		background: var(--surface-2);
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--brand);
		font-weight: 600;
	}

	.file-btn:hover { border-color: var(--brand); background: #eef2ff; }

	.url-input {
		flex: 1;
		min-width: 200px;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1.5px solid var(--line);
		font-size: 0.85rem;
		color: var(--ink);
		background: var(--surface-2);
	}

	.url-input:focus { outline: none; border-color: var(--brand); }

	.btn-primary {
		padding: 8px 16px;
		border-radius: 8px;
		background: var(--brand);
		color: #fff;
		border: none;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:disabled { opacity: 0.5; cursor: default; }
	.btn-primary:hover:not(:disabled) { opacity: 0.88; }

	.hint-text { font-size: 0.73rem; color: var(--muted); margin: 0; }
	.error-text { color: var(--danger); font-size: 0.85rem; margin: 0; }
	.success-text { color: var(--success); font-size: 0.85rem; margin: 0; }
	.muted-text { color: var(--muted); font-size: 0.85rem; margin: 0; }

	.course-list { display: grid; gap: 8px; }

	.course-card {
		border: 1.5px solid var(--line);
		border-radius: 10px;
		padding: 12px 14px;
		cursor: pointer;
		background: var(--surface-2);
		display: grid;
		gap: 4px;
		text-align: left;
		font: inherit;
		color: inherit;
		width: 100%;
	}

	.course-card:hover { border-color: var(--brand); background: #eef2ff; }
	.course-card.selected { border-color: var(--brand); background: #eef2ff; }

	.course-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.course-name { font-size: 0.9rem; }
	.course-meta { font-size: 0.73rem; color: var(--muted); margin: 0; }

	.lesson-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.delete-btn {
		padding: 4px 10px;
		border-radius: 8px;
		border: 1px solid var(--danger);
		background: #fee2e2;
		color: var(--danger);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.lesson-card {
		display: flex;
		gap: 10px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--surface-2);
	}

	.lesson-num { font-size: 0.9rem; color: var(--muted); min-width: 20px; }
	.lesson-info { display: grid; gap: 4px; flex: 1; }
	.lesson-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.lesson-toggle { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 8px; white-space: nowrap; background: var(--surface-2); color: var(--muted); border: 1px solid transparent; cursor: pointer; }
	.lesson-toggle.enabled { background: var(--ok-bg); color: var(--ok-ink); }
	.lesson-toggle:hover { border-color: var(--brand); }
	.focus-row { display: grid; gap: 6px; }
	.lesson-stats { display: flex; gap: 6px; flex-wrap: wrap; }

	.stat-pill {
		font-size: 0.7rem;
		padding: 2px 8px;
		border-radius: 8px;
		background: #eef2ff;
		color: var(--brand);
		font-weight: 600;
	}

	.word-chips { display: flex; flex-wrap: wrap; gap: 4px; }

	.mini-chip {
		font-size: 0.68rem;
		padding: 2px 7px;
		border-radius: 6px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
	}

	.mini-chip:hover { background: #eef2ff; border-color: var(--brand); color: var(--brand); }
	.mini-chip.muted { color: var(--muted); }
</style>
