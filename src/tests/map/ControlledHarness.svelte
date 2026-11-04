<script lang="ts">
	import '../../routes/layout.css';
	import { Map, type MapContext, type MapViewport } from '#lib/registry/ui/map/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import { LIGHT_STYLE } from './fixtures.js';

	interface Props {
		/** Accept proposed camera changes, or reject them all. */
		accept: boolean;
		oncontext?: (context: MapContext) => void;
	}

	let { accept, oncontext }: Props = $props();

	let viewport = $state<MapViewport>({ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 });

	export function setViewport(next: MapViewport) {
		viewport = next;
	}

	function handleViewportChange(next: MapViewport) {
		if (accept) viewport = next;
	}
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" mapStyle={LIGHT_STYLE} {viewport} onviewportchange={handleViewportChange}>
		<ContextProbe {oncontext} />
	</Map>
</div>
