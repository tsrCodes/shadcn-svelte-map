import { expect, test } from '@playwright/test';

test('home page shows the title, install command and footer credit', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Maps for shadcn-svelte');
	await expect(page.getByText('shadcn-svelte@latest add').first()).toBeVisible();
	const credit = page.locator('[data-slot="site-credit"]');
	await expect(credit).toContainText('Handcrafted by Oggy');
	await expect(credit.getByRole('link', { name: 'Oggy' })).toHaveAttribute(
		'href',
		'https://github.com/tsrCodes'
	);
});
