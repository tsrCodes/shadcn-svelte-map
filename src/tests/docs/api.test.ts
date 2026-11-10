import { describe, expect, test } from 'vitest';
import { API_COMPONENTS, apiMarkdown, getApiEntry } from '#lib/docs/api.server.js';

describe('API reference extraction', () => {
	test('reads props, defaults, bindables, events and snippets from the source', () => {
		const marker = getApiEntry('map-marker');
		const byName = Object.fromEntries((marker?.props ?? []).map((prop) => [prop.name, prop]));
		expect(marker?.name).toBe('MapMarker');
		expect(byName.lngLat).toMatchObject({ required: true, bindable: true, kind: 'prop' });
		expect(byName.anchor).toMatchObject({ default: "'center'", required: false });
		expect(byName.ondragend?.kind).toBe('event');
		expect(byName.children?.kind).toBe('snippet');
		expect(byName['aria-label']?.required).toBe(true);
		expect(marker?.restElement).toBe('button');
	});

	test('follows shared prop interfaces and forwarded component props', () => {
		const circle = getApiEntry('map-circle');
		expect(circle?.props.map((prop) => prop.name)).toEqual(
			expect.arrayContaining(['radius', 'fillOpacity', 'color', 'onclick'])
		);
		const search = getApiEntry('map-search-control')?.props.map((prop) => prop.name) ?? [];
		// Forwarded through a named import from the place search barrel.
		expect(search).toEqual(expect.arrayContaining(['zoom', 'placeholder', 'onselect']));
		expect(search).not.toContain('near');
	});

	test('every public component has a description for every prop', () => {
		const missing = API_COMPONENTS.flatMap((component) =>
			(getApiEntry(component)?.props ?? [])
				.filter((prop) => !prop.description && !['children', 'class'].includes(prop.name))
				.map((prop) => `${component}.${prop.name}`)
		);
		expect(missing).toEqual([]);
	});

	test('uses the exported name, not the file name', () => {
		expect(getApiEntry('map-geojson')?.name).toBe('MapGeoJSON');
		expect(getApiEntry('place-autocomplete')?.name).toBe('PlaceAutocomplete');
	});

	test('renders markdown tables', () => {
		const markdown = apiMarkdown('map-zoom-control');
		expect(markdown).toContain('### MapZoomControl');
		expect(markdown).toContain('| Name | Type | Default | Description |');
	});
});
