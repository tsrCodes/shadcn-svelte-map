import { Resvg } from '@resvg/resvg-js';
import favicon from '#lib/assets/favicon.svg?raw';
import type { RequestHandler } from './$types';

export const prerender = true;

/** iOS wants a 180 px PNG and ignores SVG icons; it rounds the corners itself. */
const SIZE = 180;
const BACKGROUND = '#ffffff';

export const GET: RequestHandler = () => {
	const png = new Resvg(favicon, {
		fitTo: { mode: 'width', value: SIZE },
		background: BACKGROUND
	})
		.render()
		.asPng();
	return new Response(new Uint8Array(png), {
		headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' }
	});
};
