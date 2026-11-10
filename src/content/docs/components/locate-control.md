---
title: Locate Control
description: A button that finds the user's position, flies there and can keep following it.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="locate-control-demo" description="A world map with a locate button and a line that shows the last position or error" />

Press the button and the browser asks for permission to share the user's location. On the first fix the map flies there and a pulsing dot marks the spot. The map zooms in to `zoom` if it is further out, and never zooms out.

The location is only requested when the button is pressed, never on page load.

## Usage

Place the control inside a [Control Container](/docs/components/control-container).

```svelte
<script lang="ts">
	import { Map, MapControlContainer, MapLocateControl } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-right">
		<MapLocateControl />
	</MapControlContainer>
</Map>
```

## Following the user

Set `watch` to keep tracking the position. The dot moves with every fix, and the camera stays where the user leaves it. Press the button again to stop. In this mode the button is a toggle, so it has `aria-pressed` and its label changes to "Stop following my location".

```svelte
<MapLocateControl watch positionOptions={{ enableHighAccuracy: true }} />
```

`positionOptions` goes straight to the browser's Geolocation API.

## Positions and errors

`onlocationfound` gets every `GeolocationPosition`, with the accuracy, heading and speed the browser reports. `onerror` is called when the user denies permission, the browser has no fix, the request times out, or the browser cannot share a location at all. Without `onerror`, errors are logged to the console.

```svelte
<MapLocateControl
	onlocationfound={(position) => (accuracy = position.coords.accuracy)}
	onerror={(error) => (message = error.message)}
/>
```

## Status

The button's `data-status` attribute holds a `LocateStatus`:

- `idle`: nothing requested yet, or following stopped.
- `locating`: waiting for the first fix. The button shows a spinner and `aria-busy`.
- `found`: one position was found.
- `following`: `watch` is on and positions keep coming.
- `error`: the last request failed. The icon shows a crossed-out target.

## The dot

The dot is a pulsing marker in the theme's primary colour, labelled "Your location" for screen readers. Set `showMarker={false}` to hide it and draw your own from `onlocationfound`.

## Reduced motion

When the user prefers reduced motion, the map jumps to the position instead of flying, and the dot stops pulsing.

## API Reference

<ApiTable component="map-locate-control" />
