<script lang="ts">
	import { untrack } from 'svelte';
	import { getMapContext, type MapContext } from '#lib/registry/ui/map/index.js';

	let { oncontext }: { oncontext?: (context: MapContext) => void } = $props();

	const context = getMapContext();
	untrack(() => oncontext?.(context));
</script>
