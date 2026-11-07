import { error } from '@sveltejs/kit';
import { findBlock } from '../catalog.js';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const block = findBlock(params.name);
	if (!block) error(404, `No block named "${params.name}"`);
	return { block };
};
