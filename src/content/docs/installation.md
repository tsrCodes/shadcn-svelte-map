---
title: Installation
description: Add the map to a SvelteKit project with the shadcn-svelte CLI.
---

<script>
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
</script>

## Requirements

- SvelteKit 2 or 3 with Svelte 5.40 or newer.
- Tailwind CSS v4.
- shadcn-svelte, set up with `init`. If you have not done that yet:

<CodeBlockCommand command="npx shadcn-svelte@latest init" />

## Add the map

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map.json" />

This copies the map components into `src/lib/components/ui/map`, adds the shadcn items they use (button, button group, dropdown menu, spinner) and installs these packages:

- `maplibre-gl` renders the map.
- `@lucide/svelte` provides the icons.

The MapLibre worker is bundled with your app through Vite, so the map loads nothing from a CDN.

## Your first map

Give the map a height. It fills its parent's width.

```svelte
<script lang="ts">
	import { Map, MapMarker } from '$lib/components/ui/map/index.js';
</script>

<Map
	class="h-96 rounded-lg border"
	viewport={{ center: [13.405, 52.52], zoom: 11, bearing: 0, pitch: 0 }}
>
	<MapMarker lngLat={[13.405, 52.52]} aria-label="Berlin" />
</Map>
```

The map renders in the browser only. On the server it renders an empty frame, so it works with server-side rendering and prerendering without extra checks.

## Add a block

Blocks are complete examples, such as a store locator. Each one installs into its own folder and pulls in the map if you do not have it yet.

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/store-locator.json" />

Browse them all in the [block gallery](/blocks).

## Drawing and place search

The drawing toolbar and the map search box are separate items, so a plain map does not install a drawing engine or a geocoder. Add them when you need them:

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-draw.json" />

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-search.json" />

`map-draw` goes into `src/lib/components/ui/map-draw` and installs `terra-draw` and its MapLibre adapter. `map-search` goes into `src/lib/components/ui/map-search` and adds the place search box. Blocks that use them pull them in for you.

## Place search on its own

The search box behind the map search control is its own item. Add it if you want place search without a map:

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/place-autocomplete.json" />

## Updating

Run the same `add` command again. The CLI asks before it overwrites files you changed.
