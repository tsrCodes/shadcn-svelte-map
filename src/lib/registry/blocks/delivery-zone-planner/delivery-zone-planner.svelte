<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import WarehouseIcon from '@lucide/svelte/icons/warehouse';
	import { cn } from '#lib/utils.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import * as NativeSelect from '#lib/registry/ui/native-select/index.js';
	import {
		Map,
		MapControlContainer,
		MapDrawControl,
		MapMarker,
		MapMarkerContent,
		MapMarkerTooltip,
		MapZoomControl,
		pointInPolygon,
		type DrawFeature,
		type DrawTool,
		type LngLatTuple,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { DEPOT, ORDERS, TIERS, VIEWPORT, type Order, type TierId } from './data.js';
	import OrderLayers from './order-layers.svelte';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Zone {
		key: string;
		label: string;
		tier: TierId;
		fee: number;
		orders: number;
	}

	const ZONE_MODES = ['polygon', 'circle', 'rectangle'] as const;
	const DEFAULT_TIER: TierId = 'standard';
	const PERCENT = 100;

	const euros = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' });

	let tool = $state<DrawTool>('none');
	let drawings = $state.raw<DrawFeature[]>([]);
	// Tiers are kept by drawing id and never pruned, so an undone delete gets its tier back.
	let tiers = $state<Record<string, TierId>>({});

	const zoneShapes = $derived(
		drawings.flatMap((feature) =>
			feature.geometry.type === 'Polygon'
				? [{ key: String(feature.id), rings: feature.geometry.coordinates as LngLatTuple[][] }]
				: []
		)
	);

	/** Index of the zone that serves each order: the first drawn zone it falls in, or -1. */
	const servedBy: number[] = $derived(
		ORDERS.map((order) => {
			const point = order.geometry.coordinates as LngLatTuple;
			return zoneShapes.findIndex((zone) => pointInPolygon(point, zone.rings));
		})
	);

	const zones: Zone[] = $derived(
		zoneShapes.map((shape, index) => {
			const tier = tiers[shape.key] ?? DEFAULT_TIER;
			return {
				key: shape.key,
				label: `Zone ${index + 1}`,
				tier,
				fee: TIERS.find((option) => option.id === tier)?.fee ?? 0,
				orders: servedBy.filter((zone) => zone === index).length
			};
		})
	);

	function collection(covered: boolean): FeatureCollection<Point, Order> {
		return {
			type: 'FeatureCollection',
			features: ORDERS.filter((_, index) => servedBy[index] >= 0 === covered)
		};
	}

	const covered = $derived(collection(true));
	const uncovered = $derived(collection(false));
	const coverage = $derived(Math.round((covered.features.length / ORDERS.length) * PERCENT));
	const revenue = $derived(zones.reduce((sum, zone) => sum + zone.fee * zone.orders, 0));
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Delivery zone map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		<OrderLayers {covered} {uncovered} />
		<MapMarker lngLat={DEPOT} aria-label="Depot">
			<MapMarkerContent>
				<span
					class="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-md"
				>
					<WarehouseIcon class="size-4" />
				</span>
			</MapMarkerContent>
			<MapMarkerTooltip>Depot</MapMarkerTooltip>
		</MapMarker>
		<MapControlContainer position="top-left">
			<MapDrawControl
				orientation="horizontal"
				modes={ZONE_MODES}
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
			<Card.Title>Delivery zones</Card.Title>
			<Card.Description>Today's {ORDERS.length} orders against the zones you draw.</Card.Description
			>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<dl class="grid grid-cols-2 gap-3">
				<div class="rounded-md border p-3">
					<dt class="text-xs text-muted-foreground">Coverage</dt>
					<dd class="text-xl font-semibold tabular-nums" data-testid="coverage">{coverage}%</dd>
				</div>
				<div class="rounded-md border p-3">
					<dt class="text-xs text-muted-foreground">Fees today</dt>
					<dd class="text-xl font-semibold tabular-nums" data-testid="revenue">
						{euros.format(revenue)}
					</dd>
				</div>
			</dl>
			{#each zones as zone (zone.key)}
				<div class="flex flex-col gap-2 rounded-md border p-3" data-testid="zone">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">{zone.label}</span>
						<span class="text-muted-foreground tabular-nums">{zone.orders} orders</span>
					</div>
					<NativeSelect.Root
						class="w-full"
						size="sm"
						aria-label="Service of {zone.label}"
						value={zone.tier}
						onchange={(event) => (tiers[zone.key] = event.currentTarget.value as TierId)}
					>
						{#each TIERS as tier (tier.id)}
							<NativeSelect.Option value={tier.id}>
								{tier.label} · {euros.format(tier.fee)}
							</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground"
				>
					<TruckIcon class="size-5" />
					<p>Draw zones around the depot. Orders inside a zone light up.</p>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
