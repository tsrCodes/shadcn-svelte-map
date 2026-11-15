import { createSubscriber } from 'svelte/reactivity';
import type { MapEventType, Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from './map-context.svelte.js';

export interface MapValue<T> {
	readonly current: T;
}

/**
 * A value read from the map. Reading it inside an effect or the template listens to
 * the given map events for as long as something reads it; any other read asks the
 * map directly.
 */
export function mapValue<T>(
	ctx: MapContext,
	events: (keyof MapEventType)[],
	read: (map: MapLibreMap) => T,
	fallback: T
): MapValue<T> {
	let source: { map: MapLibreMap; subscribe: () => void } | null = null;

	// One subscriber per map instance, so a new map never keeps the old one's listeners.
	function subscriberFor(map: MapLibreMap): () => void {
		if (source?.map !== map) {
			source = {
				map,
				subscribe: createSubscriber((update) => {
					const subscriptions = events.map((event) => map.on(event, update));
					return () => {
						for (const subscription of subscriptions) subscription.unsubscribe();
					};
				})
			};
		}
		return source.subscribe;
	}

	return {
		get current() {
			const map = ctx.map;
			if (!map) return fallback;
			subscriberFor(map)();
			return read(map);
		}
	};
}
