<script lang="ts">
	import { untrack } from 'svelte';
	import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
	import type { ExpressionSpecification, MapMouseEvent } from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		featuresAt,
		plainGeoJSON,
		registerLayers,
		syncBeforeId,
		syncData,
		syncPaint
	} from './layer-sync.svelte.js';
	import { splitLine, type LngLatTuple } from './geometry.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	type Part = 'done' | 'rest' | 'start' | 'end' | 'head';

	interface Props {
		/** Points along the route as `[longitude, latitude]`, in travel order. */
		positions: LngLatTuple[];
		/** Source id; layers are `<id>-casing`, `<id>-rest`, `<id>-done` and `<id>-stops`. Read once. */
		id?: string;
		/** Share travelled, 0 to 1. The travelled part uses `color`, the rest `restColor`. */
		progress?: number;
		/** Travelled part. Defaults to the theme's `--primary`. */
		color?: string;
		/** Part still to go. Defaults to the theme's `--muted-foreground`. */
		restColor?: string;
		/** Dash pattern of the part still to go, in line widths. */
		restDashArray?: number[];
		/** Line width in pixels. */
		width?: number;
		/** Outline around the line, in pixels on each side. 0 turns it off. */
		casingWidth?: number;
		/** Draw dots at the start and the end. */
		showStops?: boolean;
		/** Draw a dot where the travelled part ends, while the trip is under way. */
		showHead?: boolean;
		/** Draw below this layer when it exists; changing it moves the layers. */
		beforeId?: string;
		/** Called when the route line is clicked. */
		onclick?: (event: MapMouseEvent) => void;
	}

	let {
		positions,
		id,
		progress = 1,
		color,
		restColor,
		restDashArray,
		width = 4,
		casingWidth = 2,
		showStops = true,
		showHead = true,
		beforeId,
		onclick
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-route-${uid}`);
	const casingId = `${sourceId}-casing`;
	const restId = `${sourceId}-rest`;
	const doneId = `${sourceId}-done`;
	const stopsId = `${sourceId}-stops`;

	const done = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const rest = $derived(restColor ?? ctx.colors?.mutedForeground ?? FALLBACK_COLOR);
	const background = $derived(ctx.colors?.background ?? FALLBACK_COLOR);
	const restDashes = $derived(restDashArray ?? [1, 0]);
	const casing = $derived(width + casingWidth * 2);
	const stopStroke = $derived(Math.max(2, width / 2));
	/** Stop dots take the travelled colour, except the end while it is still ahead. */
	const stopColor = $derived<ExpressionSpecification>([
		'match',
		['get', 'part'],
		'end',
		progress >= 1 ? done : rest,
		done
	]);

	function partIs(part: Part): ExpressionSpecification {
		return ['==', ['get', 'part'], part];
	}

	function line(part: Part, coordinates: LngLatTuple[]): Feature<LineString, { part: Part }> {
		return { type: 'Feature', properties: { part }, geometry: { type: 'LineString', coordinates } };
	}

	function dot(part: Part, coordinates: LngLatTuple): Feature<Point, { part: Part }> {
		return { type: 'Feature', properties: { part }, geometry: { type: 'Point', coordinates } };
	}

	function routeData(): GeoJSONData {
		const route = $state.snapshot(positions) as LngLatTuple[];
		const features: FeatureCollection['features'] = [];
		if (route.length > 0) {
			const split = splitLine(route, progress);
			if (split.rest.length > 1) features.push(line('rest', split.rest));
			if (split.done.length > 1) features.push(line('done', split.done));
			if (showStops) features.push(dot('start', route[0]), dot('end', route[route.length - 1]));
			if (showHead && progress > 0 && progress < 1) features.push(dot('head', split.point));
		}
		return plainGeoJSON({ type: 'FeatureCollection', features });
	}

	const lineLayout = { 'line-join': 'round', 'line-cap': 'round' } as const;

	registerLayers(ctx, () => ({
		sourceId,
		source: { type: 'geojson', data: routeData() },
		layers: [
			{
				id: casingId,
				type: 'line',
				source: sourceId,
				filter: ['==', ['geometry-type'], 'LineString'],
				layout: lineLayout,
				paint: { 'line-color': background, 'line-width': casing }
			},
			{
				id: restId,
				type: 'line',
				source: sourceId,
				filter: partIs('rest'),
				layout: lineLayout,
				paint: { 'line-color': rest, 'line-width': width, 'line-dasharray': restDashes }
			},
			{
				id: doneId,
				type: 'line',
				source: sourceId,
				filter: partIs('done'),
				layout: lineLayout,
				paint: { 'line-color': done, 'line-width': width }
			},
			{
				id: stopsId,
				type: 'circle',
				source: sourceId,
				filter: ['==', ['geometry-type'], 'Point'],
				paint: {
					'circle-color': background,
					'circle-radius': width,
					'circle-stroke-color': stopColor,
					'circle-stroke-width': stopStroke
				}
			}
		],
		beforeId
	}));
	syncBeforeId(ctx, sourceId, () => beforeId);

	syncData(ctx, sourceId, routeData);
	syncPaint(ctx, sourceId, casingId, 'line-color', () => background);
	syncPaint(ctx, sourceId, casingId, 'line-width', () => casing);
	syncPaint(ctx, sourceId, restId, 'line-color', () => rest);
	syncPaint(ctx, sourceId, restId, 'line-width', () => width);
	syncPaint(ctx, sourceId, restId, 'line-dasharray', () => restDashes);
	syncPaint(ctx, sourceId, doneId, 'line-color', () => done);
	syncPaint(ctx, sourceId, doneId, 'line-width', () => width);
	syncPaint(ctx, sourceId, stopsId, 'circle-color', () => background);
	syncPaint(ctx, sourceId, stopsId, 'circle-radius', () => width);
	syncPaint(ctx, sourceId, stopsId, 'circle-stroke-color', () => stopColor);
	syncPaint(ctx, sourceId, stopsId, 'circle-stroke-width', () => stopStroke);

	$effect(() => {
		const map = ctx.map;
		const handler = onclick;
		if (!map || !handler) return;
		const subscription = map.on('click', (event) => {
			if (featuresAt(map, event.point, [casingId, restId, doneId]).length > 0) handler(event);
		});
		return () => subscription.unsubscribe();
	});
</script>
