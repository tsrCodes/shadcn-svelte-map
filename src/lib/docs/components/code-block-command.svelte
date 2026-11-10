<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Tabs from '#lib/registry/ui/tabs/index.js';
	import * as Tooltip from '#lib/registry/ui/tooltip/index.js';
	import { Clipboard } from '../clipboard.svelte.js';
	import {
		commandFor,
		packageManager,
		PACKAGE_MANAGERS,
		type PackageManager
	} from '../package-manager.svelte.js';

	/** An `npx …` command; the tabs show it for each package manager. */
	let { command }: { command: string } = $props();

	const clipboard = new Clipboard();

	// Drop a pending icon reset when the button goes away.
	$effect(() => () => {
		clipboard.dispose();
	});
</script>

<figure data-rehype-pretty-code-figure>
	<div class="overflow-x-auto">
		<Tabs.Root
			bind:value={
				() => packageManager.current, (value) => (packageManager.current = value as PackageManager)
			}
			class="gap-0"
		>
			<div class="flex items-center gap-2 border-b border-border/50 px-3 py-1">
				<div class="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
					<TerminalIcon class="size-3 text-code" />
				</div>
				<Tabs.List class="rounded-none bg-transparent p-0">
					{#each PACKAGE_MANAGERS as manager (manager)}
						<Tabs.Trigger
							value={manager}
							class="h-7 border border-transparent pt-0.5 data-active:border-input data-active:bg-accent data-active:shadow-none dark:data-active:border-input dark:data-active:bg-accent"
						>
							{manager}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>
			<div class="no-scrollbar overflow-x-auto">
				{#each PACKAGE_MANAGERS as manager (manager)}
					<Tabs.Content value={manager} class="mt-0 px-4 py-3.5">
						<pre><code class="relative font-mono text-sm leading-none" data-language="bash"
								>{commandFor(command, manager)}</code
							></pre>
					</Tabs.Content>
				{/each}
			</div>
		</Tabs.Root>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						data-slot="copy-button"
						size="icon"
						variant="ghost"
						class="absolute top-2 right-2 z-10 size-7 opacity-70 hover:opacity-100 focus-visible:opacity-100"
						onclick={() => clipboard.copy(commandFor(command, packageManager.current))}
					>
						<span class="sr-only">Copy</span>
						{#if clipboard.copied}<CheckIcon />{:else}<ClipboardIcon />{/if}
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>{clipboard.copied ? 'Copied' : 'Copy to Clipboard'}</Tooltip.Content>
		</Tooltip.Root>
	</div>
</figure>
