<script lang="ts">
	import { Map, MapPolygon, MapRoute } from '#lib/registry/ui/map/index.js';

	const ROUTE: [number, number][] = [
		[-73.9857, 40.7484],
		[-73.9851, 40.7536],
		[-73.9787, 40.7614],
		[-73.9733, 40.7644],
		[-73.9654, 40.7829]
	];

	const PARK: [number, number][] = [
		[-73.9819, 40.7681],
		[-73.958, 40.8006],
		[-73.9493, 40.7969],
		[-73.973, 40.7644],
		[-73.9819, 40.7681]
	];
</script>

<Map
	class="size-full [--primary:var(--chart-2)]"
	viewport={{ center: [-73.972, 40.774], zoom: 12.3, bearing: 0, pitch: 0 }}
>
	<MapPolygon positions={PARK} fillOpacity={0.2} />
	<MapRoute positions={ROUTE} progress={0.45} showStops showHead />
</Map>
