<script lang="ts" generics="P extends GeoJsonProperties = GeoJsonProperties">
	import { untrack, type Snippet } from 'svelte';
	import type { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
	import type { ExpressionSpecification, MapMouseEvent, Popup } from 'maplibre-gl';
	import { getMapContext } from './map-context.svelte.js';
	import {
		DEFAULT_POPUP_MAX_WIDTH,
		onPopupEscape,
		syncPopupLook,
		type PopupOffset
	} from './popup.svelte.js';
	import {
		plainGeoJSON,
		registerLayers,
		syncBeforeId,
		syncData,
		syncPaint
	} from './layer-sync.svelte.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';
	import MapFeatureList, { pointItems } from './map-feature-list.svelte';

	type PointFeature = Feature<Point, P>;

	/** Extra outline width, in pixels, of the point with keyboard focus. */
	const FOCUS_STROKE_EXTRA = 3;

	interface Props {
		/** Points to draw. Replace or change it to update the map without rebuilding the layer. */
		data: FeatureCollection<Point, P>;
		/** Source id; the circle layer is `<id>-circles`. Read once. Defaults to a unique id. */
		id?: string;
		/** Fill colour. Defaults to the theme's `--primary`. */
		color?: string;
		/** Radius in pixels. */
		radius?: number;
		/** Outline colour. Defaults to the theme's `--background`. */
		strokeColor?: string;
		/** Outline width in pixels. */
		strokeWidth?: number;
		/** Draw below this layer when it exists; changing it moves the layers. */
		beforeId?: string;
		/** Called with the clicked point and its index in `data.features`. */
		onclick?: (feature: PointFeature, index: number) => void;
		/** Popup shown when a point is clicked. */
		popup?: Snippet<[PointFeature]>;
		/** Accessible name of the popup. */
		popupLabel?: string;
		/** Pixel offset of the popup from the point. */
		popupOffset?: PopupOffset;
		/** Largest width of the popup, as CSS. */
		popupMaxWidth?: string;
		/** Classes for the popup content. */
		popupClass?: string;
		/**
		 * Offer the points to keyboard and screen reader users as a list, one tab stop on
		 * the map. Turn it off for very large data sets you make reachable another way.
		 */
		keyboard?: boolean;
		/** Accessible name of the keyboard list, such as "Stores". */
		listLabel?: string;
		/** Name of a point in the keyboard list. Defaults to its `name` property. */
		featureLabel?: (feature: PointFeature, index: number) => string;
	}

	let {
		data,
		id,
		color,
		radius = 6,
		strokeColor,
		strokeWidth = 2,
		beforeId,
		onclick,
		popup,
		popupLabel,
		popupOffset = 10,
		popupMaxWidth = DEFAULT_POPUP_MAX_WIDTH,
		popupClass,
		keyboard = true,
		listLabel = 'Points',
		featureLabel
	}: Props = $props();

	interface Selection {
		feature: PointFeature;
		index: number;
	}

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-points-${uid}`);
	const layerId = `${sourceId}-circles`;

	let selected = $state.raw<Selection | null>(null);
	let content = $state.raw<HTMLDivElement | null>(null);
	let popupInstance = $state.raw<Popup | null>(null);
	/** The list item that opened the popup, focused again when Escape closes it. */
	let returnFocus: HTMLElement | null = null;
	/** Feature id with keyboard focus; `generateId` makes ids the index in `data`. */
	let focusedId: number | null = null;

	const fill = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const stroke = $derived(strokeColor ?? ctx.colors?.background ?? FALLBACK_COLOR);
	/** The point with keyboard focus gets a thicker outline. */
	const strokeWidthPaint = $derived<ExpressionSpecification>([
		'case',
		['boolean', ['feature-state', 'focused'], false],
		strokeWidth + FOCUS_STROKE_EXTRA,
		strokeWidth
	]);
	const listItems = $derived(keyboard ? pointItems(data.features, featureLabel) : []);

	// Register once; the registry adds it when the style is ready and after every swap.
	registerLayers(ctx, () => ({
		sourceId,
		// `generateId` numbers features by index, so a click maps back to `data`.
		source: { type: 'geojson', data: plainGeoJSON(data), generateId: true },
		layers: [
			{
				id: layerId,
				type: 'circle',
				source: sourceId,
				paint: {
					'circle-color': fill,
					'circle-radius': radius,
					'circle-stroke-color': stroke,
					'circle-stroke-width': strokeWidthPaint
				}
			}
		],
		beforeId
	}));
	syncData(ctx, sourceId, () => plainGeoJSON(data));
	syncBeforeId(ctx, sourceId, () => beforeId);
	syncPaint(ctx, sourceId, layerId, 'circle-color', () => fill);
	syncPaint(ctx, sourceId, layerId, 'circle-radius', () => radius);
	syncPaint(ctx, sourceId, layerId, 'circle-stroke-color', () => stroke);
	syncPaint(ctx, sourceId, layerId, 'circle-stroke-width', () => strokeWidthPaint);

	function select(index: number, element: HTMLElement) {
		const feature = data.features[index];
		if (!feature) return;
		returnFocus = element;
		selected = { feature, index };
		onclick?.(feature, index);
	}

	function highlight(index: number | null) {
		if (focusedId !== null)
			ctx.layers.removeFeatureState({ source: sourceId, id: focusedId }, 'focused');
		focusedId = index;
		if (index !== null)
			ctx.layers.setFeatureState({ source: sourceId, id: index }, { focused: true });
	}

	function featureAt(event: MapMouseEvent): Selection | null {
		const map = ctx.map;
		if (!map?.getLayer(layerId)) return null;
		const hit = map.queryRenderedFeatures(event.point, { layers: [layerId] })[0];
		const index = Number(hit?.id);
		const feature = Number.isInteger(index) ? data.features[index] : undefined;
		return feature ? { feature, index } : null;
	}

	$effect(() => {
		const map = ctx.map;
		if (!map) return;
		const canvas = map.getCanvas();
		const subscriptions = [
			map.on('click', (event) => {
				const hit = featureAt(event);
				returnFocus = null;
				selected = hit;
				if (hit) onclick?.(hit.feature, hit.index);
			}),
			map.on('mouseenter', layerId, () => (canvas.style.cursor = 'pointer')),
			map.on('mouseleave', layerId, () => (canvas.style.cursor = ''))
		];
		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
			canvas.style.cursor = '';
		};
	});

	// One popup for the whole layer; it moves to whichever point is selected.
	$effect(() => {
		const lib = ctx.maplibre;
		const node = content;
		if (!lib || !node) return;
		const instance = untrack(() =>
			new lib.Popup({
				closeOnClick: false,
				focusAfterOpen: true,
				offset: popupOffset,
				maxWidth: popupMaxWidth,
				className: 'map-popup'
			}).setDOMContent(node)
		);
		const stopEscape = onPopupEscape(instance, () => {
			selected = null;
			returnFocus?.focus();
			returnFocus = null;
		});
		const closed = instance.on('close', () => (selected = null));
		popupInstance = instance;
		return () => {
			stopEscape();
			closed.unsubscribe();
			instance.remove();
			popupInstance = null;
		};
	});

	$effect(() => {
		const instance = popupInstance;
		const map = ctx.map;
		const selection = selected;
		if (!instance || !map) return;
		untrack(() => {
			if (!selection) {
				if (instance.isOpen()) instance.remove();
				return;
			}
			const [lng, lat] = selection.feature.geometry.coordinates;
			instance.setLngLat([lng, lat]);
			if (!instance.isOpen()) instance.addTo(map);
		});
	});

	syncPopupLook(
		() => popupInstance,
		() => ({ offset: popupOffset, maxWidth: popupMaxWidth, className: popupClass })
	);
</script>

{#if popup && ctx.map}
	<div hidden data-slot="map-point-popup-holder">
		<div bind:this={content} role="dialog" aria-label={popupLabel} data-slot="map-point-popup">
			{#if selected}
				{#key selected.index}
					{@render popup(selected.feature)}
				{/key}
			{/if}
		</div>
	</div>
{/if}

{#if keyboard && ctx.map}
	<MapFeatureList items={listItems} label={listLabel} onselect={select} onactive={highlight} />
{/if}
