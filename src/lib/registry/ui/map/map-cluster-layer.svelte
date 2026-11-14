<script lang="ts" module>
	import type { LngLatTuple } from './geometry.js';

	/** Default label font. OpenFreeMap styles ship this font stack. */
	export const DEFAULT_CLUSTER_FONT = ['Noto Sans Regular'];

	/** A cluster the user clicked. */
	export interface MapClusterClick {
		clusterId: number;
		/** Points in the cluster. */
		count: number;
		lngLat: LngLatTuple;
	}
</script>

<script lang="ts" generics="P extends GeoJsonProperties = GeoJsonProperties">
	import { untrack } from 'svelte';
	import type { Feature, FeatureCollection, GeoJsonProperties, Point } from 'geojson';
	import type {
		ExpressionSpecification,
		GeoJSONSource,
		Map as MapLibreMap,
		MapGeoJSONFeature,
		MapMouseEvent,
		Marker
	} from 'maplibre-gl';
	import type { GeoJSONData } from './layer-registry.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		featuresAt,
		registerLayers,
		syncBeforeId,
		syncData,
		syncPaint
	} from './layer-sync.svelte.js';
	import { FALLBACK_COLOR } from './theme.svelte.js';

	type PointFeature = Feature<Point, P>;
	type MapLibreModule = typeof import('maplibre-gl');

	interface Props {
		/** Points to cluster. Changing it updates the source in place. */
		data: FeatureCollection<Point, P>;
		/** Source id; layers are `<id>-clusters`, `<id>-count` and `<id>-points`. Read once. */
		id?: string;
		/** Pixel radius points are grouped within. Changing it regroups in place. */
		clusterRadius?: number;
		/** Above this zoom points are never grouped. Changing it regroups in place. */
		clusterMaxZoom?: number;
		/** Cluster circles. Defaults to the theme's `--primary`. */
		color?: string;
		/** Cluster counts. Defaults to the theme's `--primary-foreground`. */
		textColor?: string;
		/** Single points. Defaults to `color`. */
		pointColor?: string;
		/** Single point radius in pixels. */
		pointRadius?: number;
		/**
		 * Font stack of the counts on styles that ship glyphs. Read once. On styles without
		 * glyphs the counts are drawn as HTML in the page font instead.
		 */
		font?: string[];
		/** Zoom in on a cluster when it is clicked. */
		zoomOnClick?: boolean;
		/** Draw below this layer when it exists; changing it moves the layers. */
		beforeId?: string;
		/** Called with a clicked single point and its index in `data.features`. */
		onclick?: (feature: PointFeature, index: number) => void;
		/** Called when a cluster is clicked. */
		onclusterclick?: (cluster: MapClusterClick) => void;
	}

	let {
		data,
		id,
		clusterRadius = 50,
		clusterMaxZoom = 14,
		color,
		textColor,
		pointColor,
		pointRadius = 5,
		font = DEFAULT_CLUSTER_FONT,
		zoomOnClick = true,
		beforeId,
		onclick,
		onclusterclick
	}: Props = $props();

	/** Each point carries its index in `data`, so a click maps back to the original feature. */
	const INDEX_KEY = 'map:index';

	const ctx = getMapContext();
	const uid = $props.id();
	const sourceId = untrack(() => id ?? `map-clusters-${uid}`);
	const clustersId = `${sourceId}-clusters`;
	const countId = `${sourceId}-count`;
	const pointsId = `${sourceId}-points`;

	const fill = $derived(color ?? ctx.colors?.primary ?? FALLBACK_COLOR);
	const text = $derived(textColor ?? ctx.colors?.primaryForeground ?? FALLBACK_COLOR);
	const point = $derived(pointColor ?? fill);
	const background = $derived(ctx.colors?.background ?? FALLBACK_COLOR);

	/** Counts go in HTML when the current style cannot draw text. */
	const htmlLabels = $derived.by(() => {
		// The style can only be asked once it has loaded.
		if (!ctx.map || ctx.styleVersion === 0) return false;
		return !ctx.map.getGlyphs();
	});

	const isCluster: ExpressionSpecification = ['has', 'point_count'];
	const radiusBySize: ExpressionSpecification = [
		'step',
		['get', 'point_count'],
		16,
		10,
		20,
		100,
		26,
		1000,
		32
	];

	function indexedData(): GeoJSONData {
		const plain = $state.snapshot(data) as FeatureCollection<Point, P>;
		return {
			...plain,
			features: plain.features.map((feature, index) => ({
				...feature,
				properties: { ...feature.properties, [INDEX_KEY]: index }
			}))
		};
	}

	registerLayers(ctx, () => ({
		sourceId,
		source: { type: 'geojson', data: indexedData(), cluster: true, clusterRadius, clusterMaxZoom },
		layers: [
			{
				id: clustersId,
				type: 'circle',
				source: sourceId,
				filter: isCluster,
				paint: {
					'circle-color': fill,
					'circle-radius': radiusBySize,
					'circle-stroke-color': background,
					'circle-stroke-width': 2
				}
			},
			{
				id: countId,
				type: 'symbol',
				source: sourceId,
				filter: isCluster,
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': $state.snapshot(font),
					'text-size': 12,
					'text-allow-overlap': true
				},
				paint: { 'text-color': text }
			},
			{
				id: pointsId,
				type: 'circle',
				source: sourceId,
				filter: ['!', isCluster],
				paint: {
					'circle-color': point,
					'circle-radius': pointRadius,
					'circle-stroke-color': background,
					'circle-stroke-width': 2
				}
			}
		],
		beforeId
	}));
	syncBeforeId(ctx, sourceId, () => beforeId);

	// Regroup in place when the cluster settings change; the first values went in above.
	// Deriveds only signal real changes, so passing the same props again does not regroup.
	const radius = $derived(clusterRadius);
	const maxZoom = $derived(clusterMaxZoom);
	let clusterOptionsSynced = false;
	$effect(() => {
		const options = { clusterRadius: radius, clusterMaxZoom: maxZoom };
		if (!clusterOptionsSynced) {
			clusterOptionsSynced = true;
			return;
		}
		ctx.layers.setClusterOptions(sourceId, options).catch((error: unknown) => {
			console.error(
				`MapClusterLayer: could not change the cluster options of "${sourceId}".`,
				error
			);
		});
	});

	syncData(ctx, sourceId, indexedData);
	syncPaint(ctx, sourceId, clustersId, 'circle-color', () => fill);
	syncPaint(ctx, sourceId, clustersId, 'circle-stroke-color', () => background);
	syncPaint(ctx, sourceId, countId, 'text-color', () => text);
	syncPaint(ctx, sourceId, pointsId, 'circle-color', () => point);
	syncPaint(ctx, sourceId, pointsId, 'circle-radius', () => pointRadius);
	syncPaint(ctx, sourceId, pointsId, 'circle-stroke-color', () => background);

	function pointAt(hit: MapGeoJSONFeature): { feature: PointFeature; index: number } | null {
		const index = Number(hit.properties[INDEX_KEY]);
		const feature = Number.isInteger(index) ? data.features[index] : undefined;
		return feature ? { feature, index } : null;
	}

	async function openCluster(map: MapLibreMap, hit: MapGeoJSONFeature) {
		const [lng, lat] = (hit.geometry as Point).coordinates;
		const clusterId = Number(hit.properties.cluster_id);
		onclusterclick?.({ clusterId, count: Number(hit.properties.point_count), lngLat: [lng, lat] });
		const source = map.getSource<GeoJSONSource>(sourceId);
		if (!zoomOnClick || !source) return;
		const zoom = await source.getClusterExpansionZoom(clusterId);
		ctx.easeTo({ center: [lng, lat], zoom });
	}

	function handleClick(map: MapLibreMap, event: MapMouseEvent) {
		const hit = featuresAt(map, event.point, [clustersId, pointsId])[0];
		if (!hit) return;
		if (hit.layer.id === clustersId) {
			// The cluster can be gone by the time the worker answers; nothing to zoom to then.
			openCluster(map, hit).catch((error: unknown) => console.warn(error));
			return;
		}
		const selection = pointAt(hit);
		if (selection) onclick?.(selection.feature, selection.index);
	}

	$effect(() => {
		const map = ctx.map;
		if (!map) return;
		const canvas = map.getCanvas();
		// Only reset a cursor this layer set, so other layers keep theirs.
		let pointing = false;
		const subscriptions = [
			map.on('click', (event) => handleClick(map, event)),
			map.on('mousemove', (event) => {
				const over = featuresAt(map, event.point, [clustersId, pointsId]).length > 0;
				if (over === pointing) return;
				pointing = over;
				canvas.style.cursor = over ? 'pointer' : '';
			})
		];
		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
			if (pointing) canvas.style.cursor = '';
		};
	});

	function createLabel(lib: MapLibreModule, map: MapLibreMap): Marker {
		const element = document.createElement('div');
		element.className = 'map-cluster-label';
		element.dataset.slot = 'map-cluster-label';
		// Users click the canvas circle underneath; the count repeats what it shows.
		element.setAttribute('aria-hidden', 'true');
		return new lib.Marker({ element }).setLngLat([0, 0]).addTo(map);
	}

	/** One HTML label per cluster in the loaded tiles, in step with what the map draws. */
	function syncLabels(map: MapLibreMap, lib: MapLibreModule, labels: Map<number, Marker>) {
		const clusters = map.getSource(sourceId)
			? map.querySourceFeatures(sourceId, { filter: isCluster })
			: [];
		// A plain lookup: this runs every frame and is not reactive state.
		const seen: Record<number, true> = {};
		for (const cluster of clusters) {
			const clusterId = Number(cluster.properties.cluster_id);
			// Clusters near tile edges come back once per tile.
			if (seen[clusterId]) continue;
			seen[clusterId] = true;
			const label = labels.get(clusterId) ?? createLabel(lib, map);
			labels.set(clusterId, label);
			const [lng, lat] = (cluster.geometry as Point).coordinates;
			label.setLngLat([lng, lat]);
			const element = label.getElement();
			const count = String(cluster.properties.point_count_abbreviated);
			if (element.textContent !== count) element.textContent = count;
			// The browser reads colours back in its own format, so compare with what was set.
			if (element.dataset.color !== text) {
				element.dataset.color = text;
				element.style.color = text;
			}
		}
		for (const [clusterId, label] of labels) {
			if (seen[clusterId]) continue;
			label.remove();
			labels.delete(clusterId);
		}
	}

	$effect(() => {
		const map = ctx.map;
		const lib = ctx.maplibre;
		if (!map || !lib || !htmlLabels) return;
		const labels = new Map<number, Marker>();
		const subscription = map.on('render', () => syncLabels(map, lib, labels));
		untrack(() => syncLabels(map, lib, labels));
		return () => {
			subscription.unsubscribe();
			for (const label of labels.values()) label.remove();
		};
	});

	// A new text colour alone does not make the map draw; ask for a frame so the labels
	// pick it up on the next render.
	$effect(() => {
		const map = ctx.map;
		if (map && htmlLabels && text) map.triggerRepaint();
	});
</script>
