<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { INSTALL_COMMAND, siteConfig } from '#lib/docs/config.js';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
	import Seo from '#lib/docs/components/seo.svelte';
	import HeroMap from '#lib/docs/examples/intro-overview.svelte';
	import { BLOCKS } from './blocks/catalog.js';

	const FEATURES = [
		{
			title: 'Markers and popups',
			text: 'Real buttons and dialogs. Tab to a marker, open it with Enter, close with Escape.',
			slug: 'components/marker'
		},
		{
			title: 'Data layers',
			text: 'GeoJSON, routes with progress, arcs, clusters, heatmaps and shapes, in your theme colours.',
			slug: 'components/geojson'
		},
		{
			title: 'Drawing',
			text: 'Points, lines, polygons, rectangles, circles and freehand, with edit, undo and redo.',
			slug: 'drawing'
		},
		{
			title: 'Controls',
			text: 'Zoom, compass, scale, fullscreen, locate, basemap switcher and place search.',
			slug: 'components/zoom-control'
		},
		{
			title: '100,000 points',
			text: 'A canvas point layer that pans at 60 frames per second with a hundred thousand points.',
			slug: 'performance'
		},
		{
			title: 'Strict CSP',
			text: 'No CDN, no inline scripts or styles. The worker is bundled with your app.',
			slug: 'csp'
		}
	] as const;

	const FEATURED = BLOCKS.slice(0, 3);
</script>

<Seo description={siteConfig.description} pathname="/" />

<div class="container-wrapper flex flex-col gap-16 px-4 pt-10 pb-16 lg:px-8">
	<section class="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
		<h1
			class="text-4xl font-semibold tracking-tight text-balance text-primary lg:text-5xl lg:leading-[1.1]"
		>
			{siteConfig.title}
		</h1>
		<p class="max-w-2xl text-base text-balance text-muted-foreground sm:text-lg">
			{siteConfig.description}
		</p>
		<div class="flex items-center gap-2 **:data-[slot=button]:shadow-none">
			<Button href={resolve('/docs/[...slug]', { slug: 'installation' })} size="sm"
				>Get Started</Button
			>
			<Button href={resolve('/blocks')} size="sm" variant="ghost">Browse blocks</Button>
		</div>
		<div class="w-full max-w-xl text-left">
			<CodeBlockCommand command={INSTALL_COMMAND} />
		</div>
	</section>

	<section
		class="mx-auto h-[min(560px,70svh)] w-full max-w-6xl overflow-hidden rounded-xl border"
		aria-label="Live example"
	>
		<HeroMap />
	</section>

	<section
		class="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
		aria-label="Features"
	>
		{#each FEATURES as feature (feature.title)}
			<a
				href={resolve('/docs/[...slug]', { slug: feature.slug })}
				class="flex flex-col gap-1 rounded-xl border p-5 transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
			>
				<span class="font-medium">{feature.title}</span>
				<span class="text-sm text-muted-foreground">{feature.text}</span>
			</a>
		{/each}
	</section>

	<section class="mx-auto flex w-full max-w-6xl flex-col gap-4" aria-labelledby="blocks-heading">
		<div class="flex items-end justify-between gap-4">
			<div>
				<h2 id="blocks-heading" class="text-xl font-semibold tracking-tight">Blocks</h2>
				<p class="text-sm text-muted-foreground">Complete map screens you install and adapt.</p>
			</div>
			<Button href={resolve('/blocks')} variant="ghost" size="sm">
				All {BLOCKS.length} blocks
				<ArrowRightIcon />
			</Button>
		</div>
		<ul class="grid gap-4 sm:grid-cols-3">
			{#each FEATURED as block (block.name)}
				<li>
					<a
						href={resolve('/blocks/[name]', { name: block.name })}
						class="group flex flex-col overflow-hidden rounded-xl border focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
					>
						<img
							src={`/thumbnails/${block.name}-light.jpg`}
							alt=""
							width="800"
							height="500"
							loading="lazy"
							class="aspect-[16/10] object-cover dark:hidden"
						/>
						<img
							src={`/thumbnails/${block.name}-dark.jpg`}
							alt=""
							width="800"
							height="500"
							loading="lazy"
							class="hidden aspect-[16/10] object-cover dark:block"
						/>
						<span class="border-t p-3 text-sm font-medium">{block.title}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
