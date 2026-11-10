import { error } from '@sveltejs/kit';
import { installCommand, siteConfig } from '#lib/docs/config.js';
import { aiPrompt } from '#lib/docs/ai-prompt.js';
import { blockMarkdown, getBlockFiles } from '#lib/docs/blocks.server.js';
import { BLOCKS, findBlock } from '../catalog.js';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => BLOCKS.map((block) => ({ name: block.name }));

export const load: PageServerLoad = async ({ params }) => {
	const block = findBlock(params.name);
	if (!block) error(404, `No block named "${params.name}"`);
	const files = await getBlockFiles(block.name);
	if (files.length === 0) error(500, `Block "${block.name}" has no files`);
	const install = installCommand(block.name);
	const url = new URL(`/blocks/${block.name}`, siteConfig.url).href;
	return {
		files,
		install,
		prompt: aiPrompt({
			title: `the ${block.title} block (${block.description})`,
			url,
			reference: blockMarkdown(files),
			install
		})
	};
};
