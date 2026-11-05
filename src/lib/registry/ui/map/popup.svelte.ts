import type { Popup, PopupOptions } from 'maplibre-gl';

export type PopupOffset = PopupOptions['offset'];

/** Popup props that can change on a live popup without rebuilding it. */
export interface PopupLook {
	offset?: PopupOffset;
	maxWidth?: string;
	className?: string;
}

export const DEFAULT_POPUP_MAX_WIDTH = '280px';

function classTokens(value: string | undefined): string[] {
	return value?.split(/\s+/).filter(Boolean) ?? [];
}

/**
 * Keeps a popup's offset, max width and classes in step with its props.
 * Call during component init; it sets up one small effect per setter.
 */
export function syncPopupLook(popup: () => Popup | null, look: () => PopupLook): void {
	$effect(() => {
		const offset = look().offset;
		popup()?.setOffset(offset);
	});

	$effect(() => {
		const maxWidth = look().maxWidth ?? DEFAULT_POPUP_MAX_WIDTH;
		popup()?.setMaxWidth(maxWidth);
	});

	$effect(() => {
		const instance = popup();
		const tokens = classTokens(look().className);
		if (!instance) return;
		for (const token of tokens) instance.addClassName(token);
		return () => {
			for (const token of tokens) instance.removeClassName(token);
		};
	});
}

/**
 * Calls `handler` when Escape is pressed anywhere inside the popup while it is open.
 * Returns a function that stops listening.
 */
export function onPopupEscape(popup: Popup, handler: () => void): () => void {
	let element: HTMLElement | null = null;
	const listener = (event: KeyboardEvent) => {
		// A control inside the popup that handles Escape itself can preventDefault to keep it open.
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		handler();
	};
	const detach = () => {
		element?.removeEventListener('keydown', listener);
		element = null;
	};
	const subscriptions = [
		popup.on('open', () => {
			detach();
			element = popup.getElement();
			element.addEventListener('keydown', listener);
		}),
		popup.on('close', detach)
	];
	return () => {
		for (const subscription of subscriptions) subscription.unsubscribe();
		detach();
	};
}
