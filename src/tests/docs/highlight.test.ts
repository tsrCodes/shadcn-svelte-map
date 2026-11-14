import { describe, expect, test } from 'vitest';
import { assertHighlightMarkup, highlightCode } from '#lib/docs/highlight.js';
import { codeThemeCss, styleToClasses } from '#lib/docs/shiki-theme.js';

const SAMPLE = `<script lang="ts">
	import { Map, MapMarker } from '$lib/components/ui/map';
	let zoom = $state(3);
	// a comment
</script>

<Map class="h-96" viewport={{ center: [0, 0], zoom }}>
	<MapMarker lngLat={[2.35, 48.86]} aria-label="Paris" />
</Map>`;

function classesIn(html: string): string[] {
	return [...html.matchAll(/class="([^"]*)"/g)].flatMap((match) => match[1].split(/\s+/));
}

describe('code highlighting', () => {
	test('writes no inline styles, so code renders under a strict CSP', async () => {
		const html = await highlightCode(SAMPLE, 'svelte');
		expect(html).not.toMatch(/\sstyle=/);
	});

	test('every colour class has a rule in the generated stylesheet', async () => {
		const css = codeThemeCss();
		const html = [
			await highlightCode(SAMPLE, 'svelte'),
			await highlightCode('pnpm dlx shadcn-svelte@latest add ./r/map.json', 'bash'),
			await highlightCode('{ "name": "map", "files": [1, true, null] }', 'json')
		].join('');
		const tokenClasses = classesIn(html).filter((name) => /^s[ld]-/.test(name));
		expect(tokenClasses.length).toBeGreaterThan(0);
		expect(tokenClasses.filter((name) => !css.includes(`.${name} `))).toEqual([]);
	});

	test('shiki-colors.css matches the themes', async () => {
		await expect(codeThemeCss()).toMatchFileSnapshot('../../lib/docs/shiki-colors.css');
	});

	test('an unknown or missing language falls back to plain text', async () => {
		for (const lang of ['cobol', null, undefined]) {
			const html = await highlightCode('plain <words>', lang);
			expect(html).toContain('plain &#x3C;words>');
			expect(html).not.toMatch(/\sstyle=/);
		}
	});

	test('only Shiki markup may reach {@html}', () => {
		expect(
			assertHighlightMarkup('<pre class="shiki"><code><span>ok</span></code></pre>')
		).toContain('ok');
		expect(() => assertHighlightMarkup('<img src=x onerror="alert(1)">')).toThrow(
			/Unexpected markup/
		);
		expect(() => assertHighlightMarkup('<span onclick="x()">a</span>')).toThrow(
			/Unexpected markup/
		);
	});

	test('unknown token styles fail loudly instead of being dropped', () => {
		expect(styleToClasses('--shiki-light:#24292E;--shiki-dark-font-style:italic')).toEqual([
			'sl-24292e',
			'sd-italic'
		]);
		expect(() => styleToClasses('color: red')).toThrow(/Unexpected code token style/);
	});
});
