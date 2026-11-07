<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import {
		PlaceAutocomplete,
		type Place,
		type PlacePosition
	} from '#lib/registry/ui/place-autocomplete/index.js';
	import { getMapContext } from './map-context.svelte.js';

	interface Props extends Omit<ComponentProps<typeof PlaceAutocomplete>, 'near'> {
		/** Zoom for places that are a point; areas are fitted to the view. */
		zoom?: number;
		/** Space in pixels kept around an area when fitting it. */
		padding?: number;
		/** Prefer results near the middle of the map. */
		nearCenter?: boolean;
	}

	let {
		query = $bindable(''),
		zoom = 15,
		padding = 48,
		nearCenter = true,
		onselect,
		...restProps
	}: Props = $props();

	const ctx = getMapContext();

	function center(): PlacePosition | undefined {
		const point = nearCenter ? ctx.map?.getCenter() : undefined;
		return point ? [point.lng, point.lat] : undefined;
	}

	function show(place: Place) {
		if (place.bounds) ctx.fitBounds(place.bounds, { padding, maxZoom: zoom });
		else ctx.flyTo({ center: place.position, zoom });
		onselect?.(place);
	}
</script>

<PlaceAutocomplete {...restProps} bind:query near={center} onselect={show} />
