<script lang="ts">
	import {
		Map,
		MapMarker,
		MapPolygon,
		MapPolyline,
		circleRing,
		distanceMeters,
		pointInPolygon,
		type LngLatTuple
	} from '#lib/registry/ui/map/index.js';

	/** Free delivery within this many metres of the shop. */
	const RADIUS = 1500;

	let shop = $state<LngLatTuple>([-0.1246, 51.5007]);
	let home = $state<LngLatTuple>([-0.1419, 51.5014]);

	const zone = $derived(circleRing(shop, RADIUS));
	const distance = $derived(distanceMeters(shop, home));
	const inside = $derived(pointInPolygon(home, [zone]));
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [-0.13, 51.502], zoom: 13, bearing: 0, pitch: 0 }}>
		<MapPolygon positions={zone} fillOpacity={0.1} />
		<MapPolyline positions={[shop, home]} dashArray={[2, 2]} />
		<MapMarker bind:lngLat={shop} draggable aria-label="Shop" />
		<MapMarker bind:lngLat={home} draggable aria-label="Customer" />
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		{Math.round(distance)} m away, {inside ? 'free delivery' : 'outside the free zone'}
	</p>
</div>
