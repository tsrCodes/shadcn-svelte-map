import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import GeofenceEditor from '#lib/registry/blocks/geofence-editor/geofence-editor.svelte';
import { button, mountBlock, pixelOf } from './helpers.js';

describe('Geofence editor block', () => {
	test('a fence drawn around an asset counts it, and undo and redo keep its name', async () => {
		const { screen, map, canvas, pointer } = await mountBlock(GeofenceEditor);
		const container = screen.container;
		const asset = () => container.querySelector<HTMLElement>('[data-testid="asset-truck-2"]');
		const summary = () => container.querySelector('[data-testid="fence-summary"]')?.textContent;
		const nameInput = () =>
			container.querySelector<HTMLInputElement>('input[aria-label="Fence name"]');
		expect(asset()?.dataset.fenced).toBe('false');
		expect(summary()).toContain('0 of 6');

		const [x, y] = pixelOf(canvas, asset() as HTMLElement);
		await userEvent.click(button(map, 'Draw rectangle'));
		await pointer.rectangle([x - 12, y - 12], [x + 12, y + 12]);

		await expect.poll(() => container.querySelectorAll('[data-testid="fence"]').length).toBe(1);
		await expect.poll(() => asset()?.dataset.fenced).toBe('true');
		expect(summary()).toContain('1 of 6');

		await userEvent.fill(nameInput() as HTMLInputElement, 'Quay');

		await userEvent.click(button(map, 'Undo'));
		await expect.poll(() => container.querySelectorAll('[data-testid="fence"]').length).toBe(0);
		expect(asset()?.dataset.fenced).toBe('false');

		await userEvent.click(button(map, 'Redo'));
		await expect.poll(() => nameInput()?.value).toBe('Quay');
	});
});
