export type ScaleUnit = 'metric' | 'imperial';

export interface ScaleBar {
	/** Text under the bar, such as `500 m` or `2 mi`. */
	label: string;
	/** Share of the measured width the bar covers, between 0 and 1. */
	ratio: number;
}

const FEET_PER_METER = 3.28084;
const FEET_PER_MILE = 5280;
const METERS_PER_KILOMETER = 1000;

/** The largest 1, 2, 3 or 5 times a power of ten that is not above `value`. */
export function roundDown(value: number): number {
	const power = 10 ** Math.floor(Math.log10(value));
	const fraction = value / power;
	const step = fraction >= 5 ? 5 : fraction >= 3 ? 3 : fraction >= 2 ? 2 : 1;
	// toPrecision drops float noise such as 0.30000000000000004.
	return Number((step * power).toPrecision(12));
}

function bar(length: number, unit: string): ScaleBar {
	const rounded = roundDown(length);
	return { label: `${rounded} ${unit}`, ratio: rounded / length };
}

/**
 * A scale bar for a stretch of map `meters` long. Returns `null` when the length is
 * not a positive finite number, for example before the map has a size.
 */
export function scaleBar(meters: number, unit: ScaleUnit = 'metric'): ScaleBar | null {
	if (!Number.isFinite(meters) || meters <= 0) return null;
	if (unit === 'imperial') {
		const feet = meters * FEET_PER_METER;
		return feet >= FEET_PER_MILE ? bar(feet / FEET_PER_MILE, 'mi') : bar(feet, 'ft');
	}
	return meters >= METERS_PER_KILOMETER
		? bar(meters / METERS_PER_KILOMETER, 'km')
		: bar(meters, 'm');
}
