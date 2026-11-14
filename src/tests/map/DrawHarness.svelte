<script lang="ts">
	import '../../routes/layout.css';
	import type { TerraDraw } from 'terra-draw';
	import {
		Map,
		MapControlContainer,
		type MapContext,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import {
		MapDrawControl,
		type DrawFeature,
		type DrawTool
	} from '#lib/registry/ui/map-draw/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import { DARK_STYLE, LIGHT_STYLE } from './fixtures.js';

	interface Props {
		showDraw?: boolean;
		mode?: DrawTool;
		mapStyle?: MapStyle;
		features?: DrawFeature[];
		onerror?: (error: Error) => void;
		oncontext?: (context: MapContext) => void;
		onchange?: (features: DrawFeature[]) => void;
		ondraw?: (draw: TerraDraw | null) => void;
	}

	let {
		showDraw = true,
		mode = $bindable('none'),
		mapStyle = { light: LIGHT_STYLE, dark: DARK_STYLE },
		features,
		onerror,
		oncontext,
		onchange,
		ondraw
	}: Props = $props();

	let draw = $state.raw<TerraDraw | null>(null);

	$effect(() => ondraw?.(draw));
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" {mapStyle} viewport={{ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 }}>
		<ContextProbe {oncontext} />
		{#if showDraw}
			<MapControlContainer position="top-left">
				<MapDrawControl
					orientation="horizontal"
					bind:mode
					bind:ref={draw}
					{features}
					{onchange}
					{onerror}
				/>
			</MapControlContainer>
		{/if}
	</Map>
</div>
<p data-testid="mode">{mode}</p>
