<script lang="ts">
	import { Map, MapMarker, MapMarkerContent } from '#lib/registry/ui/map/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let pin = $state<[number, number]>([-0.1276, 51.5072]);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [-0.1276, 51.5072], zoom: 12, bearing: 0, pitch: 0 }}>
		<MapMarker bind:lngLat={pin} draggable anchor="bottom" aria-label="Drop-off point">
			<MapMarkerContent>
				<MapPinIcon class="size-8 fill-primary text-primary-foreground drop-shadow" />
			</MapMarkerContent>
		</MapMarker>
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 font-mono text-xs shadow"
		aria-live="polite"
	>
		{pin[1].toFixed(4)}, {pin[0].toFixed(4)}
	</p>
</div>
