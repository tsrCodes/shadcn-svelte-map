import type { Component } from 'svelte';

// Lazy, so a docs page only loads the examples it shows
const modules = import.meta.glob<{ default: Component }>('/src/lib/docs/examples/*.svelte');

/** Loads a docs example by file name, or `undefined` if there is none. */
export function loadExample(name: string): Promise<{ default: Component }> | undefined {
	return modules[`/src/lib/docs/examples/${name}.svelte`]?.();
}
