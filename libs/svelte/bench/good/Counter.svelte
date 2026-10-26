<script lang="ts">
	let { initial = 0, step = 1 }: { initial?: number; step?: number } = $props();

	let count = $state(initial);
	let doubled = $derived(count * 2);

	$effect(() => {
		if (count > 10) console.log('count is high');
	});
</script>

<button onclick={() => (count += step)}>
	clicks: {count} (doubled: {doubled})
</button>
