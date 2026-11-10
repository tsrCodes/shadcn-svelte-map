---
title: Zoom Control
description: Two buttons that zoom the map in and out.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="zoom-control-demo" description="A map of Paris with zoom buttons in the top-right corner" />

The zoom control is a vertical pair of buttons. Each press zooms by `step` levels, one by default. A button turns disabled when the map reaches its minimum or maximum zoom, so keyboard and screen reader users know they hit the limit.

## Usage

Place the control inside a [Control Container](/docs/components/control-container). The container pins it to a corner of the map.

```svelte
<script lang="ts">
	import { Map, MapControlContainer, MapZoomControl } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-right">
		<MapZoomControl />
	</MapControlContainer>
</Map>
```

## Step size

Set `step` to zoom further per press. Fractions work too.

```svelte
<MapZoomControl step={0.5} />
```

## Reduced motion

The zoom eases over a short animation. When the user prefers reduced motion, the map jumps to the new zoom instead.

## API Reference

<ApiTable component="map-zoom-control" />
