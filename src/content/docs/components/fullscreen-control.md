---
title: Fullscreen Control
description: A button that makes the map fill the screen, with a fallback for browsers that cannot.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
	import ApiTable from '#lib/docs/components/api-table.svelte';
</script>

<ComponentPreview name="fullscreen-control-demo" description="A map of Rome with a fullscreen button and a label that shows the current state" />

Press the button and the map fills the screen. Press it again, or press Escape, to go back. The icon and the button's label switch between "Enter fullscreen" and "Exit fullscreen" so everyone can tell which state the map is in.

Only the map goes fullscreen, not the page. Other controls, popups and menus inside the map stay visible.

## Usage

Place the control inside a [Control Container](/docs/components/control-container).

```svelte
<script lang="ts">
	import { Map, MapControlContainer, MapFullscreenControl } from '$lib/components/ui/map/index.js';
</script>

<Map class="h-96">
	<MapControlContainer position="top-right">
		<MapFullscreenControl />
	</MapControlContainer>
</Map>
```

## Every browser

The control uses the browser's Fullscreen API when it can. Some browsers cannot put a single element in fullscreen, such as Safari on iPhone and many in-app webviews. There, the control falls back to CSS: the map is pinned over the whole viewport and the page behind it stops scrolling.

The control picks the fallback when:

- the browser has no Fullscreen API for elements,
- the browser refuses the request, for example inside an iframe without `allowfullscreen`,
- the request gets no answer within one second.

Escape leaves both kinds of fullscreen.

## Knowing the state

`onchange` is called with `true` when the map enters fullscreen and `false` when it leaves. It fires the same way for the API and the fallback.

```svelte
<MapFullscreenControl onchange={(fullscreen) => (isFullscreen = fullscreen)} />
```

To tell the two kinds apart, read the button's `data-mode` attribute. It holds a `FullscreenMode`: `off`, `native` for the Fullscreen API, or `fallback` for the CSS version. While the fallback is on, the map element also has `data-fullscreen="fallback"`, which you can target in your own CSS.

If the control is removed while the map is fullscreen, the map leaves fullscreen.

## API Reference

<ApiTable component="map-fullscreen-control" />
