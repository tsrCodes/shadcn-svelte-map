import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import GeofenceEditor from '#lib/registry/blocks/geofence-editor/geofence-editor.svelte';
import { button, mountBlock, pixelOf } from './helpers.js';

describe('Geofence editor block', () => {
	test('the saved fence loads ready to edit and counts the asset inside it', async () => {
		const { screen } = await mountBlock(GeofenceEditor);
		const container = screen.container;
		await expect.poll(() => container.querySelectorAll('[data-testid="fence"]').length).toBe(1);
		expect(
			container.querySelector('[data-testid="asset-truck-1"]')?.getAttribute('data-fenced')
		).toBe('true');
		expect(container.querySelector<HTMLInputElement>('input[aria-label="Fence name"]')?.value).toBe(
			'Container yard'
		);
	});

	test('a fence drawn around an asset counts it, and undo and redo keep its name', async () => {
		const { screen, map, canvas, pointer } = await mountBlock(GeofenceEditor);
		const container = screen.container;
		const asset = () => container.querySelector<HTMLElement>('[data-testid="asset-truck-2"]');
		const summary = () => container.querySelector('[data-testid="fence-summary"]')?.textContent;
		expect(asset()?.dataset.fenced).toBe('false');
		expect(summary()).toContain('1 of 6');

		const [x, y] = pixelOf(canvas, asset() as HTMLElement);
		await userEvent.click(button(map, 'Draw rectangle'));
		await pointer.rectangle([x - 12, y - 12], [x + 12, y + 12]);

		await expect.poll(() => container.querySelectorAll('[data-testid="fence"]').length).toBe(2);
		await expect.poll(() => asset()?.dataset.fenced).toBe('true');
		expect(summary()).toContain('2 of 6');

		const quay = () =>
			container.querySelectorAll<HTMLInputElement>('input[aria-label="Fence name"]')[1];
		await userEvent.fill(quay(), 'Quay');

		await userEvent.click(button(map, 'Undo'));
		await expect.poll(() => container.querySelectorAll('[data-testid="fence"]').length).toBe(1);
		expect(asset()?.dataset.fenced).toBe('false');

		await userEvent.click(button(map, 'Redo'));
		await expect.poll(() => quay()?.value).toBe('Quay');
	});
});
