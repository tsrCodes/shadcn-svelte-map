import { defineConfig } from '@playwright/test';

// Headless Chromium needs SwiftShader for the WebGL 2 context MapLibre renders with.
const WEBGL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	use: { launchOptions: { args: WEBGL_ARGS } },
	webServer: [
		{ command: 'npm run build && npm run preview', port: 4173 },
		{ command: 'npx vite dev --port 5174 --strictPort', port: 5174 }
	],
	projects: [
		{ name: 'build', use: { baseURL: 'http://localhost:4173' } },
		{ name: 'dev', use: { baseURL: 'http://localhost:5174' } }
	]
});
