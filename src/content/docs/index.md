---
title: Introduction
description: Map components for shadcn-svelte, built on MapLibre GL. You install the source and own it.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
</script>

<ComponentPreview name="intro-overview" description="A map with markers, a route, a zone and controls" />

shadcn-svelte map is a set of Svelte 5 components for interactive maps. You add them to your project with the shadcn-svelte CLI, the same way you add a button. The code lands in your `src/lib/components/ui/map` folder, so you can read it, change it and keep it.

It is built on [MapLibre GL](https://maplibre.org) and styled with your shadcn theme. Markers, routes, clusters and controls take their colours from your CSS variables and follow light and dark mode.

## What you get

- **Markers and popups** that work with a keyboard and a screen reader.
- **Data layers**: GeoJSON, routes with progress, arcs, clusters, heatmaps, and circles, polygons, polylines and rectangles.
- **Controls**: zoom, compass, scale, fullscreen, locate, basemap switcher and place search.
- **Drawing**: points, lines, polygons, rectangles, circles and freehand shapes, with editing, delete, undo and redo. You get GeoJSON back.
- **Blocks**: ten page-sized examples, such as a store locator and a fleet tracker, that you can install and adapt.

## Principles

- **One engine.** MapLibre GL renders everything. The basemaps come from [OpenFreeMap](https://openfreemap.org) and need no API key.
- **Theme-aware.** Switching the theme or the basemap never remounts markers or closes popups. Your layers stay on the map.
- **Accessible.** Markers are buttons, popups are dialogs, and every camera move respects reduced motion. See [Accessibility](/docs/accessibility).
- **CSP-safe.** Nothing loads from a CDN at runtime, and the map runs under a strict Content Security Policy. See [Content Security Policy](/docs/csp).
- **Typed.** Every prop, event and snippet is typed, and the reference tables on each page come straight from the source.

## Next steps

Start with [Installation](/docs/installation), then read about the [Map](/docs/components/map) component. To see the components working together, browse the [blocks](/blocks).
