import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import type { ThemeRegistration } from 'shiki';

/**
 * Code colours as classes instead of inline styles, so code blocks render under the site's
 * strict CSP (`style-src-attr` allows no inline styles). Every colour either theme can paint
 * gets a class in `shiki-colors.css`; a test keeps that file in sync with this list.
 */
export const CODE_THEMES = { light: githubLight, dark: githubDark } as const;
export type CodeThemeMode = keyof typeof CODE_THEMES;

const PREFIX: Record<CodeThemeMode, string> = { light: 'sl', dark: 'sd' };
const FONT_STYLES = ['italic', 'bold', 'underline'] as const;
type FontStyle = (typeof FONT_STYLES)[number];

function normalise(colour: string): string {
	return colour.replace('#', '').toLowerCase();
}

function settingColours(theme: ThemeRegistration): string[] {
	const fromTokens = (theme.tokenColors ?? []).flatMap((rule) => {
		const foreground = rule.settings?.foreground;
		return foreground ? [foreground] : [];
	});
	const editor = theme.colors?.['editor.foreground'];
	return [...fromTokens, ...(editor ? [editor] : []), ...(theme.fg ? [theme.fg] : [])];
}

/** Every foreground colour a theme can give a token, lower-case hex without `#`. */
export function themeColours(mode: CodeThemeMode): string[] {
	return [...new Set(settingColours(CODE_THEMES[mode]).map(normalise))].sort();
}

/** The class for one token colour in one mode, e.g. `sl-24292e`. */
export function colourClass(mode: CodeThemeMode, colour: string): string {
	return `${PREFIX[mode]}-${normalise(colour)}`;
}

/** The class for a font style in one mode, e.g. `sd-italic`. */
export function fontStyleClass(mode: CodeThemeMode, style: FontStyle): string {
	return `${PREFIX[mode]}-${style}`;
}

function fontRule(style: FontStyle): string {
	if (style === 'italic') return 'font-style: italic';
	if (style === 'bold') return 'font-weight: 700';
	return 'text-decoration: underline';
}

/** The stylesheet behind the colour classes: light by default, dark under `.dark`. */
export function codeThemeCss(): string {
	const lines = ['/* Generated from src/lib/docs/shiki-theme.ts. Do not edit. */'];
	for (const mode of ['light', 'dark'] as const) {
		const scope = mode === 'dark' ? '.dark ' : '';
		for (const colour of themeColours(mode)) {
			lines.push(`${scope}.shiki .${colourClass(mode, colour)} { color: #${colour}; }`);
		}
		for (const style of FONT_STYLES) {
			lines.push(`${scope}.shiki .${fontStyleClass(mode, style)} { ${fontRule(style)}; }`);
		}
	}
	return `${lines.join('\n')}\n`;
}

const COLOUR_KEYS: Record<string, CodeThemeMode> = {
	'--shiki-light': 'light',
	'--shiki-dark': 'dark'
};

const FONT_KEY = /^--shiki-(light|dark)-(?:font-style|font-weight|text-decoration)$/;

function isFontStyle(value: string): value is FontStyle {
	return (FONT_STYLES as readonly string[]).includes(value);
}

function fontClasses(mode: CodeThemeMode, value: string): string[] {
	const parts = value === '700' || value === 'bold' ? ['bold'] : value.split(/\s+/);
	return parts.filter(isFontStyle).map((part) => fontStyleClass(mode, part));
}

/** Turns a Shiki token's inline `style` into classes. Unknown declarations throw at build time. */
export function styleToClasses(style: string): string[] {
	const classes: string[] = [];
	for (const declaration of style.split(';')) {
		const separator = declaration.indexOf(':');
		if (separator < 0) continue;
		const key = declaration.slice(0, separator).trim();
		const value = declaration.slice(separator + 1).trim();
		if (!key || !value) continue;
		const colourMode = COLOUR_KEYS[key];
		const fontMode = FONT_KEY.exec(key)?.[1] as CodeThemeMode | undefined;
		if (colourMode) classes.push(colourClass(colourMode, value));
		else if (fontMode) classes.push(...fontClasses(fontMode, value));
		else throw new Error(`Unexpected code token style "${key}: ${value}"`);
	}
	return classes;
}
