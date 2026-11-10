---
title: Shapes
description: Circles, polygons, polylines and rectangles from plain coordinates.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="shapes-demo" description="A circle, a rectangle, a polygon and a dashed polyline" />

Shapes draw a single geometry from coordinates, so you do not have to write GeoJSON. Each one is its own source with a line layer, and the filled shapes also have a fill layer. For many features at once, use [GeoJSON](/docs/components/geojson).

## Usage

```svelte
<script lang="ts">
	import {
		Map,
		MapCircle,
		MapPolygon,
		MapPolyline,
		MapRectangle
	} from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapCircle center={[151.2252, -33.8915]} radius={500} />
	<MapRectangle
		bounds={[
			[151.2042, -33.8781],
			[151.2153, -33.8693]
		]}
	/>
	<MapPolygon
		positions={[
			[151.1985, -33.8785],
			[151.2035, -33.8775],
			[151.2048, -33.8822]
		]}
	/>
	<MapPolyline
		positions={[
			[151.2035, -33.8775],
			[151.2153, -33.8693]
		]}
	/>
</Map>
```

All coordinates are `[longitude, latitude]`.

## The four shapes

- `MapCircle` takes a `center` and a `radius` in metres on the ground, so it grows and shrinks with the zoom. `steps` sets how many points make up the edge.
- `MapRectangle` takes `bounds` as `[[west, south], [east, north]]`.
- `MapPolygon` takes `positions`. You do not need to repeat the first point at the end; the ring is closed for you. `holes` cuts rings out of it.
- `MapPolyline` takes `positions` and draws a line through them. It has no fill.

Change any of these and the shape updates in place.

## Look

The outline uses the theme's `--primary` colour by default and follows the theme. Set `color`, `width` and `opacity` for the outline, and `fillColor` and `fillOpacity` for the inside. `fillColor` defaults to `color`.

`dashArray` makes a dashed line. Its numbers are in line widths, so `[2, 2]` draws dashes and gaps twice as long as the line is wide.

Shapes survive a basemap or theme swap.

## Click

`onclick` runs when the user clicks the shape. It gets the map event.

## Layer ids

The source id comes from `id`, or a unique id from `$props.id()`. The layers are `<id>-fill` and `<id>-line`. Pass `beforeId` to draw below another layer.

## API Reference

<ApiTable component="map-circle" />
<ApiTable component="map-polygon" />
<ApiTable component="map-polyline" />
<ApiTable component="map-rectangle" />
