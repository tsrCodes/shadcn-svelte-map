<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { on } from 'svelte/events';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Popup } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { getMapContext } from './map-context.svelte.js';
	import { getMarkerContext } from './marker-context.svelte.js';
	import { DEFAULT_POPUP_MAX_WIDTH, syncPopupLook, type PopupOffset } from './popup.svelte.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style' | 'id'> {
		/** Distance from the marker in pixels, or per-anchor offsets. */
		offset?: PopupOffset;
		/** CSS max-width of the tooltip. */
		maxWidth?: string;
		/** The MapLibre popup instance behind the tooltip. */
		ref?: Popup | null;
		children?: Snippet;
	}

	let {
		offset = 14,
		maxWidth = DEFAULT_POPUP_MAX_WIDTH,
		ref = $bindable(null),
		children,
		class: className,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();
	const marker = getMarkerContext();
	const id = $props.id();

	let content = $state.raw<HTMLDivElement | null>(null);
	let popup = $state.raw<Popup | null>(null);
	let hovered = $state(false);
	let focused = $state(false);
	let dismissed = $state(false);

	const visible = $derived((hovered || focused) && !dismissed && !marker.popupOpen);

	$effect(() => {
		marker.tooltipId = id;
		return () => {
			marker.tooltipId = undefined;
		};
	});

	// Build the tooltip once; it never takes focus or closes on map clicks.
	$effect(() => {
		const lib = ctx.maplibre;
		const node = content;
		if (!lib || !node) return;

		const instance = untrack(() =>
			new lib.Popup({
				closeButton: false,
				closeOnClick: false,
				closeOnMove: false,
				focusAfterOpen: false,
				offset,
				maxWidth,
				className: 'map-popup map-tooltip'
			}).setDOMContent(node)
		);
		popup = instance;
		ref = instance;

		return () => {
			instance.remove();
			popup = null;
			ref = null;
		};
	});

	$effect(() => {
		const instance = popup;
		const map = ctx.map;
		const show = visible;
		if (!instance || !map) return;
		untrack(() => {
			const position = marker.position;
			if (show && !instance.isOpen() && position) instance.setLngLat(position).addTo(map);
			if (!show && instance.isOpen()) instance.remove();
		});
	});

	$effect(() => {
		const position = marker.position;
		if (position) popup?.setLngLat(position);
	});

	// Hover or keyboard focus shows it; Escape hides it until the pointer or focus leaves.
	$effect(() => {
		const button = marker.button;
		if (!button) return;
		const stops = [
			on(button, 'pointerenter', () => (hovered = true)),
			on(button, 'pointerleave', () => {
				hovered = false;
				dismissed = false;
			}),
			on(button, 'focus', () => (focused = button.matches(':focus-visible'))),
			on(button, 'blur', () => {
				focused = false;
				dismissed = false;
			}),
			on(button, 'keydown', (event) => {
				if (event.key === 'Escape') dismissed = true;
			})
		];
		return () => {
			for (const stop of stops) stop();
		};
	});

	syncPopupLook(
		() => popup,
		() => ({ offset, maxWidth, className: cn(className) })
	);
</script>

<span hidden data-slot="map-marker-tooltip-holder">
	<div bind:this={content} {id} role="tooltip" {...restProps} data-slot="map-marker-tooltip">
		{@render children?.()}
	</div>
</span>
