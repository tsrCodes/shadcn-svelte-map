---
title: Draw Control
description: A toolbar to draw points, lines and shapes, edit and delete them, and undo or redo.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
</script>

<ComponentPreview name="draw-control-demo" description="A map of London with the full drawing toolbar and a summary of what has been drawn" />

The draw control is a toolbar of drawing tools. Pick a tool and draw on the map. Pick "Select and edit" to move a shape or drag its corners, then delete it with the trash button. Undo and redo step through every change.

Drawing runs on [terra-draw](https://github.com/JamesLMilner/terra-draw), loaded only when the control mounts. Shapes take their colours from your theme and update when it changes.

This page covers the control's API. For saving drawings, loading them back and other workflows, read the [Drawing](/docs/drawing) guide.

## Installation

It installs `terra-draw` and its MapLibre adapter, and needs the map.

<CodeBlockCommand command="npx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-draw.json" />

## Usage

Place the control inside a [Control Container](/docs/components/control-container).

```svelte
<script lang="ts">
	import { Map, MapControlContainer } from '$lib/components/ui/map/index.js';
	import { MapDrawControl, type DrawFeature } from '$lib/components/ui/map-draw/index.js';

	let features = $state.raw<DrawFeature[]>([]);
</script>

<Map class="h-96">
	<MapControlContainer position="top-left">
		<MapDrawControl onchange={(next) => (features = next)} />
	</MapControlContainer>
</Map>
```

## Tools

The `DrawMode` shapes, in the order of `DRAW_MODES`:

- `point`: click to place a point.
- `polyline`: click each corner, then click the last one again to finish.
- `polygon`: click each corner, then click the first one to close it.
- `rectangle`: click one corner, then the opposite one.
- `circle`: click the centre, then a point on the edge.
- `freehand`: click, move the pointer around the shape, and click again to close it.

After the shapes come "Select and edit", then "Delete selected", "Undo" and "Redo".

## Choosing a tool

Bind `mode` to read or set the active tool. It holds a `DrawTool`: one of the shapes, `select`, or `none`. With `none`, the pointer pans and zooms the map as usual and the drawings stay. Pressing the active tool's button again goes back to `none`.

```svelte
<script lang="ts">
	import type { DrawTool } from '$lib/components/ui/map-draw/index.js';

	let mode = $state<DrawTool>('polygon');
</script>

<MapDrawControl bind:mode />
```

## Picking the buttons

`modes` sets which shape buttons show, and in which order. `orientation` lays the toolbar out as a column or a row.

<ComponentPreview name="draw-control-horizontal" description="A horizontal toolbar with only the polygon, rectangle and circle tools" />

```svelte
<MapDrawControl modes={['polygon', 'rectangle', 'circle']} orientation="horizontal" />
```

## Getting the drawings

`onchange` gets every finished drawing as a `DrawFeature[]`. It runs after each create, edit, delete, undo and redo. A shape still being drawn is not in the list, and neither are the handles shown while editing.

Each `DrawFeature` is a plain GeoJSON `Feature` with an `id`, a `Point`, `LineString` or `Polygon` geometry, and `properties.mode` set to the `DrawMode` that drew it. Rectangles, circles and freehand shapes come back as polygons.

Keep the list in `$state.raw`: it is replaced as a whole on every change.

## The engine

Bind `ref` to get the running terra-draw instance once it starts, for things the toolbar does not cover. `onerror` is called if the drawing engine fails to load. Without it, the error is logged to the console.

## API Reference

<ApiTable component="map-draw-control" />
