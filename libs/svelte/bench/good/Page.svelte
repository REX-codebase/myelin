<script lang="ts">
	import Modal from './Modal.svelte';
	let showModal = $state(true);
</script>

<Modal open={showModal}>
	{#snippet header()}
		<h2>Delete item?</h2>
	{/snippet}

	<p>This cannot be undone.</p>

	{#snippet footer()}
		<button onclick={() => (showModal = false)}>Cancel</button>
	{/snippet}
</Modal>
