---
title: GeoJSON
description: Draw any GeoJSON polygons, lines and points, with hover and click.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="geojson-demo" description="Four delivery zones that highlight on hover" />

`MapGeoJSON` draws a GeoJSON `Feature` or `FeatureCollection`. Polygons get a fill and an outline, lines get a line, and points get a circle. The hovered feature is highlighted.

## Usage

```svelte
<script lang="ts">
	import type { FeatureCollection } from 'geojson';
	import { Map, MapGeoJSON } from '$lib/components/ui/map/index.js';

	let { zones }: { zones: FeatureCollection } = $props();
</script>

<Map class="h-96">
	<MapGeoJSON data={zones} onclick={(feature) => console.log(feature.properties)} />
</Map>
```

## Data

`data` takes a GeoJSON object or a URL. With a URL, MapLibre fetches the file itself. If your site has a Content Security Policy, its `connect-src` must allow that host.

Change `data` and the source updates in place. The layers are not rebuilt.

## Hover and click

`onhover` gets the feature under the pointer, and `null` when the pointer leaves. `onclick` gets the clicked feature and the map event.

The hovered feature is drawn with `hoverFillOpacity`, `hoverLineWidth` and `hoverCircleRadius`. Hover tracks features by id. By default ids are positions in the data, so the hover clears when `data` changes. Set `promoteId` to a property name, such as `"name"`, to use that property as the id instead.

## Look

Fills, lines and points use the theme's `--primary` colour by default and follow the theme. Set `fillColor`, `lineColor` and `circleColor` to change them. The layers survive a basemap or theme swap.

## Layer ids

The source id comes from `id`, or a unique id from `$props.id()`. The layers are `<id>-fill`, `<id>-line` and `<id>-circle`. Polygon outlines are drawn by the line layer. Pass `beforeId` to draw below another layer; changing it moves the layers.

## API Reference

<ApiTable component="map-geojson" />
