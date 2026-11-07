import { parsePhotonResponse, photonSearchUrl, type Place, type PlacePosition } from './photon.js';

export type PlaceSearchStatus = 'idle' | 'loading' | 'done' | 'error';

export interface PlaceSearchOptions {
	/** Photon base URL. Defaults to the public instance. */
	baseUrl?: string;
	/** Most results to ask for. */
	limit?: number;
	lang?: string;
	/** Wait this many milliseconds after the last keystroke before searching. */
	debounce?: number;
	/** Shorter queries clear the results instead of searching. */
	minLength?: number;
	/** Prefer results near this position, read when a search starts. */
	near?: () => PlacePosition | undefined;
	/** Give up on a request after this many milliseconds. */
	timeout?: number;
	/** Network, response and timeout errors. Searches replaced by a newer one never land here. */
	onerror?: (error: Error) => void;
}

const DEFAULT_DEBOUNCE = 300;
const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_LIMIT = 6;
const DEFAULT_TIMEOUT = 8000;

/**
 * Searches places as the user types. Waits for a pause in typing, and aborts the
 * request in flight whenever a new query arrives, so results never come back out of order.
 */
export class PlaceSearch {
	results = $state.raw<Place[]>([]);
	status = $state<PlaceSearchStatus>('idle');
	error = $state.raw<Error | null>(null);

	#options: () => PlaceSearchOptions;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#controller: AbortController | null = null;

	/** `options` is a function so the latest props are read for every search. */
	constructor(options: () => PlaceSearchOptions = () => ({})) {
		this.#options = options;
	}

	search(query: string): void {
		this.cancel();
		const options = this.#options();
		const trimmed = query.trim();
		if (trimmed.length < (options.minLength ?? DEFAULT_MIN_LENGTH)) {
			this.results = [];
			this.error = null;
			this.status = 'idle';
			return;
		}
		this.status = 'loading';
		this.#timer = setTimeout(() => void this.#run(trimmed), options.debounce ?? DEFAULT_DEBOUNCE);
	}

	/** Stop the pending search and abort the request in flight. */
	cancel(): void {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.#controller?.abort();
		this.#controller = null;
		if (this.status === 'loading') this.status = 'idle';
	}

	async #run(query: string): Promise<void> {
		const controller = new AbortController();
		this.#controller = controller;
		const options = this.#options();
		const url = photonSearchUrl({
			query,
			baseUrl: options.baseUrl,
			limit: options.limit ?? DEFAULT_LIMIT,
			lang: options.lang,
			near: options.near?.()
		});
		// A plain timer rather than `AbortSignal.timeout`, which older browsers lack.
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, options.timeout ?? DEFAULT_TIMEOUT);
		try {
			const response = await fetch(url, { signal: controller.signal });
			if (!response.ok) throw new Error(`The place search failed with status ${response.status}.`);
			const places = parsePhotonResponse(await response.json());
			if (controller.signal.aborted) return;
			this.results = places;
			this.error = null;
			this.status = 'done';
		} catch (error) {
			// A newer query or unmounting aborted this one; that is not an error.
			if (controller.signal.aborted && !timedOut) return;
			this.results = [];
			this.error = timedOut
				? new Error('The place search took too long. Try again.')
				: error instanceof Error
					? error
					: new Error(String(error));
			this.status = 'error';
			options.onerror?.(this.error);
		} finally {
			clearTimeout(timer);
			if (this.#controller === controller) this.#controller = null;
		}
	}
}
