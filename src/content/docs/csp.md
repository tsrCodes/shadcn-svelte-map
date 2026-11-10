---
title: Content Security Policy
description: Run the map under a strict Content Security Policy, with nothing loaded from a CDN.
---

The map is built to run under a strict policy: no inline scripts, no inline styles, no `eval`, and no code from a CDN. This site runs under that policy, and a test loads a map under it on every change.

## What the map needs

- **The worker** is a same-origin module worker, bundled with your app by Vite. `worker-src 'self'` covers it, with no `blob:`.
- **Styles, tiles, fonts and sprites** load from the basemap's host. For the default OpenFreeMap basemaps, that is `https://tiles.openfreemap.org`.
- **Place search** calls the Photon geocoder at `https://photon.komoot.io`, or the base URL you set.
- **Images**: MapLibre creates `data:` and `blob:` images for markers and sprites.

No component sets an inline `style` attribute. Positions and colours are set from JavaScript through the CSS object model, which a CSP allows.

## A policy for SvelteKit

SvelteKit can write the policy for you and add hashes or nonces for its own scripts. Set it in the `sveltekit()` options in `vite.config.ts`, which can import the map's TypeScript helpers:

```ts
import { DEFAULT_MAP_STYLE, styleOrigins } from './src/lib/components/ui/map/styles.js';
import { PHOTON_ORIGIN } from './src/lib/components/ui/place-autocomplete/photon.js';

sveltekit({
	csp: {
		mode: 'auto',
		directives: {
			'default-src': ['self'],
			'script-src': ['self'],
			'worker-src': ['self'],
			'style-src': ['self'],
			'img-src': ['self', 'data:', 'blob:'],
			'font-src': ['self'],
			'connect-src': ['self', ...styleOrigins(DEFAULT_MAP_STYLE), PHOTON_ORIGIN],
			'object-src': ['none'],
			'base-uri': ['self']
		}
	}
});
```

`styleOrigins` returns the hosts a style URL needs. Pass it every basemap you offer. If a custom style loads sprites, fonts or tiles from other hosts, add those too.

## Theme switching without inline script

mode-watcher normally adds a small inline script to the page head, so the right theme shows before the page loads. A strict `script-src` blocks it. Serve that script as a file instead:

```ts
// src/routes/theme-init.js/+server.ts
import { createInitialModeExpression } from 'mode-watcher';

export const prerender = true;

export const GET = () =>
	new Response(createInitialModeExpression(), {
		headers: { 'content-type': 'text/javascript; charset=utf-8' }
	});
```

Load it from `src/app.html` with `<script src="/theme-init.js"></script>`, and tell mode-watcher not to inject its own:

```svelte
<ModeWatcher disableHeadScriptInjection />
```

## The app shell

Two things in a default SvelteKit app break a strict `style-src`:

- `app.html` wraps the body in `<div style="display: contents">`. Use `<div class="contents">` instead.
- SvelteKit's route announcer has an inline style. Allow exactly that style by hash with `'style-src-attr': ['unsafe-hashes', 'sha256-…']`, rather than allowing every inline style.

## Checking it

Open the browser console on a page with a map. Any blocked request shows up as a CSP violation, with the directive that blocked it. You can also listen for them in a test:

```ts
document.addEventListener('securitypolicyviolation', (event) => {
	console.error(event.violatedDirective, event.blockedURI);
});
```
