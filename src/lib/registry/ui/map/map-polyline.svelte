<script lang="ts">
	import type { LineString } from 'geojson';
	import MapShape, { type ShapeProps } from './map-shape.svelte';
	import type { LngLatTuple } from './geometry.js';

	interface Props extends ShapeProps {
		/** Points along the line as `[longitude, latitude]`. */
		positions: LngLatTuple[];
	}

	let { positions, ...rest }: Props = $props();

	const geometry: LineString = $derived({ type: 'LineString', coordinates: positions });
</script>

<MapShape kind="polyline" {geometry} {...rest} />
