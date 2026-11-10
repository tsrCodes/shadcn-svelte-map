<script lang="ts">
	import { Map, MapMarker, type MapViewport } from '#lib/registry/ui/map/index.js';
	import { PlaceAutocomplete, type Place } from '#lib/registry/ui/place-autocomplete/index.js';

	const ZOOM = 14;

	let viewport = $state<MapViewport>({ center: [2.1734, 41.3851], zoom: 11, bearing: 0, pitch: 0 });
	let place = $state<Place | null>(null);

	function show(next: Place) {
		place = next;
		viewport = { ...viewport, center: next.position, zoom: ZOOM };
	}
</script>

<div class="relative size-full">
	<Map class="size-full" bind:viewport>
		{#if place}
			<MapMarker lngLat={place.position} aria-label={place.name} />
		{/if}
	</Map>
	<PlaceAutocomplete class="absolute top-3 left-3" near={() => viewport.center} onselect={show} />
</div>
