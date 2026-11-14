/**
 * Screenshots every block in light and dark mode for the gallery.
 * Run against a running dev or preview server: `pnpm thumbnails [base-url]`.
 */
import { mkdir } from 'node:fs/promises';
import { chromium, type Page } from 'playwright';
import { BLOCKS } from '../src/routes/blocks/catalog.ts';

const BASE_URL = process.argv[2] ?? 'http://localhost:5174';
const OUT_DIR = 'static/thumbnails';
// Desktop width so blocks show their side-by-side layout, scaled down to card size.
const VIEWPORT = { width: 1360, height: 980 };
const SCALE = 0.62;
// Card aspect ratio in the gallery (16:10).
const SIZE = { width: 16, height: 10 };
const READY_TIMEOUT_MS = 60_000;
// Tiles and HTML overlays keep settling for a moment after the map reports ready.
const SETTLE_MS = 2500;
const JPEG_QUALITY = 82;
const WEBGL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function shoot(page: Page, name: string, mode: 'light' | 'dark'): Promise<void> {
	await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
	await page.goto(`${BASE_URL}/blocks/${name}`, { waitUntil: 'load' });
	const preview = page.locator('section[aria-label$="preview"]');
	// Blocks load lazily, so wait for a ready map. A block with no map at all just settles;
	// a map that never gets ready is still an error.
	try {
		await preview
			.locator('[data-slot="map"][data-status="ready"]')
			.first()
			.waitFor({ timeout: READY_TIMEOUT_MS });
	} catch (error) {
		if (await preview.locator('[data-slot="map"]').count()) throw error;
	}
	await page.waitForTimeout(SETTLE_MS);
	const box = await preview.boundingBox();
	if (!box) throw new Error(`${name}: preview not visible`);
	const height = Math.min(box.height, (box.width * SIZE.height) / SIZE.width);
	await page.screenshot({
		path: `${OUT_DIR}/${name}-${mode}.jpg`,
		type: 'jpeg',
		quality: JPEG_QUALITY,
		clip: { x: box.x, y: box.y, width: box.width, height }
	});
}

// A few pages at a time: faster than one by one, light enough for CPU WebGL.
const CONCURRENCY = 3;

async function main(): Promise<void> {
	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch({ args: WEBGL_ARGS });
	let next = 0;
	const jobs = BLOCKS.flatMap((block) =>
		(['light', 'dark'] as const).map((mode) => ({ name: block.name, mode }))
	);
	try {
		const worker = async () => {
			const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
			try {
				// Each worker claims the next index; the jobs list itself never changes.
				for (let index = next++; index < jobs.length; index = next++) {
					const job = jobs[index];
					await shoot(page, job.name, job.mode);
					process.stdout.write(`${job.name}-${job.mode}.jpg\n`);
				}
			} finally {
				await page.close();
			}
		};
		await Promise.all(Array.from({ length: CONCURRENCY }, worker));
	} finally {
		await browser.close();
	}
}

main().catch((error: unknown) => {
	process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
	process.exit(1);
});
