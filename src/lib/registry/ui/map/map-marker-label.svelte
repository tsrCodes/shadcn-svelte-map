<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'style'> {
		/** Side of the marker the label sits on. */
		position?: 'top' | 'bottom';
		children?: Snippet;
	}

	let { position = 'bottom', children, class: className, ...restProps }: Props = $props();
</script>

<!-- The marker's aria-label names it; the visible label is for sighted users. -->
<span
	aria-hidden="true"
	{...restProps}
	class={cn(
		'pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-sm bg-background/85 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground shadow-sm',
		position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
		className
	)}
	data-slot="map-marker-label"
	data-position={position}
>
	{@render children?.()}
</span>
