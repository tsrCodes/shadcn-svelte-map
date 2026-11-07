import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import DeliveryZonePlanner from '#lib/registry/blocks/delivery-zone-planner/delivery-zone-planner.svelte';
import { button, mountBlock } from './helpers.js';

function euros(text: string | null | undefined): number {
	return Number((text ?? '').replace(/[^\d.]/g, ''));
}

describe('Delivery zone planner block', () => {
	test('a zone around the depot covers orders, and a pricier tier raises the fees', async () => {
		const { screen, map, canvas, pointer } = await mountBlock(DeliveryZonePlanner);
		const container = screen.container;
		const text = (id: string) => container.querySelector(`[data-testid="${id}"]`)?.textContent;
		expect(text('coverage')).toBe('0%');

		const [x, y] = [canvas.clientWidth / 2, canvas.clientHeight / 2];
		await userEvent.click(button(map, 'Draw rectangle'));
		await pointer.rectangle([x - 60, y - 60], [x + 60, y + 60]);

		await expect.poll(() => container.querySelectorAll('[data-testid="zone"]').length).toBe(1);
		await expect.poll(() => text('coverage')).not.toBe('0%');
		const standard = euros(text('revenue'));
		expect(standard).toBeGreaterThan(0);

		const select = container.querySelector('[data-testid="zone"] select') as HTMLSelectElement;
		await userEvent.selectOptions(select, 'express');
		await expect.poll(() => euros(text('revenue'))).toBeGreaterThan(standard);
	});
});
