<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Popover from '#lib/registry/ui/popover/index.js';
	import type { DocsNavSection } from '../config.js';

	let {
		sections,
		navItems,
		class: className
	}: {
		sections: DocsNavSection[];
		navItems: { href: string; label: string }[];
		class?: string;
	} = $props();

	let open = $state(false);
</script>

{#snippet link(href: string, label: string)}
	<a href={resolve(href as Path)} class="text-2xl font-medium" onclick={() => (open = false)}
		>{label}</a
	>
{/snippet}

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				class={cn(
					'extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 p-0! hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent',
					className
				)}
			>
				<div class="relative flex h-8 w-4 items-center justify-center">
					<div class="relative size-4">
						<span
							class={cn(
								'absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100',
								open ? 'top-[0.4rem] -rotate-45' : 'top-1'
							)}
						></span>
						<span
							class={cn(
								'absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100',
								open ? 'top-[0.4rem] rotate-45' : 'top-2.5'
							)}
						></span>
					</div>
					<span class="sr-only">Toggle Menu</span>
				</div>
				<span class="flex h-8 items-center text-lg leading-none font-medium">Menu</span>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		class="z-1002 no-scrollbar h-(--bits-popover-content-available-height) w-(--bits-popover-content-available-width) overflow-y-auto rounded-none border-none bg-background/90 p-0 shadow-none backdrop-blur duration-100"
		align="start"
		side="bottom"
		alignOffset={-16}
		sideOffset={14}
	>
		<div class="flex flex-col gap-12 overflow-auto px-6 py-6">
			<div class="flex flex-col gap-4">
				<div class="text-sm font-medium text-muted-foreground">Menu</div>
				<div class="flex flex-col gap-3">
					{@render link('/', 'Home')}
					{#each navItems as item (item.href)}
						{@render link(item.href, item.label)}
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-8">
				{#each sections as section (section.title)}
					<div class="flex flex-col gap-4">
						<div class="text-sm font-medium text-muted-foreground">{section.title}</div>
						<div class="flex flex-col gap-3">
							{#each section.pages as item (item.url)}
								{@render link(item.url, item.title)}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
