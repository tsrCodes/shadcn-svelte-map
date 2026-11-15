<script lang="ts">
	import {
		Map,
		MapArc,
		MapMarker,
		MapMarkerLabel,
		distanceMeters,
		type LngLatTuple,
		type MapArcItem
	} from '#lib/registry/ui/map/index.js';

	interface Flight extends MapArcItem {
		code: string;
		city: string;
	}

	const HUB: LngLatTuple = [8.5706, 50.0333];
	const DESTINATIONS = [
		{ code: 'LIS', city: 'Lisbon', lngLat: [-9.1359, 38.7742] },
		{ code: 'DUB', city: 'Dublin', lngLat: [-6.2499, 53.4264] },
		{ code: 'OSL', city: 'Oslo', lngLat: [11.1004, 60.1976] },
		{ code: 'ATH', city: 'Athens', lngLat: [23.9484, 37.9364] },
		{ code: 'IST', city: 'Istanbul', lngLat: [28.8146, 40.9769] },
		{ code: 'MAD', city: 'Madrid', lngLat: [-3.5676, 40.4983] }
	] satisfies { code: string; city: string; lngLat: LngLatTuple }[];
	const METRES_PER_KM = 1000;

	const flights: Flight[] = DESTINATIONS.map((place) => ({
		from: HUB,
		to: place.lngLat,
		code: place.code,
		city: place.city
	}));

	let selected = $state<Flight | null>(null);
	let hovered = $state<Flight | null>(null);
	const shown = $derived(hovered ?? selected);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [9, 48], zoom: 3.4, bearing: 0, pitch: 0 }}>
		<MapArc
			arcs={flights}
			width={3}
			onclick={(flight) => (selected = flight)}
			onhover={(flight) => (hovered = flight)}
		/>
		<MapMarker lngLat={HUB} aria-label="Frankfurt hub">
			<MapMarkerLabel>FRA</MapMarkerLabel>
		</MapMarker>
	</Map>
	<p
		class="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		{#if shown}
			FRA to {shown.code} ({shown.city}):
			{Math.round(distanceMeters(shown.from, shown.to) / METRES_PER_KM)} km
		{:else}
			Point at or click an arc
		{/if}
	</p>
</div>
