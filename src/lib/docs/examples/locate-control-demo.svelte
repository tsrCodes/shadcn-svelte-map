<script lang="ts">
	import { Map, MapControlContainer, MapLocateControl } from '#lib/registry/ui/map/index.js';

	let message = $state('Press the locate button');

	function showFix(position: GeolocationPosition) {
		const { latitude, longitude, accuracy } = position.coords;
		message = `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (within ${Math.round(accuracy)} m)`;
	}

	// Browser error text varies; show the same plain message on every platform.
	const GEOLOCATION_MESSAGES: Record<number, string> = {
		1: 'Location access was denied',
		2: 'Your position is not available',
		3: 'Finding your position took too long'
	};

	function showError(error: GeolocationPositionError | Error) {
		const code = 'code' in error ? error.code : undefined;
		message = (code && GEOLOCATION_MESSAGES[code]) || 'Your location is not available';
	}
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [0, 20], zoom: 1.5, bearing: 0, pitch: 0 }}>
		<MapControlContainer position="top-right">
			<MapLocateControl onlocationfound={showFix} onerror={showError} />
		</MapControlContainer>
	</Map>
	<p
		class="absolute top-3 left-3 max-w-[70%] rounded-md bg-background/90 px-2 py-1 font-mono text-xs shadow"
		aria-live="polite"
	>
		{message}
	</p>
</div>
