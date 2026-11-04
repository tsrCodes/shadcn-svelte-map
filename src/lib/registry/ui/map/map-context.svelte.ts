import { createContext } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';
import type {
	AnimationOptions,
	EaseToOptions,
	FitBoundsOptions,
	FlyToOptions,
	LngLatBoundsLike,
	Map as MapLibreMap
} from 'maplibre-gl';
import { LayerRegistry } from './layer-registry.js';
import { readThemeColors, ThemeObserver, type ThemeColors } from './theme.svelte.js';

/**
 * Shared state of one map, available to every component inside `<Map>`.
 *
 * Two readiness flags keep work in the right place: DOM things (markers, popups,
 * controls) depend only on `map`; sources and layers depend on `styleVersion`, which
 * changes on every style load. A theme or basemap change never remounts markers.
 */
export class MapContext {
	/** The MapLibre map, once it exists. */
	map = $state.raw<MapLibreMap | null>(null);
	/** Bumped on every `style.load`. */
	styleVersion = $state(0);
	/** The element the map renders into. */
	container = $state.raw<HTMLElement | null>(null);

	readonly layers = new LayerRegistry();
	readonly theme = new ThemeObserver();

	#reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)', false);

	/** shadcn colours for the current theme, re-read when the theme changes. */
	colors: ThemeColors | null = $derived.by(() => {
		void this.theme.resolved;
		return this.container ? readThemeColors(this.container) : null;
	});

	/** True when the user asked the system for less motion. */
	get reducedMotion(): boolean {
		return this.#reducedMotion.current;
	}

	/** Camera options with animation turned off when reduced motion is on. */
	animate<T extends AnimationOptions>(options: T): T {
		if (!this.reducedMotion) return options;
		return { ...options, duration: 0, animate: false };
	}

	flyTo(options: FlyToOptions): void {
		this.map?.flyTo(this.animate(options));
	}

	easeTo(options: EaseToOptions): void {
		this.map?.easeTo(this.animate(options));
	}

	fitBounds(bounds: LngLatBoundsLike, options: FitBoundsOptions = {}): void {
		this.map?.fitBounds(bounds, this.animate(options));
	}

	zoomIn(options: AnimationOptions = {}): void {
		this.map?.zoomIn(this.animate(options));
	}

	zoomOut(options: AnimationOptions = {}): void {
		this.map?.zoomOut(this.animate(options));
	}
}

const [getContext, setContext] = createContext<MapContext>();

/** The context of the closest `<Map>`. Throws outside a map. */
export function getMapContext(): MapContext {
	return getContext();
}

export function setMapContext(context: MapContext): MapContext {
	return setContext(context);
}
