import { untrack } from 'svelte';
import type { Map as MapLibreMap, MapGeoJSONFeature, PointLike } from 'maplibre-gl';
import type { GeoJSONData, LayerEntry, PaintProperty, PaintValue } from './layer-registry.js';
import type { MapContext } from './map-context.svelte.js';

/*
 * Helpers for components that draw through `ctx.layers`. Call them while the component
 * initialises. They register once from the initial props and then change the live
 * source and layers in place, so a prop change never rebuilds anything.
 */

/** Register the entry once, from initial props. Removed again when the component unmounts. */
export function registerLayers(ctx: MapContext, entry: () => LayerEntry): void {
	$effect(() => untrack(() => ctx.layers.add(entry())));
}

/**
 * Send new data to the source whenever `data` changes. The first value is skipped: it
 * went in with `registerLayers`.
 */
export function syncData(ctx: MapContext, sourceId: string, data: () => GeoJSONData): void {
	let initial = true;
	$effect(() => {
		const next = data();
		if (initial) {
			initial = false;
			return;
		}
		ctx.layers.setData(sourceId, next);
	});
}

/** Keep one paint property of a layer in step with `value`. */
export function syncPaint(
	ctx: MapContext,
	sourceId: string,
	layerId: string,
	name: PaintProperty,
	value: () => PaintValue
): void {
	$effect(() => ctx.layers.setPaintProperty(sourceId, layerId, name, value()));
}

/** Features under `point` in whichever of `layerIds` the current style has. */
export function featuresAt(
	map: MapLibreMap,
	point: PointLike,
	layerIds: string[]
): MapGeoJSONFeature[] {
	const layers = layerIds.filter((layer) => map.getLayer(layer));
	return layers.length > 0 ? map.queryRenderedFeatures(point, { layers }) : [];
}

/** A plain copy of reactive GeoJSON. MapLibre posts data to a worker, which cannot take proxies. */
export function plainGeoJSON(data: unknown): GeoJSONData {
	return $state.snapshot(data) as GeoJSONData;
}
