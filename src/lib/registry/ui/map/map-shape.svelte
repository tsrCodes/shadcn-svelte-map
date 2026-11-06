<script lang="ts" module>
	import type { MapMouseEvent } from 'maplibre-gl';

	/** Look and behaviour every shape shares. */
	export interface ShapeProps {
		/** Source id; layers are `<id>-fill` and `<id>-line`. Read once. Defaults to a unique id. */
		id?: string;
		/** Outline colour. Defaults to the theme's `--primary`. */
		color?: string;
		/** Outline width in pixels. */
		width?: number;
		/** Outline opacity, 0 to 1. */
		opacity?: number;
		/** Dash pattern in line widths, such as `[2, 2]`. */
		dashArray?: number[];
		/** Draw below this layer when it exists. Read once. */
		beforeId?: string;
		/** Called when the shape is clicked. */
		onclick?: (event: MapMouseEvent) => void;
	}

	/** Extra look for shapes with an inside. */
	export interface FilledShapeProps extends ShapeProps {
		/** Fill colour. Defaults to `color`. */
		fillColor?: string;
		/** Fill opacity, 0 to 1. */
		fillOpacity?: number;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { LineString, Polygon } from 'geojson';
	import type { LayerSpecification } from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import { plainGeoJSON, registerLayers, syncData, syncPaint } from './layer-sync.svelte.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	interface Props extends FilledShapeProps {
		/** The shape. A polygon also gets a fill layer. Its type is read once. */
		geometry: Polygon | LineString;
		/** Prefix of the generated source id. Read once. */
		kind: string;
	}

	let {
		geometry,
		kind,
		id,
		color,
		width = 2,
		opacity = 1,
		dashArray,
		fillColor,
		fillOpacity = 0.2,
		beforeId,
		onclick
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-${kind}-${uid}`);
	const fillId = `${sourceId}-fill`;
	const lineId = `${sourceId}-line`;
	const filled = untrack(() => geometry.type === 'Polygon');
	const layerIds = filled ? [fillId, lineId] : [lineId];

	const stroke = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const fill = $derived(fillColor ?? stroke);
	// MapLibre keeps the last dash array it was given; one long dash draws a solid line.
	const dashes = $derived(dashArray ?? [1, 0]);

	function feature(): GeoJSONData {
		return plainGeoJSON({ type: 'Feature', properties: {}, geometry });
	}

	function layers(): LayerSpecification[] {
		const line: LayerSpecification = {
			id: lineId,
			type: 'line',
			source: sourceId,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': stroke,
				'line-width': width,
				'line-opacity': opacity,
				'line-dasharray': dashes
			}
		};
		if (!filled) return [line];
		const fillLayer: LayerSpecification = {
			id: fillId,
			type: 'fill',
			source: sourceId,
			paint: { 'fill-color': fill, 'fill-opacity': fillOpacity }
		};
		return [fillLayer, line];
	}

	registerLayers(ctx, () => ({
		sourceId,
		source: { type: 'geojson', data: feature() },
		layers: layers(),
		beforeId
	}));

	syncData(ctx, sourceId, feature);
	syncPaint(ctx, sourceId, lineId, 'line-color', () => stroke);
	syncPaint(ctx, sourceId, lineId, 'line-width', () => width);
	syncPaint(ctx, sourceId, lineId, 'line-opacity', () => opacity);
	syncPaint(ctx, sourceId, lineId, 'line-dasharray', () => dashes);
	if (filled) {
		syncPaint(ctx, sourceId, fillId, 'fill-color', () => fill);
		syncPaint(ctx, sourceId, fillId, 'fill-opacity', () => fillOpacity);
	}

	$effect(() => {
		const map = ctx.map;
		const handler = onclick;
		if (!map || !handler) return;
		const subscription = map.on('click', (event) => {
			const layers = layerIds.filter((layer) => map.getLayer(layer));
			if (layers.length === 0) return;
			if (map.queryRenderedFeatures(event.point, { layers }).length > 0) handler(event);
		});
		return () => subscription.unsubscribe();
	});
</script>
