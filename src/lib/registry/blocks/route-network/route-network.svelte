<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import PlaneIcon from '@lucide/svelte/icons/plane';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import {
		Map,
		MapArc,
		MapControlContainer,
		MapMarker,
		MapMarkerContent,
		MapMarkerLabel,
		MapMarkerTooltip,
		MapPointLayer,
		MapZoomControl,
		distanceMeters,
		type LngLatTuple,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { AIRPORTS, HUBS, ROUTES, VIEWPORT, type Airport, type Hub } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Leg {
		from: LngLatTuple;
		to: LngLatTuple;
		code: string;
		city: string;
		weekly: number;
		km: number;
	}

	const METRES_PER_KM = 1_000;
	const ARC_CURVATURE = 0.18;
	const airports: Record<string, Airport> = Object.fromEntries(
		AIRPORTS.map((airport) => [airport.code, airport])
	);
	const numbers = new Intl.NumberFormat('en');

	let hub = $state<Hub>(HUBS[0]);
	let selectedCode = $state<string | null>(null);

	const legs: Leg[] = $derived(
		ROUTES.filter((route) => route.from === hub)
			.flatMap((route): Leg[] => {
				const origin: Airport | undefined = airports[route.from];
				const destination: Airport | undefined = airports[route.to];
				// A route to an airport missing from the list is left out rather than breaking the map.
				if (!origin || !destination) return [];
				return [
					{
						from: origin.lngLat,
						to: destination.lngLat,
						code: destination.code,
						city: destination.city,
						weekly: route.weekly,
						km: Math.round(distanceMeters(origin.lngLat, destination.lngLat) / METRES_PER_KM)
					}
				];
			})
			.sort((a, b) => b.weekly - a.weekly)
	);

	const selected = $derived(legs.find((leg) => leg.code === selectedCode) ?? null);
	const weekly = $derived(legs.reduce((sum, leg) => sum + leg.weekly, 0));
	const longest = $derived(legs.reduce((most, leg) => Math.max(most, leg.km), 0));

	// Only the current hub's destinations are shown, so every point on the map picks a route.
	const destinations: FeatureCollection<Point, { code: string; city: string }> = $derived({
		type: 'FeatureCollection',
		features: legs.map((leg) => ({
			type: 'Feature',
			properties: { code: leg.code, city: leg.city },
			geometry: { type: 'Point', coordinates: leg.to }
		}))
	});

	function pickHub(next: Hub) {
		hub = next;
		selectedCode = null;
	}

	function pickLeg(code: string) {
		selectedCode = legs.some((leg) => leg.code === code) ? code : null;
	}
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Route map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		<MapArc
			id="network-legs"
			arcs={legs}
			curvature={ARC_CURVATURE}
			opacity={selected ? 0.35 : 0.8}
			width={1.5}
			onclick={(leg) => pickLeg(leg.code)}
		/>
		{#if selected}
			<MapArc id="network-selected" arcs={[selected]} curvature={ARC_CURVATURE} width={3} />
		{/if}
		<MapPointLayer
			id="network-airports"
			data={destinations}
			radius={3.5}
			onclick={(feature) => pickLeg(String(feature.properties.code))}
		/>
		{#each HUBS as code (code)}
			{@const airport = airports[code]}
			<MapMarker
				lngLat={airport.lngLat}
				aria-label="{airport.city} hub"
				onclick={() => pickHub(code)}
			>
				<MapMarkerContent>
					<span
						class={[
							'grid size-6 place-items-center rounded-full border-2 border-background shadow-md',
							hub === code ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
						]}
					>
						<PlaneIcon class="size-3" />
					</span>
				</MapMarkerContent>
				<MapMarkerLabel>{code}</MapMarkerLabel>
				<MapMarkerTooltip>{airport.city}</MapMarkerTooltip>
			</MapMarker>
		{/each}
		<MapControlContainer position="top-left">
			<ButtonGroup aria-label="Hub">
				{#each HUBS as code (code)}
					<Button
						variant={hub === code ? 'default' : 'outline'}
						size="sm"
						aria-pressed={hub === code}
						onclick={() => pickHub(code)}
					>
						{code}
					</Button>
				{/each}
			</ButtonGroup>
		</MapControlContainer>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>

	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>{airports[hub].city} network</Card.Title>
			<Card.Description data-testid="network-summary">
				{legs.length} destinations · {numbers.format(weekly)} flights a week
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="rounded-md border p-3 text-sm" data-testid="leg-detail" aria-live="polite">
				{#if selected}
					<p class="font-medium">{hub} → {selected.code} · {selected.city}</p>
					<p class="text-muted-foreground">
						{numbers.format(selected.km)} km · {selected.weekly} flights a week
					</p>
				{:else}
					<p class="text-muted-foreground">
						Pick a route on the map or below. Longest is {numbers.format(longest)} km.
					</p>
				{/if}
			</div>
			<ol class="flex flex-col gap-1" aria-label="Routes from {hub}">
				{#each legs as leg (leg.code)}
					<li>
						<button
							type="button"
							class={[
								'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
								leg.code === selectedCode && 'bg-accent'
							]}
							aria-pressed={leg.code === selectedCode}
							onclick={() => pickLeg(leg.code)}
							data-testid="leg"
						>
							<span><span class="font-medium">{leg.code}</span> {leg.city}</span>
							<span class="text-muted-foreground tabular-nums">{leg.weekly}/wk</span>
						</button>
					</li>
				{/each}
			</ol>
		</Card.Content>
	</Card.Root>
</div>
