import { flushSync } from 'svelte';
import { describe, expect, test } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from '#lib/registry/ui/map/map-context.svelte.js';
import { mapValue } from '#lib/registry/ui/map/map-value.svelte.js';

/** Just enough of a map to count listeners and fire events by hand. */
function fakeMap() {
	const listeners = new Map<string, Set<() => void>>();
	const map = {
		zoom: 3,
		getZoom() {
			return this.zoom;
		},
		on(event: string, listener: () => void) {
			const set = listeners.get(event) ?? new Set();
			set.add(listener);
			listeners.set(event, set);
			return { unsubscribe: () => set.delete(listener) };
		}
	};
	const count = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
	const fire = (event: string) => {
		for (const listener of listeners.get(event) ?? []) listener();
	};
	return { map, count, fire };
}

function contextWith(map: unknown): MapContext {
	return { map: map as MapLibreMap } as MapContext;
}

describe('mapValue', () => {
	test('adds no map listeners until something reads it reactively', () => {
		const { map, count } = fakeMap();
		const stop = $effect.root(() => {
			mapValue(contextWith(map), ['zoom'], (m) => m.getZoom(), 0);
		});
		flushSync();
		expect(count()).toBe(0);
		stop();
	});

	test('reads the map directly outside a reactive context', () => {
		const { map } = fakeMap();
		let zoom: { readonly current: number } | undefined;
		const stop = $effect.root(() => {
			zoom = mapValue(contextWith(map), ['zoom'], (m) => m.getZoom(), 0);
		});
		flushSync();
		map.zoom = 7;
		expect(zoom?.current).toBe(7);
		stop();
	});

	test('follows map events while read and drops its listeners afterwards', async () => {
		const { map, count, fire } = fakeMap();
		const seen: number[] = [];
		const stop = $effect.root(() => {
			const zoom = mapValue(contextWith(map), ['zoom'], (m) => m.getZoom(), 0);
			$effect(() => {
				seen.push(zoom.current);
			});
		});
		flushSync();
		expect(count()).toBe(1);

		map.zoom = 5;
		fire('zoom');
		flushSync();
		expect(seen).toEqual([3, 5]);

		stop();
		await Promise.resolve();
		expect(count()).toBe(0);
	});

	test('gives the fallback while there is no map', () => {
		let zoom: { readonly current: number } | undefined;
		const stop = $effect.root(() => {
			zoom = mapValue(contextWith(null), ['zoom'], (m) => m.getZoom(), -1);
		});
		expect(zoom?.current).toBe(-1);
		stop();
	});
});
