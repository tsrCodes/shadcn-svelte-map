import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import type { PageLoad } from './$types';

const PAGES = import.meta.glob<{ default: Component }>('/src/content/docs/**/*.md');

export const load: PageLoad = async ({ data }) => {
	const loadPage = PAGES[`/src/content/docs/${data.path}.md`];
	if (!loadPage) error(404, 'Not found');
	const module = await loadPage();
	return { ...data, content: module.default };
};
