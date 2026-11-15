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

/** The docs tags that stand in for generated content, and the attribute each one reads. */
const TAG_ATTRIBUTE = {
	ApiTable: 'component',
	ComponentPreview: 'name',
	CodeBlockCommand: 'command'
} as const;
type DocTag = keyof typeof TAG_ATTRIBUTE;

/**
 * Each tag self-closing, `<ApiTable component="map" />`, or closed, with anything inside
 * it: `<ComponentPreview name="x">caption</ComponentPreview>`. Group 1 is the attributes;
 * quoted values may hold `>`. The content stops at a second opening tag, so one left
 * unclosed never runs into the next one.
 */
const TAG_PATTERN: Record<DocTag, RegExp> = {
	ApiTable:
		/<ApiTable\b((?:[^>"']|"[^"]*"|'[^']*')*)(?:\/>|>(?:(?!<ApiTable\b)[\s\S])*?<\/ApiTable\s*>)/g,
	ComponentPreview:
		/<ComponentPreview\b((?:[^>"']|"[^"]*"|'[^']*')*)(?:\/>|>(?:(?!<ComponentPreview\b)[\s\S])*?<\/ComponentPreview\s*>)/g,
	CodeBlockCommand:
		/<CodeBlockCommand\b((?:[^>"']|"[^"]*"|'[^']*')*)(?:\/>|>(?:(?!<CodeBlockCommand\b)[\s\S])*?<\/CodeBlockCommand\s*>)/g
};

const ATTRIBUTE = /\s([\w:-]+)=(["'])([\s\S]*?)\2/g;

/** The value of the tag's own attribute, from the raw attribute text of one match. */
function tagValue(tag: DocTag, attributes: string): string | undefined {
	for (const [, name, , value] of attributes.matchAll(ATTRIBUTE)) {
		if (name === TAG_ATTRIBUTE[tag]) return value;
	}
	return undefined;
}

/** The values of every `tag` in the body, in order. */
function tagValues(body: string, tag: DocTag): string[] {
	return [...body.matchAll(TAG_PATTERN[tag])].flatMap(([, attributes]) => {
		const value = tagValue(tag, attributes);
		return value === undefined ? [] : [value];
	});
}

/** The body with every `tag` swapped for `replace(value)`; a tag without the value stays. */
function replaceTags(body: string, tag: DocTag, replace: (value: string) => string): string {
	return body.replace(TAG_PATTERN[tag], (text, attributes: string) => {
		const value = tagValue(tag, attributes);
		return value === undefined ? text : replace(value);
	});
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
		if (entry[1] in data) throw new Error(`Frontmatter key "${entry[1]}" is given twice.`);
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
	return tagValues(page.body, 'ComponentPreview');
}

/** An example's source as users get it: imports point at `$lib/components/ui`. */
export function getExampleSource(name: string): string | undefined {
	const source = EXAMPLE_SOURCES[`/src/lib/docs/examples/${name}.svelte`];
	return source === undefined ? undefined : toUserImports(source);
}

/** Component files whose API tables a page shows, in order. */
export function getApiNames(page: DocPage): string[] {
	return tagValues(page.body, 'ApiTable');
}

/** The page as plain markdown for "Copy Page", `/docs/<slug>.md` and `llms.txt`. */
export function toMarkdown(page: DocPage): string {
	// Only the page's own script block at the top; a tag quoted in the prose stays.
	let body = page.body.replace(/^\s*<script\b[^>]*>[\s\S]*?<\/script>\n*/, '');
	body = replaceTags(body, 'ComponentPreview', (name) => {
		const source = getExampleSource(name);
		return source ? codeFence(source, 'svelte') : '';
	});
	body = replaceTags(body, 'ApiTable', apiMarkdown);
	body = replaceTags(body, 'CodeBlockCommand', (command) => `\`\`\`bash\n${command}\n\`\`\``);
	return `# ${page.title}\n\n${page.description}\n\n${body.trim()}\n`;
}
