import { error } from '@sveltejs/kit';
import { getDocPage, toMarkdown } from './content.server.js';

/** A docs page as raw markdown, the `.md` URL of every page. */
export function markdownResponse(slug: string): Response {
	const page = getDocPage(slug);
	if (!page) error(404, 'Not found');
	return new Response(toMarkdown(page), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
	});
}
