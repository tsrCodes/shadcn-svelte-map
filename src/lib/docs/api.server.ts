import { parse as parseSvelte } from 'svelte/compiler';
import ts from 'typescript';

/** One prop of a component, read from its `Props` interface and its `$props()` call. */
export interface ApiProp {
	name: string;
	type: string;
	description: string;
	/** Default from the `$props()` destructure, as written in the source. */
	default?: string;
	bindable: boolean;
	required: boolean;
	kind: 'prop' | 'event' | 'snippet';
}

export interface ApiEntry {
	/** File name without `.svelte`, e.g. `map-marker`. */
	file: string;
	/** Exported name, e.g. `MapMarker`. */
	name: string;
	props: ApiProp[];
	/** Element whose HTML attributes are also accepted, e.g. `div`. */
	restElement?: string;
}

const SOURCES = import.meta.glob<string>(
	['/src/lib/registry/ui/map/*.svelte', '/src/lib/registry/ui/place-autocomplete/*.svelte'],
	{ query: '?raw', import: 'default', eager: true }
);

const ELEMENT_TYPES: Record<string, string> = {
	HTMLDivElement: 'div',
	HTMLSpanElement: 'span',
	HTMLButtonElement: 'button',
	HTMLInputElement: 'input'
};

/** Source offsets the Svelte parser adds to a script's program (missing from its types). */
function offsets(node: object): [number, number] {
	const { start, end } = node as { start?: unknown; end?: unknown };
	if (typeof start !== 'number' || typeof end !== 'number') {
		throw new Error('The Svelte parser gave a script without source offsets');
	}
	return [start, end];
}

/** The module and instance scripts of a component, found by the Svelte parser itself. */
function scripts(source: string): string {
	const ast = parseSvelte(source, { modern: true });
	return [ast.module, ast.instance]
		.flatMap((script) => (script ? [source.slice(...offsets(script.content))] : []))
		.join('\n');
}

const BARRELS = import.meta.glob<string>(
	['/src/lib/registry/ui/map/index.ts', '/src/lib/registry/ui/place-autocomplete/index.ts'],
	{ query: '?raw', import: 'default', eager: true }
);

/** Exported names by file, from `export { default as Name } from './file.svelte'` (either quote). */
const EXPORT_NAMES = new Map(
	Object.values(BARRELS).flatMap((barrel) =>
		[...barrel.matchAll(/default as (\w+)[^}]*\}\s*from ['"]\.\/([\w-]+)\.svelte['"]/g)].map(
			(match) => [match[2], match[1]] as const
		)
	)
);

function pascal(file: string): string {
	return file.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

/** The name users import, falling back to the file name in PascalCase. */
function exportName(file: string): string {
	return EXPORT_NAMES.get(file) ?? pascal(file);
}

function parse(code: string): ts.SourceFile {
	return ts.createSourceFile('component.ts', code, ts.ScriptTarget.Latest, true);
}

/** Every interface in a file, nested ones included. */
function interfaces(file: ts.SourceFile): Map<string, ts.InterfaceDeclaration> {
	const found = new Map<string, ts.InterfaceDeclaration>();
	const visit = (node: ts.Node) => {
		if (ts.isInterfaceDeclaration(node)) found.set(node.name.text, node);
		node.forEachChild(visit);
	};
	visit(file);
	return found;
}

const PARSED = new Map<string, ts.SourceFile>();

function parsedFile(path: string): ts.SourceFile | undefined {
	const source = SOURCES[path];
	if (source === undefined) return undefined;
	let file = PARSED.get(path);
	if (!file) {
		file = parse(scripts(source));
		PARSED.set(path, file);
	}
	return file;
}

/** The source path a relative import points at, e.g. `./map-shape.svelte`. */
function resolveImport(fromPath: string, specifier: string): string | undefined {
	if (!specifier.startsWith('.')) return undefined;
	const base = fromPath.slice(0, fromPath.lastIndexOf('/'));
	const parts = `${base}/${specifier}`.split('/');
	const resolved: string[] = [];
	for (const part of parts) {
		if (part === '..') resolved.pop();
		else if (part !== '.') resolved.push(part);
	}
	const path = resolved.join('/');
	return SOURCES[path] === undefined ? undefined : path;
}

/** The source path of the file a node was parsed from. */
function declaringPath(node: ts.Node): string | undefined {
	const file = node.getSourceFile();
	for (const [path, parsed] of PARSED) if (parsed === file) return path;
	return undefined;
}

/** An interface by name as seen from a file: declared there, or imported into it. */
function findInterface(name: string, fromPath: string): ts.InterfaceDeclaration | undefined {
	const file = parsedFile(fromPath);
	if (!file) return undefined;
	const local = interfaces(file).get(name);
	if (local) return local;
	for (const statement of file.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const bindings = statement.importClause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		const imported = bindings.elements.find((element) => element.name.text === name);
		if (!imported) continue;
		const target = resolveImport(fromPath, (statement.moduleSpecifier as ts.StringLiteral).text);
		const original = imported.propertyName?.text ?? name;
		return target ? findInterface(original, target) : undefined;
	}
	return undefined;
}

function jsDoc(node: ts.Node): string {
	return ts
		.getJSDocCommentsAndTags(node)
		.filter(ts.isJSDoc)
		.map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? '')
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function kindOf(name: string, type: string): ApiProp['kind'] {
	if (/^Snippet\b/.test(type) || /\bSnippet</.test(type)) return 'snippet';
	if (/^on[a-z]/.test(name)) return 'event';
	return 'prop';
}

interface Collected {
	members: ts.PropertySignature[];
	restElement?: string;
	/** Component whose props are forwarded, from `ComponentProps<typeof X>`. */
	forwarded: string[];
	omitted: Set<string>;
}

function omittedKeys(type: ts.TypeNode | undefined): string[] {
	if (!type) return [];
	if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) return [type.literal.text];
	if (ts.isUnionTypeNode(type)) return type.types.flatMap(omittedKeys);
	return [];
}

function collectHeritage(
	type: ts.TypeNode | ts.ExpressionWithTypeArguments,
	out: Collected,
	fromPath: string
): void {
	const name = ts.isExpressionWithTypeArguments(type)
		? type.expression.getText()
		: ts.isTypeReferenceNode(type)
			? type.typeName.getText()
			: '';
	const args =
		ts.isExpressionWithTypeArguments(type) || ts.isTypeReferenceNode(type)
			? (type.typeArguments ?? [])
			: [];
	if (name === 'Omit' && args[0]) {
		for (const key of omittedKeys(args[1])) out.omitted.add(key);
		collectHeritage(args[0], out, fromPath);
		return;
	}
	if (/Attributes$/.test(name)) {
		const element = args[0]?.getText();
		out.restElement =
			(element && ELEMENT_TYPES[element]) ?? (name === 'HTMLButtonAttributes' ? 'button' : 'div');
		return;
	}
	if (name === 'ComponentProps' && args[0]) {
		out.forwarded.push(args[0].getText().replace(/^typeof\s+/, ''));
		return;
	}
	const parent = findInterface(name, fromPath);
	if (parent) collect(parent, out, fromPath);
}

function collect(node: ts.InterfaceDeclaration, out: Collected, fromPath: string): void {
	const path = declaringPath(node) ?? fromPath;
	for (const clause of node.heritageClauses ?? []) {
		for (const type of clause.types) collectHeritage(type, out, path);
	}
	for (const member of node.members) {
		if (ts.isPropertySignature(member)) out.members.push(member);
	}
}

interface Defaults {
	values: Map<string, string>;
	bindable: Set<string>;
}

/** A prop's public name, whatever quotes it is written with: `'aria-label'` → `aria-label`. */
function propertyName(node: ts.PropertyName | ts.BindingName): string {
	if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node))
		return node.text;
	return node.getText();
}

function isPropsCall(node: ts.Expression | undefined): boolean {
	return node !== undefined && ts.isCallExpression(node) && node.expression.getText() === '$props';
}

/** Names bound to the whole props object, as in `let props = $props()`. */
function propsObjects(file: ts.SourceFile): Set<string> {
	const names = new Set<string>();
	const visit = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			isPropsCall(node.initializer)
		) {
			names.add(node.name.text);
		}
		node.forEachChild(visit);
	};
	visit(file);
	return names;
}

function defaultsOf(file: ts.SourceFile): Defaults {
	const values = new Map<string, string>();
	const bindable = new Set<string>();
	const objects = propsObjects(file);
	// Defaults sit in a destructure of `$props()`, or of a variable that holds it.
	const isPropsSource = (init: ts.Expression | undefined) =>
		isPropsCall(init) || (init !== undefined && ts.isIdentifier(init) && objects.has(init.text));
	const visit = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isObjectBindingPattern(node.name) &&
			isPropsSource(node.initializer)
		) {
			for (const element of node.name.elements) {
				if (element.dotDotDotToken) continue;
				const name = propertyName(element.propertyName ?? element.name);
				const init = element.initializer;
				if (!init) continue;
				const bound = ts.isCallExpression(init) && init.expression.getText() === '$bindable';
				if (bound) bindable.add(name);
				const value = bound ? init.arguments[0]?.getText() : init.getText();
				if (value !== undefined && value !== 'undefined') values.set(name, value);
			}
		}
		node.forEachChild(visit);
	};
	visit(file);
	return { values, bindable };
}

/** Defaults and bindables of a component's source, for tests and tools. */
export function defaultsFromSource(source: string): Defaults {
	return defaultsOf(parse(scripts(source)));
}

function fileOf(component: string): string | undefined {
	return Object.keys(SOURCES).find((path) => path.endsWith(`/${component}.svelte`));
}

const FILES_BY_EXPORT = new Map([...EXPORT_NAMES].map(([file, name]) => [name, file]));

/** The component file a local name refers to: a default `.svelte` import or a barrel export. */
function importedComponent(file: ts.SourceFile, name: string): string | undefined {
	for (const statement of file.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const clause = statement.importClause;
		const from = (statement.moduleSpecifier as ts.StringLiteral).text;
		if (clause?.name?.text === name) return /([^/]+)\.svelte$/.exec(from)?.[1];
		const bindings = clause?.namedBindings;
		if (!bindings || !ts.isNamedImports(bindings)) continue;
		const imported = bindings.elements.find((element) => element.name.text === name);
		if (imported) return FILES_BY_EXPORT.get(imported.propertyName?.text ?? name);
	}
	return undefined;
}

function readEntry(component: string, seen: Set<string>): ApiEntry | undefined {
	const path = fileOf(component);
	if (!path || seen.has(component)) return undefined;
	seen.add(component);
	const file = parsedFile(path);
	const props = file && interfaces(file).get('Props');
	if (!props) return undefined;
	const out: Collected = { members: [], forwarded: [], omitted: new Set() };
	collect(props, out, path);
	const { values, bindable } = defaultsOf(file);

	const own = new Map<string, ApiProp>();
	for (const member of out.members) {
		const name = propertyName(member.name);
		const type = member.type?.getText().replace(/\s+/g, ' ') ?? 'unknown';
		own.set(name, {
			name,
			type,
			description: jsDoc(member),
			default: values.get(name),
			bindable: bindable.has(name),
			required: !member.questionToken,
			kind: kindOf(name, type)
		});
	}
	for (const forwarded of out.forwarded) {
		const target = importedComponent(file, forwarded);
		const inner = target ? readEntry(target, seen) : undefined;
		for (const prop of inner?.props ?? []) {
			if (out.omitted.has(prop.name) || own.has(prop.name)) continue;
			own.set(prop.name, { ...prop, default: values.get(prop.name) ?? prop.default });
		}
		out.restElement ??= inner?.restElement;
	}
	return {
		file: component,
		name: exportName(component),
		props: [...own.values()],
		restElement: out.restElement
	};
}

/** The API of a component by file name, e.g. `map-marker`. */
export function getApiEntry(component: string): ApiEntry | undefined {
	return readEntry(component, new Set());
}

/** Every component file the docs can describe. */
export const API_COMPONENTS: string[] = Object.keys(SOURCES)
	.map((path) => /([^/]+)\.svelte$/.exec(path)?.[1] ?? '')
	.filter((name) => name && getApiEntry(name) !== undefined)
	.sort();

function cell(text: string): string {
	return text.replaceAll('|', '\\|');
}

function table(title: string, rows: ApiProp[]): string {
	if (!rows.length) return '';
	const lines = rows.map((prop) => {
		const notes = [prop.required ? 'Required.' : '', prop.bindable ? 'Bindable.' : '']
			.filter(Boolean)
			.join(' ');
		const fallback = prop.default ? `\`${cell(prop.default)}\`` : '';
		return `| \`${prop.name}\` | \`${cell(prop.type)}\` | ${fallback} | ${cell([prop.description, notes].filter(Boolean).join(' '))} |`;
	});
	return [
		`**${title}**`,
		'',
		'| Name | Type | Default | Description |',
		'| --- | --- | --- | --- |',
		...lines
	].join('\n');
}

/** The API tables of a component as markdown, for copied pages and `llms.txt`. */
export function apiMarkdown(component: string): string {
	const entry = getApiEntry(component);
	if (!entry) return '';
	const parts = [
		table(
			'Props',
			entry.props.filter((p) => p.kind === 'prop')
		),
		table(
			'Events',
			entry.props.filter((p) => p.kind === 'event')
		),
		table(
			'Snippets',
			entry.props.filter((p) => p.kind === 'snippet')
		),
		entry.restElement ? `Other attributes go to the underlying \`<${entry.restElement}>\`.` : ''
	];
	return [`### ${entry.name}`, ...parts].filter(Boolean).join('\n\n');
}
