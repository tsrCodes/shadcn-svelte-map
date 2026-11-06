import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from '#lib/registry/ui/map/index.js';
import DataHarness from './DataHarness.svelte';
import { DARK_STYLE, LIGHT_STYLE } from './fixtures.js';

type HarnessProps = NonNullable<Parameters<typeof render<typeof DataHarness>>[1]>;

const SQUARE: FeatureCollection = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { name: 'Square' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[-10, -10],
						[10, -10],
						[10, 10],
						[-10, 10],
						[-10, -10]
					]
				]
			}
		},
		{
			type: 'Feature',
			properties: { name: 'Dot' },
			geometry: { type: 'Point', coordinates: [40, -20] }
		}
	]
};

function place(name: string, coordinates: [number, number]): Feature<Point, { name: string }> {
	return { type: 'Feature', properties: { name }, geometry: { type: 'Point', coordinates } };
}

/** Three points close together, which cluster at zoom 2, and one far away. */
const CLUSTERED: FeatureCollection<Point, { name: string }> = {
	type: 'FeatureCollection',
	features: [
		place('A', [0, 0]),
		place('B', [0.5, 0.5]),
		place('C', [-0.5, 0.3]),
		place('Lone', [25, -20])
	]
};

const ROUTE: [number, number][] = [
	[-40, 0],
	[0, 10],
	[40, 0]
];

const ARCS: { name: string; from: [number, number]; to: [number, number] }[] = [
	{ name: 'West', from: [-40, -10], to: [-10, -10] },
	{ name: 'East', from: [10, -30], to: [40, -30] }
];

async function mountData(props: Partial<HarnessProps> = {}) {
	let context: MapContext | null = null;
	const screen = render(DataHarness, {
		...props,
		oncontext: (value: MapContext) => (context = value)
	});
	await expect
		.poll(() => screen.container.querySelector('[data-slot="map"]')?.getAttribute('data-status'), {
			timeout: 15_000
		})
		.toBe('ready');
	const ctx = context as unknown as MapContext;
	return { screen, ctx, map: ctx.map as MapLibreMap };
}

async function layerReady(map: MapLibreMap, layerId: string) {
	await expect.poll(() => Boolean(map.getLayer(layerId))).toBe(true);
}

async function sourceData(map: MapLibreMap, sourceId: string): Promise<FeatureCollection> {
	const source = map.getSource<GeoJSONSource>(sourceId);
	if (!source) throw new Error(`Source "${sourceId}" is missing.`);
	return (await source.getData()) as FeatureCollection;
}

/** Wait until the layer has drawn something at the position, then click there. */
async function clickAt(map: MapLibreMap, layerId: string, lngLat: [number, number]) {
	const point = map.project(lngLat);
	// Rendered features can sit outside the canvas, where a click never reaches the map.
	const { clientWidth, clientHeight } = map.getCanvas();
	expect(point.x).toBeGreaterThan(0);
	expect(point.x).toBeLessThan(clientWidth);
	expect(point.y).toBeGreaterThan(0);
	expect(point.y).toBeLessThan(clientHeight);
	await expect
		.poll(() => map.queryRenderedFeatures(point, { layers: [layerId] }).length)
		.toBeGreaterThan(0);
	await userEvent.click(map.getCanvas(), { position: { x: point.x, y: point.y } });
}

function toggleDark(ctx: MapContext) {
	const before = ctx.styleVersion;
	document.documentElement.classList.add('dark');
	return expect.poll(() => ctx.styleVersion).toBe(before + 1);
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	vi.restoreAllMocks();
});

describe('MapGeoJSON', () => {
	test('hover sets feature-state through the registry and clears on new data', async () => {
		const onhover = vi.fn();
		const onclick = vi.fn();
		const { ctx, map, screen } = await mountData({
			geojson: SQUARE,
			ongeojsonhover: onhover,
			ongeojsonclick: onclick
		});
		await layerReady(map, 'h-geo-fill');
		const point = map.project([0, 0]);
		await expect
			.poll(() => map.queryRenderedFeatures(point, { layers: ['h-geo-fill'] }).length)
			.toBeGreaterThan(0);

		await userEvent.hover(map.getCanvas(), { position: { x: point.x, y: point.y } });
		await expect.poll(() => map.getFeatureState({ source: 'h-geo', id: 0 }).hover).toBe(true);
		expect(ctx.layers.getFeatureState({ source: 'h-geo', id: 0 })).toEqual({ hover: true });
		expect(onhover.mock.lastCall?.[0]?.properties.name).toBe('Square');

		await userEvent.click(map.getCanvas(), { position: { x: point.x, y: point.y } });
		await expect.poll(() => onclick.mock.lastCall?.[0]?.properties.name).toBe('Square');

		await screen.rerender({ geojson: { ...SQUARE, features: [...SQUARE.features] } });
		await expect.poll(() => ctx.layers.getFeatureState({ source: 'h-geo', id: 0 })).toEqual({});
		expect(onhover.mock.lastCall?.[0]).toBeNull();
	});

	test('hover state and colours survive a theme swap of the basemap', async () => {
		const { ctx, map } = await mountData({
			geojson: SQUARE,
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE }
		});
		await layerReady(map, 'h-geo-fill');
		ctx.layers.setFeatureState({ source: 'h-geo', id: 0 }, { hover: true });
		const light = map.getPaintProperty('h-geo-fill', 'fill-color');

		await toggleDark(ctx);
		await layerReady(map, 'h-geo-fill');
		expect(map.getFeatureState({ source: 'h-geo', id: 0 }).hover).toBe(true);
		await expect.poll(() => map.getPaintProperty('h-geo-fill', 'fill-color')).not.toBe(light);
		expect(map.getPaintProperty('h-geo-fill', 'fill-color')).toBe(ctx.colors?.primary);
	});
});

describe('shapes', () => {
	test('circle, polygon, polyline and rectangle draw and update in place', async () => {
		const { map, screen } = await mountData({ shapes: true });
		for (const layer of [
			'h-circle-fill',
			'h-circle-line',
			'h-polygon-fill',
			'h-polyline-line',
			'h-rect-fill'
		]) {
			await layerReady(map, layer);
		}
		expect(map.getLayer('h-polyline-fill')).toBeUndefined();
		expect(map.getPaintProperty('h-polyline-line', 'line-dasharray')).toEqual([2, 2]);
		const polygon = (await sourceData(map, 'h-polygon')) as unknown as Feature;
		expect(polygon.geometry).toMatchObject({
			coordinates: [
				[
					[-20, 20],
					[-10, 20],
					[-15, 30],
					[-20, 20]
				]
			]
		});

		const source = map.getSource('h-circle');
		const top = async () => {
			const { geometry } = (await sourceData(map, 'h-circle')) as unknown as Feature;
			const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : [];
			return Math.max(...ring.map(([, lat]) => lat));
		};
		const smallTop = await top();

		await screen.rerender({ shapes: true, circleRadius: 600_000, shapeColor: 'rgb(255, 0, 0)' });
		await expect
			.poll(() => map.getPaintProperty('h-circle-line', 'line-color'))
			.toBe('rgb(255, 0, 0)');
		expect(map.getPaintProperty('h-circle-fill', 'fill-color')).toBe('rgb(255, 0, 0)');
		await expect.poll(top).toBeGreaterThan(smallTop + 3);
		expect(map.getSource('h-circle')).toBe(source);
	});
});

describe('MapRoute', () => {
	test('progress splits the route and moves the head without rebuilding', async () => {
		const { map, screen } = await mountData({ route: ROUTE, routeProgress: 0.25 });
		await layerReady(map, 'h-route-done');
		const source = map.getSource('h-route');
		const parts = async () =>
			(await sourceData(map, 'h-route')).features.map((feature) => feature.properties?.part);
		expect(await parts()).toEqual(['rest', 'done', 'start', 'end', 'head']);

		await screen.rerender({ route: ROUTE, routeProgress: 1 });
		await expect.poll(parts).toEqual(['done', 'start', 'end']);
		expect(map.getSource('h-route')).toBe(source);
		for (const layer of ['h-route-casing', 'h-route-rest', 'h-route-done', 'h-route-stops']) {
			expect(map.getLayer(layer)).toBeDefined();
		}
	});
});

describe('MapArc', () => {
	test('a click returns the arc item it came from', async () => {
		const onarcclick = vi.fn();
		const { map } = await mountData({ arcs: ARCS, onarcclick });
		await layerReady(map, 'h-arc-line');
		const data = await sourceData(map, 'h-arc');
		expect(data.features).toHaveLength(2);

		const east = data.features[1].geometry;
		if (east.type !== 'LineString') throw new Error('Arc is not a line.');
		const middle = east.coordinates[Math.floor(east.coordinates.length / 2)] as [number, number];
		await clickAt(map, 'h-arc-line', middle);
		await expect.poll(() => onarcclick.mock.lastCall).toEqual(['East', 1]);
	});
});

describe('MapClusterLayer', () => {
	test('cluster counts render on blank style', async () => {
		const { map } = await mountData({ clusters: CLUSTERED });
		await layerReady(map, 'h-clusters-clusters');
		// The test style has no glyphs, so the count layer stays out and HTML draws the count.
		expect(map.getGlyphs()).toBeNull();
		expect(map.getLayer('h-clusters-count')).toBeUndefined();
		const labels = () => map.getContainer().querySelectorAll('[data-slot="map-cluster-label"]');
		await expect.poll(() => labels()[0]?.textContent).toBe('3');
		expect(labels()).toHaveLength(1);
		expect(labels()[0].getAttribute('aria-hidden')).toBe('true');
	});

	test('a single point click returns the original feature; a cluster click zooms in', async () => {
		const onpointclick = vi.fn();
		const onclusterclick = vi.fn();
		const { map } = await mountData({ clusters: CLUSTERED, onpointclick, onclusterclick });
		await layerReady(map, 'h-clusters-points');

		await clickAt(map, 'h-clusters-points', [25, -20]);
		await expect.poll(() => onpointclick.mock.lastCall).toEqual(['Lone', 3]);

		const zoom = map.getZoom();
		const cluster = map.queryRenderedFeatures({ layers: ['h-clusters-clusters'] })[0];
		const [lng, lat] = (cluster.geometry as Point).coordinates;
		await clickAt(map, 'h-clusters-clusters', [lng, lat]);
		await expect.poll(() => onclusterclick.mock.lastCall?.[0]?.count).toBe(3);
		await expect.poll(() => map.getZoom(), { timeout: 5_000 }).toBeGreaterThan(zoom);
	});
});

describe('MapHeatmap', () => {
	test('draws a heatmap whose ramp starts see-through', async () => {
		const { ctx, map } = await mountData({ heat: CLUSTERED });
		await layerReady(map, 'h-heat-heat');
		const ramp = map.getPaintProperty('h-heat-heat', 'heatmap-color') as unknown[];
		expect(ramp.slice(0, 4)).toEqual(['interpolate', ['linear'], ['heatmap-density'], 0]);
		expect(ramp[4]).toMatch(/, 0\)$/);
		expect(ramp.at(-1)).toBe(ctx.colors?.chart5);
	});
});

describe('quality rules', () => {
	test('route and cluster mount when crypto.randomUUID is undefined', async () => {
		const original = Object.getOwnPropertyDescriptor(Crypto.prototype, 'randomUUID');
		Object.defineProperty(Crypto.prototype, 'randomUUID', {
			value: undefined,
			configurable: true
		});
		try {
			expect(crypto.randomUUID).toBeUndefined();
			const { map } = await mountData({ route: ROUTE, clusters: CLUSTERED });
			await layerReady(map, 'h-route-done');
			await layerReady(map, 'h-clusters-clusters');
		} finally {
			if (original) Object.defineProperty(Crypto.prototype, 'randomUUID', original);
		}
		expect(typeof crypto.randomUUID).toBe('function');
	});

	test('cluster/route/arc colours change with theme', async () => {
		const { ctx, map } = await mountData({
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE },
			route: ROUTE,
			arcs: ARCS,
			clusters: CLUSTERED
		});
		const layers: [string, 'line-color' | 'circle-color'][] = [
			['h-route-done', 'line-color'],
			['h-arc-line', 'line-color'],
			['h-clusters-clusters', 'circle-color']
		];
		for (const [layer] of layers) await layerReady(map, layer);
		const light = ctx.colors?.primary;
		for (const [layer, name] of layers) expect(map.getPaintProperty(layer, name)).toBe(light);

		await toggleDark(ctx);
		expect(ctx.colors?.primary).not.toBe(light);
		for (const [layer, name] of layers) {
			await expect.poll(() => map.getPaintProperty(layer, name)).toBe(ctx.colors?.primary);
		}
		const label = () => map.getContainer().querySelector<HTMLElement>('.map-cluster-label');
		await expect.poll(() => label()?.dataset.color).toBe(ctx.colors?.primaryForeground);
	});

	test('unmount removes sources, layers and listeners', async () => {
		const { map, screen } = await mountData({
			geojson: SQUARE,
			shapes: true,
			route: ROUTE,
			arcs: ARCS,
			clusters: CLUSTERED,
			heat: CLUSTERED,
			ongeojsonclick: () => {},
			onarcclick: () => {}
		});
		await layerReady(map, 'h-heat-heat');
		await expect.poll(() => map.getContainer().querySelector('.map-cluster-label')).not.toBeNull();
		expect(map.listens('click')).toBe(true);

		await screen.rerender({
			geojson: undefined,
			shapes: false,
			route: undefined,
			arcs: undefined,
			clusters: undefined,
			heat: undefined
		});

		await expect.poll(() => map.getLayersOrder().filter((id) => id.startsWith('h-'))).toEqual([]);
		expect(Object.keys(map.getStyle().sources).filter((id) => id.startsWith('h-'))).toEqual([]);
		expect(map.getContainer().querySelector('.map-cluster-label')).toBeNull();
		for (const type of ['click', 'mousemove', 'mouseout', 'render'] as const) {
			expect(map.listens(type), type).toBe(false);
		}
	});
});
