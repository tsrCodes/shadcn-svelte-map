<script lang="ts">
	import { Map, type MapViewport } from '#lib/registry/ui/map/index.js';

	let viewport = $state<MapViewport>({ center: [2.3522, 48.8566], zoom: 11, bearing: 0, pitch: 0 });
</script>

<div class="relative size-full">
	<Map class="size-full" bind:viewport />
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 font-mono text-xs shadow"
		aria-live="polite"
	>
		{viewport.center[1].toFixed(4)}, {viewport.center[0].toFixed(4)} · zoom {viewport.zoom.toFixed(
			1
		)}
	</p>
</div>
