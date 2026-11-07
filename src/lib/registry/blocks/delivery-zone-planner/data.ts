import type { Feature, Point } from 'geojson';
import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

export const DEPOT: LngLatTuple = [2.1686, 41.3874];

/** Barcelona around the depot. */
export const VIEWPORT: MapViewport = {
	center: DEPOT,
	zoom: 12.4,
	bearing: 0,
	pitch: 0
};

export type TierId = 'express' | 'standard' | 'economy';

export interface Tier {
	id: TierId;
	label: string;
	/** Delivery fee in euros. */
	fee: number;
}

export const TIERS: readonly Tier[] = [
	{ id: 'express', label: 'Express · 30 min', fee: 6.9 },
	{ id: 'standard', label: 'Standard · 2 h', fee: 3.9 },
	{ id: 'economy', label: 'Economy · same day', fee: 1.9 }
];

export interface Order {
	id: string;
	items: number;
}

const ORDER_COUNT = 140;
const GOLDEN_ANGLE = 2.39996;
const SPREAD = 0.0042;
/** Longitude degrees are shorter than latitude degrees at this latitude. */
const LNG_STRETCH = 1.33;

/** Orders on a fixed spiral around the depot, so every load looks the same. */
export const ORDERS: Feature<Point, Order>[] = Array.from({ length: ORDER_COUNT }, (_, index) => {
	const angle = index * GOLDEN_ANGLE;
	const distance = SPREAD * Math.sqrt(index + 1);
	return {
		type: 'Feature',
		properties: { id: `order-${index + 1}`, items: (index % 4) + 1 },
		geometry: {
			type: 'Point',
			coordinates: [
				DEPOT[0] + distance * Math.cos(angle) * LNG_STRETCH,
				DEPOT[1] + distance * Math.sin(angle)
			]
		}
	};
});
