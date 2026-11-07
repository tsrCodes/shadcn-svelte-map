/** `scheme://host` of the public Photon geocoder, for a CSP `connect-src`. */
export const PHOTON_ORIGIN = 'https://photon.komoot.io';

/** Base URL of the public Photon instance. Self-host it or use another for heavy traffic. */
export const PHOTON_URL: string = PHOTON_ORIGIN;

export type PlacePosition = [lng: number, lat: number];

/** One search result. */
export interface Place {
	/** Stable id from OpenStreetMap, such as `W783052052`. */
	id: string;
	name: string;
	/** Street, city and country, without repeating the name. */
	description: string;
	/** OpenStreetMap kind, such as `city`, `street` or `house`. */
	kind: string;
	position: PlacePosition;
	/** South-west and north-east corners, when the place covers an area. */
	bounds?: [PlacePosition, PlacePosition];
}

export interface PhotonQuery {
	query: string;
	/** Photon base URL. Defaults to the public instance. */
	baseUrl?: string;
	limit?: number;
	/** Language of the results; Photon knows `default`, `de`, `en` and `fr`. */
	lang?: string;
	/** Prefer results near this position. */
	near?: PlacePosition;
}

/** The search URL for a query. */
export function photonSearchUrl({
	query,
	baseUrl = PHOTON_URL,
	limit,
	lang,
	near
}: PhotonQuery): string {
	const url = new URL('api/', `${baseUrl.replace(/\/+$/, '')}/`);
	url.searchParams.set('q', query);
	if (limit !== undefined) url.searchParams.set('limit', String(limit));
	if (lang) url.searchParams.set('lang', lang);
	if (near) {
		url.searchParams.set('lon', String(near[0]));
		url.searchParams.set('lat', String(near[1]));
	}
	return url.toString();
}

type Properties = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function text(properties: Properties, key: string): string | undefined {
	const value = properties[key];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPosition(geometry: unknown): PlacePosition | null {
	if (!isRecord(geometry) || geometry.type !== 'Point') return null;
	const coordinates = geometry.coordinates;
	if (!Array.isArray(coordinates)) return null;
	const [lng, lat] = coordinates;
	return isFiniteNumber(lng) && isFiniteNumber(lat) ? [lng, lat] : null;
}

/** Photon's `extent` is `[west, north, east, south]`. */
function readBounds(extent: unknown): [PlacePosition, PlacePosition] | undefined {
	if (!Array.isArray(extent) || extent.length !== 4 || !extent.every(isFiniteNumber)) {
		return undefined;
	}
	const [west, north, east, south] = extent as number[];
	return [
		[west, south],
		[east, north]
	];
}

function readName(properties: Properties): string | undefined {
	const street = text(properties, 'street');
	const house = text(properties, 'housenumber');
	return text(properties, 'name') ?? (street && house ? `${street} ${house}` : street);
}

function readDescription(properties: Properties, name: string): string {
	const parts = ['street', 'district', 'city', 'state', 'country']
		.map((key) => text(properties, key))
		.filter((part): part is string => Boolean(part) && part !== name);
	return [...new Set(parts)].join(', ');
}

function readPlace(feature: unknown, index: number): Place | null {
	if (!isRecord(feature) || !isRecord(feature.properties)) return null;
	const properties = feature.properties;
	const position = readPosition(feature.geometry);
	const name = readName(properties);
	if (!position || !name) return null;
	const osmType = text(properties, 'osm_type');
	const osmId = properties.osm_id;
	return {
		id: osmType && isFiniteNumber(osmId) ? `${osmType}${osmId}` : `result-${index}`,
		name,
		description: readDescription(properties, name),
		kind: text(properties, 'type') ?? text(properties, 'osm_value') ?? 'place',
		position,
		bounds: readBounds(properties.extent)
	};
}

/**
 * Places from a Photon response. Features that are not points or have no name are
 * skipped. Throws when the response is not a GeoJSON feature collection.
 */
export function parsePhotonResponse(body: unknown): Place[] {
	if (!isRecord(body) || body.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
		throw new Error('The place search returned something other than GeoJSON.');
	}
	const places = body.features
		.map((feature, index) => readPlace(feature, index))
		.filter((place): place is Place => place !== null);
	// The same OpenStreetMap object can come back twice; keep the first.
	return places.filter(
		(place, index) => places.findIndex((other) => other.id === place.id) === index
	);
}
