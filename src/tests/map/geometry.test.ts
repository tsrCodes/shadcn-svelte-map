import { describe, expect, test } from 'vitest';
import {
	arcLine,
	circleRing,
	closeRing,
	distanceMeters,
	lineLength,
	pointInPolygon,
	polygonArea,
	rectangleRing,
	ringArea,
	ringCenter,
	splitLine,
	type LngLatTuple
} from '#lib/registry/ui/map/geometry.js';

/** One degree of longitude at the equator, in metres. */
const DEGREE_AT_EQUATOR = 111_195;

describe('distanceMeters', () => {
	test('measures great-circle distance', () => {
		expect(distanceMeters([0, 0], [1, 0])).toBeCloseTo(DEGREE_AT_EQUATOR, -1);
		expect(distanceMeters([13.4, 52.5], [13.4, 52.5])).toBe(0);
	});
});

describe('circleRing', () => {
	test('returns a closed ring whose points sit at the radius', () => {
		const center: LngLatTuple = [13.4, 52.5];
		const ring = circleRing(center, 1_000, 32);
		expect(ring).toHaveLength(33);
		expect(ring[0]).toEqual(ring[32]);
		for (const point of ring) expect(distanceMeters(center, point)).toBeCloseTo(1_000, 3);
	});

	test('rejects a negative radius or too few steps', () => {
		expect(() => circleRing([0, 0], -1)).toThrow(/radius/);
		expect(() => circleRing([0, 0], 10, 2)).toThrow(/steps/);
		expect(() => circleRing([0, 0], 10, Number.NaN)).toThrow(/steps/);
		expect(() => circleRing([0, 0], 10, 8.5)).toThrow(/steps/);
	});
});

describe('rectangleRing', () => {
	test('walks the corners and closes the ring', () => {
		expect(
			rectangleRing([
				[0, 0],
				[2, 1]
			])
		).toEqual([
			[0, 0],
			[2, 0],
			[2, 1],
			[0, 1],
			[0, 0]
		]);
	});
});

describe('closeRing', () => {
	test('repeats the first position once, and leaves closed rings alone', () => {
		const open: LngLatTuple[] = [
			[0, 0],
			[1, 0],
			[1, 1]
		];
		expect(closeRing(open)).toEqual([...open, [0, 0]]);
		expect(closeRing(closeRing(open))).toEqual([...open, [0, 0]]);
		expect(closeRing([])).toEqual([]);
	});
});

describe('splitLine', () => {
	const line: LngLatTuple[] = [
		[0, 0],
		[1, 0],
		[2, 0]
	];

	test('splits at the given share of the length', () => {
		const half = splitLine(line, 0.5);
		expect(half.point[0]).toBeCloseTo(1, 6);
		expect(half.done).toEqual([[0, 0], half.point]);
		expect(half.rest).toEqual([half.point, [2, 0]]);

		const quarter = splitLine(line, 0.25);
		expect(quarter.point[0]).toBeCloseTo(0.5, 6);
		expect(quarter.rest).toEqual([quarter.point, [1, 0], [2, 0]]);
	});

	test('clamps progress outside 0 to 1', () => {
		expect(splitLine(line, -1).done).toEqual([[0, 0]]);
		expect(splitLine(line, -1).point).toEqual([0, 0]);
		expect(splitLine(line, 2).rest).toEqual([[2, 0]]);
		expect(splitLine(line, 2).point).toEqual([2, 0]);
	});

	test('handles a line with one point or no length', () => {
		expect(splitLine([[3, 4]], 0.5)).toEqual({ done: [[3, 4]], rest: [[3, 4]], point: [3, 4] });
		expect(lineLength([[3, 4]])).toBe(0);
		expect(() => splitLine([], 0.5)).toThrow(/at least one/);
	});
});

describe('arcLine', () => {
	test('starts and ends at the endpoints and bends away from the straight line', () => {
		const arc = arcLine([0, 0], [10, 0], 0.2, 16);
		expect(arc).toHaveLength(17);
		expect(arc[0]).toEqual([0, 0]);
		expect(arc[16][0]).toBeCloseTo(10, 9);
		expect(arc[16][1]).toBeCloseTo(0, 9);
		expect(Math.abs(arc[8][1])).toBeCloseTo(2, 6);
	});

	test('takes the short way across the antimeridian', () => {
		const arc = arcLine([170, 0], [-170, 0], 0, 4);
		expect(arc.at(-1)?.[0]).toBeCloseTo(190, 9);
		for (const [lng] of arc) expect(lng).toBeGreaterThanOrEqual(170);
	});

	test('rejects a step count that is not a whole number above 0', () => {
		for (const steps of [0, -4, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => arcLine([0, 0], [10, 0], 0.2, steps)).toThrow(/steps/);
		}
	});

	test('a curvature of 0 is a straight line', () => {
		const arc = arcLine([0, 0], [4, 4], 0, 4);
		for (const [lng, lat] of arc) expect(lng).toBeCloseTo(lat, 9);
	});
});

describe('polygon helpers', () => {
	const square: LngLatTuple[] = [
		[0, 0],
		[1, 0],
		[1, 1],
		[0, 1]
	];
	const hole: LngLatTuple[] = [
		[0.25, 0.25],
		[0.75, 0.25],
		[0.75, 0.75],
		[0.25, 0.75]
	];

	test('ringArea measures a one-degree square at the equator', () => {
		const expected = DEGREE_AT_EQUATOR ** 2;
		expect(ringArea(square) / expected).toBeCloseTo(1, 2);
		expect(ringArea(closeRing(square))).toBeCloseTo(ringArea(square), 6);
		expect(ringArea([...square].reverse())).toBeCloseTo(ringArea(square), 6);
		expect(ringArea([[0, 0]])).toBe(0);
	});

	test('polygonArea subtracts holes', () => {
		expect(polygonArea([square, hole]) / ringArea(square)).toBeCloseTo(0.75, 2);
		expect(polygonArea([])).toBe(0);
	});

	test('pointInPolygon respects the outer ring and holes', () => {
		expect(pointInPolygon([0.1, 0.1], [square])).toBe(true);
		expect(pointInPolygon([2, 0.5], [square])).toBe(false);
		expect(pointInPolygon([0.5, 0.5], [square, hole])).toBe(false);
		expect(pointInPolygon([0.1, 0.5], [square, hole])).toBe(true);
		expect(pointInPolygon([0.5, 0.5], [])).toBe(false);
	});

	test('ringCenter averages the corners and ignores the closing copy', () => {
		expect(ringCenter(closeRing(square))).toEqual([0.5, 0.5]);
		expect(ringCenter([[3, 4]])).toEqual([3, 4]);
		expect(() => ringCenter([])).toThrow();
	});
});
