<script lang="ts" module>
	export type LocateStatus = 'idle' | 'locating' | 'found' | 'following' | 'error';
</script>

<script lang="ts">
	import LocateFixedIcon from '@lucide/svelte/icons/locate-fixed';
	import LocateIcon from '@lucide/svelte/icons/locate';
	import LocateOffIcon from '@lucide/svelte/icons/locate-off';
	import type { Marker } from 'maplibre-gl';
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { Spinner } from '#lib/registry/ui/spinner/index.js';
	import { cn } from '#lib/utils.js';
	import type { LngLatTuple } from './geometry.js';
	import { CONTROL_BUTTON_CLASS } from './map-control-container.svelte';
	import { getMapContext } from './map-context.svelte.js';

	type LocateError = GeolocationPositionError | Error;

	interface Props extends Omit<
		ButtonProps,
		'href' | 'variant' | 'size' | 'children' | 'style' | 'onerror' | 'onclick'
	> {
		/** Keep following the position until pressed again. */
		watch?: boolean;
		/** Zoom to fly to on the first fix; the map never zooms out for it. */
		zoom?: number;
		/** Show a pulsing dot where the user is. */
		showMarker?: boolean;
		/** Passed to the Geolocation API. */
		positionOptions?: PositionOptions;
		/** Called with every position fix. */
		onlocationfound?: (position: GeolocationPosition) => void;
		/** Permission denied, no fix, timeout, or no Geolocation API. Logged when unset. */
		onerror?: (error: LocateError) => void;
	}

	let {
		watch = false,
		zoom = 14,
		showMarker = true,
		positionOptions,
		onlocationfound,
		onerror,
		class: className,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();

	let status = $state<LocateStatus>('idle');
	let position = $state.raw<LngLatTuple | null>(null);
	let dot = $state.raw<HTMLSpanElement | null>(null);
	let marker = $state.raw<Marker | null>(null);

	let watchId: number | null = null;
	/** Bumped on every start and stop, so late answers from an old request are ignored. */
	let request = 0;

	const label = $derived(
		status === 'following' ? 'Stop following my location' : 'Show my location'
	);

	function stop() {
		request += 1;
		if (watchId !== null) navigator.geolocation.clearWatch(watchId);
		watchId = null;
		position = null;
		status = 'idle';
	}

	function found(current: number, fix: GeolocationPosition) {
		if (current !== request) return;
		const next: LngLatTuple = [fix.coords.longitude, fix.coords.latitude];
		const first = position === null;
		position = next;
		status = watch ? 'following' : 'found';
		const map = ctx.map;
		if (first && map) ctx.flyTo({ center: next, zoom: Math.max(map.getZoom(), zoom) });
		onlocationfound?.(fix);
	}

	function failed(current: number, error: LocateError) {
		if (current !== request) return;
		stop();
		status = 'error';
		if (onerror) onerror(error);
		else console.error(error);
	}

	function start() {
		stop();
		const current = request;
		if (!('geolocation' in navigator)) {
			return failed(current, new Error('This browser cannot share its location.'));
		}
		status = 'locating';
		const onFix = (fix: GeolocationPosition) => found(current, fix);
		const onFail = (error: GeolocationPositionError) => failed(current, error);
		if (watch) watchId = navigator.geolocation.watchPosition(onFix, onFail, positionOptions);
		else navigator.geolocation.getCurrentPosition(onFix, onFail, positionOptions);
	}

	function toggle() {
		if (status === 'following' || (status === 'locating' && watch)) stop();
		else start();
	}

	// A new `watch` value, or unmounting, ends the current request or watch.
	$effect(() => {
		void watch;
		return stop;
	});

	// The dot is built once and only moved after that.
	$effect(() => {
		const lib = ctx.maplibre;
		const element = dot;
		if (!lib || !element || !showMarker) return;
		const instance = new lib.Marker({ element });
		marker = instance;
		return () => {
			instance.remove();
			marker = null;
		};
	});

	$effect(() => {
		const instance = marker;
		const map = ctx.map;
		const at = position;
		if (!instance || !map) return;
		if (!at) {
			instance.remove();
			return;
		}
		instance.setLngLat(at);
		if (instance.getElement().parentElement !== map.getCanvasContainer()) instance.addTo(map);
	});
</script>

<Button
	{...restProps}
	variant="outline"
	size="icon-sm"
	class={cn(CONTROL_BUTTON_CLASS, className)}
	aria-label={label}
	aria-pressed={watch ? status === 'following' : undefined}
	aria-busy={status === 'locating'}
	data-slot="map-locate-control"
	data-status={status}
	onclick={toggle}
>
	{#if status === 'locating'}
		<Spinner />
	{:else if status === 'error'}
		<LocateOffIcon />
	{:else if status === 'found' || status === 'following'}
		<LocateFixedIcon class="text-primary" />
	{:else}
		<LocateIcon />
	{/if}
</Button>

{#if ctx.map && showMarker}
	<!-- The dot moves into the map once there is a position; this holder stays put. -->
	<div hidden data-slot="map-locate-holder">
		<span
			bind:this={dot}
			class="pointer-events-none relative grid size-5 place-items-center"
			role="img"
			aria-label="Your location"
			data-slot="map-locate-dot"
		>
			<span
				class="absolute inset-0 animate-ping rounded-full bg-primary/40 motion-reduce:animate-none"
			></span>
			<span class="relative size-3.5 rounded-full border-2 border-background bg-primary shadow-md"
			></span>
		</span>
	</div>
{/if}
