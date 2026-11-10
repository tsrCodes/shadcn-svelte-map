<script lang="ts">
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Map, MapPopup } from '#lib/registry/ui/map/index.js';

	const STATIONS = [
		{
			id: 'central',
			name: 'Central Station',
			lngLat: [4.9003, 52.3791],
			note: 'Trains every 5 minutes'
		},
		{ id: 'zuid', name: 'Zuid', lngLat: [4.8718, 52.3389], note: 'Metro and airport trains' },
		{ id: 'amstel', name: 'Amstel', lngLat: [4.9178, 52.3463], note: 'Buses to the east' }
	] satisfies { id: string; name: string; lngLat: [number, number]; note: string }[];

	let current = $state(STATIONS[0]);
	let open = $state(true);

	function show(station: (typeof STATIONS)[number]) {
		current = station;
		open = true;
	}
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [4.895, 52.36], zoom: 12, bearing: 0, pitch: 0 }}>
		<MapPopup
			lngLat={current.lngLat}
			bind:open
			focusAfterOpen={false}
			aria-label={`${current.name} details`}
		>
			<p class="font-medium">{current.name}</p>
			<p class="text-muted-foreground">{current.note}</p>
		</MapPopup>
	</Map>
	<div class="absolute top-3 left-3 flex flex-wrap gap-2">
		{#each STATIONS as station (station.id)}
			<Button size="sm" variant="secondary" onclick={() => show(station)}>{station.name}</Button>
		{/each}
	</div>
</div>
