<script lang="ts">
	import { untrack } from 'svelte';
	import type { Feature, FeatureCollection } from 'geojson';
	import type {
		ExpressionSpecification,
		FeatureIdentifier,
		MapGeoJSONFeature,
		MapMouseEvent
	} from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		featuresAt,
		plainGeoJSON,
		registerLayers,
		syncData,
		syncPaint
	} from './layer-sync.svelte.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	interface Props {
		/** GeoJSON to draw, or a URL to load it from. Changing it updates the source in place. */
		data: FeatureCollection | Feature | string;
		/** Source id; layers are `<id>-fill`, `<id>-line` and `<id>-circle`. Read once. */
		id?: string;
		/** Use this feature property as the feature id for hover state. Read once. */
		promoteId?: string;
		/** Polygon fill. Defaults to the theme's `--primary`. */
		fillColor?: string;
		fillOpacity?: number;
		/** Fill opacity of the hovered feature. */
		hoverFillOpacity?: number;
		/** Lines and polygon outlines. Defaults to the theme's `--primary`. */
		lineColor?: string;
		/** Line width in pixels. */
		lineWidth?: number;
		/** Line width of the hovered feature. */
		hoverLineWidth?: number;
		/** Points. Defaults to the theme's `--primary`. */
		circleColor?: string;
		/** Point radius in pixels. */
		circleRadius?: number;
		/** Point radius of the hovered feature. */
		hoverCircleRadius?: number;
		/** Draw below this layer when it exists. Read once. */
		beforeId?: string;
		/** Called with the clicked feature. */
		onclick?: (feature: MapGeoJSONFeature, event: MapMouseEvent) => void;
		/** Called when the pointer moves onto a feature, and with `null` when it leaves. */
		onhover?: (feature: MapGeoJSONFeature | null) => void;
	}

	let {
		data,
		id,
		promoteId,
		fillColor,
		fillOpacity = 0.2,
		hoverFillOpacity = 0.4,
		lineColor,
		lineWidth = 2,
		hoverLineWidth = 3,
		circleColor,
		circleRadius = 5,
		hoverCircleRadius = 7,
		beforeId,
		onclick,
		onhover
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-geojson-${uid}`);
	const fillId = `${sourceId}-fill`;
	const lineId = `${sourceId}-line`;
	const circleId = `${sourceId}-circle`;
	const layerIds = [fillId, lineId, circleId];

	const primary = $derived(ctx.colors?.primary ?? FALLBACK_COLOR);
	const background = $derived(ctx.colors?.background ?? FALLBACK_COLOR);
	const fill = $derived(fillColor ?? primary);
	const line = $derived(lineColor ?? primary);
	const circle = $derived(circleColor ?? primary);

	/** `hovered` while the pointer is on the feature, `normal` otherwise. */
	function byHover(hovered: number, normal: number): ExpressionSpecification {
		return ['case', ['boolean', ['feature-state', 'hover'], false], hovered, normal];
	}

	function geometryIs(...types: string[]): ExpressionSpecification {
		return ['match', ['geometry-type'], types, true, false];
	}

	function sourceData(): GeoJSONData {
		return typeof data === 'string' ? data : plainGeoJSON(data);
	}

	registerLayers(ctx, () => ({
		sourceId,
		source: promoteId
			? { type: 'geojson', data: sourceData(), promoteId }
			: { type: 'geojson', data: sourceData(), generateId: true },
		layers: [
			{
				id: fillId,
				type: 'fill',
				source: sourceId,
				filter: geometryIs('Polygon', 'MultiPolygon'),
				paint: { 'fill-color': fill, 'fill-opacity': byHover(hoverFillOpacity, fillOpacity) }
			},
			{
				id: lineId,
				type: 'line',
				source: sourceId,
				filter: geometryIs('LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'),
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: { 'line-color': line, 'line-width': byHover(hoverLineWidth, lineWidth) }
			},
			{
				id: circleId,
				type: 'circle',
				source: sourceId,
				filter: geometryIs('Point', 'MultiPoint'),
				paint: {
					'circle-color': circle,
					'circle-radius': byHover(hoverCircleRadius, circleRadius),
					'circle-stroke-color': background,
					'circle-stroke-width': 1
				}
			}
		],
		beforeId
	}));

	syncPaint(ctx, sourceId, fillId, 'fill-color', () => fill);
	syncPaint(ctx, sourceId, fillId, 'fill-opacity', () => byHover(hoverFillOpacity, fillOpacity));
	syncPaint(ctx, sourceId, lineId, 'line-color', () => line);
	syncPaint(ctx, sourceId, lineId, 'line-width', () => byHover(hoverLineWidth, lineWidth));
	syncPaint(ctx, sourceId, circleId, 'circle-color', () => circle);
	syncPaint(ctx, sourceId, circleId, 'circle-radius', () =>
		byHover(hoverCircleRadius, circleRadius)
	);
	syncPaint(ctx, sourceId, circleId, 'circle-stroke-color', () => background);

	let hoveredId: FeatureIdentifier['id'] | null = null;

	function setHovered(feature: MapGeoJSONFeature | null) {
		const next = feature?.id ?? null;
		if (next === hoveredId) return;
		if (hoveredId !== null) {
			ctx.layers.removeFeatureState({ source: sourceId, id: hoveredId }, 'hover');
		}
		hoveredId = next;
		if (next !== null) ctx.layers.setFeatureState({ source: sourceId, id: next }, { hover: true });
		onhover?.(feature);
	}

	syncData(ctx, sourceId, () => {
		const next = sourceData();
		// Generated ids are positions in the data, so new data must not inherit the hover.
		untrack(() => setHovered(null));
		return next;
	});

	function featureAt(event: MapMouseEvent): MapGeoJSONFeature | null {
		return featuresAt(event.target, event.point, layerIds)[0] ?? null;
	}

	$effect(() => {
		const map = ctx.map;
		if (!map) return;
		const canvas = map.getCanvas();
		// Only reset a cursor this layer set, so other layers keep theirs.
		let pointing = false;
		function point(on: boolean) {
			if (on === pointing) return;
			pointing = on;
			canvas.style.cursor = on ? 'pointer' : '';
		}
		const subscriptions = [
			map.on('mousemove', (event) => {
				const feature = featureAt(event);
				point(feature !== null);
				setHovered(feature);
			}),
			map.on('mouseout', () => {
				point(false);
				setHovered(null);
			}),
			map.on('click', (event) => {
				const feature = featureAt(event);
				if (feature) onclick?.(feature, event);
			})
		];
		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
			point(false);
			hoveredId = null;
		};
	});
</script>
