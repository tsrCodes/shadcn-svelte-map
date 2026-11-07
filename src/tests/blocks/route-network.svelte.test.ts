import { describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import RouteNetwork from '#lib/registry/blocks/route-network/route-network.svelte';
import { ROUTES } from '#lib/registry/blocks/route-network/data.js';
import { button, mountBlock } from './helpers.js';

function routesFrom(hub: string): number {
	return ROUTES.filter((route) => route.from === hub).length;
}

describe('Route network block', () => {
	test('switching hubs swaps the routes, and picking one shows its distance', async () => {
		const { screen, map } = await mountBlock(RouteNetwork);
		const container = screen.container;
		const legs = () => [...container.querySelectorAll<HTMLElement>('[data-testid="leg"]')];
		const detail = () => container.querySelector('[data-testid="leg-detail"]')?.textContent;
		expect(legs()).toHaveLength(routesFrom('LHR'));
		expect(legs()[0].textContent).toContain('JFK');

		await userEvent.click(button(map, 'DXB'));
		expect(legs()).toHaveLength(routesFrom('DXB'));
		expect(legs()[0].textContent).toContain('BOM');

		const sydney = legs().find((leg) => leg.textContent?.includes('SYD')) as HTMLElement;
		await userEvent.click(sydney);
		expect(sydney.getAttribute('aria-pressed')).toBe('true');
		expect(detail()).toContain('DXB → SYD');
		const km = Number(
			detail()
				?.match(/([\d,]+) km/)?.[1]
				.replace(/,/g, '')
		);
		expect(km).toBeGreaterThan(11_000);
		expect(km).toBeLessThan(13_000);

		await userEvent.click(button(map, 'FRA'));
		expect(detail()).toContain('Pick a route');
	});
});
