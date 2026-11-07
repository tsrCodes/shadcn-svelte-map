<script lang="ts">
	import BikeIcon from '@lucide/svelte/icons/bike';
	import CheckIcon from '@lucide/svelte/icons/check';
	import HouseIcon from '@lucide/svelte/icons/house';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import UtensilsIcon from '@lucide/svelte/icons/utensils';
	import { cn } from '#lib/utils.js';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import {
		Map,
		MapControlContainer,
		MapMarker,
		MapMarkerContent,
		MapMarkerTooltip,
		MapRoute,
		MapZoomControl,
		splitLine,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { MINUTES_PER_TICK, ORDER, STAGES, TICK_MS, VIEWPORT } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	type StepStatus = 'done' | 'current' | 'upcoming';

	const RIDE_START = STAGES.find((stage) => stage.id === 'on-the-way')?.at ?? 0;
	const DELIVERED_AT = STAGES[STAGES.length - 1].at;
	const restaurant = ORDER.route[0];
	const door = ORDER.route[ORDER.route.length - 1];

	/** Simulated minutes since the order was placed. */
	let minutes = $state(0);

	const delivered = $derived(minutes >= DELIVERED_AT);
	const rideProgress = $derived(
		Math.min(1, Math.max(0, (minutes - RIDE_START) / (DELIVERED_AT - RIDE_START)))
	);
	const courierAt = $derived(splitLine(ORDER.route, rideProgress).point);
	const currentIndex = $derived(STAGES.findLastIndex((stage) => stage.at <= minutes));
	const minutesLeft = $derived(Math.max(0, Math.ceil(DELIVERED_AT - minutes)));

	function stepStatus(index: number): StepStatus {
		if (index < currentIndex || (index === currentIndex && delivered)) return 'done';
		return index === currentIndex ? 'current' : 'upcoming';
	}

	function tick() {
		minutes = Math.min(DELIVERED_AT, minutes + MINUTES_PER_TICK);
	}

	// The order clock runs until the food arrives, and stops if the block goes away.
	$effect(() => {
		if (delivered) return;
		const timer = setInterval(tick, TICK_MS);
		return () => clearInterval(timer);
	});
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Order map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		<MapRoute
			id="order-route"
			positions={ORDER.route}
			progress={rideProgress}
			restDashArray={[1, 1.5]}
			showHead={false}
		/>
		<MapMarker lngLat={restaurant} aria-label={ORDER.restaurant}>
			<MapMarkerContent>
				<span class="grid size-7 place-items-center rounded-full border bg-background shadow-md">
					<UtensilsIcon class="size-3.5" />
				</span>
			</MapMarkerContent>
			<MapMarkerTooltip>{ORDER.restaurant}</MapMarkerTooltip>
		</MapMarker>
		<MapMarker lngLat={door} aria-label="Delivery address">
			<MapMarkerContent>
				<span class="grid size-7 place-items-center rounded-full border bg-background shadow-md">
					<HouseIcon class="size-3.5" />
				</span>
			</MapMarkerContent>
			<MapMarkerTooltip>Your door</MapMarkerTooltip>
		</MapMarker>
		{#if !delivered}
			<MapMarker lngLat={courierAt} aria-label="Courier {ORDER.courier}">
				<MapMarkerContent>
					<span
						class="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/25"
						data-testid="courier"
						data-progress={rideProgress.toFixed(3)}
					>
						<BikeIcon class="size-4" />
					</span>
				</MapMarkerContent>
				<MapMarkerTooltip>{ORDER.courier}</MapMarkerTooltip>
			</MapMarker>
		{/if}
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>

	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>Order {ORDER.id}</Card.Title>
			<Card.Description>{ORDER.restaurant}</Card.Description>
			<Card.Action>
				<Badge variant={delivered ? 'secondary' : 'default'} data-testid="eta">
					{delivered ? 'Delivered' : `${minutesLeft} min`}
				</Badge>
			</Card.Action>
		</Card.Header>
		<Card.Content class="flex flex-col gap-5">
			<ol class="flex flex-col gap-3" aria-label="Order progress">
				{#each STAGES as stage, index (stage.id)}
					{@const status = stepStatus(index)}
					<li
						class="flex items-center gap-3 text-sm"
						aria-current={status === 'current' ? 'step' : undefined}
						data-status={status}
						data-testid="stage"
					>
						<span
							class={[
								'grid size-6 shrink-0 place-items-center rounded-full border',
								status === 'done' && 'border-primary bg-primary text-primary-foreground',
								status === 'current' && 'border-primary text-primary',
								status === 'upcoming' && 'text-muted-foreground'
							]}
						>
							{#if status === 'done'}
								<CheckIcon class="size-3.5" />
							{:else}
								<span
									class={[
										'size-2 rounded-full',
										status === 'current' ? 'bg-primary motion-safe:animate-pulse' : 'bg-border'
									]}
								></span>
							{/if}
						</span>
						<span class={status === 'upcoming' ? 'text-muted-foreground' : 'font-medium'}>
							{stage.label}
						</span>
					</li>
				{/each}
			</ol>
			<div class="flex flex-col gap-1 border-t pt-4 text-sm">
				<p class="font-medium">Your order</p>
				<ul class="text-muted-foreground">
					{#each ORDER.items as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
			<Button variant="outline" size="sm" class="self-start" onclick={() => (minutes = 0)}>
				<RotateCcwIcon />
				Replay
			</Button>
		</Card.Content>
	</Card.Root>
</div>
