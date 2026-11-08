<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ThemeToggle from '../theme-toggle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Block = $derived(data.component);
</script>

<svelte:head>
	<title>{data.block.title} · Map blocks</title>
	<meta name="description" content={data.block.description} />
</svelte:head>

<div class="flex h-dvh flex-col">
	<header class="flex items-center justify-between gap-4 border-b px-4 py-2">
		<div class="flex min-w-0 items-center gap-3">
			<a
				href={resolve('/blocks')}
				class="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-accent"
				aria-label="All blocks"
			>
				<ArrowLeftIcon class="size-4" />
			</a>
			<div class="min-w-0">
				<h1 class="truncate text-sm font-semibold">{data.block.title}</h1>
				<p class="truncate text-xs text-muted-foreground">{data.block.description}</p>
			</div>
		</div>
		<ThemeToggle />
	</header>
	<main class="min-h-0 flex-1">
		<Block class="h-full" />
	</main>
</div>
