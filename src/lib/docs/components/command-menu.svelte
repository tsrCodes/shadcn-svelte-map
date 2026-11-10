<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import { onMount } from 'svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Command from '#lib/registry/ui/command/index.js';
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import type { DocLink, DocsNavSection } from '../config.js';
	import { scoreSearchItem } from '../search-filter.js';
	import Kbd from './kbd.svelte';

	let {
		sections,
		blocks,
		navItems
	}: {
		sections: DocsNavSection[];
		blocks: DocLink[];
		navItems: { href: string; label: string }[];
	} = $props();

	let open = $state(false);
	let isMac = $state(true);

	onMount(() => {
		isMac = navigator.platform.toUpperCase().includes('MAC');
	});

	function isTyping(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement)
		);
	}

	function onkeydown(event: KeyboardEvent) {
		if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || event.key === '/') {
			if (isTyping(event.target)) return;
			event.preventDefault();
			open = !open;
		}
	}

	function go(url: string) {
		open = false;
		void goto(resolve(url as Path));
	}
</script>

<svelte:document {onkeydown} />

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="secondary"
				class="relative h-8 w-full justify-start bg-surface pl-2.5 font-normal text-surface-foreground/60 shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64 dark:bg-card"
			>
				<span class="hidden lg:inline-flex">Search documentation...</span>
				<span class="inline-flex lg:hidden">Search...</span>
				<div class="absolute top-1.5 right-1.5 hidden gap-1 sm:flex">
					<Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
					<Kbd class="aspect-square">K</Kbd>
				</div>
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content
		showCloseButton={false}
		class="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>Search documentation...</Dialog.Title>
			<Dialog.Description>Search for a command to run...</Dialog.Description>
		</Dialog.Header>
		<Command.Root
			filter={scoreSearchItem}
			class="rounded-none bg-transparent **:data-[slot=command-input]:h-9! **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:h-9! **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input **:data-[slot=command-input-wrapper]:bg-input/50"
		>
			<Command.Input placeholder="Search documentation..." />
			<Command.List class="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
				<Command.Empty class="py-12 text-center text-sm text-muted-foreground">
					No results found.
				</Command.Empty>
				<Command.Group
					heading="Pages"
					class="p-0! **:[[data-command-group-heading]]:p-3! **:[[data-command-group-heading]]:pb-1!"
				>
					{#each navItems as item (item.href)}
						<Command.Item
							value={`Navigation ${item.label}`}
							keywords={['nav', 'navigation', item.label.toLowerCase()]}
							onSelect={() => go(item.href)}
						>
							<ArrowRightIcon />
							{item.label}
						</Command.Item>
					{/each}
				</Command.Group>
				{#each sections as section (section.title)}
					<Command.Group
						heading={section.title}
						class="p-0! **:[[data-command-group-heading]]:p-3! **:[[data-command-group-heading]]:pb-1!"
					>
						{#each section.pages as item (item.url)}
							<Command.Item
								value={`${section.title} ${item.title}`}
								keywords={item.keywords}
								onSelect={() => go(item.url)}
							>
								<ArrowRightIcon />
								{item.title}
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
				<Command.Group
					heading="Blocks"
					class="p-0! **:[[data-command-group-heading]]:p-3! **:[[data-command-group-heading]]:pb-1!"
				>
					{#each blocks as item (item.url)}
						<Command.Item
							value={`Blocks ${item.title}`}
							keywords={['block', 'example']}
							onSelect={() => go(item.url)}
						>
							<ArrowRightIcon />
							{item.title}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
		<div
			class="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium text-muted-foreground dark:border-t-neutral-700 dark:bg-neutral-800"
		>
			<div class="flex items-center gap-2">
				<Kbd><CornerDownLeftIcon /></Kbd>
				Go to Page
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
