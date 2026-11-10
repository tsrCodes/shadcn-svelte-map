<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import { cn } from '#lib/utils.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Tooltip from '#lib/registry/ui/tooltip/index.js';
	import { Clipboard } from '../clipboard.svelte.js';

	let { value, class: className }: { value: string; class?: string } = $props();

	const clipboard = new Clipboard();

	// Drop a pending icon reset when the button goes away.
	$effect(() => () => {
		clipboard.dispose();
	});
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				data-slot="copy-button"
				size="icon"
				variant="ghost"
				class={cn(
					'absolute top-3 right-2 z-10 size-7 bg-code hover:opacity-100 focus-visible:opacity-100',
					className
				)}
				onclick={() => clipboard.copy(value)}
			>
				<span class="sr-only">Copy</span>
				{#if clipboard.copied}<CheckIcon />{:else}<ClipboardIcon />{/if}
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>{clipboard.copied ? 'Copied' : 'Copy to Clipboard'}</Tooltip.Content>
</Tooltip.Root>
