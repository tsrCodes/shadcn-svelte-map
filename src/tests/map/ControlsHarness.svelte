<script lang="ts">
	import '../../routes/layout.css';
	import {
		Map,
		MapBasemapControl,
		MapCompassControl,
		MapControlContainer,
		MapFullscreenControl,
		MapLocateControl,
		MapScaleControl,
		MapSearchControl,
		MapZoomControl,
		type MapBasemap,
		type MapContext,
		type ScaleUnit
	} from '#lib/registry/ui/map/index.js';
	import type { Place } from '#lib/registry/ui/place-autocomplete/index.js';
	import ContextProbe from './ContextProbe.svelte';
	import { DARK_STYLE, LIGHT_STYLE } from './fixtures.js';

	interface Props {
		showControls?: boolean;
		showBasemap?: boolean;
		watch?: boolean;
		scaleUnit?: ScaleUnit;
		scaleMaxWidth?: number;
		basemap?: string;
		oncontext?: (context: MapContext) => void;
		onfullscreen?: (fullscreen: boolean) => void;
		onlocationfound?: (position: GeolocationPosition) => void;
		onlocateerror?: (error: Error | GeolocationPositionError) => void;
		onselect?: (place: Place) => void;
	}

	let {
		showControls = true,
		showBasemap = true,
		watch = false,
		scaleUnit = 'metric',
		scaleMaxWidth = 100,
		basemap = $bindable('light'),
		oncontext,
		onfullscreen,
		onlocationfound,
		onlocateerror,
		onselect
	}: Props = $props();

	const BASEMAPS: MapBasemap[] = [
		{ id: 'light', label: 'Light', style: LIGHT_STYLE },
		{ id: 'dark', label: 'Dark', style: DARK_STYLE }
	];
	const OVERLAYS = [
		{ id: 'zones', label: 'Zones' },
		{ id: 'stops', label: 'Stops' }
	];

	let activeOverlays = $state<string[]>([]);
</script>

<div class="h-[300px] w-[400px]">
	<Map class="size-full" mapStyle={LIGHT_STYLE}>
		<ContextProbe {oncontext} />
		{#if showControls}
			<MapControlContainer position="top-left">
				<MapSearchControl debounce={0} class="w-48" {onselect} />
			</MapControlContainer>
			<MapControlContainer position="top-right">
				<MapZoomControl />
				<MapCompassControl />
				<MapFullscreenControl onchange={onfullscreen} />
				<MapLocateControl {watch} {onlocationfound} onerror={onlocateerror} />
				{#if showBasemap}
					<MapBasemapControl
						basemaps={BASEMAPS}
						bind:value={basemap}
						overlays={OVERLAYS}
						bind:activeOverlays
					/>
				{/if}
			</MapControlContainer>
			<MapControlContainer position="bottom-left">
				<MapScaleControl unit={scaleUnit} maxWidth={scaleMaxWidth} />
			</MapControlContainer>
		{/if}
	</Map>
</div>
<p data-testid="overlays">{activeOverlays.join(',')}</p>
