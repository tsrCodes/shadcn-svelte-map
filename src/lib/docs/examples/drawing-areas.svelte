<script lang="ts">
	import {
		Map,
		MapControlContainer,
		MapDrawControl,
		lineLength,
		polygonArea,
		type DrawFeature,
		type DrawTool
	} from '#lib/registry/ui/map/index.js';

	let tool = $state<DrawTool>('none');
	let drawings = $state.raw<DrawFeature[]>([]);

	const SQUARE_METRES_PER_HECTARE = 10_000;
	const METRES_PER_KILOMETRE = 1000;

	function measure(feature: DrawFeature): string {
		const geometry = feature.geometry;
		if (geometry.type === 'Polygon') {
			const hectares =
				polygonArea(geometry.coordinates as [number, number][][]) / SQUARE_METRES_PER_HECTARE;
			return `${hectares.toFixed(1)} ha`;
		}
		if (geometry.type === 'LineString') {
			const km = lineLength(geometry.coordinates as [number, number][]) / METRES_PER_KILOMETRE;
			return `${km.toFixed(2)} km`;
		}
		return 'point';
	}
</script>

<div class="relative size-full">
	<Map
		class="size-full"
		viewport={{ center: [-122.4194, 37.7749], zoom: 12.5, bearing: 0, pitch: 0 }}
	>
		<MapControlContainer position="top-left">
			<MapDrawControl bind:mode={tool} onchange={(features) => (drawings = features)} />
		</MapControlContainer>
	</Map>
	<div
		class="absolute top-2 right-2 w-44 rounded-md border bg-background/95 p-2 text-xs shadow-sm"
		aria-live="polite"
	>
		{#if drawings.length === 0}
			<p class="text-muted-foreground">Pick a tool and draw on the map.</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each drawings as feature (feature.id)}
					<li class="flex justify-between gap-2">
						<span class="capitalize">{feature.properties.mode}</span>
						<span class="font-mono tabular-nums">{measure(feature)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
