<script lang="ts" module>
	let warnedBlankLabel = false;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { LngLat, LngLatLike, Marker, PointLike, PositionAnchor } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { getMapContext } from './map-context.svelte.js';
	import { MarkerContext, setMarkerContext } from './marker-context.svelte.js';

	type DragHandler = (lngLat: LngLat) => void;

	const FALLBACK_LABEL = 'Map marker';

	interface Props extends Omit<
		HTMLButtonAttributes,
		'children' | 'style' | 'ondragstart' | 'ondrag' | 'ondragend'
	> {
		/** Where the marker sits. Bind it to follow drags. */
		lngLat: LngLatLike;
		/** Name read by screen readers. */
		'aria-label': string;
		/** Which part of the marker sits on `lngLat`. Read once. */
		anchor?: PositionAnchor;
		/** Pixel offset from `lngLat`. */
		offset?: PointLike;
		/** Let users drag the marker. Bind `lngLat` to follow it. */
		draggable?: boolean;
		/** Rotation in degrees, clockwise. */
		rotation?: number;
		/** The MapLibre marker instance. */
		ref?: Marker | null;
		/** Called with the position when a drag starts. */
		ondragstart?: DragHandler;
		/** Called with the position on every move while dragging. */
		ondrag?: DragHandler;
		/** Called with the final position when a drag ends. */
		ondragend?: DragHandler;
		children?: Snippet;
	}

	let {
		lngLat = $bindable(),
		anchor = 'center',
		offset = [0, 0],
		draggable = false,
		rotation = 0,
		ref = $bindable(null),
		ondragstart,
		ondrag,
		ondragend,
		children,
		class: className,
		'aria-label': ariaLabel,
		'aria-describedby': describedBy,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();
	const marker = setMarkerContext(new MarkerContext());

	// A blank name leaves screen readers with nothing to announce.
	const label = $derived(ariaLabel?.trim() || FALLBACK_LABEL);

	$effect(() => {
		if (ariaLabel?.trim() || warnedBlankLabel) return;
		// Once per page: a list of unnamed markers should not flood the console.
		warnedBlankLabel = true;
		console.warn(
			`MapMarker: aria-label is empty, using "${FALLBACK_LABEL}". Give each marker a name people can tell apart.`
		);
	});

	const describedByIds = $derived(
		[describedBy, marker.tooltipId].filter(Boolean).join(' ') || undefined
	);

	// Build the marker once the map exists; props after that go through setters.
	$effect(() => {
		const map = ctx.map;
		const lib = ctx.maplibre;
		const element = marker.button;
		if (!map || !lib || !element) return;

		const instance = untrack(() =>
			new lib.Marker({ element, anchor, offset, draggable, rotation }).setLngLat(lngLat).addTo(map)
		);
		const subscriptions = [
			instance.on('dragstart', () => ondragstart?.(instance.getLngLat())),
			instance.on('drag', () => {
				const position = instance.getLngLat();
				marker.position = position;
				ondrag?.(position);
			}),
			instance.on('dragend', () => {
				const position = instance.getLngLat();
				marker.position = position;
				lngLat = [position.lng, position.lat];
				ondragend?.(position);
			})
		];
		marker.marker = instance;
		marker.position = instance.getLngLat();
		ref = instance;

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
			instance.remove();
			marker.marker = null;
			ref = null;
		};
	});

	$effect(() => {
		const instance = marker.marker;
		const next = lngLat;
		if (!instance) return;
		instance.setLngLat(next);
		marker.position = instance.getLngLat();
	});

	$effect(() => {
		marker.marker?.setOffset(offset);
	});

	$effect(() => {
		marker.marker?.setDraggable(draggable);
	});

	$effect(() => {
		marker.marker?.setRotation(rotation);
	});
</script>

{#if ctx.map}
	<!-- The button moves into the map once the marker exists; this holder stays put. -->
	<div hidden data-slot="map-marker-holder">
		<button
			bind:this={marker.button}
			type="button"
			{...restProps}
			class={cn(
				'group/map-marker relative grid cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
				className
			)}
			aria-label={label}
			aria-describedby={describedByIds}
			aria-haspopup={marker.hasPopup ? 'dialog' : undefined}
			aria-expanded={marker.hasPopup ? marker.popupOpen : undefined}
			data-slot="map-marker"
		>
			{#if !marker.hasContent}
				<span
					class="block size-4 rounded-full border-2 border-background bg-primary shadow-md transition-transform group-hover/map-marker:scale-110 motion-reduce:transition-none"
					data-slot="map-marker-dot"
				></span>
			{/if}
			{@render children?.()}
		</button>
	</div>
{/if}
