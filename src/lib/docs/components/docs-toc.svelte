<script lang="ts">
	import type { Heading } from '../config.js';

	let { toc }: { toc: Heading[] } = $props();

	let activeId = $state<string | null>(null);

	/** The last heading whose top has scrolled above the viewport, if any. */
	function lastPassed(headings: Heading[]): Heading | undefined {
		for (let index = headings.length - 1; index >= 0; index--) {
			const top = document.getElementById(headings[index].id)?.getBoundingClientRect().top;
			if (top !== undefined && top < 0) return headings[index];
		}
		return undefined;
	}

	// Highlights the first heading, in page order, inside the top band of the viewport.
	// Observer entries arrive in any order, so visibility is tracked per id.
	function observeHeadings(headings: Heading[]) {
		return () => {
			// A new page starts with nothing highlighted, not the last page's heading.
			activeId = null;
			const visible: Record<string, boolean> = {};
			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) visible[entry.target.id] = entry.isIntersecting;
					const first = headings.find(({ id }) => visible[id]);
					// Between headings, the section you are reading is the last one scrolled past.
					const passed = lastPassed(headings);
					activeId = first?.id ?? passed?.id ?? null;
				},
				{ rootMargin: '0% 0% -80% 0%' }
			);
			for (const { id } of headings) {
				const element = document.getElementById(id);
				if (element) observer.observe(element);
			}
			return () => observer.disconnect();
		};
	}
</script>

<div class="flex flex-col gap-2 p-4 pt-0 text-sm" {@attach observeHeadings(toc)}>
	<p class="sticky top-0 h-6 bg-background text-xs text-muted-foreground">On This Page</p>
	{#each toc as item (item.id)}
		<a
			href={`#${item.id}`}
			data-active={item.id === activeId}
			data-depth={item.depth}
			class="text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground data-[active=true]:text-foreground data-[depth=3]:pl-4 data-[depth=4]:pl-6"
		>
			{item.title}
		</a>
	{/each}
</div>
