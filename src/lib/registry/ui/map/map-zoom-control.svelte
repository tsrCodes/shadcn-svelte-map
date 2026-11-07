<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import { cn } from '#lib/utils.js';
	import { CONTROL_BUTTON_CLASS } from './map-control-container.svelte';
	import { getMapContext } from './map-context.svelte.js';
	import { mapValue } from './map-value.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
		/** Zoom levels to move per click. */
		step?: number;
	}

	let { step = 1, class: className, ...restProps }: Props = $props();

	const ctx = getMapContext();

	const limits = mapValue(
		ctx,
		['zoom'],
		(map) => ({
			atMin: map.getZoom() <= map.getMinZoom(),
			atMax: map.getZoom() >= map.getMaxZoom()
		}),
		{ atMin: false, atMax: false }
	);

	function zoomBy(delta: number) {
		const map = ctx.map;
		if (!map) return;
		ctx.easeTo({ zoom: map.getZoom() + delta });
	}
</script>

<ButtonGroup
	{...restProps}
	orientation="vertical"
	aria-label="Zoom"
	class={cn('shadow-xs', className)}
	data-slot="map-zoom-control"
>
	<Button
		variant="outline"
		size="icon-sm"
		class={CONTROL_BUTTON_CLASS}
		aria-label="Zoom in"
		disabled={limits.current.atMax}
		onclick={() => zoomBy(step)}
	>
		<PlusIcon />
	</Button>
	<Button
		variant="outline"
		size="icon-sm"
		class={CONTROL_BUTTON_CLASS}
		aria-label="Zoom out"
		disabled={limits.current.atMin}
		onclick={() => zoomBy(-step)}
	>
		<MinusIcon />
	</Button>
</ButtonGroup>
