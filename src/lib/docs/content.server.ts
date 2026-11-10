import GithubSlugger from 'github-slugger';
import { DOCS_NAV, type DocLink, type Heading } from './config.js';
import { apiMarkdown } from './api.server.js';
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

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
	const match = /^---\n([\s\S]*?)\n---\n/.exec(raw);
	if (!match) throw new Error('Docs page without frontmatter');
	const data: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const colon = line.indexOf(':');
		if (colon > 0) data[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
	}
	return { data, body: raw.slice(match[0].length) };
}

/** h2/h3 headings with the ids rehype-slug gives them (both use github-slugger). */
export function getHeadings(body: string): Heading[] {
	const slugger = new GithubSlugger();
	const headings: Heading[] = [];
	let inFence = false;
	for (const line of body.split('\n')) {
		if (line.startsWith('```')) inFence = !inFence;
		const match = !inFence && /^(#{2,3})\s+(.+?)\s*$/.exec(line);
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
	return [...page.body.matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].map((m) => m[1]);
}

/** An example's source as users get it: imports point at `$lib/components/ui`. */
export function getExampleSource(name: string): string | undefined {
	const source = EXAMPLE_SOURCES[`/src/lib/docs/examples/${name}.svelte`];
	return source === undefined ? undefined : toUserImports(source);
}

/** Component files whose API tables a page shows, in order. */
export function getApiNames(page: DocPage): string[] {
	return [...page.body.matchAll(/<ApiTable\s+component="([^"]+)"/g)].map((m) => m[1]);
}

/** The page as plain markdown for "Copy Page", `/docs/<slug>.md` and `llms.txt`. */
export function toMarkdown(page: DocPage): string {
	const body = page.body
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>\n*/, '')
		.replace(/<ComponentPreview\s+name="([^"]+)"[^>]*\/>/g, (_, name: string) => {
			const source = getExampleSource(name);
			return source ? `\`\`\`svelte\n${source.trimEnd()}\n\`\`\`` : '';
		})
		.replace(/<ApiTable\s+component="([^"]+)"\s*\/>/g, (_, name: string) => apiMarkdown(name))
		.replace(/<CodeBlockCommand\s+command="([^"]+)"\s*\/>/g, '```bash\n$1\n```');
	return `# ${page.title}\n\n${page.description}\n\n${body.trim()}\n`;
}
