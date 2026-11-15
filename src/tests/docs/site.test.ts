import { describe, expect, test } from 'vitest';
import { commandFor } from '#lib/docs/package-manager.svelte.js';

describe('site', () => {
	test('install commands use each package manager’s one-off runner', () => {
		const command = 'npx shadcn-svelte@latest add https://example.com/r/map.json';
		expect(commandFor(command, 'npm')).toBe(command);
		expect(commandFor(command, 'pnpm')).toMatch(/^pnpm dlx shadcn-svelte/);
		expect(commandFor(command, 'yarn')).toMatch(/^yarn dlx shadcn-svelte/);
		expect(commandFor(command, 'bun')).toMatch(/^bunx --bun shadcn-svelte/);
	});
});
