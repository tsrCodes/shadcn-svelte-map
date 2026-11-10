import { DOCS_NAV, siteConfig, type DocLink, type DocsNavSection } from '#lib/docs/config.js';
import { BLOCKS } from './blocks/catalog.js';
import { DOC_PAGES } from '#lib/docs/content.server.js';
import type { LayoutServerLoad } from './$types';

const GITHUB_API = siteConfig.links.github.replace(
	'https://github.com/',
	'https://api.github.com/repos/'
);

// Fetched once per build, not once per prerendered page
let stars: Promise<number | null> | undefined;

/** Star count at build time, or `null` when GitHub does not answer (or the repo is private). */
async function fetchStars(fetchFn: typeof fetch): Promise<number | null> {
	try {
		const response = await fetchFn(GITHUB_API, { signal: AbortSignal.timeout(5000) });
		if (!response.ok) return null;
		const json: unknown = await response.json();
		const stars = (json as { stargazers_count?: unknown }).stargazers_count;
		return typeof stars === 'number' && stars >= 0 ? stars : null;
	} catch {
		return null;
	}
}

export const load: LayoutServerLoad = async ({ fetch }) => {
	const sections: DocsNavSection[] = DOCS_NAV.map((section) => ({
		title: section.title,
		pages: DOC_PAGES.filter((page) => page.section === section.title).map((page) => ({
			title: page.title,
			url: page.url,
			keywords: page.headings.map((heading) => heading.title)
		}))
	}));
	const blocks: DocLink[] = BLOCKS.map((block) => ({
		title: block.title,
		url: `/blocks/${block.name}`
	}));
	stars ??= fetchStars(fetch);
	return { sections, blocks, stars: await stars };
};
