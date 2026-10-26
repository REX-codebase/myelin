<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let text = '';

	function handleSubmit() {
		dispatch('add', { text });
		text = '';
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<input bind:value={text} placeholder="What needs doing?" />
	<button type="submit">Add</button>
</form>
