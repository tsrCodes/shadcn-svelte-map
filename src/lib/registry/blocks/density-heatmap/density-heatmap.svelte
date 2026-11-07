<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import { Label } from '#lib/registry/ui/label/index.js';
	import { Switch } from '#lib/registry/ui/switch/index.js';
	import {
		Map,
		MapClusterLayer,
		MapControlContainer,
		MapHeatmap,
		MapZoomControl,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { HOURS_PER_DAY, PICKUPS, VIEWPORT, type Pickup } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	type View = 'heatmap' | 'clusters';

	const VIEWS: { value: View; label: string }[] = [
		{ value: 'heatmap', label: 'Heatmap' },
		{ value: 'clusters', label: 'Clusters' }
	];
	/** Hours either side of the picked one that count as "around" it. */
	const WINDOW = 1;
	const START_HOUR = 18;
	const PERCENT = 100;
	/** Hour chart drawing size, in SVG units. */
	const CHART = { width: 240, height: 56, gap: 2 };
	const BAR_WIDTH = CHART.width / HOURS_PER_DAY - CHART.gap;

	const hourly = Array.from(
		{ length: HOURS_PER_DAY },
		(_, hour) => PICKUPS.filter((pickup) => pickup.properties.hour === hour).length
	);
	const busiest = Math.max(...hourly);

	let hour = $state(START_HOUR);
	let allDay = $state(false);
	let view = $state<View>('heatmap');
	let radius = $state(24);

	function hourDistance(a: number, b: number): number {
		const gap = Math.abs(a - b) % HOURS_PER_DAY;
		return Math.min(gap, HOURS_PER_DAY - gap);
	}

	function isShown(pickupHour: number): boolean {
		return allDay || hourDistance(pickupHour, hour) <= WINDOW;
	}

	const visible: FeatureCollection<Point, Pickup> = $derived({
		type: 'FeatureCollection',
		features: PICKUPS.filter((pickup) => isShown(pickup.properties.hour))
	});

	const share = $derived(Math.round((visible.features.length / PICKUPS.length) * PERCENT));

	function clock(value: number): string {
		const wrapped = ((value % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
		return `${String(wrapped).padStart(2, '0')}:00`;
	}

	const windowLabel = $derived(
		allDay ? 'All day' : `${clock(hour - WINDOW)} to ${clock(hour + WINDOW + 1)}`
	);
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Pickup density map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		{#if view === 'heatmap'}
			<MapHeatmap id="pickups-heat" data={visible} {radius} />
		{:else}
			<MapClusterLayer id="pickups-clusters" data={visible} />
		{/if}
		<MapControlContainer position="top-left">
			<ButtonGroup aria-label="Show pickups as">
				{#each VIEWS as option (option.value)}
					<Button
						variant={view === option.value ? 'default' : 'outline'}
						size="sm"
						aria-pressed={view === option.value}
						onclick={() => (view = option.value)}
					>
						{option.label}
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
			<Card.Title>Ride pickups</Card.Title>
			<Card.Description aria-live="polite" data-testid="pickup-summary">
				{visible.features.length} pickups · {share}% of the day · {windowLabel}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-5">
			<svg
				class="w-full"
				viewBox="0 0 {CHART.width} {CHART.height}"
				role="img"
				aria-label="Pickups per hour, busiest at {clock(hourly.indexOf(busiest))}"
			>
				{#each hourly as count, index (index)}
					{@const height = Math.max(1, (count / busiest) * CHART.height)}
					<rect
						x={index * (BAR_WIDTH + CHART.gap)}
						y={CHART.height - height}
						width={BAR_WIDTH}
						{height}
						rx="1"
						class={isShown(index) ? 'fill-primary' : 'fill-muted-foreground/25'}
					/>
				{/each}
			</svg>
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between text-sm">
					<Label for="pickup-hour">Hour</Label>
					<span class="text-muted-foreground tabular-nums">{clock(hour)}</span>
				</div>
				<input
					id="pickup-hour"
					class="w-full accent-primary disabled:opacity-50"
					type="range"
					min="0"
					max={HOURS_PER_DAY - 1}
					bind:value={hour}
					disabled={allDay}
				/>
			</div>
			<div class="flex items-center gap-2">
				<Switch id="pickup-all-day" bind:checked={allDay} />
				<Label for="pickup-all-day">Whole day</Label>
			</div>
			{#if view === 'heatmap'}
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between text-sm">
						<Label for="pickup-radius">Blur radius</Label>
						<span class="text-muted-foreground tabular-nums">{radius} px</span>
					</div>
					<input
						id="pickup-radius"
						class="w-full accent-primary"
						type="range"
						min="8"
						max="48"
						bind:value={radius}
					/>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
