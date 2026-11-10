const TITLE_MATCH = 1;
const KEYWORD_MATCH = 0.5;
const NO_MATCH = 0;

/**
 * Scores a search result for the docs search: every word typed must appear in the
 * item's title or its keywords (the page headings). Title matches rank first. Unlike
 * fuzzy matching, scattered letters across headings never count as a match.
 */
export function scoreSearchItem(value: string, search: string, keywords: string[] = []): number {
	const words = search.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return TITLE_MATCH;
	const title = value.toLowerCase();
	const extra = keywords.join(' ').toLowerCase();
	if (words.every((word) => title.includes(word))) return TITLE_MATCH;
	if (words.every((word) => title.includes(word) || extra.includes(word))) return KEYWORD_MATCH;
	return NO_MATCH;
}
