import { expect, test, type Page } from '@playwright/test';

declare global {
	interface Window {
		__cspViolations: string[];
	}
}

async function watchCsp(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.__cspViolations = [];
		document.addEventListener('securitypolicyviolation', (event) =>
			window.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`)
		);
	});
}

// Pages with code blocks, previews, API tables, the block preview and thumbnails.
const PAGES = ['/docs/installation', '/docs/components/marker', '/blocks', '/blocks/store-locator'];

for (const path of PAGES) {
	test(`${path} renders under the strict CSP with the footer credit`, async ({ page }) => {
		await watchCsp(page);
		await page.goto(path);
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('[data-slot="site-credit"]')).toContainText('Handcrafted by Oggy');
		const map = page.locator('[data-slot="map"]').first();
		if (await map.count()) {
			await expect(map).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
		}
		expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
	});
}

test('code blocks are coloured without inline styles', async ({ page }) => {
	await page.goto('/docs/components/marker');
	// The preview's Code tab is hidden until opened; check a code block in the page text.
	const token = page.locator('.shiki span[class*="sl-"]').filter({ visible: true }).first();
	await expect(token).toBeVisible();
	expect(await page.locator('.shiki [style]').count()).toBe(0);
	const colour = await token.evaluate((node) => getComputedStyle(node).color);
	expect(colour).not.toBe('rgb(0, 0, 0)');
});

test('search opens with the keyboard and goes to a page', async ({ page }) => {
	await page.goto('/docs');
	const input = page.getByPlaceholder('Search documentation...');
	// The shortcut works once the page has hydrated, so retry until the dialog opens.
	await expect(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		await expect(input).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
	await input.fill('heatmap');
	await expect(page.getByRole('option').first()).toHaveText('Heatmap');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/docs\/components\/heatmap$/);
	await expect(page.locator('h1')).toHaveText('Heatmap');
});

test('markdown and llms.txt routes serve plain text for tools', async ({ request }) => {
	const llms = await request.get('/llms.txt');
	expect(llms.ok()).toBe(true);
	expect(await llms.text()).toContain('/docs/components/marker.md');

	const marker = await request.get('/docs/components/marker.md');
	expect(marker.headers()['content-type']).toContain('text/markdown');
	const markdown = await marker.text();
	expect(markdown).toContain('### MapMarker');
	expect(markdown).toContain('$lib/components/ui/map');
	expect(markdown).not.toContain('<ComponentPreview');
});
