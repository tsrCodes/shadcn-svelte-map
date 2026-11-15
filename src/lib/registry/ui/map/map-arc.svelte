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
	import type {
		ExpressionSpecification,
		Map as MapLibreMap,
		MapMouseEvent,
		PointLike
	} from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		featuresAt,
		plainGeoJSON,
		pointerCursor,
		registerLayers,
		syncBeforeId,
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
		/** Colour of the arc under the pointer. Defaults to `color`. */
		hoverColor?: string;
		/** Width of the arc under the pointer. Defaults to `width` plus 2. */
		hoverWidth?: number;
		/** Opacity of the arc under the pointer, 0 to 1. */
		hoverOpacity?: number;
		/** Draw below this layer when it exists; changing it moves the layers. */
		beforeId?: string;
		/** Called with the clicked arc and its index in `arcs`. */
		onclick?: (arc: T, index: number, event: MapMouseEvent) => void;
		/** Called with the arc under the pointer and its index, and with `null` when it leaves. */
		onhover?: (arc: T | null, index: number | null) => void;
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
		hoverColor,
		hoverWidth,
		hoverOpacity = 1,
		beforeId,
		onclick,
		onhover
	}: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-arc-${uid}`);
	const lineId = `${sourceId}-line`;

	const stroke = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const dashes = $derived(dashArray ?? [1, 0]);
	const hoverStroke = $derived(hoverColor ?? stroke);
	const hoverLine = $derived(hoverWidth ?? width + 2);

	/** `hovered` while the pointer is on the arc, `normal` otherwise. */
	function byHover<V extends number | string>(hovered: V, normal: V): V | ExpressionSpecification {
		if (hovered === normal) return normal;
		return ['case', ['boolean', ['feature-state', 'hover'], false], hovered, normal];
	}
	const lineColor = $derived(byHover(hoverStroke, stroke));
	const lineWidth = $derived(byHover(hoverLine, width));
	const lineOpacity = $derived(byHover(hoverOpacity, opacity));

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
					'line-color': lineColor,
					'line-width': lineWidth,
					'line-opacity': lineOpacity,
					'line-dasharray': dashes
				}
			}
		],
		beforeId
	}));
	syncBeforeId(ctx, sourceId, () => beforeId);

	syncPaint(ctx, sourceId, lineId, 'line-color', () => lineColor);
	syncPaint(ctx, sourceId, lineId, 'line-width', () => lineWidth);
	syncPaint(ctx, sourceId, lineId, 'line-opacity', () => lineOpacity);
	syncPaint(ctx, sourceId, lineId, 'line-dasharray', () => dashes);

	/** Arc ids are positions in `arcs`, from `generateId`. */
	let hoveredIndex: number | null = null;

	function setHovered(index: number | null) {
		if (index === hoveredIndex) return;
		if (hoveredIndex !== null) {
			ctx.layers.removeFeatureState({ source: sourceId, id: hoveredIndex }, 'hover');
		}
		hoveredIndex = index;
		if (index !== null)
			ctx.layers.setFeatureState({ source: sourceId, id: index }, { hover: true });
		onhover?.(index === null ? null : arcs[index], index);
	}

	syncData(ctx, sourceId, () => {
		const next = arcData();
		// The old hover id would point at whichever arc now has that position.
		untrack(() => setHovered(null));
		return next;
	});

	function arcIndexAt(map: MapLibreMap, point: PointLike): number | null {
		const index = Number(featuresAt(map, point, [lineId])[0]?.id);
		return Number.isInteger(index) && index >= 0 && index < arcs.length ? index : null;
	}

	$effect(() => {
		const map = ctx.map;
		if (!map) return;
		const point = pointerCursor(map.getCanvas());
		const subscriptions = [
			map.on('mousemove', (event) => {
				const index = arcIndexAt(map, event.point);
				setHovered(index);
				point(index !== null && Boolean(onclick || onhover));
			}),
			map.on('mouseout', () => {
				setHovered(null);
				point(false);
			}),
			map.on('click', (event) => {
				const index = arcIndexAt(map, event.point);
				if (index !== null) onclick?.(arcs[index], index, event);
			})
		];
		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
			point(false);
			setHovered(null);
		};
	});
</script>
