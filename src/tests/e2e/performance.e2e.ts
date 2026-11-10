import { expect, test } from '@playwright/test';

// Tests render on the CPU (SwiftShader), far slower than a GPU. These budgets catch a
// regression such as rebuilding the layer per frame, not the GPU numbers on the page.
const LOAD_BUDGET_MS = 20_000;
const MEDIAN_FRAME_BUDGET_MS = 100;

function milliseconds(text: string | null): number {
	const value = Number.parseFloat((text ?? '').replace(/,/g, ''));
	if (Number.isNaN(value)) throw new Error(`not a number: ${text}`);
	return value;
}

test('100,000 points load and pan within the frame budget', async ({ page }) => {
	test.setTimeout(120_000);
	await page.goto('/docs/performance');
	const panel = page.getByTestId('perf-panel');
	await expect(page.getByTestId('perf-count')).toHaveText('100,000');
	await expect(page.getByTestId('perf-load')).toHaveText(/ms$/, { timeout: 60_000 });
	expect(milliseconds(await page.getByTestId('perf-load').textContent())).toBeLessThan(
		LOAD_BUDGET_MS
	);

	await panel.getByRole('button', { name: 'Measure panning' }).click();
	await expect(page.getByTestId('perf-median')).toHaveText(/ms$/, { timeout: 60_000 });
	const median = milliseconds(await page.getByTestId('perf-median').textContent());
	expect(median).toBeLessThan(MEDIAN_FRAME_BUDGET_MS);
});
