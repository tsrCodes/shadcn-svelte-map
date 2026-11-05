<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { LngLatLike, Popup, PositionAnchor } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { getMapContext } from './map-context.svelte.js';
	import {
		DEFAULT_POPUP_MAX_WIDTH,
		onPopupEscape,
		syncPopupLook,
		type PopupOffset
	} from './popup.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> {
		/** Where the popup points. */
		lngLat: LngLatLike;
		/** Open state. Bind it to hear about the close button, Escape and map clicks. */
		open?: boolean;
		/** Distance from `lngLat` in pixels, or per-anchor offsets. */
		offset?: PopupOffset;
		/** CSS max-width of the popup. */
		maxWidth?: string;
		/** Pin the popup to one side. Read once; leave unset to fit the view. */
		anchor?: PositionAnchor;
		/** Show a close button. Read once. */
		closeButton?: boolean;
		/** Close when the map is clicked. Read once. */
		closeOnClick?: boolean;
		/** Move focus into the popup when it opens. Read once. */
		focusAfterOpen?: boolean;
		/** The MapLibre popup instance. */
		ref?: Popup | null;
		onopen?: () => void;
		onclose?: () => void;
		children?: Snippet;
	}

	let {
		lngLat,
		open = $bindable(true),
		offset = 0,
		maxWidth = DEFAULT_POPUP_MAX_WIDTH,
		anchor,
		closeButton = true,
		closeOnClick = true,
		focusAfterOpen = true,
		ref = $bindable(null),
		onopen,
		onclose,
		children,
		class: className,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();

	let content = $state.raw<HTMLDivElement | null>(null);
	let popup = $state.raw<Popup | null>(null);

	// Build the popup once; its content stays mounted while it is closed.
	$effect(() => {
		const lib = ctx.maplibre;
		const node = content;
		if (!lib || !node) return;

		const instance = untrack(() =>
			new lib.Popup({
				closeButton,
				closeOnClick,
				focusAfterOpen,
				anchor,
				offset,
				maxWidth,
				className: 'map-popup'
			})
				.setLngLat(lngLat)
				.setDOMContent(node)
		);
		const stopEscape = onPopupEscape(instance, () => (open = false));
		const subscriptions = [
			instance.on('open', () => onopen?.()),
			instance.on('close', () => {
				open = false;
				onclose?.();
			})
		];
		popup = instance;
		ref = instance;

		return () => {
			stopEscape();
			for (const subscription of subscriptions) subscription.unsubscribe();
			instance.remove();
			popup = null;
			ref = null;
		};
	});

	$effect(() => {
		const instance = popup;
		const map = ctx.map;
		const shouldOpen = open;
		if (!instance || !map) return;
		untrack(() => {
			if (shouldOpen && !instance.isOpen()) instance.addTo(map);
			if (!shouldOpen && instance.isOpen()) instance.remove();
		});
	});

	$effect(() => {
		const next = lngLat;
		popup?.setLngLat(next);
	});

	syncPopupLook(
		() => popup,
		() => ({ offset, maxWidth, className: cn(className) })
	);
</script>

{#if ctx.map}
	<div hidden data-slot="map-popup-holder">
		<div bind:this={content} role="dialog" {...restProps} data-slot="map-popup">
			{@render children?.()}
		</div>
	</div>
{/if}
