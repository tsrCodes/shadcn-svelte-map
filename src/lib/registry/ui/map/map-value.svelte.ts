import type { MapEventType, Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from './map-context.svelte.js';

export interface MapValue<T> {
	readonly current: T;
}

/**
 * A value read from the map, kept fresh by the given map events. Call it while a
 * component initialises; the listeners go away with the component or the map.
 */
export function mapValue<T>(
	ctx: MapContext,
	events: (keyof MapEventType)[],
	read: (map: MapLibreMap) => T,
	fallback: T
): MapValue<T> {
	let value = $state.raw(fallback);

	$effect(() => {
		const map = ctx.map;
		if (!map) return;
		const update = () => (value = read(map));
		update();
		const subscriptions = events.map((event) => map.on(event, update));
		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	return {
		get current() {
			return value;
		}
	};
}
