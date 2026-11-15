---
title: Route
description: A route line that shows how far along a trip is, with dots at the start and the end and a dot or marker at the current position.
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

## Marker

For a richer marker, such as a vehicle icon, pass a `marker` snippet. The route renders it at the point `progress` has reached, and it replaces the head dot. Unlike the head dot it also shows at 0 and 1, so a vehicle stays on the map before it sets off and after it arrives.

The snippet gets `lngLat` and `heading`, the way the route runs at that point in degrees clockwise from north. Give a [Marker](/docs/components/marker) `rotation={heading}` and `rotationAlignment="map"` and an arrow keeps pointing along the line, even when the map is rotated:

```svelte
<MapRoute positions={route} {progress}>
	{#snippet marker({ lngLat, heading })}
		<MapMarker {lngLat} aria-label="Courier" rotation={heading} rotationAlignment="map">
			<MapMarkerContent>
				<Navigation2Icon class="size-5" />
			</MapMarkerContent>
		</MapMarker>
	{/snippet}
</MapRoute>
```

Leave out `rotation` for an icon that should stay upright, like a bike or an avatar. Outside a route, `splitLine` and `lineHeadingAt` from the [utilities](/docs/components/utilities) give you the same point and heading.

## Layers

The line is one source, `<id>`, with three layers: `<id>-casing`, `<id>-rest` and `<id>-done`. The stop and head dots are a second, small source, `<id>-points`, drawn by `<id>-stops`. The travelled part is a gradient on the full line, so animating `progress` changes a paint value and moves one dot; the line is only sent to MapLibre's worker again when `positions` change. Pass `id` if you need to refer to them, for example as a `beforeId` for another layer. `onclick` fires when the line itself is clicked, not the dots.

## API Reference

<ApiTable component="map-route" />
