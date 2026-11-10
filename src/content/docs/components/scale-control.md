---
title: Scale Control
description: A bar that shows how far a stretch of the map is on the ground.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="scale-control-demo" description="A map of San Francisco with a metric and an imperial scale bar" />

The scale bar measures the ground distance across the middle of the map and rounds it down to 1, 2, 3 or 5 times a power of ten. It updates as you pan and zoom. The bar is never wider than `maxWidth` pixels. Screen readers read it as "Map scale" followed by the distance.

## Usage

Place the control inside a [Control Container](/docs/components/control-container). The bottom-left corner keeps it clear of the attribution.

```svelte
<script lang="ts">
	import { Map, MapControlContainer, MapScaleControl } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="bottom-left">
		<MapScaleControl />
	</MapControlContainer>
</Map>
```

## Units

`unit="metric"` shows kilometres and metres. `unit="imperial"` shows miles and feet. To show both, stack two controls in the same container, as in the preview above.

```svelte
<MapScaleControl unit="imperial" maxWidth={120} />
```

## API Reference

<ApiTable component="map-scale-control" />
