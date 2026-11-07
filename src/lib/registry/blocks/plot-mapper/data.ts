import type { FeatureCollection, Polygon } from 'geojson';
import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

/** Farmland outside a village; parcels are the land registry boundaries. */
export const VIEWPORT: MapViewport = {
	center: [8.612, 52.912],
	zoom: 14.2,
	bearing: 0,
	pitch: 0
};

export const CROPS = ['Wheat', 'Barley', 'Maize', 'Rapeseed', 'Grassland', 'Fallow'] as const;

export type Crop = (typeof CROPS)[number];

function parcel(name: string, ring: LngLatTuple[]) {
	const geometry: Polygon = { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
	return { type: 'Feature' as const, properties: { name }, geometry };
}

/** Registry parcels shown for reference. Fields are drawn on top of them. */
export const PARCELS: FeatureCollection<Polygon, { name: string }> = {
	type: 'FeatureCollection',
	features: [
		parcel('Parcel 112', [
			[8.598, 52.915],
			[8.607, 52.9158],
			[8.6078, 52.9105],
			[8.5985, 52.9098]
		]),
		parcel('Parcel 113', [
			[8.6085, 52.916],
			[8.6195, 52.9168],
			[8.62, 52.9112],
			[8.609, 52.9106]
		]),
		parcel('Parcel 118', [
			[8.599, 52.909],
			[8.6075, 52.9097],
			[8.608, 52.9045],
			[8.5995, 52.904]
		]),
		parcel('Parcel 119', [
			[8.6088, 52.9098],
			[8.6265, 52.9105],
			[8.6268, 52.905],
			[8.6092, 52.9046]
		])
	]
};
