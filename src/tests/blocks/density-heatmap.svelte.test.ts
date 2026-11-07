import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import DensityHeatmap from '#lib/registry/blocks/density-heatmap/density-heatmap.svelte';
import { PICKUPS } from '#lib/registry/blocks/density-heatmap/data.js';
import { button, mountBlock } from './helpers.js';

function setRange(input: HTMLInputElement, value: number) {
	input.value = String(value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Density heatmap block', () => {
	test('the hour filter, whole-day switch and cluster view all follow the data', async () => {
		const { screen, map } = await mountBlock(DensityHeatmap);
		const container = screen.container;
		const summary = () => container.querySelector('[data-testid="pickup-summary"]')?.textContent;
		const count = () => Number(summary()?.match(/^\s*(\d+) pickups/)?.[1]);
		const evening = count();
		expect(evening).toBeGreaterThan(0);
		expect(evening).toBeLessThan(PICKUPS.length);

		setRange(container.querySelector('#pickup-hour') as HTMLInputElement, 3);
		await expect.poll(count).not.toBe(evening);
		expect(summary()).toContain('02:00 to 05:00');

		await userEvent.click(container.querySelector('#pickup-all-day') as HTMLElement);
		await expect.poll(count).toBe(PICKUPS.length);
		expect(summary()).toContain('100% of the day');

		// The test style has no glyphs, so cluster counts are drawn as HTML labels.
		await userEvent.click(button(map, 'Clusters'));
		await expect.poll(() => map.querySelectorAll('.map-cluster-label').length).toBeGreaterThan(0);
	});
});
