const RESET_MS = 2000;

/** Copies text and reports `copied` for two seconds, for the copy buttons' check icon. */
export class Clipboard {
	copied = $state(false);
	#timer: ReturnType<typeof setTimeout> | undefined;

	async copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// Denied or unavailable: keep the copy icon rather than claim success
			return;
		}
		this.copied = true;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => (this.copied = false), RESET_MS);
	}

	/** Stops the pending reset; call it when the owner unmounts. */
	dispose(): void {
		clearTimeout(this.#timer);
		this.#timer = undefined;
	}
}
