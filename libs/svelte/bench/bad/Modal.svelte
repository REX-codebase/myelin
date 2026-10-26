<script lang="ts">
	export let open = false;
</script>

{#if open}
	<div class="backdrop">
		<div class="modal">
			<header><slot name="header">Untitled</slot></header>
			<slot />
			<footer><slot name="footer" /></footer>
		</div>
	</div>
{/if}
