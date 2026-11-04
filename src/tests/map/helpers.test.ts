import { describe, expect, test } from 'vitest';
import { DEFAULT_MAP_STYLE, resolveStyle, styleOrigins } from '#lib/registry/ui/map/styles.js';
import { sameViewport, toViewport } from '#lib/registry/ui/map/viewport.js';
import { DARK_STYLE, LIGHT_STYLE } from './fixtures.js';

describe('resolveStyle', () => {
	test('picks the style for the current theme', () => {
		const themed = { light: LIGHT_STYLE, dark: DARK_STYLE };
		expect(resolveStyle(themed, 'light')).toBe(LIGHT_STYLE);
		expect(resolveStyle(themed, 'dark')).toBe(DARK_STYLE);
	});

	test('uses a single style for every theme', () => {
		expect(resolveStyle('https://example.com/style.json', 'dark')).toBe(
			'https://example.com/style.json'
		);
		expect(resolveStyle(LIGHT_STYLE, 'dark')).toBe(LIGHT_STYLE);
	});
});

describe('styleOrigins', () => {
	test('lists each style host once', () => {
		expect(styleOrigins(DEFAULT_MAP_STYLE)).toEqual(['https://tiles.openfreemap.org']);
		expect(
			styleOrigins({ light: 'https://a.example/light.json', dark: 'https://b.example/dark.json' })
		).toEqual(['https://a.example', 'https://b.example']);
	});

	test('skips inline style objects', () => {
		expect(styleOrigins(LIGHT_STYLE)).toEqual([]);
	});

	test('skips relative style URLs, which are same-origin', () => {
		expect(styleOrigins('/styles/light.json')).toEqual([]);
		expect(
			styleOrigins({ light: 'styles/light.json', dark: 'https://b.example/dark.json' })
		).toEqual(['https://b.example']);
	});
});

describe('viewport helpers', () => {
	const viewport = { center: [10, 20] as [number, number], zoom: 3, bearing: 0, pitch: 0 };

	test('converts a camera to a viewport', () => {
		const camera = { center: { lng: 10, lat: 20 }, zoom: 3, bearing: 0, pitch: 0 };
		expect(toViewport(camera as Parameters<typeof toViewport>[0])).toEqual(viewport);
	});

	test('compares viewports with a small tolerance', () => {
		expect(sameViewport(viewport, { ...viewport, zoom: 3 + 1e-12 })).toBe(true);
		expect(sameViewport(viewport, { ...viewport, zoom: 3.01 })).toBe(false);
		expect(sameViewport(viewport, { ...viewport, center: [10, 21] })).toBe(false);
	});
});
