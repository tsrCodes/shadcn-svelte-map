<script lang="ts">
	import {
		Map,
		MapControlContainer,
		MapMarker,
		MapMarkerLabel,
		MapZoomControl
	} from '#lib/registry/ui/map/index.js';
	import { MapSearchControl } from '#lib/registry/ui/map-search/index.js';
	import type { Place } from '#lib/registry/ui/place-autocomplete/index.js';

	let picked = $state.raw<Place | null>(null);
</script>

<Map class="size-full" viewport={{ center: [-3.7038, 40.4168], zoom: 11, bearing: 0, pitch: 0 }}>
	{#if picked}
		<MapMarker lngLat={picked.position} aria-label={picked.name}>
			<MapMarkerLabel>{picked.name}</MapMarkerLabel>
		</MapMarker>
	{/if}
	<MapControlContainer position="top-left">
		<MapSearchControl placeholder="Search Madrid" onselect={(place) => (picked = place)} />
	</MapControlContainer>
	<MapControlContainer position="top-right">
		<MapZoomControl />
	</MapControlContainer>
</Map>
