<script lang="ts">
	import HouseIcon from '@lucide/svelte/icons/house';
	import { Button } from '#lib/registry/ui/button/index.js';
	import {
		Map,
		MapControlContainer,
		MapZoomControl,
		type MapViewport
	} from '#lib/registry/ui/map/index.js';

	const HOME: MapViewport = { center: [12.4964, 41.9028], zoom: 12, bearing: 0, pitch: 0 };

	let viewport = $state<MapViewport>({ ...HOME });
</script>

<Map class="size-full" bind:viewport>
	<MapControlContainer position="top-left">
		<Button
			variant="outline"
			size="icon"
			class="bg-background shadow-xs hover:bg-muted dark:bg-background dark:hover:bg-muted"
			aria-label="Back to the start"
			onclick={() => (viewport = { ...HOME })}
		>
			<HouseIcon />
		</Button>
	</MapControlContainer>
	<MapControlContainer position="top-right">
		<MapZoomControl />
	</MapControlContainer>
</Map>
