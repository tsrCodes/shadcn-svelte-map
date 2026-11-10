<script lang="ts">
	import type { Feature, FeatureCollection, Point } from 'geojson';
	import { Map, MapClusterLayer, type MapClusterClick } from '#lib/registry/ui/map/index.js';

	interface Stand {
		name: string;
		bikes: number;
	}

	const SEED = 7;
	const COUNT = 400;
	const CENTER: [number, number] = [2.3488, 48.8534];
	const SPREAD = 0.06;
	/** Latitude degrees are longer than longitude degrees in Paris, so spread less north to south. */
	const LAT_SQUASH = 0.7;
	const MAX_BIKES = 20;

	/** A small seeded generator, so every load shows the same stands. */
	function seeded(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state * 16807) % 2147483647;
			return (state - 1) / 2147483646;
		};
	}

	function stands(): FeatureCollection<Point, Stand> {
		const random = seeded(SEED);
		const spread = () => (random() + random() + random() - 1.5) * SPREAD;
		const features = Array.from({ length: COUNT }, (_, index): Feature<Point, Stand> => ({
			type: 'Feature',
			properties: { name: `Stand ${index + 1}`, bikes: Math.floor(random() * MAX_BIKES) },
			geometry: {
				type: 'Point',
				coordinates: [CENTER[0] + spread(), CENTER[1] + spread() * LAT_SQUASH]
			}
		}));
		return { type: 'FeatureCollection', features };
	}

	const data = stands();
	let message = $state('Click a cluster or a stand');

	function showCluster(cluster: MapClusterClick) {
		message = `${cluster.count} stands here`;
	}

	function showStand(stand: Feature<Point, Stand>) {
		message = `${stand.properties.name}: ${stand.properties.bikes} bikes free`;
	}
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: CENTER, zoom: 11, bearing: 0, pitch: 0 }}>
		<MapClusterLayer {data} onclusterclick={showCluster} onclick={showStand} />
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		{message}
	</p>
</div>
