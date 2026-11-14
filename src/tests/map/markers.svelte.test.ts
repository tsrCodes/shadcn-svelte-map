import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { MapContext } from '#lib/registry/ui/map/index.js';
import MarkersHarness, { type MarkerRefs } from './MarkersHarness.svelte';
import { DARK_STYLE, LIGHT_STYLE } from './fixtures.js';

type HarnessProps = NonNullable<Parameters<typeof render<typeof MarkersHarness>>[1]>;

const EMPTY_REFS: MarkerRefs = { marker: null, markerPopup: null, tooltip: null, popup: null };

const POINTS: FeatureCollection<Point, { name: string }> = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { name: 'North' },
			geometry: { type: 'Point', coordinates: [30, 20] }
		},
		{
			type: 'Feature',
			properties: { name: 'South' },
			geometry: { type: 'Point', coordinates: [-30, -20] }
		}
	]
};

const POINT_SOURCE = 'harness-points';
const POINT_LAYER = 'harness-points-circles';

async function mountMarkers(props: Partial<HarnessProps> = {}) {
	let context: MapContext | null = null;
	let refs = EMPTY_REFS;
	const screen = render(MarkersHarness, {
		...props,
		onrefs: (next: MarkerRefs) => (refs = next),
		oncontext: (value: MapContext) => (context = value)
	});
	await expect
		.poll(() => screen.container.querySelector('[data-slot="map"]')?.getAttribute('data-status'), {
			timeout: 15_000
		})
		.toBe('ready');
	const ctx = context as unknown as MapContext;
	return {
		screen,
		ctx,
		map: ctx.map as MapLibreMap,
		refs: () => refs,
		// Scoped to this render, so another mounted map can never answer.
		markerButton: () => findMarkerButton(screen.container)
	};
}

function findMarkerButton(root: ParentNode): HTMLButtonElement {
	const button = root.querySelector<HTMLButtonElement>('[data-slot="map-marker"]');
	if (!button) throw new Error('marker button not found');
	return button;
}

async function readyMarker(
	refs: () => MarkerRefs,
	markerButton: () => HTMLButtonElement
): Promise<HTMLButtonElement> {
	await expect.poll(() => refs().markerPopup !== null && refs().marker !== null).toBe(true);
	return markerButton();
}

afterEach(() => {
	document.documentElement.classList.remove('dark');
	vi.restoreAllMocks();
});

describe('MapMarker', () => {
	test('renders a labelled button inside the map, with the default dot', async () => {
		const { markerButton, map, refs } = await mountMarkers();
		const button = await readyMarker(refs, markerButton);
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('aria-label')).toBe('Cafe');
		expect(button.getAttribute('aria-haspopup')).toBe('dialog');
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(map.getCanvasContainer().contains(button)).toBe(true);
		expect(button.querySelector('[data-slot="map-marker-dot"]')).not.toBeNull();
		expect(button.querySelector('[data-slot="map-marker-label"]')?.textContent).toBe('Cafe');
	});

	test('blank aria-label falls back to a generic name and warns', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { markerButton, refs } = await mountMarkers({ markerLabel: '   ' });
		const button = await readyMarker(refs, markerButton);
		expect(button.getAttribute('aria-label')).toBe('Map marker');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('MapMarker'));
	});

	test('marker content replaces the default dot', async () => {
		const { markerButton, refs } = await mountMarkers({ customContent: true });
		const button = await readyMarker(refs, markerButton);
		await expect.poll(() => button.querySelector('[data-testid="custom"]')).not.toBeNull();
		expect(button.querySelector('[data-slot="map-marker-dot"]')).toBeNull();
	});

	test('clicking the marker opens its popup and leaves it open', async () => {
		const { markerButton, map, refs } = await mountMarkers();
		const button = await readyMarker(refs, markerButton);
		const mapClicked = new Promise((resolve) => map.once('click', resolve));
		await userEvent.click(button);
		// The same pointer event also fires a map click. Wait for it, then check it didn't close.
		await mapClicked;
		expect(refs().markerPopup?.isOpen()).toBe(true);
		expect(button.getAttribute('aria-expanded')).toBe('true');

		await userEvent.click(button);
		await expect.poll(() => refs().markerPopup?.isOpen()).toBe(false);
	});

	test('Tab to marker, Enter opens popup, Esc closes and refocuses marker', async () => {
		const { markerButton, map, refs } = await mountMarkers();
		const button = await readyMarker(refs, markerButton);

		map.getCanvas().focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(button);
		// Keyboard focus shows the tooltip, which describes the marker.
		await expect.poll(() => refs().tooltip?.isOpen()).toBe(true);
		const tooltipId = button.getAttribute('aria-describedby') ?? '';
		expect(tooltipId).not.toBe('');
		expect(document.getElementById(tooltipId)?.textContent).toContain('Open now');

		await userEvent.keyboard('{Enter}');
		const popup = refs().markerPopup;
		await expect.poll(() => popup?.isOpen()).toBe(true);
		expect(refs().tooltip?.isOpen()).toBe(false);
		await expect.poll(() => popup?.getElement()?.contains(document.activeElement)).toBe(true);
		const dialog = popup?.getElement()?.querySelector('[role="dialog"]');
		expect(dialog?.getAttribute('aria-label')).toBe('Cafe details');

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => popup?.isOpen()).toBe(false);
		expect(document.activeElement).toBe(button);
	});

	test('theme toggle keeps marker DOM node and open popup', async () => {
		const { markerButton, ctx, refs } = await mountMarkers({
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE }
		});
		const button = await readyMarker(refs, markerButton);
		const marker = refs().marker;
		const popup = refs().markerPopup;
		await userEvent.click(button);
		await expect.poll(() => popup?.isOpen()).toBe(true);

		const before = ctx.styleVersion;
		document.documentElement.classList.add('dark');
		await expect.poll(() => ctx.styleVersion).toBe(before + 1);

		expect(markerButton()).toBe(button);
		expect(button.isConnected).toBe(true);
		expect(refs().marker).toBe(marker);
		expect(refs().markerPopup).toBe(popup);
		expect(popup?.isOpen()).toBe(true);
	});

	test('changing popup offset / tooltip maxWidth updates the live instance', async () => {
		const { markerButton, screen, refs } = await mountMarkers({ showPopup: true });
		await readyMarker(refs, markerButton);
		await expect.poll(() => refs().popup !== null && refs().tooltip !== null).toBe(true);
		const { markerPopup, tooltip, popup } = refs();

		await screen.rerender({ showPopup: true, popupOffset: 32, tooltipMaxWidth: '120px' });

		await expect.poll(() => markerPopup?.options.offset).toBe(32);
		expect(popup?.options.offset).toBe(32);
		expect(tooltip?.options.maxWidth).toBe('120px');
		expect(refs().markerPopup).toBe(markerPopup);
		expect(refs().tooltip).toBe(tooltip);
		expect(refs().popup).toBe(popup);
	});

	test('moving popup coordinates keeps the same popup instance', async () => {
		const { markerButton, screen, refs } = await mountMarkers({ showPopup: true });
		const button = await readyMarker(refs, markerButton);
		await expect.poll(() => refs().popup?.isOpen()).toBe(true);
		const { popup, marker, markerPopup } = refs();

		await screen.rerender({ showPopup: true, popupLngLat: [20, 5] });
		await expect.poll(() => popup?.getLngLat().toArray()).toEqual([20, 5]);
		expect(refs().popup).toBe(popup);
		expect(popup?.isOpen()).toBe(true);

		// A moved marker keeps its instance and button, and its open popup follows it.
		await userEvent.click(button);
		await expect.poll(() => markerPopup?.isOpen()).toBe(true);
		await screen.rerender({ showPopup: true, popupLngLat: [20, 5], markerLngLat: [4, 3] });
		await expect.poll(() => marker?.getLngLat().toArray()).toEqual([4, 3]);
		expect(refs().marker).toBe(marker);
		expect(refs().markerPopup).toBe(markerPopup);
		expect(markerPopup?.isOpen()).toBe(true);
		expect(markerPopup?.getLngLat().toArray()).toEqual([4, 3]);
		expect(markerButton()).toBe(button);
	});

	test('a new anchor rebuilds the marker in place', async () => {
		const { screen, refs, markerButton } = await mountMarkers();
		await expect.poll(() => refs().marker).not.toBeNull();
		const first = refs().marker;
		expect(markerButton().classList).toContain('maplibregl-marker-anchor-center');

		await screen.rerender({ markerAnchor: 'bottom' });
		await expect.poll(() => refs().marker).not.toBe(first);
		expect(markerButton().classList).toContain('maplibregl-marker-anchor-bottom');
		expect(markerButton().isConnected).toBe(true);
	});

	test('standalone popup closes on Escape', async () => {
		const { refs } = await mountMarkers({ showPopup: true, showMarker: false });
		await expect.poll(() => refs().popup?.isOpen()).toBe(true);
		const popup = refs().popup;
		popup?.getElement()?.querySelector<HTMLElement>('.maplibregl-popup-close-button')?.focus();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => popup?.isOpen()).toBe(false);
	});
});

describe('MapPointLayer', () => {
	async function clickPoint(map: MapLibreMap, lngLat: [number, number]) {
		const point = map.project(lngLat);
		await expect
			.poll(() => map.queryRenderedFeatures(point, { layers: [POINT_LAYER] }).length)
			.toBeGreaterThan(0);
		await userEvent.click(map.getCanvas(), { position: { x: point.x, y: point.y } });
	}

	function pointPopupText(): string | null | undefined {
		return document.querySelector('[data-testid="point-popup"]')?.textContent;
	}

	test('click opens an HTML popup for the point', async () => {
		const onpointclick = vi.fn();
		const { map } = await mountMarkers({ showMarker: false, points: POINTS, onpointclick });

		await clickPoint(map, [30, 20]);
		await expect.poll(() => onpointclick.mock.calls[0]).toEqual(['North', 0]);
		await expect.poll(pointPopupText).toBe('North');

		await clickPoint(map, [-30, -20]);
		await expect.poll(pointPopupText).toBe('South');
	});

	test('changing data and colour updates the live source and layer', async () => {
		const { screen, map } = await mountMarkers({ showMarker: false, points: POINTS });
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		const source = map.getSource<GeoJSONSource>(POINT_SOURCE);
		if (!source) throw new Error(`Source "${POINT_SOURCE}" is missing.`);

		const fewer: typeof POINTS = { type: 'FeatureCollection', features: [POINTS.features[0]] };
		await screen.rerender({ showMarker: false, points: fewer, pointColor: 'rgb(255, 0, 0)' });

		await expect
			.poll(() => map.getPaintProperty(POINT_LAYER, 'circle-color'))
			.toBe('rgb(255, 0, 0)');
		expect(map.getSource(POINT_SOURCE)).toBe(source);
		await expect
			.poll(async () => ((await source.getData()) as FeatureCollection).features.length)
			.toBe(1);
	});

	function pointList(root: ParentNode) {
		const list = root.querySelector<HTMLElement>('[role="listbox"][data-slot="map-feature-list"]');
		if (!list) throw new Error('feature list not found');
		return {
			list,
			options: () => [...list.querySelectorAll<HTMLElement>('[role="option"]')],
			active: () => {
				const id = list.getAttribute('aria-activedescendant');
				return id ? document.getElementById(id) : null;
			},
			activeLabel: () => {
				const id = list.getAttribute('aria-activedescendant');
				return id ? document.getElementById(id)?.textContent?.trim() : undefined;
			}
		};
	}

	test('keyboard: one tab stop, arrows move, Enter opens the popup, Esc returns focus', async () => {
		const onpointclick = vi.fn();
		const { screen, map } = await mountMarkers({ showMarker: false, points: POINTS, onpointclick });
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		const { list, options, active, activeLabel } = pointList(screen.container);
		expect(list.getAttribute('aria-label')).toBe('Cafes');
		expect(list.tabIndex).toBe(0);
		expect(options().map((option) => option.textContent?.trim())).toEqual(['North', 'South']);

		list.focus();
		await expect.poll(activeLabel).toBe('North');
		await userEvent.keyboard('{ArrowDown}');
		await expect.poll(activeLabel).toBe('South');
		expect(active()?.getAttribute('aria-posinset')).toBe('2');
		await expect
			.poll(() => map.getFeatureState({ source: POINT_SOURCE, id: 1 }).focused)
			.toBe(true);

		await userEvent.keyboard('{Enter}');
		await expect.poll(() => onpointclick.mock.calls[0]).toEqual(['South', 1]);
		await expect.poll(pointPopupText).toBe('South');

		await userEvent.keyboard('{Escape}');
		await expect.poll(pointPopupText).toBeUndefined();
		expect(document.activeElement).toBe(list);
	});

	test('a large layer renders only a few options but announces the full count', async () => {
		const many: typeof POINTS = {
			type: 'FeatureCollection',
			features: Array.from({ length: 1000 }, (_, index) => ({
				type: 'Feature' as const,
				properties: { name: `Cafe ${index + 1}` },
				geometry: {
					type: 'Point' as const,
					coordinates: [(index % 100) - 50, Math.floor(index / 100)]
				}
			}))
		};
		const { screen } = await mountMarkers({ showMarker: false, points: many });
		const { list, options, activeLabel } = pointList(screen.container);
		expect(options().length).toBeLessThanOrEqual(7);
		expect(options()[0].getAttribute('aria-setsize')).toBe('1000');

		list.focus();
		await userEvent.keyboard('{End}');
		await expect.poll(activeLabel).toBe('Cafe 1000');
		expect(options().length).toBeLessThanOrEqual(7);
	});

	test('focusing a point off screen brings it into view', async () => {
		const far: typeof POINTS = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { name: 'Far' },
					geometry: { type: 'Point', coordinates: [150, 60] }
				}
			]
		};
		const { screen, map } = await mountMarkers({ showMarker: false, points: far });
		expect(map.getBounds().contains([150, 60])).toBe(false);
		pointList(screen.container).list.focus();
		await expect.poll(() => map.getBounds().contains([150, 60])).toBe(true);
	});

	test('keyboard={false} leaves the list out', async () => {
		const { screen, map } = await mountMarkers({
			showMarker: false,
			points: POINTS,
			pointsKeyboard: false
		});
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		expect(screen.container.querySelector('[data-slot="map-feature-list"]')).toBeNull();
	});

	test('a new beforeId moves the live layer', async () => {
		const { screen, map } = await mountMarkers({
			showMarker: false,
			points: POINTS,
			mapStyle: DARK_STYLE
		});
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		expect(map.getLayersOrder()).toEqual(['background', 'overlay', POINT_LAYER]);

		await screen.rerender({
			showMarker: false,
			points: POINTS,
			mapStyle: DARK_STYLE,
			pointsBeforeId: 'overlay'
		});
		await expect.poll(() => map.getLayersOrder()).toEqual(['background', POINT_LAYER, 'overlay']);
	});

	test('theme colours follow the theme without rebuilding the layer', async () => {
		const { ctx, map } = await mountMarkers({
			showMarker: false,
			points: POINTS,
			mapStyle: { light: LIGHT_STYLE, dark: DARK_STYLE }
		});
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		const light = map.getPaintProperty(POINT_LAYER, 'circle-color');
		expect(light).toBe(ctx.colors?.primary);

		const before = ctx.styleVersion;
		document.documentElement.classList.add('dark');
		await expect.poll(() => ctx.styleVersion).toBe(before + 1);
		await expect.poll(() => map.getPaintProperty(POINT_LAYER, 'circle-color')).not.toBe(light);
		expect(map.getPaintProperty(POINT_LAYER, 'circle-color')).toBe(ctx.colors?.primary);
	});
});

describe('cleanup', () => {
	test('unmount removes markers, popups, point layers and listeners', async () => {
		const { markerButton, screen, map, refs } = await mountMarkers({
			showPopup: true,
			points: POINTS
		});
		const button = await readyMarker(refs, markerButton);
		await userEvent.click(button);
		await expect.poll(() => refs().markerPopup?.isOpen()).toBe(true);
		await expect.poll(() => Boolean(map.getLayer(POINT_LAYER))).toBe(true);
		expect(map.listens('click')).toBe(true);

		await screen.rerender({ showMarker: false, showPopup: false, points: undefined });

		await expect.poll(() => button.isConnected).toBe(false);
		expect(map.getContainer().querySelector('.maplibregl-marker')).toBeNull();
		expect(map.getContainer().querySelector('.maplibregl-popup')).toBeNull();
		expect(map.getLayer(POINT_LAYER)).toBeUndefined();
		expect(map.getSource(POINT_SOURCE)).toBeUndefined();
		expect(map.listens('click')).toBe(false);
		expect(map.listens('mousemove')).toBe(false);
		expect(refs()).toEqual(EMPTY_REFS);
	});
});
