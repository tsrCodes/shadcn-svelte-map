<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { on } from 'svelte/events';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Popup } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { getMapContext } from './map-context.svelte.js';
	import { getMarkerContext } from './marker-context.svelte.js';
	import {
		DEFAULT_POPUP_MAX_WIDTH,
		onPopupEscape,
		syncPopupLook,
		type PopupOffset
	} from './popup.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'> {
		/** Open state. Clicking the marker, Enter or Space toggles it. */
		open?: boolean;
		/** Distance from the marker in pixels, or per-anchor offsets. */
		offset?: PopupOffset;
		/** CSS max-width of the popup. */
		maxWidth?: string;
		/** Show a close button. Read once. */
		closeButton?: boolean;
		/** The MapLibre popup instance. */
		ref?: Popup | null;
		onopen?: () => void;
		onclose?: () => void;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		offset = 18,
		maxWidth = DEFAULT_POPUP_MAX_WIDTH,
		closeButton = true,
		ref = $bindable(null),
		onopen,
		onclose,
		children,
		class: className,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();
	const marker = getMarkerContext();

	let content = $state.raw<HTMLDivElement | null>(null);
	let popup = $state.raw<Popup | null>(null);

	/** After a mouse close, focus would fall to the page; send it back to the marker. */
	function returnFocus() {
		const active = document.activeElement;
		if (!active || active === document.body) marker.button?.focus();
	}

	$effect(() => {
		marker.hasPopup = true;
		return () => {
			marker.hasPopup = false;
		};
	});

	// Build the popup once; its content stays mounted while it is closed.
	$effect(() => {
		const lib = ctx.maplibre;
		const node = content;
		if (!lib || !node) return;

		const instance = untrack(() =>
			new lib.Popup({
				closeButton,
				closeOnClick: false,
				focusAfterOpen: true,
				offset,
				maxWidth,
				className: 'map-popup'
			}).setDOMContent(node)
		);
		const stopEscape = onPopupEscape(instance, () => {
			open = false;
			marker.button?.focus();
		});
		const subscriptions = [
			instance.on('open', () => {
				marker.popupOpen = true;
				onopen?.();
			}),
			instance.on('close', () => {
				marker.popupOpen = false;
				open = false;
				returnFocus();
				onclose?.();
			})
		];
		popup = instance;
		ref = instance;

		return () => {
			stopEscape();
			for (const subscription of subscriptions) subscription.unsubscribe();
			instance.remove();
			marker.popupOpen = false;
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
			const position = marker.position;
			if (shouldOpen && !instance.isOpen() && position) instance.setLngLat(position).addTo(map);
			if (!shouldOpen && instance.isOpen()) instance.remove();
		});
	});

	$effect(() => {
		const position = marker.position;
		if (position) popup?.setLngLat(position);
	});

	// The marker button toggles the popup; a click elsewhere on the map closes it.
	$effect(() => {
		const button = marker.button;
		const map = ctx.map;
		if (!button || !map) return;
		const isInside = (target: EventTarget | null) =>
			target instanceof Node &&
			(button.contains(target) || Boolean(popup?.getElement()?.contains(target)));

		const stopClick = on(button, 'click', () => (open = !open));
		const stopKey = on(button, 'keydown', (event) => {
			if (event.key === 'Escape' && open) open = false;
		});
		const mapClick = map.on('click', (event) => {
			if (open && !isInside(event.originalEvent.target)) open = false;
		});
		return () => {
			stopClick();
			stopKey();
			mapClick.unsubscribe();
		};
	});

	syncPopupLook(
		() => popup,
		() => ({ offset, maxWidth, className: cn(className) })
	);
</script>

<span hidden data-slot="map-marker-popup-holder">
	<div bind:this={content} role="dialog" {...restProps} data-slot="map-marker-popup">
		{@render children?.()}
	</div>
</span>
