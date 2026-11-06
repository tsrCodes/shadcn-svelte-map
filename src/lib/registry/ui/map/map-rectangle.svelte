<script lang="ts">
	import type { Polygon } from 'geojson';
	import MapShape, { type FilledShapeProps } from './map-shape.svelte';
	import { rectangleRing, type LngLatBoundsTuple } from './geometry.js';

	interface Props extends FilledShapeProps {
		/** `[[west, south], [east, north]]`. */
		bounds: LngLatBoundsTuple;
	}

	let { bounds, ...rest }: Props = $props();

	const geometry: Polygon = $derived({ type: 'Polygon', coordinates: [rectangleRing(bounds)] });
</script>

<MapShape kind="rectangle" {geometry} {...rest} />
