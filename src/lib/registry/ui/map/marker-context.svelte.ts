import { createContext } from 'svelte';
import type { LngLat, Marker } from 'maplibre-gl';

/** Shared state of one `<MapMarker>`, read by its content, label, popup and tooltip parts. */
export class MarkerContext {
	/** The MapLibre marker, once the map exists. */
	marker = $state.raw<Marker | null>(null);
	/** The marker's `<button>`. */
	button = $state.raw<HTMLButtonElement | null>(null);
	/** Where the marker is now, including while it is dragged. */
	position = $state.raw<LngLat | null>(null);
	/** How many `MapMarkerContent` parts are mounted. */
	contentCount = $state(0);
	/** True while any `MapMarkerContent` replaces the default dot. */
	hasContent = $derived(this.contentCount > 0);
	/** True while a `MapMarkerPopup` is attached. */
	hasPopup = $state(false);
	/** True while the marker's popup is open. */
	popupOpen = $state(false);
	/** Id of the marker's tooltip, used for `aria-describedby`. */
	tooltipId = $state<string | undefined>(undefined);
}

const [getContext, setContext] = createContext<MarkerContext>();

/** The context of the closest `<MapMarker>`. Throws outside a marker. */
export function getMarkerContext(): MarkerContext {
	return getContext();
}

export function setMarkerContext(context: MarkerContext): MarkerContext {
	return setContext(context);
}
