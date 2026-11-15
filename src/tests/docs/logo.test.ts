import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const ORANGE = '#ff3e00';

function rings(svg: string): string[] {
	return svg.match(/<circle\b[^>]*>/g) ?? [];
}

describe('site logo', () => {
	test('the favicon is a solid location ring around the mark, not the bare mark', () => {
		const svg = readFileSync('src/lib/assets/favicon.svg', 'utf8');
		const found = rings(svg);
		expect(found).toHaveLength(1);
		expect(found[0]).toContain(`stroke="${ORANGE}"`);
		expect(found[0]).not.toContain('stroke-opacity');
	});

	test('the large logo pulses with two fading rings', () => {
		const svg = readFileSync('src/lib/assets/logo.svg', 'utf8');
		const found = rings(svg);
		expect(found).toHaveLength(2);
		for (const ring of found) expect(ring).toContain('stroke-opacity');
	});
});
