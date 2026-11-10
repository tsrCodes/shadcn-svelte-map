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

## Layer ids

The source id comes from `id`, or a unique id from `$props.id()` if you leave it out. The circle layer is `<id>-circles`. Pass `beforeId` to draw the points below another layer.

## API Reference

<ApiTable component="map-point-layer" />
