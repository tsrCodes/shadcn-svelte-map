<script lang="ts">
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import StoreIcon from '@lucide/svelte/icons/store';
	import { cn } from '#lib/utils.js';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import { Input } from '#lib/registry/ui/input/index.js';
	import {
		Map,
		MapControlContainer,
		MapDrawControl,
		MapMarker,
		MapMarkerContent,
		MapMarkerPopup,
		MapMarkerTooltip,
		MapSearchControl,
		MapZoomControl,
		distanceMeters,
		type DrawFeature,
		type DrawTool,
		type LngLatTuple,
		type MapStyle,
		type MapViewport
	} from '#lib/registry/ui/map/index.js';
	import { START, STORES, VIEWPORT } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Listing {
		key: string;
		name: string;
		detail: string;
		lngLat: LngLatTuple;
		distance: number;
		proposed: boolean;
	}

	const PICK_ZOOM = 15;
	const METRES_PER_KM = 1_000;

	let viewport = $state<MapViewport>(VIEWPORT);
	let origin = $state<LngLatTuple>(START);
	let selected = $state<string | null>(null);
	let tool = $state<DrawTool>('none');
	let proposals = $state.raw<DrawFeature[]>([]);
	// Kept by drawing id and never pruned, so an undone delete gets its name back.
	let proposalNames = $state<Record<string, string>>({});

	const listings: Listing[] = $derived.by(() => {
		const stores = STORES.map((store): Listing => ({
			key: store.id,
			name: store.name,
			detail: `${store.address} · ${store.hours}`,
			lngLat: store.lngLat,
			distance: distanceMeters(origin, store.lngLat),
			proposed: false
		}));
		const proposed = proposals.flatMap((feature, index): Listing[] => {
			if (feature.geometry.type !== 'Point') return [];
			const key = String(feature.id);
			const lngLat = feature.geometry.coordinates as LngLatTuple;
			return [
				{
					key,
					name: proposalNames[key] ?? `Proposed site ${index + 1}`,
					detail: 'Not open yet',
					lngLat,
					distance: distanceMeters(origin, lngLat),
					proposed: true
				}
			];
		});
		return [...stores, ...proposed].sort((a, b) => a.distance - b.distance);
	});

	function formatDistance(metres: number): string {
		if (metres < METRES_PER_KM) return `${Math.round(metres)} m`;
		return `${(metres / METRES_PER_KM).toFixed(1)} km`;
	}

	function show(listing: Listing) {
		selected = listing.key;
		viewport = { ...viewport, center: listing.lngLat, zoom: Math.max(viewport.zoom, PICK_ZOOM) };
	}

	function rename(key: string, value: string) {
		proposalNames[key] = value;
	}
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]', className)}>
	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>Find a store</Card.Title>
			<Card.Description>
				Search an address or drag your pin. Use the pin tool to propose a new site.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ol class="flex flex-col gap-2" aria-label="Stores by distance">
				{#each listings as listing (listing.key)}
					<li
						class={[
							'flex flex-col gap-2 rounded-md border p-3',
							selected === listing.key && 'border-primary'
						]}
						data-testid="listing"
						data-key={listing.key}
					>
						<div class="flex items-start justify-between gap-2">
							{#if listing.proposed}
								<Input
									value={listing.name}
									aria-label="Proposed site name"
									class="h-8"
									oninput={(event) => rename(listing.key, event.currentTarget.value)}
								/>
							{:else}
								<button
									type="button"
									class="text-left font-medium hover:underline"
									onclick={() => show(listing)}
								>
									{listing.name}
								</button>
							{/if}
							<span class="shrink-0 text-sm text-muted-foreground tabular-nums">
								{formatDistance(listing.distance)}
							</span>
						</div>
						<div class="flex items-center justify-between gap-2 text-sm text-muted-foreground">
							<span class="truncate">{listing.detail}</span>
							{#if listing.proposed}
								<Badge variant="outline">Proposed</Badge>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</Card.Content>
	</Card.Root>

	<Map class="min-h-[360px] rounded-lg border" aria-label="Store map" {mapStyle} bind:viewport>
		{#each STORES as store (store.id)}
			<MapMarker lngLat={store.lngLat} aria-label="{store.name} store">
				<MapMarkerContent>
					<span
						class={[
							'grid size-7 place-items-center rounded-full border-2 border-background shadow-md',
							selected === store.id
								? 'bg-primary text-primary-foreground'
								: 'bg-background text-foreground'
						]}
					>
						<StoreIcon class="size-3.5" />
					</span>
				</MapMarkerContent>
				<MapMarkerTooltip>{store.name}</MapMarkerTooltip>
				<MapMarkerPopup aria-label="{store.name} store">
					<p class="font-medium">{store.name}</p>
					<p class="text-muted-foreground">{store.address}</p>
					<p class="text-muted-foreground">Open {store.hours}</p>
				</MapMarkerPopup>
			</MapMarker>
		{/each}

		<MapMarker bind:lngLat={origin} aria-label="Your location, drag to move" draggable>
			<MapMarkerContent>
				<span
					class="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-primary/25"
				>
					<NavigationIcon class="size-4" />
				</span>
			</MapMarkerContent>
			<MapMarkerTooltip>You are here</MapMarkerTooltip>
		</MapMarker>

		<MapControlContainer position="top-left">
			<MapSearchControl
				class="w-64"
				placeholder="Search an address"
				onselect={(place) => (origin = place.position)}
			/>
			<MapDrawControl
				orientation="horizontal"
				modes={['point']}
				bind:mode={tool}
				onchange={(features) => (proposals = features)}
			/>
		</MapControlContainer>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>
</div>
