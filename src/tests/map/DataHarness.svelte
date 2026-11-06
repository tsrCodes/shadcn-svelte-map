<script lang="ts">
	import '../../routes/layout.css';
	import type { FeatureCollection, Point } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import {
		Map,
		MapArc,
		MapCircle,
		MapClusterLayer,
		MapGeoJSON,
		MapHeatmap,
		MapPolygon,
		MapPolyline,
		MapRectangle,
		MapRoute,
		type LngLatTuple,
		type MapArcItem,
		type MapClusterClick,
		type MapContext,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import { LIGHT_STYLE } from './fixtures.js';

	interface Props {
		mapStyle?: MapStyle;
		geojson?: FeatureCollection;
		geojsonFill?: string;
		ongeojsonhover?: (feature: MapGeoJSONFeature | null) => void;
		ongeojsonclick?: (feature: MapGeoJSONFeature) => void;
		shapes?: boolean;
		circleRadius?: number;
		shapeColor?: string;
		route?: LngLatTuple[];
		routeProgress?: number;
		arcs?: (MapArcItem & { name: string })[];
		onarcclick?: (name: string, index: number) => void;
		clusters?: FeatureCollection<Point, { name: string }>;
		clusterTextColor?: string;
		onpointclick?: (name: string, index: number) => void;
		onclusterclick?: (cluster: MapClusterClick) => void;
		heat?: FeatureCollection<Point>;
		oncontext?: (context: MapContext) => void;
	}

	let {
		mapStyle = LIGHT_STYLE,
		geojson,
		geojsonFill,
		ongeojsonhover,
		ongeojsonclick,
		shapes = false,
		circleRadius = 200_000,
		shapeColor,
		route,
		routeProgress,
		arcs,
		onarcclick,
		clusters,
		clusterTextColor,
		onpointclick,
		onclusterclick,
		heat,
		oncontext
	}: Props = $props();
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" {mapStyle} viewport={{ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 }}>
		<ContextProbe {oncontext} />
		{#if geojson}
			<MapGeoJSON
				id="h-geo"
				data={geojson}
				fillColor={geojsonFill}
				onhover={ongeojsonhover}
				onclick={ongeojsonclick}
			/>
		{/if}
		{#if shapes}
			<MapCircle id="h-circle" center={[-40, 20]} radius={circleRadius} color={shapeColor} />
			<MapPolygon
				id="h-polygon"
				positions={[
					[-20, 20],
					[-10, 20],
					[-15, 30]
				]}
			/>
			<MapPolyline
				id="h-polyline"
				positions={[
					[0, 30],
					[10, 35]
				]}
				dashArray={[2, 2]}
			/>
			<MapRectangle
				id="h-rect"
				bounds={[
					[20, 20],
					[30, 30]
				]}
			/>
		{/if}
		{#if route}
			<MapRoute id="h-route" positions={route} progress={routeProgress} />
		{/if}
		{#if arcs}
			<MapArc id="h-arc" {arcs} width={6} onclick={(arc, index) => onarcclick?.(arc.name, index)} />
		{/if}
		{#if clusters}
			<MapClusterLayer
				id="h-clusters"
				data={clusters}
				clusterRadius={40}
				textColor={clusterTextColor}
				{onclusterclick}
				onclick={(feature, index) => onpointclick?.(feature.properties.name, index)}
			/>
		{/if}
		{#if heat}
			<MapHeatmap id="h-heat" data={heat} />
		{/if}
	</Map>
</div>
