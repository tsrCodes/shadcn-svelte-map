<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { Badge } from '#lib/registry/ui/badge/index.js';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Tabs from '#lib/registry/ui/tabs/index.js';
	import CodeBlockCommand from '#lib/docs/components/code-block-command.svelte';
	import CopyButton from '#lib/docs/components/copy-button.svelte';
	import CopyPromptButton from '#lib/docs/components/copy-prompt-button.svelte';
	import Seo from '#lib/docs/components/seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const Block = $derived(data.component);
	const KIND_LABEL = { editing: 'Editing', data: 'Data' } as const;
</script>

<Seo
	title={data.block.title}
	description={data.block.description}
	pathname={`/blocks/${data.block.name}`}
/>

<div class="container-wrapper flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-2">
			<Button
				href={resolve('/blocks')}
				variant="ghost"
				size="sm"
				class="-ml-2 w-fit text-muted-foreground"
			>
				<ArrowLeftIcon />
				All blocks
			</Button>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight">{data.block.title}</h1>
				<Badge variant="secondary">{KIND_LABEL[data.block.kind]}</Badge>
			</div>
			<p class="max-w-2xl text-muted-foreground">{data.block.description}</p>
		</div>
		<CopyPromptButton prompt={data.prompt} />
	</div>

	<section
		class="h-[min(720px,80svh)] overflow-hidden rounded-xl border"
		aria-label={`${data.block.title} preview`}
	>
		<Block class="h-full" />
	</section>

	<section class="flex max-w-4xl flex-col gap-3" aria-labelledby="install-heading">
		<h2 id="install-heading" class="text-lg font-medium">Install</h2>
		<p class="text-sm text-muted-foreground">
			Adds the block to <code>src/lib/components/{data.block.name}</code> and the map if you do not have
			it yet.
		</p>
		<CodeBlockCommand command={data.install} />
	</section>

	<section class="flex max-w-4xl flex-col gap-3" aria-labelledby="code-heading">
		<h2 id="code-heading" class="text-lg font-medium">Code</h2>
		<Tabs.Root value={data.files[0].path}>
			<Tabs.List>
				{#each data.files as file (file.path)}
					<Tabs.Trigger value={file.path} class="font-mono text-xs">{file.path}</Tabs.Trigger>
				{/each}
			</Tabs.List>
			{#each data.files as file (file.path)}
				<Tabs.Content value={file.path}>
					<figure data-rehype-pretty-code-figure class="mt-2! [&>pre]:max-h-[32rem]">
						<CopyButton value={file.code} />
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki output, built from our own sources -->
						{@html file.html}
					</figure>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	</section>
</div>
