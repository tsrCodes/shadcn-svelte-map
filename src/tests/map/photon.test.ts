import { describe, expect, test } from 'vitest';
import {
	parsePhotonResponse,
	photonSearchUrl
} from '#lib/registry/ui/place-autocomplete/photon.js';

describe('photonSearchUrl', () => {
	test('builds the query with limit, language and a position bias', () => {
		const url = new URL(
			photonSearchUrl({ query: 'café berlin', limit: 5, lang: 'de', near: [13.4, 52.5] })
		);
		expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/');
		expect(url.searchParams.get('q')).toBe('café berlin');
		expect(url.searchParams.get('limit')).toBe('5');
		expect(url.searchParams.get('lang')).toBe('de');
		expect(url.searchParams.get('lon')).toBe('13.4');
		expect(url.searchParams.get('lat')).toBe('52.5');
	});

	test('accepts a self-hosted base URL with or without a trailing slash', () => {
		expect(photonSearchUrl({ query: 'x', baseUrl: 'https://geo.example.com/photon/' })).toBe(
			'https://geo.example.com/photon/api/?q=x'
		);
		expect(photonSearchUrl({ query: 'x', baseUrl: 'https://geo.example.com/photon' })).toBe(
			'https://geo.example.com/photon/api/?q=x'
		);
	});
});

describe('parsePhotonResponse', () => {
	const square = {
		type: 'Feature',
		properties: {
			osm_type: 'W',
			osm_id: 1,
			type: 'locality',
			name: 'Central Square',
			district: 'Old Town',
			city: 'Sample City',
			country: 'Exampleland',
			extent: [10, 51, 11, 50]
		},
		geometry: { type: 'Point', coordinates: [10.5, 50.5] }
	};

	test('reads name, description, kind, position and bounds', () => {
		const [place] = parsePhotonResponse({ type: 'FeatureCollection', features: [square] });
		expect(place).toEqual({
			id: 'W1',
			name: 'Central Square',
			description: 'Old Town, Sample City, Exampleland',
			kind: 'locality',
			position: [10.5, 50.5],
			bounds: [
				[10, 50],
				[11, 51]
			]
		});
	});

	test('names a house by street and number, and leaves bounds out without an extent', () => {
		const house = {
			type: 'Feature',
			properties: { osm_type: 'N', osm_id: 2, street: 'Main Road', housenumber: '4' },
			geometry: { type: 'Point', coordinates: [1, 2] }
		};
		const [place] = parsePhotonResponse({ type: 'FeatureCollection', features: [house] });
		expect(place.name).toBe('Main Road 4');
		expect(place.description).toBe('Main Road');
		expect(place.bounds).toBeUndefined();
	});

	test('skips features without a name or a point, and repeats of the same object', () => {
		const features = [
			square,
			square,
			{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } },
			{ type: 'Feature', properties: { name: 'Line' }, geometry: { type: 'LineString' } },
			{
				type: 'Feature',
				properties: { name: 'Bad' },
				geometry: { type: 'Point', coordinates: ['a', 1] }
			}
		];
		const places = parsePhotonResponse({ type: 'FeatureCollection', features });
		expect(places.map((place) => place.id)).toEqual(['W1']);
	});

	test('throws when the body is not a feature collection', () => {
		expect(() => parsePhotonResponse({ message: 'rate limited' })).toThrow(/GeoJSON/);
		expect(() => parsePhotonResponse(null)).toThrow(/GeoJSON/);
	});
});
