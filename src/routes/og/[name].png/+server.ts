import { error } from '@sveltejs/kit';
import { ogImagePath, siteConfig } from '#lib/docs/config.js';
import { DOC_PAGES } from '#lib/docs/content.server.js';
import { renderOgImage } from '#lib/docs/og-image.server.js';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

const IMAGES = [
	{ path: '/', title: siteConfig.title, description: siteConfig.description },
	...DOC_PAGES.map((page) => ({
		path: page.url,
		title: page.title,
		description: page.description
	}))
].map((image) => ({
	...image,
	name: ogImagePath(image.path).slice('/og/'.length, -'.png'.length)
}));

export const entries: EntryGenerator = () => IMAGES.map(({ name }) => ({ name }));

export const GET: RequestHandler = async ({ params }) => {
	const image = IMAGES.find(({ name }) => name === params.name);
	if (!image) error(404, 'Not found');
	const png = await renderOgImage(image.title, image.description);
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
