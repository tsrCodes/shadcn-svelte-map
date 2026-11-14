import { describe, expect, test } from 'vitest';
import type { GeoJSONStoreFeatures } from 'terra-draw';
import {
	DRAW_ID_STRATEGY,
	drawStyles,
	engineFeatures,
	engineMode,
	finishedFeatures,
	DRAW_MODES,
	type DrawFeature
} from '#lib/registry/ui/map-draw/draw.js';

function feature(
	id: string,
	properties: Record<string, unknown>,
	type: 'Point' | 'Polygon' = 'Point'
): GeoJSONStoreFeatures {
	const geometry =
		type === 'Point'
			? { type, coordinates: [1, 2] }
			: {
					type,
					coordinates: [
						[
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 0]
						]
					]
				};
	return { type: 'Feature', id, geometry, properties } as GeoJSONStoreFeatures;
}

describe('draw helpers', () => {
	test('engineMode maps our tool names to terra-draw modes', () => {
		expect(engineMode('polyline')).toBe('linestring');
		expect(engineMode('none')).toBe('static');
		expect(DRAW_MODES.map(engineMode)).toEqual([
			'point',
			'linestring',
			'polygon',
			'rectangle',
			'circle',
			'freehand'
		]);
	});

	test('finishedFeatures drops helpers and shapes still being drawn', () => {
		const result = finishedFeatures([
			feature('a', { mode: 'point', selected: true }),
			feature('b', { mode: 'polygon', currentlyDrawing: true }, 'Polygon'),
			feature('c', { mode: 'select', selectionPoint: true }),
			feature('d', { mode: 'polygon', coordinatePoint: true }),
			feature('e', { mode: 'linestring', midPoint: true }),
			feature('f', { mode: 'static' }),
			feature('g', { mode: 'circle', radiusKilometers: 4 }, 'Polygon')
		]);
		expect(result).toEqual([
			{
				type: 'Feature',
				id: 'a',
				geometry: { type: 'Point', coordinates: [1, 2] },
				properties: { mode: 'point' }
			},
			{
				type: 'Feature',
				id: 'g',
				geometry: expect.objectContaining({ type: 'Polygon' }),
				properties: { mode: 'circle' }
			}
		]);
	});

	test('finishedFeatures names terra-draw lines polylines', () => {
		const [line] = finishedFeatures([feature('l', { mode: 'linestring' })]);
		expect(line.properties.mode).toBe('polyline');
	});

	test('drawStyles builds every mode from the palette', () => {
		const styles = drawStyles({ stroke: '#111111', halo: '#ffffff', selected: '#ff0000' });
		expect(Object.keys(styles).sort()).toEqual(
			['circle', 'freehand', 'linestring', 'point', 'polygon', 'rectangle', 'select'].sort()
		);
		expect(styles.polygon.fillColor).toBe('#111111');
		expect(styles.select.selectedPolygonColor).toBe('#ff0000');
		expect(styles.point.pointOutlineColor).toBe('#ffffff');
	});
	test('engineFeatures names modes the way terra-draw does and keeps ids', () => {
		const line: DrawFeature = {
			type: 'Feature',
			id: 'route-1',
			geometry: {
				type: 'LineString',
				coordinates: [
					[0, 0],
					[1, 1]
				]
			},
			properties: { mode: 'polyline' }
		};
		const [converted] = engineFeatures([line]);
		expect(converted.id).toBe('route-1');
		expect(converted.properties.mode).toBe('linestring');
		expect(converted.geometry).toEqual(line.geometry);
		expect(finishedFeatures([converted])).toEqual([line]);
	});

	test('the id strategy accepts any string or number id and makes unique ones', () => {
		expect(DRAW_ID_STRATEGY.isValidId('site-1')).toBe(true);
		expect(DRAW_ID_STRATEGY.isValidId(7)).toBe(true);
		expect(DRAW_ID_STRATEGY.isValidId('')).toBe(false);
		expect(DRAW_ID_STRATEGY.isValidId(Number.NaN)).toBe(false);
		const ids = new Set(Array.from({ length: 50 }, () => DRAW_ID_STRATEGY.getId()));
		expect(ids.size).toBe(50);
		for (const id of ids) expect(DRAW_ID_STRATEGY.isValidId(id)).toBe(true);
	});
});
