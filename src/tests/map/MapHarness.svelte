<script lang="ts">
	import '../../routes/layout.css';
	import type { ComponentProps } from 'svelte';
	import { Map, type MapContext } from '#lib/registry/ui/map/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import RegisterLayer from './RegisterLayer.svelte';
	import { LIGHT_STYLE, POINTS_ENTRY } from './fixtures.js';

	interface Props extends Omit<ComponentProps<typeof Map>, 'children'> {
		showLayer?: boolean;
		oncontext?: (context: MapContext) => void;
	}

	let { mapStyle = LIGHT_STYLE, showLayer = false, oncontext, ...rest }: Props = $props();
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" {mapStyle} {...rest}>
		<ContextProbe {oncontext} />
		{#if showLayer}
			<RegisterLayer entry={POINTS_ENTRY} />
		{/if}
	</Map>
</div>
