<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="guide">
	<h1 class="page-title">📖 Guida a Renkei</h1>
	<p class="page-sub">
		Renkei unisce ripasso SRS, giochi e "avventure" vissute in giapponese. Il principio:
		<strong>tutto è collegato</strong> — quando incontri qualcosa che non sai, in un tocco
		arrivi alla scheda per ripassarlo.
	</p>

	<section class="g-card">
		<h2>🧭 Il giro consigliato</h2>
		<ol>
			<li><strong>Il piano di oggi</strong> (in home): prima i ripassi SRS, poi i tuoi punti deboli, poi l'attività del giorno.</li>
			<li><strong>Corsi</strong>: importa Genki I (un tocco), premi «🎯 Studia solo questo corso» e avanza lezione per lezione.</li>
			<li>Quando qualcosa non torna, aprine la <strong>scheda</strong>: esempi, usi, coniugazioni, note tue — e 💪 Consolida per il drill senza penalità.</li>
		</ol>
	</section>

	<section class="g-card">
		<h2>🧠 Studia</h2>
		<p><strong>Sessione quiz</strong> — domande a tempo sugli obiettivi «✓ In studio»; le risposte muovono l'SRS (intervalli 10 min → 1 h → 8 h → 1 g → 3 g → 7 g → 14 g → 30 g). Dopo ogni risposta puoi aprire «🔍 Approfondisci»: la frase spezzettata e cliccabile, con furigana e traduzione.</p>
			<p><strong>Obiettivi</strong> — il badge «✓ In studio / ⏸ Pausa» in home è un interruttore. La pausa non cancella nulla: i ripassi restano in attesa (li vedi come «+N in pausa»).</p>
		<p><strong>Corsi</strong> — ogni lezione è un obiettivo. Le lezioni si attivano da /courses o dalla home.</p>
		<p><strong>Ascolto dialoghi</strong> — dialoghi con domande, massimo 2 ascolti come all'esame.</p>
	</section>

	<section class="g-card">
		<h2>🎮 Gioca e vivi</h2>
		<p><strong>Giochi</strong> — numeri e contatori (giorni, ore, prezzi…), dettato, cassa, appuntamenti, lista della spesa, saluti (anche a voce 🎤), ordini al konbini. A serie: un errore e riparti.</p>
		<p><strong>👂 聴解 Ascolto trappola</strong> — dialoghi stile JLPT solo audio: cambiano idea, tornano all'originale… tu non cascarci.</p>
		<p><strong>⚡ Lettura veloce</strong> — il testo scorre da solo (RSVP), poi domande a tempo con trabocchetti; la velocità si adatta a te. <strong>🔎 Skimming</strong> — domanda prima, trova l'informazione in fretta. <strong>🧩 Riordina la frase</strong> — sintassi a tocchi.</p>
		<p><strong>🗺️ Avventure</strong> — Kaimono (spesa + telefonata), Ristorante, Treno: ascolti, agisci, parli davvero col microfono 🎤. Il copione 📜 è cliccabile; gli errori finiscono nel tuo consolidamento.</p>
		<p><strong>🆘 Frasi utili</strong> — le frasi di sopravvivenza per situazione, con il come/quando usarle e la pratica a voce.</p>
	</section>

	<section class="g-card">
		<h2>📖 Cataloghi</h2>
		<p><strong>Vocabolario</strong> — tutte le parole, ricerca + filtri per livello e categoria, scorrimento infinito. <strong>Forme grammaticali</strong>, <strong>forme composte</strong>, <strong>particelle</strong>, <strong>contatori</strong> — ogni voce ha la sua scheda con drill dedicato.</p>
		<p>Nelle schede trovi anche: <strong>Usi</strong> (parole con più ruoli), <strong>📝 note personali</strong>, e <strong>✏️ Correggi</strong> se un dato è sbagliato.</p>
	</section>

	<section class="g-card">
		<h2>🎤 Voce e audio</h2>
		<p>L'interlocutore parla con la voce del sesso opposto al tuo (Impostazioni → «La tua voce»). Ovunque ci sia audio hai <strong>もう一度</strong> (ripeti) e <strong>🐢 ゆっくり</strong> (lento). Il microfono richiede un browser compatibile (Chrome è il migliore) e il permesso al primo uso.</p>
	</section>

	<section class="g-card">
		<h2>✏️ Correzioni e dati</h2>
		<p>Trovato un errore in una scheda? «✏️ Correggi questa voce»: la modifica vale subito e sopravvive agli aggiornamenti. In <a href="{base}/correzioni">Le mie correzioni</a> le gestisci (rimozione = ripristino) e le esporti per farle entrare nell'app pubblicata. Il badge ⚠️ segnala quando un aggiornamento ha cambiato il dato sotto una tua correzione.</p>
		<p>Da Impostazioni puoi esportare il <strong>bundle completo</strong> (progressi inclusi) e reimportarlo su un altro dispositivo.</p>
	</section>

	<section class="g-card">
		<h2>❓ Domande frequenti</h2>
		<p><strong>Perché i ripassi non calano mai?</strong> — Gli intervalli iniziali sono corti (10–60 min): le carte nuove tornano presto. È voluto; col tempo si diradano.</p>
		<p><strong>Ho messo tutto in pausa e…?</strong> — Il quiz non propone nulla e i contatori vanno a zero; i ripassi sospesi aspettano il riattivo.</p>
		<p><strong>La voce legge male qualcosa?</strong> — Le voci sono quelle del dispositivo: installane di migliori dalle impostazioni di sistema (voci giapponesi). Se è un testo dell'app a essere sbagliato, usa ✏️ Correggi.</p>
	</section>
</div>

<style>
	.guide { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); line-height: 1.55; }
	.g-card { background: var(--surface); border-radius: 14px; padding: 16px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 8px; }
	.g-card h2 { margin: 0; font-size: 1rem; }
	.g-card p, .g-card li { margin: 0; font-size: 0.88rem; line-height: 1.6; color: var(--ink); }
	.g-card ol { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
	.g-card a { color: var(--brand); }
</style>
