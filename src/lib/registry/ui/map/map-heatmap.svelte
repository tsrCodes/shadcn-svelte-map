<script lang="ts">
	import { untrack } from 'svelte';
	import type { FeatureCollection, Point } from 'geojson';
	import type { ExpressionSpecification } from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import { plainGeoJSON, registerLayers, syncData, syncPaint } from './layer-sync.svelte.js';
	import { FALLBACK_COLOR, withAlpha } from './theme.svelte.js';

	interface Props {
		/** Points to draw, or a URL to load them from. Changing it updates the source in place. */
		data: FeatureCollection<Point> | string;
		/** Source id; the layer is `<id>-heat`. Read once. */
		id?: string;
		/** Name of a numeric property that weighs each point. Points without it weigh 1. */
		weight?: string;
		/** Blur radius of each point, in pixels. */
		radius?: number;
		/** Multiplies the density, for sparse or dense data. */
		intensity?: number;
		/** Layer opacity, 0 to 1. */
		opacity?: number;
		/** Colours from low to high density. Defaults to the theme's chart colours. */
		colors?: string[];
		/** Draw below this layer when it exists. Read once. */
		beforeId?: string;
	}

	let {
		data,
		id,
		weight,
		radius = 20,
		intensity = 1,
		opacity = 0.8,
		colors,
		beforeId
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-heatmap-${uid}`);
	const heatId = `${sourceId}-heat`;

	const ramp = $derived.by((): ExpressionSpecification => {
		const theme = ctx.colors;
		const stops = colors?.length
			? colors
			: theme
				? [theme.chart1, theme.chart2, theme.chart3, theme.chart4, theme.chart5]
				: [FALLBACK_COLOR];
		const steps = stops.flatMap((color, index) => [(index + 1) / stops.length, color]);
		// No density is see-through, so the basemap shows where there is no data.
		return [
			'interpolate',
			['linear'],
			['heatmap-density'],
			0,
			withAlpha(stops[0], 0),
			...steps
		] as ExpressionSpecification;
	});

	// `to-number` turns a missing property into 0, so check for it first.
	const pointWeight = $derived<ExpressionSpecification | number>(
		weight ? ['case', ['has', weight], ['to-number', ['get', weight], 1], 1] : 1
	);

	function sourceData(): GeoJSONData {
		return typeof data === 'string' ? data : plainGeoJSON(data);
	}

	registerLayers(ctx, () => ({
		sourceId,
		source: { type: 'geojson', data: sourceData() },
		layers: [
			{
				id: heatId,
				type: 'heatmap',
				source: sourceId,
				paint: {
					'heatmap-color': ramp,
					'heatmap-weight': pointWeight,
					'heatmap-radius': radius,
					'heatmap-intensity': intensity,
					'heatmap-opacity': opacity
				}
			}
		],
		beforeId
	}));

	syncData(ctx, sourceId, sourceData);
	syncPaint(ctx, sourceId, heatId, 'heatmap-color', () => ramp);
	syncPaint(ctx, sourceId, heatId, 'heatmap-weight', () => pointWeight);
	syncPaint(ctx, sourceId, heatId, 'heatmap-radius', () => radius);
	syncPaint(ctx, sourceId, heatId, 'heatmap-intensity', () => intensity);
	syncPaint(ctx, sourceId, heatId, 'heatmap-opacity', () => opacity);
</script>
