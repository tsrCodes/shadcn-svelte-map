<script lang="ts">
	import type { Feature, FeatureCollection, Point } from 'geojson';
	import { Label } from '#lib/registry/ui/label/index.js';
	import { Map, MapHeatmap, type LngLatTuple } from '#lib/registry/ui/map/index.js';

	interface Pickup {
		riders: number;
	}

	const SEED = 11;
	const PER_SPOT = 150;
	const MAX_RIDERS = 4;
	/** Busy spots in Madrid and how far pickups scatter around them, in degrees. */
	const SPOTS: { center: LngLatTuple; spread: number }[] = [
		{ center: [-3.7038, 40.4168], spread: 0.012 },
		{ center: [-3.6883, 40.4531], spread: 0.01 },
		{ center: [-3.6825, 40.4066], spread: 0.008 },
		{ center: [-3.7124, 40.4378], spread: 0.014 }
	];

	/** A small seeded generator, so every load shows the same pickups. */
	function seeded(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state * 16807) % 2147483647;
			return (state - 1) / 2147483646;
		};
	}

	function pickups(): FeatureCollection<Point, Pickup> {
		const random = seeded(SEED);
		const noise = () => random() + random() + random() - 1.5;
		const features = SPOTS.flatMap(({ center, spread }) =>
			Array.from({ length: PER_SPOT }, (): Feature<Point, Pickup> => ({
				type: 'Feature',
				properties: { riders: 1 + Math.floor(random() * MAX_RIDERS) },
				geometry: {
					type: 'Point',
					coordinates: [center[0] + noise() * spread * 2, center[1] + noise() * spread * 1.5]
				}
			}))
		);
		return { type: 'FeatureCollection', features };
	}

	const data = pickups();
	const id = $props.id();
	let radius = $state(20);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [-3.698, 40.43], zoom: 12, bearing: 0, pitch: 0 }}>
		<MapHeatmap {data} weight="riders" {radius} />
	</Map>
	<div
		class="absolute top-3 left-3 flex w-48 flex-col gap-2 rounded-md bg-background/90 p-3 text-sm shadow"
	>
		<Label for={`${id}-radius`}>Radius: {radius} px</Label>
		<input
			id={`${id}-radius`}
			type="range"
			min="5"
			max="40"
			bind:value={radius}
			class="accent-primary"
		/>
	</div>
</div>
