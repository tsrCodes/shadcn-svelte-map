<p align="center"><img src="src/lib/assets/logo.svg" width="96" height="96" alt="" /></p>

# shadcn-svelte Map

Map components for [shadcn-svelte](https://shadcn-svelte.com), built on [MapLibre GL](https://maplibre.org). Markers, popups, routes, shapes, clusters, heatmaps, drawing and place search, themed with your shadcn tokens. You copy the source into your project, and no API key is needed.

**Docs and live examples:** [shadcn-svelte-map.vercel.app](https://shadcn-svelte-map.vercel.app)

## Requirements

- Svelte 5 and SvelteKit
- Tailwind CSS v4 with [shadcn-svelte](https://shadcn-svelte.com/docs/installation) set up

## Installation

Add the map:

```bash
pnpm dlx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map.json
```

Add more when you need them:

| Item                 | What it adds                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `map`                | The map with markers, popups, data layers and controls           |
| `map-draw`           | A drawing toolbar for points, lines and shapes, with undo        |
| `map-search`         | A search control that moves the map to the chosen place          |
| `place-autocomplete` | A place search box with keyboard navigation and debounced search |

```bash
pnpm dlx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/map-draw.json
```

## Usage

```svelte
<script lang="ts">
	import {
		Map,
		MapControlContainer,
		MapMarker,
		MapMarkerTooltip,
		MapZoomControl
	} from '$lib/components/ui/map/index.js';
</script>

<div class="h-96">
	<Map class="size-full" viewport={{ center: [2.3522, 48.8566], zoom: 12, bearing: 0, pitch: 0 }}>
		<MapMarker lngLat={[2.3522, 48.8566]} aria-label="Paris">
			<MapMarkerTooltip>Paris</MapMarkerTooltip>
		</MapMarker>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>
</div>
```

The map follows your light and dark theme. Every component works from the keyboard, and data layers come with a keyboard list of their features.

## Blocks

Ready-made screens you can install and adapt. Browse them at [/blocks](https://shadcn-svelte-map.vercel.app/blocks).

| Block                   | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `geofence-editor`       | Draw fences and see which assets sit inside them                |
| `store-locator`         | Search an address to list the nearest stores                    |
| `plot-mapper`           | Trace fields over parcels, pick a crop for each, total the area |
| `delivery-zone-planner` | Draw and price delivery zones around a depot                    |
| `field-survey`          | Record observations and transects, export them as GeoJSON       |
| `fleet-tracker`         | Watch vehicles drive their rounds and follow one                |
| `order-tracker`         | Follow an order from the kitchen to the door                    |
| `region-analytics`      | Shade regions by revenue, orders or growth                      |
| `density-heatmap`       | A day of pickups as a heatmap or clusters, filtered by hour     |
| `route-network`         | An airline network drawn as arcs from each hub                  |

```bash
pnpm dlx shadcn-svelte@latest add https://shadcn-svelte-map.vercel.app/r/store-locator.json
```

## Development

Needs Node 22.17 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

| Command                     | What it does                                  |
| --------------------------- | --------------------------------------------- |
| `pnpm build`                | Builds the registry and the docs site         |
| `pnpm check`                | Type-checks the project                       |
| `pnpm lint`                 | Runs Prettier and ESLint                      |
| `pnpm vitest run src/tests` | Runs the unit and component tests             |
| `pnpm test:install`         | Installs every registry item into a fresh app |

## License

MIT

The Svelte logo belongs to the Svelte project. This project is not affiliated with or endorsed by the Svelte team.

---

Handcrafted by [Oggy](https://github.com/tsrCodes)
