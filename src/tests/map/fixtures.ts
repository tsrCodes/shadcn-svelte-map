import type { StyleSpecification } from 'maplibre-gl';
import type { LayerEntry } from '#lib/registry/ui/map/index.js';

/** Local styles, so component tests never touch the network. */
export const LIGHT_STYLE: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } }]
};

export const DARK_STYLE: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [
		{ id: 'background', type: 'background', paint: { 'background-color': '#111111' } },
		{ id: 'overlay', type: 'background', paint: { 'background-opacity': 0 } }
	]
};

export const POINTS_SOURCE = 'test-points';
export const POINTS_LAYER = 'test-points-circles';

export const POINTS_ENTRY: LayerEntry = {
	sourceId: POINTS_SOURCE,
	source: {
		type: 'geojson',
		promoteId: 'id',
		data: {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { id: 1 },
					geometry: { type: 'Point', coordinates: [0, 0] }
				},
				{ type: 'Feature', properties: { id: 2 }, geometry: { type: 'Point', coordinates: [5, 5] } }
			]
		}
	},
	layers: [
		{
			id: POINTS_LAYER,
			type: 'circle',
			source: POINTS_SOURCE,
			paint: {
				'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 6]
			}
		}
	]
};

/** A Photon search response with one area and one point, made up for tests. */
export const PHOTON_BODY = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: {
				osm_type: 'W',
				osm_id: 1,
				type: 'locality',
				name: 'Central Square',
				city: 'Sample City',
				extent: [20, 12, 22, 10]
			},
			geometry: { type: 'Point', coordinates: [21, 11] }
		},
		{
			type: 'Feature',
			properties: { osm_type: 'N', osm_id: 2, type: 'house', name: 'Corner Shop' },
			geometry: { type: 'Point', coordinates: [30, 15] }
		}
	]
};
