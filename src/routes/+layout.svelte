<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- The initial mode script is served from /theme-init.js (see app.html) to keep the CSP strict. -->
<ModeWatcher disableHeadScriptInjection disableTransitions={false} />

{@render children()}
