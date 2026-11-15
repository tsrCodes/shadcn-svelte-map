import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import logoSvg from '#lib/assets/logo.svg?raw';

const WIDTH = 1200;
const HEIGHT = 628;
const LONG_TITLE = 20;

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown> } };

function el(type: string, style: Record<string, unknown>, children?: unknown): Node {
	return { type, props: { style, children } };
}

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600 }[]> | undefined;

function loadFonts() {
	const require = createRequire(import.meta.url);
	// Satori reads WOFF, not WOFF2. Resolve the package once and fail with a clear message.
	const fontDir = join(dirname(require.resolve('@fontsource/inter/package.json')), 'files');
	const file = async (weight: number) => {
		const path = join(fontDir, `inter-latin-${weight}-normal.woff`);
		try {
			return await readFile(path);
		} catch (cause) {
			throw new Error(`Open Graph images need ${path} from @fontsource/inter`, { cause });
		}
	};
	fonts ??= Promise.all([file(400), file(600)]).then(([normal, semibold]) => [
		{ name: 'Inter', data: normal, weight: 400 as const },
		{ name: 'Inter', data: semibold, weight: 600 as const }
	]);
	return fonts;
}

const LOGO = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;
const LOGO_SIZE = 96;

/** The Open Graph image of a page as a PNG, set in Inter. */
export async function renderOgImage(title: string, description: string): Promise<Buffer> {
	const line = { position: 'absolute', display: 'flex', borderColor: '#44403c' };
	const tree = el(
		'div',
		{
			display: 'flex',
			width: '100%',
			height: '100%',
			backgroundColor: 'black',
			color: 'white',
			fontFamily: 'Inter'
		},
		[
			el('div', {
				...line,
				top: 0,
				bottom: 0,
				left: 64,
				width: 1,
				borderLeft: '1px dashed #44403c'
			}),
			el('div', {
				...line,
				top: 0,
				bottom: 0,
				right: 64,
				width: 1,
				borderLeft: '1px dashed #44403c'
			}),
			el('div', { ...line, left: 0, right: 0, top: 64, height: 1, borderTop: '1px solid #44403c' }),
			el('div', {
				...line,
				left: 0,
				right: 0,
				bottom: 64,
				height: 1,
				borderTop: '1px solid #44403c'
			}),
			{
				type: 'img',
				props: {
					src: LOGO,
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					style: { position: 'absolute', bottom: 80, right: 80 }
				}
			},
			el(
				'div',
				{
					position: 'absolute',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					top: 128,
					bottom: 128,
					left: 128,
					width: 896
				},
				[
					el(
						'div',
						{
							display: 'flex',
							flexGrow: 1,
							flexDirection: 'column',
							justifyContent: 'center',
							fontWeight: 600,
							fontSize: title.length > LONG_TITLE ? 64 : 80,
							letterSpacing: '-0.04em',
							lineHeight: 1.1
						},
						title
					),
					el(
						'div',
						{ display: 'flex', flexGrow: 1, fontSize: 40, lineHeight: 1.5, color: '#a8a29e' },
						description
					)
				]
			)
		]
	);
	const svg = await satori(tree as Parameters<typeof satori>[0], {
		width: WIDTH,
		height: HEIGHT,
		fonts: await loadFonts()
	});
	return new Resvg(svg).render().asPng();
}
