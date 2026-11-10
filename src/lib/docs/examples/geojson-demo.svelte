<script lang="ts">
	import type { FeatureCollection, Polygon } from 'geojson';
	import { Map, MapGeoJSON } from '#lib/registry/ui/map/index.js';

	function box(name: string, west: number, south: number, east: number, north: number) {
		return {
			type: 'Feature' as const,
			properties: { name },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[west, south],
						[east, south],
						[east, north],
						[west, north],
						[west, south]
					]
				]
			}
		};
	}

	const ZONES: FeatureCollection<Polygon, { name: string }> = {
		type: 'FeatureCollection',
		features: [
			box('Delivery zone A', -0.16, 51.5, -0.12, 51.525),
			box('Delivery zone B', -0.115, 51.5, -0.075, 51.525),
			box('Delivery zone C', -0.16, 51.475, -0.12, 51.497),
			box('Delivery zone D', -0.115, 51.475, -0.075, 51.497)
		]
	};

	let hovered = $state<string | null>(null);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [-0.1175, 51.5], zoom: 11.5, bearing: 0, pitch: 0 }}>
		<MapGeoJSON
			data={ZONES}
			promoteId="name"
			onhover={(feature) => (hovered = feature ? String(feature.properties.name) : null)}
		/>
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		{hovered ?? 'Hover a zone'}
	</p>
</div>
