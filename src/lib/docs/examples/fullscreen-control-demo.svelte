<script lang="ts">
	import {
		Map,
		MapControlContainer,
		MapFullscreenControl,
		MapZoomControl
	} from '#lib/registry/ui/map/index.js';

	let fullscreen = $state(false);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [12.4964, 41.9028], zoom: 12, bearing: 0, pitch: 0 }}>
		<MapControlContainer position="top-right">
			<MapZoomControl />
			<MapFullscreenControl onchange={(next) => (fullscreen = next)} />
		</MapControlContainer>
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		{fullscreen ? 'Fullscreen' : 'In page'}
	</p>
</div>
