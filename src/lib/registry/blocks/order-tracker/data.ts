import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

/** Inner Copenhagen. */
export const VIEWPORT: MapViewport = {
	center: [12.5729, 55.6829],
	zoom: 13,
	bearing: 0,
	pitch: 0
};

/** Milliseconds between clock updates. */
export const TICK_MS = 500;
/** Simulated minutes that pass per update. */
export const MINUTES_PER_TICK = 0.5;

export interface Stage {
	id: 'placed' | 'preparing' | 'on-the-way' | 'delivered';
	label: string;
	/** Minute after the order was placed when this stage starts. */
	at: number;
}

/** The courier rides between `on-the-way` and `delivered`. */
export const STAGES: readonly Stage[] = [
	{ id: 'placed', label: 'Order placed', at: 0 },
	{ id: 'preparing', label: 'Being prepared', at: 1 },
	{ id: 'on-the-way', label: 'On the way', at: 6 },
	{ id: 'delivered', label: 'Delivered', at: 18 }
];

export interface Order {
	id: string;
	restaurant: string;
	items: string[];
	courier: string;
	/** From the restaurant to the door, in riding order. */
	route: LngLatTuple[];
}

export const ORDER: Order = {
	id: '#4821',
	restaurant: 'Noodle Bar Nørrebro',
	items: ['Spicy ramen', 'Gyoza ×6', 'Iced tea'],
	courier: 'Freja',
	route: [
		[12.5536, 55.6922],
		[12.5592, 55.6889],
		[12.5651, 55.6857],
		[12.5703, 55.6829],
		[12.5741, 55.6802],
		[12.5812, 55.6786],
		[12.5869, 55.6762],
		[12.5921, 55.6735]
	]
};
