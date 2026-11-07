import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

/** A city park being surveyed. */
export const VIEWPORT: MapViewport = {
	center: [-0.1652, 51.5072],
	zoom: 14,
	bearing: 0,
	pitch: 0
};

/** The area the survey team covers today. */
export const SURVEY_AREA: LngLatTuple[] = [
	[-0.1786, 51.5103],
	[-0.1588, 51.5129],
	[-0.1527, 51.5072],
	[-0.1569, 51.5031],
	[-0.1752, 51.5021]
];

export const CATEGORIES = ['Tree', 'Damage', 'Hazard', 'Wildlife', 'Other'] as const;

export type Category = (typeof CATEGORIES)[number];
