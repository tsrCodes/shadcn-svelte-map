import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

export const VIEWPORT: MapViewport = {
	center: [15, 22],
	zoom: 1,
	bearing: 0,
	pitch: 0
};

export interface Airport {
	code: string;
	city: string;
	lngLat: LngLatTuple;
}

export const AIRPORTS: Airport[] = [
	{ code: 'LHR', city: 'London', lngLat: [-0.4543, 51.47] },
	{ code: 'FRA', city: 'Frankfurt', lngLat: [8.5622, 50.0379] },
	{ code: 'DXB', city: 'Dubai', lngLat: [55.3644, 25.2532] },
	{ code: 'JFK', city: 'New York', lngLat: [-73.7781, 40.6413] },
	{ code: 'ORD', city: 'Chicago', lngLat: [-87.9073, 41.9742] },
	{ code: 'GRU', city: 'São Paulo', lngLat: [-46.4731, -23.4356] },
	{ code: 'JNB', city: 'Johannesburg', lngLat: [28.2425, -26.1392] },
	{ code: 'NBO', city: 'Nairobi', lngLat: [36.9278, -1.3192] },
	{ code: 'DEL', city: 'Delhi', lngLat: [77.1, 28.5562] },
	{ code: 'BOM', city: 'Mumbai', lngLat: [72.8656, 19.0896] },
	{ code: 'SIN', city: 'Singapore', lngLat: [103.9915, 1.3644] },
	{ code: 'HND', city: 'Tokyo', lngLat: [139.7798, 35.5494] },
	{ code: 'SYD', city: 'Sydney', lngLat: [151.1772, -33.9399] },
	{ code: 'IST', city: 'Istanbul', lngLat: [28.8146, 40.9769] },
	{ code: 'MAD', city: 'Madrid', lngLat: [-3.5676, 40.4983] }
];

/** Airports the airline runs its network from. */
export const HUBS = ['LHR', 'FRA', 'DXB'] as const;

export type Hub = (typeof HUBS)[number];

export interface Route {
	from: Hub;
	to: string;
	/** Flights a week in each direction. */
	weekly: number;
}

export const ROUTES: Route[] = [
	{ from: 'LHR', to: 'JFK', weekly: 84 },
	{ from: 'LHR', to: 'ORD', weekly: 28 },
	{ from: 'LHR', to: 'GRU', weekly: 7 },
	{ from: 'LHR', to: 'JNB', weekly: 14 },
	{ from: 'LHR', to: 'DEL', weekly: 21 },
	{ from: 'LHR', to: 'SIN', weekly: 14 },
	{ from: 'LHR', to: 'MAD', weekly: 56 },
	{ from: 'LHR', to: 'IST', weekly: 28 },
	{ from: 'FRA', to: 'JFK', weekly: 35 },
	{ from: 'FRA', to: 'ORD', weekly: 21 },
	{ from: 'FRA', to: 'GRU', weekly: 7 },
	{ from: 'FRA', to: 'DEL', weekly: 14 },
	{ from: 'FRA', to: 'HND', weekly: 14 },
	{ from: 'FRA', to: 'IST', weekly: 42 },
	{ from: 'FRA', to: 'MAD', weekly: 35 },
	{ from: 'DXB', to: 'LHR', weekly: 42 },
	{ from: 'DXB', to: 'JNB', weekly: 21 },
	{ from: 'DXB', to: 'NBO', weekly: 21 },
	{ from: 'DXB', to: 'BOM', weekly: 56 },
	{ from: 'DXB', to: 'DEL', weekly: 49 },
	{ from: 'DXB', to: 'SIN', weekly: 28 },
	{ from: 'DXB', to: 'SYD', weekly: 14 },
	{ from: 'DXB', to: 'HND', weekly: 14 }
];
