<script lang="ts">
	import type { Heading } from '../config.js';

	let { toc }: { toc: Heading[] } = $props();

	let activeId = $state<string | null>(null);

	// Highlights the first heading, in page order, inside the top band of the viewport.
	// Observer entries arrive in any order, so visibility is tracked per id.
	function observeHeadings(headings: Heading[]) {
		return () => {
			const visible: Record<string, boolean> = {};
			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) visible[entry.target.id] = entry.isIntersecting;
					const first = headings.find(({ id }) => visible[id]);
					if (first) activeId = first.id;
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
