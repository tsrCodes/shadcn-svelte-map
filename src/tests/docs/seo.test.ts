import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { jsonLdScript, structuredData } from '#lib/docs/structured-data.js';
import { GET as touchIcon } from '../../routes/apple-touch-icon.png/+server.js';

const SITE = 'https://shadcn-svelte-map.vercel.app';
const TOUCH_ICON_SIZE = 180;

describe('seo', () => {
	test('robots.txt points crawlers at the sitemap', () => {
		expect(readFileSync('static/robots.txt', 'utf8')).toContain(`Sitemap: ${SITE}/sitemap.xml`);
	});

	test('the home page describes the site and its source code', () => {
		const types = structuredData({ pathname: '/', description: 'Maps' }).map(
			(item) => item['@type']
		);
		expect(types).toEqual(['WebSite', 'SoftwareSourceCode']);
	});

	test('a docs page carries breadcrumbs down to its own title', () => {
		const [crumbs] = structuredData({
			pathname: '/docs/components/map',
			title: 'Map',
			description: 'The map'
		});
		expect(crumbs['@type']).toBe('BreadcrumbList');
		const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
		expect(items.map((item) => item.name)).toEqual(['Docs', 'Components', 'Map']);
		expect(items.at(-1)?.item).toBe(`${SITE}/docs/components/map`);
		expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
	});

	test('JSON-LD cannot close its script tag early', () => {
		const html = jsonLdScript([{ name: '</script><script>alert(1)</script>' }]);
		expect(html.match(/<\/script>/g)).toHaveLength(1);
		expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
	});

	test('the Apple touch icon is a 180 px PNG', async () => {
		const response = await touchIcon({} as never);
		expect(response.headers.get('content-type')).toBe('image/png');
		const bytes = new Uint8Array(await response.arrayBuffer());
		const view = new DataView(bytes.buffer);
		// PNG signature, then the IHDR chunk holds width and height.
		expect([...bytes.slice(1, 4)].map((code) => String.fromCharCode(code)).join('')).toBe('PNG');
		expect(view.getUint32(16)).toBe(TOUCH_ICON_SIZE);
		expect(view.getUint32(20)).toBe(TOUCH_ICON_SIZE);
	});

	test('the demo page asks search engines not to index it', () => {
		expect(readFileSync('src/routes/demo/+page.svelte', 'utf8')).toContain(
			'<meta name="robots" content="noindex" />'
		);
	});
});
