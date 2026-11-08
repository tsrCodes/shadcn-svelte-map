import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import OrderTracker from '#lib/registry/blocks/order-tracker/order-tracker.svelte';
import { TICK_MS } from '#lib/registry/blocks/order-tracker/data.js';
import { button, liveTimers, mountBlock } from './helpers.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Order tracker block', () => {
	test('the order moves through its stages, replays, and stops its clock on unmount', async () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval');
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
		const { screen } = await mountBlock(OrderTracker);
		const container = screen.container;
		const current = () =>
			container.querySelector('[data-testid="stage"][aria-current="step"]')?.textContent?.trim();
		const eta = () => container.querySelector('[data-testid="eta"]')?.textContent?.trim();

		await expect.poll(current, { timeout: TICK_MS * 6 }).toBe('Being prepared');
		await expect.poll(eta, { timeout: TICK_MS * 6 }).not.toBe('18 min');
		expect(container.querySelector('[data-testid="courier"]')).not.toBeNull();

		await userEvent.click(button(container, 'Replay'));
		expect(eta()).toBe('18 min');
		expect(current()).toBe('Order placed');

		// Every clock still running must stop, so a timer with the same delay can't stand in for it.
		const spies = { set: setIntervalSpy, clear: clearIntervalSpy };
		expect(liveTimers(spies, TICK_MS)).toHaveLength(1);
		screen.unmount();
		expect(liveTimers(spies, TICK_MS)).toEqual([]);
	});
});
