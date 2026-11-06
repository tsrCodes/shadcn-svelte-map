import { describe, expect, test } from 'vitest';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { LayerRegistry, type RegistryMap } from '#lib/registry/ui/map/layer-registry.js';
import { POINTS_ENTRY, POINTS_LAYER, POINTS_SOURCE } from './fixtures.js';

/** In-memory stand-in for the parts of a MapLibre map the registry uses. */
function createFakeMap(layerIds: string[] = ['background'], glyphs: string | null = null) {
	const sources = new Set<string>();
	let layers = [...layerIds];
	const layerSources = new Map<string, string>();
	const states = new Map<string, Record<string, unknown>>();
	const data = new Map<string, unknown>();
	const paint = new Map<string, Record<string, unknown>>();
	const key = (source: string, id: unknown) => `${source}/${String(id)}`;

	const map = {
		getGlyphs: () => glyphs,
		getSource: (id: string) =>
			sources.has(id) ? { setData: (value: unknown) => data.set(id, value) } : undefined,
		addSource: (id: string) => sources.add(id),
		removeSource: (id: string) => {
			if (
				[...layerSources.entries()].some(
					([layer, source]) => source === id && layers.includes(layer)
				)
			) {
				throw new Error(`Source "${id}" is in use.`);
			}
			sources.delete(id);
		},
		getLayer: (id: string) => (layers.includes(id) ? { source: layerSources.get(id) } : undefined),
		getLayersOrder: () => [...layers],
		addLayer: (layer: LayerSpecification, before?: string) => {
			const index = before ? layers.indexOf(before) : -1;
			layers = index < 0 ? [...layers, layer.id] : layers.toSpliced(index, 0, layer.id);
			if ('source' in layer && typeof layer.source === 'string') {
				layerSources.set(layer.id, layer.source);
			}
		},
		removeLayer: (id: string) => (layers = layers.filter((item) => item !== id)),
		setFeatureState: (target: { source: string; id: unknown }, state: Record<string, unknown>) =>
			states.set(key(target.source, target.id), {
				...states.get(key(target.source, target.id)),
				...state
			}),
		removeFeatureState: (target: { source: string; id?: unknown }) =>
			states.delete(key(target.source, target.id)),
		setPaintProperty: (layer: string, name: string, value: unknown) =>
			paint.set(layer, { ...paint.get(layer), [name]: value })
	};

	return {
		map: map as unknown as RegistryMap,
		layers: () => layers,
		sources: () => [...sources],
		state: (source: string, id: unknown) => states.get(key(source, id)),
		data: (source: string) => data.get(source),
		paint: (layer: string) => paint.get(layer),
		/** A full style rebuild: everything user-added is gone. */
		rebuild: (ids: string[], nextGlyphs: string | null = glyphs) => {
			sources.clear();
			states.clear();
			layers = [...ids];
			glyphs = nextGlyphs;
		}
	};
}

const LABELS: LayerSpecification = { id: 'labels', type: 'background' };

const GLYPHS = 'https://example.test/fonts/{fontstack}/{range}.pbf';
const COUNT_LAYER = 'test-points-count';
const ICON_LAYER = 'test-points-icon';

/** Points with a text label layer and an icon-only symbol layer. */
const LABELLED_ENTRY = {
	...POINTS_ENTRY,
	layers: [
		...POINTS_ENTRY.layers,
		{
			id: COUNT_LAYER,
			type: 'symbol',
			source: POINTS_SOURCE,
			layout: { 'text-field': ['get', 'id'] }
		},
		{ id: ICON_LAYER, type: 'symbol', source: POINTS_SOURCE, layout: { 'icon-image': 'dot' } }
	]
} satisfies typeof POINTS_ENTRY;

describe('LayerRegistry', () => {
	test('waits for the style before adding, then adds in order', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.add(POINTS_ENTRY);
		expect(fake.sources()).toEqual([]);

		registry.styleLoaded();
		expect(fake.sources()).toEqual([POINTS_SOURCE]);
		expect(fake.layers()).toEqual(['background', POINTS_LAYER]);
	});

	test('inserts below beforeId and falls back to the top when it is missing', () => {
		const fake = createFakeMap(['background', 'labels']);
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		registry.add({ ...POINTS_ENTRY, beforeId: 'labels' });
		expect(fake.layers()).toEqual(['background', POINTS_LAYER, 'labels']);

		fake.rebuild(['background']);
		registry.styleLoaded();
		expect(fake.layers()).toEqual(['background', POINTS_LAYER]);
	});

	test('replays saved feature-state after a style rebuild', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		registry.add(POINTS_ENTRY);
		registry.setFeatureState({ source: POINTS_SOURCE, id: 1 }, { hover: true });
		registry.setFeatureState({ source: POINTS_SOURCE, id: 1 }, { selected: true });

		fake.rebuild(['background']);
		expect(fake.state(POINTS_SOURCE, 1)).toBeUndefined();
		registry.styleLoaded();
		expect(fake.state(POINTS_SOURCE, 1)).toEqual({ hover: true, selected: true });
	});

	test('forgets removed feature-state keys', () => {
		const registry = new LayerRegistry();
		const target = { source: POINTS_SOURCE, id: 2 };
		registry.setFeatureState(target, { hover: true, selected: true });
		registry.removeFeatureState(target, 'hover');
		expect(registry.getFeatureState(target)).toEqual({ selected: true });
		registry.removeFeatureState(target);
		expect(registry.getFeatureState(target)).toEqual({});
	});

	test('a feature whose last key was removed is not replayed', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		registry.add(POINTS_ENTRY);
		const target = { source: POINTS_SOURCE, id: 1 };
		registry.setFeatureState(target, { hover: true });
		registry.removeFeatureState(target, 'hover');

		fake.rebuild(['background']);
		registry.styleLoaded();
		expect(fake.state(POINTS_SOURCE, 1)).toBeUndefined();
	});

	test('removing an entry removes its layers, source and state', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		const remove = registry.add(POINTS_ENTRY);
		registry.setFeatureState({ source: POINTS_SOURCE, id: 1 }, { hover: true });

		remove();
		expect(fake.layers()).toEqual(['background']);
		expect(fake.sources()).toEqual([]);
		expect(registry.getFeatureState({ source: POINTS_SOURCE, id: 1 })).toEqual({});
	});

	test('keeps the source when a layer outside the registry still uses it', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		const remove = registry.add(POINTS_ENTRY);
		fake.map.addLayer({ id: 'extra', type: 'circle', source: POINTS_SOURCE });

		expect(() => remove()).not.toThrow();
		expect(fake.layers()).toEqual(['background', 'extra']);
		expect(fake.sources()).toEqual([POINTS_SOURCE]);
	});

	test('removal during a style load is finished when the style is ready', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		const remove = registry.add(POINTS_ENTRY);

		registry.styleLoading();
		remove();
		expect(fake.layers()).toContain(POINTS_LAYER);
		registry.styleLoaded();
		expect(fake.layers()).toEqual(['background']);
	});

	test('rejects a second entry with the same source id', () => {
		const registry = new LayerRegistry();
		registry.add(POINTS_ENTRY);
		expect(() => registry.add(POINTS_ENTRY)).toThrow(/already registered/);
	});

	test('transformStyle carries entries into the next style, keeping live data', () => {
		const registry = new LayerRegistry();
		registry.add({ ...POINTS_ENTRY, beforeId: 'labels' });
		const liveData = { type: 'FeatureCollection' as const, features: [] };
		const previous: StyleSpecification = {
			version: 8,
			sources: { [POINTS_SOURCE]: { type: 'geojson', data: liveData } },
			layers: [{ ...POINTS_ENTRY.layers[0], paint: { 'circle-radius': 3 } } as LayerSpecification]
		};
		const next: StyleSpecification = { version: 8, sources: {}, layers: [LABELS] };

		const result = registry.transformStyle(previous, next);
		expect(result.sources[POINTS_SOURCE]).toEqual({ type: 'geojson', data: liveData });
		expect(result.layers.map((layer) => layer.id)).toEqual([POINTS_LAYER, 'labels']);
		expect(result.layers[0]).toMatchObject({ paint: { 'circle-radius': 3 } });
		expect(next.layers).toEqual([LABELS]);
	});

	test('setData sends data to the map, or holds it until the style is ready', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.add(POINTS_ENTRY);
		registry.styleLoaded();
		const one = { type: 'FeatureCollection' as const, features: [] };
		registry.setData(POINTS_SOURCE, one);
		expect(fake.data(POINTS_SOURCE)).toBe(one);

		const two = { type: 'FeatureCollection' as const, features: [] };
		registry.styleLoading();
		registry.setData(POINTS_SOURCE, two);
		expect(fake.data(POINTS_SOURCE)).toBe(one);
		registry.styleLoaded();
		expect(fake.data(POINTS_SOURCE)).toBe(two);
	});

	test('setData keeps data pending while the source is missing from the map', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.add(POINTS_ENTRY);
		registry.styleLoaded();
		fake.rebuild(['background']);

		const fresh = { type: 'FeatureCollection' as const, features: [] };
		registry.setData(POINTS_SOURCE, fresh);
		expect(fake.data(POINTS_SOURCE)).toBeUndefined();

		// Still pending, so the next style takes the new data over the old style's copy.
		const stale = { type: 'FeatureCollection' as const, features: [] };
		const previous: StyleSpecification = {
			version: 8,
			sources: { [POINTS_SOURCE]: { type: 'geojson', data: stale } },
			layers: POINTS_ENTRY.layers
		};
		const next = registry.transformStyle(previous, { version: 8, sources: {}, layers: [] });
		expect((next.sources[POINTS_SOURCE] as { data: unknown }).data).toBe(fresh);
	});

	test('setData rejects sources that are not GeoJSON and ignores unknown ones', () => {
		const registry = new LayerRegistry();
		registry.add({ sourceId: 'tiles', source: { type: 'raster', tiles: [] }, layers: [] });
		const empty = { type: 'FeatureCollection' as const, features: [] };
		expect(() => registry.setData('tiles', empty)).toThrow(/not a GeoJSON source/);
		expect(() => registry.setData('missing', empty)).not.toThrow();
	});

	test('setPaintProperty survives a rebuild and wins over the old style copy', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.add(POINTS_ENTRY);
		registry.styleLoaded();
		registry.setPaintProperty(POINTS_SOURCE, POINTS_LAYER, 'circle-color', 'red');
		expect(fake.paint(POINTS_LAYER)).toEqual({ 'circle-color': 'red' });

		// Set while the next style loads: the carried layer and the replay both use it.
		registry.styleLoading();
		registry.setPaintProperty(POINTS_SOURCE, POINTS_LAYER, 'circle-color', 'blue');
		const previous: StyleSpecification = {
			version: 8,
			sources: { [POINTS_SOURCE]: POINTS_ENTRY.source },
			layers: [
				{ ...POINTS_ENTRY.layers[0], paint: { 'circle-color': 'red' } } as LayerSpecification
			]
		};
		const next = registry.transformStyle(previous, { version: 8, sources: {}, layers: [] });
		expect(next.layers[0]).toMatchObject({ paint: { 'circle-color': 'blue' } });

		fake.rebuild(['background']);
		registry.styleLoaded();
		expect(fake.paint(POINTS_LAYER)).toEqual({ 'circle-color': 'blue' });
	});

	test('leaves text layers out while the style has no glyphs, and adds them when it does', () => {
		const fake = createFakeMap(['background'], null);
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.styleLoaded();
		registry.add(LABELLED_ENTRY);
		expect(fake.layers()).toEqual(['background', POINTS_LAYER, ICON_LAYER]);

		fake.rebuild(['background'], GLYPHS);
		registry.styleLoaded();
		expect(fake.layers()).toEqual(['background', POINTS_LAYER, COUNT_LAYER, ICON_LAYER]);
	});

	test('transformStyle drops text layers for a style without glyphs, and restores them', () => {
		const registry = new LayerRegistry();
		registry.add(LABELLED_ENTRY);
		const withGlyphs: StyleSpecification = { version: 8, glyphs: GLYPHS, sources: {}, layers: [] };
		const blank: StyleSpecification = { version: 8, sources: {}, layers: [] };

		const toBlank = registry.transformStyle(registry.transformStyle(undefined, withGlyphs), blank);
		expect(toBlank.layers.map((layer) => layer.id)).toEqual([POINTS_LAYER, ICON_LAYER]);

		const back = registry.transformStyle(toBlank, withGlyphs);
		expect(back.layers.map((layer) => layer.id)).toEqual([POINTS_LAYER, COUNT_LAYER, ICON_LAYER]);
	});

	test('setPaintProperty ignores layers the entry does not own', () => {
		const fake = createFakeMap();
		const registry = new LayerRegistry();
		registry.attach(fake.map);
		registry.add(POINTS_ENTRY);
		registry.styleLoaded();
		registry.setPaintProperty(POINTS_SOURCE, 'background', 'circle-color', 'red');
		expect(fake.paint('background')).toBeUndefined();
	});
});
