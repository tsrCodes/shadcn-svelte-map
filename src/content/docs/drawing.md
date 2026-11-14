---
title: Drawing
description: Let users draw and edit points, lines and shapes, and get plain GeoJSON back.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
</script>

<ComponentPreview name="drawing-areas" description="Draw shapes and see each one listed with its area" />

The [Draw Control](/docs/components/draw-control) adds a toolbar to the map. It is built on terra-draw and ships as its own item, so add it next to the map:

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-draw.json" />

## Tools

| Tool        | How to draw                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `point`     | Click to place a point.                                                     |
| `polyline`  | Click to add points. Click the last point again, or press Enter, to finish. |
| `polygon`   | Click to add corners. Click the first corner, or press Enter, to close it.  |
| `rectangle` | Click one corner, then the opposite corner.                                 |
| `circle`    | Click the centre, then click again at the radius you want.                  |
| `freehand`  | Click to start, move the pointer, click again to finish.                    |
| `select`    | Click a shape to edit it. Drag to move it, drag corners to reshape it.      |

Escape cancels the shape you are drawing. The toolbar also has delete, undo and redo buttons. Undo and redo cover every step of the session: creating, moving, reshaping and deleting.

Show fewer tools with `modes`, in the order you want:

```svelte
<MapDrawControl modes={['polygon', 'rectangle']} />
```

## Getting the drawings

`onchange` gives you every finished drawing after each change. It skips the shape being drawn and the editing handles, so you only ever see complete features:

```svelte
<script lang="ts">
	import { Map, MapControlContainer } from '$lib/components/ui/map/index.js';
	import { MapDrawControl, type DrawFeature } from '$lib/components/ui/map-draw/index.js';

	let drawings = $state.raw<DrawFeature[]>([]);
</script>

<Map class="h-96">
	<MapControlContainer position="top-left">
		<MapDrawControl onchange={(features) => (drawings = features)} />
	</MapControlContainer>
</Map>
```

Each `DrawFeature` is plain GeoJSON: a `Point`, `LineString` or `Polygon`, with `properties.mode` telling you which tool drew it. Rectangles and circles arrive as polygons. Save the array as it is, or wrap it in a `FeatureCollection`.

## Controlling the tool

Bind `mode` to read or set the active tool from your own UI. `none` hands the pointer back to the map, so it pans and zooms again.

```svelte
<script lang="ts">
	import type { DrawTool } from '$lib/components/ui/map-draw/index.js';

	let tool = $state<DrawTool>('none');
</script>

<MapDrawControl bind:mode={tool} />
<button onclick={() => (tool = 'polygon')}>Draw a zone</button>
```

## Keeping details per drawing

Each feature has a stable `id`. Store names, notes or prices in a record keyed by that id, rather than inside the feature. Keep entries when a drawing disappears, so undo brings the details back with it. The [geofence editor](/blocks/geofence-editor) and [plot mapper](/blocks/plot-mapper) blocks work this way.

## Measuring

The map exports geometry helpers that work on drawings directly. `polygonArea` returns square metres and `lineLength` returns metres. See [Utilities](/docs/components/utilities).

## Loading saved drawings

`bind:ref` gives you the terra-draw instance once it runs. Use its `addFeatures` method to put saved shapes back. terra-draw names the line tool `linestring`, so a saved polyline needs `properties.mode` set to `linestring`.
