import { highlightCode } from './highlight.js';
import { toUserImports } from './user-imports.js';

const SOURCES = import.meta.glob<string>('/src/lib/registry/blocks/**/*.{svelte,ts}', {
	query: '?raw',
	import: 'default',
	eager: true
});

export interface BlockFile {
	/** Path inside the block folder, e.g. `data.ts`. */
	path: string;
	code: string;
	/** Highlighted at build time. */
	html: string;
}

function language(path: string): string {
	return path.endsWith('.svelte') ? 'svelte' : 'ts';
}

/** The block's files as users get them, main component first. */
export async function getBlockFiles(name: string): Promise<BlockFile[]> {
	const prefix = `/src/lib/registry/blocks/${name}/`;
	const paths = Object.keys(SOURCES)
		.filter((path) => path.startsWith(prefix))
		.map((path) => path.slice(prefix.length))
		.sort(
			(a, b) =>
				Number(b === `${name}.svelte`) - Number(a === `${name}.svelte`) || a.localeCompare(b)
		);
	return Promise.all(
		paths.map(async (path) => {
			const code = toUserImports(SOURCES[prefix + path]);
			return { path, code, html: await highlightCode(code, language(path)) };
		})
	);
}

/** The block's files as one markdown reference, for the "Copy for AI" prompt. */
export function blockMarkdown(files: BlockFile[]): string {
	return files
		.map(
			(file) => `\`${file.path}\`\n\n\`\`\`${language(file.path)}\n${file.code.trimEnd()}\n\`\`\``
		)
		.join('\n\n');
}
