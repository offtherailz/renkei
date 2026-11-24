import { describe as d2, expect as e2, it as i2 } from 'vitest';
import { detectGrammar as dg, formaCondizionale } from './examGrammar';

d2('condizionali: link alla forma della risposta giusta', () => {
	i2('辞書＿＿ con なら giusta porta a 〜なら, poi al gioco', () => {
		const g = dg(['「辞書[じしょ]＿＿、駅前の店が安いですよ。」', 'なら', 'だと', 'たら', 'ば'], 3, 'なら');
		e2(g[0]?.href).toBe('forme-composte#nara');
		e2(g.some((x) => x.href === 'esame/gioco/joken')).toBe(true);
	});
	i2('forme delle risposte', () => {
		e2(formaCondizionale('あったら')?.href).toBe('forme-composte#tara');
		e2(formaCondizionale('安ければ')?.href).toBe('forme-composte#ba');
		e2(formaCondizionale('あると')?.href).toBe('forme-composte#to-cond');
		e2(formaCondizionale('行く なら')?.href).toBe('forme-composte#nara');
		e2(formaCondizionale('ください')).toBeNull();
	});
	i2('senza risposta giusta resta come prima', () => {
		e2(dg(['時間が＿＿', 'あったら', 'あると'])[0]?.href).toBe('esame/gioco/joken');
	});
});
