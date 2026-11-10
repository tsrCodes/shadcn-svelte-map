import { DOC_PAGES } from '#lib/docs/content.server.js';
import { markdownResponse } from '#lib/docs/markdown-response.server.js';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
	DOC_PAGES.filter((page) => page.slug).map((page) => ({ slug: page.slug }));

export const GET: RequestHandler = ({ params }) => markdownResponse(params.slug);
