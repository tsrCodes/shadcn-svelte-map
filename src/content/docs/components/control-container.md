---
title: Control Container
description: Stack built-in or custom controls in one corner of the map.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="control-container-demo" description="A custom reset button in one corner and zoom buttons in another" />

`MapControlContainer` places its children in a corner of the map and stacks them in a column. Every built-in control goes inside one. Your own buttons can go in one too.

## Usage

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

## Position

`position` is `top-left`, `top-right`, `bottom-left` or `bottom-right`. The default is `top-right`. Use one container per corner. The `bottom-right` container sits a little higher, so it does not cover the attribution button.

## Custom controls

Any element works. A shadcn `Button` with `variant="outline"` and `size="icon"` matches the built-in controls. Give it a solid background so it stays visible over a light basemap in dark mode:

```svelte
<script lang="ts">
	import HouseIcon from '@lucide/svelte/icons/house';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Map, MapControlContainer, type MapViewport } from '$lib/components/ui/map/index.js';

	const HOME: MapViewport = { center: [12.4964, 41.9028], zoom: 12, bearing: 0, pitch: 0 };
	let viewport = $state<MapViewport>({ ...HOME });
</script>

<Map class="h-96" bind:viewport>
	<MapControlContainer position="top-left">
		<Button
			variant="outline"
			size="icon"
			class="bg-background shadow-xs hover:bg-muted dark:bg-background dark:hover:bg-muted"
			aria-label="Back to the start"
			onclick={() => (viewport = { ...HOME })}
		>
			<HouseIcon />
		</Button>
	</MapControlContainer>
</Map>
```

Icon-only buttons need an `aria-label`. The container renders once the map exists, so its children can call `getMapContext()` and use the map right away.

## API Reference

<ApiTable component="map-control-container" />
