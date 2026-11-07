<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/registry/ui/button/index.js';
</script>

<Button variant="outline" size="icon" onclick={toggleMode} aria-label="Toggle theme">
	<SunIcon class="dark:hidden" />
	<MoonIcon class="hidden dark:block" />
</Button>
