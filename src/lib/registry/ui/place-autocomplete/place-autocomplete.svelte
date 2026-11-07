<script lang="ts">
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import * as Command from '#lib/registry/ui/command/index.js';
	import { Spinner } from '#lib/registry/ui/spinner/index.js';
	import { cn } from '#lib/utils.js';
	import type { Place, PlacePosition } from './photon.js';
	import { PlaceSearch } from './place-search.svelte.js';

	interface Props {
		/** Text in the search box. */
		query?: string;
		placeholder?: string;
		/** Name of the search box for screen readers. */
		label?: string;
		/** Photon base URL. Defaults to the public instance. */
		baseUrl?: string;
		/** Most results to show. */
		limit?: number;
		/** Language of the results: `default`, `de`, `en` or `fr`. */
		lang?: string;
		/** Milliseconds to wait after the last keystroke. */
		debounce?: number;
		/** Fewest characters that start a search. */
		minLength?: number;
		/** Milliseconds before a request gives up. */
		timeout?: number;
		/** Prefer results near this position, read when a search starts. */
		near?: () => PlacePosition | undefined;
		onselect?: (place: Place) => void;
		/** Network and response errors. Logged when unset. */
		onerror?: (error: Error) => void;
		class?: string;
	}

	let {
		query = $bindable(''),
		placeholder = 'Search places',
		label = 'Search places',
		baseUrl,
		limit,
		lang,
		debounce,
		minLength,
		timeout,
		near,
		onselect,
		onerror,
		class: className
	}: Props = $props();

	const search = new PlaceSearch(() => ({
		baseUrl,
		limit,
		lang,
		debounce,
		minLength,
		timeout,
		near,
		onerror: onerror ?? ((error) => console.error(error))
	}));

	let open = $state(false);

	function type(next: string) {
		query = next;
		open = true;
		search.search(next);
	}

	function select(place: Place) {
		query = place.name;
		open = false;
		search.cancel();
		onselect?.(place);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (open) open = false;
		else type('');
	}

	function onfocusout(event: FocusEvent & { currentTarget: HTMLElement }) {
		const next = event.relatedTarget;
		if (!(next instanceof Node) || !event.currentTarget.contains(next)) open = false;
	}

	// Abort a search still in flight when the box goes away.
	$effect(() => () => search.cancel());
</script>

<Command.Root
	shouldFilter={false}
	{label}
	class={cn(
		'relative h-auto w-64 overflow-visible rounded-lg border bg-background p-0 pb-1 shadow-xs',
		className
	)}
	data-slot="place-autocomplete"
	{onkeydown}
	{onfocusout}
>
	<Command.Input
		bind:value={() => query, type}
		{placeholder}
		onfocus={() => (open = query.trim().length > 0)}
	/>
	{#if open && search.status !== 'idle'}
		<div
			class="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
			data-slot="place-autocomplete-results"
		>
			<Command.List>
				{#if search.status === 'loading'}
					<div
						class="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
						role="status"
					>
						<Spinner class="size-3.5" /> Searching…
					</div>
				{:else if search.status === 'error'}
					<p class="px-2 py-1.5 text-sm text-destructive" role="status">
						The search failed. Try again.
					</p>
				{:else if search.results.length === 0}
					<p class="px-2 py-1.5 text-sm text-muted-foreground" role="status">No places found.</p>
				{:else}
					{#each search.results as place (place.id)}
						<Command.Item value={place.id} onSelect={() => select(place)}>
							<MapPinIcon class="text-muted-foreground" />
							<span class="flex min-w-0 flex-col">
								<span class="truncate">{place.name}</span>
								{#if place.description}
									<span class="truncate text-xs text-muted-foreground">{place.description}</span>
								{/if}
							</span>
						</Command.Item>
					{/each}
				{/if}
			</Command.List>
		</div>
	{/if}
</Command.Root>
