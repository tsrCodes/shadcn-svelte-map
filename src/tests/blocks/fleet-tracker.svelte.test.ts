import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import FleetTracker from '#lib/registry/blocks/fleet-tracker/fleet-tracker.svelte';
import { TICK_MS } from '#lib/registry/blocks/fleet-tracker/data.js';
import { button, liveTimers, mountBlock } from './helpers.js';

/** A little over two ticks, so at least one tick lands inside the wait. */
const TWO_TICKS = TICK_MS * 2 + 100;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Fleet tracker block', () => {
	test('vehicles move, pause stops them, and unmounting stops the clock', async () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval');
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
		const { screen } = await mountBlock(FleetTracker);
		const container = screen.container;
		const vehicles = () => [...container.querySelectorAll<HTMLElement>('[data-testid="vehicle"]')];
		const progress = () => vehicles()[0].dataset.progress;

		const start = progress();
		await expect.poll(progress, { timeout: TWO_TICKS * 2 }).not.toBe(start);

		const spies = { set: setIntervalSpy, clear: clearIntervalSpy };
		await userEvent.click(button(container, 'Pause'));
		const paused = progress();
		// With no clock left running nothing can move the fleet, so there is nothing to wait for.
		expect(liveTimers(spies, TICK_MS)).toEqual([]);
		expect(progress()).toBe(paused);

		await userEvent.click(vehicles()[1]);
		expect(vehicles()[1].getAttribute('aria-pressed')).toBe('true');
		expect(vehicles()[0].getAttribute('aria-pressed')).toBe('false');

		await userEvent.click(button(container, 'Play'));
		await expect.poll(progress, { timeout: TWO_TICKS * 2 }).not.toBe(paused);

		expect(liveTimers(spies, TICK_MS)).toHaveLength(1);
		screen.unmount();
		expect(liveTimers(spies, TICK_MS)).toEqual([]);
	});
});
