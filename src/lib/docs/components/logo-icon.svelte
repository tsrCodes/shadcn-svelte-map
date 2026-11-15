<script lang="ts">
	import mark from '#lib/assets/favicon.svg';

	let { class: className }: { class?: string } = $props();
</script>

<!-- The small site mark, the same file as the favicon. -->
<img src={mark} alt="" width="32" height="32" class={className} />
