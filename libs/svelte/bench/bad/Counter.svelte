<script>
	export let initial = 0;
	export let step = 1;

	let count = initial;
	$: doubled = count * 2;
	$: if (count > 10) console.log('count is high');
</script>

<button on:click={() => (count += step)}>
	clicks: {count} (doubled: {doubled})
</button>
