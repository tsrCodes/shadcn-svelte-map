import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const REGISTRY_DIR = join(import.meta.dirname, '..', 'lib', 'registry');
const SOURCE_FILE = /\.(ts|svelte)$/;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((file) => SOURCE_FILE.test(file))
		.map((file) => join(dir, file));
}

function lineOf(source: string, offset: number): number {
	return source.slice(0, offset).split('\n').length;
}

/** Lines of `any` type nodes in TypeScript source, found with the compiler's own parser. */
function anyInTypeScript(source: string): number[] {
	const file = ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true);
	const lines: number[] = [];
	const visit = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.AnyKeyword) lines.push(lineOf(source, node.getStart(file)));
		ts.forEachChild(node, visit);
	};
	visit(file);
	return lines;
}

/** Lines of `any` type nodes anywhere in a Svelte component: scripts and template. */
function anyInSvelte(source: string): number[] {
	const lines: number[] = [];
	const visit = (value: unknown) => {
		if (Array.isArray(value)) {
			for (const item of value) visit(item);
			return;
		}
		if (!value || typeof value !== 'object') return;
		const node = value as { type?: unknown; start?: unknown };
		if (node.type === 'TSAnyKeyword' && typeof node.start === 'number') {
			lines.push(lineOf(source, node.start));
		}
		for (const child of Object.values(value)) visit(child);
	};
	visit(parse(source, { modern: true }));
	return lines.toSorted((a, b) => a - b);
}

function anyLines(file: string, source: string): number[] {
	return file.endsWith('.svelte') ? anyInSvelte(source) : anyInTypeScript(source);
}

describe('registry types', () => {
	test('the any scan finds every form of any', () => {
		const typescript = [
			'let a: any;',
			'const b = c as any;',
			'type D = Array<any>;',
			'type E = any[];',
			'function f(x: Record<string, any>) {}',
			'type G = Promise<any> | any;'
		].join('\n');
		expect(anyInTypeScript(typescript)).toEqual([1, 2, 3, 4, 5, 6, 6]);

		const svelte = '<script lang="ts">\n\tlet x: any = 1;\n</script>\n\n{(x as any).y}\n';
		expect(anyInSvelte(svelte)).toEqual([2, 5]);
	});

	test('pnpm check with no any in registry code', () => {
		const offenders = sourceFiles(REGISTRY_DIR).flatMap((file) =>
			anyLines(file, readFileSync(file, 'utf8')).map(
				(line) => `${relative(REGISTRY_DIR, file)}:${line}`
			)
		);
		expect(offenders).toEqual([]);
	});
});
