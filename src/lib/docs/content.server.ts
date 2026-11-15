import GithubSlugger from 'github-slugger';
import { DOCS_NAV, type DocLink, type Heading } from './config.js';
import { apiMarkdown } from './api.server.js';
import { codeFence } from './markdown.js';
import { toUserImports } from './user-imports.js';

export type DocPage = DocLink & {
	/** Path under `src/content/docs` without `.md`, e.g. `examples/marker`. */
	path: string;
	/** URL slug after `/docs/`, `''` for the Get Started page. */
	slug: string;
	section: string;
	description: string;
	/** Markdown body without frontmatter. */
	body: string;
	headings: Heading[];
};

const SOURCES = import.meta.glob<string>('/src/content/docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

const EXAMPLE_SOURCES = import.meta.glob<string>('/src/lib/docs/examples/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true
});

/**
 * A docs tag with one attribute, e.g. `<ApiTable component="map" />`, with either quote
 * and any other attributes around it. It may also be written with an empty closing tag,
 * `<ApiTable component="map"></ApiTable>`. Group 2 is the attribute's value.
 */
function tagPattern(tag: string, attribute: string): RegExp {
	return new RegExp(
		`<${tag}\\b[^>]*?\\s${attribute}=(["'])(.*?)\\1[^>]*?(?:\\/>|>\\s*<\\/${tag}\\s*>)`,
		'g'
	);
}

// Frontmatter is a flat list of one-line `key: value` pairs; anything richer is rejected.
// An empty value is fine: indented lines that would nest under it fail the line pattern.
const FRONTMATTER_LINE = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
const UNSUPPORTED_VALUE = /^([|>[{&*!]|-\s)/;

/** A YAML-style value without its matching surrounding quotes. */
function unquote(value: string): string {
	const quoted = /^(['"])(.*)\1$/.exec(value);
	return quoted ? quoted[2] : value;
}

export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
	if (!match) throw new Error('Docs page without frontmatter');
	const data: Record<string, string> = {};
	for (const line of match[1].split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith('#')) continue;
		const entry = FRONTMATTER_LINE.exec(line);
		const value = entry?.[2].trim() ?? '';
		// Multiline values, lists and nested keys would be misread, so fail loudly instead.
		if (!entry || UNSUPPORTED_VALUE.test(value)) {
			throw new Error(`Unsupported frontmatter line: "${line}". Use one-line key: value pairs.`);
		}
		data[entry[1]] = unquote(value);
	}
	return { data, body: raw.slice(match[0].length) };
}

/** h2/h3 headings with the ids rehype-slug gives them (both use github-slugger). */
export function getHeadings(body: string): Heading[] {
	const slugger = new GithubSlugger();
	const headings: Heading[] = [];
	/** The marker that opened the code fence we are in; only the same marker closes it. */
	let fence: string | null = null;
	for (const line of body.split(/\r?\n/)) {
		const marker = /^(```|~~~)/.exec(line)?.[1];
		if (marker && (fence === null || fence === marker)) {
			fence = fence === null ? marker : null;
			continue;
		}
		const match = fence === null && /^(#{2,3})\s+(.+?)\s*$/.exec(line);
		if (!match) continue;
		const title = match[2].replace(/`/g, '');
		headings.push({ depth: match[1].length, title, id: slugger.slug(title) });
	}
	return headings;
}

function toSlug(path: string): string {
	return path.replace(/(^|\/)index$/, '');
}

export const DOC_PAGES: DocPage[] = DOCS_NAV.flatMap((section) =>
	section.pages.map((path) => {
		const raw = SOURCES[`/src/content/docs/${path}.md`];
		if (raw === undefined) throw new Error(`Missing docs page src/content/docs/${path}.md`);
		const { data, body } = parseFrontmatter(raw);
		for (const key of ['title', 'description']) {
			if (!data[key]) throw new Error(`Docs page src/content/docs/${path}.md needs a ${key}`);
		}
		const slug = toSlug(path);
		return {
			path,
			slug,
			url: slug ? `/docs/${slug}` : '/docs',
			title: data.title,
			description: data.description,
			section: section.title,
			body,
			headings: getHeadings(body)
		};
	})
);

export function getDocPage(slug: string): DocPage | undefined {
	return DOC_PAGES.find((page) => page.slug === slug);
}

export function getNeighbours(page: DocPage): { previous?: DocLink; next?: DocLink } {
	const index = DOC_PAGES.indexOf(page);
	const link = (p?: DocPage) => (p ? { title: p.title, url: p.url } : undefined);
	return { previous: link(DOC_PAGES[index - 1]), next: link(DOC_PAGES[index + 1]) };
}

/** Names of the examples a page shows, in order. */
export function getPreviewNames(page: DocPage): string[] {
	return [...page.body.matchAll(tagPattern('ComponentPreview', 'name'))].map((m) => m[2]);
}

/** An example's source as users get it: imports point at `$lib/components/ui`. */
export function getExampleSource(name: string): string | undefined {
	const source = EXAMPLE_SOURCES[`/src/lib/docs/examples/${name}.svelte`];
	return source === undefined ? undefined : toUserImports(source);
}

/** Component files whose API tables a page shows, in order. */
export function getApiNames(page: DocPage): string[] {
	return [...page.body.matchAll(tagPattern('ApiTable', 'component'))].map((m) => m[2]);
}

/** The page as plain markdown for "Copy Page", `/docs/<slug>.md` and `llms.txt`. */
export function toMarkdown(page: DocPage): string {
	const body = page.body
		// Only the page's own script block at the top; a tag quoted in the prose stays.
		.replace(/^\s*<script\b[^>]*>[\s\S]*?<\/script>\n*/, '')
		.replace(tagPattern('ComponentPreview', 'name'), (_, _quote: string, name: string) => {
			const source = getExampleSource(name);
			return source ? codeFence(source, 'svelte') : '';
		})
		.replace(tagPattern('ApiTable', 'component'), (_, _quote: string, name: string) =>
			apiMarkdown(name)
		)
		.replace(tagPattern('CodeBlockCommand', 'command'), '```bash\n$2\n```');
	return `# ${page.title}\n\n${page.description}\n\n${body.trim()}\n`;
}
