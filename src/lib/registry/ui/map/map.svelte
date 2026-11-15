<script lang="ts" module>
	import workerAsset from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

	/** `setWorkerUrl` must run once, before the first map is created. */
	let workerConfigured = false;

	/** MapLibre options `<Map>` accepts; camera and style have their own props. */
	/** How the world is drawn: flat, or as a sphere at low zoom. */
	export type MapProjection = 'mercator' | 'globe';

	export type MapOptionsInput = Omit<
		import('maplibre-gl').MapOptions,
		'container' | 'style' | 'center' | 'zoom' | 'bearing' | 'pitch' | 'transformCameraUpdate'
	>;
</script>

<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { LngLat, Map as MapLibreMap, StyleSpecification, Subscription } from 'maplibre-gl';
	import { cn } from '#lib/utils.js';
	import { Spinner } from '#lib/registry/ui/spinner/index.js';
	import { MapContext, setMapContext } from './map-context.svelte.js';
	import { DEFAULT_MAP_STYLE, resolveStyle, type MapStyle, type StyleInput } from './styles.js';
	import {
		DEFAULT_VIEWPORT,
		sameViewport,
		snapshotViewport,
		toViewport,
		type MapViewport
	} from './viewport.js';
	import { supportsWebGL2 } from './webgl.js';

	type MapLibreModule = typeof import('maplibre-gl');
	type MapStatus = 'checking' | 'loading' | 'ready' | 'error' | 'unsupported';
	type CameraOverride = { center?: LngLat; zoom?: number; bearing?: number; pitch?: number };

	interface Props extends Omit<
		HTMLAttributes<HTMLDivElement>,
		'children' | 'style' | 'onerror' | 'onload'
	> {
		/** Style URL or object, or `{ light, dark }` to follow the theme. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		/** Camera. Bind it, or pass it with `onviewportchange` to control the camera fully. */
		viewport?: MapViewport;
		/** Called with every proposed camera change. The map then shows whatever `viewport` holds. */
		onviewportchange?: (viewport: MapViewport) => void;
		/**
		 * `globe` draws the world as a sphere at low zoom; it flattens as you zoom in. Leave it
		 * out to use the style's own projection, which is `mercator` for most styles.
		 */
		projection?: MapProjection;
		/** Extra MapLibre options, read once when the map is created. */
		options?: MapOptionsInput;
		/** URL of the MapLibre worker. Defaults to the copy bundled with your app. */
		workerUrl?: string;
		/** The MapLibre map instance. */
		ref?: MapLibreMap | null;
		/** Called once with the map when its first style has loaded. */
		onload?: (map: MapLibreMap) => void;
		/** Style, tile and source errors. Without it, errors are logged to the console. */
		onerror?: (error: Error) => void;
		/** Shown while the map loads. */
		loader?: Snippet;
		/** Shown instead of the map when the browser has no WebGL 2. */
		unsupported?: Snippet;
		children?: Snippet;
	}

	let {
		mapStyle = DEFAULT_MAP_STYLE,
		viewport = $bindable(),
		onviewportchange,
		projection,
		options,
		workerUrl,
		ref = $bindable(null),
		onload,
		onerror,
		loader,
		unsupported,
		children,
		class: className,
		'aria-label': ariaLabel = 'Map',
		...restProps
	}: Props = $props();

	const ctx = setMapContext(new MapContext());
	const uid = $props.id();
	const hintId = `${uid}-hint`;

	let status = $state<MapStatus>('checking');
	let contextLost = $state(false);

	/** The camera the map was last told to show; external `viewport` changes differ from it. */
	let lastApplied: MapViewport | null = null;
	/** The style last handed to MapLibre, so a theme change only swaps when needed. */
	let appliedStyle: StyleInput | null = null;

	const activeStyle = $derived(resolveStyle(ctx.basemap ?? mapStyle, ctx.theme.resolved));

	function prepareStyle(style: StyleInput): StyleInput {
		return typeof style === 'string'
			? style
			: ($state.snapshot(style as unknown) as StyleSpecification);
	}

	function toError(value: unknown): Error {
		if (value instanceof Error) return value;
		if (value && typeof value === 'object' && 'message' in value)
			return new Error(String(value.message));
		return new Error(String(value));
	}

	function reportError(error: Error) {
		if (status === 'loading') status = 'error';
		if (onerror) onerror(error);
		else console.error(error);
	}

	function handleCameraUpdate(lib: MapLibreModule, proposed: MapViewport): CameraOverride {
		if (!onviewportchange) {
			lastApplied = proposed;
			viewport = proposed;
			return {};
		}
		onviewportchange(proposed);
		const decided = viewport ? snapshotViewport(viewport) : proposed;
		lastApplied = decided;
		return {
			center: lib.LngLat.convert(decided.center),
			zoom: decided.zoom,
			bearing: decided.bearing,
			pitch: decided.pitch
		};
	}

	function listen(map: MapLibreMap): Subscription[] {
		return [
			map.on('styledataloading', () => ctx.layers.styleLoading()),
			map.on('style.load', () => {
				ctx.layers.styleLoaded();
				// A new style brings its own projection; keep the one asked for, if any.
				if (projection) map.setProjection({ type: projection });
				ctx.styleVersion += 1;
			}),
			map.on('load', () => {
				status = 'ready';
				onload?.(map);
			}),
			map.on('error', (event) => reportError(toError(event.error))),
			map.on('webglcontextlost', () => (contextLost = true)),
			map.on('webglcontextrestored', () => (contextLost = false))
		];
	}

	function createMap(lib: MapLibreModule, node: HTMLElement): () => void {
		const settings = untrack(() => ({ options, workerUrl, viewport, style: activeStyle }));
		if (!workerConfigured) {
			lib.setWorkerUrl(settings.workerUrl ?? workerAsset);
			workerConfigured = true;
		}
		const initial = snapshotViewport(settings.viewport ?? DEFAULT_VIEWPORT);
		lastApplied = initial;
		appliedStyle = settings.style;

		const map = new lib.Map({
			attributionControl: { compact: true },
			...settings.options,
			container: node,
			style: prepareStyle(settings.style),
			center: initial.center,
			zoom: initial.zoom,
			bearing: initial.bearing,
			pitch: initial.pitch,
			transformCameraUpdate: (next) => handleCameraUpdate(lib, toViewport(next))
		});
		ctx.layers.attach(map);
		const subscriptions = listen(map);
		ctx.maplibre = lib;
		ctx.map = map;
		ref = map;

		return () => {
			ctx.runBeforeRemove();
			for (const subscription of subscriptions) subscription.unsubscribe();
			ctx.layers.detach();
			map.remove();
			ctx.map = null;
			ctx.maplibre = null;
			ref = null;
		};
	}

	function mount(node: HTMLDivElement) {
		return untrack(() => {
			ctx.container = node;
			if (!supportsWebGL2()) {
				status = 'unsupported';
				return () => (ctx.container = null);
			}
			status = 'loading';
			let cancelled = false;
			let destroy: (() => void) | null = null;
			import('maplibre-gl').then(
				(lib) => {
					if (cancelled) return;
					// MapLibre throws from its constructor, e.g. when WebGL fails or options clash.
					try {
						destroy = createMap(lib, node);
					} catch (error) {
						reportError(toError(error));
					}
				},
				(error: unknown) => {
					if (!cancelled) reportError(toError(error));
				}
			);
			return () => {
				cancelled = true;
				destroy?.();
				ctx.container = null;
			};
		});
	}

	// Follow the theme or a new `mapStyle`; registered layers are carried across.
	$effect(() => {
		const map = ctx.map;
		const style = activeStyle;
		if (!map || style === appliedStyle) return;
		appliedStyle = style;
		untrack(() => map.setStyle(prepareStyle(style), { transformStyle: ctx.layers.transformStyle }));
	});

	// Apply `viewport` changes made outside the map, even while it is moving.
	$effect(() => {
		const map = ctx.map;
		if (!map || !viewport) return;
		const target = snapshotViewport(viewport);
		if (lastApplied && sameViewport(target, lastApplied)) return;
		untrack(() => {
			map.stop();
			map.jumpTo(target);
		});
	});

	// Switch projection live once a style has loaded; style loads apply it themselves.
	$effect(() => {
		const map = ctx.map;
		const next = projection;
		if (!map || !next || ctx.styleVersion === 0) return;
		untrack(() => {
			if (map.getProjection()?.type !== next) map.setProjection({ type: next });
		});
	});
</script>

<div
	bind:this={ctx.root}
	{...restProps}
	class={cn('relative isolate overflow-hidden bg-background', className)}
	role="region"
	aria-label={ariaLabel}
	aria-describedby={hintId}
	data-slot="map"
	data-status={status}
>
	<div class="size-full" data-slot="map-canvas" {@attach mount}></div>
	<p id={hintId} class="sr-only">
		Use the arrow keys to pan, plus and minus to zoom, and Shift with the arrow keys to rotate.
	</p>

	{#if status === 'checking' || status === 'loading'}
		<div class="absolute inset-0 z-10 grid place-items-center bg-muted/40" data-slot="map-loader">
			{#if loader}
				{@render loader()}
			{:else}
				<Spinner class="size-6 text-muted-foreground" aria-label="Loading map" />
			{/if}
		</div>
	{:else if status === 'error'}
		<div
			class="absolute inset-0 z-10 grid place-items-center bg-muted p-4 text-center text-sm text-muted-foreground"
			role="alert"
			data-slot="map-error"
		>
			The map could not be loaded.
		</div>
	{:else if status === 'unsupported'}
		<div
			class="absolute inset-0 z-10 grid place-items-center bg-muted p-4 text-center text-sm text-muted-foreground"
			data-slot="map-unsupported"
		>
			{#if unsupported}
				{@render unsupported()}
			{:else}
				<p>This map needs WebGL 2, which this browser or device does not provide.</p>
			{/if}
		</div>
	{/if}

	{#if contextLost}
		<div
			class="absolute inset-0 z-10 grid place-items-center bg-background/80 text-sm text-muted-foreground"
			role="status"
			data-slot="map-context-lost"
		>
			The map stopped drawing. Restoring…
		</div>
	{/if}

	{@render children?.()}
</div>

<style>
	[data-slot='map'] :global(.maplibregl-ctrl-attrib) {
		background-color: color-mix(in oklab, var(--background) 80%, transparent);
		color: var(--muted-foreground);
		font-family: inherit;
	}

	[data-slot='map'] :global(.maplibregl-ctrl-attrib a) {
		color: inherit;
	}

	[data-slot='map'] :global(.maplibregl-ctrl-attrib.maplibregl-compact) {
		border-radius: var(--radius);
	}

	/* Fullscreen: the real API, or a fixed overlay where the API is missing (iPhone Safari). */
	[data-slot='map']:fullscreen,
	[data-slot='map'][data-fullscreen='fallback'] {
		border-radius: 0;
		border-width: 0;
	}

	[data-slot='map'][data-fullscreen='fallback'] {
		position: fixed;
		inset: 0;
		z-index: 50;
		width: 100%;
		height: 100%;
		max-width: none;
		margin: 0;
	}

	:global(html[data-map-fullscreen]) {
		overflow: hidden;
	}

	:global(.dark) [data-slot='map'] :global(.maplibregl-ctrl-attrib-button) {
		filter: invert(1);
	}

	/* Cluster counts drawn as HTML on styles without glyphs. Clicks go to the canvas. */
	[data-slot='map'] :global(.map-cluster-label) {
		pointer-events: none;
		color: var(--primary-foreground);
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	/* Popups and tooltips use the shadcn popover and tooltip tokens. */
	[data-slot='map'] :global(.map-popup) {
		--map-popup-bg: var(--popover);
		--map-popup-fg: var(--popover-foreground);
		--map-popup-border: var(--border);
	}

	[data-slot='map'] :global(.map-popup.map-tooltip) {
		--map-popup-bg: var(--foreground);
		--map-popup-fg: var(--background);
		--map-popup-border: transparent;
		pointer-events: none;
	}

	[data-slot='map'] :global(.map-popup .maplibregl-popup-content) {
		background-color: var(--map-popup-bg);
		color: var(--map-popup-fg);
		border: 1px solid var(--map-popup-border);
		border-radius: var(--radius);
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		padding: 0.75rem;
		font-family: inherit;
		font-size: 0.875rem;
	}

	[data-slot='map'] :global(.map-tooltip .maplibregl-popup-content) {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		box-shadow: none;
	}

	[data-slot='map'] :global(.map-popup .maplibregl-popup-close-button) {
		color: var(--muted-foreground);
		border-radius: calc(var(--radius) - 4px);
		inset-inline-end: 0.25rem;
		top: 0.25rem;
		width: 1.5rem;
		height: 1.5rem;
		font-size: 1rem;
		line-height: 1;
	}

	[data-slot='map'] :global(.map-popup .maplibregl-popup-close-button:hover) {
		background-color: var(--accent);
		color: var(--accent-foreground);
	}

	[data-slot='map'] :global(.map-popup .maplibregl-popup-close-button:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}

	[data-slot='map'] :global(.map-popup[class*='-anchor-top'] .maplibregl-popup-tip) {
		border-bottom-color: var(--map-popup-bg);
	}

	[data-slot='map'] :global(.map-popup[class*='-anchor-bottom'] .maplibregl-popup-tip) {
		border-top-color: var(--map-popup-bg);
	}

	[data-slot='map'] :global(.map-popup.maplibregl-popup-anchor-left .maplibregl-popup-tip) {
		border-right-color: var(--map-popup-bg);
	}

	[data-slot='map'] :global(.map-popup.maplibregl-popup-anchor-right .maplibregl-popup-tip) {
		border-left-color: var(--map-popup-bg);
	}
</style>
