import { createSubscriber, MediaQuery } from 'svelte/reactivity';
import type { ResolvedTheme } from './styles.js';

/** shadcn colour tokens, resolved to `rgba(...)` strings MapLibre can parse. */
export interface ThemeColors {
	background: string;
	foreground: string;
	primary: string;
	primaryForeground: string;
	muted: string;
	mutedForeground: string;
	accent: string;
	border: string;
	ring: string;
	destructive: string;
	chart1: string;
	chart2: string;
	chart3: string;
	chart4: string;
	chart5: string;
}

const TOKENS: Record<keyof ThemeColors, string> = {
	background: '--background',
	foreground: '--foreground',
	primary: '--primary',
	primaryForeground: '--primary-foreground',
	muted: '--muted',
	mutedForeground: '--muted-foreground',
	accent: '--accent',
	border: '--border',
	ring: '--ring',
	destructive: '--destructive',
	chart1: '--chart-1',
	chart2: '--chart-2',
	chart3: '--chart-3',
	chart4: '--chart-4',
	chart5: '--chart-5'
};

export const FALLBACK_COLOR = 'rgba(0, 0, 0, 1)';

/**
 * Theme the page shows, read from `<html>`: `dark` / `light` class or `data-theme`
 * first, then `color-scheme`. Returns `'system'` when the page follows the OS.
 */
function readDocumentTheme(): ResolvedTheme | 'system' {
	const root = document.documentElement;
	if (root.classList.contains('dark') || root.dataset.theme === 'dark') return 'dark';
	if (root.classList.contains('light') || root.dataset.theme === 'light') return 'light';
	const scheme = getComputedStyle(root).colorScheme.split(/\s+/);
	if (scheme.includes('dark') && scheme.includes('light')) return 'system';
	// No dark class and no dark scheme: shadcn's `:root` tokens are the light ones.
	return scheme.includes('dark') ? 'dark' : 'light';
}

/**
 * Follows the page theme, so the map matches the shadcn tokens around it. Works with
 * mode-watcher and any switcher that sets a class, `data-theme` or `color-scheme`.
 */
export class ThemeObserver {
	#prefersDark = new MediaQuery('(prefers-color-scheme: dark)');

	#subscribe = createSubscriber((update) => {
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'data-theme', 'style']
		});
		return () => observer.disconnect();
	});

	get resolved(): ResolvedTheme {
		if (typeof document === 'undefined') return 'light';
		this.#subscribe();
		const theme = readDocumentTheme();
		if (theme !== 'system') return theme;
		return this.#prefersDark.current ? 'dark' : 'light';
	}
}

let canvasContext: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D | null {
	if (!canvasContext) {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		canvasContext = canvas.getContext('2d', { willReadFrequently: true });
	}
	return canvasContext;
}

/**
 * Convert any CSS colour the browser understands (oklch, color-mix, hsl...) to an
 * `rgba(...)` string. MapLibre's parser only knows the older colour syntaxes.
 */
export function toRgba(color: string): string {
	const context = getCanvasContext();
	if (!context || !color) return FALLBACK_COLOR;
	context.clearRect(0, 0, 1, 1);
	context.fillStyle = FALLBACK_COLOR;
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
	return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
}

/** The same colour with its opacity replaced, as an `rgba(...)` string. */
export function withAlpha(color: string, alpha: number): string {
	const opacity = Math.min(1, Math.max(0, alpha));
	return toRgba(color).replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
}

/** A colour as `#rrggbb`, dropping its opacity. For libraries that only take hex colours. */
export function toHex(color: string): `#${string}` {
	const channels = toRgba(color).match(/[\d.]+/g) ?? [];
	const hex = channels
		.slice(0, 3)
		.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0'))
		.join('');
	return `#${hex.padEnd(6, '0')}`;
}

/** Read the shadcn colour tokens as seen from `element`. */
export function readThemeColors(element: HTMLElement): ThemeColors {
	const probe = document.createElement('span');
	probe.hidden = true;
	element.appendChild(probe);
	const entries = Object.entries(TOKENS).map(([key, token]) => {
		probe.style.color = `var(${token})`;
		return [key, toRgba(getComputedStyle(probe).color)];
	});
	probe.remove();
	return Object.fromEntries(entries) as ThemeColors;
}
