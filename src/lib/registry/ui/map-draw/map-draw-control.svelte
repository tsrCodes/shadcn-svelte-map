<script lang="ts">
	import CircleIcon from '@lucide/svelte/icons/circle';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import MousePointerIcon from '@lucide/svelte/icons/mouse-pointer-2';
	import PenLineIcon from '@lucide/svelte/icons/pen-line';
	import PentagonIcon from '@lucide/svelte/icons/pentagon';
	import RedoIcon from '@lucide/svelte/icons/redo-2';
	import SplineIcon from '@lucide/svelte/icons/spline';
	import SquareIcon from '@lucide/svelte/icons/square';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import UndoIcon from '@lucide/svelte/icons/undo-2';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { untrack, type Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { TerraDraw } from 'terra-draw';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { ButtonGroup } from '#lib/registry/ui/button-group/index.js';
	import { cn } from '#lib/utils.js';
	import {
		DRAW_MODES,
		drawPalette,
		drawStyles,
		engineMode,
		finishedFeatures,
		SELECT_FLAGS,
		type DrawFeature,
		type DrawMode,
		type DrawStyles,
		type DrawTool
	} from './draw.js';
	import { CONTROL_BUTTON_CLASS } from '#lib/registry/ui/map/map-control-container.svelte';
	import { getMapContext } from '#lib/registry/ui/map/map-context.svelte.js';

	interface Props extends Omit<
		HTMLAttributes<HTMLDivElement>,
		'children' | 'onchange' | 'onerror'
	> {
		/** The active tool. `none` leaves the pointer to the map. */
		mode?: DrawTool;
		/** Shapes offered as buttons, in this order. */
		modes?: readonly DrawMode[];
		/** Lay the tool buttons out in a column or a row. */
		orientation?: 'vertical' | 'horizontal';
		/** Every finished drawing, after each create, edit, delete, undo or redo. */
		onchange?: (features: DrawFeature[]) => void;
		/** The drawing engine failed to load. Logged when unset. */
		onerror?: (error: Error) => void;
		/** The terra-draw instance, once it runs. */
		ref?: TerraDraw | null;
	}

	let {
		mode = $bindable('none'),
		modes = DRAW_MODES,
		orientation = 'vertical',
		onchange,
		onerror,
		ref = $bindable(null),
		class: className,
		...restProps
	}: Props = $props();

	const TOOLS: Record<DrawMode, { label: string; icon: Component }> = {
		point: { label: 'Draw point', icon: MapPinIcon },
		polyline: { label: 'Draw line', icon: SplineIcon },
		polygon: { label: 'Draw polygon', icon: PentagonIcon },
		rectangle: { label: 'Draw rectangle', icon: SquareIcon },
		circle: { label: 'Draw circle', icon: CircleIcon },
		freehand: { label: 'Draw freehand', icon: PenLineIcon }
	};

	const ACTIVE_CLASS = 'bg-accent text-accent-foreground dark:bg-accent';

	const ctx = getMapContext();
	const uid = $props.id();
	/** Source and layer ids terra-draw adds start with this; the registry keeps them on swaps. */
	const prefix = `map-draw-${uid}`;

	type Engine = [typeof import('terra-draw'), typeof import('terra-draw-maplibre-gl-adapter')];
	type EngineModes = ReturnType<typeof createModes>;

	let draw = $state.raw<TerraDraw | null>(null);
	let engineModes: EngineModes | null = null;
	let canUndo = $state(false);
	let canRedo = $state(false);
	let selectedId = $state<string | number | null>(null);
	/** Last list sent to `onchange`, to skip calls that would repeat it. */
	let lastEmitted = '';

	// Flips once; later style loads must not restart drawing.
	const styleReady = $derived(ctx.styleVersion > 0);

	function currentStyles(): DrawStyles | null {
		return ctx.colors ? drawStyles(drawPalette(ctx.colors)) : null;
	}

	function createModes([lib]: Engine, styles: DrawStyles | null) {
		return {
			point: new lib.TerraDrawPointMode({ styles: styles?.point }),
			linestring: new lib.TerraDrawLineStringMode({ styles: styles?.linestring }),
			polygon: new lib.TerraDrawPolygonMode({ styles: styles?.polygon }),
			rectangle: new lib.TerraDrawRectangleMode({ styles: styles?.rectangle }),
			circle: new lib.TerraDrawCircleMode({ styles: styles?.circle }),
			freehand: new lib.TerraDrawFreehandMode({ styles: styles?.freehand }),
			select: new lib.TerraDrawSelectMode({ flags: SELECT_FLAGS, styles: styles?.select })
		};
	}

	function restyle(target: EngineModes, styles: DrawStyles) {
		target.point.updateOptions({ styles: styles.point });
		target.linestring.updateOptions({ styles: styles.linestring });
		target.polygon.updateOptions({ styles: styles.polygon });
		target.rectangle.updateOptions({ styles: styles.rectangle });
		target.circle.updateOptions({ styles: styles.circle });
		target.freehand.updateOptions({ styles: styles.freehand });
		target.select.updateOptions({ styles: styles.select });
	}

	function emit(instance: TerraDraw) {
		const features = finishedFeatures(instance.getSnapshot());
		const key = JSON.stringify(features);
		if (key === lastEmitted) return;
		lastEmitted = key;
		onchange?.(features);
	}

	function listen(instance: TerraDraw) {
		instance.on('select', (id) => (selectedId = id));
		instance.on('deselect', () => (selectedId = null));
		instance.on('finish', () => emit(instance));
		// Deleting by key or button; deletes of helper points repeat the last list and are skipped.
		instance.on('change', (_ids, type) => {
			if (type === 'delete') emit(instance);
		});
		instance.on('history', (event) => {
			canUndo = instance.canUndo();
			canRedo = instance.canRedo();
			if (event.cause !== 'push') emit(instance);
		});
	}

	function start(engine: Engine, map: MapLibreMap): TerraDraw {
		const [lib, adapterLib] = engine;
		const modesForEngine = createModes(engine, currentStyles());
		const instance = new lib.TerraDraw({
			adapter: new adapterLib.TerraDrawMapLibreGLAdapter({ map, prefixId: prefix }),
			modes: Object.values(modesForEngine),
			undoRedo: { sessionLevel: new lib.TerraDrawSessionUndoRedo() }
		});
		instance.start();
		instance.setMode(engineMode(mode));
		listen(instance);
		engineModes = modesForEngine;
		return instance;
	}

	/** Run `callback` once the style can take sources; returns a cancel function. */
	function whenStyleReady(map: MapLibreMap, callback: () => void): () => void {
		if (ctx.layers.ready) {
			callback();
			return () => {};
		}
		const subscription = map.on('style.load', () => {
			subscription.unsubscribe();
			callback();
		});
		return () => subscription.unsubscribe();
	}

	function report(error: unknown) {
		const failure = error instanceof Error ? error : new Error(String(error));
		if (onerror) onerror(failure);
		else console.error(failure);
	}

	/** Stop terra-draw. Leaving its mode first gives the map back its pan and zoom handlers. */
	function shutdown(running: TerraDraw) {
		if (!running.enabled) return;
		running.setMode(engineMode('none'));
		running.stop();
	}

	function mountDraw(map: MapLibreMap): () => void {
		const release = ctx.layers.carry(`${prefix}-`);
		let cancelled = false;
		let instance: TerraDraw | null = null;
		let cancelWait = () => {};
		let cancelRemove = () => {};
		Promise.all([import('terra-draw'), import('terra-draw-maplibre-gl-adapter')]).then(
			(engine) => {
				if (cancelled) return;
				cancelWait = whenStyleReady(map, () => {
					const running = start(engine, map);
					instance = running;
					draw = running;
					ref = running;
					// The map is removed before this control cleans up; stop while the layers exist.
					cancelRemove = ctx.beforeRemove(() => {
						if (ctx.layers.ready) shutdown(running);
					});
				});
			},
			(error: unknown) => {
				if (!cancelled) report(error);
			}
		);
		return () => {
			cancelled = true;
			cancelWait();
			cancelRemove();
			draw = null;
			ref = null;
			engineModes = null;
			canUndo = false;
			canRedo = false;
			selectedId = null;
			lastEmitted = '';
			const running = instance;
			if (!running || ctx.map !== map) return release();
			if (ctx.layers.ready) {
				shutdown(running);
				return release();
			}
			// terra-draw removes its layers without checking, so wait for a style that has them.
			// If the map goes first, there is nothing left to remove: just stop carrying them.
			const stopWaiting = ctx.beforeRemove(() => {
				cancelLoad();
				release();
			});
			const cancelLoad = whenStyleReady(map, () => {
				stopWaiting();
				shutdown(running);
				release();
			});
		};
	}

	$effect(() => {
		const map = ctx.map;
		if (!map || !styleReady) return;
		return untrack(() => mountDraw(map));
	});

	$effect(() => {
		const target = engineMode(mode);
		if (draw && draw.getMode() !== target) draw.setMode(target);
	});

	// Follow the theme.
	$effect(() => {
		const colors = ctx.colors;
		if (!draw || !colors || !engineModes) return;
		restyle(engineModes, drawStyles(drawPalette(colors)));
	});

	function pick(tool: DrawTool) {
		mode = mode === tool ? 'none' : tool;
	}

	function deleteSelected() {
		const id = selectedId;
		if (!draw || id === null) return;
		draw.deselectFeature(id);
		draw.removeFeatures([id]);
		selectedId = null;
	}
</script>

<ButtonGroup
	{...restProps}
	{orientation}
	aria-label="Drawing tools"
	class={cn('shadow-xs', className)}
	data-slot="map-draw-control"
>
	<ButtonGroup {orientation}>
		{#each modes as item (item)}
			{@const tool = TOOLS[item]}
			<Button
				variant="outline"
				size="icon-sm"
				class={cn(CONTROL_BUTTON_CLASS, mode === item && ACTIVE_CLASS)}
				aria-label={tool.label}
				aria-pressed={mode === item}
				disabled={!draw}
				onclick={() => pick(item)}
			>
				<tool.icon />
			</Button>
		{/each}
		<Button
			variant="outline"
			size="icon-sm"
			class={cn(CONTROL_BUTTON_CLASS, mode === 'select' && ACTIVE_CLASS)}
			aria-label="Select and edit"
			aria-pressed={mode === 'select'}
			disabled={!draw}
			onclick={() => pick('select')}
		>
			<MousePointerIcon />
		</Button>
	</ButtonGroup>
	<ButtonGroup {orientation}>
		<Button
			variant="outline"
			size="icon-sm"
			class={CONTROL_BUTTON_CLASS}
			aria-label="Delete selected"
			disabled={selectedId === null}
			onclick={deleteSelected}
		>
			<TrashIcon />
		</Button>
		<Button
			variant="outline"
			size="icon-sm"
			class={CONTROL_BUTTON_CLASS}
			aria-label="Undo"
			disabled={!canUndo}
			onclick={() => draw?.undo()}
		>
			<UndoIcon />
		</Button>
		<Button
			variant="outline"
			size="icon-sm"
			class={CONTROL_BUTTON_CLASS}
			aria-label="Redo"
			disabled={!canRedo}
			onclick={() => draw?.redo()}
		>
			<RedoIcon />
		</Button>
	</ButtonGroup>
</ButtonGroup>
