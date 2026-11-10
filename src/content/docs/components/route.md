---
title: Route
description: A route line that shows how far along a trip is, with dots at the start, the end and the current position.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="route-progress" description="A courier route through Amsterdam with a progress slider" />

`MapRoute` draws a line through `positions` in travel order. Set `progress` from 0 to 1 and the line splits in two: the travelled part in the theme's primary colour, the part still to go in the muted colour. The split is measured along the ground, so 0.5 means half the distance, not half the points.

A thin outline in the background colour keeps the line readable on any basemap.

## Usage

```svelte
<script lang="ts">
	import { Map, MapRoute } from '$lib/components/ui/map/index.js';

	const route: [number, number][] = [
		[4.8897, 52.3731],
		[4.8834, 52.3661],
		[4.8995, 52.3581],
		[4.9133, 52.3584]
	];
</script>

<Map class="h-96">
	<MapRoute positions={route} progress={0.4} />
</Map>
```

## Progress

`progress` defaults to 1, which draws the whole route as travelled. Change it as the trip goes on and the line updates in place. Values below 0 or above 1 are clamped.

To show the part still to go as a dashed line, pass `restDashArray`, in line widths. `[1, 2]` gives short dashes with wider gaps.

## Stops and head

With `showStops`, the route gets a dot at its first and last position. The start dot takes the travelled colour. The end dot stays muted until `progress` reaches 1.

With `showHead`, a dot marks where the travelled part ends. It only shows while the trip is under way, so not at 0 or 1. Both are on by default.

If you want a richer marker, such as a vehicle icon, turn `showHead` off and put a [Marker](/docs/components/marker) at the split point. `splitLine` from the [utilities](/docs/components/utilities) gives you that point:

```ts
import { splitLine } from '$lib/components/ui/map/index.js';

const { point } = splitLine(route, progress);
```

## Layers

The route uses one source and four layers: `<id>-casing`, `<id>-rest`, `<id>-done` and `<id>-stops`. Pass `id` if you need to refer to them, for example as a `beforeId` for another layer. `onclick` fires when the line itself is clicked, not the dots.

## API Reference

<ApiTable component="map-route" />
