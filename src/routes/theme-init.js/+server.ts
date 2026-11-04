import { createInitialModeExpression } from 'mode-watcher';
import type { RequestHandler } from './$types';

// Served as a same-origin file instead of an inline <script>, so the strict CSP needs
// no nonce or hash for it and prerendered pages work too.
export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(createInitialModeExpression(), {
		headers: { 'content-type': 'text/javascript; charset=utf-8' }
	});
