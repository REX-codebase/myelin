<script>
	import Modal from './Modal.svelte';
	let showModal = true;
</script>

<Modal open={showModal}>
	<h2 slot="header">Delete item?</h2>
	<p>This cannot be undone.</p>
	<svelte:fragment slot="footer">
		<button on:click={() => (showModal = false)}>Cancel</button>
	</svelte:fragment>
</Modal>
