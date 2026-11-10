/**
 * Source as users get it from the CLI: registry imports point at their own components
 * folder (`$lib/components/ui/...`) and other app imports at `$lib`.
 */
export function toUserImports(source: string): string {
	return source.replaceAll('#lib/registry/ui/', '$lib/components/ui/').replaceAll('#lib/', '$lib/');
}
