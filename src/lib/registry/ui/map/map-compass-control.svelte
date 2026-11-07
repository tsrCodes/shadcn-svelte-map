<script lang="ts">
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { cn } from '#lib/utils.js';
	import { CONTROL_BUTTON_CLASS } from './map-control-container.svelte';
	import { getMapContext } from './map-context.svelte.js';
	import { mapValue } from './map-value.svelte.js';

	interface Props extends Omit<
		ButtonProps,
		'href' | 'variant' | 'size' | 'children' | 'style' | 'onclick'
	> {
		/** Also tilt the camera back to flat when pressed. */
		resetPitch?: boolean;
		/** Called after the camera starts turning back to north. */
		onreset?: () => void;
	}

	let { resetPitch = true, onreset, class: className, ...restProps }: Props = $props();

	const ctx = getMapContext();

	const camera = mapValue(
		ctx,
		['rotate', 'pitch'],
		(map) => ({ bearing: map.getBearing(), pitch: map.getPitch() }),
		{ bearing: 0, pitch: 0 }
	);

	/** Points the needle at north; set through the CSSOM, which a strict CSP allows. */
	function needle(node: SVGElement) {
		const { bearing, pitch } = camera.current;
		node.style.transform = `rotateX(${pitch}deg) rotate(${-bearing}deg)`;
	}

	function reset() {
		ctx.easeTo(resetPitch ? { bearing: 0, pitch: 0 } : { bearing: 0 });
		onreset?.();
	}
</script>

<Button
	{...restProps}
	variant="outline"
	size="icon-sm"
	class={cn(CONTROL_BUTTON_CLASS, className)}
	aria-label="Reset bearing to north"
	data-slot="map-compass-control"
	onclick={reset}
>
	<svg
		viewBox="0 0 24 24"
		class="size-5 transition-transform duration-150 motion-reduce:transition-none"
		aria-hidden="true"
		data-slot="map-compass-needle"
		{@attach needle}
	>
		<path d="M12 2.5 16 12H8z" class="fill-destructive" />
		<path d="M12 21.5 8 12h8z" class="fill-muted-foreground" />
	</svg>
</Button>
