<script lang="ts" module>
	import type { LngLatTuple } from './geometry.js';

	/** One feature drawn on the canvas, as the keyboard list offers it. */
	export interface FeatureListItem {
		key: string | number;
		label: string;
		lngLat: LngLatTuple;
	}

	/** Options rendered around the active one; the rest stay out of the DOM. */
	const WINDOW = 7;
	/** Items PageUp and PageDown move by. */
	const PAGE = 10;

	/** A feature's `name` property when it has one, else `fallback`. */
	export function featureName(properties: unknown, fallback: string): string {
		if (typeof properties !== 'object' || properties === null) return fallback;
		const name = (properties as { name?: unknown }).name;
		return typeof name === 'string' && name.trim() ? name : fallback;
	}

	/** The list of a points layer, read from its GeoJSON. */
	export function pointItems<
		F extends { geometry: { coordinates: number[] }; properties: unknown }
	>(
		features: readonly F[],
		label: ((feature: F, index: number) => string) | undefined
	): FeatureListItem[] {
		return features.map((feature, index) => {
			const [lng, lat] = feature.geometry.coordinates;
			return {
				key: index,
				label: label?.(feature, index) ?? featureName(feature.properties, `Point ${index + 1}`),
				lngLat: [lng, lat]
			};
		});
	}
</script>

<script lang="ts">
	import { getMapContext } from './map-context.svelte.js';

	interface Props {
		/** Features to list, in order. */
		items: FeatureListItem[];
		/** Accessible name of the list, such as "Stores". */
		label: string;
		/** Enter or Space on an item. `element` is the list, to return focus to later. */
		onselect: (index: number, element: HTMLElement) => void;
		/** The item with keyboard focus, or `null` once focus leaves the list. */
		onactive?: (index: number | null) => void;
	}

	let { items, label, onselect, onactive }: Props = $props();

	const ctx = getMapContext();
	const uid = $props.id();

	let active = $state(0);
	let focused = $state(false);
	/** Kept inside the list when items are removed. */
	const current = $derived(Math.max(0, Math.min(active, items.length - 1)));
	/**
	 * Only a few options around the active one are rendered, so a layer with thousands
	 * of points adds a handful of elements. `aria-setsize` and `aria-posinset` still give
	 * screen readers the full count and position.
	 */
	const start = $derived(
		Math.max(0, Math.min(current - Math.floor(WINDOW / 2), items.length - WINDOW))
	);
	const visible = $derived(items.slice(start, start + WINDOW));

	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	/** Pan to a feature that is out of view, so sighted keyboard users can see it. */
	function reveal(index: number) {
		const map = ctx.map;
		const item = items[index];
		if (!map || !item || map.getBounds().contains(item.lngLat)) return;
		ctx.easeTo({ center: item.lngLat });
	}

	function activate(index: number) {
		active = index;
		onactive?.(index);
		reveal(index);
	}

	function onkeydown(event: KeyboardEvent) {
		const last = items.length - 1;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onselect(current, event.currentTarget as HTMLElement);
			return;
		}
		const next: Record<string, number> = {
			ArrowDown: Math.min(current + 1, last),
			ArrowRight: Math.min(current + 1, last),
			ArrowUp: Math.max(current - 1, 0),
			ArrowLeft: Math.max(current - 1, 0),
			PageDown: Math.min(current + PAGE, last),
			PageUp: Math.max(current - PAGE, 0),
			Home: 0,
			End: last
		};
		if (!(event.key in next)) return;
		// The map pans on arrow keys too; this list owns them while it has focus.
		event.preventDefault();
		event.stopPropagation();
		activate(next[event.key]);
	}

	function onfocus() {
		focused = true;
		activate(current);
	}

	function onblur() {
		focused = false;
		onactive?.(null);
	}
</script>

{#if items.length > 0}
	<div
		role="listbox"
		tabindex="0"
		aria-label={label}
		aria-activedescendant={focused ? optionId(current) : undefined}
		class="sr-only rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none focus:not-sr-only focus:absolute focus:bottom-2 focus:left-2 focus:z-20 focus:w-56 focus-visible:ring-[3px] focus-visible:ring-ring/50"
		data-slot="map-feature-list"
		{onkeydown}
		{onfocus}
		{onblur}
	>
		{#each visible as item, offset (item.key)}
			{@const index = start + offset}
			<div
				id={optionId(index)}
				role="option"
				aria-selected={index === current}
				aria-setsize={items.length}
				aria-posinset={index + 1}
				class={[
					'truncate rounded-sm px-2 py-1',
					index === current && 'bg-accent text-accent-foreground'
				]}
			>
				{item.label}
			</div>
		{/each}
	</div>
{/if}
