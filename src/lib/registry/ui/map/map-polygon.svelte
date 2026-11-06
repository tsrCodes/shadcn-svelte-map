<script lang="ts">
	import type { Polygon } from 'geojson';
	import MapShape, { type FilledShapeProps } from './map-shape.svelte';
	import { closeRing, type LngLatTuple } from './geometry.js';

	interface Props extends FilledShapeProps {
		/** Corners as `[longitude, latitude]`. The ring is closed for you. */
		positions: LngLatTuple[];
		/** Rings cut out of the polygon, in the same form as `positions`. */
		holes?: LngLatTuple[][];
	}

	let { positions, holes = [], ...rest }: Props = $props();

	const geometry: Polygon = $derived({
		type: 'Polygon',
		coordinates: [closeRing(positions), ...holes.map(closeRing)]
	});
</script>

<MapShape kind="polygon" {geometry} {...rest} />
