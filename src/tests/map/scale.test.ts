import { describe, expect, test } from 'vitest';
import { roundDown, scaleBar } from '#lib/registry/ui/map/scale.js';

describe('roundDown', () => {
	test('picks 1, 2, 3 or 5 times a power of ten', () => {
		expect(roundDown(1.4)).toBe(1);
		expect(roundDown(2.9)).toBe(2);
		expect(roundDown(4.99)).toBe(3);
		expect(roundDown(87)).toBe(50);
		expect(roundDown(0.34)).toBe(0.3);
	});
});

describe('scaleBar', () => {
	test('uses metres below a kilometre and kilometres above', () => {
		expect(scaleBar(740)).toEqual({ label: '500 m', ratio: 500 / 740 });
		expect(scaleBar(2600)).toEqual({ label: '2 km', ratio: 2 / 2.6 });
	});

	test('uses feet below a mile and miles above', () => {
		expect(scaleBar(100, 'imperial')?.label).toBe('300 ft');
		expect(scaleBar(5000, 'imperial')?.label).toBe('3 mi');
	});

	test('returns null for a length that is not positive and finite', () => {
		expect(scaleBar(0)).toBeNull();
		expect(scaleBar(-5)).toBeNull();
		expect(scaleBar(Number.NaN)).toBeNull();
	});
});
