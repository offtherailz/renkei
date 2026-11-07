#!/usr/bin/env node
// Elaborazione delle immagini generate con Gemini per «Un giorno» e 事件.
// Non ci sono librerie di immagini installate: si usa Chromium (Playwright,
// già nel progetto) con le funzioni canvas di proc.html.
//
// Uso (dalla cartella del repo):
//   node scripts/immagini/elabora.cjs scarica  <link-condivisione|pagina.html> <uscita.jpg>
//   node scripts/immagini/elabora.cjs sfondo   <ingresso> <uscita.jpg>            (640×320, taglio centrale 2:1)
//   node scripts/immagini/elabora.cjs ritratto <ingresso> <uscita.png>            (fondo magenta via, alto 360)
//   node scripts/immagini/elabora.cjs ritratto <ingresso> <uscita.png> bordi      (toglie solo il magenta del fondo: per capelli rosa)
//   node scripts/immagini/elabora.cjs affiancata <ingresso> <sinistra.png> <destra.png>  (divide chiusa|aperta e toglie le bande nere)
//   node scripts/immagini/elabora.cjs bocca    <chiusa.png> <aperta.jpg> <uscita-parla.png> [da a]
//        (da/a = fascia verticale dove cercare la bocca, in frazioni dell'altezza; base 0.12 0.45;
//         per ritratti inquadrati più da vicino, es. 0.4 0.65)
//   node scripts/immagini/elabora.cjs oggetti  <griglia> <colonne> <righe> <cartella> <id1> <id2> …
//
// «scarica»: i file caricati dall'utente spesso sono la PAGINA di condivisione
// di Gemini (inizia con <!doctype html>), non l'immagine. L'immagine vera sta al
// link https://lh3.googleusercontent.com/gg/… dentro la pagina: si toglie il
// suffisso «=s1024-rj» e si mette «=s0» (dimensione originale).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(path.resolve('node_modules/@playwright/test'));

const [cmd, ...args] = process.argv.slice(2);
const abs = (f) => 'file://' + path.resolve(f);
const salva = (f, dataUrl) => {
	fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
	fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
};

async function scarica(sorgente, uscita) {
	let html;
	if (/^https?:/.test(sorgente)) html = execFileSync('curl', ['-sL', '-m', '60', sorgente]).toString();
	else html = fs.readFileSync(sorgente, 'utf8');
	if (!html.startsWith('<!doctype') && !html.startsWith('<!DOCTYPE')) {
		fs.copyFileSync(sorgente, uscita); // era già un'immagine
		return;
	}
	const m = html.match(/https:\/\/lh3\.googleusercontent\.com\/gg\/[^"\\ ]*/);
	if (!m) throw new Error('nessuna immagine nella pagina');
	execFileSync('curl', ['-sL', '-m', '60', '-o', uscita, m[0].replace(/=[^=]*$/, '') + '=s0']);
}

(async () => {
	if (cmd === 'scarica') return scarica(args[0], args[1]);
	const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
	const p = await b.newPage();
	await p.goto(abs(path.join(__dirname, 'proc.html')));
	if (cmd === 'sfondo') salva(args[1], await p.evaluate(([a]) => bg(a, 640, 320), [abs(args[0])]));
	else if (cmd === 'ritratto') salva(args[1], (await p.evaluate(([a, bordi]) => (bordi ? ritrattoBordi(a, 360) : ritratto(a, 360)), [abs(args[0]), args[2] === 'bordi'])).u);
	else if (cmd === 'affiancata') {
		const [sx, dx] = await p.evaluate(([a]) => dividi(a), [abs(args[0])]);
		salva(args[1], sx);
		salva(args[2], dx);
	}
	else if (cmd === 'bocca') {
		const fascia = args[3] ? [Number(args[3]), Number(args[4])] : null;
		const r = await p.evaluate(([c, a, f]) => bocca(c, a, f), [abs(args[0]), abs(args[1]), fascia]);
		if (r.err) throw new Error(r.err);
		salva(args[2], r.u);
		console.log('bocca', JSON.stringify(r.info));
	} else if (cmd === 'oggetti') {
		const [img, col, righe, cartella, ...ids] = args;
		const out = await p.evaluate(([a, c, r]) => oggetti(a, c, r, 128), [abs(img), Number(col), Number(righe)]);
		out.forEach((u, i) => {
			if (u && ids[i]) salva(path.join(cartella, `${ids[i]}.png`), u);
		});
	} else console.log('comandi: scarica | sfondo | ritratto | bocca | oggetti (vedi in testa al file)');
	await b.close();
})().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
