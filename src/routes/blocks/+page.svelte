<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import Seo from '#lib/docs/components/seo.svelte';
	import { BLOCKS, type BlockKind } from './catalog.js';

	const GROUPS: { kind: BlockKind; title: string; description: string }[] = [
		{
			kind: 'editing',
			title: 'Editing',
			description: 'People draw, search and move things on the map.'
		},
		{ kind: 'data', title: 'Data', description: 'Live and aggregated data on the map.' }
	];

	/** Screenshots of each block, made by `pnpm thumbnails`. */
	function thumbnail(name: string, mode: 'light' | 'dark'): string {
		return `/thumbnails/${name}-${mode}.jpg`;
	}
</script>

<Seo
	title="Blocks"
	description="Page-sized map examples you can install and adapt: store locator, geofence editor, fleet tracker and more."
	pathname="/blocks"
/>

<div class="container-wrapper flex flex-col gap-10 px-4 py-8 lg:px-8">
	<header class="flex max-w-2xl flex-col gap-2">
		<h1 class="text-3xl font-semibold tracking-tight">Blocks</h1>
		<p class="text-muted-foreground">
			Complete map screens built only from the registry components. Open one to try it, then install
			it with one command and make it yours.
		</p>
	</header>

	{#each GROUPS as group (group.kind)}
		{@const blocks = BLOCKS.filter((block) => block.kind === group.kind)}
		<section class="flex flex-col gap-4" aria-labelledby="group-{group.kind}">
			<div>
				<h2 id="group-{group.kind}" class="text-lg font-medium">{group.title}</h2>
				<p class="text-sm text-muted-foreground">{group.description}</p>
			</div>
			<ul class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
				{#each blocks as block (block.name)}
					<li>
						<a
							href={resolve('/blocks/[name]', { name: block.name })}
							class="group flex h-full flex-col overflow-hidden rounded-xl border transition-colors hover:border-foreground/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
						>
							<div class="aspect-[16/10] overflow-hidden border-b bg-muted">
								<img
									src={thumbnail(block.name, 'light')}
									alt=""
									width="800"
									height="500"
									loading="lazy"
									class="size-full object-cover transition-transform group-hover:scale-[1.02] motion-reduce:transition-none dark:hidden"
								/>
								<img
									src={thumbnail(block.name, 'dark')}
									alt=""
									width="800"
									height="500"
									loading="lazy"
									class="hidden size-full object-cover transition-transform group-hover:scale-[1.02] motion-reduce:transition-none dark:block"
								/>
							</div>
							<div class="flex flex-1 flex-col gap-1 p-4">
								<span class="flex items-center justify-between gap-2 font-medium">
									{block.title}
									<Badge variant="secondary">{group.title}</Badge>
								</span>
								<span class="text-sm text-muted-foreground">{block.description}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
