import type { Feature, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONStoreFeatures, IdStrategy } from 'terra-draw';
import { toHex, type ThemeColors } from '#lib/registry/ui/map/theme.svelte.js';

/** Shapes a user can draw. */
export type DrawMode = 'point' | 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'freehand';

/** What the pointer does on the map: draw a shape, pick one to edit, or nothing. */
export type DrawTool = DrawMode | 'select' | 'none';

export type DrawGeometry = Point | LineString | Polygon;

/** A finished drawing, as plain GeoJSON. `properties.mode` says how it was drawn. */
export type DrawFeature = Feature<DrawGeometry, { mode: DrawMode }> & { id: string | number };

export const DRAW_MODES: readonly DrawMode[] = [
	'point',
	'polyline',
	'polygon',
	'rectangle',
	'circle',
	'freehand'
];

/** terra-draw names its line mode `linestring`; we call it `polyline`. */
const ENGINE_MODES: Record<DrawTool, string> = {
	point: 'point',
	polyline: 'linestring',
	polygon: 'polygon',
	rectangle: 'rectangle',
	circle: 'circle',
	freehand: 'freehand',
	select: 'select',
	// terra-draw's own idle mode: drawings stay, the pointer is left to the map.
	none: 'static'
};

const DRAW_MODE_BY_ENGINE: Record<string, DrawMode> = Object.fromEntries(
	DRAW_MODES.map((mode) => [ENGINE_MODES[mode], mode])
);

/** The terra-draw mode name for a tool. */
export function engineMode(tool: DrawTool): string {
	return ENGINE_MODES[tool];
}

type FeatureId = string | number;

/** A random UUID v4. `getRandomValues` works on plain http too, unlike `randomUUID`. */
function randomId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * New drawings get UUIDs; saved ones keep whatever string or number id they had.
 * terra-draw's own strategy accepts UUIDs only, which would reject ids from a database.
 */
export const DRAW_ID_STRATEGY: IdStrategy<FeatureId> = {
	getId: randomId,
	isValidId: (id) => (typeof id === 'string' ? id.length > 0 : Number.isFinite(id))
};

/** A deep copy of nested coordinate arrays; also works on reactive proxies. */
function copyCoordinates<T>(value: T): T {
	return (Array.isArray(value) ? value.map(copyCoordinates) : value) as T;
}

/**
 * Saved drawings in the form terra-draw loads, with its mode names. Geometry is copied,
 * so the engine's edits never reach the caller's objects.
 */
export function engineFeatures(features: readonly DrawFeature[]): GeoJSONStoreFeatures[] {
	return features.map((feature) => ({
		type: 'Feature',
		id: feature.id,
		geometry: {
			...feature.geometry,
			coordinates: copyCoordinates(feature.geometry.coordinates)
		} as DrawGeometry,
		properties: { mode: engineMode(feature.properties.mode) }
	}));
}

/** Properties terra-draw sets on helper features (vertices, midpoints, handles). */
const GUIDANCE_PROPERTIES = [
	'midPoint',
	'selectionPoint',
	'coordinatePoint',
	'snappingPoint',
	'closingPoint'
];

/**
 * Finished drawings from a terra-draw snapshot. Helper points and shapes still being
 * drawn are left out, and only `mode` is kept from terra-draw's properties.
 */
export function finishedFeatures(snapshot: readonly GeoJSONStoreFeatures[]): DrawFeature[] {
	return snapshot.flatMap((feature): DrawFeature[] => {
		const { properties, geometry, id } = feature;
		if (id === undefined || properties.currentlyDrawing) return [];
		if (GUIDANCE_PROPERTIES.some((name) => properties[name])) return [];
		const mode = DRAW_MODE_BY_ENGINE[String(properties.mode)];
		if (!mode) return [];
		return [{ type: 'Feature', id, geometry: geometry as DrawGeometry, properties: { mode } }];
	});
}

type Hex = `#${string}`;

/** Colours the drawing styles are built from, as terra-draw takes them. */
export interface DrawPalette {
	stroke: Hex;
	halo: Hex;
	selected: Hex;
}

export function drawPalette(colors: ThemeColors): DrawPalette {
	return {
		stroke: toHex(colors.primary),
		halo: toHex(colors.background),
		selected: toHex(colors.chart1)
	};
}

const LINE_WIDTH = 2;
const POINT_WIDTH = 6;
const HANDLE_WIDTH = 4;
const FILL_OPACITY = 0.15;

function vertexHandles(palette: DrawPalette) {
	return {
		coordinatePointColor: palette.halo,
		coordinatePointWidth: HANDLE_WIDTH,
		coordinatePointOutlineColor: palette.stroke,
		coordinatePointOutlineWidth: LINE_WIDTH
	};
}

function closingHandles(palette: DrawPalette) {
	return {
		closingPointColor: palette.halo,
		closingPointWidth: HANDLE_WIDTH,
		closingPointOutlineColor: palette.stroke,
		closingPointOutlineWidth: LINE_WIDTH
	};
}

function area(palette: DrawPalette) {
	return {
		fillColor: palette.stroke,
		fillOpacity: FILL_OPACITY,
		outlineColor: palette.stroke,
		outlineWidth: LINE_WIDTH,
		...vertexHandles(palette)
	};
}

/** Styles for every terra-draw mode, from the theme. Keys are terra-draw mode names. */
export function drawStyles(palette: DrawPalette) {
	return {
		point: {
			pointColor: palette.stroke,
			pointWidth: POINT_WIDTH,
			pointOutlineColor: palette.halo,
			pointOutlineWidth: LINE_WIDTH
		},
		linestring: {
			lineStringColor: palette.stroke,
			lineStringWidth: LINE_WIDTH + 1,
			...vertexHandles(palette),
			...closingHandles(palette)
		},
		polygon: { ...area(palette), ...closingHandles(palette) },
		rectangle: area(palette),
		circle: area(palette),
		freehand: { ...area(palette), ...closingHandles(palette) },
		select: {
			selectedPointColor: palette.selected,
			selectedPointWidth: POINT_WIDTH,
			selectedPointOutlineColor: palette.halo,
			selectedPointOutlineWidth: LINE_WIDTH,
			selectedLineStringColor: palette.selected,
			selectedLineStringWidth: LINE_WIDTH + 1,
			selectedPolygonColor: palette.selected,
			selectedPolygonFillOpacity: FILL_OPACITY * 2,
			selectedPolygonOutlineColor: palette.selected,
			selectedPolygonOutlineWidth: LINE_WIDTH,
			selectionPointColor: palette.halo,
			selectionPointWidth: HANDLE_WIDTH,
			selectionPointOutlineColor: palette.selected,
			selectionPointOutlineWidth: LINE_WIDTH,
			midPointColor: palette.selected,
			midPointWidth: HANDLE_WIDTH - 1,
			midPointOutlineColor: palette.halo,
			midPointOutlineWidth: 1
		}
	};
}

export type DrawStyles = ReturnType<typeof drawStyles>;

/** What a selected feature of each mode can do in select mode. Keys are terra-draw mode names. */
export const SELECT_FLAGS = {
	point: { feature: { draggable: true } },
	linestring: {
		feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } }
	},
	polygon: {
		feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } }
	},
	freehand: { feature: { draggable: true, coordinates: { draggable: true } } },
	rectangle: { feature: { draggable: true, coordinates: { resizable: 'opposite' as const } } },
	circle: { feature: { draggable: true, coordinates: { resizable: 'center-fixed' as const } } }
};
