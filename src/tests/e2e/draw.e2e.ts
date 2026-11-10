import { expect, test, type Locator, type Page } from '@playwright/test';

/** Pointer position at a share of the canvas box, so clicks stay clear of the toolbars. */
async function at(canvas: Locator, x: number, y: number): Promise<{ x: number; y: number }> {
	const box = await canvas.boundingBox();
	if (!box) throw new Error('map canvas not visible');
	return { x: box.x + box.width * x, y: box.y + box.height * y };
}

async function clickAt(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
	const point = await at(canvas, x, y);
	await page.mouse.click(point.x, point.y);
}

async function drag(page: Page, canvas: Locator, from: [number, number], to: [number, number]) {
	const start = await at(canvas, ...from);
	const end = await at(canvas, ...to);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(end.x, end.y, { steps: 12 });
	await page.mouse.up();
}

test('draw, edit, undo and redo a polygon', async ({ page }) => {
	await page.goto('/docs/drawing');
	const preview = page.locator('[data-slot="preview"]').first();
	const map = preview.locator('[data-slot="map"]');
	await expect(map).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
	const canvas = map.locator('canvas');
	const shapes = preview.locator('li');
	const area = shapes.first().locator('.font-mono');

	// Draw a square and close it on its first corner.
	await preview.getByRole('button', { name: 'Draw polygon' }).click();
	await clickAt(page, canvas, 0.35, 0.4);
	await clickAt(page, canvas, 0.6, 0.4);
	await clickAt(page, canvas, 0.6, 0.75);
	await clickAt(page, canvas, 0.35, 0.75);
	await clickAt(page, canvas, 0.35, 0.4);
	await expect(shapes).toHaveCount(1);
	await expect(shapes.first()).toContainText('polygon');
	const drawnArea = await area.textContent();

	// Select it and drag one corner outwards: the area grows.
	await preview.getByRole('button', { name: 'Select and edit' }).click();
	await clickAt(page, canvas, 0.47, 0.57);
	await drag(page, canvas, [0.6, 0.75], [0.7, 0.85]);
	await expect(area).not.toHaveText(drawnArea ?? '');
	const editedArea = await area.textContent();

	// Undo the edit, then the drawing; redo brings the drawing back.
	const undo = preview.getByRole('button', { name: 'Undo' });
	const redo = preview.getByRole('button', { name: 'Redo' });
	await undo.click();
	await expect(area).toHaveText(drawnArea ?? '');
	await expect(async () => {
		await undo.click();
		await expect(shapes).toHaveCount(0, { timeout: 500 });
	}).toPass({ timeout: 10_000 });
	await redo.click();
	await expect(shapes).toHaveCount(1);
	expect(editedArea).not.toBe(drawnArea);
});
