import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { getApiEntry } from '#lib/docs/api.server.js';
import {
	DOC_PAGES,
	getApiNames,
	getExampleSource,
	getPreviewNames,
	toMarkdown
} from '#lib/docs/content.server.js';

const COMPONENT_PAGES = DOC_PAGES.filter((page) => page.path.startsWith('components/'));
// Words that would credit other projects or name an older version of this one.
const BANNED = /\b(leaflet|react|inspired by|port of|ported from)\b/i;

describe('docs content', () => {
	test('every page has a title, a description and real content', () => {
		const thin = DOC_PAGES.filter(
			(page) => !page.title || !page.description || /coming soon/i.test(page.body)
		).map((page) => page.path);
		expect(thin).toEqual([]);
	});

	test('every preview has an example file', () => {
		const missing = DOC_PAGES.flatMap((page) =>
			getPreviewNames(page).filter((name) => getExampleSource(name) === undefined)
		);
		expect(missing).toEqual([]);
	});

	test('every API table names a component the extractor can read', () => {
		const missing = DOC_PAGES.flatMap((page) =>
			getApiNames(page).filter((name) => getApiEntry(name) === undefined)
		);
		expect(missing).toEqual([]);
	});

	test('every component page has a preview and an API reference', () => {
		const incomplete = COMPONENT_PAGES.filter(
			(page) =>
				page.path !== 'components/utilities' &&
				(getPreviewNames(page).length === 0 || getApiNames(page).length === 0)
		).map((page) => page.path);
		expect(incomplete).toEqual([]);
	});

	test('example code shown to users imports from their own components folder', () => {
		const leaks = DOC_PAGES.flatMap((page) =>
			getPreviewNames(page).filter((name) => /#lib\//.test(getExampleSource(name) ?? ''))
		);
		expect(leaks).toEqual([]);
	});

	test('copied markdown has no Svelte markup left in it', () => {
		const outsideCode = (markdown: string) =>
			markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
		const leftovers = DOC_PAGES.filter((page) =>
			/<(ComponentPreview|ApiTable|CodeBlockCommand|script)\b/.test(outsideCode(toMarkdown(page)))
		).map((page) => page.path);
		expect(leftovers).toEqual([]);
	});

	test('docs tags are found whether self-closing or closed', () => {
		const page = {
			...DOC_PAGES[0],
			body: [
				`<ApiTable component="map" />`,
				`<ApiTable component='map-marker'></ApiTable>`,
				`<ComponentPreview name="marker" class="h-80"></ComponentPreview>`,
				`<CodeBlockCommand command="pnpm dlx x"></CodeBlockCommand>`
			].join('\n\n')
		};
		expect(getApiNames(page)).toEqual(['map', 'map-marker']);
		expect(getPreviewNames(page)).toEqual(['marker']);
		const markdown = toMarkdown(page);
		expect(markdown).toContain('```bash\npnpm dlx x\n```');
		expect(markdown).not.toMatch(/<\/?(ApiTable|ComponentPreview|CodeBlockCommand)\b/);
	});

	test('pages credit no other projects', () => {
		const hits = DOC_PAGES.filter((page) => BANNED.test(page.body)).map((page) => page.path);
		expect(hits).toEqual([]);
	});

	test('each page in the nav has a markdown source', () => {
		expect(DOC_PAGES.every((page) => existsSync(`src/content/docs/${page.path}.md`))).toBe(true);
	});
});
