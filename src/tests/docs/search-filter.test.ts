import { describe, expect, test } from 'vitest';
import { scoreSearchItem } from '#lib/docs/search-filter.js';

describe('docs search filter', () => {
	test('matches titles before headings', () => {
		expect(scoreSearchItem('Data Heatmap', 'heatmap')).toBe(1);
		expect(
			scoreSearchItem('Guides Performance', 'heatmap', ['Markers or a point layer', 'Heatmap'])
		).toBe(0.5);
	});

	test('scattered letters across headings are not a match', () => {
		const headings = ['Requirements', 'Add the map', 'Place search on its own', 'Updating'];
		expect(scoreSearchItem('Get Started Installation', 'heatmap', headings)).toBe(0);
	});

	test('every word must match, in any order', () => {
		expect(scoreSearchItem('Controls Draw Control', 'control draw')).toBe(1);
		expect(scoreSearchItem('Controls Draw Control', 'draw polygon')).toBe(0);
		expect(scoreSearchItem('Anything', '   ')).toBe(1);
	});
});
