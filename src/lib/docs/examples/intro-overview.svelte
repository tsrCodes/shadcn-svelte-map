<script lang="ts">
	import {
		Map,
		MapCircle,
		MapCompassControl,
		MapControlContainer,
		MapFullscreenControl,
		MapMarker,
		MapMarkerLabel,
		MapMarkerTooltip,
		MapRoute,
		MapScaleControl,
		MapZoomControl
	} from '#lib/registry/ui/map/index.js';

	const STOPS = [
		{ id: 'bakery', name: 'Bakery', lngLat: [2.3417, 48.8606], note: 'Pick up at 8:00' },
		{ id: 'market', name: 'Market', lngLat: [2.3622, 48.8641], note: 'Pick up at 8:30' },
		{ id: 'studio', name: 'Studio', lngLat: [2.3775, 48.8532], note: 'Drop off by 9:15' }
	] satisfies { id: string; name: string; lngLat: [number, number]; note: string }[];

	const ROUTE: [number, number][] = [
		[2.3417, 48.8606],
		[2.3489, 48.8627],
		[2.3622, 48.8641],
		[2.3701, 48.8589],
		[2.3775, 48.8532]
	];
</script>

<Map class="size-full" viewport={{ center: [2.3596, 48.8586], zoom: 13.4, bearing: 0, pitch: 0 }}>
	<MapCircle center={[2.3622, 48.8641]} radius={350} fillOpacity={0.12} />
	<MapRoute positions={ROUTE} progress={0.6} showHead />
	{#each STOPS as stop (stop.id)}
		<MapMarker lngLat={stop.lngLat} aria-label={stop.name}>
			<MapMarkerLabel>{stop.name}</MapMarkerLabel>
			<MapMarkerTooltip>{stop.note}</MapMarkerTooltip>
		</MapMarker>
	{/each}
	<MapControlContainer position="top-right">
		<MapZoomControl />
		<MapCompassControl />
		<MapFullscreenControl />
	</MapControlContainer>
	<MapControlContainer position="bottom-left">
		<MapScaleControl />
	</MapControlContainer>
</Map>
