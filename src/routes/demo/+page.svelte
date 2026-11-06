<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import CoffeeIcon from '@lucide/svelte/icons/coffee';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import {
		Map,
		MapArc,
		MapCircle,
		MapClusterLayer,
		MapGeoJSON,
		MapHeatmap,
		MapMarker,
		MapMarkerContent,
		MapMarkerLabel,
		MapMarkerPopup,
		MapMarkerTooltip,
		MapPointLayer,
		MapPolygon,
		MapRectangle,
		MapRoute,
		type MapViewport
	} from '#lib/registry/ui/map/index.js';
	import {
		DELIVERIES,
		MUSEUM_ISLAND,
		PLACES,
		RIDE,
		TEMPELHOF_BOUNDS,
		ZONES,
		spiralStops
	} from './data.js';

	type StopsView = 'points' | 'clusters' | 'heatmap';

	const VIEWS: { value: StopsView; label: string }[] = [
		{ value: 'points', label: 'Points' },
		{ value: 'clusters', label: 'Clusters' },
		{ value: 'heatmap', label: 'Heatmap' }
	];

	let viewport = $state<MapViewport>({ center: [13.4, 52.5], zoom: 11, bearing: 0, pitch: 0 });
	let lastError = $state<string | null>(null);
	let cafe = $state<[number, number]>([13.4105, 52.5219]);
	let ridePercent = $state(40);
	let stopsView = $state<StopsView>('points');
	let hoveredZone = $state<string | null>(null);
	const stops = spiralStops(150);

	const readout = $derived(
		`${viewport.center[1].toFixed(4)}, ${viewport.center[0].toFixed(4)} · zoom ${viewport.zoom.toFixed(2)}`
	);
</script>

<svelte:head>
	<title>Map demo</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-8">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold">Map</h1>
			<p class="text-sm text-muted-foreground" data-testid="readout">{readout}</p>
		</div>
		<Button variant="outline" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			<SunIcon class="dark:hidden" />
			<MoonIcon class="hidden dark:block" />
		</Button>
	</header>

	<div class="flex flex-wrap items-center gap-4 text-sm">
		<ButtonGroup aria-label="Show stops as">
			{#each VIEWS as view (view.value)}
				<Button
					variant={stopsView === view.value ? 'default' : 'outline'}
					size="sm"
					aria-pressed={stopsView === view.value}
					onclick={() => (stopsView = view.value)}
				>
					{view.label}
				</Button>
			{/each}
		</ButtonGroup>
		<label class="flex items-center gap-2">
			<span>Ride progress</span>
			<input
				class="w-36 accent-primary"
				type="range"
				min="0"
				max="100"
				bind:value={ridePercent}
				data-testid="ride-progress"
			/>
			<span class="w-10 text-muted-foreground tabular-nums">{ridePercent}%</span>
		</label>
		<p class="text-muted-foreground" aria-live="polite">
			{hoveredZone ? `Zone: ${hoveredZone}` : 'Hover a zone'}
		</p>
	</div>

	<Map
		class="h-[480px] w-full rounded-lg border"
		aria-label="Map of Berlin"
		bind:viewport
		onerror={(error) => (lastError = error.message)}
	>
		<MapGeoJSON
			id="demo-zones"
			data={ZONES}
			fillOpacity={0.1}
			hoverFillOpacity={0.3}
			onhover={(feature) => (hoveredZone = feature ? String(feature.properties.name) : null)}
		/>
		<MapRectangle bounds={TEMPELHOF_BOUNDS} fillOpacity={0.15} />
		<MapPolygon positions={MUSEUM_ISLAND} fillOpacity={0.3} />
		<MapCircle center={PLACES[0].lngLat} radius={800} dashArray={[2, 2]} fillOpacity={0.08} />
		<MapArc arcs={DELIVERIES} curvature={0.25} dashArray={[1, 2]} />
		<MapRoute positions={RIDE} progress={ridePercent / 100} restDashArray={[1, 1.5]} />

		{#if stopsView === 'points'}
			<MapPointLayer data={stops} radius={4} popupLabel="Stop">
				{#snippet popup(feature)}
					<p class="font-medium">{feature.properties.name}</p>
					<p class="text-muted-foreground">One of 150 points drawn on the canvas.</p>
				{/snippet}
			</MapPointLayer>
		{:else if stopsView === 'clusters'}
			<MapClusterLayer data={stops} />
		{:else}
			<MapHeatmap data={stops} weight="visits" radius={30} />
		{/if}

		{#each PLACES as place (place.name)}
			<MapMarker lngLat={place.lngLat} aria-label={place.name}>
				<MapMarkerLabel>{place.name}</MapMarkerLabel>
				<MapMarkerTooltip>{place.note}</MapMarkerTooltip>
				<MapMarkerPopup aria-label={place.name}>
					<p class="font-medium">{place.name}</p>
					<p class="text-muted-foreground">{place.note}</p>
				</MapMarkerPopup>
			</MapMarker>
		{/each}

		<MapMarker bind:lngLat={cafe} aria-label="Cafe, drag to move" draggable>
			<MapMarkerContent>
				<span
					class="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"
				>
					<CoffeeIcon class="size-4" />
				</span>
			</MapMarkerContent>
			<MapMarkerTooltip>Drag me</MapMarkerTooltip>
			<MapMarkerPopup aria-label="Cafe">
				<p class="font-medium">Cafe</p>
				<p class="text-muted-foreground" data-testid="cafe-position">
					{cafe[1].toFixed(4)}, {cafe[0].toFixed(4)}
				</p>
			</MapMarkerPopup>
		</MapMarker>
	</Map>

	{#if lastError}
		<p class="text-sm text-destructive" role="alert">{lastError}</p>
	{/if}
</main>
