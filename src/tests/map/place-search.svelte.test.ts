import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PlaceSearch } from '#lib/registry/ui/place-autocomplete/index.js';
import { PHOTON_BODY } from './fixtures.js';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

/** A fetch that only settles when aborted, like a slow network. */
function hangingFetch(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	return new Promise((_resolve, reject) => {
		init?.signal?.addEventListener('abort', () =>
			reject(new DOMException('The operation was aborted.', 'AbortError'))
		);
	});
}

function queryOf(call: unknown[]): string | null {
	return new URL(String(call[0])).searchParams.get('q');
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('PlaceSearch', () => {
	test('waits for a pause in typing and searches the last query only', async () => {
		const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse(PHOTON_BODY));
		const search = new PlaceSearch(() => ({ debounce: 300 }));

		search.search('ce');
		search.search('cen');
		search.search('central');
		expect(search.status).toBe('loading');
		await vi.advanceTimersByTimeAsync(299);
		expect(fetch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		await vi.waitFor(() => expect(search.status).toBe('done'));
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(queryOf(fetch.mock.calls[0])).toBe('central');
		expect(search.results.map((place) => place.name)).toEqual(['Central Square', 'Corner Shop']);
	});

	test('a new query aborts the request in flight without reporting an error', async () => {
		const onerror = vi.fn();
		const fetch = vi
			.spyOn(window, 'fetch')
			.mockImplementationOnce(hangingFetch)
			.mockResolvedValueOnce(jsonResponse(PHOTON_BODY));
		const search = new PlaceSearch(() => ({ debounce: 0, onerror }));

		search.search('first');
		await vi.advanceTimersByTimeAsync(0);
		const firstSignal = fetch.mock.calls[0][1]?.signal;
		expect(firstSignal?.aborted).toBe(false);

		search.search('second');
		expect(firstSignal?.aborted).toBe(true);
		await vi.advanceTimersByTimeAsync(0);
		await vi.waitFor(() => expect(search.status).toBe('done'));
		expect(queryOf(fetch.mock.calls[1])).toBe('second');
		expect(onerror).not.toHaveBeenCalled();
	});

	test('cancel aborts the request in flight', async () => {
		const fetch = vi.spyOn(window, 'fetch').mockImplementation(hangingFetch);
		const search = new PlaceSearch(() => ({ debounce: 0 }));
		search.search('somewhere');
		await vi.advanceTimersByTimeAsync(0);
		search.cancel();
		expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
	});

	test('a failed request sets the error state and calls onerror', async () => {
		const onerror = vi.fn();
		vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({}, 500));
		const search = new PlaceSearch(() => ({ debounce: 0, onerror }));
		search.search('anywhere');
		await vi.advanceTimersByTimeAsync(0);
		await vi.waitFor(() => expect(search.status).toBe('error'));
		expect(search.results).toEqual([]);
		expect(onerror).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringMatching(/500/) })
		);
	});

	test('a request that takes too long ends in the error state', async () => {
		vi.useRealTimers();
		const onerror = vi.fn();
		vi.spyOn(window, 'fetch').mockImplementation(hangingFetch);
		const search = new PlaceSearch(() => ({ debounce: 0, timeout: 50, onerror }));
		search.search('far away');
		await vi.waitFor(() => expect(search.status).toBe('error'), { timeout: 2000 });
		expect(onerror).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringMatching(/too long/) })
		);
	});

	test('queries shorter than minLength clear the results without a request', async () => {
		const fetch = vi.spyOn(window, 'fetch');
		const search = new PlaceSearch(() => ({ minLength: 3 }));
		search.search(' ab ');
		await vi.advanceTimersByTimeAsync(1000);
		expect(fetch).not.toHaveBeenCalled();
		expect(search.status).toBe('idle');
	});
});
