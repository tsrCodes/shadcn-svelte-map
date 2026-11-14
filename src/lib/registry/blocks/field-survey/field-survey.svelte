<script lang="ts">
	import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { cn } from '#lib/utils.js';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Card from '#lib/registry/ui/card/index.js';
	import { Input } from '#lib/registry/ui/input/index.js';
	import * as NativeSelect from '#lib/registry/ui/native-select/index.js';
	import {
		Map,
		MapControlContainer,
		MapPolygon,
		MapScaleControl,
		MapZoomControl,
		lineLength,
		pointInPolygon,
		type LngLatTuple,
		type MapStyle
	} from '#lib/registry/ui/map/index.js';
	import {
		MapDrawControl,
		type DrawFeature,
		type DrawTool
	} from '#lib/registry/ui/map-draw/index.js';
	import { CATEGORIES, SURVEY_AREA, VIEWPORT, type Category } from './data.js';

	interface Props {
		/** Basemap. Defaults to OpenFreeMap. */
		mapStyle?: MapStyle;
		class?: string;
	}

	let { mapStyle, class: className }: Props = $props();

	interface Observation {
		key: string;
		label: string;
		category: Category;
		note: string;
		insideArea: boolean;
		feature: Feature<Point>;
	}

	interface Transect {
		key: string;
		label: string;
		metres: number;
		feature: Feature<LineString>;
	}

	type CopyStatus = 'idle' | 'copied' | 'failed';

	const SURVEY_MODES = ['point', 'polyline'] as const;
	const DEFAULT_CATEGORY: Category = 'Tree';
	const JSON_INDENT = 2;

	let tool = $state<DrawTool>('none');
	let drawings = $state.raw<DrawFeature[]>([]);
	// Kept by drawing id and never pruned, so undoing a delete brings the details back.
	let categories = $state.raw<Record<string, Category>>({});
	let notes = $state.raw<Record<string, string>>({});
	let copyStatus = $state<CopyStatus>('idle');

	const area = [SURVEY_AREA];

	const observations: Observation[] = $derived(
		drawings
			.filter((feature) => feature.geometry.type === 'Point')
			.map((feature, index) => {
				const key = String(feature.id);
				const point = feature.geometry as Point;
				return {
					key,
					label: `Observation ${index + 1}`,
					category: categories[key] ?? DEFAULT_CATEGORY,
					note: notes[key] ?? '',
					insideArea: pointInPolygon(point.coordinates as LngLatTuple, area),
					feature: { type: 'Feature', id: feature.id, geometry: point, properties: {} }
				};
			})
	);

	const transects: Transect[] = $derived(
		drawings
			.filter((feature) => feature.geometry.type === 'LineString')
			.map((feature, index) => {
				const line = feature.geometry as LineString;
				return {
					key: String(feature.id),
					label: `Transect ${index + 1}`,
					metres: lineLength(line.coordinates as LngLatTuple[]),
					feature: { type: 'Feature', id: feature.id, geometry: line, properties: {} }
				};
			})
	);

	function exportSurvey(): FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: [
				...observations.map((item) => ({
					...item.feature,
					properties: { kind: 'observation', category: item.category, note: item.note }
				})),
				...transects.map((item) => ({
					...item.feature,
					properties: { kind: 'transect', metres: Math.round(item.metres) }
				}))
			]
		};
	}

	async function copySurvey() {
		try {
			await navigator.clipboard.writeText(JSON.stringify(exportSurvey(), null, JSON_INDENT));
			copyStatus = 'copied';
		} catch (error) {
			console.error(error);
			copyStatus = 'failed';
		}
	}

	const copyLabel = $derived(
		copyStatus === 'copied'
			? 'Copied'
			: copyStatus === 'failed'
				? 'Copy failed, try again'
				: 'Copy GeoJSON'
	);
</script>

<div class={cn('grid min-h-[560px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]', className)}>
	<Map
		class="min-h-[360px] rounded-lg border"
		aria-label="Survey map"
		{mapStyle}
		viewport={VIEWPORT}
	>
		<MapPolygon
			id="field-survey-area"
			positions={SURVEY_AREA}
			fillOpacity={0.05}
			dashArray={[2, 2]}
		/>
		<MapControlContainer position="top-left">
			<MapDrawControl
				orientation="horizontal"
				modes={SURVEY_MODES}
				bind:mode={tool}
				onchange={(features) => {
					drawings = features;
					copyStatus = 'idle';
				}}
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
			<Card.Title>Survey</Card.Title>
			<Card.Description>
				{observations.length} observations · {transects.length} transects
			</Card.Description>
			<Card.Action>
				<Button
					variant="outline"
					size="sm"
					disabled={drawings.length === 0}
					onclick={copySurvey}
					aria-live="polite"
				>
					<ClipboardIcon />
					{copyLabel}
				</Button>
			</Card.Action>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#each observations as item (item.key)}
				<div class="flex flex-col gap-2 rounded-md border p-3" data-testid="observation">
					<div class="flex items-center justify-between gap-2 text-sm">
						<span class="font-medium">{item.label}</span>
						{#if !item.insideArea}
							<Badge variant="outline">Outside area</Badge>
						{/if}
					</div>
					<NativeSelect.Root
						class="w-full"
						size="sm"
						aria-label="Category of {item.label}"
						value={item.category}
						onchange={(event) =>
							(categories = { ...categories, [item.key]: event.currentTarget.value as Category })}
					>
						{#each CATEGORIES as category (category)}
							<NativeSelect.Option value={category}>{category}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
					<Input
						class="h-8"
						value={item.note}
						placeholder="Note"
						aria-label="Note for {item.label}"
						oninput={(event) => (notes = { ...notes, [item.key]: event.currentTarget.value })}
					/>
				</div>
			{/each}
			{#each transects as item (item.key)}
				<div
					class="flex items-center justify-between rounded-md border p-3 text-sm"
					data-testid="transect"
				>
					<span class="font-medium">{item.label}</span>
					<span class="text-muted-foreground tabular-nums">{Math.round(item.metres)} m</span>
				</div>
			{/each}
			{#if drawings.length === 0}
				<div
					class="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground"
				>
					<MapPinIcon class="size-5" />
					<p>Drop a point for each observation, or walk a transect with the line tool.</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
