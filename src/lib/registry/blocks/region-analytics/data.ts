import type { Feature, Polygon } from 'geojson';
import { rectangleRing, type MapViewport } from '#lib/registry/ui/map/index.js';

/** Sales territories laid over Madrid. */
export const VIEWPORT: MapViewport = {
	center: [-3.7038, 40.4168],
	zoom: 10,
	bearing: 0,
	pitch: 0
};

export type MetricId = 'revenue' | 'orders' | 'growth';

export interface Metric {
	id: MetricId;
	label: string;
	format: (value: number) => string;
}

const euros = new Intl.NumberFormat('en', {
	style: 'currency',
	currency: 'EUR',
	notation: 'compact'
});
const count = new Intl.NumberFormat('en');

export const METRICS: readonly Metric[] = [
	{ id: 'revenue', label: 'Revenue', format: (value) => euros.format(value) },
	{ id: 'orders', label: 'Orders', format: (value) => count.format(value) },
	{ id: 'growth', label: 'Growth', format: (value) => `${value > 0 ? '+' : ''}${value}%` }
];

export interface Region {
	id: string;
	name: string;
	revenue: number;
	orders: number;
	/** Change against last quarter, in percent. */
	growth: number;
}

const COLUMNS = 3;
const CELL = { lng: 0.11, lat: 0.085 };
/** North-west corner of the grid. */
const ORIGIN = { lng: -3.869, lat: 40.544 };

/** Territories row by row from the north-west. */
const FIGURES: Region[] = [
	{ id: 'north-west', name: 'North-west', revenue: 1_240_000, orders: 8_410, growth: 6 },
	{ id: 'north', name: 'North', revenue: 2_980_000, orders: 17_250, growth: 12 },
	{ id: 'north-east', name: 'North-east', revenue: 1_610_000, orders: 9_870, growth: -3 },
	{ id: 'west', name: 'West', revenue: 860_000, orders: 5_320, growth: 2 },
	{ id: 'centre', name: 'Centre', revenue: 4_720_000, orders: 26_900, growth: 18 },
	{ id: 'east', name: 'East', revenue: 2_140_000, orders: 12_480, growth: 9 },
	{ id: 'south-west', name: 'South-west', revenue: 540_000, orders: 3_610, growth: -8 },
	{ id: 'south', name: 'South', revenue: 1_330_000, orders: 8_020, growth: 4 },
	{ id: 'south-east', name: 'South-east', revenue: 980_000, orders: 6_150, growth: 15 }
];

export const REGIONS: Feature<Polygon, Region>[] = FIGURES.map((region, index) => {
	const west = ORIGIN.lng + (index % COLUMNS) * CELL.lng;
	const north = ORIGIN.lat - Math.floor(index / COLUMNS) * CELL.lat;
	return {
		type: 'Feature',
		properties: region,
		geometry: {
			type: 'Polygon',
			coordinates: [
				rectangleRing([
					[west, north - CELL.lat],
					[west + CELL.lng, north]
				])
			]
		}
	};
});
