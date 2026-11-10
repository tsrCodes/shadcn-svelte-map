---
title: Theming
description: The map follows your shadcn theme, in light and dark mode, and on any basemap.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
</script>

<ComponentPreview name="theming-tokens" description="A map whose primary colour is set on the map element" />

## Colours come from your theme

Every layer that has a colour, such as routes, clusters, heatmaps, arcs and shapes, uses your shadcn CSS variables by default: `--primary`, `--background`, `--muted-foreground`, `--chart-1` to `--chart-5` and a few more. The map reads them from its own element, converts them to colours MapLibre understands, and reads them again whenever the theme changes.

Because the variables are read from the map element, you can theme one map on its own by setting them on it:

```svelte
<Map class="h-96 [--primary:var(--chart-2)]">
	<MapRoute positions={route} />
</Map>
```

## Passing your own colours

Colour props such as `color` and `fillColor` go straight to MapLibre, so use a colour it can parse: hex, `rgb()`, `hsl()` or a colour name. To use a theme token in your own layers, read the converted value from the map context:

```svelte
<script lang="ts">
	import { getMapContext } from '$lib/components/ui/map/index.js';

	const ctx = getMapContext();
	const accent = $derived(ctx.colors?.chart3);
</script>
```

## Light and dark mode

The map watches the `<html>` element. It switches when you toggle a `dark` or `light` class, a `data-theme` attribute or `color-scheme`, so it works with mode-watcher and with most theme switchers. When the page follows the system setting, so does the map.

Switching modes never remounts markers or closes popups. Your sources and layers stay on the map, with their hover and selection state.

## Basemaps

`mapStyle` takes a style URL, a MapLibre style object, or a pair with one style for each mode:

```svelte
<Map
	mapStyle={{
		light: 'https://tiles.openfreemap.org/styles/positron',
		dark: 'https://tiles.openfreemap.org/styles/dark'
	}}
/>
```

That pair is the default. Other ready-made choices are exported for you:

- `DEFAULT_MAP_STYLE`: OpenFreeMap Positron in light mode and Dark in dark mode.
- `OPENFREEMAP_BASEMAPS`: Default, Streets, Bright and Blank, ready for the [Basemap Control](/docs/components/basemap-control).
- `BLANK_MAP_STYLE`: no base layers, just your theme's background. It still loads fonts, so cluster counts and labels render. Use it for data-only maps.

OpenFreeMap needs no API key. Any MapLibre style works, including your own or a commercial provider's. If you use a strict CSP, add the hosts your style loads from; see [Content Security Policy](/docs/csp).

## Fonts and corners

Map text inside the canvas, such as street names, comes from the basemap style. Everything around the canvas, such as controls, popups, tooltips and labels, is plain HTML that uses your page font, radius and colours. Change it with Tailwind classes like any other shadcn component.
