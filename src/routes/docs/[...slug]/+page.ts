import type { Component } from 'svelte';
import type { PageLoad } from './$types';

const PAGES = import.meta.glob<{ default: Component }>('/src/content/docs/**/*.md');

export const load: PageLoad = async ({ data }) => {
	const module = await PAGES[`/src/content/docs/${data.path}.md`]();
	return { ...data, content: module.default };
};
