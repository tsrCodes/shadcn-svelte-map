import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import RegionAnalytics from '#lib/registry/blocks/region-analytics/region-analytics.svelte';
import { button, mountBlock } from './helpers.js';

describe('Region analytics block', () => {
	test('clicking a region focuses it, and a new metric re-ranks the regions', async () => {
		const { screen, map, canvas, pointer } = await mountBlock(RegionAnalytics);
		const container = screen.container;
		const focusName = () => container.querySelector('[data-testid="focus-name"]')?.textContent;
		const ranked = () =>
			[...container.querySelectorAll('[data-testid="rank"]')].map((item) =>
				item.textContent?.replace(/\s+/g, ' ').trim()
			);
		expect(focusName()).toBe('Centre');
		expect(ranked()[1]).toContain('North');

		// The grid's middle column sits under the middle of the map; the west column is left of it.
		await expect
			.poll(
				async () => {
					await pointer.click([30, canvas.clientHeight / 2]);
					return focusName();
				},
				{ timeout: 5_000 }
			)
			.toBe('West');

		await userEvent.click(button(map, 'Growth'));
		expect(ranked()[1]).toContain('South-east');
		expect(ranked()[1]).toContain('+15%');
	});
});
