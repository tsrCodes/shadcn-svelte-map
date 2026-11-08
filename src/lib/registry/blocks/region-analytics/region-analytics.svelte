<script lang="ts">
	import type { FeatureCollection, Polygon } from 'geojson';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import {
		Map,
		MapControlContainer,
		MapGeoJSON,
		MapZoomControl,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { METRICS, REGIONS, VIEWPORT, type MetricId, type Region } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	/**
	 * Five shades of the theme's primary colour, light to dark. Each bucket is its own layer
	 * so the fill follows the theme; the swatch classes match the fill opacities.
	 */
	const BUCKETS = [
		{ id: 'lowest', opacity: 0.12, swatch: 'bg-primary/12' },
		{ id: 'low', opacity: 0.27, swatch: 'bg-primary/27' },
		{ id: 'middle', opacity: 0.42, swatch: 'bg-primary/42' },
		{ id: 'high', opacity: 0.57, swatch: 'bg-primary/57' },
		{ id: 'highest', opacity: 0.72, swatch: 'bg-primary/72' }
	] as const;
	const HOVER_LIFT = 0.15;
	const PERCENT = 100;

	let metricId = $state<MetricId>('revenue');
	let hoveredId = $state<string | null>(null);
	let selectedId = $state<string>('centre');

	const metric = $derived(METRICS.find((item) => item.id === metricId) ?? METRICS[0]);
	const values = $derived(REGIONS.map((region) => region.properties[metricId]));
	const low = $derived(Math.min(...values));
	const high = $derived(Math.max(...values));

	function bucketOf(value: number): number {
		if (high === low) return 0;
		const share = (value - low) / (high - low);
		return Math.min(BUCKETS.length - 1, Math.floor(share * BUCKETS.length));
	}

	const buckets: FeatureCollection<Polygon, Region>[] = $derived(
		BUCKETS.map((_, index) => ({
			type: 'FeatureCollection',
			features: REGIONS.filter((region) => bucketOf(region.properties[metricId]) === index)
		}))
	);

	const ranking: Region[] = $derived(
		REGIONS.map((region) => region.properties).sort((a, b) => b[metricId] - a[metricId])
	);

	const focusId = $derived(hoveredId ?? selectedId);
	// Null only when there are no regions at all; the card then says so.
	const focus: Region | null = $derived(
		ranking.find((region) => region.id === focusId) ?? ranking.at(0) ?? null
	);
	const total = $derived(values.reduce((sum, value) => sum + value, 0));
	const isAdditive = $derived(metricId !== 'growth');
	// With nothing to share out, every region holds 0% rather than NaN.
	const share = $derived(focus && total > 0 ? Math.round((focus[metricId] / total) * PERCENT) : 0);

	function regionId(feature: { properties: Record<string, unknown> } | null): string | null {
		return feature ? String(feature.properties.id) : null;
	}
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Region map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		{#each BUCKETS as bucket, index (bucket.id)}
			<MapGeoJSON
				id="region-{bucket.id}"
				data={buckets[index]}
				promoteId="id"
				fillOpacity={bucket.opacity}
				hoverFillOpacity={bucket.opacity + HOVER_LIFT}
				lineWidth={1}
				hoverLineWidth={2.5}
				onhover={(feature) => (hoveredId = regionId(feature))}
				onclick={(feature) => (selectedId = regionId(feature) ?? selectedId)}
			/>
		{/each}
		<MapControlContainer position="top-left">
			<ButtonGroup aria-label="Colour regions by">
				{#each METRICS as item (item.id)}
					<Button
						variant={metricId === item.id ? 'default' : 'outline'}
						size="sm"
						aria-pressed={metricId === item.id}
						onclick={() => (metricId = item.id)}
					>
						{item.label}
					</Button>
				{/each}
			</ButtonGroup>
		</MapControlContainer>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
		<MapControlContainer position="bottom-left">
			<div
				class="flex items-center gap-2 rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm"
				aria-label="{metric.label} from {metric.format(low)} to {metric.format(high)}"
				role="img"
			>
				<span class="text-muted-foreground">{metric.format(low)}</span>
				<span class="flex">
					{#each BUCKETS as bucket (bucket.id)}
						<span class={['h-2.5 w-5', bucket.swatch]}></span>
					{/each}
				</span>
				<span class="text-muted-foreground">{metric.format(high)}</span>
			</div>
		</MapControlContainer>
	</Map>

	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		{#if focus}
			<Card.Header>
				<Card.Title data-testid="focus-name">{focus.name}</Card.Title>
				<Card.Description>
					{#if isAdditive}
						{share}% of all {metric.label.toLowerCase()}
					{:else}
						Change against last quarter
					{/if}
				</Card.Description>
			</Card.Header>
		{:else}
			<Card.Header>
				<Card.Title>No regions to show</Card.Title>
			</Card.Header>
		{/if}
		<Card.Content class="flex flex-col gap-4">
			{#if focus}
				<dl class="grid grid-cols-3 gap-2 text-sm">
					{#each METRICS as item (item.id)}
						<div class="rounded-md border p-2">
							<dt class="text-xs text-muted-foreground">{item.label}</dt>
							<dd class="font-semibold tabular-nums">{item.format(focus[item.id])}</dd>
						</div>
					{/each}
				</dl>
			{/if}
			<ol class="flex flex-col gap-1" aria-label="Regions by {metric.label.toLowerCase()}">
				{#each ranking as region, index (region.id)}
					<li>
						<button
							type="button"
							class={[
								'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
								region.id === focus?.id && 'bg-accent'
							]}
							onclick={() => (selectedId = region.id)}
							data-testid="rank"
						>
							<span class="w-4 text-muted-foreground tabular-nums">{index + 1}</span>
							<span class="flex-1">{region.name}</span>
							{#if metricId === 'growth'}
								{#if region.growth < 0}
									<TrendingDownIcon class="size-3.5 text-destructive" />
								{:else}
									<TrendingUpIcon class="size-3.5 text-muted-foreground" />
								{/if}
							{/if}
							<span class="tabular-nums">{metric.format(region[metricId])}</span>
						</button>
					</li>
				{/each}
			</ol>
		</Card.Content>
	</Card.Root>
</div>
