import { describe, expect, test } from 'vitest';
import { ogImagePath } from '#lib/docs/config.js';
import { DOC_PAGES, getHeadings, parseFrontmatter, toMarkdown } from '#lib/docs/content.server.js';

describe('docs helpers', () => {
	test('Open Graph image names ignore query and hash', () => {
		expect(ogImagePath('/')).toBe('/og/index.png');
		expect(ogImagePath('/docs/components/marker')).toBe('/og/docs-components-marker.png');
		expect(ogImagePath('/docs/csp?tab=code#policy')).toBe('/og/docs-csp.png');
	});

	test('copied markdown drops the page script whatever its attributes', () => {
		const page = DOC_PAGES[0];
		const withAttributes = {
			...page,
			body: `<script lang="ts">\n\tlet x = 1;\n</script>\n\nHello`
		};
		expect(toMarkdown(withAttributes)).not.toContain('let x');
		expect(toMarkdown(withAttributes)).toContain('Hello');
	});

	test('headings are found with extra spaces, but not inside code fences', () => {
		const body = '##   Spaced  heading  \n```md\n## Not a heading\n```\n### `Code` title';
		expect(getHeadings(body)).toEqual([
			{ depth: 2, title: 'Spaced  heading', id: 'spaced--heading' },
			{ depth: 3, title: 'Code title', id: 'code-title' }
		]);
	});

	test('frontmatter parses with Windows line endings', () => {
		const { data, body } = parseFrontmatter(
			'---\r\ntitle: Map\r\ndescription: Root\r\n---\r\nBody'
		);
		expect(data).toEqual({ title: 'Map', description: 'Root' });
		expect(body).toBe('Body');
	});

	test('frontmatter values lose their surrounding quotes', () => {
		const raw = `---\ntitle: "Map: root"\ndescription: 'It\u2019s the root'\nother: plain\n---\nBody`;
		expect(parseFrontmatter(raw).data).toEqual({
			title: 'Map: root',
			description: 'It\u2019s the root',
			other: 'plain'
		});
	});
});
