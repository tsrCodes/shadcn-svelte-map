import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import FieldSurvey from '#lib/registry/blocks/field-survey/field-survey.svelte';
import { button, mountBlock } from './helpers.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Field survey block', () => {
	test('observations and transects are recorded with details and exported as GeoJSON', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		const { screen, map, canvas, pointer } = await mountBlock(FieldSurvey);
		const container = screen.container;
		const [x, y] = [canvas.clientWidth / 2, canvas.clientHeight / 2];

		await userEvent.click(button(map, 'Draw point'));
		await pointer.click([x, y]);
		await expect
			.poll(() => container.querySelectorAll('[data-testid="observation"]').length)
			.toBe(1);
		const observation = container.querySelector('[data-testid="observation"]') as HTMLElement;
		expect(observation.textContent).not.toContain('Outside area');
		await userEvent.selectOptions(observation.querySelector('select') as HTMLElement, 'Hazard');
		await userEvent.fill(observation.querySelector('input') as HTMLElement, 'Fallen branch');

		await userEvent.click(button(map, 'Draw line'));
		await pointer.click([x - 80, y + 60]);
		await pointer.click([x + 80, y + 60]);
		await pointer.click([x + 80, y + 60]);
		await expect.poll(() => container.querySelectorAll('[data-testid="transect"]').length).toBe(1);

		await userEvent.click(button(container, 'Copy GeoJSON'));
		await expect.poll(() => writeText.mock.calls.length).toBe(1);
		const exported = JSON.parse(writeText.mock.calls[0][0]);
		expect(exported.features.map((feature: { properties: unknown }) => feature.properties)).toEqual(
			[
				{ kind: 'observation', category: 'Hazard', note: 'Fallen branch' },
				{ kind: 'transect', metres: expect.any(Number) }
			]
		);
		expect(exported.features[1].properties.metres).toBeGreaterThan(0);
		expect(button(container, 'Copied')).toBeTruthy();
	});
});
