<script lang="ts">
	import Navigation2Icon from '@lucide/svelte/icons/navigation-2';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import SquareParkingIcon from '@lucide/svelte/icons/square-parking';
	import { cn } from '#lib/utils.js';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import { Label } from '#lib/registry/ui/label/index.js';
	import { Switch } from '#lib/registry/ui/switch/index.js';
	import {
		Map,
		MapControlContainer,
		MapMarker,
		MapMarkerContent,
		MapMarkerTooltip,
		MapRoute,
		MapZoomControl,
		lineLength,
		splitLine,
		type LngLatTuple,
		type MapStyle,
		type MapViewport
	} from '#lib/registry/ui/map/index.js';
	import { TICK_MS, TIME_SCALE, VEHICLES, VIEWPORT, type Vehicle } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Position {
		vehicle: Vehicle;
		/** Share of its loop driven, 0 to 1. */
		progress: number;
		lngLat: LngLatTuple;
		/** Degrees clockwise from north. */
		heading: number;
	}

	const MS_PER_SECOND = 1_000;
	const KMH_TO_MS = 1 / 3.6;
	/** How far ahead on the loop the heading is measured, as a share of it. */
	const LOOKAHEAD = 0.005;
	const loopLengths = VEHICLES.map((vehicle) => lineLength(vehicle.route));

	let viewport = $state<MapViewport>(VIEWPORT);
	/** Simulated seconds since the block opened. */
	let elapsed = $state(0);
	let playing = $state(true);
	let following = $state(false);
	let selectedId = $state(VEHICLES[0].id);

	const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

	function bearing([lng1, lat1]: LngLatTuple, [lng2, lat2]: LngLatTuple): number {
		const dLng = toRadians(lng2 - lng1);
		const y = Math.sin(dLng) * Math.cos(toRadians(lat2));
		const x =
			Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
			Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLng);
		return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
	}

	function positionOf(vehicle: Vehicle, loopLength: number, seconds: number): Position {
		const driven = vehicle.speedKmh * KMH_TO_MS * seconds;
		const progress = (vehicle.offset + driven / loopLength) % 1;
		const here = splitLine(vehicle.route, progress).point;
		const ahead = splitLine(vehicle.route, (progress + LOOKAHEAD) % 1).point;
		return { vehicle, progress, lngLat: here, heading: bearing(here, ahead) };
	}

	const positions: Position[] = $derived(
		VEHICLES.map((vehicle, index) => positionOf(vehicle, loopLengths[index], elapsed))
	);

	const selected = $derived(positions.find((item) => item.vehicle.id === selectedId));
	const moving = $derived(VEHICLES.filter((vehicle) => vehicle.speedKmh > 0).length);

	function centreOnSelected() {
		if (selected) viewport = { ...viewport, center: selected.lngLat };
	}

	function tick() {
		elapsed += (TICK_MS / MS_PER_SECOND) * TIME_SCALE;
		if (following) centreOnSelected();
	}

	function select(id: string) {
		selectedId = id;
		if (following) centreOnSelected();
	}

	function setFollowing(value: boolean) {
		following = value;
		if (value) centreOnSelected();
	}

	// The simulation clock. It stops while paused and when the block goes away.
	$effect(() => {
		if (!playing) return;
		const timer = setInterval(tick, TICK_MS);
		return () => clearInterval(timer);
	});
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]', className)}>
	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>Fleet</Card.Title>
			<Card.Description>{moving} of {VEHICLES.length} vehicles on the road</Card.Description>
			<Card.Action>
				<Button
					variant="outline"
					size="icon-sm"
					aria-label={playing ? 'Pause' : 'Play'}
					onclick={() => (playing = !playing)}
				>
					{#if playing}<PauseIcon />{:else}<PlayIcon />{/if}
				</Button>
			</Card.Action>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<Switch id="fleet-follow" checked={following} onCheckedChange={setFollowing} />
				<Label for="fleet-follow">Follow the selected vehicle</Label>
			</div>
			<ul class="flex flex-col gap-2">
				{#each positions as item (item.vehicle.id)}
					{@const isParked = item.vehicle.speedKmh === 0}
					<li>
						<button
							type="button"
							class={[
								'flex w-full flex-col gap-1 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
								item.vehicle.id === selectedId && 'border-primary'
							]}
							aria-pressed={item.vehicle.id === selectedId}
							onclick={() => select(item.vehicle.id)}
							data-testid="vehicle"
							data-progress={item.progress.toFixed(4)}
						>
							<span class="flex items-center justify-between gap-2">
								<span class="font-medium">{item.vehicle.name}</span>
								<Badge variant={isParked ? 'secondary' : 'default'}>
									{isParked ? 'Parked' : 'Moving'}
								</Badge>
							</span>
							<span class="flex justify-between text-muted-foreground">
								<span>{item.vehicle.driver}</span>
								<span class="tabular-nums">{item.vehicle.speedKmh} km/h</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>

	<Map class="min-h-[360px] rounded-lg border" aria-label="Fleet map" {mapStyle} bind:viewport>
		{#if selected}
			<MapRoute
				id="fleet-selected-route"
				positions={selected.vehicle.route}
				progress={selected.progress}
				restDashArray={[1, 1.5]}
				showStops={false}
				showHead={false}
			/>
		{/if}
		{#each positions as item (item.vehicle.id)}
			{@const isParked = item.vehicle.speedKmh === 0}
			<MapMarker
				lngLat={item.lngLat}
				rotation={isParked ? 0 : item.heading}
				aria-label="{item.vehicle.name}, {isParked ? 'parked' : 'moving'}"
				onclick={() => select(item.vehicle.id)}
			>
				<MapMarkerContent>
					<span
						class={[
							'grid size-7 place-items-center rounded-full border-2 border-background shadow-md',
							item.vehicle.id === selectedId
								? 'bg-primary text-primary-foreground'
								: 'bg-background text-foreground'
						]}
					>
						{#if isParked}
							<SquareParkingIcon class="size-3.5" />
						{:else}
							<Navigation2Icon class="size-3.5 fill-current" />
						{/if}
					</span>
				</MapMarkerContent>
				<MapMarkerTooltip>{item.vehicle.name} · {item.vehicle.driver}</MapMarkerTooltip>
			</MapMarker>
		{/each}
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
	</Map>
</div>
