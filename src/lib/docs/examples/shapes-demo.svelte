<script lang="ts">
	import {
		Map,
		MapCircle,
		MapPolygon,
		MapPolyline,
		MapRectangle,
		type LngLatBoundsTuple,
		type LngLatTuple
	} from '#lib/registry/ui/map/index.js';

	const STADIUM: LngLatTuple = [151.2252, -33.8915];
	const PARK: LngLatBoundsTuple = [
		[151.2042, -33.8781],
		[151.2153, -33.8693]
	];
	const MARKET: LngLatTuple[] = [
		[151.1985, -33.8785],
		[151.2035, -33.8775],
		[151.2048, -33.8822],
		[151.1992, -33.8838]
	];
	const WALK: LngLatTuple[] = [
		[151.2035, -33.8775],
		[151.2075, -33.8752],
		[151.2105, -33.8737],
		[151.2153, -33.8693]
	];
</script>

<Map class="size-full" viewport={{ center: [151.212, -33.8805], zoom: 13, bearing: 0, pitch: 0 }}>
	<MapCircle center={STADIUM} radius={500} fillOpacity={0.1} dashArray={[2, 2]} />
	<MapRectangle bounds={PARK} fillOpacity={0.3} />
	<MapPolygon positions={MARKET} fillOpacity={0.5} width={1} />
	<MapPolyline positions={WALK} width={4} dashArray={[0.5, 1.5]} />
</Map>
