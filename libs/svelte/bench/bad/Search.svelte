<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { run } from 'svelte/legacy';
	let { query = '' } = $props();

	run(() => {
		if (query.length > 2) goto(`?q=${query}`, { keepFocus: true, noScroll: true });
	});
</script>

<input bind:value={query} />
<button onclick={() => invalidateAll()}>Refresh</button>
