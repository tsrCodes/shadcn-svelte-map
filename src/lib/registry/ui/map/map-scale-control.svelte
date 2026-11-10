<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { distanceMeters } from './geometry.js';
	import { getMapContext } from './map-context.svelte.js';
	import { mapValue } from './map-value.svelte.js';
	import { scaleBar, type ScaleUnit } from './scale.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> {
		/** Longest the bar may get, in pixels. */
		maxWidth?: number;
		/** Show kilometres and metres, or miles and feet. */
		unit?: ScaleUnit;
	}

	let { maxWidth = 100, unit = 'metric', class: className, ...restProps }: Props = $props();

	const ctx = getMapContext();

	/** Ground distance across `maxWidth` pixels through the middle of the map. */
	function measure(map: MapLibreMap): number {
		const canvas = map.getCanvasContainer();
		const y = canvas.clientHeight / 2;
		const x = Math.max(0, (canvas.clientWidth - maxWidth) / 2);
		const left = map.unproject([x, y]);
		const right = map.unproject([x + maxWidth, y]);
		return distanceMeters([left.lng, left.lat], [right.lng, right.lat]);
	}

	// `maxWidth` is read inside `measure`, so a new value re-measures right away.
	const meters = mapValue(ctx, ['move', 'resize'], measure, 0);
	const scale = $derived(scaleBar(meters.current, unit));

	function width(node: HTMLElement) {
		node.style.width = `${Math.round((scale?.ratio ?? 0) * maxWidth)}px`;
	}
</script>

{#if scale}
	<div
		{...restProps}
		class={cn(
			'rounded-sm bg-background/80 px-1 pt-0.5 text-[0.625rem] leading-none text-foreground tabular-nums',
			className
		)}
		role="img"
		aria-label="Map scale: {scale.label}"
		data-slot="map-scale-control"
	>
		<div
			class="border-x-2 border-b-2 border-foreground/70 px-1 pb-0.5 whitespace-nowrap"
			data-slot="map-scale-bar"
			{@attach width}
		>
			{scale.label}
		</div>
	</div>
{/if}
