<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { siteUrl } from '#lib/docs/config.js';
	import DocsCopyPage from '#lib/docs/components/docs-copy-page.svelte';
	import DocsToc from '#lib/docs/components/docs-toc.svelte';
	import Seo from '#lib/docs/components/seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const COPIED_MS = 2000;

	const Content = $derived(data.content);
	const absoluteUrl = $derived(siteUrl(data.url));

	const resetTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

	// Markdown code blocks are static HTML; one listener copies whichever block was clicked
	async function copyCodeBlock(event: MouseEvent) {
		const button = (event.target as Element).closest<HTMLElement>('[data-copy-code]');
		const code = button?.closest('figure')?.querySelector('pre')?.textContent;
		if (!button || !code) return;
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			return;
		}
		button.dataset.copied = '';
		clearTimeout(resetTimers.get(button));
		resetTimers.set(
			button,
			setTimeout(() => delete button.dataset.copied, COPIED_MS)
		);
	}

	function copyCodeBlocks(node: HTMLElement) {
		node.addEventListener('click', copyCodeBlock);
		return () => node.removeEventListener('click', copyCodeBlock);
	}
</script>

<Seo title={data.title} description={data.description} pathname={data.url} type="article" />

<div data-slot="docs" class="flex items-stretch text-[1.05rem] sm:text-[15px] xl:w-full">
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="h-(--top-spacing) shrink-0"></div>
		<div
			class="mx-auto flex w-full max-w-2xl min-w-0 flex-1 flex-col gap-8 px-4 py-6 text-neutral-800 md:px-0 lg:py-8 dark:text-neutral-300"
		>
			<div class="flex flex-col gap-2">
				<div class="flex items-start justify-between">
					<h1 class="scroll-m-20 text-4xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
						{data.title}
					</h1>
					<div
						class="docs-nav fixed inset-x-0 bottom-0 isolate z-1001 flex items-center gap-2 border-t border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm sm:static sm:z-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-1.5 sm:backdrop-blur-none"
					>
						<DocsCopyPage page={data.markdown} url={absoluteUrl} title={data.title} />
						{#if data.neighbours.previous}
							<Button
								href={data.neighbours.previous.url}
								variant="secondary"
								size="icon"
								class="extend-touch-target ml-auto size-8 shadow-none md:size-7"
							>
								<ArrowLeftIcon />
								<span class="sr-only">Previous</span>
							</Button>
						{/if}
						{#if data.neighbours.next}
							<Button
								href={data.neighbours.next.url}
								variant="secondary"
								size="icon"
								class="extend-touch-target size-8 shadow-none md:size-7"
							>
								<span class="sr-only">Next</span>
								<ArrowRightIcon />
							</Button>
						{/if}
					</div>
				</div>
				<p class="text-[1.05rem] text-balance text-muted-foreground sm:text-base">
					{data.description}
				</p>
			</div>
			<div data-slot="docs-content" class="w-full flex-1" {@attach copyCodeBlocks}>
				<Content />
			</div>
		</div>
		<div class="mx-auto hidden h-16 w-full max-w-2xl items-center gap-2 px-4 sm:flex md:px-0">
			{#if data.neighbours.previous}
				<Button
					href={data.neighbours.previous.url}
					variant="secondary"
					size="sm"
					class="shadow-none"
				>
					<ArrowLeftIcon />
					{data.neighbours.previous.title}
				</Button>
			{/if}
			{#if data.neighbours.next}
				<Button
					href={data.neighbours.next.url}
					variant="secondary"
					size="sm"
					class="ml-auto shadow-none"
				>
					{data.neighbours.next.title}
					<ArrowRightIcon />
				</Button>
			{/if}
		</div>
	</div>
	<div
		class="sticky top-[calc(var(--header-height)+1px)] z-30 ml-auto hidden h-[calc(100svh-var(--footer-height)+2rem)] w-72 flex-col gap-4 overflow-hidden overscroll-none pb-8 xl:flex"
	>
		<div class="h-(--top-spacing) shrink-0"></div>
		{#if data.toc.length}
			<div class="no-scrollbar overflow-y-auto px-8">
				<DocsToc toc={data.toc} />
				<div class="h-12"></div>
			</div>
		{/if}
	</div>
</div>
