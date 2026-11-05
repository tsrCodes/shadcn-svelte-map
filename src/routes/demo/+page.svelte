<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import CoffeeIcon from '@lucide/svelte/icons/coffee';
	import type { FeatureCollection, Point } from 'geojson';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/registry/ui/button/index.js';
	import {
		Map,
		MapMarker,
		MapMarkerContent,
		MapMarkerLabel,
		MapMarkerPopup,
		MapMarkerTooltip,
		MapPointLayer,
		type MapViewport
	} from '#lib/registry/ui/map/index.js';

	interface Place {
		name: string;
		note: string;
		lngLat: [number, number];
	}

	const PLACES: Place[] = [
		{ name: 'Brandenburg Gate', note: 'Landmark, Pariser Platz', lngLat: [13.3777, 52.5163] },
		{ name: 'Museum Island', note: 'Five museums on the Spree', lngLat: [13.3976, 52.5169] },
		{ name: 'Tempelhofer Feld', note: 'Former airport, now a park', lngLat: [13.4017, 52.4732] }
	];

	/** Spread points around the centre on a fixed spiral, so the demo looks the same every load. */
	function spiralPoints(count: number): FeatureCollection<Point, { name: string }> {
		return {
			type: 'FeatureCollection',
			features: Array.from({ length: count }, (_, index) => {
				const angle = index * 2.4;
				const distance = 0.012 * Math.sqrt(index + 1);
				return {
					type: 'Feature',
					properties: { name: `Stop ${index + 1}` },
					geometry: {
						type: 'Point',
						coordinates: [
							13.4 + distance * Math.cos(angle) * 1.6,
							52.5 + distance * Math.sin(angle)
						]
					}
				};
			})
		};
	}

	let viewport = $state<MapViewport>({ center: [13.4, 52.5], zoom: 11, bearing: 0, pitch: 0 });
	let lastError = $state<string | null>(null);
	let cafe = $state<[number, number]>([13.4105, 52.5219]);
	const stops = spiralPoints(150);

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

	<Map
		class="h-[480px] w-full rounded-lg border"
		aria-label="Map of Berlin"
		bind:viewport
		onerror={(error) => (lastError = error.message)}
	>
		<MapPointLayer data={stops} radius={4} popupLabel="Stop">
			{#snippet popup(feature)}
				<p class="font-medium">{feature.properties.name}</p>
				<p class="text-muted-foreground">One of 150 points drawn on the canvas.</p>
			{/snippet}
		</MapPointLayer>

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
