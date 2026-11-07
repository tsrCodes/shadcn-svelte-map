import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import StoreLocator from '#lib/registry/blocks/store-locator/store-locator.svelte';
import { button, mountBlock } from './helpers.js';

/** One made-up Photon result next to the Zuid store. */
const PHOTON_RESULT = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { osm_type: 'N', osm_id: 7, type: 'house', name: 'Sample Street 1' },
			geometry: { type: 'Point', coordinates: [4.8776, 52.3437] }
		}
	]
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Store locator block', () => {
	test('searching an address sorts stores by distance; the pin tool proposes a site', async () => {
		vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify(PHOTON_RESULT)));
		const { screen, map, pointer } = await mountBlock(StoreLocator);
		const container = screen.container;
		const listings = () => [...container.querySelectorAll<HTMLElement>('[data-testid="listing"]')];
		expect(listings()[0]?.dataset.key).not.toBe('zuid');

		const input = map.querySelector<HTMLInputElement>('[data-slot="place-autocomplete"] input');
		await userEvent.type(input as HTMLInputElement, 'sample');
		const option = await vi.waitFor(() => {
			const found = map.querySelector<HTMLElement>('[data-slot="command-item"]');
			if (!found) throw new Error('no result yet');
			return found;
		});
		await userEvent.click(option);
		await expect.poll(() => listings()[0]?.dataset.key).toBe('zuid');

		await userEvent.click(button(map, 'Draw point'));
		await pointer.click([200, 220]);
		await expect
			.poll(() => container.querySelectorAll('input[aria-label="Proposed site name"]').length)
			.toBe(1);
		expect(listings()).toHaveLength(8);

		const name = () =>
			container.querySelector<HTMLInputElement>('input[aria-label="Proposed site name"]');
		await userEvent.fill(name() as HTMLInputElement, 'Harbour kiosk');
		await userEvent.click(button(map, 'Undo'));
		await expect.poll(() => name()).toBeNull();
		await userEvent.click(button(map, 'Redo'));
		await expect.poll(() => name()?.value).toBe('Harbour kiosk');
	});
});
