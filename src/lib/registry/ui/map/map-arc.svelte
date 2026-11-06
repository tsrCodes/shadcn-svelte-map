<script lang="ts" module>
	import type { LngLatTuple } from './geometry.js';

	/** One arc, from one place to another. */
	export interface MapArcItem {
		from: LngLatTuple;
		to: LngLatTuple;
	}
</script>

<script lang="ts" generics="T extends MapArcItem = MapArcItem">
	import { untrack } from 'svelte';
	import type { MapMouseEvent } from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		featuresAt,
		plainGeoJSON,
		registerLayers,
		syncData,
		syncPaint
	} from './layer-sync.svelte.js';
	import { arcLine } from './geometry.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	interface Props {
		/** Arcs to draw. Extra fields on each item come back in `onclick`. */
		arcs: T[];
		/** Source id; the line layer is `<id>-line`. Read once. */
		id?: string;
		/** How far each arc bends sideways, as a share of its length. 0 is straight. */
		curvature?: number;
		/** Points along each arc. More is smoother. */
		steps?: number;
		/** Line colour. Defaults to the theme's `--primary`. */
		color?: string;
		/** Line width in pixels. */
		width?: number;
		/** Line opacity, 0 to 1. */
		opacity?: number;
		/** Dash pattern in line widths. */
		dashArray?: number[];
		/** Draw below this layer when it exists. Read once. */
		beforeId?: string;
		/** Called with the clicked arc and its index in `arcs`. */
		onclick?: (arc: T, index: number, event: MapMouseEvent) => void;
	}

	let {
		arcs,
		id,
		curvature = 0.2,
		steps,
		color,
		width = 2,
		opacity = 0.8,
		dashArray,
		beforeId,
		onclick
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-arc-${uid}`);
	const lineId = `${sourceId}-line`;

	const stroke = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const dashes = $derived(dashArray ?? [1, 0]);

	function arcData(): GeoJSONData {
		return plainGeoJSON({
			type: 'FeatureCollection',
			features: arcs.map((arc) => ({
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'LineString',
					coordinates: arcLine(
						$state.snapshot(arc.from) as LngLatTuple,
						$state.snapshot(arc.to) as LngLatTuple,
						curvature,
						steps
					)
				}
			}))
		});
	}

	registerLayers(ctx, () => ({
		sourceId,
		// `generateId` numbers arcs by index, so a click maps back to `arcs`.
		source: { type: 'geojson', data: arcData(), generateId: true },
		layers: [
			{
				id: lineId,
				type: 'line',
				source: sourceId,
				layout: { 'line-cap': 'round' },
				paint: {
					'line-color': stroke,
					'line-width': width,
					'line-opacity': opacity,
					'line-dasharray': dashes
				}
			}
		],
		beforeId
	}));

	syncData(ctx, sourceId, arcData);
	syncPaint(ctx, sourceId, lineId, 'line-color', () => stroke);
	syncPaint(ctx, sourceId, lineId, 'line-width', () => width);
	syncPaint(ctx, sourceId, lineId, 'line-opacity', () => opacity);
	syncPaint(ctx, sourceId, lineId, 'line-dasharray', () => dashes);

	$effect(() => {
		const map = ctx.map;
		const handler = onclick;
		if (!map || !handler) return;
		const subscription = map.on('click', (event) => {
			const hit = featuresAt(map, event.point, [lineId])[0];
			const index = Number(hit?.id);
			const arc = Number.isInteger(index) ? arcs[index] : undefined;
			if (arc) handler(arc, index, event);
		});
		return () => subscription.unsubscribe();
	});
</script>
