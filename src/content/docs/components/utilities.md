---
title: Utilities
description: Geometry helpers for distance, length, area, containment and building shapes.
---

<script>
	import ComponentPreview from '#lib/docs/components/component-preview.svelte';
</script>

<ComponentPreview name="utilities-demo" description="A delivery zone built with circleRing, checked with pointInPolygon and distanceMeters" />

The map item exports a few plain functions for the maths you need around a map. They run anywhere, including on the server, and need no map instance. Distances use a spherical earth with a mean radius of 6,371,008.8 m, which is close enough for anything at city or country scale.

Import them from the map barrel:

```ts
import { distanceMeters, circleRing, pointInPolygon } from '$lib/components/ui/map/index.js';
```

## Types

```ts
type LngLatTuple = [number, number]; // [longitude, latitude]
type LngLatBoundsTuple = [LngLatTuple, LngLatTuple]; // [[west, south], [east, north]]
```

Positions are always longitude first, the same order GeoJSON uses. A ring is a `LngLatTuple[]` that outlines a polygon.

## Measuring

### distanceMeters

```ts
distanceMeters(from: LngLatTuple, to: LngLatTuple): number
```

Returns the great-circle distance between two positions, in metres.

```ts
distanceMeters([-0.1276, 51.5072], [2.3522, 48.8566]); // about 343,500
```

### lineLength

```ts
lineLength(line: LngLatTuple[]): number
```

Returns the length of a line along the ground, in metres. A line with fewer than two positions has length 0.

```ts
const km = lineLength(route) / 1000;
```

### ringArea

```ts
ringArea(ring: LngLatTuple[]): number
```

Returns the area a ring encloses, in square metres. The ring can be open or closed and wind either way. It is accurate for city- and field-sized shapes. Fewer than three corners give 0.

```ts
const hectares = ringArea(field) / 10_000;
```

### polygonArea

```ts
polygonArea(rings: LngLatTuple[][]): number
```

Returns the area of a polygon in square metres: the first ring minus every ring after it, which are holes. It never goes below 0. The rings are in the same shape as GeoJSON `Polygon` coordinates.

```ts
const area = polygonArea(feature.geometry.coordinates as LngLatTuple[][]);
```

## Containment

### pointInPolygon

```ts
pointInPolygon(point: LngLatTuple, rings: LngLatTuple[][]): boolean
```

Returns `true` when the point is inside the first ring and outside every hole. Rings may cross the antimeridian, as long as each is less than 180° wide. A point exactly on an edge may go either way.

```ts
const inZone = pointInPolygon(customer, [zoneRing]);
```

### ringCenter

```ts
ringCenter(ring: LngLatTuple[]): LngLatTuple
```

Returns the average of a ring's corners. It is a good label spot for convex shapes; for an L or a C shape it can fall outside. Throws on an empty ring.

```ts
const labelAt = ringCenter(zoneRing);
```

## Building shapes

### circleRing

```ts
circleRing(center: LngLatTuple, radius: number, steps = 64): LngLatTuple[]
```

Returns a closed ring that traces a circle of `radius` metres on the ground, with `steps + 1` positions. Throws when `radius` is negative or `steps` is not a whole number of at least 3.

```svelte
<MapPolygon positions={circleRing([-0.1246, 51.5007], 1500)} />
```

### rectangleRing

```ts
rectangleRing(bounds: LngLatBoundsTuple): LngLatTuple[]
```

Returns a closed ring of five positions around the bounds, starting at the south-west corner.

```ts
rectangleRing([
	[13.37, 52.5],
	[13.43, 52.53]
]);
```

### closeRing

```ts
closeRing(ring: LngLatTuple[]): LngLatTuple[]
```

Returns a copy of the ring with its first position repeated at the end, as GeoJSON polygons need. A ring that is already closed, or empty, comes back as a copy unchanged.

```ts
const polygon = { type: 'Polygon', coordinates: [closeRing(corners)] };
```

## Lines

### splitLine

```ts
splitLine(line: LngLatTuple[], progress: number): SplitLine

interface SplitLine {
	done: LngLatTuple[]; // from the start to point
	rest: LngLatTuple[]; // from point to the end
	point: LngLatTuple; // where the line was split
}
```

Splits a line at `progress`, from 0 to 1, of its length on the ground. `progress` is clamped to that range. Throws on an empty line. [Route](/docs/components/route) uses it to draw progress.

```ts
const { point } = splitLine(route, 0.4); // where the courier is now
```

### arcLine

```ts
arcLine(from: LngLatTuple, to: LngLatTuple, curvature = 0.2, steps = 64): LngLatTuple[]
```

Returns a curved line with `steps + 1` positions. At its middle the curve sits `curvature` times the straight distance to the side, measured in degrees. It crosses the antimeridian the short way, so the last longitude can pass ±180. Throws when `steps` is not a whole number of at least 1. [Arc](/docs/components/arc) uses it.

```svelte
<MapPolyline positions={arcLine([8.57, 50.03], [-9.14, 38.77])} />
```

## Scale

### scaleBar

```ts
scaleBar(meters: number, unit: 'metric' | 'imperial' = 'metric'): ScaleBar | null

interface ScaleBar {
	label: string; // such as '500 m' or '2 mi'
	ratio: number; // share of the measured width the bar covers, 0 to 1
}
```

Takes the ground length of a stretch of map, in metres. Returns the largest round length (1, 2, 3 or 5 times a power of ten) that fits, as a label, and the share of the stretch it covers. Metric uses m and km; imperial uses ft and mi. Returns `null` when `meters` is not a positive finite number. [Scale Control](/docs/components/scale-control) is built on it.

```ts
scaleBar(740); // { label: '500 m', ratio: 0.676 }
scaleBar(740, 'imperial'); // { label: '2000 ft', ratio: 0.824 }
```
