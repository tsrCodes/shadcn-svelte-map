<script lang="ts">
	import Navigation2Icon from '@lucide/svelte/icons/navigation-2';
	import { Label } from '#lib/registry/ui/label/index.js';
	import {
		Map,
		MapMarker,
		MapMarkerContent,
		MapRoute,
		lineLength,
		type LngLatTuple
	} from '#lib/registry/ui/map/index.js';

	const ROUTE: LngLatTuple[] = [
		[4.8897, 52.3731],
		[4.8862, 52.3702],
		[4.8834, 52.3661],
		[4.8866, 52.3628],
		[4.8917, 52.3594],
		[4.8995, 52.3581],
		[4.9071, 52.3603],
		[4.9133, 52.3584]
	];
	const METRES_PER_KM = 1000;
	const total = lineLength(ROUTE) / METRES_PER_KM;

	const id = $props.id();
	let percent = $state(40);
	const progress = $derived(percent / 100);
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [4.899, 52.3655], zoom: 13.6, bearing: 0, pitch: 0 }}>
		<MapRoute positions={ROUTE} {progress} restDashArray={[1, 2]}>
			{#snippet marker({ lngLat, heading })}
				<MapMarker {lngLat} aria-label="Courier" rotation={heading} rotationAlignment="map">
					<MapMarkerContent>
						<span
							class="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/25"
						>
							<Navigation2Icon class="size-4 fill-current" />
						</span>
					</MapMarkerContent>
				</MapMarker>
			{/snippet}
		</MapRoute>
	</Map>
	<div
		class="absolute top-3 left-3 flex w-56 flex-col gap-2 rounded-md bg-background/90 p-3 text-sm shadow"
	>
		<Label for={`${id}-progress`}>Courier progress</Label>
		<input
			id={`${id}-progress`}
			type="range"
			min="0"
			max="100"
			bind:value={percent}
			class="accent-primary"
		/>
		<p class="font-mono text-xs text-muted-foreground" aria-live="polite">
			{(total * progress).toFixed(1)} of {total.toFixed(1)} km
		</p>
	</div>
</div>
