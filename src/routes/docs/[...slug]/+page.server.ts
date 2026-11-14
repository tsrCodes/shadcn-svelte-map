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

// Only real slugs here. `/docs` itself (the empty slug) is reached by the prerender
// crawler through the Docs link in the site header.
export const entries: EntryGenerator = () =>
	DOC_PAGES.filter((page) => page.slug !== '').map((page) => ({ slug: page.slug }));

export const load: PageServerLoad = async ({ params }) => {
	const page = getDocPage(params.slug);
	if (!page) error(404, 'Not found');

	// Highlighted at build time, so Shiki never ships to the browser
	const highlighted = await Promise.all(
		getPreviewNames(page).map(async (name) => {
			const code = getExampleSource(name);
			return code ? ([name, { code, html: await highlightCode(code, 'svelte') }] as const) : null;
		})
	);
	const previews: Record<string, { code: string; html: string }> = Object.fromEntries(
		highlighted.filter((entry) => entry !== null)
	);

	const api: Record<string, ApiEntry> = {};
	for (const name of getApiNames(page)) {
		const entry = getApiEntry(name);
		// A page that names a component the extractor cannot read is a docs bug: fail the build.
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
