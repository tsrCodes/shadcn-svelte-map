<script lang="ts">
	import { page } from '$app/state';
	import DocsSidebar from '#lib/docs/components/docs-sidebar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="container-wrapper flex flex-1 flex-col px-2">
	<div
		class="flex min-h-min w-full flex-1 items-start px-0 [--sidebar-width:220px] [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--sidebar-width:240px] lg:[--top-spacing:calc(var(--spacing)*4)]"
	>
		<DocsSidebar sections={page.data.sections} />
		<div class="h-full w-full">{@render children()}</div>
	</div>
</div>
