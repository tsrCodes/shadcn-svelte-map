import { siteConfig, siteUrl } from './config.js';

export type JsonLd = Record<string, unknown>;

interface PageInfo {
	pathname: string;
	/** The page title without the site name; the home page has none. */
	title?: string;
	description: string;
}

const CONTEXT = 'https://schema.org';

function words(segment: string): string {
	const text = segment.replaceAll('-', ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function homeData(description: string): JsonLd[] {
	return [
		{
			'@context': CONTEXT,
			'@type': 'WebSite',
			name: siteConfig.name,
			url: siteUrl('/'),
			description
		},
		{
			'@context': CONTEXT,
			'@type': 'SoftwareSourceCode',
			name: siteConfig.name,
			description,
			codeRepository: siteConfig.links.github,
			programmingLanguage: ['Svelte', 'TypeScript'],
			license: 'https://opensource.org/licenses/MIT',
			author: { '@type': 'Person', name: 'Oggy', url: siteConfig.links.author }
		}
	];
}

function breadcrumbs(pathname: string, title: string | undefined): JsonLd {
	const segments = pathname.split(/[?#]/)[0].split('/').filter(Boolean);
	const itemListElement = segments.map((segment, index) => {
		const isLast = index === segments.length - 1;
		return {
			'@type': 'ListItem',
			position: index + 1,
			name: isLast && title ? title : words(segment),
			item: siteUrl(`/${segments.slice(0, index + 1).join('/')}`)
		};
	});
	return { '@context': CONTEXT, '@type': 'BreadcrumbList', itemListElement };
}

/** Schema.org data for a page: the site itself on the home page, breadcrumbs elsewhere. */
export function structuredData({ pathname, title, description }: PageInfo): JsonLd[] {
	if (pathname === '/') return homeData(description);
	return [breadcrumbs(pathname, title)];
}

/**
 * A JSON-LD script tag. `<` is escaped so no value can end the script early, which keeps
 * page titles and descriptions safe to put in it.
 */
export function jsonLdScript(data: JsonLd[]): string {
	const json = JSON.stringify(data.length === 1 ? data[0] : data).replaceAll('<', '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}
