<script lang="ts" module>
	export type MapControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

	/**
	 * Solid background for control buttons. The outline button is see-through in dark
	 * mode, which vanishes over a light basemap.
	 */
	export const CONTROL_BUTTON_CLASS =
		'bg-background shadow-xs hover:bg-muted dark:bg-background dark:hover:bg-muted';

	const POSITION_CLASSES: Record<MapControlPosition, string> = {
		'top-left': 'top-2 left-2 items-start',
		'top-right': 'top-2 right-2 items-end',
		'bottom-left': 'bottom-2 left-2 items-start',
		// Leaves room for the attribution button in the bottom-right corner.
		'bottom-right': 'bottom-10 right-2 items-end'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import { getMapContext } from './map-context.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
		/** Corner of the map the controls stack in. Use one container per corner. */
		position?: MapControlPosition;
		children?: Snippet;
	}

	let { position = 'top-right', children, class: className, ...restProps }: Props = $props();

	const ctx = getMapContext();
</script>

{#if ctx.map}
	<div
		{...restProps}
		class={cn(
			'pointer-events-none absolute z-[5] flex flex-col gap-2 *:pointer-events-auto',
			POSITION_CLASSES[position],
			className
		)}
		data-slot="map-control-container"
		data-position={position}
	>
		{@render children?.()}
	</div>
{/if}
