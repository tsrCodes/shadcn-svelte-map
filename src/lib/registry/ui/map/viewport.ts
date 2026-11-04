import type { LngLat } from 'maplibre-gl';

/** Camera position of the map. `center` is `[longitude, latitude]`. */
export interface MapViewport {
	center: [number, number];
	zoom: number;
	bearing: number;
	pitch: number;
}

interface CameraLike {
	center: LngLat;
	zoom: number;
	bearing: number;
	pitch: number;
}

const EPSILON = 1e-9;

export const DEFAULT_VIEWPORT: MapViewport = {
	center: [0, 20],
	zoom: 1.5,
	bearing: 0,
	pitch: 0
};

export function toViewport(camera: CameraLike): MapViewport {
	return {
		center: [camera.center.lng, camera.center.lat],
		zoom: camera.zoom,
		bearing: camera.bearing,
		pitch: camera.pitch
	};
}

function close(a: number, b: number): boolean {
	return Math.abs(a - b) < EPSILON;
}

export function sameViewport(a: MapViewport, b: MapViewport): boolean {
	return (
		close(a.center[0], b.center[0]) &&
		close(a.center[1], b.center[1]) &&
		close(a.zoom, b.zoom) &&
		close(a.bearing, b.bearing) &&
		close(a.pitch, b.pitch)
	);
}

/** Copy a viewport into a plain object, so reactive proxies never reach MapLibre. */
export function snapshotViewport(viewport: MapViewport): MapViewport {
	return {
		center: [viewport.center[0], viewport.center[1]],
		zoom: viewport.zoom,
		bearing: viewport.bearing,
		pitch: viewport.pitch
	};
}
