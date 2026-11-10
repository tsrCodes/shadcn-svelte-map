---
title: Place Autocomplete
description: A place search box that suggests addresses and places as you type, with or without a map.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
</script>

<ComponentPreview name="place-autocomplete-demo" description="A search box that shows the picked place in a card" />

`PlaceAutocomplete` is a search box with a list of suggestions. It asks the [Photon](https://photon.komoot.io) geocoder, which searches OpenStreetMap data. It needs no API key and no map, so you can use it in any form, such as a shipping address or a store finder.

## Installation

It is its own registry item, so you can add it without the map:

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/place-autocomplete.json" />

## Usage

```svelte
<script lang="ts">
	import { PlaceAutocomplete, type Place } from '$lib/components/ui/place-autocomplete/index.js';

	let place = $state<Place | null>(null);
</script>

<PlaceAutocomplete onselect={(next) => (place = next)} />

{#if place}
	<p>{place.name} at {place.position[1]}, {place.position[0]}</p>
{/if}
```

Bind `query` if you need the text in the box. Picking a place sets it to the place's name.

## Searching

The box waits until the user stops typing, then sends one request. While a request is in flight, a new keystroke aborts it, so an old answer never replaces a newer one. The defaults:

- `debounce`: 300 ms after the last keystroke.
- `minLength`: 2 characters. Shorter text clears the list.
- `limit`: 6 results.
- `timeout`: 8000 ms, after which the request gives up and the list shows an error.

`lang` asks for results in `default`, `de`, `en` or `fr`. `near` is a function that returns a `[longitude, latitude]` position. It is read when each search starts, and results near it rank higher.

Network and response errors go to `onerror`. Without it the box logs them to the console. `PlaceSearch` on its own stays silent unless you pass `onerror`. Aborted searches are not errors and never reach it.

The keyboard works as you would expect: arrow keys move through the list, Enter picks, and Escape closes the list or, if it is already closed, clears the box.

## With a map

The box has no tie to a map. To move a map, set its `viewport` when a place is picked:

<ComponentPreview name="place-autocomplete-map" description="A search box over a map that moves to the picked place" />

Inside a `Map`, the [Search Control](/docs/components/search-control) does this for you. It flies to points, fits areas to the view, and prefers results near the middle of the map.

## Your own server

The public Photon instance is shared. For heavy traffic, run your own or use another provider that speaks the Photon API, and pass its base URL:

```svelte
<PlaceAutocomplete baseUrl="https://geocoder.example.com" />
```

The site needs to allow the geocoder in its Content Security Policy. `PHOTON_ORIGIN` is the public instance's origin, ready for `connect-src`. See [Content Security Policy](/docs/csp).

## Helpers

The item also exports what the box is built from, for when you need your own UI.

### PlaceSearch

A class with the search logic and no markup. Call `search(query)` on every keystroke and read the reactive fields.

```svelte
<script lang="ts">
	import { PlaceSearch } from '$lib/components/ui/place-autocomplete/index.js';

	const places = new PlaceSearch(() => ({ limit: 5, lang: 'en' }));
	$effect(() => () => places.cancel());
</script>

<input aria-label="Search places" oninput={(event) => places.search(event.currentTarget.value)} />

{#if places.status === 'loading'}
	<p>Searching…</p>
{:else}
	{#each places.results as place (place.id)}
		<p>{place.name}</p>
	{/each}
{/if}
```

- `results`: the places from the last search.
- `status`: `'idle'`, `'loading'`, `'done'` or `'error'`.
- `error`: the last error, or `null`.
- `search(query)`: starts a debounced search. Text shorter than `minLength` clears the results.
- `cancel()`: stops a pending search and aborts the request in flight. Call it when your component goes away.

The constructor takes a function that returns the options, so it reads your latest props for every search. The options are `baseUrl`, `limit`, `lang`, `debounce`, `minLength`, `near`, `timeout` and `onerror`.

### Photon helpers

- `photonSearchUrl({ query, baseUrl, limit, lang, near })` returns the search URL as a string. Use it to call Photon from a server route.
- `parsePhotonResponse(body)` turns a Photon response into `Place[]`. It skips results without a name or a point, and drops duplicates. It throws when the body is not a GeoJSON feature collection.
- `PHOTON_URL` is the default base URL. `PHOTON_ORIGIN` is the origin for your CSP.

### Place

Each result is a `Place`:

- `id`: a stable OpenStreetMap id, such as `W783052052`.
- `name` and `description`: the place's name, and its street, city and country without repeating the name.
- `kind`: the OpenStreetMap kind, such as `city`, `street` or `house`.
- `position`: `[longitude, latitude]`, typed as `PlacePosition`.
- `bounds`: south-west and north-east corners, when the place covers an area.

## API Reference

<ApiTable component="place-autocomplete" />
