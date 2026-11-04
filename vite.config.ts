import { createHash } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { DEFAULT_MAP_STYLE, styleOrigins } from './src/lib/registry/ui/map/styles.js';

/**
 * SvelteKit's route announcer renders with this inline `style` attribute. The CSP allows
 * exactly this string by hash. Kit has no public API for it, so it is copied here; the
 * CSP end-to-end test fails if a Kit upgrade changes it.
 */
const KIT_ANNOUNCER_STYLE =
	'position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px';

function sha256(value: string): `sha256-${string}` {
	return `sha256-${createHash('sha256').update(value).digest('base64')}`;
}

// Headless Chromium needs SwiftShader for the WebGL 2 context MapLibre renders with.
const WEBGL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
	optimizeDeps: { include: ['maplibre-gl'] },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ runtime: 'nodejs24.x' }),
			// Strict policy: no inline script or style, no CDN. Kit adds nonces or hashes for its own
			// scripts. The map worker is a same-origin module worker, so `worker-src 'self'` is enough.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'worker-src': ['self'],
					'child-src': ['self'],
					'style-src': ['self'],
					// Allow exactly Kit's announcer style, not every inline style.
					'style-src-attr': ['unsafe-hashes', sha256(KIT_ANNOUNCER_STYLE)],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					// The default basemaps load styles, sprites, glyphs and tiles from these hosts.
					'connect-src': ['self', ...styleOrigins(DEFAULT_MAP_STYLE)],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright({ launchOptions: { args: WEBGL_ARGS } }),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
