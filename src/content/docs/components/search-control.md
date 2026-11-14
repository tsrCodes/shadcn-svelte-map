---
title: Search Control
description: A search box that finds places and moves the map to the one you pick.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
</script>

<ComponentPreview name="search-control-demo" description="A map of Madrid with a place search box that drops a marker on the chosen place" />

Type a place name and pick a result with the mouse or the arrow keys and Enter. The map flies to a place that is a point, such as an address or a cafe. For a place that covers an area, such as a city or a park, the map fits the area in view.

The search control is the [Place Autocomplete](/docs/components/place-autocomplete) box wired to the map. Results come from the [Photon](https://photon.komoot.io) geocoder, built on OpenStreetMap data, which needs no API key.

## Installation

It adds the [Place Autocomplete](/docs/components/place-autocomplete) box and needs the map.

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-search.json" />

## Usage

Place the control inside a [Control Container](/docs/components/control-container). The top-left corner leaves room for the results list.

```svelte
<script lang="ts">
	import { Map, MapControlContainer } from '$lib/components/ui/map/index.js';
	import { MapSearchControl } from '$lib/components/ui/map-search/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-left">
		<MapSearchControl />
	</MapControlContainer>
</Map>
```

## Using the result

`onselect` gets the chosen `Place`, after the map starts moving. Each place has an `id`, a `name`, a `description` with street, city and country, a `kind`, a `position` and, for areas, `bounds`. Use it to drop a marker, as in the preview above:

```svelte
<script lang="ts">
	import type { Place } from '$lib/components/ui/place-autocomplete/index.js';

	let picked = $state.raw<Place | null>(null);
</script>

<Map class="h-96">
	{#if picked}
		<MapMarker lngLat={picked.position} aria-label={picked.name} />
	{/if}
	<MapControlContainer position="top-left">
		<MapSearchControl onselect={(place) => (picked = place)} />
	</MapControlContainer>
</Map>
```

## Camera

- `zoom` is the zoom for point places, and the furthest the map zooms in when fitting an area.
- `padding` is the space in pixels kept around an area.
- `nearCenter` ranks results near the middle of the map first. It is on by default. Turn it off for a search with no local bias.

When the user prefers reduced motion, the map jumps to the place instead of flying.

## Search options

Every prop of Place Autocomplete passes through, such as `placeholder`, `limit`, `lang`, `debounce` and `onerror`. Bind `query` to read or set the text in the box. Escape closes the results, and a second Escape clears the box.

To use your own Photon server, set `baseUrl` and add its host to your [Content Security Policy](/docs/csp).

## API Reference

<ApiTable component="map-search-control" />
