/** `[longitude, latitude]`, as GeoJSON stores a position. */
export type LngLatTuple = [number, number];

/** `[[west, south], [east, north]]`. */
export type LngLatBoundsTuple = [LngLatTuple, LngLatTuple];

/** Mean earth radius in metres. */
const EARTH_RADIUS = 6_371_008.8;
const DEFAULT_STEPS = 64;
const MIN_STEPS = 3;
/** Share of a segment treated as "on its end vertex" when splitting a line. */
const VERTEX_TOLERANCE = 1e-9;

/** Throws unless `steps` is a whole number of at least `min`. */
function assertSteps(steps: number, min: number, shape: string): void {
	if (!Number.isInteger(steps) || steps < min)
		throw new Error(`A ${shape} needs a whole number of steps, at least ${min}, got ${steps}.`);
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Great-circle distance between two positions, in metres. */
export function distanceMeters(from: LngLatTuple, to: LngLatTuple): number {
	const lat1 = toRadians(from[1]);
	const lat2 = toRadians(to[1]);
	const dLat = lat2 - lat1;
	const dLng = toRadians(to[0] - from[0]);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The position `distance` metres from `origin`, heading `bearing` degrees from north. */
function destination(origin: LngLatTuple, distance: number, bearing: number): LngLatTuple {
	const angle = distance / EARTH_RADIUS;
	const heading = toRadians(bearing);
	const lat1 = toRadians(origin[1]);
	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(angle) + Math.cos(lat1) * Math.sin(angle) * Math.cos(heading)
	);
	const dLng = Math.atan2(
		Math.sin(heading) * Math.sin(angle) * Math.cos(lat1),
		Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2)
	);
	return [origin[0] + toDegrees(dLng), toDegrees(lat2)];
}

/** A closed polygon ring that traces a circle of `radius` metres on the ground. */
export function circleRing(
	center: LngLatTuple,
	radius: number,
	steps = DEFAULT_STEPS
): LngLatTuple[] {
	if (!(radius >= 0)) throw new Error(`Circle radius must be 0 or more, got ${radius}.`);
	assertSteps(steps, MIN_STEPS, 'circle');
	const ring = Array.from({ length: steps }, (_, index) =>
		destination(center, radius, (index / steps) * 360)
	);
	return [...ring, ring[0]];
}

/** A closed polygon ring around the bounds, starting at the south-west corner. */
export function rectangleRing([[west, south], [east, north]]: LngLatBoundsTuple): LngLatTuple[] {
	return [
		[west, south],
		[east, south],
		[east, north],
		[west, north],
		[west, south]
	];
}

/** The ring with its first position repeated at the end, as GeoJSON polygons need. */
export function closeRing(ring: LngLatTuple[]): LngLatTuple[] {
	const first = ring[0];
	const last = ring.at(-1);
	if (!first || !last || (first[0] === last[0] && first[1] === last[1])) return [...ring];
	return [...ring, first];
}

/** Length of a line in metres. */
export function lineLength(line: LngLatTuple[]): number {
	let total = 0;
	for (let index = 1; index < line.length; index += 1) {
		total += distanceMeters(line[index - 1], line[index]);
	}
	return total;
}

export interface SplitLine {
	/** From the start to `point`. */
	done: LngLatTuple[];
	/** From `point` to the end. */
	rest: LngLatTuple[];
	/** Where the line was split. */
	point: LngLatTuple;
}

function lerp(from: LngLatTuple, to: LngLatTuple, t: number): LngLatTuple {
	return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

/** Split a line at `progress` (0 to 1) of its length on the ground. */
export function splitLine(line: LngLatTuple[], progress: number): SplitLine {
	if (line.length === 0) throw new Error('A line needs at least one position.');
	const share = Math.min(1, Math.max(0, progress));
	const total = lineLength(line);
	const first = line[0];
	const last = line[line.length - 1];
	if (total === 0 || share === 0) return { done: [first], rest: [...line], point: first };
	if (share === 1) return { done: [...line], rest: [last], point: last };

	const target = total * share;
	let walked = 0;
	for (let index = 1; index < line.length; index += 1) {
		const segment = distanceMeters(line[index - 1], line[index]);
		if (segment > 0 && walked + segment >= target) {
			const t = (target - walked) / segment;
			// Landing on a vertex: split there instead of adding a copy of it.
			if (t >= 1 - VERTEX_TOLERANCE) {
				const point = line[index];
				return { done: line.slice(0, index + 1), rest: line.slice(index), point };
			}
			const point = lerp(line[index - 1], line[index], t);
			return {
				done: [...line.slice(0, index), point],
				rest: [point, ...line.slice(index)],
				point
			};
		}
		walked += segment;
	}
	return { done: [...line], rest: [last], point: last };
}

/**
 * A curved line from `from` to `to`. At its middle it sits `curvature` times the
 * straight distance to the side. It crosses the antimeridian the short way, so the end
 * longitude may pass ±180, which MapLibre draws correctly.
 */
export function arcLine(
	from: LngLatTuple,
	to: LngLatTuple,
	curvature = 0.2,
	steps = DEFAULT_STEPS
): LngLatTuple[] {
	assertSteps(steps, 1, 'curve');
	const dLng = ((((to[0] - from[0]) % 360) + 540) % 360) - 180;
	const end: LngLatTuple = [from[0] + dLng, to[1]];
	const dLat = end[1] - from[1];
	// The middle of a quadratic curve sits halfway to its control point.
	const control: LngLatTuple = [
		(from[0] + end[0]) / 2 - dLat * curvature * 2,
		(from[1] + end[1]) / 2 + dLng * curvature * 2
	];
	return Array.from({ length: steps + 1 }, (_, index): LngLatTuple => {
		const t = index / steps;
		const a = (1 - t) ** 2;
		const b = 2 * (1 - t) * t;
		const c = t ** 2;
		return [a * from[0] + b * control[0] + c * end[0], a * from[1] + b * control[1] + c * end[1]];
	});
}

/**
 * Area enclosed by a ring on the ground, in square metres. The ring may be open or
 * closed and wind either way. Accurate for city- and field-sized shapes.
 */
export function ringArea(ring: LngLatTuple[]): number {
	const closed = closeRing(ring);
	if (closed.length < 4) return 0;
	let sum = 0;
	for (let index = 1; index < closed.length; index += 1) {
		const [lng1, lat1] = closed[index - 1];
		const [lng2, lat2] = closed[index];
		// The short way round, so an edge across the antimeridian is not read as 360° wide.
		const dLng = ((((lng2 - lng1) % 360) + 540) % 360) - 180;
		sum += toRadians(dLng) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
	}
	return Math.abs((sum * EARTH_RADIUS ** 2) / 2);
}

/** Area of a polygon in square metres: its outer ring minus its holes, never below 0. */
export function polygonArea(rings: LngLatTuple[][]): number {
	const [outer, ...holes] = rings;
	if (!outer) return 0;
	const area = holes.reduce((rest, hole) => rest - ringArea(hole), ringArea(outer));
	return Math.max(0, area);
}

/** True when `point` lies inside `ring`. Points exactly on an edge may go either way. */
function insideRing([x, y]: LngLatTuple, ring: LngLatTuple[]): boolean {
	let inside = false;
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
		const [xi, yi] = ring[index];
		const [xj, yj] = ring[previous];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

/** True when `point` lies inside the polygon's outer ring and outside all its holes. */
export function pointInPolygon(point: LngLatTuple, rings: LngLatTuple[][]): boolean {
	const [outer, ...holes] = rings;
	if (!outer || !insideRing(point, outer)) return false;
	return !holes.some((hole) => insideRing(point, hole));
}

/** Average of a ring's corners, a good label spot for convex shapes. */
export function ringCenter(ring: LngLatTuple[]): LngLatTuple {
	const closed = closeRing(ring);
	const corners = closed.length > 1 ? closed.slice(0, -1) : closed;
	if (corners.length === 0) throw new Error('A ring needs at least one position.');
	const [lng, lat] = corners.reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
	return [lng / corners.length, lat / corners.length];
}
