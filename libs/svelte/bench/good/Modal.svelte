<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = false,
		header,
		children,
		footer
	}: { open?: boolean; header?: Snippet; children: Snippet; footer?: Snippet } = $props();
</script>

{#if open}
	<div class="backdrop">
		<div class="modal">
			<header>
				{#if header}{@render header()}{:else}Untitled{/if}
			</header>
			{@render children()}
			<footer>{@render footer?.()}</footer>
		</div>
	</div>
{/if}
