<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { Map, MapPointLayer } from '#lib/registry/ui/map/index.js';

	interface Sensor {
		name: string;
		pm25: number;
	}

	const CENTER: [number, number] = [-122.4194, 37.7749];
	const COUNT = 400;

	// A golden-angle spiral spreads the points evenly without random numbers.
	const SENSORS: FeatureCollection<Point, Sensor> = {
		type: 'FeatureCollection',
		features: Array.from({ length: COUNT }, (_, index) => {
			const angle = index * 2.39996;
			const distance = 0.0016 * Math.sqrt(index + 1);
			return {
				type: 'Feature',
				properties: { name: `Sensor ${index + 1}`, pm25: 4 + ((index * 7) % 30) },
				geometry: {
					type: 'Point',
					coordinates: [
						CENTER[0] + distance * Math.cos(angle) * 1.3,
						CENTER[1] + distance * Math.sin(angle)
					]
				}
			};
		})
	};
</script>

<Map class="size-full" viewport={{ center: CENTER, zoom: 12, bearing: 0, pitch: 0 }}>
	<MapPointLayer data={SENSORS} radius={4} strokeWidth={1} popupLabel="Air sensor">
		{#snippet popup(feature)}
			<p class="font-medium">{feature.properties.name}</p>
			<p class="text-muted-foreground">PM2.5: {feature.properties.pm25} µg/m³</p>
		{/snippet}
	</MapPointLayer>
</Map>
