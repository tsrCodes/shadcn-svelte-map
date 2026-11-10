<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '#lib/assets/favicon.svg';
	import * as Tooltip from '#lib/registry/ui/tooltip/index.js';
	import SiteFooter from '#lib/docs/components/site-footer.svelte';
	import SiteHeader from '#lib/docs/components/site-header.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- The initial mode script is served from /theme-init.js (see app.html) to keep the CSP strict. -->
<ModeWatcher disableHeadScriptInjection disableTransitions={false} />

<Tooltip.Provider>
	<div
		class="group/body relative z-10 flex min-h-svh flex-col overscroll-none bg-background font-sans text-foreground antialiased [--footer-height:calc(var(--spacing)*14)] [--header-height:calc(var(--spacing)*14)] xl:[--footer-height:calc(var(--spacing)*24)]"
	>
		<SiteHeader sections={data.sections} blocks={data.blocks} stars={data.stars} />
		<main class="flex flex-1 flex-col">
			{@render children()}
		</main>
		<SiteFooter />
	</div>
</Tooltip.Provider>
