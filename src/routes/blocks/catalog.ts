import type { Component } from 'svelte';
import GeofenceEditor from '#lib/registry/blocks/geofence-editor/geofence-editor.svelte';
import StoreLocator from '#lib/registry/blocks/store-locator/store-locator.svelte';
import PlotMapper from '#lib/registry/blocks/plot-mapper/plot-mapper.svelte';
import DeliveryZonePlanner from '#lib/registry/blocks/delivery-zone-planner/delivery-zone-planner.svelte';
import FieldSurvey from '#lib/registry/blocks/field-survey/field-survey.svelte';
import FleetTracker from '#lib/registry/blocks/fleet-tracker/fleet-tracker.svelte';
import OrderTracker from '#lib/registry/blocks/order-tracker/order-tracker.svelte';
import RegionAnalytics from '#lib/registry/blocks/region-analytics/region-analytics.svelte';
import DensityHeatmap from '#lib/registry/blocks/density-heatmap/density-heatmap.svelte';
import RouteNetwork from '#lib/registry/blocks/route-network/route-network.svelte';
import type { MapStyle } from '#lib/registry/ui/map/index.js';

/** Props every block takes, so the preview pages and tests can render any of them. */
export interface BlockProps {
	/** Basemap of the block's map. Defaults to OpenFreeMap. */
	mapStyle?: MapStyle;
	class?: string;
}

export type BlockKind = 'editing' | 'data';

export interface BlockEntry {
	/** Folder name under `src/lib/registry/blocks`, also the preview URL. */
	name: string;
	title: string;
	description: string;
	kind: BlockKind;
	component: Component<BlockProps>;
}

export const BLOCKS: readonly BlockEntry[] = [
	{
		name: 'geofence-editor',
		title: 'Geofence editor',
		description: 'Draw fences around a harbour and see which assets sit inside them.',
		kind: 'editing',
		component: GeofenceEditor
	},
	{
		name: 'store-locator',
		title: 'Store locator',
		description: 'Search an address to list the nearest stores, and pin spots for new ones.',
		kind: 'editing',
		component: StoreLocator
	},
	{
		name: 'plot-mapper',
		title: 'Plot mapper',
		description: 'Trace fields over registry parcels, pick a crop for each and total the hectares.',
		kind: 'editing',
		component: PlotMapper
	},
	{
		name: 'delivery-zone-planner',
		title: 'Delivery zone planner',
		description:
			'Draw delivery zones around a depot, price each one and see how many orders they cover.',
		kind: 'editing',
		component: DeliveryZonePlanner
	},
	{
		name: 'field-survey',
		title: 'Field survey',
		description:
			'Record observations and transects in a park, add notes, and copy the survey as GeoJSON.',
		kind: 'editing',
		component: FieldSurvey
	},
	{
		name: 'fleet-tracker',
		title: 'Live fleet tracker',
		description: 'Vans and trucks drive their rounds; pick one to see its loop or follow it.',
		kind: 'data',
		component: FleetTracker
	},
	{
		name: 'order-tracker',
		title: 'Order tracker',
		description:
			'Follow a food order from the kitchen to the door, with stages and an arrival estimate.',
		kind: 'data',
		component: OrderTracker
	},
	{
		name: 'region-analytics',
		title: 'Region analytics',
		description: 'Shade sales territories by revenue, orders or growth and rank them side by side.',
		kind: 'data',
		component: RegionAnalytics
	},
	{
		name: 'density-heatmap',
		title: 'Density heatmap',
		description: 'A day of ride pickups as a heatmap or clusters, filtered to the hour you pick.',
		kind: 'data',
		component: DensityHeatmap
	},
	{
		name: 'route-network',
		title: 'Flight route network',
		description:
			'An airline network as arcs from each hub, with flights a week and distance per route.',
		kind: 'data',
		component: RouteNetwork
	}
];

export function findBlock(name: string): BlockEntry | undefined {
	return BLOCKS.find((block) => block.name === name);
}
