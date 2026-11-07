import type { Component } from 'svelte';
import GeofenceEditor from '#lib/registry/blocks/geofence-editor/geofence-editor.svelte';
import StoreLocator from '#lib/registry/blocks/store-locator/store-locator.svelte';
import PlotMapper from '#lib/registry/blocks/plot-mapper/plot-mapper.svelte';
import DeliveryZonePlanner from '#lib/registry/blocks/delivery-zone-planner/delivery-zone-planner.svelte';
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
	}
];

export function findBlock(name: string): BlockEntry | undefined {
	return BLOCKS.find((block) => block.name === name);
}
