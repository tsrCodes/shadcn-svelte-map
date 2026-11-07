<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { MapPointLayer, getMapContext } from '#lib/registry/ui/map/index.js';
	import type { Order } from './data.js';

	interface Props {
		/** Orders inside a zone, drawn in the primary colour. */
		covered: FeatureCollection<Point, Order>;
		/** Orders no zone reaches, drawn muted. */
		uncovered: FeatureCollection<Point, Order>;
	}

	let { covered, uncovered }: Props = $props();

	// Point layers take MapLibre colours, so the muted one is read from the map's theme.
	const ctx = getMapContext();
	const mutedColor = $derived(ctx.colors?.mutedForeground);
</script>

<MapPointLayer id="delivery-orders-uncovered" data={uncovered} color={mutedColor} radius={3} />
<MapPointLayer id="delivery-orders-covered" data={covered} radius={4.5} />
