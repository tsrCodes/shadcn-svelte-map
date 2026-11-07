import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

/** Central Paris. */
export const VIEWPORT: MapViewport = {
	center: [2.3355, 48.8556],
	zoom: 12.4,
	bearing: 0,
	pitch: 0
};

/** Milliseconds between position updates. */
export const TICK_MS = 500;
/** Simulated seconds that pass per real second, so the demo moves at a watchable pace. */
export const TIME_SCALE = 20;

export interface Vehicle {
	id: string;
	name: string;
	driver: string;
	/** Cruising speed; 0 means parked. */
	speedKmh: number;
	/** Where on its loop the vehicle starts, 0 to 1. */
	offset: number;
	/** A closed loop the vehicle drives round. */
	route: LngLatTuple[];
}

export const VEHICLES: Vehicle[] = [
	{
		id: 'van-12',
		name: 'Van 12',
		driver: 'Inès',
		speedKmh: 28,
		offset: 0,
		route: [
			[2.3205, 48.8662],
			[2.3364, 48.8698],
			[2.3488, 48.8669],
			[2.3473, 48.8594],
			[2.3291, 48.8583],
			[2.3205, 48.8662]
		]
	},
	{
		id: 'van-17',
		name: 'Van 17',
		driver: 'Malik',
		speedKmh: 34,
		offset: 0.4,
		route: [
			[2.3522, 48.8566],
			[2.3699, 48.8531],
			[2.3762, 48.8612],
			[2.3632, 48.8675],
			[2.3522, 48.8566]
		]
	},
	{
		id: 'truck-3',
		name: 'Truck 3',
		driver: 'Sofia',
		speedKmh: 22,
		offset: 0.7,
		route: [
			[2.3002, 48.8546],
			[2.3176, 48.8519],
			[2.3302, 48.8462],
			[2.3105, 48.8405],
			[2.2949, 48.8463],
			[2.3002, 48.8546]
		]
	},
	{
		id: 'bike-5',
		name: 'Bike 5',
		driver: 'Théo',
		speedKmh: 0,
		offset: 0.2,
		route: [
			[2.3444, 48.8485],
			[2.3512, 48.8452],
			[2.3438, 48.8418],
			[2.3444, 48.8485]
		]
	}
];
