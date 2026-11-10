---
title: Heatmap
description: Show where points gather as a smooth density heatmap.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="heatmap-demo" description="Ride pickups in Madrid as a heatmap with a radius slider" />

`MapHeatmap` blurs each point into its neighbours and colours the result by density. Where there is no data the layer is see-through, so the basemap shows. Use it when the shape of the data matters more than single points.

## Usage

```svelte
<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { Map, MapHeatmap } from '$lib/components/ui/map/index.js';

	let { pickups }: { pickups: FeatureCollection<Point> } = $props();
</script>

<Map class="h-96">
	<MapHeatmap data={pickups} />
</Map>
```

`data` can also be a URL to a GeoJSON file. MapLibre then loads it for you. If the file is on another origin, add that origin to `connect-src` in your [Content Security Policy](/docs/csp).

## Weight

By default every point counts once. Set `weight` to the name of a numeric property and each point counts that many times. A point without the property, or with a value that is not a number, counts once.

```svelte
<MapHeatmap data={pickups} weight="riders" />
```

## Tuning

- `radius` is how far each point spreads, in pixels. Raise it for sparse data, lower it to see detail.
- `intensity` multiplies the density. Raise it when the map looks faint, lower it when everything is hot.
- `opacity` sets how much of the basemap shows through.

All three can change at any time without rebuilding the layer.

## Colours

The ramp runs through the theme's five chart colours, `--chart-1` to `--chart-5`, from low to high density. It follows light and dark mode. Pass `colors` to use your own ramp; the first colour is used for the faintest areas.

## API Reference

<ApiTable component="map-heatmap" />
