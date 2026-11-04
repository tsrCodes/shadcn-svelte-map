<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Map, type MapViewport } from '#lib/registry/ui/map/index.js';

	let viewport = $state<MapViewport>({ center: [13.4, 52.52], zoom: 10, bearing: 0, pitch: 0 });
	let lastError = $state<string | null>(null);

	const readout = $derived(
		`${viewport.center[1].toFixed(4)}, ${viewport.center[0].toFixed(4)} · zoom ${viewport.zoom.toFixed(2)}`
	);
</script>

<svelte:head>
	<title>Map demo</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-8">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold">Map</h1>
			<p class="text-sm text-muted-foreground" data-testid="readout">{readout}</p>
		</div>
		<Button variant="outline" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			<SunIcon class="dark:hidden" />
			<MoonIcon class="hidden dark:block" />
		</Button>
	</header>

	<Map
		class="h-[480px] w-full rounded-lg border"
		aria-label="Map of Berlin"
		bind:viewport
		onerror={(error) => (lastError = error.message)}
	/>

	{#if lastError}
		<p class="text-sm text-destructive" role="alert">{lastError}</p>
	{/if}
</main>
