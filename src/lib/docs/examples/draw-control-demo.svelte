<script lang="ts">
	import {
		Map,
		MapControlContainer,
		MapDrawControl,
		DRAW_MODES,
		type DrawFeature,
		type DrawTool
	} from '#lib/registry/ui/map/index.js';

	let mode = $state<DrawTool>('none');
	let features = $state.raw<DrawFeature[]>([]);

	const summary = $derived.by(() => {
		if (features.length === 0) return 'Nothing drawn yet';
		return DRAW_MODES.map((kind) => ({
			kind,
			count: features.filter((feature) => feature.properties.mode === kind).length
		}))
			.filter((entry) => entry.count > 0)
			.map((entry) => `${entry.count} ${entry.kind}`)
			.join(', ');
	});
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [-0.1276, 51.5072], zoom: 14, bearing: 0, pitch: 0 }}>
		<MapControlContainer position="top-left">
			<MapDrawControl bind:mode onchange={(next) => (features = next)} />
		</MapControlContainer>
	</Map>
	<p
		class="absolute top-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs shadow"
		aria-live="polite"
	>
		<span class="text-muted-foreground">Tool:</span>
		{mode} · {summary}
	</p>
</div>
