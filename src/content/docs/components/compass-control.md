---
title: Compass Control
description: A needle that shows the map bearing and turns the map back to north when pressed.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="compass-control-demo" description="A rotated and tilted map of Midtown Manhattan with a compass button" />

The compass needle points north and tilts with the camera. Rotate the map with right-click drag or two fingers, and the needle follows. Press the button to turn the map back to north.

## Usage

Place the control inside a [Control Container](/docs/components/control-container), usually under the [Zoom Control](/docs/components/zoom-control).

```svelte
<script lang="ts">
	import {
		Map,
		MapCompassControl,
		MapControlContainer,
		MapZoomControl
	} from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-right">
		<MapZoomControl />
		<MapCompassControl />
	</MapControlContainer>
</Map>
```

## Keeping the tilt

By default a press also tilts the camera back to flat. Set `resetPitch={false}` to reset only the bearing. Use `onreset` to run code after a press, for example to log it.

```svelte
<MapCompassControl resetPitch={false} onreset={() => console.log('Back to north')} />
```

## Reduced motion

The camera turns back over a short animation, and the needle turns smoothly. When the user prefers reduced motion, both change at once.

## API Reference

<ApiTable component="map-compass-control" />
