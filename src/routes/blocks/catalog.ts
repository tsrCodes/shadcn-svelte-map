import type { Component } from 'svelte';
import GeofenceEditor from '#lib/registry/blocks/geofence-editor/geofence-editor.svelte';
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
	}
];

export function findBlock(name: string): BlockEntry | undefined {
	return BLOCKS.find((block) => block.name === name);
}
