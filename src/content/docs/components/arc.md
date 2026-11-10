---
title: Arc
description: Curved lines between pairs of places, for flights, trade links or any from-to data.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="arc-demo" description="Flights from Frankfurt to six cities, drawn as arcs you can click" />

`MapArc` draws one curved line for each item in `arcs`. Each item needs a `from` and a `to` position as `[longitude, latitude]`. All arcs share one layer, so hundreds of them stay fast.

## Usage

```svelte
<script lang="ts">
	import { Map, MapArc } from '$lib/components/ui/map/index.js';

	const arcs = [
		{ from: [8.5706, 50.0333], to: [-9.1359, 38.7742] },
		{ from: [8.5706, 50.0333], to: [23.9484, 37.9364] }
	] satisfies { from: [number, number]; to: [number, number] }[];
</script>

<Map class="h-96">
	<MapArc {arcs} />
</Map>
```

## Curve

`curvature` sets how far each arc bends to the side, as a share of the straight distance between its ends. It is measured in longitude and latitude, so arcs far from the equator look a little flatter or steeper than ones near it. 0 draws a straight line. The default is 0.2.

Arcs bend to the left of the direction of travel. To bend the other way, use a negative `curvature`.

An arc that crosses the antimeridian, such as Tokyo to San Francisco, goes the short way over the Pacific.

## Clicks

Items can carry any extra fields. `onclick` gets the clicked item back with its index in `arcs`, so you can look up whatever you stored on it:

```svelte
<MapArc
	arcs={flights}
	onclick={(flight, index) => {
		selected = flight.code;
	}}
/>
```

## API Reference

<ApiTable component="map-arc" />
