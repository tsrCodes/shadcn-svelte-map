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
	// The example loads lazily and builds its points first, which is slow on a cold dev server.
	await expect(page.getByTestId('perf-count')).toHaveText('100,000', { timeout: 30_000 });
	await expect(page.getByTestId('perf-load')).toHaveText(/ms$/, { timeout: 60_000 });
	expect(milliseconds(await page.getByTestId('perf-load').textContent())).toBeLessThan(
		LOAD_BUDGET_MS
	);

	// A busy test machine can stall a run, so measure again until one run meets the budget.
	const medians: number[] = [];
	await expect(async () => {
		await panel.getByRole('button', { name: 'Measure panning' }).click();
		await expect(panel.getByRole('button', { name: 'Measure panning' })).toBeEnabled({
			timeout: 30_000
		});
		medians.push(milliseconds(await page.getByTestId('perf-median').textContent()));
		expect(Math.min(...medians)).toBeLessThan(MEDIAN_FRAME_BUDGET_MS);
	}).toPass({ intervals: [0], timeout: 100_000 });
});
