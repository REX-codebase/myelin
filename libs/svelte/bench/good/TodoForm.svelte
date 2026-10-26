<script lang="ts">
	let { onadd }: { onadd: (todo: { text: string }) => void } = $props();
	let text = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onadd({ text });
		text = '';
	}
</script>

<form onsubmit={handleSubmit}>
	<input bind:value={text} placeholder="What needs doing?" />
	<button type="submit">Add</button>
</form>
