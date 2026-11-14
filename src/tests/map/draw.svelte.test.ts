import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { TerraDraw } from 'terra-draw';
import { MapContext } from '#lib/registry/ui/map/index.js';
import { type DrawFeature } from '#lib/registry/ui/map-draw/index.js';
import { finishedFeatures } from '#lib/registry/ui/map-draw/draw.js';
import DrawHarness from './DrawHarness.svelte';

type HarnessProps = NonNullable<Parameters<typeof render<typeof DrawHarness>>[1]>;
type Pixel = [number, number];

const DRAW_PREFIX = 'map-draw-';

const SAVED: DrawFeature[] = [
	{
		type: 'Feature',
		id: 'zone-a',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-10, -10],
					[10, -10],
					[10, 10],
					[-10, -10]
				]
			]
		},
		properties: { mode: 'polygon' }
	},
	{
		type: 'Feature',
		id: 7,
		geometry: { type: 'Point', coordinates: [20, 5] },
		properties: { mode: 'point' }
	},
	{
		type: 'Feature',
		id: 'path',
		geometry: {
			type: 'LineString',
			coordinates: [
				[-20, 0],
				[0, 15]
			]
		},
		properties: { mode: 'polyline' }
	}
];

function byId(list: readonly DrawFeature[]): DrawFeature[] {
	return list.toSorted((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** Finished drawings in the live instance, as `onchange` reports them, sorted by id. */
function drawn(draw: TerraDraw | null): DrawFeature[] {
	return draw ? byId(finishedFeatures(draw.getSnapshot())) : [];
}
// The tool bar sits along the top edge; keep pointer input well below it.
const POLYGON: Pixel[] = [
	[150, 110],
	[250, 110],
	[250, 200]
];

async function mountDraw(props: Partial<HarnessProps> = {}) {
	let context: MapContext | null = null;
	let draw: TerraDraw | null = null;
	const changes: DrawFeature[][] = [];
	const screen = render(DrawHarness, {
		...props,
		oncontext: (value: MapContext) => (context = value),
		ondraw: (value: TerraDraw | null) => (draw = value),
		onchange: (features: DrawFeature[]) => changes.push(features)
	});
	await expect.poll(() => draw, { timeout: 15_000 }).not.toBeNull();
	const ctx = context as unknown as MapContext;
	const root = screen.container.querySelector<HTMLElement>('[data-slot="map"]');
	if (!root) throw new Error('map root not found');
	return {
		screen,
		ctx,
		root,
		map: ctx.map as MapLibreMap,
		draw: () => draw,
		changes,
		latest: () => changes.at(-1) ?? []
	};
}

function button(root: ParentNode, name: string): HTMLButtonElement {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(element) => element.getAttribute('aria-label') === name
	);
	if (!found) throw new Error(`button "${name}" not found`);
	return found;
}

function pointer(map: MapLibreMap) {
	const canvas = map.getCanvas();
	const inside = ([x, y]: Pixel) => {
		expect(x).toBeGreaterThan(0);
		expect(x).toBeLessThan(canvas.clientWidth);
		expect(y).toBeGreaterThan(50);
		expect(y).toBeLessThan(canvas.clientHeight);
		return { x, y };
	};
	return {
		click: (at: Pixel) => userEvent.click(canvas, { position: inside(at) }),
		move: (at: Pixel) => userEvent.hover(canvas, { position: inside(at) }),
		drag: (from: Pixel, to: Pixel) =>
			userEvent.dragAndDrop(canvas, canvas, {
				sourcePosition: inside(from),
				targetPosition: inside(to),
				// One pointermove only starts a drag; the shape moves on the ones after it.
				steps: 10
			})
	};
}

async function drawPolygon(map: MapLibreMap, root: HTMLElement) {
	const input = pointer(map);
	if (button(root, 'Draw polygon').getAttribute('aria-pressed') !== 'true') {
		await userEvent.click(button(root, 'Draw polygon'));
	}
	for (const at of POLYGON) await input.click(at);
	await input.click(POLYGON[0]);
}

function drawLayers(map: MapLibreMap): string[] {
	return map.getLayersOrder().filter((id) => id.startsWith(DRAW_PREFIX));
}

function drawSources(map: MapLibreMap): string[] {
	return Object.keys(map.getStyle().sources).filter((id) => id.startsWith(DRAW_PREFIX));
}

function renderedPolygons(map: MapLibreMap) {
	const source = drawSources(map).find((id) => id.endsWith('-polygon'));
	return source ? map.querySourceFeatures(source) : [];
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	vi.restoreAllMocks();
});

describe('MapDrawControl', () => {
	test('draws every mode with real pointer input and reports finished features', async () => {
		const { map, root, latest } = await mountDraw();
		const input = pointer(map);

		await userEvent.click(button(root, 'Draw point'));
		await input.click([60, 80]);

		await userEvent.click(button(root, 'Draw line'));
		await input.click([60, 120]);
		await input.click([120, 140]);
		await input.click([120, 140]);

		await drawPolygon(map, root);

		await userEvent.click(button(root, 'Draw rectangle'));
		await input.click([40, 200]);
		await input.move([90, 250]);
		await input.click([90, 250]);

		await userEvent.click(button(root, 'Draw circle'));
		await input.click([330, 120]);
		await input.move([360, 120]);
		await input.click([360, 120]);

		await userEvent.click(button(root, 'Draw freehand'));
		await input.click([300, 220]);
		for (const at of [
			[340, 230],
			[360, 260],
			[320, 280]
		] as Pixel[]) {
			await input.move(at);
		}
		await input.click([300, 270]);

		await expect
			.poll(() => latest().map((feature) => `${feature.properties.mode}:${feature.geometry.type}`))
			.toEqual([
				'point:Point',
				'polyline:LineString',
				'polygon:Polygon',
				'rectangle:Polygon',
				'circle:Polygon',
				'freehand:Polygon'
			]);
		expect(Object.keys(latest()[2].properties)).toEqual(['mode']);
	});

	test('never reports a shape that is still being drawn', async () => {
		const { map, root, changes } = await mountDraw();
		const input = pointer(map);
		await userEvent.click(button(root, 'Draw polygon'));
		await input.click(POLYGON[0]);
		await input.click(POLYGON[1]);
		await input.move(POLYGON[2]);
		expect(changes).toEqual([]);

		await input.click(POLYGON[2]);
		await input.click(POLYGON[0]);
		await expect.poll(() => changes.length).toBe(1);
		expect(changes[0]).toHaveLength(1);
	});

	test('select then drag moves a shape and reports the edit', async () => {
		const { map, root, latest, draw } = await mountDraw();
		await drawPolygon(map, root);
		await expect.poll(() => latest()).toHaveLength(1);
		const before = JSON.stringify(latest()[0].geometry);

		await userEvent.click(button(root, 'Select and edit'));
		expect(draw()?.getMode()).toBe('select');
		const input = pointer(map);
		await input.click([220, 140]);
		await expect.poll(() => button(root, 'Delete selected').disabled).toBe(false);
		await input.drag([220, 140], [200, 170]);

		await expect.poll(() => JSON.stringify(latest()[0]?.geometry)).not.toBe(before);
		expect(latest()).toHaveLength(1);
	});

	test('deletes the selected shape', async () => {
		const { map, root, latest } = await mountDraw();
		await drawPolygon(map, root);
		await expect.poll(() => latest()).toHaveLength(1);
		const deleteButton = button(root, 'Delete selected');
		expect(deleteButton.disabled).toBe(true);

		await userEvent.click(button(root, 'Select and edit'));
		await pointer(map).click([220, 140]);
		await expect.poll(() => deleteButton.disabled).toBe(false);
		await userEvent.click(deleteButton);

		await expect.poll(() => latest()).toEqual([]);
		expect(deleteButton.disabled).toBe(true);
	});

	test('undo and redo step through history and follow it in their state', async () => {
		const { map, root, latest } = await mountDraw();
		const undo = button(root, 'Undo');
		const redo = button(root, 'Redo');
		expect(undo.disabled).toBe(true);
		expect(redo.disabled).toBe(true);

		await drawPolygon(map, root);
		await expect.poll(() => undo.disabled).toBe(false);
		expect(latest()).toHaveLength(1);

		await userEvent.click(undo);
		await expect.poll(() => latest()).toEqual([]);
		expect(redo.disabled).toBe(false);

		await userEvent.click(redo);
		await expect.poll(() => latest()).toHaveLength(1);
		expect(redo.disabled).toBe(true);
	});

	test('loads saved features when drawing starts, ready to edit, without undo history', async () => {
		const { root, draw, changes } = await mountDraw({ features: SAVED });
		await expect.poll(() => drawn(draw())).toEqual(byId(SAVED));
		expect(changes).toEqual([]);
		expect(button(root, 'Undo').disabled).toBe(true);
	});

	test('a different list replaces what is drawn', async () => {
		const { screen, draw, changes } = await mountDraw({ features: SAVED });
		await expect.poll(() => drawn(draw())).toHaveLength(3);

		await screen.rerender({ features: [SAVED[1]] });
		await expect.poll(() => drawn(draw())).toEqual([SAVED[1]]);
		expect(changes).toEqual([]);
	});

	test('passing back the reported list keeps the drawing and its history', async () => {
		const { screen, map, root, draw, latest } = await mountDraw();
		await drawPolygon(map, root);
		await expect.poll(() => latest()).toHaveLength(1);
		const undo = button(root, 'Undo');
		expect(undo.disabled).toBe(false);

		await screen.rerender({ features: latest() });
		expect(drawn(draw())).toEqual(byId(latest()));
		expect(undo.disabled).toBe(false);
	});

	test('a feature that cannot be drawn is reported and the rest still load', async () => {
		const onerror = vi.fn();
		const broken: DrawFeature = {
			type: 'Feature',
			id: 'broken',
			geometry: { type: 'Point', coordinates: [0, 0] },
			properties: { mode: 'polygon' }
		};
		const { draw, latest } = await mountDraw({ features: [SAVED[1], broken], onerror });
		await expect.poll(() => onerror.mock.calls.length).toBe(1);
		expect(String(onerror.mock.calls[0][0])).toContain('"broken"');
		await expect.poll(() => drawn(draw())).toEqual([SAVED[1]]);
		expect(latest()).toEqual([SAVED[1]]);
	});

	test('the mode prop drives the live instance, and buttons write it back', async () => {
		const { screen, root, draw } = await mountDraw();
		expect(draw()?.getMode()).toBe('static');

		await screen.rerender({ mode: 'circle' });
		await expect.poll(() => draw()?.getMode()).toBe('circle');
		expect(button(root, 'Draw circle').getAttribute('aria-pressed')).toBe('true');

		await userEvent.click(button(root, 'Draw line'));
		await expect.poll(() => draw()?.getMode()).toBe('linestring');
		expect(screen.container.querySelector('[data-testid="mode"]')?.textContent).toBe('polyline');

		await userEvent.click(button(root, 'Draw line'));
		await expect.poll(() => draw()?.getMode()).toBe('static');
	});

	test('drawings survive a theme toggle and a basemap swap, and follow theme colours', async () => {
		const errors: unknown[] = [];
		const onError = (event: ErrorEvent) => errors.push(event.error);
		window.addEventListener('error', onError);
		try {
			const { screen, ctx, map, root, latest } = await mountDraw();
			await drawPolygon(map, root);
			await expect.poll(() => renderedPolygons(map).length).toBeGreaterThan(0);
			const lightFill = renderedPolygons(map)[0].properties.polygonFillColor;

			const before = ctx.styleVersion;
			document.documentElement.classList.add('dark');
			await expect.poll(() => ctx.styleVersion).toBe(before + 1);
			await expect
				.poll(() => renderedPolygons(map)[0]?.properties.polygonFillColor)
				.not.toBe(lightFill);

			await screen.rerender({
				mapStyle: {
					version: 8,
					sources: {},
					layers: [{ id: 'swap', type: 'background', paint: { 'background-color': '#336699' } }]
				}
			});
			await expect.poll(() => ctx.styleVersion).toBe(before + 2);
			expect(drawLayers(map).length).toBeGreaterThan(0);
			await expect.poll(() => renderedPolygons(map).length).toBeGreaterThan(0);

			await userEvent.click(button(root, 'Draw point'));
			await pointer(map).click([60, 240]);
			await expect.poll(() => latest()).toHaveLength(2);
			expect(errors).toEqual([]);
		} finally {
			window.removeEventListener('error', onError);
		}
	});

	test('unmount removes sources, layers and listeners', async () => {
		const { screen, map, root, draw } = await mountDraw({ mode: 'polygon' });
		await drawPolygon(map, root);
		await expect.poll(() => drawLayers(map).length).toBeGreaterThan(0);
		const instance = draw() as TerraDraw;

		await screen.rerender({ showDraw: false });
		await expect.poll(() => draw()).toBeNull();
		expect(instance.enabled).toBe(false);
		expect(drawLayers(map)).toEqual([]);
		expect(drawSources(map)).toEqual([]);
		expect(map.dragPan.isEnabled()).toBe(true);
		expect(map.doubleClickZoom.isEnabled()).toBe(true);
	});

	test('removing the whole map stops drawing before the map goes', async () => {
		const errors: unknown[] = [];
		const onError = (event: ErrorEvent) => errors.push(event.error);
		window.addEventListener('error', onError);
		try {
			const { screen, map, root, draw } = await mountDraw({ mode: 'polygon' });
			await drawPolygon(map, root);
			await expect.poll(() => drawLayers(map).length).toBeGreaterThan(0);
			const instance = draw() as TerraDraw;

			screen.unmount();
			expect(instance.enabled).toBe(false);
			// Give a queued terra-draw render frame the chance to run against the removed map.
			await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
			expect(errors).toEqual([]);
		} finally {
			window.removeEventListener('error', onError);
		}
	});

	test('unmounting during a style load stops carrying the layers once the map goes', async () => {
		const { screen, ctx, map, root } = await mountDraw({ mode: 'polygon' });
		await drawPolygon(map, root);
		await expect.poll(() => drawSources(map).length).toBeGreaterThan(0);
		const previous = map.getStyle();
		const next = { version: 8 as const, sources: {}, layers: [] };
		expect(Object.keys(ctx.layers.transformStyle(previous, next).sources)).not.toEqual([]);

		// The control waits for a style that has its layers before it stops terra-draw.
		ctx.layers.styleLoading();
		await screen.rerender({ showDraw: false });
		expect(Object.keys(ctx.layers.transformStyle(previous, next).sources)).not.toEqual([]);

		screen.unmount();
		expect(ctx.layers.transformStyle(previous, next).sources).toEqual({});
	});
});

describe('MapContext.beforeRemove', () => {
	test('a failing callback does not stop the others', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const ctx = new MapContext();
		const later = vi.fn();
		const cancelled = vi.fn();
		ctx.beforeRemove(() => {
			throw new Error('boom');
		});
		ctx.beforeRemove(later);
		ctx.beforeRemove(cancelled)();

		ctx.runBeforeRemove();
		expect(later).toHaveBeenCalledOnce();
		expect(cancelled).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledWith(new Error('boom'));

		ctx.runBeforeRemove();
		expect(later).toHaveBeenCalledOnce();
	});
});
