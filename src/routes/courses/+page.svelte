<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { importCourseDataset, listCourses, getLessonsForCourse, deleteCourse } from '$lib/db/course-import';
	import type { CourseDatasetMeta, CourseLessonMeta } from '$lib/types/models';

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

	onMount(loadCourses);
</script>

<h1 class="page-title">Corsi</h1>

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
				<article
					class="course-card"
					class:selected={selectedCourse?.id === c.id}
					onclick={() => selectCourse(c)}
				>
					<div class="course-top">
						<strong class="course-name">{c.nome}</strong>
						{#if c.livello_jlpt}
							<span class="jlpt-badge jlpt-{c.livello_jlpt}">{c.livello_jlpt}</span>
						{/if}
					</div>
					{#if c.autore}<p class="course-meta">Autore: {c.autore}</p>{/if}
					{#if c.descrizione}<p class="course-meta">{c.descrizione}</p>{/if}
					<p class="course-meta">Importato: {new Date(c.importato_il).toLocaleDateString()}</p>
				</article>
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
	{#each lessons as lesson}
		<article class="lesson-card">
			<strong class="lesson-num">{lesson.numero}.</strong>
			<div class="lesson-info">
				<strong>{lesson.titolo}</strong>
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
	}

	.course-card:hover { border-color: var(--brand); background: #eef2ff; }
	.course-card.selected { border-color: var(--brand); background: #eef2ff; }

	.course-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.course-name { font-size: 0.9rem; }
	.course-meta { font-size: 0.73rem; color: var(--muted); margin: 0; }

	.jlpt-badge {
		font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: 8px;
		background: #e0e7ff; color: #3730a3;
	}
	.jlpt-N5 { background: #dcfce7; color: #166534; }
	.jlpt-N4 { background: #dbeafe; color: #1e40af; }
	.jlpt-N3 { background: #fef9c3; color: #854d0e; }
	.jlpt-N2 { background: #ffe4e6; color: #9f1239; }
	.jlpt-N1 { background: #f3e8ff; color: #6b21a8; }

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
