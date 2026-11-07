import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import FleetTracker from '#lib/registry/blocks/fleet-tracker/fleet-tracker.svelte';
import { TICK_MS } from '#lib/registry/blocks/fleet-tracker/data.js';
import { button, mountBlock } from './helpers.js';

/** A little over two ticks, so at least one tick lands inside the wait. */
const TWO_TICKS = TICK_MS * 2 + 100;

afterEach(() => {
	vi.restoreAllMocks();
});

function clockTimers(spy: { mock: { calls: unknown[][]; results: { value: unknown }[] } }) {
	return spy.mock.calls.flatMap((call, index) =>
		call[1] === TICK_MS ? [spy.mock.results[index].value] : []
	);
}

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

		await userEvent.click(button(container, 'Pause'));
		const paused = progress();
		await new Promise((resolve) => setTimeout(resolve, TWO_TICKS));
		expect(progress()).toBe(paused);

		await userEvent.click(vehicles()[1]);
		expect(vehicles()[1].getAttribute('aria-pressed')).toBe('true');
		expect(vehicles()[0].getAttribute('aria-pressed')).toBe('false');

		await userEvent.click(button(container, 'Play'));
		await expect.poll(progress, { timeout: TWO_TICKS * 2 }).not.toBe(paused);

		const timers = clockTimers(setIntervalSpy);
		expect(timers).toHaveLength(2);
		screen.unmount();
		const cleared = clearIntervalSpy.mock.calls.map((call) => call[0]);
		for (const timer of timers) expect(cleared).toContain(timer);
	});
});
