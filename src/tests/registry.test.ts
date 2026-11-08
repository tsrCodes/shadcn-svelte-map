import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, posix } from 'node:path';
import { parse } from 'svelte/compiler';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { BLOCKS } from '../routes/blocks/catalog.js';

interface RegistryFile {
	path: string;
	type: string;
	target?: string;
}

interface RegistryItem {
	name: string;
	type: 'registry:ui' | 'registry:block';
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies: string[];
	files: RegistryFile[];
}

const registry: { items: RegistryItem[] } = JSON.parse(readFileSync('registry.json', 'utf8'));
const repoDeps: Record<string, string> = JSON.parse(
	readFileSync('package.json', 'utf8')
).devDependencies;

const UI_DIR = 'src/lib/registry/ui';
const UI_PREFIX = '#lib/registry/ui/';
const UTILS = '#lib/utils.js';
const LOCAL = 'local:';
/** Imports every Svelte project already has, so items need not declare them. */
const BUILT_IN = /^svelte(\/|$)/;
/** Type-only packages whose types come from a dev dependency. */
const TYPE_PACKAGES: Record<string, string> = { geojson: '@types/geojson' };
/** Shipped on purpose with a lower floor than the repo uses. */
const FLOOR_ONLY = new Set(['svelte']);
/** Blocks stay small: registry ui, utils, icons, GeoJSON types and their own folder. */
const BLOCK_ALLOWED = [
	/^#lib\/registry\/ui\//,
	/^#lib\/utils\.js$/,
	/^@lucide\/svelte\//,
	/^geojson$/,
	/^\.\//
];

/** Script source of a file: the whole file for TypeScript, both script blocks for Svelte. */
function scriptOf(path: string): string {
	const source = readFileSync(path, 'utf8');
	if (!path.endsWith('.svelte')) return source;
	const ast = parse(source, { modern: true });
	return [ast.module, ast.instance]
		.filter((script) => script != null)
		.map((script) =>
			source.slice(script.start, script.end).replace(/^<script[^>]*>|<\/script>$/g, '')
		)
		.join('\n');
}

/** Every module a file imports or re-exports, static or dynamic, without `?query`. */
function importsOf(path: string): string[] {
	const info = ts.preProcessFile(scriptOf(path), true, true);
	return [...new Set(info.importedFiles.map((file) => file.fileName.split('?')[0]))];
}

/** `@scope/name/deep` → `@scope/name`, `name/deep` → `name`. */
function packageName(specifier: string): string {
	const parts = specifier.split('/');
	return parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
}

/** `name@^1.2.3` → [`name`, `^1.2.3`], keeping a leading scope `@`. */
function splitDep(dep: string): [string, string] {
	const at = dep.lastIndexOf('@');
	return at > 0 ? [dep.slice(0, at), dep.slice(at + 1)] : [dep, ''];
}

function declares(deps: string[] | undefined, name: string): boolean {
	return (deps ?? []).some((dep) => splitDep(dep)[0] === name);
}

/** TypeScript sources are imported as `.js`. */
function resolvesTo(path: string, files: Set<string>): boolean {
	return files.has(path) || (path.endsWith('.js') && files.has(path.replace(/\.js$/, '.ts')));
}

function filesOf(item: RegistryItem): Set<string> {
	return new Set(item.files.map((file) => normalize(file.path)));
}

function localDeps(item: RegistryItem): string[] {
	return item.registryDependencies
		.filter((dep) => dep.startsWith(LOCAL))
		.map((dep) => dep.slice(LOCAL.length));
}

function uiItemOf(specifier: string): string {
	return specifier.slice(UI_PREFIX.length).split('/')[0];
}

function checkUiImport(item: RegistryItem, file: string, specifier: string): string[] {
	const name = uiItemOf(specifier);
	if (name === item.name) return [];
	const local = registry.items.find((other) => other.name === name);
	if (local && localDeps(item).includes(name)) {
		const target = normalize(join(UI_DIR, specifier.slice(UI_PREFIX.length)));
		return resolvesTo(target, filesOf(local)) ? [] : [`${file}: ${specifier} is not in ${name}`];
	}
	return item.registryDependencies.includes(name)
		? []
		: [`${file}: ${specifier} needs registry dependency ${name}`];
}

function checkPackageImport(item: RegistryItem, file: string, specifier: string): string[] {
	if (BUILT_IN.test(specifier)) return [];
	const name = packageName(specifier);
	const typePackage = TYPE_PACKAGES[name];
	if (typePackage) {
		return declares(item.devDependencies, typePackage)
			? []
			: [`${file}: ${specifier} needs dev dependency ${typePackage}`];
	}
	return declares(item.dependencies, name)
		? []
		: [`${file}: ${specifier} needs dependency ${name}`];
}

/** Problems with one import of one file; empty when it resolves. */
function checkImport(item: RegistryItem, file: string, specifier: string): string[] {
	if (specifier.startsWith('.')) {
		const target = normalize(join(dirname(file), specifier));
		return resolvesTo(target, filesOf(item))
			? []
			: [`${file}: ${specifier} is not a file of ${item.name}`];
	}
	if (specifier === UTILS) return [];
	if (specifier.startsWith(UI_PREFIX)) return checkUiImport(item, file, specifier);
	if (specifier.startsWith('#') || specifier.startsWith('$')) {
		return [`${file}: ${specifier} is an app alias users do not have`];
	}
	return checkPackageImport(item, file, specifier);
}

function listFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => normalize(join(entry.parentPath, entry.name)));
}

const blocks = registry.items.filter((item) => item.type === 'registry:block');

describe('registry.json', () => {
	test('lists only files that exist', () => {
		const missing = registry.items.flatMap((item) =>
			item.files.filter((file) => !existsSync(file.path)).map((file) => file.path)
		);
		expect(missing).toEqual([]);
	});

	test('every import in an item resolves to a declared file or dependency', () => {
		const problems = registry.items.flatMap((item) =>
			item.files.flatMap((file) =>
				importsOf(file.path).flatMap((specifier) => checkImport(item, file.path, specifier))
			)
		);
		expect(problems).toEqual([]);
	});

	test('blocks import only registry ui, utils, icons, GeoJSON types and their own folder', () => {
		const problems = blocks.flatMap((item) =>
			item.files.flatMap((file) =>
				importsOf(file.path)
					.filter((specifier) => !BLOCK_ALLOWED.some((pattern) => pattern.test(specifier)))
					.map((specifier) => `${file.path}: ${specifier}`)
			)
		);
		expect(problems).toEqual([]);
	});

	test('declares no registry dependency an item does not import', () => {
		const unused = registry.items.flatMap((item) => {
			const imported = new Set(
				item.files.flatMap((file) =>
					importsOf(file.path)
						.filter((specifier) => specifier.startsWith(UI_PREFIX))
						.map(uiItemOf)
				)
			);
			return item.registryDependencies
				.map((dep) => dep.replace(LOCAL, ''))
				.filter((name) => !imported.has(name))
				.map((name) => `${item.name}: ${name}`);
		});
		expect(unused).toEqual([]);
	});

	test('registry dependencies name items that exist here or upstream', () => {
		const unknown = registry.items.flatMap((item) =>
			item.registryDependencies
				.filter((dep) =>
					dep.startsWith(LOCAL)
						? !registry.items.some((other) => other.name === dep.slice(LOCAL.length))
						: !existsSync(join(UI_DIR, dep))
				)
				.map((dep) => `${item.name}: ${dep}`)
		);
		expect(unknown).toEqual([]);
	});

	test('npm dependencies use the ranges the repo builds with', () => {
		const mismatched = registry.items.flatMap((item) =>
			[...(item.dependencies ?? []), ...(item.devDependencies ?? [])]
				.map(splitDep)
				.filter(([name, range]) => !FLOOR_ONLY.has(name) && repoDeps[name] !== range)
				.map(([name, range]) => `${item.name}: ${name}@${range}, repo has ${repoDeps[name]}`)
		);
		expect(mismatched).toEqual([]);
	});

	test('ships every file of the map, place search and every block', () => {
		const listed = new Set(registry.items.flatMap((item) => [...filesOf(item)]));
		const shipped = [
			join(UI_DIR, 'map'),
			join(UI_DIR, 'place-autocomplete'),
			'src/lib/registry/blocks'
		].flatMap(listFiles);
		expect(shipped.filter((path) => !listed.has(path))).toEqual([]);
	});

	test('installs each block into its own folder', () => {
		const misplaced = blocks.flatMap((item) =>
			item.files
				.filter((file) => file.target !== posix.join(item.name, posix.basename(file.path)))
				.map((file) => file.path)
		);
		expect(misplaced).toEqual([]);
	});

	test('has one block item per block in the preview catalog', () => {
		expect(blocks.map((item) => item.name).toSorted()).toEqual(
			BLOCKS.map((block) => block.name).toSorted()
		);
	});
});
