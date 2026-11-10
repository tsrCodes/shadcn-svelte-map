<script lang="ts">
	import {
		Map,
		MapBasemapControl,
		MapControlContainer,
		MapPolygon,
		MapPolyline,
		type MapOverlay
	} from '#lib/registry/ui/map/index.js';

	const OVERLAYS: MapOverlay[] = [
		{ id: 'park', label: 'Vondelpark' },
		{ id: 'route', label: 'Canal walk' }
	];

	const PARK: [number, number][] = [
		[4.8565, 52.3555],
		[4.8705, 52.3615],
		[4.8795, 52.3618],
		[4.8775, 52.3595],
		[4.8655, 52.3555],
		[4.858, 52.3535]
	];

	const ROUTE: [number, number][] = [
		[4.8838, 52.3667],
		[4.8862, 52.3712],
		[4.8858, 52.3758],
		[4.8895, 52.3795],
		[4.8952, 52.3792]
	];

	let basemap = $state('default');
	let activeOverlays = $state(['park']);
</script>

<Map class="size-full" viewport={{ center: [4.876, 52.366], zoom: 13, bearing: 0, pitch: 0 }}>
	{#if activeOverlays.includes('park')}
		<MapPolygon positions={PARK} fillOpacity={0.2} />
	{/if}
	{#if activeOverlays.includes('route')}
		<MapPolyline positions={ROUTE} width={4} dashArray={[1, 1.5]} />
	{/if}
	<MapControlContainer position="top-right">
		<MapBasemapControl overlays={OVERLAYS} bind:value={basemap} bind:activeOverlays />
	</MapControlContainer>
</Map>
