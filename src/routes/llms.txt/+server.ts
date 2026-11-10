import { siteConfig } from '#lib/docs/config.js';
import { DOC_PAGES } from '#lib/docs/content.server.js';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
	const sections = [...new Set(DOC_PAGES.map((page) => page.section))].map((section) => {
		const links = DOC_PAGES.filter((page) => page.section === section).map(
			(page) => `- [${page.title}](${siteConfig.url}${page.url}.md): ${page.description}`
		);
		return `## ${section}\n\n${links.join('\n')}`;
	});
	const body = `# ${siteConfig.name}\n\n> ${siteConfig.description}\n\n${sections.join('\n\n')}\n`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
