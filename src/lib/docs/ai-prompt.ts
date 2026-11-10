import { INSTALL_COMMAND, siteConfig } from './config.js';

export interface AiPromptInput {
	/** What the prompt is about, e.g. "MapMarker" or "Store locator block". */
	title: string;
	/** Absolute URL of the page. */
	url: string;
	/** Reference the assistant should work from: page markdown or block source. */
	reference: string;
	/** Install command for this item; defaults to the map. */
	install?: string;
}

/** A prompt to paste into an AI assistant, with everything it needs to use this page. */
export function aiPrompt({
	title,
	url,
	reference,
	install = INSTALL_COMMAND
}: AiPromptInput): string {
	return `I'm building a SvelteKit app with ${siteConfig.name}: Svelte 5 map components on MapLibre GL that are installed into the project as source with the shadcn-svelte CLI.

Help me use ${title}. Work from the reference below, not from memory: it is the current API.

- Docs: ${url}
- Install: \`${install}\`
- Imports: \`$lib/components/ui/map\` (other installed items sit next to it)
- Svelte 5 runes only. Map colours come from the shadcn theme variables.

Reference:

${reference.trim()}
`;
}
