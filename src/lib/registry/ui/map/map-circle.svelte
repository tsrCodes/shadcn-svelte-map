<script lang="ts">
	import type { Polygon } from 'geojson';
	import MapShape, { type FilledShapeProps } from './map-shape.svelte';
	import { circleRing, type LngLatTuple } from './geometry.js';

	interface Props extends FilledShapeProps {
		/** `[longitude, latitude]` of the middle. */
		center: LngLatTuple;
		/** Radius in metres on the ground, so the circle scales with the map. */
		radius: number;
		/** Points along the edge. More is smoother. */
		steps?: number;
	}

	let { center, radius, steps, ...rest }: Props = $props();

	const geometry: Polygon = $derived({
		type: 'Polygon',
		coordinates: [circleRing(center, radius, steps)]
	});
</script>

<MapShape kind="circle" {geometry} {...rest} />
