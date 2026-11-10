<script lang="ts">
	import { page } from '$app/state';
	import type { ApiEntry, ApiProp } from '../api.server.js';

	/** Component file name, e.g. `map-marker`. Its entry comes from the page load. */
	let { component }: { component: string } = $props();

	const entry = $derived<ApiEntry | undefined>(page.data.api?.[component]);
	const groups = $derived(
		entry
			? [
					{ title: 'Props', rows: entry.props.filter((prop) => prop.kind === 'prop') },
					{ title: 'Events', rows: entry.props.filter((prop) => prop.kind === 'event') },
					{ title: 'Snippets', rows: entry.props.filter((prop) => prop.kind === 'snippet') }
				].filter((group) => group.rows.length)
			: []
	);
</script>

{#snippet row(prop: ApiProp)}
	<tr class="m-0 border-b align-top last:border-b-0">
		<td class="px-4 py-2 text-left whitespace-nowrap">
			<code>{prop.name}</code>
			{#if prop.required}<span class="ml-1 text-xs text-destructive">required</span>{/if}
			{#if prop.bindable}<span class="ml-1 text-xs text-muted-foreground">bindable</span>{/if}
		</td>
		<td class="px-4 py-2 text-left"><code class="break-all">{prop.type}</code></td>
		<td class="px-4 py-2 text-left">
			{prop.description}
			{#if prop.default}
				Defaults to <code>{prop.default}</code>.
			{/if}
		</td>
	</tr>
{/snippet}

{#if entry}
	<h3 id={`api-${entry.file}`} class="mt-8 scroll-m-28 text-lg font-medium tracking-tight">
		<code>{entry.name}</code>
	</h3>
	{#each groups as group (group.title)}
		<p class="mt-4! text-sm font-medium">{group.title}</p>
		<div class="my-3 w-full overflow-x-auto rounded-lg border">
			<table class="relative w-full border-none text-sm">
				<thead>
					<tr class="m-0 border-b">
						<th class="px-4 py-2 text-left font-medium">Name</th>
						<th class="px-4 py-2 text-left font-medium">Type</th>
						<th class="px-4 py-2 text-left font-medium">Description</th>
					</tr>
				</thead>
				<tbody>
					{#each group.rows as prop (prop.name)}
						{@render row(prop)}
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
	{#if entry.restElement}
		<p class="text-sm text-muted-foreground">
			Other attributes go to the underlying <code>&lt;{entry.restElement}&gt;</code>.
		</p>
	{/if}
{:else}
	<p class="text-sm text-destructive">No API entry for <code>{component}</code>.</p>
{/if}
