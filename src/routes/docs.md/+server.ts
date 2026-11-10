import { markdownResponse } from '#lib/docs/markdown-response.server.js';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => markdownResponse('');
