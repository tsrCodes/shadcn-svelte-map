<script lang="ts">
	import ShieldIcon from '@lucide/svelte/icons/shield';
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
		MapMarkerTooltip,
		MapZoomControl,
		pointInPolygon,
		polygonArea,
		type DrawFeature,
		type DrawTool,
		type LngLatTuple,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { ASSETS, VIEWPORT } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Fence {
		key: string;
		name: string;
		area: number;
		inside: string[];
	}

	const FENCE_MODES = ['polygon', 'rectangle', 'circle'] as const;
	const SQUARE_METRES_PER_HECTARE = 10_000;
	const SQUARE_METRES_PER_KM2 = 1_000_000;

	let tool = $state<DrawTool>('none');
	let drawings = $state.raw<DrawFeature[]>([]);
	// Names are kept by feature id and never pruned, so undoing a delete brings the name back.
	let names = $state.raw<Record<string, string>>({});

	const fences: Fence[] = $derived(
		drawings.flatMap((feature, index): Fence[] => {
			if (feature.geometry.type !== 'Polygon') return [];
			const key = String(feature.id);
			const rings = feature.geometry.coordinates as LngLatTuple[][];
			const inside = ASSETS.filter((asset) => pointInPolygon(asset.lngLat, rings));
			return [
				{
					key,
					name: names[key] ?? `Fence ${index + 1}`,
					area: polygonArea(rings),
					inside: inside.map((asset) => asset.id)
				}
			];
		})
	);

	const fencedIds: string[] = $derived(fences.flatMap((fence) => fence.inside));

	const fencedCount = $derived(ASSETS.filter((asset) => fencedIds.includes(asset.id)).length);

	function formatArea(squareMetres: number): string {
		if (squareMetres >= SQUARE_METRES_PER_KM2) {
			return `${(squareMetres / SQUARE_METRES_PER_KM2).toFixed(2)} km²`;
		}
		return `${(squareMetres / SQUARE_METRES_PER_HECTARE).toFixed(1)} ha`;
	}

	function rename(key: string, value: string) {
		names = { ...names, [key]: value };
	}
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Geofence map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		{#each ASSETS as asset (asset.id)}
			{@const isFenced = fencedIds.includes(asset.id)}
			<MapMarker lngLat={asset.lngLat} aria-label="{asset.name}, {isFenced ? 'inside' : 'outside'}">
				<MapMarkerContent>
					<span
						class={[
							'block size-3.5 rounded-full border-2 border-background shadow',
							isFenced ? 'bg-primary' : 'bg-muted-foreground'
						]}
						data-testid="asset-{asset.id}"
						data-fenced={isFenced}
					></span>
				</MapMarkerContent>
				<MapMarkerTooltip>{asset.name}</MapMarkerTooltip>
			</MapMarker>
		{/each}

		<MapControlContainer position="top-left">
			<MapDrawControl
				orientation="horizontal"
				modes={FENCE_MODES}
				bind:mode={tool}
				onchange={(features) => (drawings = features)}
			/>
		</MapControlContainer>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>

	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>Geofences</Card.Title>
			<Card.Description data-testid="fence-summary">
				{fencedCount} of {ASSETS.length} assets inside a fence
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#each fences as fence (fence.key)}
				<div class="flex flex-col gap-2 rounded-md border p-3" data-testid="fence">
					<Input
						value={fence.name}
						aria-label="Fence name"
						oninput={(event) => rename(fence.key, event.currentTarget.value)}
					/>
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>{formatArea(fence.area)}</span>
						<Badge variant={fence.inside.length > 0 ? 'default' : 'secondary'}>
							{fence.inside.length} inside
						</Badge>
					</div>
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground"
				>
					<ShieldIcon class="size-5" />
					<p>Pick a shape on the map and draw a fence around your assets.</p>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
