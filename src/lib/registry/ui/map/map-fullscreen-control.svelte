<script lang="ts" module>
	/** `native` uses the Fullscreen API; `fallback` pins the map over the page with CSS. */
	export type FullscreenMode = 'off' | 'native' | 'fallback';

	/** How long to wait for the Fullscreen API before using the CSS fallback. */
	const API_TIMEOUT_MS = 1000;

	/** Maps in the CSS fallback right now; page scroll stays locked while any is. */
	let fallbackMaps = 0;

	function lockPageScroll(): () => void {
		const page = document.documentElement;
		fallbackMaps += 1;
		page.dataset.mapFullscreen = '';
		return () => {
			fallbackMaps -= 1;
			if (fallbackMaps === 0) delete page.dataset.mapFullscreen;
		};
	}
</script>

<script lang="ts">
	import MaximizeIcon from '@lucide/svelte/icons/maximize';
	import MinimizeIcon from '@lucide/svelte/icons/minimize';
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { cn } from '#lib/utils.js';
	import { CONTROL_BUTTON_CLASS } from './map-control-container.svelte';
	import { getMapContext } from './map-context.svelte.js';

	interface Props extends Omit<
		ButtonProps,
		'href' | 'variant' | 'size' | 'children' | 'style' | 'onchange' | 'onclick'
	> {
		/** Called with `true` on entering fullscreen and `false` on leaving it. */
		onchange?: (fullscreen: boolean) => void;
	}

	let { class: className, onchange, ...restProps }: Props = $props();

	const ctx = getMapContext();

	let mode = $state<FullscreenMode>('off');
	const active = $derived(mode !== 'off');

	function setMode(next: FullscreenMode) {
		if (next === mode) return;
		const changed = (next === 'off') !== (mode === 'off');
		mode = next;
		if (changed) onchange?.(next !== 'off');
	}

	/** iPhone Safari has no Fullscreen API for elements, so it gets the CSS fallback. */
	function canUseApi(root: HTMLElement): boolean {
		return document.fullscreenEnabled && typeof root.requestFullscreen === 'function';
	}

	async function enter(root: HTMLElement) {
		if (!canUseApi(root)) return setMode('fallback');
		// Some in-app browsers never settle the request; fall back instead of doing nothing.
		const timer = setTimeout(() => {
			if (mode === 'off') setMode('fallback');
		}, API_TIMEOUT_MS);
		try {
			await root.requestFullscreen();
		} catch {
			// The browser refused, for example inside an iframe without `allowfullscreen`.
			setMode('fallback');
		} finally {
			clearTimeout(timer);
		}
	}

	async function exit() {
		if (mode === 'fallback') return setMode('off');
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
		} catch {
			// Already left, for example with the Escape key; `fullscreenchange` syncs the state.
			syncWithDocument();
		}
	}

	function toggle() {
		const root = ctx.root;
		if (!root) return;
		void (active ? exit() : enter(root));
	}

	function syncWithDocument() {
		const root = ctx.root;
		if (root && document.fullscreenElement === root) setMode('native');
		else if (mode === 'native') setMode('off');
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && mode === 'fallback') setMode('off');
	}

	// The CSS fallback is a data attribute on the map; page scroll is locked meanwhile.
	$effect(() => {
		const root = ctx.root;
		if (!root || mode !== 'fallback') return;
		root.dataset.fullscreen = 'fallback';
		const unlockPageScroll = lockPageScroll();
		return () => {
			delete root.dataset.fullscreen;
			unlockPageScroll();
		};
	});

	// Leave real fullscreen if the control goes away while the map fills the screen.
	$effect(() => {
		const root = ctx.root;
		return () => {
			if (root && document.fullscreenElement === root) void document.exitFullscreen();
		};
	});
</script>

<svelte:document onfullscreenchange={syncWithDocument} />
<svelte:window {onkeydown} />

<Button
	{...restProps}
	variant="outline"
	size="icon-sm"
	class={cn(CONTROL_BUTTON_CLASS, className)}
	aria-label={active ? 'Exit fullscreen' : 'Enter fullscreen'}
	data-slot="map-fullscreen-control"
	data-mode={mode}
	onclick={toggle}
>
	{#if active}
		<MinimizeIcon data-icon="minimize" />
	{:else}
		<MaximizeIcon data-icon="maximize" />
	{/if}
</Button>
