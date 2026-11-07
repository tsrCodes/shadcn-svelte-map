import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from '#lib/registry/ui/map/index.js';
import ControlsHarness from './ControlsHarness.svelte';
import { PHOTON_BODY } from './fixtures.js';

type HarnessProps = NonNullable<Parameters<typeof render<typeof ControlsHarness>>[1]>;

const CAMERA_EVENTS = ['move', 'zoom', 'rotate', 'pitch', 'resize'];

async function mountControls(props: Partial<HarnessProps> = {}) {
	let context: MapContext | null = null;
	const screen = render(ControlsHarness, {
		...props,
		oncontext: (value: MapContext) => (context = value)
	});
	await expect
		.poll(() => screen.container.querySelector('[data-slot="map"]')?.getAttribute('data-status'), {
			timeout: 15_000
		})
		.toBe('ready');
	const ctx = context as unknown as MapContext;
	const root = screen.container.querySelector<HTMLElement>('[data-slot="map"]');
	if (!root) throw new Error('map root not found');
	return { screen, ctx, map: ctx.map as MapLibreMap, root };
}

function button(root: ParentNode, name: string): HTMLButtonElement {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(element) => element.getAttribute('aria-label') === name
	);
	if (!found) throw new Error(`button "${name}" not found`);
	return found;
}

function stubReducedMotion() {
	const realMatchMedia = window.matchMedia.bind(window);
	vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
		if (!query.includes('prefers-reduced-motion')) return realMatchMedia(query);
		const reduced: Partial<MediaQueryList> = {
			matches: true,
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {}
		};
		return reduced as MediaQueryList;
	});
}

function fix(lng: number, lat: number): GeolocationPosition {
	return {
		coords: { longitude: lng, latitude: lat, accuracy: 5 },
		timestamp: 0
	} as GeolocationPosition;
}

/** Counts camera listeners added and removed through the public `on` and `off`. */
function trackListeners(map: MapLibreMap) {
	const on = vi.spyOn(map, 'on');
	const off = vi.spyOn(map, 'off');
	const count = (calls: unknown[][]) =>
		calls.filter((call) => CAMERA_EVENTS.includes(String(call[0]))).length;
	return { added: () => count(on.mock.calls), removed: () => count(off.mock.calls) };
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	vi.restoreAllMocks();
});

describe('MapControlContainer', () => {
	test('stacks controls in the corner it is given', async () => {
		const { root } = await mountControls();
		const corners = [...root.querySelectorAll<HTMLElement>('[data-slot="map-control-container"]')];
		expect(corners.map((corner) => corner.dataset.position)).toEqual([
			'top-left',
			'top-right',
			'bottom-left'
		]);
		expect(getComputedStyle(corners[1]).position).toBe('absolute');
		expect(corners[1].querySelector('[data-slot="map-zoom-control"]')).not.toBeNull();
	});
});

describe('zoom and compass', () => {
	test('zoom buttons step the zoom and switch off at the limits', async () => {
		const { root, map } = await mountControls();
		map.jumpTo({ zoom: 3 });
		await userEvent.click(button(root, 'Zoom in'));
		await expect.poll(() => map.getZoom()).toBeCloseTo(4);

		map.setMaxZoom(5);
		map.jumpTo({ zoom: 5 });
		await expect.poll(() => button(root, 'Zoom in').disabled).toBe(true);
		expect(button(root, 'Zoom out').disabled).toBe(false);
	});

	test('compass needle follows the bearing and resets to north', async () => {
		const { root, map } = await mountControls();
		const needle = root.querySelector<SVGElement>('[data-slot="map-compass-needle"]');
		map.jumpTo({ bearing: 90, pitch: 30 });
		await expect.poll(() => needle?.style.transform).toBe('rotateX(30deg) rotate(-90deg)');

		await userEvent.click(button(root, 'Reset bearing to north'));
		await expect.poll(() => map.getBearing()).toBeCloseTo(0);
		expect(map.getPitch()).toBeCloseTo(0);
	});

	test('reduced motion makes flyTo and zoom duration 0 for controls', async () => {
		stubReducedMotion();
		vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success) =>
			success(fix(10, 20))
		);
		vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify(PHOTON_BODY)));
		const { root, ctx, map } = await mountControls();
		expect(ctx.reducedMotion).toBe(true);
		map.jumpTo({ zoom: 2, bearing: 45 });

		await userEvent.click(button(root, 'Zoom in'));
		expect(map.isMoving()).toBe(false);
		expect(map.getZoom()).toBeCloseTo(3);

		await userEvent.click(button(root, 'Reset bearing to north'));
		expect(map.isMoving()).toBe(false);
		expect(map.getBearing()).toBeCloseTo(0);

		await userEvent.click(button(root, 'Show my location'));
		expect(map.isMoving()).toBe(false);
		expect(map.getCenter().lng).toBeCloseTo(10);
		expect(map.getZoom()).toBeCloseTo(14);

		const input = root.querySelector<HTMLInputElement>('[data-slot="place-autocomplete"] input');
		await userEvent.type(input as HTMLInputElement, 'corner');
		const option = await vi.waitFor(() => {
			const found = [...root.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find(
				(item) => item.textContent?.includes('Corner Shop')
			);
			if (!found) throw new Error('no result yet');
			return found;
		});
		await userEvent.click(option);
		expect(map.isMoving()).toBe(false);
		expect(map.getCenter().lng).toBeCloseTo(30);
		expect(map.getZoom()).toBeCloseTo(15);
	});
});

describe('MapScaleControl', () => {
	test('shows a rounded distance and follows unit and width changes', async () => {
		const { screen, root, map } = await mountControls();
		map.jumpTo({ center: [0, 0], zoom: 10 });
		const scale = () => root.querySelector<HTMLElement>('[data-slot="map-scale-control"]');
		const bar = () => root.querySelector<HTMLElement>('[data-slot="map-scale-bar"]');
		await expect.poll(() => scale()?.getAttribute('aria-label')).toMatch(/^Map scale: \d+ (m|km)$/);
		expect(parseInt(bar()?.style.width ?? '', 10)).toBeLessThanOrEqual(100);

		await screen.rerender({ scaleUnit: 'imperial', scaleMaxWidth: 60 });
		await expect
			.poll(() => scale()?.getAttribute('aria-label'))
			.toMatch(/^Map scale: \d+ (ft|mi)$/);
		expect(parseInt(bar()?.style.width ?? '', 10)).toBeLessThanOrEqual(60);
	});
});

describe('MapFullscreenControl', () => {
	test('fullscreen toggles icon; CSS fallback when API missing', async () => {
		const onfullscreen = vi.fn();
		const { root } = await mountControls({ onfullscreen });
		let fullscreenElement: Element | null = null;
		vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(true);
		vi.spyOn(document, 'fullscreenElement', 'get').mockImplementation(() => fullscreenElement);
		vi.spyOn(root, 'requestFullscreen').mockImplementation(async () => {
			fullscreenElement = root;
			document.dispatchEvent(new Event('fullscreenchange'));
		});
		vi.spyOn(document, 'exitFullscreen').mockImplementation(async () => {
			fullscreenElement = null;
			document.dispatchEvent(new Event('fullscreenchange'));
		});
		const icon = () => root.querySelector('[data-slot="map-fullscreen-control"] svg');

		// With the Fullscreen API.
		expect(icon()?.getAttribute('data-icon')).toBe('maximize');
		await userEvent.click(button(root, 'Enter fullscreen'));
		await expect.poll(() => icon()?.getAttribute('data-icon')).toBe('minimize');
		expect(fullscreenElement).toBe(root);
		await userEvent.click(button(root, 'Exit fullscreen'));
		await expect.poll(() => icon()?.getAttribute('data-icon')).toBe('maximize');
		expect(onfullscreen.mock.calls).toEqual([[true], [false]]);

		// Without it, as on iPhone Safari: the map is pinned over the page with CSS.
		vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(false);
		await userEvent.click(button(root, 'Enter fullscreen'));
		await expect.poll(() => root.dataset.fullscreen).toBe('fallback');
		expect(icon()?.getAttribute('data-icon')).toBe('minimize');
		expect(getComputedStyle(root).position).toBe('fixed');
		expect(document.documentElement.hasAttribute('data-map-fullscreen')).toBe(true);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => root.dataset.fullscreen).toBeUndefined();
		expect(document.documentElement.hasAttribute('data-map-fullscreen')).toBe(false);
		expect(icon()?.getAttribute('data-icon')).toBe('maximize');
	});
});

describe('MapLocateControl', () => {
	test('a fix flies there, shows the dot and calls onlocationfound', async () => {
		vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success) =>
			success(fix(12, 34))
		);
		const onlocationfound = vi.fn();
		const { root, map } = await mountControls({ onlocationfound });
		await userEvent.click(button(root, 'Show my location'));

		expect(onlocationfound).toHaveBeenCalledTimes(1);
		const dot = root.querySelector('[data-slot="map-locate-dot"]');
		expect(dot?.parentElement).toBe(map.getCanvasContainer());
		await expect.poll(() => map.getCenter().lng, { timeout: 5_000 }).toBeCloseTo(12);
	});

	test('a denied permission calls onerror and shows the error state', async () => {
		const denied = { code: 1, message: 'User denied Geolocation' } as GeolocationPositionError;
		vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((_success, failure) =>
			failure?.(denied)
		);
		const onlocateerror = vi.fn();
		const { root, map } = await mountControls({ onlocateerror });
		await userEvent.click(button(root, 'Show my location'));

		expect(onlocateerror).toHaveBeenCalledWith(denied);
		const control = root.querySelector<HTMLElement>('[data-slot="map-locate-control"]');
		expect(control?.dataset.status).toBe('error');
		expect(map.getCanvasContainer().querySelector('[data-slot="map-locate-dot"]')).toBeNull();
	});

	test('changing watch stops the live watch', async () => {
		let report: PositionCallback = () => {};
		vi.spyOn(navigator.geolocation, 'watchPosition').mockImplementation((success) => {
			report = success;
			return 7;
		});
		const clearWatch = vi.spyOn(navigator.geolocation, 'clearWatch').mockImplementation(() => {});
		const { screen, root, map } = await mountControls({ watch: true });

		await userEvent.click(button(root, 'Show my location'));
		report(fix(5, 5));
		await expect
			.poll(() => button(root, 'Stop following my location').getAttribute('aria-pressed'))
			.toBe('true');
		expect(root.querySelector('[data-slot="map-locate-dot"]')?.parentElement).toBe(
			map.getCanvasContainer()
		);

		await screen.rerender({ watch: false });
		await expect.poll(() => clearWatch.mock.calls).toEqual([[7]]);
		expect(button(root, 'Show my location')).toBeTruthy();
		expect(map.getCanvasContainer().querySelector('[data-slot="map-locate-dot"]')).toBeNull();
	});
});

describe('MapBasemapControl', () => {
	test('the menu opens inside the map, switches basemap and toggles overlays', async () => {
		const { root, ctx, map } = await mountControls();
		expect(map.getLayer('overlay')).toBeUndefined();

		await userEvent.click(button(root, 'Map layers'));
		const menu = await vi.waitFor(() => {
			const found = document.querySelector<HTMLElement>('[data-slot="map-basemap-menu"]');
			if (!found) throw new Error('menu not open');
			return found;
		});
		expect(root.contains(menu)).toBe(true);

		const before = ctx.styleVersion;
		const dark = [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find(
			(item) => item.textContent?.trim() === 'Dark'
		);
		await userEvent.click(dark as HTMLElement);
		await expect.poll(() => ctx.styleVersion).toBe(before + 1);
		expect(map.getLayer('overlay')).toBeDefined();
		// The menu stays open after a pick, so basemaps are easy to compare.
		expect(menu.dataset.state).toBe('open');

		const zones = [...menu.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')].find(
			(item) => item.textContent?.trim() === 'Zones'
		);
		await userEvent.click(zones as HTMLElement);
		await expect
			.poll(() => document.querySelector('[data-testid="overlays"]')?.textContent)
			.toBe('zones');
	});

	test('a new value swaps the style; removing the control gives the map its own style back', async () => {
		const { screen, ctx, map } = await mountControls();
		const before = ctx.styleVersion;
		await screen.rerender({ basemap: 'dark' });
		await expect.poll(() => ctx.styleVersion).toBe(before + 1);
		expect(map.getLayer('overlay')).toBeDefined();

		await screen.rerender({ showBasemap: false });
		await expect.poll(() => ctx.styleVersion).toBe(before + 2);
		expect(map.getLayer('overlay')).toBeUndefined();
		expect(ctx.basemap).toBeNull();
	});
});

describe('MapSearchControl', () => {
	test('picking an area fits its bounds', async () => {
		vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify(PHOTON_BODY)));
		const onselect = vi.fn();
		const { root, map } = await mountControls({ onselect });
		const input = root.querySelector<HTMLInputElement>('[data-slot="place-autocomplete"] input');
		await userEvent.type(input as HTMLInputElement, 'central');
		const option = await vi.waitFor(() => {
			const found = root.querySelector<HTMLElement>('[data-slot="command-item"]');
			if (!found) throw new Error('no result yet');
			return found;
		});
		await userEvent.click(option);

		expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Central Square' }));
		expect(input?.value).toBe('Central Square');
		await expect.poll(() => map.getCenter().lng, { timeout: 5_000 }).toBeCloseTo(21, 0);
		expect(root.querySelector('[data-slot="place-autocomplete-results"]')).toBeNull();
	});
});

describe('cleanup', () => {
	test('unmount removes sources, layers and listeners', async () => {
		vi.spyOn(navigator.geolocation, 'watchPosition').mockImplementation((success) => {
			success(fix(1, 1));
			return 3;
		});
		const clearWatch = vi.spyOn(navigator.geolocation, 'clearWatch').mockImplementation(() => {});
		vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(false);
		const { screen, root, ctx, map } = await mountControls({ showControls: false, watch: true });
		const listeners = trackListeners(map);

		await screen.rerender({ showControls: true, watch: true });
		await expect.poll(() => listeners.added()).toBeGreaterThan(0);
		await userEvent.click(button(root, 'Show my location'));
		await userEvent.click(button(root, 'Enter fullscreen'));
		await expect.poll(() => root.dataset.fullscreen).toBe('fallback');

		await screen.rerender({ showControls: false, watch: true });
		expect(listeners.removed()).toBe(listeners.added());
		expect(clearWatch).toHaveBeenCalledWith(3);
		expect(root.querySelector('[data-slot="map-locate-dot"]')).toBeNull();
		expect(root.dataset.fullscreen).toBeUndefined();
		expect(document.documentElement.hasAttribute('data-map-fullscreen')).toBe(false);
		expect(ctx.basemap).toBeNull();
		expect(root.querySelector('[data-slot="map-control-container"]')).toBeNull();
	});
});
