import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';
import type { DrawFeature } from '#lib/registry/ui/map-draw/index.js';

export interface Asset {
	id: string;
	name: string;
	lngLat: LngLatTuple;
}

/** Hamburg harbour, where the sample assets are parked. */
export const VIEWPORT: MapViewport = {
	center: [9.955, 53.536],
	zoom: 12.6,
	bearing: 0,
	pitch: 0
};

export const ASSETS: Asset[] = [
	{ id: 'truck-1', name: 'Truck 1', lngLat: [9.9312, 53.5396] },
	{ id: 'truck-2', name: 'Truck 2', lngLat: [9.9458, 53.5331] },
	{ id: 'truck-3', name: 'Truck 3', lngLat: [9.9634, 53.5402] },
	{ id: 'crane-1', name: 'Crane 1', lngLat: [9.9721, 53.5298] },
	{ id: 'crane-2', name: 'Crane 2', lngLat: [9.9533, 53.5263] },
	{ id: 'van-1', name: 'Van 1', lngLat: [9.9805, 53.5427] }
];

/** A fence saved earlier, loaded into the draw control so it can be edited. */
export const SAVED_FENCES: DrawFeature[] = [
	{
		type: 'Feature',
		id: 'container-yard',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[9.926, 53.537],
					[9.936, 53.537],
					[9.936, 53.542],
					[9.926, 53.542],
					[9.926, 53.537]
				]
			]
		},
		properties: { mode: 'rectangle' }
	}
];

export const SAVED_NAMES: Record<string, string> = { 'container-yard': 'Container yard' };
