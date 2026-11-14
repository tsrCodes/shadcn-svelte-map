---
title: Point Layer
description: Hundreds or thousands of points drawn on the canvas, with an optional popup on click.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="point-layer-demo" description="400 air sensors drawn on the canvas, with a popup on click" />

`MapPointLayer` draws a GeoJSON `FeatureCollection` of points as circles on the map canvas. It stays fast with thousands of points.

Use it above about 200 points. For fewer points that need to be focusable buttons with labels and tooltips, use a [Marker](/docs/components/marker).

## Usage

```svelte
<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { Map, MapPointLayer } from '$lib/components/ui/map/index.js';

	let { stops }: { stops: FeatureCollection<Point, { name: string }> } = $props();
</script>

<Map class="h-96">
	<MapPointLayer data={stops} popupLabel="Stop">
		{#snippet popup(feature)}
			<p class="font-medium">{feature.properties.name}</p>
		{/snippet}
	</MapPointLayer>
</Map>
```

## Popup

Pass a `popup` snippet to show a popup when a point is clicked. The snippet gets the clicked feature. There is one popup for the whole layer: it moves to whichever point you click, and a click anywhere else on the map closes it. Escape closes it too.

Set `popupLabel` to name the popup for screen readers. `popupOffset`, `popupMaxWidth` and `popupClass` change its look.

To handle clicks yourself, use `onclick`. It gets the feature and its index in `data.features`.

## Updating data

Replace or change `data` and the points update in place. The layer is not rebuilt.

## Look

Points use the theme's `--primary` colour with a `--background` outline, and follow the theme when it changes. Set `color`, `radius`, `strokeColor` and `strokeWidth` to change them. The layer survives a basemap or theme swap.

## Keyboard

Points drawn on the canvas are not elements, so the layer also lists them for keyboard and screen reader users. The list is one tab stop on the map: Tab to it, move with the arrow keys, Page Up and Page Down, Home and End, and press Enter to open a point's popup. Escape closes the popup and puts focus back on the list. The list stays hidden until it has focus, then shows a few points around the current one in the bottom-left corner. The current point gets a thicker outline and is panned into view. Only those few rows are in the page, so the list stays light with thousands of points, and screen readers still hear the position, such as 12 of 4,000.

Each point is named by its `name` property. Pass `featureLabel` to name it another way, and `listLabel` to name the list, such as "Stores". If you make the points reachable another way, such as a list beside the map, turn it off with `keyboard={false}`.

## Layer ids

The source id comes from `id`, or a unique id from `$props.id()` if you leave it out. The circle layer is `<id>-circles`. Pass `beforeId` to draw the points below another layer; changing it moves them.

## API Reference

<ApiTable component="map-point-layer" />
