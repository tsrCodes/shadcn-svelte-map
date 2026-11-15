import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from '#lib/registry/ui/map/index.js';
import MapHarness from './MapHarness.svelte';
import ControlledHarness from './ControlledHarness.svelte';
import { DARK_STYLE, LIGHT_STYLE, POINTS_LAYER, POINTS_SOURCE } from './fixtures.js';

type HarnessProps = Parameters<typeof render<typeof MapHarness>>[1];

function statusOf(container: HTMLElement): string | undefined {
	return container.querySelector<HTMLElement>('[data-slot="map"]')?.dataset.status;
}

async function mountMap(props: HarnessProps = {}) {
	let context: MapContext | null = null;
	const screen = render(MapHarness, {
		...props,
		oncontext: (value: MapContext) => (context = value)
	});
	await expect.poll(() => statusOf(screen.container), { timeout: 15_000 }).toBe('ready');
	const ctx = context as unknown as MapContext;
	return { screen, ctx, map: ctx.map as MapLibreMap };
}

function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	vi.restoreAllMocks();
});

describe('Map', () => {
	test('projection: globe at mount, kept through a theme swap, and switchable live', async () => {
		const { screen, map } = await mountMap({
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE },
			projection: 'globe'
		});
		await expect.poll(() => map.getProjection()?.type).toBe('globe');

		document.documentElement.classList.add('dark');
		await expect
			.poll(() => map.getStyle().layers.some((layer) => layer.id === 'overlay'))
			.toBe(true);
		await expect.poll(() => map.getProjection()?.type).toBe('globe');

		await screen.rerender({
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE },
			projection: 'mercator'
		});
		await expect.poll(() => map.getProjection()?.type).toBe('mercator');
	});

	test('projection: left out, the style keeps its own', async () => {
		const { map } = await mountMap({
			mapStyle: { ...LIGHT_STYLE, projection: { type: 'globe' } }
		});
		await expect.poll(() => map.getProjection()?.type).toBe('globe');
	});

	test('projection: removed again, the style gets its own back', async () => {
		const { screen, map } = await mountMap({ projection: 'globe' });
		await expect.poll(() => map.getProjection()?.type).toBe('globe');

		await screen.rerender({ projection: undefined });
		await expect.poll(() => map.getProjection()?.type ?? 'mercator').toBe('mercator');

		const globeStyle = { ...LIGHT_STYLE, projection: { type: 'globe' } } as const;
		await screen.rerender({ mapStyle: globeStyle, projection: 'mercator' });
		await expect.poll(() => map.getProjection()?.type).toBe('mercator');
		await screen.rerender({ mapStyle: globeStyle, projection: undefined });
		await expect.poll(() => map.getProjection()?.type).toBe('globe');
	});

	test('a map that fails to construct shows the error state and calls onerror', async () => {
		const onerror = vi.fn();
		// MapLibre throws from its constructor when the zoom range is impossible.
		const screen = render(MapHarness, { options: { minZoom: 10, maxZoom: 5 }, onerror });
		await expect.poll(() => onerror.mock.calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(onerror.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(statusOf(screen.container)).toBe('error');
	});

	test('basemap swap keeps user sources, layers and feature-state', async () => {
		const { ctx, map } = await mountMap({
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE },
			showLayer: true
		});
		await expect.poll(() => Boolean(map.getLayer(POINTS_LAYER))).toBe(true);
		const target = { source: POINTS_SOURCE, id: 1 };
		ctx.layers.setFeatureState(target, { hover: true });

		const expectUserData = () => {
			expect(map.getSource(POINTS_SOURCE)).toBeDefined();
			expect(map.getLayer(POINTS_LAYER)).toBeDefined();
			expect(map.getFeatureState(target)).toEqual({ hover: true });
			expect(map.getStyle().layers.at(-1)?.id).toBe(POINTS_LAYER);
		};

		// Theme change: a diffable swap.
		const before = ctx.styleVersion;
		document.documentElement.classList.add('dark');
		await expect.poll(() => ctx.styleVersion).toBe(before + 1);
		expect(map.getLayer('overlay')).toBeDefined();
		expectUserData();

		// A swap MapLibre cannot diff rebuilds the style and wipes feature-state.
		map.setStyle(LIGHT_STYLE, { diff: false, transformStyle: ctx.layers.transformStyle });
		await expect.poll(() => ctx.styleVersion).toBe(before + 2);
		expect(map.getLayer('overlay')).toBeUndefined();
		expectUserData();
	});

	test('style 404 calls onerror and hides loader', async () => {
		const onerror = vi.fn();
		const screen = render(MapHarness, {
			mapStyle: '/__missing__/style.json',
			onerror
		});
		await expect.poll(() => onerror.mock.calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
		expect(onerror.mock.calls[0][0]).toBeInstanceOf(Error);
		expect(statusOf(screen.container)).toBe('error');
		expect(screen.container.querySelector('[data-slot="map-loader"]')).toBeNull();
	});

	test('context lost then restored', async () => {
		const { screen, map } = await mountMap();
		const overlay = () => screen.container.querySelector('[data-slot="map-context-lost"]');
		const gl = map.getCanvas().getContext('webgl2');
		const extension = gl?.getExtension('WEBGL_lose_context');
		expect(extension).toBeTruthy();

		extension?.loseContext();
		await expect.poll(overlay).not.toBeNull();

		extension?.restoreContext();
		await expect.poll(overlay).toBeNull();
	});

	test('reduced motion makes flyTo and zoom duration 0', async () => {
		const realMatchMedia = window.matchMedia.bind(window);
		vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
			if (!query.includes('prefers-reduced-motion')) return realMatchMedia(query);
			const reduced: Partial<MediaQueryList> = {
				matches: true,
				media: query,
				addEventListener: () => {},
				removeEventListener: () => {}
			};
			return reduced as MediaQueryList;
		});
		const { ctx, map } = await mountMap();
		expect(ctx.reducedMotion).toBe(true);

		ctx.flyTo({ center: [10, 10], zoom: 5 });
		expect(map.isMoving()).toBe(false);
		expect(map.getZoom()).toBeCloseTo(5);
		expect(map.getCenter().lng).toBeCloseTo(10);

		ctx.zoomIn();
		expect(map.isMoving()).toBe(false);
		expect(map.getZoom()).toBeCloseTo(6);
	});

	test('flyTo animates when reduced motion is off', async () => {
		const { ctx, map } = await mountMap();
		expect(ctx.reducedMotion).toBe(false);
		ctx.flyTo({ center: [10, 10], zoom: 5, essential: true });
		await nextFrame();
		expect(map.isMoving()).toBe(true);
	});

	test('rejected viewport change snaps back', async () => {
		let context: MapContext | null = null;
		const screen = render(ControlledHarness, {
			accept: false,
			oncontext: (value: MapContext) => (context = value)
		});
		await expect.poll(() => statusOf(screen.container), { timeout: 15_000 }).toBe('ready');
		const map = (context as unknown as MapContext).map as MapLibreMap;

		map.jumpTo({ center: [40, 20], zoom: 8 });
		expect(map.getZoom()).toBeCloseTo(2);
		expect(map.getCenter().lng).toBeCloseTo(0);
	});

	test('update during move applies', async () => {
		let context: MapContext | null = null;
		const screen = render(ControlledHarness, {
			accept: true,
			oncontext: (value: MapContext) => (context = value)
		});
		await expect.poll(() => statusOf(screen.container), { timeout: 15_000 }).toBe('ready');
		const map = (context as unknown as MapContext).map as MapLibreMap;

		map.jumpTo({ zoom: 4 });
		expect(map.getZoom()).toBeCloseTo(4);

		map.easeTo({ zoom: 10, duration: 2000, essential: true });
		await wait(100);
		expect(map.isMoving()).toBe(true);

		screen.component.setViewport({ center: [30, 30], zoom: 3, bearing: 0, pitch: 0 });
		await expect.poll(() => map.getZoom()).toBeCloseTo(3);
		await wait(300);
		expect(map.getZoom()).toBeCloseTo(3);
		expect(map.getCenter().lng).toBeCloseTo(30);
	});

	test('unmount removes sources, layers and listeners', async () => {
		const onerror = vi.fn();
		const { screen, ctx, map } = await mountMap({ showLayer: true, onerror });
		await expect.poll(() => Boolean(map.getLayer(POINTS_LAYER))).toBe(true);

		await screen.rerender({ showLayer: false, onerror });
		expect(map.getLayer(POINTS_LAYER)).toBeUndefined();
		expect(map.getSource(POINTS_SOURCE)).toBeUndefined();
		expect(ctx.layers.has(POINTS_SOURCE)).toBe(false);

		const version = ctx.styleVersion;
		await screen.unmount();
		expect(ctx.map).toBeNull();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		map.fire('error', { error: new Error('after unmount') });
		map.fire('style.load');
		expect(onerror).not.toHaveBeenCalled();
		expect(ctx.styleVersion).toBe(version);
	});
});
