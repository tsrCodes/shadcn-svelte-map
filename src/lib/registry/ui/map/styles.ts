import type { StyleSpecification } from 'maplibre-gl';

/** A style URL or an inline style object. */
export type StyleInput = string | StyleSpecification;

/** One style for every theme, or one per theme. */
export type MapStyle = StyleInput | { light: StyleInput; dark: StyleInput };

export type ResolvedTheme = 'light' | 'dark';

/** `scheme://host[:port]`, as a CSP source expects it. */
export type Origin = `${string}://${string}.${string}`;

/** OpenFreeMap serves its styles, sprites, glyphs and tiles from this one host. */
export const OPENFREEMAP_ORIGIN = 'https://tiles.openfreemap.org';

export const DEFAULT_MAP_STYLE: MapStyle = {
	light: `${OPENFREEMAP_ORIGIN}/styles/positron`,
	dark: `${OPENFREEMAP_ORIGIN}/styles/dark`
};

function isThemed(style: MapStyle): style is { light: StyleInput; dark: StyleInput } {
	return typeof style === 'object' && 'light' in style && 'dark' in style;
}

/**
 * Origins a CSP `connect-src` must allow for the given style URLs. Add the hosts of any
 * sprites, glyphs or tiles a custom style loads from elsewhere. Relative URLs are
 * same-origin, which `'self'` already covers, so they add nothing.
 */
export function styleOrigins(style: MapStyle): Origin[] {
	const styles = isThemed(style) ? [style.light, style.dark] : [style];
	const urls = styles.filter(
		(item): item is string => typeof item === 'string' && URL.canParse(item)
	);
	return [...new Set(urls.map((url) => new URL(url).origin as Origin))];
}

/** Pick the style to show for the current theme. */
export function resolveStyle(style: MapStyle, theme: ResolvedTheme): StyleInput {
	return isThemed(style) ? style[theme] : style;
}
