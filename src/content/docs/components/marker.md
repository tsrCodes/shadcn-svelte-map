---
title: Marker
description: Accessible DOM markers with labels, tooltips and popups.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="marker-demo" description="Three cafes as markers with labels, tooltips and popups" />

A marker is a real `<button>` placed on the map. It takes focus, opens its popup with Enter or Space, and closes it with Escape, returning focus to the marker. Every marker needs an `aria-label` so screen readers can tell markers apart.

Use markers for up to about 200 points. For more, use a [Point Layer](/docs/components/point-layer), which draws on the canvas.

## Usage

```svelte
<script lang="ts">
	import {
		Map,
		MapMarker,
		MapMarkerLabel,
		MapMarkerPopup,
		MapMarkerTooltip
	} from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapMarker lngLat={[13.405, 52.52]} aria-label="Office">
		<MapMarkerLabel>Office</MapMarkerLabel>
		<MapMarkerTooltip>Open 9:00 to 17:00</MapMarkerTooltip>
		<MapMarkerPopup aria-label="Office details">
			<p>Ring the bell at the side door.</p>
		</MapMarkerPopup>
	</MapMarker>
</Map>
```

## Parts

- `MapMarkerContent` replaces the default dot with your own markup, such as an icon or an avatar.
- `MapMarkerLabel` shows text next to the marker.
- `MapMarkerTooltip` shows on hover and focus. Screen readers read it as the marker's description.
- `MapMarkerPopup` opens on click, Enter or Space. Focus moves into it and comes back to the marker on close.

## Dragging

Set `draggable` and bind `lngLat`. The binding updates when the drag ends. `ondrag` fires on every move if you need the position while dragging.

<ComponentPreview name="marker-draggable" description="A draggable pin that shows its coordinates" />

## Moving markers

Change `lngLat` and the marker moves. It is never rebuilt, so an open popup stays open and focus stays put. A theme or basemap change does not remount markers either.

## API Reference

<ApiTable component="map-marker" />
<ApiTable component="map-marker-content" />
<ApiTable component="map-marker-label" />
<ApiTable component="map-marker-tooltip" />
<ApiTable component="map-marker-popup" />
