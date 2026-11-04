import { afterEach, describe, expect, test } from 'vitest';
import { ThemeObserver, readThemeColors, toRgba } from '#lib/registry/ui/map/theme.svelte.js';

describe('theme resolution', () => {
	const root = document.documentElement;

	afterEach(() => {
		root.className = '';
		root.removeAttribute('data-theme');
		root.style.colorScheme = '';
	});

	test('follows the dark and light class and data-theme', () => {
		const theme = new ThemeObserver();
		root.classList.add('dark');
		expect(theme.resolved).toBe('dark');
		root.className = 'light';
		expect(theme.resolved).toBe('light');
		root.className = '';
		root.dataset.theme = 'dark';
		expect(theme.resolved).toBe('dark');
	});

	test('no dark class means the light tokens, whatever the system prefers', () => {
		expect(new ThemeObserver().resolved).toBe('light');
	});

	test('follows color-scheme, as mode-watcher sets it', () => {
		const theme = new ThemeObserver();
		root.style.colorScheme = 'dark';
		expect(theme.resolved).toBe('dark');
		root.style.colorScheme = 'light';
		expect(theme.resolved).toBe('light');
	});
});

describe('theme colours', () => {
	test('converts oklch to an rgba string MapLibre can parse', () => {
		expect(toRgba('oklch(1 0 0)')).toBe('rgba(255, 255, 255, 1)');
		expect(toRgba('oklch(0 0 0 / 50%)')).toMatch(/^rgba\(0, 0, 0, 0\.5\d*\)$/);
		expect(toRgba('#ff0000')).toBe('rgba(255, 0, 0, 1)');
	});

	test('reads shadcn tokens from the element', () => {
		const element = document.createElement('div');
		element.style.setProperty('--primary', 'oklch(0.577 0.245 27.325)');
		element.style.setProperty('--background', 'oklch(1 0 0)');
		document.body.appendChild(element);

		const colors = readThemeColors(element);
		element.remove();

		expect(colors.background).toBe('rgba(255, 255, 255, 1)');
		expect(colors.primary).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/);
		const [red, green] = (colors.primary.match(/\d+/g) ?? []).map(Number);
		expect(red).toBeGreaterThan(150);
		expect(green).toBeLessThan(100);
	});
});
