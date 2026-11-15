<script lang="ts" module>
	import type { Marker, Popup } from 'maplibre-gl';

	/** Live instances the harness binds, read by tests. */
	export interface MarkerRefs {
		marker: Marker | null;
		markerPopup: Popup | null;
		tooltip: Popup | null;
		popup: Popup | null;
	}
</script>

<script lang="ts">
	import '../../routes/layout.css';
	import type { FeatureCollection, Point } from 'geojson';
	import type { LngLatLike, PositionAnchor } from 'maplibre-gl';
	import {
		Map,
		MapMarker,
		MapMarkerContent,
		MapMarkerLabel,
		MapMarkerPopup,
		MapMarkerTooltip,
		MapPointLayer,
		MapPopup,
		type MapContext,
		type MapStyle,
		type PopupOffset
	} from '#lib/registry/ui/map/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import { LIGHT_STYLE } from './fixtures.js';

	interface Props {
		mapStyle?: MapStyle;
		showMarker?: boolean;
		markerLabel?: string;
		markerLngLat?: LngLatLike;
		markerAnchor?: PositionAnchor;
		customContent?: boolean;
		popupOffset?: PopupOffset;
		tooltipMaxWidth?: string;
		showPopup?: boolean;
		popupLngLat?: LngLatLike;
		points?: FeatureCollection<Point, { name: string }>;
		pointColor?: string;
		pointsBeforeId?: string;
		pointsKeyboard?: boolean;
		/** `null` leaves the popup unnamed. */
		markerPopupLabel?: string | null;
		/** `null` leaves the popup unnamed. */
		pointPopupLabel?: string | null;
		onpointclick?: (name: string, index: number) => void;
		onrefs?: (refs: MarkerRefs) => void;
		oncontext?: (context: MapContext) => void;
	}

	let {
		mapStyle = LIGHT_STYLE,
		showMarker = true,
		markerLabel = 'Cafe',
		markerLngLat = [0, 0],
		markerAnchor = 'center',
		customContent = false,
		popupOffset = 18,
		tooltipMaxWidth = '240px',
		showPopup = false,
		popupLngLat = [10, 10],
		points,
		pointColor,
		pointsBeforeId,
		pointsKeyboard = true,
		markerPopupLabel = 'Cafe details',
		pointPopupLabel = 'Point',
		onpointclick,
		onrefs,
		oncontext
	}: Props = $props();

	let marker = $state.raw<Marker | null>(null);
	let markerPopup = $state.raw<Popup | null>(null);
	let tooltip = $state.raw<Popup | null>(null);
	let popup = $state.raw<Popup | null>(null);

	$effect(() => {
		onrefs?.({ marker, markerPopup, tooltip, popup });
	});
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" {mapStyle} viewport={{ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 }}>
		<ContextProbe {oncontext} />
		{#if showMarker}
			<MapMarker
				lngLat={markerLngLat}
				anchor={markerAnchor}
				aria-label={markerLabel}
				bind:ref={marker}
			>
				{#if customContent}
					<MapMarkerContent><span data-testid="custom">★</span></MapMarkerContent>
				{/if}
				<MapMarkerLabel>Cafe</MapMarkerLabel>
				<MapMarkerTooltip maxWidth={tooltipMaxWidth} bind:ref={tooltip}>Open now</MapMarkerTooltip>
				<MapMarkerPopup
					aria-label={markerPopupLabel ?? undefined}
					offset={popupOffset}
					bind:ref={markerPopup}
				>
					<p>Cafe details</p>
					<a href="#menu" data-testid="popup-link">Menu</a>
				</MapMarkerPopup>
			</MapMarker>
		{/if}
		{#if showPopup}
			<MapPopup lngLat={popupLngLat} aria-label="Note" offset={popupOffset} bind:ref={popup}>
				<p>Standalone</p>
			</MapPopup>
		{/if}
		{#if points}
			<MapPointLayer
				id="harness-points"
				data={points}
				color={pointColor}
				beforeId={pointsBeforeId}
				keyboard={pointsKeyboard}
				listLabel="Cafes"
				popupLabel={pointPopupLabel ?? undefined}
				onclick={(feature, index) => onpointclick?.(feature.properties.name, index)}
			>
				{#snippet popup(feature)}
					<p data-testid="point-popup">{feature.properties.name}</p>
				{/snippet}
			</MapPointLayer>
		{/if}
	</Map>
</div>
