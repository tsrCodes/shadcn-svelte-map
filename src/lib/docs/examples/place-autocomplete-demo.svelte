<script lang="ts">
	import * as Card from '#lib/registry/ui/card/index.js';
	import { PlaceAutocomplete, type Place } from '#lib/registry/ui/place-autocomplete/index.js';

	let place = $state<Place | null>(null);
</script>

<div class="flex size-full flex-col items-center gap-4 p-6">
	<PlaceAutocomplete
		class="w-72"
		placeholder="Search a city or street"
		onselect={(p) => (place = p)}
	/>
	{#if place}
		<Card.Root class="w-72">
			<Card.Header>
				<Card.Title>{place.name}</Card.Title>
				<Card.Description>{place.description || place.kind}</Card.Description>
			</Card.Header>
			<Card.Content class="font-mono text-xs text-muted-foreground">
				{place.position[1].toFixed(4)}, {place.position[0].toFixed(4)}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
