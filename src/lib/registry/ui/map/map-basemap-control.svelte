<script lang="ts" module>
	/** A layer users can switch on and off. Render it only while its id is active. */
	export interface MapOverlay {
		id: string;
		label: string;
	}
</script>

<script lang="ts">
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as DropdownMenu from '#lib/registry/ui/dropdown-menu/index.js';
	import { cn } from '#lib/utils.js';
	import { CONTROL_BUTTON_CLASS } from './map-control-container.svelte';
	import { getMapContext } from './map-context.svelte.js';
	import { OPENFREEMAP_BASEMAPS, type MapBasemap } from './styles.js';

	interface Props {
		/** Basemaps to pick from. While this control is mounted it decides the map style. */
		basemaps?: MapBasemap[];
		/** Id of the chosen basemap. Defaults to the first one. */
		value?: string;
		/** Layers to switch on and off. */
		overlays?: MapOverlay[];
		/** Ids of the overlays switched on. */
		activeOverlays?: string[];
		/** Name of the menu button. */
		label?: string;
		class?: string;
		onvaluechange?: (value: string) => void;
	}

	let {
		basemaps = OPENFREEMAP_BASEMAPS,
		value = $bindable(basemaps[0]?.id ?? ''),
		overlays = [],
		activeOverlays = $bindable([]),
		label = 'Map layers',
		class: className,
		onvaluechange
	}: Props = $props();

	const ctx = getMapContext();

	// An id the list no longer has falls back to the first basemap.
	const chosen = $derived(basemaps.find((basemap) => basemap.id === value) ?? basemaps[0] ?? null);

	// The chosen basemap replaces the map's own style until this control goes away.
	$effect(() => {
		const style = chosen?.style;
		if (!style) return;
		ctx.basemap = style;
		return () => {
			// Leave the override alone if something else has set it since.
			if (ctx.basemap === style) ctx.basemap = null;
		};
	});

	function choose(next: string) {
		value = next;
		onvaluechange?.(next);
	}

	function setOverlay(id: string, on: boolean) {
		const others = activeOverlays.filter((active) => active !== id);
		activeOverlays = on ? [...others, id] : others;
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="icon-sm"
				class={cn(CONTROL_BUTTON_CLASS, className)}
				aria-label={label}
				data-slot="map-basemap-control"
			>
				<LayersIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<!-- Inside the map, so the menu still shows when the map is fullscreen. -->
	<DropdownMenu.Content
		align="end"
		class="w-44"
		portalProps={{ to: ctx.root ?? undefined }}
		data-slot="map-basemap-menu"
	>
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading>Basemap</DropdownMenu.GroupHeading>
			<DropdownMenu.RadioGroup bind:value={() => chosen?.id ?? '', choose}>
				{#each basemaps as basemap (basemap.id)}
					<DropdownMenu.RadioItem value={basemap.id}>{basemap.label}</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Group>
		{#if overlays.length > 0}
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading>Layers</DropdownMenu.GroupHeading>
				{#each overlays as overlay (overlay.id)}
					<DropdownMenu.CheckboxItem
						closeOnSelect={false}
						bind:checked={
							() => activeOverlays.includes(overlay.id), (on) => setOverlay(overlay.id, on)
						}
					>
						{overlay.label}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Group>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
