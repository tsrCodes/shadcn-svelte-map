---
title: Map
description: The map root that owns the style, the camera, loading and errors, and shares the map with its children.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="map-demo" description="A map with a bound viewport and a live readout of the camera" />

`Map` creates a MapLibre map inside a `<div>` and gives it to every component you put inside it. Give it a size with a class, such as `h-96` or `size-full`. It loads MapLibre on the client only, so it is safe to render on the server.

## Usage

```svelte
<script lang="ts">
	import { Map } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96" viewport={{ center: [13.405, 52.52], zoom: 11, bearing: 0, pitch: 0 }} />
```

## Style

`mapStyle` takes a style URL, a style object, or `{ light, dark }`. With a pair, the map follows the page theme and swaps styles when it changes. The default is an OpenFreeMap pair, which needs no API key.

```svelte
<Map
	class="h-96"
	mapStyle={{
		light: 'https://tiles.openfreemap.org/styles/positron',
		dark: 'https://tiles.openfreemap.org/styles/dark'
	}}
/>
```

For a map that shows only your own data, pass `BLANK_MAP_STYLE`. It has no layers, so the map shows the theme background.

Layers you add with this library survive a style swap. Markers, popups and controls are not remounted.

## Camera

`viewport` holds `center`, `zoom`, `bearing` and `pitch`. Bind it to read the camera as the user moves the map, and assign to it to move the map.

For full control, pass `viewport` without binding it, together with `onviewportchange`. The map calls it with every proposed camera change, then shows whatever `viewport` holds. Here the zoom is kept between 10 and 15:

<ComponentPreview name="map-controlled" description="A controlled camera that keeps the zoom inside a range" />

## Globe

Set `projection="globe"` to draw the world as a sphere at low zoom. It flattens into the usual map as you zoom in, and stays a globe through theme and basemap swaps. Change it back to `mercator` at any time. Leave `projection` out and the map uses whatever projection the style sets.

```svelte
<Map
	class="h-96"
	projection="globe"
	viewport={{ center: [0, 20], zoom: 1.5, bearing: 0, pitch: 0 }}
/>
```

## Loading and errors

The root element has a `data-status` attribute: `checking`, `loading`, `ready`, `error` or `unsupported`.

- While loading, a spinner shows. Pass a `loader` snippet to replace it.
- `onload` runs once with the MapLibre map when the first style has loaded.
- `onerror` gets style, tile and source errors. Without it, errors are logged to the console. If loading fails, the map shows a short message.
- Browsers without WebGL 2 see a message instead of the map. Pass an `unsupported` snippet to replace it.

```svelte
<Map class="h-96" onload={(map) => map.resize()} onerror={(error) => console.warn(error)}>
	{#snippet loader()}
		<p class="text-sm text-muted-foreground">Loading map…</p>
	{/snippet}
	{#snippet unsupported()}
		<p>Your browser cannot show this map.</p>
	{/snippet}
</Map>
```

`options` passes extra MapLibre options, such as `maxZoom`. `workerUrl` points at your own copy of the MapLibre worker. Both are read once, when the map is created. Bind `ref` to get the MapLibre map instance.

## Keyboard

The map is a `region` named "Map" by default. Set `aria-label` to name it better. With focus on the map, arrow keys pan, plus and minus zoom, and Shift with the arrow keys rotates. A hidden hint tells screen reader users this.

## Building your own child components

A component placed inside `<Map>` can call `getMapContext()` to reach the map. It throws outside a map.

```svelte
<script lang="ts">
	import { getMapContext } from '$lib/components/ui/map/index.js';

	const ctx = getMapContext();
</script>

<button onclick={() => ctx.flyTo({ center: [13.405, 52.52], zoom: 14 })}>Go to Berlin</button>
```

The context gives you:

- `map`: the MapLibre map, or `null` until it exists. `maplibre` is the loaded MapLibre module.
- `styleVersion`: goes up on every style load. Read it in an effect to re-add anything you put on the style yourself.
- `colors`: the shadcn theme colours, resolved to values MapLibre can use. They update when the theme changes.
- `flyTo`, `easeTo`, `fitBounds`, `zoomIn` and `zoomOut`: camera moves that skip the animation when the user prefers reduced motion.
- `beforeRemove(callback)`: runs `callback` just before the map is removed, while its style is still there.

## API Reference

<ApiTable component="map" />
