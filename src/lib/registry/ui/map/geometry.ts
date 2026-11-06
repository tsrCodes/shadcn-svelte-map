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
	if (steps < MIN_STEPS)
		throw new Error(`A circle needs at least ${MIN_STEPS} steps, got ${steps}.`);
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

/** Length of a line in metres. */
export function lineLength(line: LngLatTuple[]): number {
	let total = 0;
	for (let index = 1; index < line.length; index += 1) {
		total += distanceMeters(line[index - 1], line[index]);
	}
	return total;
}

export interface SplitLine {
	/** From the start to `at`. */
	done: LngLatTuple[];
	/** From `at` to the end. */
	rest: LngLatTuple[];
	/** Where the line was split. */
	at: LngLatTuple;
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
	if (total === 0 || share === 0) return { done: [first], rest: [...line], at: first };
	if (share === 1) return { done: [...line], rest: [last], at: last };

	const target = total * share;
	let walked = 0;
	for (let index = 1; index < line.length; index += 1) {
		const segment = distanceMeters(line[index - 1], line[index]);
		if (segment > 0 && walked + segment >= target) {
			const t = (target - walked) / segment;
			// Landing on a vertex: split there instead of adding a copy of it.
			if (t >= 1 - VERTEX_TOLERANCE) {
				const at = line[index];
				return { done: line.slice(0, index + 1), rest: line.slice(index), at };
			}
			const at = lerp(line[index - 1], line[index], t);
			return { done: [...line.slice(0, index), at], rest: [at, ...line.slice(index)], at };
		}
		walked += segment;
	}
	return { done: [...line], rest: [last], at: last };
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
