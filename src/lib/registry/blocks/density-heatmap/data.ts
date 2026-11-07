import type { Feature, Point } from 'geojson';
import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

/** New York City. */
export const VIEWPORT: MapViewport = {
	center: [-73.955, 40.735],
	zoom: 11,
	bearing: 0,
	pitch: 0
};

export const HOURS_PER_DAY = 24;

export interface Pickup {
	/** Hour of the day the ride started, 0 to 23. */
	hour: number;
}

interface Hotspot {
	center: LngLatTuple;
	/** Hour this spot is busiest. */
	peakHour: number;
	/** Pickups generated around this spot. */
	count: number;
	/** Spread in degrees. */
	spread: number;
}

const HOTSPOTS: Hotspot[] = [
	{ center: [-73.9855, 40.758], peakHour: 18, count: 520, spread: 0.012 },
	{ center: [-74.0094, 40.7093], peakHour: 8, count: 360, spread: 0.009 },
	{ center: [-73.9573, 40.7141], peakHour: 23, count: 300, spread: 0.01 },
	{ center: [-73.874, 40.7769], peakHour: 6, count: 220, spread: 0.006 },
	{ center: [-73.9442, 40.6782], peakHour: 20, count: 180, spread: 0.014 },
	{ center: [-73.9712, 40.7831], peakHour: 12, count: 160, spread: 0.011 }
];

/** Spread of each spot's pickups around its peak hour. */
const HOUR_SPREAD = 3;
const SEED = 20_261_107;

/** A small seeded random generator, so every load shows the same pickups. */
function seeded(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/** Roughly normal noise from the sum of three uniform draws, centred on 0. */
function noise(random: () => number): number {
	return random() + random() + random() - 1.5;
}

function generate(): Feature<Point, Pickup>[] {
	const random = seeded(SEED);
	return HOTSPOTS.flatMap((spot) =>
		Array.from({ length: spot.count }, (): Feature<Point, Pickup> => {
			const hour = Math.round(spot.peakHour + noise(random) * HOUR_SPREAD * 2);
			return {
				type: 'Feature',
				properties: { hour: ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY },
				geometry: {
					type: 'Point',
					coordinates: [
						spot.center[0] + noise(random) * spot.spread * 2,
						spot.center[1] + noise(random) * spot.spread * 1.5
					]
				}
			};
		})
	);
}

/** One weekday of ride pickups. */
export const PICKUPS: Feature<Point, Pickup>[] = generate();
