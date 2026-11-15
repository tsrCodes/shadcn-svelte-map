import type {
	FeatureIdentifier,
	GeoJSONSource,
	GeoJSONSourceSpecification,
	LayerSpecification,
	Map as MapLibreMap,
	SourceSpecification,
	StyleSpecification
} from 'maplibre-gl';

/** The parts of a MapLibre map the registry talks to. */
export type RegistryMap = Pick<
	MapLibreMap,
	| 'getGlyphs'
	| 'getSource'
	| 'addSource'
	| 'removeSource'
	| 'getLayer'
	| 'getLayersOrder'
	| 'addLayer'
	| 'removeLayer'
	| 'moveLayer'
	| 'setFeatureState'
	| 'removeFeatureState'
	| 'setPaintProperty'
>;

/** A source and the layers drawn from it, owned by one component. */
export interface LayerEntry {
	sourceId: string;
	source: SourceSpecification;
	layers: LayerSpecification[];
	/** Insert the layers below this layer id when it exists in the style. */
	beforeId?: string;
}

export type FeatureState = Record<string, unknown>;

export type GeoJSONData = GeoJSONSourceSpecification['data'];

/** Clustering settings of a GeoJSON source that can change after it was added. */
export type ClusterOptions = Partial<
	Pick<GeoJSONSourceSpecification, 'cluster' | 'clusterRadius' | 'clusterMaxZoom'>
>;

/** Name of a paint property, as `map.setPaintProperty` takes it. */
export type PaintProperty = Parameters<MapLibreMap['setPaintProperty']>[1];

/** A paint value or expression, as `map.setPaintProperty` takes it. */
export type PaintValue = Parameters<MapLibreMap['setPaintProperty']>[2];

type PaintValues = Partial<Record<PaintProperty, PaintValue>>;

/** A feature, or a whole source when `id` is left out. */
export type FeatureTarget = Omit<FeatureIdentifier, 'id'> & { id?: FeatureIdentifier['id'] };

interface StoredState {
	target: FeatureIdentifier;
	state: FeatureState;
}

function stateKey(sourceLayer: string | undefined, id: FeatureIdentifier['id']): string {
	return `${sourceLayer ?? ''}\u0000${String(id)}`;
}

function insertLayer(
	layers: LayerSpecification[],
	layer: LayerSpecification,
	beforeId: string | undefined
): LayerSpecification[] {
	const index = beforeId ? layers.findIndex((item) => item.id === beforeId) : -1;
	if (index < 0) return [...layers, layer];
	return [...layers.slice(0, index), layer, ...layers.slice(index)];
}

function withPaint(layer: LayerSpecification, paint: PaintValues | undefined): LayerSpecification {
	if (!paint) return layer;
	return { ...layer, paint: { ...layer.paint, ...paint } } as LayerSpecification;
}

/**
 * True for symbol layers that draw text. A style without a `glyphs` URL cannot draw
 * them, and MapLibre reports an error for every tile that tries.
 */
function needsGlyphs(layer: LayerSpecification): boolean {
	return layer.type === 'symbol' && layer.layout?.['text-field'] !== undefined;
}

function drawable(layers: LayerSpecification[], hasGlyphs: boolean): LayerSpecification[] {
	return hasGlyphs ? layers : layers.filter((layer) => !needsGlyphs(layer));
}

/** Errors from updates nobody awaits, such as cluster options re-sent after a style load. */
function reportError(error: unknown): void {
	console.error(error);
}

function withoutKey(state: FeatureState, key: string): FeatureState {
	return Object.fromEntries(Object.entries(state).filter(([name]) => name !== key));
}

/**
 * Keeps user sources, layers and feature-state alive across style swaps.
 *
 * Components register what they draw. When the style changes, `transformStyle`
 * carries the registered sources and layers into the next style, and on
 * `style.load` anything still missing is added back and the saved feature-state
 * is applied again (a swap that cannot be diffed wipes it).
 *
 * Text layers are left out while the style has no glyphs and come back with a style
 * that has them; see `needsGlyphs`.
 */
export class LayerRegistry {
	#map: RegistryMap | null = null;
	#ready = false;
	#entries = new Map<string, LayerEntry>();
	#featureState = new Map<string, Map<string, StoredState>>();
	#pendingRemoval = new Map<string, LayerEntry>();
	/** Data set while a style was loading, sent to the map once it is ready. */
	#pendingData = new Set<string>();
	/** The last queued cluster update per source; the next one waits for it. */
	#clusterUpdates = new Map<string, Promise<void>>();
	/** Sources whose spec changed through the registry; a swap must not take the old copy. */
	#changedSources = new Set<string>();
	/** Sources whose cluster options changed while a style was loading. */
	#pendingCluster = new Set<string>();
	/** Paint values set through the registry, by layer id; they win over any older style copy. */
	#paint = new Map<string, PaintValues>();
	/** Id prefixes of sources and layers added outside the registry that swaps must keep. */
	#carried: readonly string[] = [];

	/** True once the current style has loaded and can take sources and layers. */
	get ready(): boolean {
		return this.#ready;
	}

	attach(map: RegistryMap): void {
		this.#map = map;
		this.#ready = false;
	}

	detach(): void {
		this.#map = null;
		this.#ready = false;
	}

	/** Call when a new style object starts loading. */
	styleLoading(): void {
		this.#ready = false;
	}

	/** Call on every `style.load`. Re-adds missing entries and replays feature-state. */
	styleLoaded(): void {
		this.#ready = true;
		for (const entry of this.#pendingRemoval.values()) this.#removeFromMap(entry);
		this.#pendingRemoval.clear();
		// A source the new style already holds may predate the change; one added below will not.
		const staleClusters = [...this.#pendingCluster].filter((id) => this.#map?.getSource(id));
		this.#pendingCluster.clear();
		for (const entry of this.#entries.values()) this.#addToMap(entry);
		for (const sourceId of staleClusters) this.#queueClusterUpdate(sourceId).catch(reportError);
		this.#flushData();
		this.#replayPaint();
		this.#replayFeatureState();
	}

	has(sourceId: string): boolean {
		return this.#entries.has(sourceId);
	}

	/** Register a source and its layers. Returns a function that removes them again. */
	add(entry: LayerEntry): () => void {
		if (this.#entries.has(entry.sourceId)) {
			throw new Error(`Map source "${entry.sourceId}" is already registered.`);
		}
		this.#entries.set(entry.sourceId, entry);
		this.#pendingRemoval.delete(entry.sourceId);
		if (this.#ready) this.#addToMap(entry);
		return () => this.remove(entry.sourceId);
	}

	remove(sourceId: string): void {
		const entry = this.#entries.get(sourceId);
		if (!entry) return;
		this.#entries.delete(sourceId);
		this.#featureState.delete(sourceId);
		this.#pendingData.delete(sourceId);
		this.#changedSources.delete(sourceId);
		this.#pendingCluster.delete(sourceId);
		for (const layer of entry.layers) this.#paint.delete(layer.id);
		if (this.#ready) this.#removeFromMap(entry);
		else this.#pendingRemoval.set(sourceId, entry);
	}

	/** Replace the data of a registered GeoJSON source. Kept for style swaps. */
	setData(sourceId: string, data: GeoJSONData): void {
		const entry = this.#entries.get(sourceId);
		if (!entry) return;
		if (entry.source.type !== 'geojson') {
			throw new Error(`Map source "${sourceId}" is not a GeoJSON source.`);
		}
		this.#entries.set(sourceId, { ...entry, source: { ...entry.source, data } });
		this.#pendingData.add(sourceId);
		if (this.#ready) this.#flushData();
	}

	/**
	 * Move the entry's layers below `beforeId`, or to the top when it is left out or
	 * missing from the style. Kept for style swaps.
	 */
	setBeforeId(sourceId: string, beforeId: string | undefined): void {
		const entry = this.#entries.get(sourceId);
		if (!entry || entry.beforeId === beforeId) return;
		this.#entries.set(sourceId, { ...entry, beforeId });
		const map = this.#map;
		if (!this.#ready || !map) return;
		const target = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
		// Moving each layer below the same target in turn keeps the entry's own order.
		for (const layer of entry.layers) {
			if (map.getLayer(layer.id)) map.moveLayer(layer.id, target);
		}
	}

	/** Change how a registered GeoJSON source clusters its points. Kept for style swaps. */
	async setClusterOptions(sourceId: string, options: ClusterOptions): Promise<void> {
		const entry = this.#entries.get(sourceId);
		if (!entry) return;
		if (entry.source.type !== 'geojson') {
			throw new Error(`Map source "${sourceId}" is not a GeoJSON source.`);
		}
		this.#entries.set(sourceId, { ...entry, source: { ...entry.source, ...options } });
		this.#changedSources.add(sourceId);
		await this.#queueClusterUpdate(sourceId);
	}

	/**
	 * One update at a time per source, each sending the newest options when it starts,
	 * so a slow earlier update can never land after a newer one.
	 */
	async #queueClusterUpdate(sourceId: string): Promise<void> {
		const previous = this.#clusterUpdates.get(sourceId) ?? Promise.resolve();
		const next = previous.catch(() => {}).then(() => this.#applyClusterOptions(sourceId));
		this.#clusterUpdates.set(sourceId, next);
		try {
			await next;
		} finally {
			if (this.#clusterUpdates.get(sourceId) === next) this.#clusterUpdates.delete(sourceId);
		}
	}

	async #applyClusterOptions(sourceId: string): Promise<void> {
		const source = this.#entries.get(sourceId)?.source;
		if (source?.type !== 'geojson') return;
		if (!this.#ready) {
			// The loading style may hold the source as it was; send the options once it is ready.
			this.#pendingCluster.add(sourceId);
			return;
		}
		await this.#map?.getSource<GeoJSONSource>(sourceId)?.setClusterOptions({
			cluster: source.cluster,
			clusterRadius: source.clusterRadius,
			clusterMaxZoom: source.clusterMaxZoom
		});
	}

	/** Set one paint property of a registered layer. Kept for style swaps. */
	setPaintProperty(
		sourceId: string,
		layerId: string,
		name: PaintProperty,
		value: PaintValue
	): void {
		const entry = this.#entries.get(sourceId);
		if (!entry?.layers.some((layer) => layer.id === layerId)) return;
		this.#paint.set(layerId, { ...this.#paint.get(layerId), [name]: value });
		this.#entries.set(sourceId, {
			...entry,
			layers: entry.layers.map((layer) =>
				layer.id === layerId ? withPaint(layer, { [name]: value }) : layer
			)
		});
		if (this.#ready && this.#map?.getLayer(layerId))
			this.#map.setPaintProperty(layerId, name, value);
	}

	/** Set feature-state and remember it so it survives style swaps. */
	setFeatureState(target: FeatureIdentifier, state: FeatureState): void {
		const states = this.#featureState.get(target.source) ?? new Map<string, StoredState>();
		const key = stateKey(target.sourceLayer, target.id);
		const previous = states.get(key)?.state ?? {};
		states.set(key, { target: { ...target }, state: { ...previous, ...state } });
		this.#featureState.set(target.source, states);
		if (this.#ready) this.#map?.setFeatureState(target, state);
	}

	/** Remove one key, or all state, of a feature (or of a whole source when `id` is left out). */
	removeFeatureState(target: FeatureTarget, key?: string): void {
		this.#forgetState(target, key);
		if (this.#ready) this.#map?.removeFeatureState(target, key);
	}

	/** Saved feature-state for one feature, as the registry will replay it. */
	getFeatureState(target: FeatureIdentifier): FeatureState {
		const stored = this.#featureState
			.get(target.source)
			?.get(stateKey(target.sourceLayer, target.id));
		return { ...stored?.state };
	}

	/**
	 * Keep sources and layers whose ids start with `prefix` across style swaps, for
	 * libraries that add them to the map themselves. They are copied as they are from
	 * the previous style and drawn on top. Returns a function that stops carrying them.
	 */
	carry(prefix: string): () => void {
		if (!prefix) throw new Error('A carried prefix must not be empty.');
		this.#carried = [...this.#carried, prefix];
		return () => {
			this.#carried = this.#carried.filter((item) => item !== prefix);
		};
	}

	/** Pass to `map.setStyle(style, { transformStyle })` to carry registered layers across. */
	transformStyle = (
		previous: StyleSpecification | undefined,
		next: StyleSpecification
	): StyleSpecification => {
		let sources = { ...next.sources };
		let layers = [...next.layers];
		for (const entry of this.#entries.values()) {
			sources = { ...sources, [entry.sourceId]: this.#carriedSource(entry, previous) };
			for (const layer of drawable(entry.layers, Boolean(next.glyphs))) {
				const carried = previous?.layers.find((item) => item.id === layer.id) ?? layer;
				const current = withPaint(carried, this.#paint.get(layer.id));
				const others = layers.filter((item) => item.id !== layer.id);
				layers = insertLayer(others, current, entry.beforeId);
			}
		}
		return this.#withCarried(previous, { ...next, sources, layers });
	};

	#isCarried(id: string): boolean {
		return this.#carried.some((prefix) => id.startsWith(prefix));
	}

	#withCarried(
		previous: StyleSpecification | undefined,
		next: StyleSpecification
	): StyleSpecification {
		if (!previous || this.#carried.length === 0) return next;
		const carriedSources = Object.entries(previous.sources).filter(([id]) => this.#isCarried(id));
		const carriedLayers = previous.layers.filter((layer) => this.#isCarried(layer.id));
		if (carriedSources.length === 0 && carriedLayers.length === 0) return next;
		const ids = new Set(carriedLayers.map((layer) => layer.id));
		return {
			...next,
			sources: { ...next.sources, ...Object.fromEntries(carriedSources) },
			layers: [...next.layers.filter((layer) => !ids.has(layer.id)), ...carriedLayers]
		};
	}

	#carriedSource(entry: LayerEntry, previous: StyleSpecification | undefined): SourceSpecification {
		// Data set through the registry is newer than whatever the old style holds.
		if (this.#pendingData.has(entry.sourceId) || this.#changedSources.has(entry.sourceId)) {
			return entry.source;
		}
		return previous?.sources[entry.sourceId] ?? entry.source;
	}

	#flushData(): void {
		const map = this.#map;
		if (!map) return;
		for (const sourceId of this.#pendingData) {
			const entry = this.#entries.get(sourceId);
			if (entry?.source.type !== 'geojson') {
				this.#pendingData.delete(sourceId);
				continue;
			}
			// Keep it pending until the source exists, so the next style load still applies it.
			const source = map.getSource<GeoJSONSource>(sourceId);
			if (!source) continue;
			source.setData(entry.source.data);
			this.#pendingData.delete(sourceId);
		}
	}

	#replayPaint(): void {
		const map = this.#map;
		if (!map) return;
		for (const [layerId, paint] of this.#paint) {
			if (!map.getLayer(layerId)) continue;
			for (const [name, value] of Object.entries(paint) as [PaintProperty, PaintValue][]) {
				map.setPaintProperty(layerId, name, value);
			}
		}
	}

	#forgetState(target: FeatureTarget, key: string | undefined): void {
		const states = this.#featureState.get(target.source);
		if (!states) return;
		if (target.id === undefined) {
			this.#featureState.delete(target.source);
			return;
		}
		const id = stateKey(target.sourceLayer, target.id);
		const stored = states.get(id);
		if (!stored) return;
		const rest = key ? withoutKey(stored.state, key) : {};
		if (Object.keys(rest).length > 0) states.set(id, { target: stored.target, state: rest });
		else states.delete(id);
		if (states.size === 0) this.#featureState.delete(target.source);
	}

	#addToMap(entry: LayerEntry): void {
		const map = this.#map;
		if (!map) return;
		if (!map.getSource(entry.sourceId)) map.addSource(entry.sourceId, entry.source);
		const layers = drawable(entry.layers, Boolean(map.getGlyphs()));
		for (const [index, layer] of layers.entries()) {
			if (map.getLayer(layer.id)) continue;
			map.addLayer(layer, this.#insertBefore(entry, layers.slice(index + 1)));
		}
	}

	/** Keep the entry's own order: go below its next layer on the map, else below `beforeId`. */
	#insertBefore(entry: LayerEntry, following: LayerSpecification[]): string | undefined {
		const map = this.#map;
		const sibling = following.find((layer) => map?.getLayer(layer.id));
		if (sibling) return sibling.id;
		return entry.beforeId && map?.getLayer(entry.beforeId) ? entry.beforeId : undefined;
	}

	#removeFromMap(entry: LayerEntry): void {
		const map = this.#map;
		if (!map) return;
		for (const layer of [...entry.layers].reverse()) {
			if (map.getLayer(layer.id)) map.removeLayer(layer.id);
		}
		if (!map.getSource(entry.sourceId)) return;
		// A layer added outside the registry may still draw from this source;
		// MapLibre throws when a source in use is removed, so leave it in place.
		const inUse = map.getLayersOrder().some((id) => map.getLayer(id)?.source === entry.sourceId);
		if (!inUse) map.removeSource(entry.sourceId);
	}

	#replayFeatureState(): void {
		const map = this.#map;
		if (!map) return;
		for (const [sourceId, states] of this.#featureState) {
			if (!map.getSource(sourceId)) continue;
			for (const { target, state } of states.values()) map.setFeatureState(target, state);
		}
	}
}
