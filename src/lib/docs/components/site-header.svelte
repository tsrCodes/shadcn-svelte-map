<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Path } from '$app/types';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Separator } from '#lib/registry/ui/separator/index.js';
	import { siteConfig, type DocLink, type DocsNavSection } from '../config.js';
	import CommandMenu from './command-menu.svelte';
	import GithubLink from './github-link.svelte';
	import LogoIcon from './logo-icon.svelte';
	import MobileNav from './mobile-nav.svelte';
	import ModeSwitcher from './mode-switcher.svelte';

	let {
		sections,
		blocks,
		stars
	}: { sections: DocsNavSection[]; blocks: DocLink[]; stars: number | null } = $props();
</script>

<header class="sticky top-0 z-1001 w-full bg-background">
	<div class="container-wrapper px-6">
		<div class="flex h-(--header-height) items-center gap-2 **:data-[slot=separator]:h-4!">
			<MobileNav {sections} navItems={siteConfig.navItems} class="flex lg:hidden" />
			<Button href={resolve('/')} variant="ghost" size="icon" class="hidden size-8 lg:flex">
				<LogoIcon class="size-5" />
				<span class="sr-only">{siteConfig.name}</span>
			</Button>
			<nav class="hidden items-center gap-0.5 lg:flex">
				{#each siteConfig.navItems as item (item.href)}
					<Button
						href={resolve(item.href as Path)}
						variant="ghost"
						size="sm"
						class={cn(
							page.url.pathname.startsWith(item.href) ? 'text-primary' : 'text-muted-foreground'
						)}
					>
						{item.label}
					</Button>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
				<div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
					<CommandMenu {sections} {blocks} navItems={siteConfig.navItems} />
				</div>
				<Separator orientation="vertical" class="ml-2 hidden lg:block" />
				<GithubLink {stars} />
				<Separator orientation="vertical" />
				<ModeSwitcher />
			</div>
		</div>
	</div>
</header>
