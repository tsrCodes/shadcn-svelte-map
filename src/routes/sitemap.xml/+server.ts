import { siteUrl } from '#lib/docs/config.js';
import { DOC_PAGES } from '#lib/docs/content.server.js';
import { BLOCKS } from '../blocks/catalog.js';
import type { RequestHandler } from './$types';

const XML_ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;'
};

function escapeXml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);
}

export const prerender = true;

export const GET: RequestHandler = () => {
	const pages = [
		'/',
		...DOC_PAGES.map((page) => page.url),
		'/blocks',
		...BLOCKS.map((block) => `/blocks/${block.name}`)
	];
	const urls = pages.map((path) => `\t<url><loc>${escapeXml(siteUrl(path))}</loc></url>`);
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
