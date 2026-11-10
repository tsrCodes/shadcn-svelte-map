---
title: Performance
description: How many points each layer handles, with numbers measured on real hardware.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
</script>

<ComponentPreview name="performance-points" description="Up to 100,000 points in a point layer, with load and frame time measured live" />

The demo above draws 100,000 points with a [Point Layer](/docs/components/point-layer). Switch the count and press **Measure panning** to measure your own device. Load is the time from handing the map new data to the map finishing drawing it. Frame time is measured over a three-second pan.

## Measured numbers

Measured on 2026-11-10 on an Apple M5 MacBook (16 GB, macOS 26.6) in Chromium 156 with GPU rendering (Metal), a 678 × 450 map at the zoom shown above. Each row is the median of three runs.

| Points  | Load     | Frame time, median | Frame time, p95 |
| ------- | -------- | ------------------ | --------------- |
| 1,000   | 70 ms    | 16.7 ms            | 16.7 ms         |
| 10,000  | 127 ms   | 16.7 ms            | 16.8 ms         |
| 100,000 | 1,111 ms | 16.7 ms            | 16.7 ms         |

Panning holds 60 frames per second at every size; 16.7 ms is the display's refresh limit. Load grows with the point count, because the data is copied to the map's worker and indexed there. The page stays responsive while that happens.

Your numbers depend on your GPU, screen size and browser. A frame of 16.7 ms means 60 frames per second.

## Markers or a point layer

| Points        | Use                                             | Why                                                                                |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Up to ~200    | [Marker](/docs/components/marker)               | Each marker is a focusable button with any HTML inside, tooltips and popups.       |
| ~200 and more | [Point Layer](/docs/components/point-layer)     | Points are drawn on the GPU, so the count barely changes the frame time.           |
| Dense areas   | [Cluster Layer](/docs/components/cluster-layer) | Nearby points merge into counted circles, so the map stays readable at every zoom. |
| Density only  | [Heatmap](/docs/components/heatmap)             | Shows where points gather when single points do not matter.                        |

Markers are DOM elements. Each one is moved by the browser on every frame while the map pans, so hundreds of them make panning stutter on phones. A point layer is one draw call no matter how many points it has.

## Tips

- **Update data, do not rebuild.** Pass new data to the same layer. The layer updates its source in place instead of removing and adding layers.
- **Use `$state.raw` for big data.** A deep `$state` proxy over 100,000 features costs memory and time on every read. Replace the whole collection when it changes.
- **Keep properties small.** Every property is copied to the map's worker. Send only what popups and styling need.
- **Make points accessible another way.** Canvas points cannot take focus. Pair a large point layer with a list or a search box. See [Accessibility](/docs/accessibility).
