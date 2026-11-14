<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '#lib/utils.js';
	import * as Tabs from '#lib/registry/ui/tabs/index.js';
	import { loadExample } from '../examples.js';
	import CopyButton from './copy-button.svelte';

	let {
		name,
		align = 'center',
		hideCode = false,
		description,
		class: className
	}: {
		/** File name of the example in `src/lib/docs/examples`. */
		name: string;
		/** Accessible label of the live preview. */
		description?: string;
		align?: 'center' | 'start' | 'end';
		hideCode?: boolean;
		class?: string;
	} = $props();

	let tab = $state('preview');
	const example = $derived(loadExample(name));
	const source = $derived(page.data.previews?.[name]);
</script>

{#if !example}
	<p class="text-sm text-muted-foreground">
		Component
		<code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">{name}</code>
		has no example file.
	</p>
{:else}
	<div class={cn('group relative mt-4 mb-12 flex flex-col gap-2', className)}>
		<Tabs.Root bind:value={tab} class="relative mr-auto w-full">
			<div class="flex items-center justify-between">
				{#if !hideCode}
					<Tabs.List class="justify-start gap-4 rounded-none bg-transparent px-2 md:px-0">
						{#each [{ value: 'preview', label: 'Preview' }, { value: 'code', label: 'Code' }] as item (item.value)}
							<Tabs.Trigger
								value={item.value}
								class="px-0 text-base text-muted-foreground data-active:text-foreground data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent"
							>
								{item.label}
							</Tabs.Trigger>
						{/each}
					</Tabs.List>
				{/if}
			</div>
		</Tabs.Root>
		<div data-tab={tab} class="relative rounded-lg border data-[tab=code]:border-code md:-mx-1">
			<div
				role="region"
				aria-label={description ?? `${name} example`}
				data-slot="preview"
				data-active={tab === 'preview'}
				class="invisible data-[active=true]:visible"
			>
				<div
					data-align={align}
					class="preview flex h-[450px] w-full justify-center overflow-hidden rounded-lg data-[align=center]:items-center data-[align=end]:items-end data-[align=start]:items-start"
				>
					{#await example then { default: Example }}
						<Example />
					{:catch}
						<p class="text-sm text-muted-foreground">
							The example failed to load. Reload the page.
						</p>
					{/await}
				</div>
			</div>
			<div
				data-slot="code"
				data-active={tab === 'code'}
				class="absolute inset-0 hidden overflow-hidden data-[active=true]:block **:[figure]:m-0! **:[pre]:h-[450px]"
			>
				{#if source}
					<figure data-rehype-pretty-code-figure class="[&>pre]:max-h-96">
						<CopyButton value={source.code} />
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki output, built from our own sources -->
						{@html source.html}
					</figure>
				{:else}
					<p class="p-4 text-sm text-muted-foreground">
						The code for this example is not available.
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
