/**
 * A `#lib/` module path right after `from`, a bare `import` or `import(`, with its quote.
 * Group 3 is set when the path points into the registry's ui folder.
 */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])#lib\/(registry\/ui\/)?/g;

/**
 * Source as users get it from the CLI: registry imports point at their own components
 * folder (`$lib/components/ui/...`) and other app imports at `$lib`. Only module paths
 * change; `#lib/` written in comments or strings stays as it is.
 */
export function toUserImports(source: string): string {
	return source.replace(
		SPECIFIER,
		(_, keyword: string, quote: string, ui: string | undefined) =>
			`${keyword}${quote}$lib/${ui ? 'components/ui/' : ''}`
	);
}
