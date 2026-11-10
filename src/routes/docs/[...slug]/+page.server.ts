import { error } from '@sveltejs/kit';
import {
	DOC_PAGES,
	getDocPage,
	getApiNames,
	getExampleSource,
	getNeighbours,
	getPreviewNames,
	toMarkdown
} from '#lib/docs/content.server.js';
import { getApiEntry, type ApiEntry } from '#lib/docs/api.server.js';
import { highlightCode } from '#lib/docs/highlight.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => DOC_PAGES.map((page) => ({ slug: page.slug }));

export const load: PageServerLoad = async ({ params }) => {
	const page = getDocPage(params.slug);
	if (!page) error(404, 'Not found');

	// Highlighted at build time, so Shiki never ships to the browser
	const previews: Record<string, { code: string; html: string }> = {};
	for (const name of getPreviewNames(page)) {
		const code = getExampleSource(name);
		if (code) previews[name] = { code, html: await highlightCode(code, 'svelte') };
	}

	const api: Record<string, ApiEntry> = {};
	for (const name of getApiNames(page)) {
		const entry = getApiEntry(name);
		if (!entry) error(500, `No API entry for ${name}`);
		api[name] = entry;
	}

	return {
		path: page.path,
		url: page.url,
		title: page.title,
		description: page.description,
		toc: page.headings,
		neighbours: getNeighbours(page),
		markdown: toMarkdown(page),
		previews,
		api
	};
};
