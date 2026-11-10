---
title: Accessibility
description: How the map works with a keyboard, a screen reader, reduced motion and right-to-left pages.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
</script>

<ComponentPreview name="marker-demo" description="Markers you can reach with Tab and open with Enter" />

Try it: click the map above, then press Tab. Focus moves through the markers. Press Enter to open a popup and Escape to close it.

## The map

The map is a landmark (`role="region"`) named by its `aria-label`, which defaults to "Map". Give each map a name that says what it shows, such as "Delivery zones". Screen readers also hear a short hint: arrow keys pan, plus and minus zoom, and Shift with the arrow keys rotates.

When the map is loading, fails to load, or the browser has no WebGL, the map says so in text instead of showing an empty box.

## Keyboard

| Where   | Key                   | What happens                               |
| ------- | --------------------- | ------------------------------------------ |
| Map     | Arrow keys            | Pan                                        |
| Map     | `+` and `-`           | Zoom in and out                            |
| Map     | Shift with arrow keys | Rotate and tilt                            |
| Marker  | Tab                   | Move to the next marker or control         |
| Marker  | Enter or Space        | Open its popup; focus moves into the popup |
| Marker  | Focus                 | Show its tooltip                           |
| Popup   | Escape                | Close it and return focus to the marker    |
| Drawing | Escape                | Cancel the shape you are drawing           |
| Drawing | Enter                 | Finish a line or polygon                   |

## Markers

Each [Marker](/docs/components/marker) is a real `<button>`.

- `aria-label` is required. Name markers so people can tell them apart: "Cafe on Main Street", not "Marker". A blank label falls back to "Map marker" and logs a warning.
- A marker's tooltip is its description (`aria-describedby`), so it is read after the name.
- A marker with a popup has `aria-haspopup="dialog"` and `aria-expanded`.
- Popups are dialogs named by their own `aria-label`. Closing one with the mouse also returns focus to its marker.

Points in a [Point Layer](/docs/components/point-layer) are drawn on the canvas, so they cannot take focus. If people need to reach each point, also show the points as a list next to the map, or use markers for small sets.

## Controls

Every control is a labelled button: "Zoom in", "Reset bearing to north", "Enter fullscreen". Toggles such as the drawing tools and locate-and-follow use `aria-pressed`. The scale bar reads its distance, such as "Map scale: 500 m". Menus and the search box are shadcn-svelte components, with their keyboard support.

## Reduced motion

When the system asks for reduced motion, every camera move the components make, such as zooming, flying to a search result or resetting the bearing, jumps instead of animating. Your own code gets the same behaviour by moving the camera through the map context:

```ts
const ctx = getMapContext();
ctx.easeTo({ center: [2.35, 48.86], zoom: 12 });
```

Marker hover effects and the locate pulse also stop.

## Right-to-left pages

The buttons, menus, search box and switches around the map follow the page direction. Control positions are physical corners: `top-right` stays on the right in a right-to-left page, so pick the corner you want for each layout.

## Colour

All map colours come from your theme, so the contrast you choose for your shadcn components carries over. Check any colours you pass yourself against the basemap in both light and dark mode.
