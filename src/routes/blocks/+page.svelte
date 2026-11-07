<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import { BLOCKS, type BlockKind } from './catalog.js';
	import ThemeToggle from './theme-toggle.svelte';

	const GROUPS: { kind: BlockKind; title: string }[] = [
		{ kind: 'editing', title: 'Editing' },
		{ kind: 'data', title: 'Data' }
	];
</script>

<svelte:head>
	<title>Map blocks</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-8 p-4 sm:p-8">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold">Blocks</h1>
			<p class="text-sm text-muted-foreground">
				Page-sized maps built from the registry components. Open one to try it.
			</p>
		</div>
		<ThemeToggle />
	</header>

	{#each GROUPS as group (group.kind)}
		{@const blocks = BLOCKS.filter((block) => block.kind === group.kind)}
		<section class="flex flex-col gap-3" aria-labelledby="group-{group.kind}">
			<h2 id="group-{group.kind}" class="text-sm font-medium text-muted-foreground">
				{group.title}
			</h2>
			{#if blocks.length === 0}
				<p class="text-sm text-muted-foreground">None yet.</p>
			{:else}
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each blocks as block (block.name)}
						<li>
							<a
								href={resolve('/blocks/[name]', { name: block.name })}
								class="flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
							>
								<span class="flex items-center justify-between gap-2 font-medium">
									{block.title}
									<Badge variant="secondary">{group.title}</Badge>
								</span>
								<span class="text-sm text-muted-foreground">{block.description}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}

	<footer class="border-t pt-4 text-sm text-muted-foreground">
		Handcrafted by <a class="underline underline-offset-4" href="https://github.com/tsrCodes"
			>Oggy</a
		>
	</footer>
</main>
