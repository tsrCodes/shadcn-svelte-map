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
	import { lineProgressAt, splitLine, type LngLatTuple } from './geometry.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	type Part = 'start' | 'end' | 'head';

	/** Colour of the gradient past the travelled part, so the dashed rest shows through. */
	const CLEAR = 'rgba(0, 0, 0, 0)';

	interface Props {
		/** Points along the route as `[longitude, latitude]`, in travel order. */
		positions: LngLatTuple[];
		/** Source id; layers are `<id>-casing`, `<id>-rest`, `<id>-done` and `<id>-stops` (on source `<id>-points`). Read once. */
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
	/** Stop and head dots live in their own small source, so moving the head is cheap. */
	const pointsSourceId = `${sourceId}-points`;

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

	/**
	 * A plain copy of the route, kept while its content stays the same: a parent that
	 * passes the same positions again does not send the line to the worker again.
	 */
	const routeKey = $derived(JSON.stringify(positions));
	const route = $derived(JSON.parse(routeKey) as LngLatTuple[]);
	const share = $derived(Math.min(1, Math.max(0, progress)));

	/**
	 * The whole route as one line. It only changes with `positions`; progress is drawn
	 * with a gradient on top, so animating it never sends the line to the worker again.
	 */
	function lineData(): GeoJSONData {
		const features: Feature<LineString>[] =
			route.length > 1
				? [
						{
							type: 'Feature',
							properties: {},
							geometry: { type: 'LineString', coordinates: route }
						}
					]
				: [];
		return plainGeoJSON({ type: 'FeatureCollection', features });
	}

	function dot(part: Part, coordinates: LngLatTuple): Feature<Point, { part: Part }> {
		return { type: 'Feature', properties: { part }, geometry: { type: 'Point', coordinates } };
	}

	function pointsData(): GeoJSONData {
		const features: FeatureCollection['features'] = [];
		if (route.length > 0) {
			if (showStops) features.push(dot('start', route[0]), dot('end', route[route.length - 1]));
			if (showHead && share > 0 && share < 1) {
				features.push(dot('head', splitLine(route, share).point));
			}
		}
		return plainGeoJSON({ type: 'FeatureCollection', features });
	}

	/** Solid travelled colour up to the split, clear after it. */
	const doneGradient = $derived.by((): ExpressionSpecification => {
		const stop = lineProgressAt(route, share);
		// A stop at 1 would leave the last pixel clear; past the end keeps it solid.
		return ['step', ['line-progress'], done, stop >= 1 ? 2 : stop, CLEAR];
	});

	const lineLayout = { 'line-join': 'round', 'line-cap': 'round' } as const;

	registerLayers(ctx, () => ({
		sourceId,
		// `lineMetrics` gives each line the `line-progress` the gradient needs.
		source: { type: 'geojson', data: lineData(), lineMetrics: true },
		layers: [
			{
				id: casingId,
				type: 'line',
				source: sourceId,
				layout: lineLayout,
				paint: { 'line-color': background, 'line-width': casing }
			},
			{
				// The whole route, dashed; the travelled part covers it from above.
				id: restId,
				type: 'line',
				source: sourceId,
				layout: lineLayout,
				paint: { 'line-color': rest, 'line-width': width, 'line-dasharray': restDashes }
			},
			{
				id: doneId,
				type: 'line',
				source: sourceId,
				layout: lineLayout,
				paint: { 'line-color': done, 'line-width': width, 'line-gradient': doneGradient }
			}
		],
		beforeId
	}));
	registerLayers(ctx, () => ({
		sourceId: pointsSourceId,
		source: { type: 'geojson', data: pointsData() },
		layers: [
			{
				id: stopsId,
				type: 'circle',
				source: pointsSourceId,
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
	syncBeforeId(ctx, pointsSourceId, () => beforeId);

	syncData(ctx, sourceId, lineData);
	syncData(ctx, pointsSourceId, pointsData);
	syncPaint(ctx, sourceId, casingId, 'line-color', () => background);
	syncPaint(ctx, sourceId, casingId, 'line-width', () => casing);
	syncPaint(ctx, sourceId, restId, 'line-color', () => rest);
	syncPaint(ctx, sourceId, restId, 'line-width', () => width);
	syncPaint(ctx, sourceId, restId, 'line-dasharray', () => restDashes);
	syncPaint(ctx, sourceId, doneId, 'line-color', () => done);
	syncPaint(ctx, sourceId, doneId, 'line-width', () => width);
	syncPaint(ctx, sourceId, doneId, 'line-gradient', () => doneGradient);
	syncPaint(ctx, pointsSourceId, stopsId, 'circle-color', () => background);
	syncPaint(ctx, pointsSourceId, stopsId, 'circle-radius', () => width);
	syncPaint(ctx, pointsSourceId, stopsId, 'circle-stroke-color', () => stopColor);
	syncPaint(ctx, pointsSourceId, stopsId, 'circle-stroke-width', () => stopStroke);

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
