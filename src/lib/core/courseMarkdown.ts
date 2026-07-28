// Markdown minimale per le note delle lezioni corso (COURSE_FORMAT.md): solo
// il sottoinsieme usato negli esempi del formato — intestazioni, grassetto,
// elenchi, tabelle, paragrafi. Tutto il testo è escapato PRIMA di applicare le
// trasformazioni: niente HTML arbitrario da un file corso importato (fonte
// non fidata quanto il resto dei dati curati a mano).

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function inline(s: string): string {
	let out = escapeHtml(s);
	out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
	return out;
}

function isTableSeparator(line: string): boolean {
	return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((c) => c.trim());
}

export function renderCourseMarkdown(md: string): string {
	const lines = md.replace(/\r\n/g, '\n').split('\n');
	const html: string[] = [];
	let i = 0;
	let inList = false;

	const closeList = () => {
		if (inList) {
			html.push('</ul>');
			inList = false;
		}
	};

	while (i < lines.length) {
		const line = lines[i]!;
		const trimmed = line.trim();

		if (trimmed === '') {
			closeList();
			i += 1;
			continue;
		}

		const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
		if (heading) {
			closeList();
			const level = heading[1]!.length + 2; // ## → h4, ### → h5 (h1/h2/h3 restano al layout della pagina)
			html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
			i += 1;
			continue;
		}

		if (/^\|.*\|$/.test(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
			closeList();
			const header = parseTableRow(trimmed);
			const rows: string[][] = [];
			i += 2;
			while (i < lines.length && /^\|.*\|$/.test(lines[i]!.trim())) {
				rows.push(parseTableRow(lines[i]!));
				i += 1;
			}
			html.push('<table>');
			html.push('<thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>');
			html.push('<tbody>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>');
			html.push('</table>');
			continue;
		}

		const listItem = /^[-*]\s+(.*)$/.exec(trimmed);
		if (listItem) {
			if (!inList) {
				html.push('<ul>');
				inList = true;
			}
			html.push(`<li>${inline(listItem[1]!)}</li>`);
			i += 1;
			continue;
		}

		closeList();
		html.push(`<p>${inline(trimmed)}</p>`);
		i += 1;
	}
	closeList();
	return html.join('\n');
}
