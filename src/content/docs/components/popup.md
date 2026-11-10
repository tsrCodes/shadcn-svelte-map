---
title: Popup
description: A popup with your own content at any position on the map.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="popup-demo" description="One popup that moves between three stations" />

`MapPopup` shows content at a coordinate, without a marker. Use it for things like search results or a clicked spot on the map. To attach a popup to a marker, use `MapMarkerPopup` from [Marker](/docs/components/marker) instead.

## Usage

```svelte
<script lang="ts">
	import { Map, MapPopup } from '$lib/components/ui/map/index.js';

	let open = $state(true);
</script>

<Map class="h-96">
	<MapPopup lngLat={[13.405, 52.52]} bind:open aria-label="Meeting point">
		<p>Meet at the fountain.</p>
	</MapPopup>
</Map>
```

The content goes in a `role="dialog"` element. Give it an `aria-label` so screen readers can name it.

## Opening and closing

`open` is `true` by default. Bind it to hear when the user closes the popup with the close button, Escape or a click on the map. Set it to `true` again to reopen it. The content stays mounted while the popup is closed.

Change `lngLat` and the popup moves. It is not rebuilt.

## Focus

When the popup opens, focus moves into it. If your popup opens on page load, set `focusAfterOpen={false}` so the page does not scroll to it.

## Read once

`anchor`, `closeButton`, `closeOnClick` and `focusAfterOpen` are read when the popup is created. Changing them later has no effect. `offset`, `maxWidth` and `class` update the live popup.

## API Reference

<ApiTable component="map-popup" />
