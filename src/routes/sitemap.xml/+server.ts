import { siteConfig } from '#lib/docs/config.js';
import { DOC_PAGES } from '#lib/docs/content.server.js';
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
	const urls = ['/', ...DOC_PAGES.map((page) => page.url)].map(
		(path) => `\t<url><loc>${escapeXml(new URL(path, siteConfig.url).href)}</loc></url>`
	);
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
