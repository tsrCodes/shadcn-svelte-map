// Shiki escapes the code itself, so its output is only these tags with these attributes.
const ALLOWED_TAG = /^<\/?(pre|code|span)\b/i;
// Colours are classes (strict CSP), so a style attribute is never expected either.
const EVENT_OR_SCRIPT_URL = /\son[a-z]+\s*=|\sstyle\s*=|javascript:/i;

/** Throws if highlighted HTML holds anything but Shiki's own markup, before it reaches `{@html}`. */
export function assertHighlightMarkup(html: string): string {
	for (const tag of html.match(/<[^>]+>/g) ?? []) {
		if (!ALLOWED_TAG.test(tag) || EVENT_OR_SCRIPT_URL.test(tag)) {
			throw new Error(`Unexpected markup in highlighted code: ${tag}`);
		}
	}
	return html;
}
