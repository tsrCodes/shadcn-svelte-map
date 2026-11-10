<script lang="ts" generics="P extends GeoJsonProperties = GeoJsonProperties">
	import { untrack, type Snippet } from 'svelte';
	import type { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
	import type { MapMouseEvent, Popup } from 'maplibre-gl';
	import { getMapContext } from './map-context.svelte.js';
	import {
		DEFAULT_POPUP_MAX_WIDTH,
		onPopupEscape,
		syncPopupLook,
		type PopupOffset
	} from './popup.svelte.js';
	import type { GeoJSONData } from './layer-registry.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	type PointFeature = Feature<Point, P>;

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
		/** Draw below this layer when it exists. Read once. */
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
		popupClass
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

	const fill = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const stroke = $derived(strokeColor ?? ctx.colors?.background ?? FALLBACK_COLOR);

	/** A plain copy of `data`; MapLibre posts it to a worker, which cannot take proxies. */
	function plainData(): GeoJSONData {
		return $state.snapshot(data) as GeoJSONData;
	}

	// Register once; the registry adds it when the style is ready and after every swap.
	$effect(() =>
		untrack(() =>
			ctx.layers.add({
				sourceId,
				// `generateId` numbers features by index, so a click maps back to `data`.
				source: { type: 'geojson', data: plainData(), generateId: true },
				layers: [
					{
						id: layerId,
						type: 'circle',
						source: sourceId,
						paint: {
							'circle-color': fill,
							'circle-radius': radius,
							'circle-stroke-color': stroke,
							'circle-stroke-width': strokeWidth
						}
					}
				],
				beforeId
			})
		)
	);

	let dataSynced = false;
	$effect(() => {
		const next = plainData();
		if (!dataSynced) {
			dataSynced = true;
			return;
		}
		ctx.layers.setData(sourceId, next);
	});

	$effect(() => ctx.layers.setPaintProperty(sourceId, layerId, 'circle-color', fill));
	$effect(() => ctx.layers.setPaintProperty(sourceId, layerId, 'circle-radius', radius));
	$effect(() => ctx.layers.setPaintProperty(sourceId, layerId, 'circle-stroke-color', stroke));
	$effect(() => ctx.layers.setPaintProperty(sourceId, layerId, 'circle-stroke-width', strokeWidth));

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
		const stopEscape = onPopupEscape(instance, () => (selected = null));
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
