<script lang="ts">
	import { untrack } from 'svelte';
	import { getMapContext, type LayerEntry } from '#lib/registry/ui/map/index.js';

	let { entry }: { entry: LayerEntry } = $props();

	const context = getMapContext();

	$effect(() => {
		const remove = untrack(() => context.layers.add(entry));
		return remove;
	});
</script>
