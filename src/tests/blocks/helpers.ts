import '../../routes/layout.css';
import type { Component } from 'svelte';
import { expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { MapStyle } from '#lib/registry/ui/map/index.js';
import { LIGHT_STYLE } from '../map/fixtures.js';

export type Pixel = [number, number];

/** Toolbars sit along the top of the map; pointer input stays below this line. */
const TOOLBAR_CLEARANCE = 56;
/** Blocks are page-sized; this box fits the test browser's narrow viewport. */
const BLOCK_CLASS = 'h-[720px] w-[400px]';

interface BlockProps {
	mapStyle?: MapStyle;
	class?: string;
}

/** Render a block on an offline style and wait until its map has loaded. */
export async function mountBlock<P extends BlockProps>(
	block: Component<P>,
	props: Partial<P> = {}
) {
	const screen = render(block as Component<BlockProps>, {
		mapStyle: LIGHT_STYLE,
		class: BLOCK_CLASS,
		...props
	});
	const root = () => screen.container.querySelector<HTMLElement>('[data-slot="map"]');
	await expect.poll(() => root()?.dataset.status, { timeout: 15_000 }).toBe('ready');
	const map = root() as HTMLElement;
	// MapLibre's own canvas takes the pointer; other canvases (overlays, icons) must not.
	const canvas = map.querySelector<HTMLCanvasElement>(
		'[data-slot="map-canvas"] canvas.maplibregl-canvas'
	);
	if (!canvas) throw new Error('map canvas not found');
	return { screen, map, canvas, pointer: pointer(canvas) };
}

/** The button with this accessible name, inside `root`. */
export function button(root: ParentNode, name: string): HTMLButtonElement {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(element) => element.getAttribute('aria-label') === name || element.textContent?.trim() === name
	);
	if (!found) throw new Error(`button "${name}" not found`);
	return found;
}

/** Where an element's middle sits, in canvas pixels. */
export function pixelOf(canvas: HTMLCanvasElement, element: Element): Pixel {
	const box = element.getBoundingClientRect();
	const frame = canvas.getBoundingClientRect();
	return [box.left + box.width / 2 - frame.left, box.top + box.height / 2 - frame.top];
}

/** Clicks and moves on the canvas that fail loudly when they would miss it or hit a toolbar. */
export function pointer(canvas: HTMLCanvasElement) {
	const inside = ([x, y]: Pixel) => {
		expect(x).toBeGreaterThan(0);
		expect(x).toBeLessThan(canvas.clientWidth);
		expect(y).toBeGreaterThan(TOOLBAR_CLEARANCE);
		expect(y).toBeLessThan(canvas.clientHeight);
		return { x, y };
	};
	return {
		click: (at: Pixel) => userEvent.click(canvas, { position: inside(at) }),
		move: (at: Pixel) => userEvent.hover(canvas, { position: inside(at) }),
		/** Draw a rectangle with the rectangle tool already picked. */
		async rectangle(from: Pixel, to: Pixel) {
			await userEvent.click(canvas, { position: inside(from) });
			await userEvent.hover(canvas, { position: inside(to) });
			await userEvent.click(canvas, { position: inside(to) });
		}
	};
}
