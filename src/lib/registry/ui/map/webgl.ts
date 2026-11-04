/** MapLibre GL 6 renders with WebGL 2 only. */
export function supportsWebGL2(): boolean {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('webgl2');
	context?.getExtension('WEBGL_lose_context')?.loseContext();
	return context !== null;
}
