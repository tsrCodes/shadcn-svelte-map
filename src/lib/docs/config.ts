export const siteConfig = {
	name: 'shadcn-svelte map',
	url: 'https://shadcn-svelte-map.vercel.app',
	title: 'Maps for shadcn-svelte',
	description:
		'Map components for shadcn-svelte, built on MapLibre GL: markers, data layers, controls and drawing. Install them into your project and own the code.',
	links: {
		github: 'https://github.com/tsrCodes/shadcn-svelte-map',
		author: 'https://github.com/tsrCodes'
	},
	navItems: [
		{ href: '/docs', label: 'Docs' },
		{ href: '/docs/components/map', label: 'Components' },
		{ href: '/blocks', label: 'Blocks' }
	]
};

/** The command that installs the map, shared by the landing page and the docs. */
export const INSTALL_COMMAND = `npx shadcn-svelte@latest add ${siteConfig.url}/r/map.json`;

/** The install command of any registry item, e.g. a block. */
export function installCommand(item: string): string {
	return `npx shadcn-svelte@latest add ${siteConfig.url}/r/${item}.json`;
}

/** Sidebar sections and page order. Paths are under `src/content/docs`, without `.md`. */
export const DOCS_NAV: { title: string; pages: string[] }[] = [
	{ title: 'Get Started', pages: ['index', 'installation'] },
	{
		title: 'Guides',
		pages: ['theming', 'drawing', 'accessibility', 'performance', 'csp']
	},
	{ title: 'Core', pages: ['components/map', 'components/control-container'] },
	{
		title: 'Markers',
		pages: ['components/marker', 'components/popup', 'components/point-layer']
	},
	{
		title: 'Data',
		pages: [
			'components/geojson',
			'components/shapes',
			'components/route',
			'components/arc',
			'components/cluster-layer',
			'components/heatmap'
		]
	},
	{
		title: 'Controls',
		pages: [
			'components/zoom-control',
			'components/compass-control',
			'components/scale-control',
			'components/fullscreen-control',
			'components/locate-control',
			'components/basemap-control',
			'components/search-control',
			'components/draw-control'
		]
	},
	{ title: 'More', pages: ['components/place-autocomplete', 'components/utilities'] }
];

/** A docs page as the sidebar, search and prev/next links see it. */
export type DocLink = { title: string; url: string };

/** A sidebar section; `keywords` are the page's headings, so search finds them too. */
export type DocsNavSection = { title: string; pages: (DocLink & { keywords: string[] })[] };

/** An h2/h3 of a docs page, for the "On This Page" list. */
export type Heading = { depth: number; title: string; id: string };

/** The prerendered Open Graph image of a page: `/` → `/og/index.png`, `/docs/api` → `/og/docs-api.png`. */
/**
 * The absolute URL of a path on this site. Only root-relative paths are taken: a full
 * or protocol-relative URL would put another origin in canonical and social links.
 */
export function siteUrl(path: string): string {
	if (!path.startsWith('/') || path.startsWith('//')) {
		throw new Error(`Expected a path starting with one "/", got "${path}"`);
	}
	return new URL(path, siteConfig.url).href;
}

export function ogImagePath(pathname: string): string {
	const path = pathname.split(/[?#]/)[0];
	const name = path.replace(/^\/|\/$/g, '').replaceAll('/', '-') || 'index';
	return `/og/${name}.png`;
}
