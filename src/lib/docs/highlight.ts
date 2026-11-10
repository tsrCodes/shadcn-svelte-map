import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import { CODE_THEMES, styleToClasses } from './shiki-theme.js';

// Build time only: the mdsvex preprocessor and the docs page loads use it, so Shiki never ships
const LANGS = ['svelte', 'ts', 'bash', 'json', 'css', 'html'];
let highlighter: Promise<Highlighter> | undefined;

const CLIPBOARD_ICON =
	'<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>';
const CHECK_ICON =
	'<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function classList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];
}

/** Moves token colours from inline styles to classes, so code renders under a strict CSP. */
const styleToClassTransformer: ShikiTransformer = {
	pre(node) {
		// Background comes from the `--code` token, not the theme
		delete node.properties.style;
	},
	span(node) {
		const style = node.properties.style;
		if (typeof style !== 'string') return;
		delete node.properties.style;
		node.properties.class = [...classList(node.properties.class), ...styleToClasses(style)].join(
			' '
		);
	},
	line(node) {
		node.properties['data-line'] = '';
	}
};

/** Shiki HTML with light and dark colours as classes. */
export async function highlightCode(code: string, lang?: string | null): Promise<string> {
	highlighter ??= createHighlighter({
		themes: [CODE_THEMES.light, CODE_THEMES.dark],
		langs: LANGS
	});
	const shiki = await highlighter;
	return shiki.codeToHtml(code, {
		lang: lang && LANGS.includes(lang) ? lang : 'text',
		themes: { light: CODE_THEMES.light.name ?? 'light', dark: CODE_THEMES.dark.name ?? 'dark' },
		defaultColor: false,
		transformers: [styleToClassTransformer]
	});
}

/** mdsvex `highlighter`: a code figure with a copy button, as Svelte markup. */
export async function highlightMarkdownCode(code: string, lang?: string | null): Promise<string> {
	const html = await highlightCode(code, lang);
	const button = `<button type="button" data-copy-code data-slot="copy-button" class="absolute top-3 right-2 z-10 inline-flex size-7 items-center justify-center rounded-md bg-code opacity-70 hover:bg-accent hover:opacity-100 [&_svg]:size-4 [&_.check-icon]:hidden data-copied:[&_.check-icon]:block data-copied:[&_.copy-icon]:hidden"><span class="sr-only">Copy</span>${CLIPBOARD_ICON}${CHECK_ICON}</button>`;
	const figure = `<figure data-rehype-pretty-code-figure>${button}${html}</figure>`;
	// `$` as an entity keeps `$lib` text out of the compiled module, which SvelteKit 3 rejects
	return `{@html ${JSON.stringify(figure.replaceAll('$', '&#36;'))}}`;
}
