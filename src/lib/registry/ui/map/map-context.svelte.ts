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
import type { MapStyle } from './styles.js';
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
	/** The loaded MapLibre module, so components build markers and popups without importing it. */
	maplibre = $state.raw<typeof import('maplibre-gl') | null>(null);
	/** The element MapLibre renders into. */
	container = $state.raw<HTMLElement | null>(null);
	/** The outer map element. Controls live here; fullscreen and dropdowns use it. */
	root = $state.raw<HTMLElement | null>(null);
	/** Basemap picked with a basemap control. Replaces the `mapStyle` prop while set. */
	basemap = $state.raw<MapStyle | null>(null);

	/** Every control's pick, newest last; the newest one is shown. */
	#basemapClaims: readonly { owner: symbol; style: MapStyle }[] = [];

	/** Show `style` on behalf of `owner`, replacing that owner's earlier pick. */
	claimBasemap(owner: symbol, style: MapStyle): void {
		const others = this.#basemapClaims.filter((claim) => claim.owner !== owner);
		this.#basemapClaims = [...others, { owner, style }];
		this.basemap = style;
	}

	/** Drop `owner`'s pick; the newest remaining pick, or the `mapStyle` prop, shows. */
	releaseBasemap(owner: symbol): void {
		this.#basemapClaims = this.#basemapClaims.filter((claim) => claim.owner !== owner);
		this.basemap = this.#basemapClaims.at(-1)?.style ?? null;
	}

	#beforeRemove: readonly (() => void)[] = [];

	/**
	 * Run `callback` just before the map is removed, while its style is still there.
	 * The map goes before its children clean up, so libraries that remove their own
	 * layers need this. Returns a function that cancels it.
	 */
	beforeRemove(callback: () => void): () => void {
		this.#beforeRemove = [...this.#beforeRemove, callback];
		return () => {
			this.#beforeRemove = this.#beforeRemove.filter((item) => item !== callback);
		};
	}

	/** Called by `<Map>` right before `map.remove()`. */
	runBeforeRemove(): void {
		const callbacks = this.#beforeRemove;
		this.#beforeRemove = [];
		// One failing callback must not keep the others from cleaning up.
		for (const callback of callbacks) {
			try {
				callback();
			} catch (error) {
				console.error(error);
			}
		}
	}

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
