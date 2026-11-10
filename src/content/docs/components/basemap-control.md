---
title: Basemap Control
description: A menu to switch the basemap and turn overlay layers on and off.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="basemap-control-demo" description="A map of Amsterdam with a layers menu that switches basemaps and toggles a park and a walking route" />

The basemap control is a layers button that opens a menu. The top group picks one basemap. The bottom group, shown when you pass `overlays`, has a checkbox for each overlay. The menu stays open while you tick overlays, so you can change several at once.

Switching the basemap keeps everything you drew on the map: markers, shapes and layers stay in place.

## Usage

Place the control inside a [Control Container](/docs/components/control-container).

```svelte
<script lang="ts">
	import { Map, MapBasemapControl, MapControlContainer } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-right">
		<MapBasemapControl />
	</MapControlContainer>
</Map>
```

## Basemaps

By default the menu offers `OPENFREEMAP_BASEMAPS`: Default, Streets, Bright and Blank. None of them needs an API key. Default follows the light and dark theme.

Pass `basemaps` to offer your own list. Each entry is a `MapBasemap`:

- `id`: a unique key, used for `value`.
- `label`: the text in the menu.
- `style`: a style URL, a style object, or `{ light, dark }` with one of each per theme.

```svelte
<script lang="ts">
	import {
		MapBasemapControl,
		OPENFREEMAP_BASEMAPS,
		type MapBasemap
	} from '$lib/components/ui/map/index.js';

	const basemaps: MapBasemap[] = [
		...OPENFREEMAP_BASEMAPS,
		{ id: 'terrain', label: 'Terrain', style: 'https://example.com/styles/terrain.json' }
	];

	let basemap = $state('streets');
</script>

<MapBasemapControl {basemaps} bind:value={basemap} />
```

Bind `value` to read or set the chosen basemap, or use `onvaluechange` to hear about picks. An id that is not in the list falls back to the first basemap.

While the control is mounted, it decides the map style and overrides the `style` prop on `Map`. When it is removed, the map goes back to its own style. If your style loads from a host other than OpenFreeMap, add that host to your [Content Security Policy](/docs/csp).

## Overlays

An overlay is any layer the user can switch on and off. Pass `overlays` as a list of `MapOverlay` objects, each with an `id` and a `label`, and bind `activeOverlays` to the ids that are on.

The control only keeps the list of ids. You render each overlay yourself and show it while its id is active:

```svelte
<script lang="ts">
	import {
		Map,
		MapBasemapControl,
		MapControlContainer,
		MapPolygon,
		type MapOverlay
	} from '$lib/components/ui/map/index.js';

	const overlays: MapOverlay[] = [{ id: 'park', label: 'Park' }];
	let activeOverlays = $state(['park']);
</script>

<Map class="h-96">
	{#if activeOverlays.includes('park')}
		<MapPolygon positions={park} />
	{/if}
	<MapControlContainer position="top-right">
		<MapBasemapControl {overlays} bind:activeOverlays />
	</MapControlContainer>
</Map>
```

## Fullscreen

The menu opens inside the map element, not at the end of the page. It still shows when the map is in fullscreen with the [Fullscreen Control](/docs/components/fullscreen-control).

## API Reference

<ApiTable component="map-basemap-control" />
