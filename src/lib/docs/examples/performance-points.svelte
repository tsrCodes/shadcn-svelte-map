<script lang="ts">
	import type { FeatureCollection, Point } from 'geojson';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Map, MapPointLayer } from '#lib/registry/ui/map/index.js';

	type Stop = FeatureCollection<Point, { id: number }>;

	const COUNTS = [1_000, 10_000, 100_000] as const;
	const PAN_MS = 3000;
	const PAN_PIXELS = 600;
	// Points gather around a few city centres, like real data does.
	const CENTRES: [number, number][] = [
		[2.35, 48.86],
		[13.4, 52.52],
		[-3.7, 40.42],
		[12.5, 41.9],
		[4.9, 52.37],
		[16.37, 48.21]
	];

	/** Deterministic points, so every run measures the same data. */
	function points(count: number): Stop {
		let seed = 42;
		const random = () => {
			seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
			return seed / 4_294_967_296;
		};
		const features = Array.from({ length: count }, (_, id) => {
			const [lng, lat] = CENTRES[id % CENTRES.length];
			const spread = 2.5 * Math.sqrt(-2 * Math.log(random() || 1e-9));
			const angle = 2 * Math.PI * random();
			return {
				type: 'Feature' as const,
				properties: { id },
				geometry: {
					type: 'Point' as const,
					coordinates: [lng + spread * Math.cos(angle), lat + spread * 0.6 * Math.sin(angle)]
				}
			};
		});
		return { type: 'FeatureCollection', features };
	}

	function percentile(sorted: number[], share: number): number {
		return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
	}

	let map = $state.raw<MapLibreMap | null>(null);
	let count = $state<(typeof COUNTS)[number]>(100_000);
	let data = $state.raw<Stop>(points(100_000));
	let loadMs = $state<number | null>(null);
	let frames = $state<{ median: number; p95: number; fps: number } | null>(null);
	let running = $state(false);

	// Never wait forever: a removed map fires no more events.
	const EVENT_TIMEOUT_MS = 20_000;

	/** Resolves on the map event, or after a timeout so the demo never gets stuck. */
	function mapEvent(target: MapLibreMap, event: 'idle' | 'moveend'): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(done, EVENT_TIMEOUT_MS);
			function done() {
				clearTimeout(timer);
				target.off(event, done);
				resolve();
			}
			target.once(event, done);
		});
	}

	function idle(target: MapLibreMap): Promise<void> {
		return mapEvent(target, 'idle');
	}

	async function show(next: (typeof COUNTS)[number]) {
		if (!map || running) return;
		running = true;
		count = next;
		frames = null;
		const start = performance.now();
		data = points(next);
		const target = map;
		try {
			await idle(target);
			if (map === target) loadMs = Math.round(performance.now() - start);
		} finally {
			running = false;
		}
	}

	async function pan() {
		if (!map || running) return;
		running = true;
		const deltas: number[] = [];
		let last = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			deltas.push(now - last);
			last = now;
			frame = requestAnimationFrame(tick);
		});
		const target = map;
		try {
			// Benchmark on purpose: always animate, so frames are measured.
			target.panBy([PAN_PIXELS, 0], { duration: PAN_MS / 2, essential: true });
			await mapEvent(target, 'moveend');
			target.panBy([-PAN_PIXELS, 0], { duration: PAN_MS / 2, essential: true });
			await mapEvent(target, 'moveend');
		} finally {
			cancelAnimationFrame(frame);
			running = false;
		}
		if (map !== target) return;
		const sorted = deltas.slice(1).sort((a, b) => a - b);
		const median = percentile(sorted, 0.5);
		frames = {
			median: Math.round(median * 10) / 10,
			p95: Math.round(percentile(sorted, 0.95) * 10) / 10,
			fps: Math.round(1000 / (median || 1))
		};
	}

	async function onload(loaded: MapLibreMap) {
		map = loaded;
		const start = performance.now();
		await idle(loaded);
		// A newer map may have loaded meanwhile; its numbers win.
		if (map === loaded) loadMs = Math.round(performance.now() - start);
	}
</script>

<div class="relative size-full">
	<Map class="size-full" viewport={{ center: [8, 47.5], zoom: 3.6, bearing: 0, pitch: 0 }} {onload}>
		<MapPointLayer {data} radius={2} strokeWidth={0} />
	</Map>
	<div
		class="absolute top-2 left-2 flex w-56 flex-col gap-2 rounded-md border bg-background/95 p-3 text-xs shadow-sm"
		data-testid="perf-panel"
	>
		<div class="flex gap-1" role="group" aria-label="Number of points">
			{#each COUNTS as option (option)}
				<Button
					size="sm"
					variant={count === option ? 'default' : 'outline'}
					class="h-7 flex-1 px-2 text-xs"
					disabled={running || !map}
					aria-pressed={count === option}
					onclick={() => show(option)}
				>
					{option.toLocaleString('en')}
				</Button>
			{/each}
		</div>
		<Button size="sm" class="h-7 text-xs" disabled={running || !map} onclick={pan}>
			{running ? 'Measuring…' : 'Measure panning'}
		</Button>
		<dl class="grid grid-cols-2 gap-x-2 gap-y-1 tabular-nums" aria-live="polite">
			<dt class="text-muted-foreground">Points</dt>
			<dd data-testid="perf-count">{data.features.length.toLocaleString('en')}</dd>
			<dt class="text-muted-foreground">Load</dt>
			<dd data-testid="perf-load">{loadMs === null ? '…' : `${loadMs} ms`}</dd>
			<dt class="text-muted-foreground">Frame, median</dt>
			<dd data-testid="perf-median">{frames ? `${frames.median} ms` : '–'}</dd>
			<dt class="text-muted-foreground">Frame, p95</dt>
			<dd data-testid="perf-p95">{frames ? `${frames.p95} ms` : '–'}</dd>
		</dl>
	</div>
</div>
