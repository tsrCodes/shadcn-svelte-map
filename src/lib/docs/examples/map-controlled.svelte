<script lang="ts">
	import { Map, type MapViewport } from '#lib/registry/ui/map/index.js';

	const MIN_ZOOM = 10;
	const MAX_ZOOM = 15;

	let viewport = $state<MapViewport>({
		center: [-3.7038, 40.4168],
		zoom: 12,
		bearing: 0,
		pitch: 0
	});

	function clampZoom(next: MapViewport) {
		viewport = { ...next, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)) };
	}
</script>

<div class="relative size-full">
	<Map class="size-full" {viewport} onviewportchange={clampZoom} />
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 font-mono text-xs shadow"
		aria-live="polite"
	>
		Zoom {viewport.zoom.toFixed(1)} (kept between {MIN_ZOOM} and {MAX_ZOOM})
	</p>
</div>
