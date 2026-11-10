<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Clipboard } from '../clipboard.svelte.js';

	/** The prompt to copy, ready to paste into an AI assistant. */
	let { prompt }: { prompt: string } = $props();

	const clipboard = new Clipboard();

	// Drop a pending icon reset when the button goes away.
	$effect(() => () => {
		clipboard.dispose();
	});
</script>

<Button variant="secondary" size="sm" class="shadow-none" onclick={() => clipboard.copy(prompt)}>
	{#if clipboard.copied}<CheckIcon />{:else}<SparklesIcon />{/if}
	{clipboard.copied ? 'Copied prompt' : 'Copy for AI'}
</Button>
