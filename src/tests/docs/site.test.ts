import { describe, expect, test } from 'vitest';
import { commandFor } from '#lib/docs/package-manager.svelte.js';
import { BLOCKS } from '../../routes/blocks/catalog.js';
import { GET } from '../../routes/sitemap.xml/+server.js';

describe('site', () => {
	test('install commands use each package manager’s one-off runner', () => {
		const command = 'npx shadcn-svelte@latest add https://example.com/r/map.json';
		expect(commandFor(command, 'npm')).toBe(command);
		expect(commandFor(command, 'pnpm')).toMatch(/^pnpm dlx shadcn-svelte/);
		expect(commandFor(command, 'yarn')).toMatch(/^yarn dlx shadcn-svelte/);
		expect(commandFor(command, 'bun')).toMatch(/^bunx --bun shadcn-svelte/);
	});

	test('the sitemap lists the blocks page and every block', async () => {
		const response = await GET({} as Parameters<typeof GET>[0]);
		const xml = await response.text();
		expect(xml).toMatch(/<loc>[^<]*\/blocks<\/loc>/);
		for (const block of BLOCKS) {
			expect(xml).toContain(`/blocks/${block.name}</loc>`);
		}
	});
});
