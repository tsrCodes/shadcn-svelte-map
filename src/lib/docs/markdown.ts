const MIN_FENCE = 3;

/**
 * A fenced code block that cannot be closed early by the code inside it: the fence is
 * one backtick longer than the longest run of backticks in the code.
 */
export function codeFence(code: string, language: string): string {
	const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((run) => run[0].length));
	const fence = '`'.repeat(Math.max(MIN_FENCE, longest + 1));
	return `${fence}${language}\n${code.trimEnd()}\n${fence}`;
}
