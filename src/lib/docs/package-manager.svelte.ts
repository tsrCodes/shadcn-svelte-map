export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const STORAGE_KEY = 'package-manager';

function isPackageManager(value: unknown): value is PackageManager {
	return PACKAGE_MANAGERS.includes(value as PackageManager);
}

function readStored(): PackageManager {
	try {
		const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
		return isPackageManager(stored) ? stored : 'pnpm';
	} catch {
		return 'pnpm';
	}
}

/** The install tab picked last, shared by every command block and kept across visits. */
class PackageManagerChoice {
	// Read once when the module loads (`pnpm` on the server), never during a render
	#current = $state<PackageManager>(readStored());

	get current(): PackageManager {
		return this.#current;
	}

	set current(value: PackageManager) {
		this.#current = value;
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// Storage blocked: the choice still holds for this page
		}
	}
}

export const packageManager = new PackageManagerChoice();

/** The `npx` command rewritten for each package manager. */
export function commandFor(command: string, manager: PackageManager): string {
	switch (manager) {
		case 'npm':
			return command;
		case 'pnpm':
			return command.replace(/^npx/, 'pnpm dlx');
		case 'yarn':
			return command.replace(/^npx/, 'yarn');
		case 'bun':
			return command.replace(/^npx/, 'bunx --bun');
	}
}
