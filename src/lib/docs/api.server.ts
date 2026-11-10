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

function scripts(source: string): string {
	return [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
}

const BARRELS = import.meta.glob<string>(
	['/src/lib/registry/ui/map/index.ts', '/src/lib/registry/ui/place-autocomplete/index.ts'],
	{ query: '?raw', import: 'default', eager: true }
);

/** Exported names by file, from `export { default as Name } from './file.svelte'`. */
const EXPORT_NAMES = new Map(
	Object.values(BARRELS).flatMap((barrel) =>
		[...barrel.matchAll(/default as (\w+)[^}]*\}\s*from '\.\/([\w-]+)\.svelte'/g)].map(
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

function interfaces(file: ts.SourceFile): Map<string, ts.InterfaceDeclaration> {
	const found = new Map<string, ts.InterfaceDeclaration>();
	file.forEachChild((node) => {
		if (ts.isInterfaceDeclaration(node)) found.set(node.name.text, node);
	});
	return found;
}

const ALL_INTERFACES = new Map<string, ts.InterfaceDeclaration>(
	Object.values(SOURCES).flatMap((source) => [...interfaces(parse(scripts(source)))])
);

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

function collectHeritage(type: ts.TypeNode | ts.ExpressionWithTypeArguments, out: Collected): void {
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
		collectHeritage(args[0], out);
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
	const parent = ALL_INTERFACES.get(name);
	if (parent) collect(parent, out);
}

function collect(node: ts.InterfaceDeclaration, out: Collected): void {
	for (const clause of node.heritageClauses ?? []) {
		for (const type of clause.types) collectHeritage(type, out);
	}
	for (const member of node.members) {
		if (ts.isPropertySignature(member)) out.members.push(member);
	}
}

interface Defaults {
	values: Map<string, string>;
	bindable: Set<string>;
}

function defaultsOf(file: ts.SourceFile): Defaults {
	const values = new Map<string, string>();
	const bindable = new Set<string>();
	const visit = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isObjectBindingPattern(node.name) &&
			node.initializer?.getText() === '$props()'
		) {
			for (const element of node.name.elements) {
				if (element.dotDotDotToken) continue;
				const name = (element.propertyName ?? element.name).getText().replace(/^'|'$/g, '');
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

function fileOf(component: string): string | undefined {
	return Object.keys(SOURCES).find((path) => path.endsWith(`/${component}.svelte`));
}

function importedFile(file: ts.SourceFile, name: string): string | undefined {
	for (const statement of file.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const clause = statement.importClause;
		if (clause?.name?.text !== name) continue;
		const from = (statement.moduleSpecifier as ts.StringLiteral).text;
		return /([^/]+)\.svelte$/.exec(from)?.[1];
	}
	return undefined;
}

function readEntry(component: string, seen: Set<string>): ApiEntry | undefined {
	const path = fileOf(component);
	if (!path || seen.has(component)) return undefined;
	seen.add(component);
	const file = parse(scripts(SOURCES[path]));
	const props = interfaces(file).get('Props');
	if (!props) return undefined;
	const out: Collected = { members: [], forwarded: [], omitted: new Set() };
	collect(props, out);
	const { values, bindable } = defaultsOf(file);

	const own = new Map<string, ApiProp>();
	for (const member of out.members) {
		const name = member.name.getText().replace(/^'|'$/g, '');
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
		const target = importedFile(file, forwarded);
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
