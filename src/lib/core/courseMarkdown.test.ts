import { describe, it, expect } from 'vitest';
import { renderCourseMarkdown } from './courseMarkdown';

describe('renderCourseMarkdown', () => {
	it('rende intestazioni, grassetto e paragrafi', () => {
		const html = renderCourseMarkdown('## Titolo\n\nUn **paragrafo** con testo.');
		expect(html).toContain('<h4>Titolo</h4>');
		expect(html).toContain('<strong>paragrafo</strong>');
		expect(html).toContain('<p>Un <strong>paragrafo</strong> con testo.</p>');
	});

	it('rende elenchi puntati', () => {
		const html = renderCourseMarkdown('- primo\n- secondo');
		expect(html).toBe('<ul>\n<li>primo</li>\n<li>secondo</li>\n</ul>');
	});

	it('rende tabelle con intestazione e separatore', () => {
		const html = renderCourseMarkdown('| Parola | Significato |\n| --- | --- |\n| 犬 | cane |');
		expect(html).toContain('<table>');
		expect(html).toContain('<th>Parola</th>');
		expect(html).toContain('<td>犬</td>');
		expect(html).toContain('<td>cane</td>');
	});

	it('non lascia passare HTML/JS arbitrario (escapa sempre prima)', () => {
		const html = renderCourseMarkdown('<script>alert(1)</script> e **bold**');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('<strong>bold</strong>');
	});

	it('non confonde corsivo e grassetto', () => {
		const html = renderCourseMarkdown('*corsivo* e **grassetto**');
		expect(html).toContain('<em>corsivo</em>');
		expect(html).toContain('<strong>grassetto</strong>');
	});
});
