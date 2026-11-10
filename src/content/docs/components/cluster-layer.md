---
title: Cluster Layer
description: Group nearby points into counted clusters that split apart as you zoom in.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="cluster-layer-demo" description="400 bike stands in Paris grouped into clusters" />

`MapClusterLayer` takes a GeoJSON feature collection of points and groups the ones that sit close together on screen. Each group shows as a circle with a count. Circles grow at 10, 100 and 1000 points. Zoom in and the clusters split until single points show.

Clustering runs in MapLibre's worker, so thousands of points stay smooth.

## Usage

```svelte
<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { Map, MapClusterLayer } from '$lib/components/ui/map/index.js';

	let { stands }: { stands: FeatureCollection<Point, { name: string }> } = $props();
	let selected = $state('');
</script>

<Map class="h-96">
	<MapClusterLayer data={stands} onclick={(stand) => (selected = stand.properties.name)} />
</Map>
```

## Grouping

`clusterRadius` is the distance in pixels within which points join a cluster. It defaults to 50. Above `clusterMaxZoom`, which defaults to 14, points are never grouped. Both are read once, when the layer is created.

Changing `data` updates the source in place, so you can filter points without remounting the layer.

## Clicks

Clicking a cluster zooms in until it splits. Set `zoomOnClick={false}` to keep the camera still. `onclusterclick` gets the cluster id, the number of points in it and its position.

Clicking a single point calls `onclick` with the original feature from `data` and its index, so any properties you stored come back as you passed them. The cursor turns into a pointer over clusters and points.

## Labels

On styles that ship glyphs, which includes every built-in basemap, the counts are drawn by MapLibre in the font stack from `font`. It defaults to `DEFAULT_CLUSTER_FONT`, which is `['Noto Sans Regular']`, a font OpenFreeMap serves. If you use another style, pass a font stack that style's glyph server has.

If the style has no `glyphs` URL at all, MapLibre cannot draw text. The counts are then drawn as HTML on top of the circles, in the page font, and follow the map as it moves. They are hidden from screen readers, since they repeat what the circle shows.

## API Reference

<ApiTable component="map-cluster-layer" />
