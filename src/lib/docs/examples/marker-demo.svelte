<script lang="ts">
	import {
		Map,
		MapMarker,
		MapMarkerLabel,
		MapMarkerPopup,
		MapMarkerTooltip
	} from '#lib/registry/ui/map/index.js';

	const CAFES = [
		{ id: 'north', name: 'North Roast', lngLat: [13.398, 52.531], hours: '7:00 to 18:00' },
		{ id: 'river', name: 'River Bean', lngLat: [13.412, 52.514], hours: '8:00 to 20:00' },
		{ id: 'park', name: 'Park Kiosk', lngLat: [13.377, 52.517], hours: '9:00 to 17:00' }
	] satisfies { id: string; name: string; lngLat: [number, number]; hours: string }[];
</script>

<Map class="size-full" viewport={{ center: [13.395, 52.521], zoom: 13, bearing: 0, pitch: 0 }}>
	{#each CAFES as cafe (cafe.id)}
		<MapMarker lngLat={cafe.lngLat} aria-label={cafe.name}>
			<MapMarkerLabel>{cafe.name}</MapMarkerLabel>
			<MapMarkerTooltip>Open {cafe.hours}</MapMarkerTooltip>
			<MapMarkerPopup aria-label={`${cafe.name} details`}>
				<p class="font-medium">{cafe.name}</p>
				<p class="text-muted-foreground">Open {cafe.hours}</p>
			</MapMarkerPopup>
		</MapMarker>
	{/each}
</Map>
