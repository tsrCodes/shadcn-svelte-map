import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { LngLatBoundsTuple, LngLatTuple, MapArcItem } from '#lib/registry/ui/map/index.js';

export interface Place {
	name: string;
	note: string;
	lngLat: LngLatTuple;
}

export const PLACES: Place[] = [
	{ name: 'Brandenburg Gate', note: 'Landmark, Pariser Platz', lngLat: [13.3777, 52.5163] },
	{ name: 'Museum Island', note: 'Five museums on the Spree', lngLat: [13.3976, 52.5169] },
	{ name: 'Tempelhofer Feld', note: 'Former airport, now a park', lngLat: [13.4017, 52.4732] }
];

export interface Stop {
	name: string;
	/** Weighs the stop in the heatmap. */
	visits: number;
}

/** Points on a fixed spiral around the centre, so the demo looks the same every load. */
export function spiralStops(count: number): FeatureCollection<Point, Stop> {
	return {
		type: 'FeatureCollection',
		features: Array.from({ length: count }, (_, index) => {
			const angle = index * 2.4;
			const distance = 0.012 * Math.sqrt(index + 1);
			return {
				type: 'Feature',
				properties: { name: `Stop ${index + 1}`, visits: (index % 5) + 1 },
				geometry: {
					type: 'Point',
					coordinates: [13.4 + distance * Math.cos(angle) * 1.6, 52.5 + distance * Math.sin(angle)]
				}
			};
		})
	};
}

/** A ride from the Brandenburg Gate to Tempelhofer Feld. */
export const RIDE: LngLatTuple[] = [
	[13.3777, 52.5163],
	[13.3889, 52.517],
	[13.4132, 52.5219],
	[13.4185, 52.5097],
	[13.403, 52.497],
	[13.4017, 52.4732]
];

/** Deliveries from a depot at Alexanderplatz. */
export const DELIVERIES: (MapArcItem & { name: string })[] = PLACES.map((place) => ({
	name: place.name,
	from: [13.4132, 52.5219],
	to: place.lngLat
}));

function zone(name: string, [[west, south], [east, north]]: LngLatBoundsTuple) {
	const ring: LngLatTuple[] = [
		[west, south],
		[east, south],
		[east, north],
		[west, north],
		[west, south]
	];
	const geometry: Polygon = { type: 'Polygon', coordinates: [ring] };
	return { type: 'Feature' as const, properties: { name }, geometry };
}

export const ZONES: FeatureCollection<Polygon, { name: string }> = {
	type: 'FeatureCollection',
	features: [
		zone('Tiergarten zone', [
			[13.335, 52.507],
			[13.368, 52.52]
		]),
		zone('Friedrichshain zone', [
			[13.43, 52.505],
			[13.465, 52.52]
		])
	]
};

export const MUSEUM_ISLAND: LngLatTuple[] = [
	[13.394, 52.5215],
	[13.401, 52.5195],
	[13.3995, 52.515],
	[13.395, 52.5175]
];

export const TEMPELHOF_BOUNDS: LngLatBoundsTuple = [
	[13.39, 52.468],
	[13.415, 52.481]
];
