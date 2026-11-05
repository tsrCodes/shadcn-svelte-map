<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import { getMarkerContext } from './marker-context.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'style'> {
		/** What the marker shows instead of the default dot. */
		children?: Snippet;
	}

	let { children, class: className, ...restProps }: Props = $props();

	const marker = getMarkerContext();

	// Counted, not flagged, so removing one of several content parts keeps the dot hidden.
	// `untrack` keeps the effect from depending on the count it changes.
	$effect(() => {
		untrack(() => (marker.contentCount += 1));
		return () => untrack(() => (marker.contentCount -= 1));
	});
</script>

<span
	{...restProps}
	class={cn('grid place-items-center', className)}
	data-slot="map-marker-content"
>
	{@render children?.()}
</span>
