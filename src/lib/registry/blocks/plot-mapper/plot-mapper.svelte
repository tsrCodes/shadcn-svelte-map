<script lang="ts">
	import SproutIcon from '@lucide/svelte/icons/sprout';
	import { cn } from '#lib/utils.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import * as NativeSelect from '#lib/registry/ui/native-select/index.js';
	import {
		Map,
		MapControlContainer,
		MapDrawControl,
		MapGeoJSON,
		MapScaleControl,
		MapZoomControl,
		pointInPolygon,
		polygonArea,
		ringCenter,
		type DrawFeature,
		type DrawTool,
		type LngLatTuple,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import { CROPS, PARCELS, VIEWPORT, type Crop } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Field {
		key: string;
		label: string;
		crop: Crop;
		hectares: number;
		parcel: string | null;
	}

	const FIELD_MODES = ['polygon', 'rectangle', 'freehand'] as const;
	const SQUARE_METRES_PER_HECTARE = 10_000;
	const DEFAULT_CROP: Crop = 'Wheat';

	let tool = $state<DrawTool>('none');
	let drawings = $state.raw<DrawFeature[]>([]);
	// Crops are kept by drawing id and never pruned, so an undone delete gets its crop back.
	let crops = $state<Record<string, Crop>>({});
	let hoveredParcel = $state<string | null>(null);

	function parcelAt(point: LngLatTuple): string | null {
		const found = PARCELS.features.find((parcel) =>
			pointInPolygon(point, parcel.geometry.coordinates as LngLatTuple[][])
		);
		return found?.properties.name ?? null;
	}

	const fields: Field[] = $derived(
		drawings.flatMap((feature, index): Field[] => {
			if (feature.geometry.type !== 'Polygon') return [];
			const key = String(feature.id);
			const rings = feature.geometry.coordinates as LngLatTuple[][];
			return [
				{
					key,
					label: `Field ${index + 1}`,
					crop: crops[key] ?? DEFAULT_CROP,
					hectares: polygonArea(rings) / SQUARE_METRES_PER_HECTARE,
					parcel: parcelAt(ringCenter(rings[0]))
				}
			];
		})
	);

	const totals = $derived(
		CROPS.map((crop) => ({
			crop,
			hectares: fields
				.filter((field) => field.crop === crop)
				.reduce((sum, field) => sum + field.hectares, 0)
		})).filter((total) => total.hectares > 0)
	);

	const totalHectares = $derived(fields.reduce((sum, field) => sum + field.hectares, 0));
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Field map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		<MapGeoJSON
			id="plot-parcels"
			data={PARCELS}
			fillOpacity={0.04}
			hoverFillOpacity={0.12}
			lineWidth={1}
			onhover={(feature) => (hoveredParcel = feature ? String(feature.properties.name) : null)}
		/>
		<MapControlContainer position="top-left">
			<MapDrawControl
				orientation="horizontal"
				modes={FIELD_MODES}
				bind:mode={tool}
				onchange={(features) => (drawings = features)}
			/>
		</MapControlContainer>
		<MapControlContainer position="top-right">
			<MapZoomControl />
		</MapControlContainer>
		<MapControlContainer position="bottom-left">
			<MapScaleControl />
		</MapControlContainer>
	</Map>

	<Card.Root class="min-h-0 gap-4 overflow-y-auto">
		<Card.Header>
			<Card.Title>Fields</Card.Title>
			<Card.Description aria-live="polite">
				{hoveredParcel ?? `${totalHectares.toFixed(1)} ha mapped`}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if totals.length > 0}
				<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" data-testid="crop-totals">
					{#each totals as total (total.crop)}
						<dt class="text-muted-foreground">{total.crop}</dt>
						<dd class="text-right tabular-nums">{total.hectares.toFixed(1)} ha</dd>
					{/each}
				</dl>
			{/if}
			{#each fields as field (field.key)}
				<div class="flex flex-col gap-2 rounded-md border p-3" data-testid="field">
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">{field.label}</span>
						<span class="text-muted-foreground tabular-nums">{field.hectares.toFixed(2)} ha</span>
					</div>
					<p class="text-xs text-muted-foreground">{field.parcel ?? 'Outside the registry'}</p>
					<NativeSelect.Root
						class="w-full"
						size="sm"
						aria-label="Crop of {field.label}"
						value={field.crop}
						onchange={(event) => (crops[field.key] = event.currentTarget.value as Crop)}
					>
						{#each CROPS as crop (crop)}
							<NativeSelect.Option value={crop}>{crop}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground"
				>
					<SproutIcon class="size-5" />
					<p>Trace a field with the polygon, rectangle or freehand tool.</p>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
