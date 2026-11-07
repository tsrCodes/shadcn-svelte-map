import { expect, test } from '@playwright/test';

declare global {
	interface Window {
		__cspViolations: string[];
	}
}

test('map renders under strict CSP with no external script', async ({ page, baseURL }) => {
	const origin = new URL(baseURL ?? '').origin;
	const workers: string[] = [];
	page.on('worker', (worker) => workers.push(worker.url()));
	await page.addInitScript(() => {
		window.__cspViolations = [];
		document.addEventListener('securitypolicyviolation', (event) =>
			window.__cspViolations.push(
				`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}`
			)
		);
	});

	await page.emulateMedia({ colorScheme: 'light' });
	const response = await page.goto('/demo');
	const policy = response?.headers()['content-security-policy'] ?? '';
	expect(policy).toContain("script-src 'self'");
	expect(policy).toContain("worker-src 'self'");
	expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");

	const map = page.locator('[data-slot="map"]');
	await expect(map).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
	await expect(map.locator('canvas')).toBeVisible();
	await expect(page.locator('.maplibregl-ctrl-attrib')).toBeVisible();

	// Theme toggle swaps the basemap; mode-watcher must not inject inline styles.
	const darkStyle = page.waitForResponse(/tiles\.openfreemap\.org\/styles\/dark/);
	await page.getByRole('button', { name: 'Toggle theme' }).click();
	await expect(page.locator('html')).toHaveClass(/dark/);
	expect((await darkStyle).ok()).toBe(true);
	await expect(map).toHaveAttribute('data-status', 'ready');

	// The CSP allows SvelteKit's announcer style by hash. If Kit changes that style, the
	// hash in vite.config.ts no longer matches and the announcer loses its styling.
	await expect(page.locator('#svelte-announcer'), 'update KIT_ANNOUNCER_STYLE').toHaveCSS(
		'position',
		'absolute'
	);

	// Markers, tooltips and popups are styled from JS and CSS files, never inline styles.
	const marker = page.getByRole('button', { name: 'Museum Island' });
	await map.locator('canvas').focus();
	// Tab through the map's controls and markers until this one has focus, whatever the order.
	await expect(async () => {
		await page.keyboard.press('Tab');
		await expect(marker).toBeFocused({ timeout: 250 });
	}).toPass({ timeout: 10_000 });
	await expect(page.getByRole('tooltip')).toHaveText('Five museums on the Spree');
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog', { name: 'Museum Island' });
	await expect(dialog).toBeVisible();
	await expect(marker).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(marker).toBeFocused();

	// The layers menu is positioned from JS; it must open inside the map without inline styles.
	await page.getByRole('button', { name: 'Map layers' }).click();
	const bright = page.getByRole('menuitemradio', { name: 'Bright' });
	await expect(bright).toBeVisible();
	expect(await bright.evaluate((item) => item.closest('[data-slot="map"]') !== null)).toBe(true);
	await page.keyboard.press('Escape');
	await expect(bright).toBeHidden();

	const scripts = await page
		.locator('script[src]')
		.evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
	expect(scripts.length).toBeGreaterThan(0);
	for (const src of scripts) expect(new URL(src).origin).toBe(origin);
	expect(workers.length).toBeGreaterThan(0);
	for (const url of workers) expect(new URL(url).origin).toBe(origin);

	expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});
