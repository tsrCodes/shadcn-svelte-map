<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Path } from '$app/types';
	import type { DocsNavSection } from '../config.js';

	let { sections }: { sections: DocsNavSection[] } = $props();
</script>

<aside
	class="sticky top-[calc(var(--header-height)+1px)] z-30 hidden h-[calc(100svh-var(--footer-height)+2rem)] w-(--sidebar-width) flex-col bg-transparent lg:flex"
>
	<div
		class="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto overflow-x-hidden px-2 pb-12"
	>
		<div class="h-(--top-spacing) shrink-0"></div>
		{#each sections as section (section.title)}
			<div class="relative flex w-full min-w-0 flex-col p-2">
				<div
					class="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground"
				>
					{section.title}
				</div>
				<ul class="flex w-full min-w-0 flex-col gap-0.5">
					{#each section.pages as item (item.url)}
						<li class="relative">
							<a
								href={resolve(item.url as Path)}
								data-active={item.url === page.url.pathname}
								aria-current={item.url === page.url.pathname ? 'page' : undefined}
								class="relative flex h-[30px] w-fit items-center overflow-visible rounded-md border border-transparent px-2 text-[0.8rem] font-medium outline-hidden after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-accent data-[active=true]:bg-accent"
							>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</aside>
