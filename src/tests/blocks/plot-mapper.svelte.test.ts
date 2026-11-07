import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import PlotMapper from '#lib/registry/blocks/plot-mapper/plot-mapper.svelte';
import { button, mountBlock } from './helpers.js';

describe('Plot mapper block', () => {
	test('a traced field gets its area and parcel, and its crop feeds the totals', async () => {
		const { screen, map, canvas, pointer } = await mountBlock(PlotMapper);
		const container = screen.container;
		const middle = canvas.clientWidth / 2;
		const height = canvas.clientHeight / 2;

		await userEvent.click(button(map, 'Draw rectangle'));
		await pointer.rectangle([middle - 30, height - 20], [middle + 30, height + 20]);

		await expect.poll(() => container.querySelectorAll('[data-testid="field"]').length).toBe(1);
		const field = container.querySelector('[data-testid="field"]') as HTMLElement;
		expect(field.textContent).toContain('Parcel 113');
		expect(field.textContent).toMatch(/\d+\.\d\d ha/);

		const select = field.querySelector('select') as HTMLSelectElement;
		await userEvent.selectOptions(select, 'Maize');
		await expect
			.poll(() => container.querySelector('[data-testid="crop-totals"]')?.textContent)
			.toContain('Maize');
	});
});
